"use client";

import type { PublicPuzzleJson, PuzzleJson } from "@mogji/core";
import { useEffect, useMemo, useState } from "react";

type HomePayload = {
  circle: { id: string; code: string; name: string; vibeEmoji: string };
  member: { id: string; displayName: string } | null;
  members: { id: string; displayName: string }[];
  liveDecode: null | {
    id: string;
    setterMemberId: string;
    closesAt: string;
    answeredCount: number;
    currentMemberAnswered: boolean;
    puzzle: PublicPuzzleJson;
  };
  lastReveal: RevealPayload | null;
  nextSetter: { id: string; displayName: string } | null;
  table: { memberId: string; displayName: string; xp: number; crowns: number; hardestToRead: string; streak: number }[];
  daily: PublicPuzzleJson;
};

type RevealPayload = {
  decode: { id: string; setterMemberId: string; puzzle: PuzzleJson };
  reveal: {
    truthChain: string[];
    distributionLine: string;
    readers: {
      memberId: string;
      displayName: string;
      totalSlotPoints: number;
      xp: number;
      crown: boolean;
      scores: { slotId: string; selectedOptionId: string; selectedEmoji: string; mark: "exact" | "alternate" | "miss" }[];
    }[];
  };
};

export default function CircleClient({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [home, setHome] = useState<HomePayload | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string>("");
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState<{ id: string; puzzleJson: PuzzleJson } | null>(null);
  const [prompts, setPrompts] = useState({ p1: "", p2: "", p3: "" });
  const [composerNote, setComposerNote] = useState("");
  const [composerStartedAt, setComposerStartedAt] = useState<number>(0);

  const authHeaders = useMemo(() => (token ? { authorization: `Bearer ${token}` } : undefined), [token]);

  useEffect(() => {
    const saved = localStorage.getItem(`mogji:${code}:token`);
    setToken(saved);
  }, [code]);

  useEffect(() => {
    void loadHome();
    const timer = setInterval(() => void loadHome(), 6000);
    return () => clearInterval(timer);
  }, [token]);

  async function loadHome() {
    const response = await fetch(`/api/v1/circles/${code}`, { headers: authHeaders });
    const data = await response.json();
    if (response.ok) setHome(data);
  }

  async function join() {
    setError("");
    const response = await fetch(`/api/v1/circles/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders ?? {}) },
      body: JSON.stringify({ display_name: name, via_sharecard: new URLSearchParams(window.location.search).get("from") === "sharecard" })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not join.");
      return;
    }
    localStorage.setItem(`mogji:${code}:token`, data.member_token);
    setToken(data.member_token);
  }

  async function submitAnswer() {
    if (!home?.liveDecode) return;
    const response = await fetch(`/api/v1/decodes/${home.liveDecode.id}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders ?? {}) },
      body: JSON.stringify({ chain: selected, prediction })
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Could not submit.");
    await loadHome();
  }

  async function closeDecode() {
    if (!home?.liveDecode) return;
    const response = await fetch(`/api/v1/decodes/${home.liveDecode.id}/close`, { method: "POST", headers: authHeaders });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Could not reveal yet.");
    else setReveal(data);
    await loadHome();
  }

  async function openReveal(id: string) {
    const response = await fetch(`/api/v1/decodes/${id}/reveal`, { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Reveal is not ready.");
    else setReveal(data);
  }

  async function compose() {
    setComposerNote("");
    const response = await fetch("/api/v1/decodes/compose", {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders ?? {}) },
      body: JSON.stringify({
        ...prompts,
        seconds: Math.round((Date.now() - composerStartedAt) / 1000),
        previous_decode_id: draft?.id
      })
    });
    const data = await response.json();
    if (!response.ok) setComposerNote(data.error ?? "Could not compose. Try again in a moment.");
    else setDraft(data.decode);
  }

  async function logClientEvent(name: string, payload: Record<string, unknown> = {}) {
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders ?? {}) },
      body: JSON.stringify({ name, payload, circleId: home?.circle.id })
    });
  }

  async function publish() {
    if (!draft) return;
    const response = await fetch("/api/v1/decodes", {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders ?? {}) },
      body: JSON.stringify({ decode_id: draft.id, puzzle: draft.puzzleJson })
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Could not publish.");
    else {
      setComposer(false);
      setDraft(null);
      await loadHome();
    }
  }

  async function deleteDraft() {
    if (!draft) return;
    await fetch(`/api/v1/decodes/${draft.id}`, { method: "DELETE", headers: authHeaders });
    setDraft(null);
  }

  if (!home) {
    return <Shell><div className="animate-pulse text-2xl">● ● ●</div></Shell>;
  }

  if (!home.member) {
    return (
      <Shell>
        <div className="text-6xl">{home.circle.vibeEmoji}</div>
        <h1 className="mt-5 text-4xl font-black">{home.circle.name}</h1>
        <p className="mb-7 mt-2 text-[var(--ink-muted)]">Join in one step. No account, no password.</p>
        <input className="mb-4 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] px-4" placeholder="Display name" value={name} onChange={(event) => setName(event.target.value)} />
        {error ? <ErrorLine message={error} /> : null}
        <button className="primary-button" onClick={join}>Join circle</button>
      </Shell>
    );
  }

  const live = home.liveDecode;
  const setter = live ? home.members.find((member) => member.id === live.setterMemberId) : null;
  const isSetter = live?.setterMemberId === home.member.id;

  return (
    <Shell>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-[var(--amber-ink)]">Mogji Circles</div>
          <h1 className="text-3xl font-black">{home.circle.vibeEmoji} {home.circle.name}</h1>
        </div>
        <button
          title="Copy invite"
          className="icon-button"
          onClick={() => navigator.clipboard.writeText(`${location.origin}/c/${code}`)}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      {error ? <ErrorLine message={error} /> : null}

      {reveal ? (
        <RevealView payload={reveal} code={code} onBack={() => setReveal(null)} />
      ) : composer ? (
        <Composer
          prompts={prompts}
          setPrompts={setPrompts}
          draft={draft}
          setDraft={setDraft}
          note={composerNote}
          onCompose={compose}
          onPublish={publish}
          onDelete={deleteDraft}
          onStart={() => setComposerStartedAt(Date.now())}
          onCancel={() => { void logClientEvent("composer_abandoned_at_step", { step: draft ? "review" : "prompts" }); setComposer(false); setComposerNote(""); }}
        />
      ) : (
        <>
          <section className="raised-surface mb-5">
            {live ? (
              <>
                <div className="mb-2 text-sm font-bold text-[var(--amber-ink)]">{setter?.displayName ?? "Someone"} set this</div>
                <h2 className="mb-2 text-2xl font-black">{live.puzzle.title}</h2>
                <p className="mb-4 text-[var(--ink-muted)]">{live.puzzle.setup}</p>
                <div className="mb-5 rounded-full bg-[var(--paper)] px-4 py-2 text-sm font-extrabold">{live.answeredCount} of {Math.max(home.members.length - 1, 1)} answered</div>
                {isSetter ? (
                  <button className="primary-button" onClick={closeDecode}><span aria-hidden="true">👑</span> Reveal now</button>
                ) : live.currentMemberAnswered ? (
                  <p className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 font-bold">One shot locked. Waiting for the reveal.</p>
                ) : (
                  <SolvePuzzle puzzle={live.puzzle} selected={selected} setSelected={setSelected} members={home.members.filter((member) => member.id !== home.member?.id)} prediction={prediction} setPrediction={setPrediction} onSubmit={submitAnswer} />
                )}
              </>
            ) : (
              <>
                <h2 className="mb-2 text-2xl font-black">No decode is live</h2>
                <p className="mb-4 text-[var(--ink-muted)]">{home.nextSetter ? `Your turn, ${home.nextSetter.displayName}.` : "Anyone can start if the seat is empty."}</p>
                {home.nextSetter?.id === home.member?.id || !home.nextSetter ? (
                  <button className="primary-button" onClick={() => { setComposer(true); setComposerStartedAt(Date.now()); void logClientEvent("composer_opened"); }}><span aria-hidden="true">✦</span> {home.nextSetter ? "Your turn" : "Set one now"}</button>
                ) : (
                  <button className="secondary-button" onClick={() => { setComposer(true); setComposerStartedAt(Date.now()); void logClientEvent("composer_opened"); }}><span aria-hidden="true">✦</span> Set one now</button>
                )}
              </>
            )}
          </section>

          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black">Circle table</h2>
              <button className="secondary-button" onClick={() => { setComposer(true); setComposerStartedAt(Date.now()); void logClientEvent("composer_opened"); }}><span aria-hidden="true">✦</span> Compose</button>
            </div>
            <div className="grid gap-2">
              {home.table.map((row, index) => (
                <div key={row.memberId} className="table-row">
                  <span className="font-black text-[var(--amber-ink)]">#{index + 1}</span>
                  <span className="font-bold">{row.displayName}</span>
                  <span className="font-black text-[var(--meta)]">{row.xp} XP</span>
                  <span>👑 {row.crowns}</span>
                  <span className="text-sm text-[var(--ink-muted)]">{row.hardestToRead}</span>
                </div>
              ))}
            </div>
          </section>

          {home.lastReveal ? (
            <section className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] p-4">
              <div className="mb-1 text-sm font-bold text-[var(--amber-ink)]">Last reveal</div>
              <h2 className="mb-3 text-xl font-black">{home.lastReveal.decode.puzzle.title}</h2>
              <button className="secondary-button" onClick={() => openReveal(home.lastReveal!.decode.id)}><span aria-hidden="true">👑</span> View reveal</button>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] p-4">
            <div className="mb-1 text-sm font-bold text-[var(--amber-ink)]">Daily warm-up</div>
            <h2 className="mb-2 text-xl font-black">{home.daily.title}</h2>
            <p className="text-[var(--ink-muted)]">{home.daily.setup}</p>
            <div className="mt-3 flex gap-2 text-3xl">{home.daily.slots.map((slot) => <span key={slot.id}>{slot.options[0]?.emoji}</span>)}</div>
          </section>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">{children}</main>;
}

function ErrorLine({ message }: { message: string }) {
  return <p className="mb-4 rounded-2xl border border-[var(--miss)] bg-[var(--paper-raised)] p-3 font-bold text-[var(--miss)]">{message}</p>;
}

function SolvePuzzle(props: {
  puzzle: PublicPuzzleJson;
  selected: string[];
  setSelected: (chain: string[]) => void;
  members: { id: string; displayName: string }[];
  prediction: string;
  setPrediction: (value: string) => void;
  onSubmit: () => void;
}) {
  function choose(slotIndex: number, optionId: string) {
    const next = [...props.selected];
    next[slotIndex] = optionId;
    props.setSelected(next);
  }

  return (
    <div>
      {props.puzzle.slots.map((slot, slotIndex) => (
        <div key={slot.id} className="mb-4">
          <div className="chain mb-2">
            {props.puzzle.slots.map((chainSlot, index) => {
              const selectedOption = chainSlot.options.find((option) => option.id === props.selected[index]);
              return <span key={chainSlot.id} className={selectedOption ? "chain-slot filled" : "chain-slot"}>{selectedOption?.emoji ?? ""}</span>;
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {slot.options.map((option) => (
              <button key={option.id} className={`tile ${props.selected[slotIndex] === option.id ? "selected" : ""}`} onClick={() => choose(slotIndex, option.id)}>
                <span className="text-4xl">{option.emoji}</span>
                <span className="text-sm font-bold">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <select className="mb-3 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] px-4" value={props.prediction} onChange={(event) => props.setPrediction(event.target.value)}>
        <option value="">Optional: who else got this right?</option>
        {props.members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
      </select>
      <button className="primary-button" disabled={props.selected.filter(Boolean).length !== props.puzzle.slots.length} onClick={props.onSubmit}>
        <span aria-hidden="true">✓</span> Lock answer
      </button>
    </div>
  );
}

function Composer(props: {
  prompts: { p1: string; p2: string; p3: string };
  setPrompts: (prompts: { p1: string; p2: string; p3: string }) => void;
  draft: { id: string; puzzleJson: PuzzleJson } | null;
  setDraft: (draft: { id: string; puzzleJson: PuzzleJson }) => void;
  note: string;
  onCompose: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const promptFields: Array<[keyof typeof props.prompts, string]> = [
    ["p1", "Pick a moment from your week — anything."],
    ["p2", "What would people assume about it?"],
    ["p3", "What actually happened / what was really going on?"]
  ];

  useEffect(() => props.onStart(), []);

  const noteCallout = props.note ? (
    <p className="mb-4 rounded-2xl border border-[var(--amber-ink)] bg-[var(--paper)] p-4 font-bold">{props.note}</p>
  ) : null;

  function updatePuzzle(mutate: (puzzle: PuzzleJson) => void) {
    if (!props.draft) return;
    const puzzle = JSON.parse(JSON.stringify(props.draft.puzzleJson)) as PuzzleJson;
    mutate(puzzle);
    props.setDraft({ ...props.draft, puzzleJson: puzzle });
  }

  if (props.draft) {
    return (
      <section className="raised-surface">
        <h2 className="mb-2 text-2xl font-black">{props.draft.puzzleJson.title}</h2>
        <p className="mb-4 text-[var(--ink-muted)]">{props.draft.puzzleJson.setup}</p>
        {noteCallout}
        <div className="mb-4 grid gap-3">
          {props.draft.puzzleJson.slots.map((slot, slotIndex) => (
            <div key={slot.id} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-[var(--meta)]">
                <span>Slot {slotIndex + 1}</span>
                <span>✅ truth · ↔️ close enough</span>
              </div>
              {slot.options.map((option, optionIndex) => {
                const isExact = slot.answer.exact.includes(option.id);
                const isAlternate = slot.answer.alternate?.includes(option.id) ?? false;
                return (
                  <div key={option.id} className="mb-2 flex items-center gap-2">
                    <input
                      aria-label={`Slot ${slotIndex + 1} option ${optionIndex + 1} emoji`}
                      className="w-14 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-center text-xl"
                      value={option.emoji}
                      onChange={(event) => updatePuzzle((puzzle) => { puzzle.slots[slotIndex]!.options[optionIndex]!.emoji = event.target.value; })}
                    />
                    <input
                      aria-label={`Slot ${slotIndex + 1} option ${optionIndex + 1} label`}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-sm"
                      value={option.label ?? ""}
                      onChange={(event) => updatePuzzle((puzzle) => { puzzle.slots[slotIndex]!.options[optionIndex]!.label = event.target.value; })}
                    />
                    <button
                      type="button"
                      title="Mark as the truth"
                      className={`rounded-xl border px-2 py-1 text-sm ${isExact ? "border-[var(--amber-ink)] bg-[var(--paper-raised)] font-black" : "border-[var(--line)] opacity-50"}`}
                      onClick={() => updatePuzzle((puzzle) => {
                        const target = puzzle.slots[slotIndex]!;
                        target.answer.exact = [option.id];
                        target.answer.alternate = (target.answer.alternate ?? []).filter((id) => id !== option.id);
                      })}
                    >✅</button>
                    <button
                      type="button"
                      title="Toggle as a defensible read"
                      className={`rounded-xl border px-2 py-1 text-sm ${isAlternate ? "border-[var(--amber-ink)] bg-[var(--paper-raised)] font-black" : "border-[var(--line)] opacity-50"}`}
                      disabled={isExact}
                      onClick={() => updatePuzzle((puzzle) => {
                        const target = puzzle.slots[slotIndex]!;
                        const alternate = target.answer.alternate ?? [];
                        target.answer.alternate = alternate.includes(option.id)
                          ? alternate.filter((id) => id !== option.id)
                          : [...alternate, option.id];
                      })}
                    >↔️</button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <label className="mb-4 grid gap-2 font-bold">
          Author's cut
          <textarea className="min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4" value={props.draft.puzzleJson.authorCut} onChange={(event) => props.setDraft({ ...props.draft!, puzzleJson: { ...props.draft!.puzzleJson, authorCut: event.target.value } })} />
        </label>
        <p className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 text-sm font-bold">Your circle will see this. The share card may be forwarded. Keep it funny, not private.</p>
        <div className="grid gap-3">
          <button className="primary-button" onClick={props.onPublish}><span aria-hidden="true">↗</span> Send</button>
          <button className="secondary-button" onClick={props.onCompose}><span aria-hidden="true">↻</span> Reshuffle</button>
          <button className="secondary-button" onClick={props.onDelete}><span aria-hidden="true">⌫</span> Delete draft</button>
        </div>
      </section>
    );
  }
  return (
    <section className="raised-surface">
      <h2 className="mb-4 text-2xl font-black">Set a decode</h2>
      {noteCallout}
      {promptFields.map(([key, label]) => (
        <label key={key} className="mb-4 grid gap-2 font-bold">
          {label}
          <textarea className="min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4" value={props.prompts[key]} onChange={(event) => props.setPrompts({ ...props.prompts, [key]: event.target.value })} />
        </label>
      ))}
      <div className="grid gap-3">
        <button className="primary-button" onClick={props.onCompose}><span aria-hidden="true">✦</span> Build decode</button>
        <button className="secondary-button" onClick={props.onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function RevealView({ payload, code, onBack }: { payload: RevealPayload; code: string; onBack: () => void }) {
  const crown = payload.reveal.readers.find((reader) => reader.crown);
  return (
    <section className="reveal rounded-[20px] border border-[var(--line)] bg-[var(--paper-raised)] p-5 shadow-[0_8px_24px_var(--shadow-flat)]">
      <div className="mb-2 text-sm font-bold text-[var(--amber-ink)]">The reveal</div>
      <h2 className="mb-4 text-3xl font-black">{payload.decode.puzzle.title}</h2>
      <div className="truth-chain mb-4">{payload.reveal.truthChain.map((emoji, index) => <span key={`${emoji}-${index}`} className="truth-tile">{emoji}</span>)}</div>
      <p className="mb-5 rounded-2xl bg-[var(--paper)] p-4 text-lg font-bold">Mogji says: {payload.decode.puzzle.authorCut}</p>
      <div className="mb-5 grid gap-2">
        {payload.reveal.readers.map((reader) => (
          <div key={reader.memberId} className="reader-row">
            <span className="font-bold">{reader.crown ? "👑 " : ""}{reader.displayName}</span>
            <span className="flex gap-1">{reader.scores.map((score) => <span key={score.slotId} className={`mark ${score.mark}`}>{score.selectedEmoji}</span>)}</span>
            <span className="text-sm font-black text-[var(--meta)]">{reader.xp} XP</span>
          </div>
        ))}
      </div>
      <p className="mb-5 text-[var(--ink-muted)]">{payload.reveal.distributionLine}</p>
      <p className="mb-5 font-black">{crown?.displayName ?? "Someone"} read it best.</p>
      <div className="grid gap-3">
        <a className="primary-button" href={`/api/v1/decodes/${payload.decode.id}/card.png`} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span> Send to the circle</a>
        <button className="secondary-button" onClick={onBack}>Your turn →</button>
      </div>
    </section>
  );
}
