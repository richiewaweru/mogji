import { computeReveal, publicPuzzle, stripForbiddenKeys, validatePuzzleJson, type PuzzleJson, type ReaderAnswer, type RevealResult } from "@mogji/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dailyWarmup, seedDecode } from "./seed";
import { newAnonToken, signMemberToken, type MemberToken } from "./auth";

export type Circle = {
  id: string;
  code: string;
  name: string;
  vibeEmoji: string;
  createdAt: string;
};

export type Member = {
  id: string;
  circleId: string;
  anonToken: string;
  displayName: string;
  joinedAt: string;
};

export type Decode = {
  id: string;
  circleId: string;
  setterMemberId: string;
  puzzleJson: PuzzleJson;
  status: "draft" | "live" | "revealed" | "deleted";
  createdAt: string;
  closesAt: string | null;
  reveal: RevealResult | null;
};

export type Answer = {
  decodeId: string;
  memberId: string;
  chain: string[];
  predictionMemberId: string | null;
  createdAt: string;
};

export type EventRow = {
  id: string;
  circleId: string | null;
  memberId: string | null;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type Database = {
  circles: Circle[];
  members: Member[];
  decodes: Decode[];
  answers: Answer[];
  events: EventRow[];
};

const dbPath = path.join(process.cwd(), "..", "..", "data", "dev-db.json");

export async function createCircle(input: { name: string; vibeEmoji: string; displayName: string; seedDecode?: boolean }) {
  const db = await readDb();
  const circle: Circle = {
    id: randomUUID(),
    code: uniqueCode(db),
    name: input.name.trim(),
    vibeEmoji: input.vibeEmoji.trim() || "🔥",
    createdAt: now()
  };
  const member = createMember(circle.id, input.displayName || "Setter");
  db.circles.push(circle);
  db.members.push(member);
  db.events.push(event("circle_created", circle.id, member.id, { code: circle.code }));
  if (input.seedDecode) {
    const decode = createDecode(circle.id, member.id, seedDecode, "live");
    db.decodes.push(decode);
    db.events.push(event("decode_set", circle.id, member.id, { decodeId: decode.id, seed: true }));
  }
  await writeDb(db);
  return { circle, member, memberToken: signMemberToken(tokenPayload(member)) };
}

export async function joinCircle(code: string, displayName: string, existingToken?: MemberToken | null, viaShareCard = false) {
  const db = await readDb();
  const circle = findCircle(db, code);
  if (!circle) throw notFound("Circle not found.");
  const existing = existingToken?.circleId === circle.id ? db.members.find((member) => member.id === existingToken.memberId) : null;
  if (existing) return { circle, member: existing, memberToken: signMemberToken(tokenPayload(existing)) };
  const member = createMember(circle.id, displayName);
  db.members.push(member);
  db.events.push(event("member_joined", circle.id, member.id, { via: "link" }));
  if (viaShareCard) db.events.push(event("joined_via_sharecard", circle.id, member.id, { code: circle.code }));
  await writeDb(db);
  return { circle, member, memberToken: signMemberToken(tokenPayload(member)) };
}

export async function getCircleHome(code: string, token?: MemberToken | null) {
  const db = await closeExpired(readDb());
  const circle = findCircle(db, code);
  if (!circle) throw notFound("Circle not found.");
  const member = token?.circleId === circle.id ? db.members.find((row) => row.id === token.memberId) ?? null : null;
  const members = db.members.filter((row) => row.circleId === circle.id).sort((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt));
  const live = db.decodes.find((decode) => decode.circleId === circle.id && decode.status === "live") ?? null;
  const lastReveal = db.decodes
    .filter((decode) => decode.circleId === circle.id && decode.status === "revealed")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  const table = buildCircleTable(db, circle.id);
  await writeDb(db);
  return {
    circle,
    member,
    members,
    liveDecode: live ? sanitizeDecode(live, db, member?.id ?? null) : null,
    lastReveal: lastReveal ? revealPayload(lastReveal, db) : null,
    nextSetter: live ? null : nextSetter(db, circle.id),
    table,
    daily: publicPuzzle(dailyWarmup)
  };
}

export async function composeDraft(circleId: string, setterMemberId: string, input: { p1: string; p2: string; p3: string }) {
  const blocked = moderate([input.p1, input.p2, input.p3].join(" "));
  if (blocked) throw badRequest("This needs a gentler version. Keep it about consenting people in the circle.");
  const draft = await generateDraft(input);
  const stripped = stripForbiddenKeys(draft);
  const validation = validatePuzzleJson(stripped);
  if (!validation.ok) throw badRequest(validation.errors.join(" "));
  const db = await readDb();
  const decode = createDecode(circleId, setterMemberId, validation.puzzle, "draft");
  db.decodes.push(decode);
  await writeDb(db);
  return decode;
}

export async function publishDecode(memberToken: MemberToken, decodeId: string, puzzle?: PuzzleJson) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  requireMember(memberToken, decode.circleId);
  if (decode.setterMemberId !== memberToken.memberId) throw forbidden("Only the setter can publish this decode.");
  if (db.decodes.some((row) => row.circleId === decode.circleId && row.status === "live")) {
    throw badRequest("This circle already has a live decode.");
  }
  if (puzzle) {
    const validation = validatePuzzleJson(stripForbiddenKeys(puzzle));
    if (!validation.ok) throw badRequest(validation.errors.join(" "));
    decode.puzzleJson = validation.puzzle;
  }
  decode.status = "live";
  decode.closesAt = inHours(48);
  db.events.push(event("decode_set", decode.circleId, memberToken.memberId, { decodeId: decode.id }));
  maybeSecondSet(db, decode.circleId, memberToken.memberId);
  maybeRotationAccepted(db, decode.circleId, memberToken.memberId);
  await writeDb(db);
  return decode;
}

