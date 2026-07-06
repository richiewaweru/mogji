# Milestone 2 — The Composer

*Days 7–10. The moat. Three prompts in, a playable decode out — so any friend can author without freezing at a blank canvas. The loop already works (M1); this milestone just makes content creation self-serve.*

**Authorities:** final spec §4 (schema + strip rule), §6 (composer), §7 (compose route) · content-engine doc (distractor taxonomy, generation prompt) · Design Spec v1.1 §6, §9 (voice).

**Definition of done:** a setter opens the composer, answers three prompts, and within ~90 seconds has reviewed and published a live decode that plays identically to the M1 seed — with zero creative-strategy fields persisted anywhere.

---

## Goal

Build the server-side generation → moderation → strip → validate pipeline and the setter's review UI, so a real decode is authored in under 90 seconds and the stored `puzzle_json` contains only the playable result.

## Scope (build these)

**1. The 3-prompt flow (S3), one question per screen.**
1. *"Pick a moment from your week — anything."*
2. *"What would people assume about it?"*
3. *"What actually happened / what was really going on?"*
Conversational, thumb-first, back-navigable. Measure time-to-live from open (feeds the ≤90s target; full events land in M4 but capture this one now).

**2. `POST /api/v1/decodes/compose` — server-side, key never client-side.** Pipeline in strict order:
- **Generate.** One Anthropic API call. System prompt encodes the composer brief (final spec §6 + content-engine §6 generation skeleton): build `setup` in 2nd-person plural that presents the moment *without* revealing prompt 3; the assumption (prompt 2) becomes the seductive wrong option in the pivot slot; the truth (prompt 3) becomes the ✅; 3 slots × 4 options; `authorCut` ≤15 words, pattern "It looked like X. It was Y," one concrete noun. Tone: teasing, warm, never humiliating; rewards knowing *this person*, not trivia.
- **Moderate.** A moderation pass on both the setter's inputs and the model's output. Block: cruelty aimed at a third party, sexual content, anything about a non-consenting person outside the circle. On block, return a gentle retry, not a hard error.
- **Strip.** Remove every forbidden key (final spec §4: `strategy, pivot, pivotSlotIndex, assumption, magnet, distractorTaxonomy, composerReasoning, whyThisWorks, metadata, …`) before anything is persisted.
- **Validate.** Enforce: 3 slots · 4 options each · non-empty `answer.exact` · no option id in both `exact` and `alternate` · no forbidden key survived. If forbidden fields are entangled with scoring/render data such that stripping is unsafe → **reject and regenerate** (final spec §4).
- Return only a clean draft `puzzle_json` (status `draft`, not yet live).

**3. Draft review UI (setter).** Show the built decode as it will play, with four controls in this prominence order:
- ✍️ **Rewrite the author's cut** — always encouraged; this is the non-delegable human layer. Consider defaulting focus here.
- 🔀 **Reshuffle** — regenerate (re-runs the pipeline).
- ✏️ **Edit any slot** — manual override of options/answers.
- 🚀 **Send** — publish.

**4. The privacy preview (before send).** Show "your circle will see exactly this," and the locked warning copy (final spec §1.10): *"Your circle will see this. The share card may be forwarded. Keep it funny, not private."* Especially load-bearing because prompts ask for real life.

**5. `POST /api/v1/decodes` — publish.** Flip draft → live. **Reject if the circle already has a live decode** (the partial unique index enforces it at the DB, but return a clean error, not a 500). Honors rotation (final spec §1.5): named next setter gets priority, but first-to-publish takes an empty seat.

**6. Setter delete.** A setter can delete their own decode (draft or live), which removes it from feed/scoring/reveal. Server verifies setter identity.

## Do NOT build

Reveal choreography/confetti (M3) · share-card image (M3) · OG tags (M3) · leaderboard/streak styling (M4) · full events suite (M4, though capture composer timing now) · the daily puzzle (M4) · a content-batch pipeline or briefs (that's the separate content engine, not v1 app code).

## Acceptance checklist

- [ ] Three prompts → a playable draft that scores correctly through the M1 core functions
- [ ] Stored `puzzle_json` has **zero** forbidden keys (asserted on the persisted row, not just the response)
- [ ] Unsafe/entangled generations are rejected and regenerated, not silently saved
- [ ] Moderation blocks third-party cruelty / sexual / non-consenting-person content with a gentle retry
- [ ] Author's-cut rewrite works and is the most prominent control
- [ ] Privacy warning appears in the send preview with the exact locked copy
- [ ] Publishing a second live decode is cleanly rejected while one is live
- [ ] Median open-to-live is at or near 90s on a few real attempts
- [ ] API key never reaches the client (generation is fully server-side)

## Handoff to Milestone 3

Anyone can now author a decode. M3 makes the payoff and its spread beautiful: the reveal choreography, the share-card PNG, and OG tags so a shared link unfurls in WhatsApp. Those two surfaces get the design budget because they are the acquisition engine.
