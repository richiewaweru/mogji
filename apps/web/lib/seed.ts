import type { PuzzleJson } from "@mogji/core";

export const seedDecode: PuzzleJson = {
  version: 1,
  format: "emoji_chain",
  source: "circle",
  title: "Omw (from the tub)",
  setup: "Kevin told you all he was five minutes away, then sent 'omw' with suspicious confidence. Decode what was really going on.",
  authorCut: "It looked like traffic. It was bathwater.",
  slots: [
    {
      id: "location",
      options: [
        { id: "traffic", emoji: "🚗", label: "traffic" },
        { id: "tub", emoji: "🛁", label: "in the tub" },
        { id: "bed", emoji: "🛌", label: "still in bed" },
        { id: "shop", emoji: "🛒", label: "side quest" }
      ],
      answer: { exact: ["tub"], alternate: ["bed"] }
    },
    {
      id: "energy",
      options: [
        { id: "panic", emoji: "😬", label: "scrambling" },
        { id: "zen", emoji: "😌", label: "peaceful" },
        { id: "rage", emoji: "😤", label: "annoyed" },
        { id: "asleep", emoji: "😴", label: "basically asleep" }
      ],
      answer: { exact: ["zen"], alternate: ["panic"] }
    },
    {
      id: "move",
      options: [
        { id: "sprint", emoji: "🏃", label: "sprint out" },
        { id: "tea", emoji: "☕", label: "finish the tea" },
        { id: "ghost", emoji: "🫥", label: "go quiet" },
        { id: "text", emoji: "📱", label: "send another text" }
      ],
      answer: { exact: ["text"], alternate: ["tea"] }
    }
  ]
};

export const dailyWarmup: PuzzleJson = {
  version: 1,
  format: "emoji_chain",
  source: "daily",
  title: "The quick errand",
  setup: "Someone says they are popping out for one quick thing. The group chat gets an update forty minutes later.",
  authorCut: "It looked efficient. It was a snack pilgrimage.",
  slots: [
    {
      id: "place",
      options: [
        { id: "bank", emoji: "🏦", label: "bank" },
        { id: "snack", emoji: "🍟", label: "snack stop" },
        { id: "gym", emoji: "🏋️", label: "gym" },
        { id: "fuel", emoji: "⛽", label: "fuel" }
      ],
      answer: { exact: ["snack"], alternate: ["fuel"] }
    },
    {
      id: "mood",
      options: [
        { id: "focused", emoji: "🎯", label: "focused" },
        { id: "tempted", emoji: "👀", label: "tempted" },
        { id: "lost", emoji: "🧭", label: "lost" },
        { id: "sleepy", emoji: "🥱", label: "sleepy" }
      ],
      answer: { exact: ["tempted"], alternate: ["lost"] }
    },
    {
      id: "receipt",
      options: [
        { id: "empty", emoji: "🧾", label: "receipt" },
        { id: "bag", emoji: "🛍️", label: "bag" },
        { id: "photo", emoji: "📸", label: "photo" },
        { id: "crumbs", emoji: "🍪", label: "crumbs" }
      ],
      answer: { exact: ["crumbs"], alternate: ["bag"] }
    }
  ]
};