export async function answerDecode(memberToken: MemberToken, decodeId: string, chain: string[], predictionMemberId?: string | null) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  requireMember(memberToken, decode.circleId);
  if (decode.status !== "live") throw badRequest("This decode is not live.");
  if (decode.setterMemberId === memberToken.memberId) throw badRequest("The setter cannot answer their own decode.");
  if (db.answers.some((answer) => answer.decodeId === decodeId && answer.memberId === memberToken.memberId)) {
    throw badRequest("One shot. No edits.");
  }
  if (chain.length !== decode.puzzleJson.slots.length) throw badRequest("Complete the chain before submitting.");
  db.answers.push({ decodeId, memberId: memberToken.memberId, chain, predictionMemberId: predictionMemberId ?? null, createdAt: now() });
  db.events.push(event("answer_submitted", decode.circleId, memberToken.memberId, { decodeId }));
  await writeDb(db);
  return { ok: true };
}

export async function closeDecode(memberToken: MemberToken, decodeId: string, automated = false) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  requireMember(memberToken, decode.circleId);
  if (!automated && decode.setterMemberId !== memberToken.memberId) throw forbidden("Only the setter can close this decode.");
  const answerCount = db.answers.filter((answer) => answer.decodeId === decodeId).length;
  if (!automated && answerCount < 1) throw badRequest("At least one reader needs to answer before an early reveal.");
  revealDecode(db, decode);
  await writeDb(db);
  return revealPayload(decode, db);
}

export async function getReveal(memberToken: MemberToken, decodeId: string) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  requireMember(memberToken, decode.circleId);
  if (decode.status !== "revealed") throw badRequest("The reveal is not open yet.");
  db.events.push(event("reveal_viewed", decode.circleId, memberToken.memberId, { decodeId }));
  await writeDb(db);
  return revealPayload(decode, db);
}

export async function deleteDecode(memberToken: MemberToken, decodeId: string) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  requireMember(memberToken, decode.circleId);
  if (decode.setterMemberId !== memberToken.memberId) throw forbidden("Only the setter can delete this decode.");
  if (decode.status === "revealed") throw badRequest("Revealed decodes stay in history.");
  decode.status = "deleted";
  await writeDb(db);
  return { ok: true };
}

export async function logEvent(memberToken: MemberToken | null, input: { name: string; circleId?: string | null; payload?: Record<string, unknown> }) {
  const db = await readDb();
  db.events.push(event(input.name, input.circleId ?? memberToken?.circleId ?? null, memberToken?.memberId ?? null, input.payload ?? {}));
  await writeDb(db);
  return { ok: true };
}

