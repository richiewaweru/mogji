# Milestone 3 — The Traveling Surfaces

*Days 11–13. The reveal and the share card are the only two surfaces that leave the app and travel into group chats. They are the acquisition engine, so they — and only they — get the full design and motion budget. Everything before this was correct; this is where it becomes beautiful.*

**Authorities:** Design Spec v1.1 §7 (motion), §8 (share card), §4–§5 (tile + chain) · final spec §3 (S5, S6), §7 (card route).

**Definition of done:** on close, the reveal plays the ~10-second choreography and lands correctly even with motion disabled; the "Share to group" button produces a 1080×1350 PNG that is funny to someone who's never seen the app; and pasting a `/c/:code` link into WhatsApp unfurls a preview carrying the circle's vibe.

---

## Goal

Ship the reveal choreography, the server-rendered share card, and link unfurling — the three things that turn one played round into new players.

## Scope (build these)

**1. The reveal choreography (Design Spec §7), ~10s, once per round:**
1. Truth chain flips in slot by slot — 300ms per tile, Wordle-style flip; the 3-dot connectors fill left→right between tiles.
2. Each reader's row lights ✅/↔️/❌ left→right, rows staggered 150ms.
3. 👑 drops onto the best reader with a single bounce — the only animated badge; it crowns a *person*, never a score.
4. One confetti burst — `mogjiYellow` + the circle's vibe tint only, 1.5s, **never loops**.
5. The share button scales in with a gentle breathe.
`prefers-reduced-motion` collapses all of this to a fade-through — **the reveal must still fully land without motion.** Test that path explicitly. No spinner ever; loading = tiles filling left→right.

**2. The reveal layout, finished.** Setter's truth chain (reveal-size emoji, 64px+); every reader's marked chain in a compact grid; the distribution line ("4 of 6 thought Kevin was furious. Kevin was asleep."); "Mogji says" author's cut as the punchline; then two actions — **Send to the circle** (primary, butter gradient) and **Your turn, [next setter] →**. Voice per Design Spec §9: names people not points ("Ada read Kevin best"), a miss is "a fair read," never "wrong."

**3. `GET /api/v1/decodes/:id/card.png` — server-rendered via `@vercel/og`.** 1080×1350 portrait, paper background, candy finish, layout top→bottom (Design Spec §8): vibe-tint band with circle name + vibe emoji and the wordmark; decode title in display font; the truth chain at reveal size (the hero); the author's-cut line in quotes; a white pill crown line ("👑 Ada read Kevin best"); a small `inkMuted` footer — a curiosity question + `playmogji.com/c/CODE`. **Card rule: funny to someone not in the app.** If it needs context, fix the card, not the caption. Only generated for `revealed` decodes.

**4. Share action.** "Send to the circle" fetches/opens the card image for save-and-share into WhatsApp/IG. The card is the exit from every end state (web rule: share is the exit).

**5. OG / link unfurling on `/c/:code`.** Dynamic OG image + tags so a pasted circle link previews in chat apps with the circle name and vibe emoji — this is a primary acquisition path and must look native to the chat it lands in.

**6. Polish the web `/today`-style shell around the reveal** to match the web design sheet (quiet masthead, mini-chain by the wordmark, play column centered, rail that never competes) — only as far as needed to frame the reveal well. Full daily puzzle is still M4.

## Do NOT build

Events suite (M4) · the styled leaderboard/streak table (M4) · the embedded daily puzzle (M4) · seeding the test circles (M4) · any second animated element anywhere (motion budget is spent entirely on the reveal) · looping confetti · dark mode.

## Acceptance checklist

- [ ] Reveal choreography plays in order, ~10s, confetti does not loop
- [ ] With `prefers-reduced-motion`, the reveal still fully communicates result + crown + author's cut
- [ ] No spinner anywhere; loading states use left→right tile fill
- [ ] Card endpoint returns a correct 1080×1350 PNG only for revealed decodes
- [ ] A stranger shown only the card understands the joke (test on one real person)
- [ ] Pasting a `/c/:code` link into WhatsApp shows an unfurled preview with the vibe
- [ ] Reveal actions use the locked voice ("read it best," "a fair read," never "wrong")
- [ ] One accent per screen; one golden tile per chain; one chain per view (design don'ts hold)

## Handoff to Milestone 4

The payoff is beautiful and the card travels. M4 makes the whole thing measurable and seeds the real test: wire every event, build the circle table + group streak, embed the daily puzzle as a warm-up, and stand up the three test circles for Weeks 2–3.
