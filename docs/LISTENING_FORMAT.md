# LISTENING_FORMAT.md — v0.1 (2026-07-12)
Source of truth: official AMIRNET sample tests 1–3 (screenshots/PDF) + 7 official audio transcripts with timestamps + option sets for all 4 continuation items. Every number below is MEASURED from this material, not invented. Hilal listening runs as experimental AMIRNET sections since 17.3.2025; English separates from the Psychometric in Dec 2026.

## Scope
Two listening item types only. Grammar-in-context and word-formation sections are TEXT-ONLY (confirmed: no headphone icon, no audio player in official samples) → out of listening scope. Word-formation noted in FUTURE_FEATURES.md as a vocab-synergy candidate for a future module.

## Item Type 1 — `lecture_qa` (שאלות על הרצאה או שיחה)
- Section: 7 min, 3 clips: ~30s→1Q, ~60s→2Q, ~90s→2Q (5 questions total).
- Single play. UI: headphones icon, "Click ▶ to start the recording."
- Genres observed: expository monologue (30s), 2-student conversation (~60s), academic mini-lecture (90s).
- Speech rate MEASURED from official timestamps: 135–150 wpm (immune-system clip 138, Schleicher clip 144). Generation target: 140±10 wpm (dialogue may run up to 160).
- Sentences: avg 12–17 words, max ~30. Dialogue turns shorter (avg ~12).
- Hard words (≥9 chars, not in the words.impact_score top-550 list, proper nouns excluded): 1.1–1.9/sentence typical; one dense-medical outlier at 3.5. Generation budget: ≤2/sentence, spice words preferably from the impact-550 list.
- Monologue architecture: SETUP (norm/definition) → PIVOT (however/flaw) → CONSEQUENCE/example. Exactly one pivot per passage.
- Dialogue architecture: shared reaction → topic pick → clarification request → explanation chain → closure.
- Stems observed: "The speaker's purpose is to –" / "The speaker is mainly talking about –" / "According to the lecture, X –" / "What surprised X and Y?" / "Which of the following was [verb]ed by X?"

## Item Type 2 — `continuation` (השלמת קטע שמע)
- Section: ~4 min, 4 clips of ~17–26s, single speaker, cut MID-SENTENCE immediately after a discourse pivot (therefore / as a result / what is surprising is that / after the war).
- 40–58 words before the cut. 4 written options, single play, no replay confirmed in UI copy.
- All 4 options grammatically parallel at the cut point — discrimination is semantic only (HARD GENERATION RULE, confirmed against official option sets for Oscars/Cranberries/Gray-hair/Wheat).
- Correct option CLOSES THE ARC, typically anchoring back to the setup 1–3 sentences earlier (bronze norm; 300-hour baseline; inversion of "coloring to hide"). Anchor distance (sentences back) is the primary difficulty knob — store as `anchor_back_sentences`.
- Spoken numbers slow effective wpm (wheat clip: 100 spoken numerically) → write numbers as words in scripts; budget extra seconds per number.

## Unified distractor taxonomy (DB codes; UI-facing term is always "מפתחות", never "traps")
- K-ECHO — verbatim salient chunk from audio in a false/unstated relation (e.g. "Nobel 1921" as the answer to "what surprised them"; "defied the stereotypes"; "time and money").
- K-SCOPE — gist options form a ladder: too-narrow / too-broad / detail-level / just-right.
- K-WORLD — true in the real world, never stated in the audio ("solar panels need electricity"; "donate to charity").
- K-ROLE / K-REVERSE — real entities from the audio in a reversed relation, or the anti-direction of the passage's arc (Standard British English framed as the "parent" language when the audio said it "influenced" the dialects; "every day" vs. the stated moderation; "stopped growing wheat" vs. stated efficiency gain).
- K-TRUE-NOT-ASKED — accurate to the audio but answers a different question than the one asked (Nobel Prize is true, but not "what surprised them").
- K-NEW — a fabricated comparison or entity not supported by the audio ("more sister languages than Old English has"; "other crops became easier to produce than wheat").
Correct answers for lecture_qa: gist questions require a structural paraphrase of BOTH halves of the passage (setup+pivot); detail questions use light paraphrase and may legitimately share anchor words with the audio — anti-echo here is a BATCH-LEVEL statistical gate, not an absolute per-item ban (this differs from the rephrase module's rule).

## Anti-tell gate (measured from official samples)
lecture_qa sample: the correct answer was the uniquely longest option in 3 of 5 questions — a real tell in NITE's own sample that we must NOT replicate. continuation sample: 2/4 longest, 1/4 shortest — no consistent tell there. Our generation gate: correct-answer-is-longest in ≤30% of any batch, plus the standard length-parity gate (no option ≥6 words shorter than the mean of the others), mirroring the rephrase module's gates.

## Inferred answer key (high confidence, UNOFFICIAL — no official key in hand, verify before publishing anything derived from it)
immune: "describe a malfunction of the immune system" · einstein-Q1: "practical effect on people's lives" · einstein-Q2: "Atoms release electrons when hit by photons" · schleicher-Q1: "Schleicher's theory and a problem with it" · schleicher-Q2: "strong influence on the regional dialects" · oscars: "invited to exchange their statuettes for bronze ones" · cranberries: "in small quantities" · gray-hair: "are choosing to colour their hair grey" · wheat: "a farmer could produce the same amount of wheat in less time".

## Generation gates for calibration batches (v0 — every number anchored above, none arbitrary)
1. Speech rate target 140±10 wpm (150±10 for dialogue); verify against actual TTS output once voice_config is locked.
2. Hard-word budget ≤2/sentence; spice words preferably drawn from the words table's impact-550 list.
3. Exactly one pivot per passage: setup → pivot → consequence/example.
4. lecture_qa batch: answer positions roughly uniform across A/B/C/D; correct-is-longest ≤30%; every distractor tagged with a K-code; ≥3 distinct K-codes represented per batch.
5. continuation batch: 40–60 words before the cut; cut immediately after the pivot; 4 grammatically parallel options; correct answer stores `anchor_back_sentences`; 3 distractors drawn from ≥2 different K-classes.
6. Numbers always written as words in scripts (never digits) to force correct TTS pronunciation. Topics: general register only (history/society/economy/nature/daily life) — no lab-technical/scientific-jargon content. Proper nouns keep capitalization in every option.
7. All inserts default to is_published=false. Listening items are single-use per user (skill practice, not SRS), same principle as restatement_questions.

## Open items (Lion to confirm when possible — not blocking calibration)
- Is a replay allowed within a section's time budget, or is it strictly single-play?
- Which accent(s) per clip — US, UK, or a mix across items?
- Einstein transcript starts at timestamp 0:15 — is there a spoken intro filling 0:00–0:15 that we don't have?
- Official answer key, if one exists (current key above is inferred from context, not confirmed).
- Sample-2 screenshot shows "immediately after they are picked" selected for the cranberries item, which contradicts the passage's "therefore moderate consumption" logic — likely a stray click during screenshotting, not an official answer; treat with caution until confirmed.