export async function adminReadout() {
  const db = await readDb();
  return db.circles.map((circle) => {
    const decodes = db.decodes.filter((decode) => decode.circleId === circle.id && decode.status !== "deleted");
    const firstReveal = decodes.filter((decode) => decode.status === "revealed").sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
    const firstSetter = firstReveal?.setterMemberId;
    const secondSet = firstReveal
      ? decodes.find((decode) => decode.setterMemberId !== firstSetter && Date.parse(decode.createdAt) <= Date.parse(firstReveal.createdAt) + 10 * 24 * 60 * 60 * 1000)
      : null;
    return {
      code: circle.code,
      name: circle.name,
      members: db.members.filter((member) => member.circleId === circle.id).length,
      decodes: decodes.length,
      secondSetWithin10Days: Boolean(secondSet),
      composerCompleted: db.events.filter((row) => row.circleId === circle.id && row.name === "composer_completed").length,
      revealViews: db.events.filter((row) => row.circleId === circle.id && row.name === "reveal_viewed").length,
      shareCards: db.events.filter((row) => row.circleId === circle.id && row.name === "sharecard_generated").length
    };
  });
}

export async function shareCardPayload(decodeId: string) {
  const db = await readDb();
  const decode = db.decodes.find((row) => row.id === decodeId);
  if (!decode) throw notFound("Decode not found.");
  if (decode.status !== "revealed") throw badRequest("Share cards are generated after reveal.");
  const payload = revealPayload(decode, db);
  db.events.push(event("sharecard_generated", decode.circleId, null, { decodeId }));
  await writeDb(db);
  return payload;
}

export function apiError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 500;
  const message = error instanceof Error ? error.message : "Something went sideways.";
  return Response.json({ error: message }, { status });
}

function sanitizeDecode(decode: Decode, db: Database, memberId: string | null) {
  const answers = db.answers.filter((answer) => answer.decodeId === decode.id);
  return {
    id: decode.id,
    status: decode.status,
    setterMemberId: decode.setterMemberId,
    closesAt: decode.closesAt,
    puzzle: publicPuzzle(decode.puzzleJson),
    answeredCount: answers.length,
    answerCount: answers.length,
    currentMemberAnswered: Boolean(memberId && answers.some((answer) => answer.memberId === memberId))
  };
}

function revealPayload(decode: Decode, db: Database) {
  if (!decode.reveal) revealDecode(db, decode);
  return {
    decode: {
      id: decode.id,
      status: decode.status,
      setterMemberId: decode.setterMemberId,
      puzzle: decode.puzzleJson
    },
    reveal: decode.reveal,
    members: db.members.filter((member) => member.circleId === decode.circleId),
    circle: db.circles.find((circle) => circle.id === decode.circleId)
  };
}

function revealDecode(db: Database, decode: Decode) {
  const members = db.members.filter((member) => member.circleId === decode.circleId);
  const answers: ReaderAnswer[] = db.answers
    .filter((answer) => answer.decodeId === decode.id)
    .map((answer) => {
      const member = members.find((row) => row.id === answer.memberId);
      return {
        decodeId: decode.id,
        memberId: answer.memberId,
        displayName: member?.displayName ?? "Someone",
        chain: answer.chain,
        predictionMemberId: answer.predictionMemberId,
        createdAt: answer.createdAt,
        joinedAt: member?.joinedAt ?? answer.createdAt
      };
    });
  decode.reveal = computeReveal(decode.puzzleJson, answers);
  decode.status = "revealed";
}

function buildCircleTable(db: Database, circleId: string) {
  const members = db.members.filter((member) => member.circleId === circleId);
  const revealed = db.decodes.filter((decode) => decode.circleId === circleId && decode.status === "revealed");
  revealed.forEach((decode) => {
    if (!decode.reveal) revealDecode(db, decode);
  });
  const crowns = new Map<string, number>();
  const xp = new Map<string, number>();
  for (const decode of revealed) {
    xp.set(decode.setterMemberId, (xp.get(decode.setterMemberId) ?? 0) + 15);
    const reveal = decode.reveal;
    reveal?.readers.forEach((reader) => {
      xp.set(reader.memberId, (xp.get(reader.memberId) ?? 0) + reader.xp);
      if (reader.crown) crowns.set(reader.memberId, (crowns.get(reader.memberId) ?? 0) + 1);
    });
  }
  return members
    .map((member) => ({
      memberId: member.id,
      displayName: member.displayName,
      xp: xp.get(member.id) ?? 0,
      crowns: crowns.get(member.id) ?? 0,
      hardestToRead: hardestToReadLabel(db, member.id),
      streak: groupStreakWeeks(revealed)
    }))
    .sort((a, b) => b.xp - a.xp);
}

