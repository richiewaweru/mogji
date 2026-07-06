export const color = {
  paper: "#FFF9F0",
  paperRaised: "#FFFFFF",
  ink: "#2B2B33",
  inkMuted: "#6E6E7A",
  line: "#F3EAD9",
  butterFrom: "#FFD666",
  butterTo: "#FFC93C",
  amberInk: "#B08A2E",
  mogjiYellow: "#FFCC4D",
  mogjiYellowDeep: "#F5B82E",
  match: "#66BB6A",
  alternate: "#4FC3F7",
  miss: "#FF6B6B",
  meta: "#9575CD",
  candyBorder: "#F3E3BC",
  shadowAmberFlat: "rgba(198,145,10,0.06)",
  shadowAmberTile: "rgba(198,145,10,0.14)",
  shadowAmberButton: "rgba(198,145,10,0.26)",
  vibe: {
    fire: "#FF6B6B",
    wave: "#4FC3F7",
    leaf: "#66BB6A",
    star: "#FFCC4D",
    grape: "#9575CD",
    peach: "#FFAB91"
  }
} as const;

export const font = {
  display: "'Baloo 2', 'Nunito', system-ui, sans-serif",
  body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  emoji: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"
} as const;

export const typeScale = {
  hero: { size: 32, weight: 700, lineHeight: 1.15 },
  title: { size: 24, weight: 700, lineHeight: 1.2 },
  heading: { size: 18, weight: 700, lineHeight: 1.3 },
  body: { size: 16, weight: 400, lineHeight: 1.5 },
  caption: { size: 13, weight: 500, lineHeight: 1.4 },
  score: { size: 20, weight: 800, lineHeight: 1 }
} as const;

export const emojiSize = {
  choice: 40,
  slot: 48,
  reveal: 64,
  vibe: 28,
  inline: 20
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const radius = {
  card: 20,
  button: 16,
  chip: 12,
  bubble: 18,
  full: 999
} as const;

export const shadow = {
  card: "0 2px 8px rgba(43,43,51,0.06)",
  raised: "0 6px 20px rgba(43,43,51,0.10)",
  none: "none"
} as const;

export const tap = { minTarget: 48 } as const;

export type VibeKey = keyof typeof color.vibe;
