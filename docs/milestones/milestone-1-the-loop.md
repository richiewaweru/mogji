# Milestone 1 — The Loop (no AI)

*Days 3–6. The whole game, running on one hand-written puzzle. This is the most important milestone: if the loop isn't fun on a seed decode, no composer will save it. Prove the loop before building the generator.*

**Authorities:** final spec §2 (loop), §3 (screens), §4 (schema), §7 (API), §8 (scoring) · Design Spec v1.1 §4 (candy tile), §5 (chain), §6 (components), §7 (motion).

**Definition of done:** in a real browser, person A creates a circle, opens the seeded decode, and person B (second browser/incognito) joins via the link, solves, and — after close — both see a reveal with correct ✅/↔️/❌ marks, a crowned best reader, and the truth chain. End to end, no AI anywhere.

---

## Goal

Implement create → join → solve → close → reveal on a hand-authored seed decode, with real scoring from `/packages/core`. Ugly-but-correct everywhere except the tile and chain, which follow the design spec because they're reused forever.

## Scope (build these)

**1. The seed decode (do this first, by hand).** Author one decode as a static object matching the locked `puzzle_json` (final spec §4): `title`, `setup`, `authorCut`, 3 slots × 4 options, `answer.exact` + honest `answer.alternate`, plus expected reveal line and share-card text. Use the "Omw (from the tub)" or "Call Me" example from the content docs — known-good content so the loop is tested on quality, not on a placeholder. Insert it into `decodes` as `status='live'` for a test circle. **No composer exists yet; this is the only decode in the system.**

**2. Fill in `/packages/core`.**
- `scoreAnswer(chain, puzzle)` → per-slot mark: `exact`→✅, `alternate`→↔️, else ❌.
- `computeReveal(decode, answers)` → truth chain, each reader's marked chain, distribution per slot, crown (tie-break: highest slot score → earliest submission → earliest join, per final spec §1.7).
- `awardXp(...)` → +10 solve, +5/✅, +2/↔️, +10 crown, +15 set, +5 correct prediction.
- `nextStatus(...)` → the `draft→live→revealed|deleted` transitions.
All pure, unit-tested, no DB calls. The server routes call these; the client never does (answers must not reach the client pre-reveal).

**3. Join flow.** `POST /api/v1/circles/:code/join` (display name → member token). The `/c/:code` page: if you're not a member, show join; if you are, show circle home.

**4. Circle home (S2), minimal.** The live decode card owns the fold (raised candy surface per Design Spec §6 surface anatomy), an "X of Y answered" ticker (Supabase realtime or poll), and a plain members list. No leaderboard styling yet — a bare list is fine; the table lands in M4.

**5. Solve screen (S4).** Port/build the puzzle component to the candy-tile + chain spec:
- Tiles use the exact recipe (Design Spec §4): butter-white gradient fill, `#F3E3BC` border, inset lip, `shadowAmber`, ~27% radius. Selected tile = the golden variant (max one golden per chain).
- The Mogji Chain motif (Design Spec §5): filled slots + 3-dot `yellowDeep` connectors; unrevealed connectors in `line` gray; empty active slot dashed.
- One submission, then locked ("One shot. No edits."). Keyboard: 1–4 select, Enter locks (web rule).
- After submit, the optional one-tap prediction ("who else got this right?") — never blocks submission (final spec §1.8).
- `POST /api/v1/decodes/:id/answer` — server rejects a second answer from the same member and never returns truth.

**6. Close + reveal (S5).**
- `POST /api/v1/decodes/:id/close` — setter only, allowed after ≥1 answer; also a scheduled/cron path to auto-close at `closes_at` (48h) so it never depends on the setter (final spec §1.6). Wire the cron now even though it feels early — retrofitting it is painful.
- On close, compute the reveal server-side via core, flip status to `revealed`.
- `GET /api/v1/decodes/:id/reveal` returns full reveal data **only** when `status='revealed'`. Before that, the live payload is sanitized (no `answer.*`, no `authorCut`, no other readers' chains — final spec §4/§7).
- Render the reveal: truth chain, every reader's marked chain, the 👑 on the best reader, the distribution line, the "Mogji says" author's cut. Motion can be minimal here — the full choreography is M3's job — but the layout must be right.

**7. Sanitization guard.** A single server-side function strips protected fields from any pre-reveal decode response. Every read of a live decode passes through it. Test it explicitly: fetch a live decode as a reader and assert the answer keys are absent.

## Do NOT build

The AI composer (M2) · reveal choreography/confetti (M3) · share-card PNG (M3) · OG tags (M3) · the styled leaderboard/streak (M4) · events logging (M4) · the daily puzzle (M4). If you're tempted to generate a puzzle, stop — the seed is the whole content of M1.

## Acceptance checklist

- [ ] Seed decode inserted and playable; matches the locked schema, no forbidden keys present
- [ ] Two separate browsers: create, join-via-link, both solve, both see the reveal
- [ ] Scoring marks are correct including a deliberate ↔️ (alternate) case rendering blue, not red
- [ ] Crown resolves to exactly one reader via the deterministic tie-break
- [ ] Second answer from the same reader is rejected server-side
- [ ] Live-decode payload contains no answers/authorCut/other chains (asserted in a test)
- [ ] Manual close works only after ≥1 answer; the 48h auto-close job closes an expired decode
- [ ] Candy tile and Mogji Chain match the design spec (golden = selected, one golden per chain)

## Handoff to Milestone 2

The loop is proven and fun on known-good content. M2 replaces "hand-written seed" with the 3-prompt AI composer — moderation, strip-forbidden-keys, validate — targeting ≤90s from open to live. The schema and scoring don't change; the composer just produces more of what the seed already is.