function hardestToReadLabel(db: Database, memberId: string) {
  const setDecodes = db.decodes.filter((decode) => decode.setterMemberId === memberId && decode.status === "revealed");
  if (!setDecodes.length) return "mystery pending";
  const rates = setDecodes.map((decode) => {
    const total = decode.reveal?.readers.length ?? 0;
    const exactish = decode.reveal?.readers.filter((reader) => reader.totalSlotPoints >= 10).length ?? 0;
    return total ? exactish / total : 1;
  });
  return `${Math.round((1 - Math.min(...rates)) * 100)}% hard read`;
}

function groupStreakWeeks(revealed: Decode[]) {
  if (!revealed.length) return 0;
  const weeks = new Set(revealed.map((decode) => weekKey(decode.createdAt)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = weekKey(cursor.toISOString());
    if (!weeks.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

async function closeExpired(dbPromise: Promise<Database>) {
  const db = await dbPromise;
  const expired = db.decodes.filter((decode) => decode.status === "live" && decode.closesAt && Date.parse(decode.closesAt) <= Date.now());
  expired.forEach((decode) => revealDecode(db, decode));
  return db;
}

async function generateDraft(input: { p1: string; p2: string; p3: string }): Promise<PuzzleJson> {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) return buildDraft(input);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 1600,
      temperature: 0.8,
      system: "You build warm, teasing Mogji emoji-chain decodes for close friends. Return strict JSON only.",
      messages: [
        {
          role: "user",
          content: `Moment: ${input.p1}
What people would assume: ${input.p2}
What really happened: ${input.p3}

Build a clean playable puzzle_json object only:
{
  "version": 1,
  "format": "emoji_chain",
  "source": "circle",
  "title": string,
  "setup": string,
  "authorCut": string,
  "slots": [
    {
      "id": string,
      "options": [{"id": string, "emoji": string, "label": string}],
      "answer": {"exact": [string], "alternate": [string]}
    }
  ]
}

Rules: setup is second-person plural and must not reveal what really happened. Exactly 3 slots. Exactly 4 options per slot. The assumption should be a seductive wrong option. The truth should be exact. authorCut is 15 words or fewer and follows "It looked like X. It was Y." Tone is teasing, warm, never humiliating. Do not include strategy, reasoning, metadata, composer inputs, or any non-playable fields.`
        }
      ]
    })
  });

  if (!response.ok) return buildDraft(input);
  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((part) => part.type === "text")?.text ?? "";
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  try {
    return JSON.parse(jsonText) as PuzzleJson;
  } catch {
    return buildDraft(input);
  }
}

function buildDraft(input: { p1: string; p2: string; p3: string }): PuzzleJson {
  return {
    version: 1,
    format: "emoji_chain",
    source: "circle",
    title: input.p1.slice(0, 34) || "This week got weird",
    setup: `You all saw ${input.p1}. Most people would assume ${input.p2}. Read what was really going on.`,
    authorCut: `It looked like ${short(input.p2)}. It was ${short(input.p3)}.`,
    slots: [
      {
        id: "scene",
        options: [
          { id: "assumption", emoji: "👀", label: input.p2 },
          { id: "truth", emoji: "🫠", label: input.p3 },
          { id: "busy", emoji: "📱", label: "phone chaos" },
          { id: "calm", emoji: "😌", label: "quietly fine" }
        ],
        answer: { exact: ["truth"], alternate: ["calm"] }
      },
      {
        id: "energy",
        options: [
          { id: "panic", emoji: "😬", label: "panic" },
          { id: "soft", emoji: "🫶", label: "soft life" },
          { id: "plot", emoji: "🌀", label: "plot twist" },
          { id: "sleep", emoji: "😴", label: "sleepy" }
        ],
        answer: { exact: ["plot"], alternate: ["soft"] }
      },
      {
        id: "receipt",
        options: [
          { id: "message", emoji: "💬", label: "message" },
          { id: "food", emoji: "🍜", label: "food" },
          { id: "clock", emoji: "⏰", label: "time" },
          { id: "spark", emoji: "✨", label: "tiny drama" }
        ],
        answer: { exact: ["spark"], alternate: ["message"] }
      }
    ]
  };
}

