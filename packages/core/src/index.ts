export type DecodeStatus = "draft" | "live" | "revealed" | "deleted";
export type PuzzleFormat = "emoji_chain";
export type PuzzleSource = "circle" | "daily";
export type ScoreMark = "exact" | "alternate" | "miss";

export type PuzzleOption = {
  id: string;
  emoji: string;
  label?: string;
};

export type PuzzleSlot = {
  id: string;
  options: PuzzleOption[];
  answer: {
    exact: string[];
    alternate?: string[];
  };
};

export type PuzzleJson = {
  version: number;
  format: PuzzleFormat;
  source: PuzzleSource;
  title: string;
  setup: string;
  authorCut: string;
  slots: PuzzleSlot[];
};

export type PublicPuzzleJson = Omit<PuzzleJson, "authorCut" | "slots"> & {
  slots: Array<Omit<PuzzleSlot, "answer">>;
};

export type ReaderAnswer = {
  decodeId: string;
  memberId: string;
  displayName: string;
  chain: string[];
  predictionMemberId?: string | null;
  createdAt: string;
  joinedAt: string;
};

export type SlotScore = {
  slotId: string;
  selectedOptionId: string;
  selectedEmoji: string;
  mark: ScoreMark;
  points: number;
};

export type ReaderReveal = {
  memberId: string;
  displayName: string;
  scores: SlotScore[];
  totalSlotPoints: number;
  xp: number;
  crown: boolean;
};

export type RevealResult = {
  truthChain: string[];
  readers: ReaderReveal[];
  crownMemberId: string | null;
  distributionLine: string;
};

export type XpBreakdown = {
  solve: number;
  exact: number;
  alternate: number;
  crown: number;
  setting: number;
  prediction: number;
  total: number;
};

export const forbiddenPuzzleKeys = [
  "generationStrategy",
  "strategy",
  "creativeStrategy",
  "pivot",
  "pivotSlotIndex",
  "assumption",
  "assumptionChoiceId",
  "truthChoiceId",
  "magnet",
  "magnetChoiceId",
  "distractorTaxonomy",
  "composerReasoning",
  "promptReasoning",
  "modelReasoning",
  "whyThisWorks",
  "generation",
  "metadata",
  "composer_inputs",
  "setter_cut"
] as const;

export function stripForbiddenKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripForbiddenKeys(item)) as T;
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if ((forbiddenPuzzleKeys as readonly string[]).includes(key)) {
        continue;
      }
      output[key] = stripForbiddenKeys(nested);
    }
    return output as T;
  }

  return value;
}

