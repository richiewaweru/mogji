import assert from "node:assert/strict";
import { computeReveal, publicPuzzle, scoreAnswer, stripForbiddenKeys, validatePuzzleJson } from "./index.js";

const puzzle = {
  version: 1,
  format: "emoji_chain",
  source: "circle",
  title: "Omw (from the tub)",
  setup: "Kevin told you all he was five minutes away. Decode what was actually happening.",
  authorCut: "It looked like traffic. It was bathwater.",
  slots: [
    {
      id: "where",
      options: [
        { id: "cab", emoji: "🚕", label: "in a cab" },
        { id: "tub", emoji: "🛁", label: "in the tub" },
        { id: "bed", emoji: "🛌", label: "in bed" },
        { id: "shop", emoji: "🛒", label: "at the shop" }
      ],
      answer: { exact: ["tub"], alternate: ["bed"] }
    },
    {
      id: "mood",
      options: [
        { id: "panic", emoji: "😬", label: "panic" },
        { id: "calm", emoji: "😌", label: "calm" },
        { id: "rage", emoji: "😡", label: "furious" },
        { id: "sleep", emoji: "😴", label: "asleep" }
      ],
      answer: { exact: ["calm"], alternate: ["panic"] }
    },
    {
      id: "next",
      options: [
        { id: "run", emoji: "🏃", label: "sprint" },
        { id: "tea", emoji: "☕", label: "tea" },
        { id: "ghost", emoji: "🫥", label: "ghost" },
        { id: "text", emoji: "📱", label: "text" }
      ],
      answer: { exact: ["text"], alternate: ["tea"] }
    }
  ],
  strategy: "forbidden"
};

const stripped = stripForbiddenKeys(puzzle);
const validation = validatePuzzleJson(stripped);
assert.equal(validation.ok, true);
if (validation.ok) {
  const scores = scoreAnswer(["tub", "panic", "tea"], validation.puzzle);
  assert.deepEqual(scores.map((score) => score.mark), ["exact", "alternate", "alternate"]);
  const firstPublicSlot = publicPuzzle(validation.puzzle).slots[0];
  assert.ok(firstPublicSlot);
  assert.equal("answer" in firstPublicSlot, false);
  const reveal = computeReveal(validation.puzzle, [
    {
      decodeId: "d1",
      memberId: "m2",
      displayName: "Ada",
      chain: ["tub", "calm", "text"],
      predictionMemberId: "m3",
      createdAt: "2026-07-06T08:00:00Z",
      joinedAt: "2026-07-06T07:00:00Z"
    },
    {
      decodeId: "d1",
      memberId: "m3",
      displayName: "Bo",
      chain: ["tub", "calm", "text"],
      predictionMemberId: null,
      createdAt: "2026-07-06T08:02:00Z",
      joinedAt: "2026-07-06T06:00:00Z"
    }
  ]);
  assert.equal(reveal.crownMemberId, "m2");
  assert.equal(reveal.readers.find((reader) => reader.memberId === "m2")?.xp, 40);
}