async function readDb(): Promise<Database> {
  if (useSupabaseRest()) return readSupabaseDb();
  try {
    return JSON.parse(await readFile(dbPath, "utf8")) as Database;
  } catch {
    return { circles: [], members: [], decodes: [], answers: [], events: [] };
  }
}

async function writeDb(db: Database) {
  if (useSupabaseRest()) {
    await writeSupabaseDb(db);
    return;
  }
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function useSupabaseRest() {
  return process.env.USE_DEV_FILE_DB === "false" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readSupabaseDb(): Promise<Database> {
  const [circles, members, decodes, answers, events] = await Promise.all([
    supabaseRows<CircleRow>("circles"),
    supabaseRows<MemberRow>("members"),
    supabaseRows<DecodeRow>("decodes"),
    supabaseRows<AnswerRow>("answers"),
    supabaseRows<EventRowDb>("events")
  ]);

  return {
    circles: circles.map((row) => ({ id: row.id, code: row.code, name: row.name, vibeEmoji: row.vibe_emoji, createdAt: row.created_at })),
    members: members.map((row) => ({ id: row.id, circleId: row.circle_id, anonToken: row.anon_token, displayName: row.display_name, joinedAt: row.joined_at })),
    decodes: decodes.map((row) => ({
      id: row.id,
      circleId: row.circle_id,
      setterMemberId: row.setter_member_id,
      puzzleJson: row.puzzle_json,
      status: row.status,
      createdAt: row.created_at,
      closesAt: row.closes_at,
      reveal: null
    })),
    answers: answers.map((row) => ({
      decodeId: row.decode_id,
      memberId: row.member_id,
      chain: row.chain,
      predictionMemberId: row.prediction_member_id,
      createdAt: row.created_at
    })),
    events: events.map((row) => ({
      id: row.id,
      circleId: row.circle_id,
      memberId: row.member_id,
      name: row.name,
      payload: row.payload,
      createdAt: row.created_at
    }))
  };
}

async function writeSupabaseDb(db: Database) {
  await upsertSupabase("circles", db.circles.map((row): CircleRow => ({ id: row.id, code: row.code, name: row.name, vibe_emoji: row.vibeEmoji, created_at: row.createdAt })));
  await upsertSupabase("members", db.members.map((row): MemberRow => ({ id: row.id, circle_id: row.circleId, anon_token: row.anonToken, display_name: row.displayName, joined_at: row.joinedAt })));
  await upsertSupabase("decodes", db.decodes.map((row): DecodeRow => ({
      id: row.id,
      circle_id: row.circleId,
      setter_member_id: row.setterMemberId,
      puzzle_json: row.puzzleJson,
      status: row.status,
      created_at: row.createdAt,
      closes_at: row.closesAt
    })));
  await upsertSupabase("answers", db.answers.map((row): AnswerRow => ({
      decode_id: row.decodeId,
      member_id: row.memberId,
      chain: row.chain,
      prediction_member_id: row.predictionMemberId,
      created_at: row.createdAt
    })), "decode_id,member_id");
  await upsertSupabase("events", db.events.map((row): EventRowDb => ({
      id: row.id,
      circle_id: row.circleId,
      member_id: row.memberId,
      name: row.name,
      payload: row.payload,
      created_at: row.createdAt
    })));
}

async function supabaseRows<T>(table: string): Promise<T[]> {
  const response = await supabaseFetch(`/${table}?select=*`, { method: "GET" });
  return (await response.json()) as T[];
}

async function upsertSupabase<T>(table: string, rows: T[], onConflict = "id") {
  if (!rows.length) return;
  await supabaseFetch(`/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(rows)
  });
}

async function supabaseFetch(pathname: string, init: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) throw new Error("Supabase URL and service-role key are required.");
  const response = await fetch(`${baseUrl}/rest/v1${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...headersObject(init.headers)
    }
  });
  if (!response.ok) {
    throw new Error(`Supabase ${init.method ?? "GET"} ${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

function headersObject(headers: HeadersInit | undefined) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

type CircleRow = {
  id: string;
  code: string;
  name: string;
  vibe_emoji: string;
  created_at: string;
};

type MemberRow = {
  id: string;
  circle_id: string;
  anon_token: string;
  display_name: string;
  joined_at: string;
};

type DecodeRow = {
  id: string;
  circle_id: string;
  setter_member_id: string;
  puzzle_json: PuzzleJson;
  status: Decode["status"];
  created_at: string;
  closes_at: string | null;
};

type AnswerRow = {
  decode_id: string;
  member_id: string;
  chain: string[];
  prediction_member_id: string | null;
  created_at: string;
};

type EventRowDb = {
  id: string;
  circle_id: string | null;
  member_id: string | null;
  name: string;
  payload: Record<string, unknown>;
  created_at: string;
};

function createMember(circleId: string, displayName: string): Member {
  return { id: randomUUID(), circleId, anonToken: newAnonToken(), displayName: displayName.trim() || "Someone", joinedAt: now() };
}

function createDecode(circleId: string, setterMemberId: string, puzzleJson: PuzzleJson, status: Decode["status"]): Decode {
  return { id: randomUUID(), circleId, setterMemberId, puzzleJson, status, createdAt: now(), closesAt: status === "live" ? inHours(48) : null, reveal: null };
}

function uniqueCode(db: Database): string {
  for (;;) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    if (!db.circles.some((circle) => circle.code === code)) return code;
  }
}

function findCircle(db: Database, code: string) {
  return db.circles.find((circle) => circle.code.toUpperCase() === code.toUpperCase());
}

function tokenPayload(member: Member): MemberToken {
  return { anonToken: member.anonToken, memberId: member.id, circleId: member.circleId };
}

function event(name: string, circleId: string | null, memberId: string | null, payload: Record<string, unknown>): EventRow {
  return { id: randomUUID(), circleId, memberId, name, payload, createdAt: now() };
}

function maybeSecondSet(db: Database, circleId: string, setterMemberId: string) {
  const liveOrRevealed = db.decodes.filter((decode) => decode.circleId === circleId && decode.status !== "draft" && decode.status !== "deleted");
  const firstSetter = liveOrRevealed.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]?.setterMemberId;
  if (firstSetter && firstSetter !== setterMemberId) {
    db.events.push(event("second_set_in_circle", circleId, setterMemberId, { setterMemberId }));
  }
}

function maybeRotationAccepted(db: Database, circleId: string, setterMemberId: string) {
  const named = nextSetter(db, circleId);
  if (named?.id === setterMemberId) {
    db.events.push(event("rotation_accepted", circleId, setterMemberId, { setterMemberId }));
  }
}

function nextSetter(db: Database, circleId: string) {
  const members = db.members.filter((member) => member.circleId === circleId).sort((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt));
  if (!members.length) return null;
  const lastReveal = db.decodes
    .filter((decode) => decode.circleId === circleId && decode.status === "revealed")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!lastReveal) return members[0] ?? null;
  const setterIndex = members.findIndex((member) => member.id === lastReveal.setterMemberId);
  return members[(setterIndex + 1) % members.length] ?? members[0] ?? null;
}

function moderate(text: string) {
  return /\b(sex|nude|kill|hate|humiliate)\b/i.test(text);
}

function requireMember(token: MemberToken, circleId: string) {
  if (token.circleId !== circleId) throw forbidden("This token does not belong to the circle.");
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function forbidden(message: string) {
  return Object.assign(new Error(message), { status: 403 });
}

function now() {
  return new Date().toISOString();
}

function inHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function short(text: string) {
  return text.trim().split(/\s+/).slice(0, 4).join(" ") || "a thing";
}

function weekKey(iso: string) {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  return `${year}-${Math.ceil(((date.getTime() - start) / 86400000 + new Date(start).getUTCDay() + 1) / 7)}`;
}
