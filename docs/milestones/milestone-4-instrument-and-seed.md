# Milestone 4 — Instrument & Seed

*Day 14. The loop is built, the composer works, the reveal travels. This milestone makes it measurable and stands up the real test. After this, no more building for a while — just three real circles and one number.*

**Authorities:** final spec §7 (events), §8 (circle table), §9 (build order), §11 (gate) · Design Spec v1.1 §6 (surface anatomy for the table).

**Definition of done:** every locked event fires into the `events` table, the circle table shows XP / group streak / "reads people best" / "hardest to read," the daily puzzle appears as a feed warm-up, and three real circles are live — one you seed, two that must self-start from the link alone.

---

## Goal

Wire the analytics moat, ship the circle table and streak, embed the daily warm-up, and launch the three test circles so the second-set metric can be read at the end of Week 3.

## Scope (build these)

**1. Events, all of them (`POST /api/v1/events`).** Fire and store the full locked set (final spec §7): `circle_created · member_joined · composer_opened · composer_completed (+seconds) · composer_abandoned_at_step · decode_set · second_set_in_circle · answer_submitted · reveal_viewed · sharecard_generated · joined_via_sharecard · rotation_accepted`. **`second_set_in_circle` and `joined_via_sharecard` are the two that decide the whole test — verify they fire correctly with a manual walkthrough.** Log generously; this table is the compounding asset a cloner can't scrape.

**2. The circle table (S2), styled (Design Spec §6 surface anatomy).** Rank number in `amberInk`, XP in grape, 👑 inline with the name. Columns:
- **XP** — per the M1 `awardXp` rules.
- **Circle setter-streak** — consecutive weeks with ≥1 decode; a *shared group* achievement (streak chip: white pill, candy border).
- **"Reads people best"** — rolling 5-decode crown count.
- **"Hardest to read"** — lowest solve rate as setter, framed as a badge of honor so being decoded poorly is also a win. Nobody loses the reveal.
Only circle decodes affect the table in v1 (daily play does not — final spec §1.9).

**3. Embed the daily puzzle as warm-up.** Bring `/today` into the circle feed's bottom slot so quiet days still have life and the decode grammar keeps training. `GET /api/v1/today`. The daily uses the same tile/chain/scoring components — no separate design. It does **not** feed circle XP in v1.

**4. A tiny content set for the daily.** Enough hand-curated daily puzzles (from the content docs / the 16-batch) to cover the test window. This is curation, not new engineering — the daily just needs real content to not look empty.

**5. Seed the three test circles (Weeks 2–3 launch).** Your boys · one family group · one mixed group. **You are the first setter in circle one only** — the other two must produce their own first setter from the shared link, because self-start is part of what's being tested. Drop the links, then stop touching them.

**6. A minimal read-out view (for you, not users).** A simple internal page or query that surfaces, per circle: did a second unprompted set happen within 10 days? composer completion rate? reveal-view rate? share cards posted? That's the go/no-go dashboard — it doesn't need to be pretty, it needs to be correct.

## Do NOT build

Push notifications (WhatsApp is the notification layer) · accounts · native app (that's the post-metric phase) · badges/levels beyond the four table columns · public circle discovery · forfeit stakes · picture/voice decodes · anything on the parked list (final spec §12). The temptation after shipping is to keep adding; the discipline now is to *measure*.

## Acceptance checklist

- [ ] Every locked event fires and lands in `events` with correct payloads
- [ ] `second_set_in_circle` and `joined_via_sharecard` verified by manual walkthrough
- [ ] Circle table shows XP / streak / reads-best / hardest-to-read, styled per spec
- [ ] Group setter-streak increments on weeks with ≥1 decode
- [ ] Daily puzzle renders in the feed, reuses shared components, does not touch circle XP
- [ ] Daily content set covers the full test window
- [ ] Three circles live; circle one seeded by you, two self-started from the link
- [ ] Internal read-out correctly reports the second-set metric per circle

## The gate (final spec §11) — read at end of Week 3

| Result across 3 circles | Call |
|---|---|
| ≥ 2 unprompted second sets within 10 days | **Fuel** — widen to 10–15 circles, measure share-card joins |
| 1 | Diagnose composer friction vs. reveal flatness; one fix cycle, one re-test |
| 0 | **Park** the friend engine; daily game proceeds as specced. 3 weeks spent, not a year |

Secondary reads (diagnostic): composer completion ≥70% of opens · reveal viewed by ≥60% of members · ≥1 share card posted back into a real chat per circle.

## After Milestone 4

Stop building. Watch the three circles for 10 days. Bring the read-out — especially composer abandonment points and whether cards actually travel back into chats — to the next planning session, and the real decisions (fuel, fix, or park; and if fuel, the React Native app) get made from evidence, not instinct.
