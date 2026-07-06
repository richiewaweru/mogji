# Milestone 0 — Skeleton

*Days 1–2. The foundation everything else is bolted to. No game yet — just the monorepo, the database, auth, and one route proving the wiring is real.*

**Authorities:** `mogji-circles-final-spec-v1.md` (§5 architecture, §7 data model) · `Mogji Design Spec v1.1` (tokens). Where they conflict with habit, they win.

**Definition of done (the one test):** visiting `/c/ABC123` renders a real circle's name and vibe emoji, fetched from Supabase through a server route. If that renders, Milestone 0 is complete.

---

## Goal

Stand up a monorepo whose shape already anticipates the React Native app, seed the database schema exactly as locked, and prove anon-token auth end to end on a single read. Build nothing that plays.

## Scope (build these)

**1. Monorepo skeleton.** A pnpm/turbo workspace with the locked shape:
```
/apps/web            → Next.js (App Router), TypeScript, Tailwind
/packages/core       → pure TS, zero DOM/React imports (tsconfig enforces)
/packages/tokens     → design tokens as TS exports
/apps/mobile         → empty dir + README: "opens after the second-set metric"
/content             → empty dir + README (content engine lands later)
```
`/packages/core` and `/packages/tokens` must be importable by `/apps/web` today and by `/apps/mobile` later without change. Enforce the no-DOM rule in core via a lint/tsconfig boundary so nothing web-only leaks in.

**2. Tokens package.** Translate Design Spec v1.1 §2–§5 into typed exports — `color`, `font`, `typeScale`, `emojiSize`, `space`, `radius`, `shadow`. Include the v1.1 deltas precisely: `butter` gradient (`#FFD666 → #FFC93C`), `amberInk #B08A2E` for labels, `line #F3EAD9`, and `shadowAmber rgba(198,145,10,α)` with the three alpha stops (0.06 flat / 0.14 tiles / 0.26 buttons). No raw hex anywhere in app code after this — components read tokens only.

**3. Core package skeleton.** Type definitions and empty-but-typed function signatures, no logic yet: `PuzzleJson`, `Slot`, `Option`, `Answer`, `DecodeStatus = 'draft'|'live'|'revealed'|'deleted'`, and stubs for `scoreAnswer()`, `computeReveal()`, `awardXp()`, `nextStatus()`. Milestone 1 fills these in; defining them now keeps the boundary honest.

**4. Supabase schema.** One migration creating the locked tables — `circles`, `members`, `decodes`, `answers`, `events` — exactly as in final spec §7, including:
- the partial unique index `CREATE UNIQUE INDEX one_live_per_circle ON decodes (circle_id) WHERE status = 'live';`
- the `status` CHECK constraint limited to the four locked values
- `answers` primary key `(decode_id, member_id)` so one-answer-per-reader is structural
- RLS enabled on every table (policies can be permissive-via-service-role for now; M1 tightens reads)

**5. Anon-token auth.** On first visit, mint a signed anonymous token (JWT or signed cookie+header), persist it in localStorage, and attach it to every `/api/v1` call. A `members.anon_token` maps a person to a circle. Design the token so a future `user_id` column can link accounts without reissuing tokens.

**6. One vertical slice.** `POST /api/v1/circles` (create → returns `{code, member_token}`) and `GET /api/v1/circles/:code` (returns name + vibe). A minimal `/c/:code` page renders them. This single slice exercises the whole stack: token → route → RLS → DB → render.

## Do NOT build

Solve screen · composer · reveal · scoring logic · share cards · the daily puzzle · any styling beyond applying tokens to the one test page · join flow (M1) · events logging (M4). Resist making the test page pretty; it's a wiring probe, not a screen.

## Acceptance checklist

- [ ] Workspace builds; `/packages/core` cannot import React or DOM (enforced, not just intended)
- [ ] Tokens exported and consumed by the test page; no raw hex in app code
- [ ] Migration applies cleanly; the partial unique index and status CHECK exist in Supabase
- [ ] `answers` PK enforces one row per `(decode_id, member_id)`
- [ ] Anon token mints on first visit, persists, and rides every API call
- [ ] `POST /api/v1/circles` then visiting `/c/:code` shows that circle's name + vibe from the DB

## Handoff to Milestone 1

The stack is proven on a read. M1 makes it playable: join, a hand-written seed decode, solve, close, reveal — the full loop, still no AI. Fill in the `/packages/core` scoring stubs there.