export function findForbiddenKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenKeys(item, `${path}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) => {
      const nextPath = `${path}.${key}`;
      const hit = (forbiddenPuzzleKeys as readonly string[]).includes(key) ? [nextPath] : [];
      return [...hit, ...findForbiddenKeys(nested, nextPath)];
    });
  }

  return [];
}

export function validatePuzzleJson(value: unknown): { ok: true; puzzle: PuzzleJson } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const puzzle = value as Partial<PuzzleJson>;

  if (!puzzle || typeof puzzle !== "object") errors.push("Puzzle must be an object.");
  if (typeof puzzle.version !== "number") errors.push("version is required.");
  if (puzzle.format !== "emoji_chain") errors.push("format must be emoji_chain.");
  if (puzzle.source !== "circle" && puzzle.source !== "daily") errors.push("source must be circle or daily.");
  if (!puzzle.title) errors.push("title is required.");
  if (!puzzle.setup) errors.push("setup is required.");
  if (!puzzle.authorCut) errors.push("authorCut is required.");
  if (!Array.isArray(puzzle.slots) || puzzle.slots.length !== 3) errors.push("Puzzle must have exactly 3 slots.");

  const forbidden = findForbiddenKeys(value);
  if (forbidden.length > 0) errors.push(`Forbidden keys present: ${forbidden.join(", ")}`);

  puzzle.slots?.forEach((slot, slotIndex) => {
    if (!slot.id) errors.push(`slots[${slotIndex}].id is required.`);
    if (!Array.isArray(slot.options) || slot.options.length !== 4) {
      errors.push(`slots[${slotIndex}] must have exactly 4 options.`);
    }
    const optionIds = new Set(slot.options?.map((option) => option.id) ?? []);
    if ((slot.options ?? []).some((option) => !option.id || !option.emoji)) {
      errors.push(`slots[${slotIndex}] options require id and emoji.`);
    }
    if (!slot.answer?.exact?.length) errors.push(`slots[${slotIndex}] answer.exact is required.`);
    const alternate = slot.answer?.alternate ?? [];
    const overlap = (slot.answer?.exact ?? []).filter((id) => alternate.includes(id));
    if (overlap.length) errors.push(`slots[${slotIndex}] exact and alternate overlap.`);
    for (const answerId of [...(slot.answer?.exact ?? []), ...alternate]) {
      if (!optionIds.has(answerId)) errors.push(`slots[${slotIndex}] answer references missing option ${answerId}.`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, puzzle: puzzle as PuzzleJson };
}

export function publicPuzzle(puzzle: PuzzleJson): PublicPuzzleJson {
  return {
    version: puzzle.version,
    format: puzzle.format,
    source: puzzle.source,
    title: puzzle.title,
    setup: puzzle.setup,
    slots: puzzle.slots.map((slot) => ({
      id: slot.id,
      options: slot.options
    }))
  };
}

export function truthChain(puzzle: PuzzleJson): string[] {
  return puzzle.slots.map((slot) => {
    const exactId = slot.answer.exact[0];
    return slot.options.find((option) => option.id === exactId)?.emoji ?? "";
  });
}

export function scoreAnswer(chain: string[], puzzle: PuzzleJson): SlotScore[] {
  return puzzle.slots.map((slot, index) => {
    const selectedOptionId = chain[index] ?? "";
    const selectedOption = slot.options.find((option) => option.id === selectedOptionId);
    const mark: ScoreMark = slot.answer.exact.includes(selectedOptionId)
      ? "exact"
      : slot.answer.alternate?.includes(selectedOptionId)
        ? "alternate"
        : "miss";

    return {
      slotId: slot.id,
      selectedOptionId,
      selectedEmoji: selectedOption?.emoji ?? "❔",
      mark,
      points: mark === "exact" ? 5 : mark === "alternate" ? 2 : 0
    };
  });
}

export function awardXp(scores: SlotScore[], options: { crown?: boolean; setting?: boolean; predictionCorrect?: boolean } = {}): XpBreakdown {
  const exact = scores.filter((score) => score.mark === "exact").length * 5;
  const alternate = scores.filter((score) => score.mark === "alternate").length * 2;
  const crown = options.crown ? 10 : 0;
  const setting = options.setting ? 15 : 0;
  const prediction = options.predictionCorrect ? 5 : 0;
  const solve = scores.length ? 10 : 0;

  return {
    solve,
    exact,
    alternate,
    crown,
    setting,
    prediction,
    total: solve + exact + alternate + crown + setting + prediction
  };
}

export function computeReveal(puzzle: PuzzleJson, answers: ReaderAnswer[]): RevealResult {
  const answerScores = new Map<string, SlotScore[]>();
  for (const answer of answers) {
    answerScores.set(answer.memberId, scoreAnswer(answer.chain, puzzle));
  }
  const exactReaders = new Set(
    [...answerScores.entries()]
      .filter(([, scores]) => scores.length > 0 && scores.every((score) => score.mark === "exact"))
      .map(([memberId]) => memberId)
  );

  const ordered = [...answers].sort((a, b) => {
    const aScores = answerScores.get(a.memberId) ?? [];
    const bScores = answerScores.get(b.memberId) ?? [];
    const pointDelta = sumSlotPoints(bScores) - sumSlotPoints(aScores);
    if (pointDelta !== 0) return pointDelta;
    const submitDelta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (submitDelta !== 0) return submitDelta;
    return Date.parse(a.joinedAt) - Date.parse(b.joinedAt);
  });

  const crownMemberId = ordered[0]?.memberId ?? null;
  const readers = answers.map((answer) => {
    const scores = answerScores.get(answer.memberId) ?? [];
    const crown = answer.memberId === crownMemberId;
    const predictionCorrect = Boolean(answer.predictionMemberId && exactReaders.has(answer.predictionMemberId));
    return {
      memberId: answer.memberId,
      displayName: answer.displayName,
      scores,
      totalSlotPoints: sumSlotPoints(scores),
      xp: awardXp(scores, { crown, predictionCorrect }).total,
      crown
    };
  });

  return {
    truthChain: truthChain(puzzle),
    readers,
    crownMemberId,
    distributionLine: buildDistributionLine(puzzle, answers)
  };
}

export function nextStatus(current: DecodeStatus, action: "publish" | "close" | "delete"): DecodeStatus {
  if (action === "delete" && current !== "revealed") return "deleted";
  if (current === "draft" && action === "publish") return "live";
  if (current === "live" && action === "close") return "revealed";
  throw new Error(`Invalid transition: ${current} via ${action}`);
}

function sumSlotPoints(scores: SlotScore[]): number {
  return scores.reduce((sum, score) => sum + score.points, 0);
}

function buildDistributionLine(puzzle: PuzzleJson, answers: ReaderAnswer[]): string {
  if (!answers.length) return "No reads landed before the reveal.";
  const pivotIndex = 1;
  const slot = puzzle.slots[pivotIndex] ?? puzzle.slots[0];
  if (!slot) return "The room split in a way only this circle would.";
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const selected = answer.chain[pivotIndex] ?? answer.chain[0] ?? "";
    counts.set(selected, (counts.get(selected) ?? 0) + 1);
  }
  const [topId, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const top = slot.options.find((option) => option.id === topId);
  const truth = slot.options.find((option) => option.id === slot.answer.exact[0]);
  return `${topCount} of ${answers.length} read ${top?.label ?? top?.emoji ?? "the room"} that way. Truth was ${truth?.label ?? truth?.emoji ?? "somewhere else"}.`;
}
