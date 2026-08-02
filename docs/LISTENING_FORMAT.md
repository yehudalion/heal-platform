# LISTENING_FORMAT.md — v2.0 (2026-07-15) — acoustics + voice config + review decisions
Source of truth: official AMIRNET sample tests 1–3 (screenshots/PDF) + 7 official audio transcripts with timestamps + option sets for all 4 continuation items, plus acoustic analysis of all 7 official mp3 recordings (durations, speech rate, pause architecture, F0/formant voice profiling). Every number below is MEASURED from this material, not invented. Hilal listening runs as experimental AMIRNET sections since 17.3.2025; English separates from the Psychometric in Dec 2026.

## Scope
Two listening item types only. Grammar-in-context and word-formation sections are TEXT-ONLY (confirmed: no headphone icon, no audio player in official samples) → out of listening scope. Word-formation noted in FUTURE_FEATURES.md as a vocab-synergy candidate for a future module.

## Item Type 1 — `lecture_qa` (שאלות על הרצאה או שיחה)
- Section: 7 min, 3 clips: ~30s→1Q, ~60s→2Q, ~90s→2Q (5 questions total).
- Replay allowed within the section's time budget (RESOLVED 2026-07-15 — supersedes the earlier "single play" reading; see Open items). UI: headphones icon, "Click ▶ to start the recording."
- Genres observed: expository monologue (30s), 2-student conversation (~60s), academic mini-lecture (90s).
- Speech rate is NOT uniform — it varies by register (measured from audio, padding removed): monologue 128 wpm (immune, 30s slot), academic mini-lecture 162 wpm (Schleicher, 90s slot), 2-speaker dialogue 176 wpm (Einstein, 60s slot). Difficulty is NOT bought with speed — the short easy monologue is the SLOWEST; the long lecture is faster; casual dialogue is fastest. Generation targets by register: monologue ~130 wpm, lecture ~160 wpm, dialogue ~175 wpm.
- Nominal "30/60/90s" slots are really ~32/60/80s measured. Word-count targets (measured): 30s monologue = 65–75 words; 60s dialogue = 165–185 words; 90s lecture = 200–225 words.
- Silence is ~30% of every clip (23–38% measured). This is essential to the exam feel — do NOT generate wall-to-wall speech.
- Hard words (≥9 chars, not in the words.impact_score top-550 list, proper nouns excluded): 1.1–1.9/sentence typical; one dense-medical outlier at 3.5. Generation budget: ≤2/sentence, spice words preferably from the impact-550 list.
- Monologue architecture: SETUP (norm/definition) → PIVOT (however/flaw) → CONSEQUENCE/example. Exactly one pivot per passage.
- Dialogue architecture: shared reaction → topic pick → clarification request → explanation chain → closure.
- Stems observed: "The speaker's purpose is to –" / "The speaker is mainly talking about –" / "According to the lecture, X –" / "What surprised X and Y?" / "Which of the following was [verb]ed by X?"

## Item Type 2 — `continuation` (השלמת קטע שמע)
- Section: ~4 min, 4 clips of ~17–26s, single speaker, cut MID-SENTENCE immediately after a discourse pivot (therefore / as a result / what is surprising is that / after the war).
- 4 written options; replay allowed within the section's time budget (RESOLVED 2026-07-15 — earlier "no replay confirmed in UI copy" was superseded; see Open items).
- All 4 options grammatically parallel at the cut point — discrimination is semantic only (HARD GENERATION RULE, confirmed against official option sets for Oscars/Cranberries/Gray-hair/Wheat).
- Correct option CLOSES THE ARC, typically anchoring back to the setup 1–3 sentences earlier (bronze norm; 300-hour baseline; inversion of "coloring to hide"). Anchor distance (sentences back) is the primary difficulty knob — store as `anchor_back_sentences`.
- Measured: 45–58 words per clip, spoken at 139–150 wpm (tight band), true durations ~19–25s. Design range 45–58 words.
- Spoken numbers slow effective wpm (wheat clip: 100 spoken numerically) → write numbers as words in scripts; budget extra seconds per number.

## Unified distractor taxonomy (DB codes; UI-facing term is always "מפתחות", never "traps")
- K-ECHO — verbatim salient chunk from audio in a false/unstated relation (e.g. "Nobel 1921" as the answer to "what surprised them"; "defied the stereotypes"; "time and money").
- K-SCOPE — gist options form a ladder: too-narrow / too-broad / detail-level / just-right.
- K-WORLD — true in the real world, never stated in the audio ("solar panels need electricity"; "donate to charity").
- K-ROLE / K-REVERSE — real entities from the audio in a reversed relation, or the anti-direction of the passage's arc (Standard British English framed as the "parent" language when the audio said it "influenced" the dialects; "every day" vs. the stated moderation; "stopped growing wheat" vs. stated efficiency gain).
- K-TRUE-NOT-ASKED — accurate to the audio but answers a different question than the one asked (Nobel Prize is true, but not "what surprised them").
- K-NEW — a fabricated comparison or entity not supported by the audio ("more sister languages than Old English has"; "other crops became easier to produce than wheat").
Correct answers for lecture_qa: gist questions require a structural paraphrase of BOTH halves of the passage (setup+pivot); detail questions use light paraphrase and may legitimately share anchor words with the audio — anti-echo here is a BATCH-LEVEL statistical gate, not an absolute per-item ban (this differs from the rephrase module's rule).

## Acoustic spec (measured from official recordings, 2026-07-14)
### Speech rate
Monologue ~130 wpm · lecture ~160 wpm · dialogue ~175 wpm · continuation ~145 wpm. Rate follows register, not difficulty.
### Pause architecture (the SSML blueprint)
99 pauses measured across the corpus, clustering in three bands:
- intra-sentence / comma: ~210 ms → <break time="210ms"/>
- sentence boundary: ~480 ms → <break time="480ms"/>
- pivot / paragraph shift / speaker turn: ~840 ms → <break time="840ms"/>
Total silence ≈ 30% of clip duration. Generation must insert these breaks, not rely on default TTS prosody.
### Voice pool (F0 + formant profiling, validated against Lion's ear)
NITE uses a MIXED-GENDER POOL of voices, not one narrator — rotate voices across items (store per-item in listening_lectures.voice_config).
- Male narrators: F0 median 123–152 Hz. Sub-variation exists: some low+flat (Schleicher/wheat ~123 Hz, F0 sd ~24), some higher (immune ~150 Hz). Cast 3–4 distinct male voices.
- Female narrators: F0 median ~153–160 Hz, calm register (cranberries, gray-hair). Cast 2–3 distinct female voices.
- Dialogue: male ~128 Hz + female ~212 Hz, 84 Hz apart — always cast M+F for dialogues, clearly distinguishable.
- Accent: en-GB standard (British-leaning). Evidence: official on-screen options preserve British spelling ("grey", "colour", "labour", "ploughs"); the Schleicher clip explicitly frames Standard British English as the prestige variety. Delivery is mild/standard, not heavy RP. Confirm via A/B against an official clip once audio is generated.
- Expressiveness by topic (F0 sd): technical/historical topics are read FLAT (sd ~22–25: linguistics, farming stats, Oscar history); human-interest topics warmer (sd ~44–50: health, social stereotypes); dialogue warmest (sd ~57). Match TTS expressiveness to topic.
### Recording-artifact notes (Lion's source mp3s — not exam properties)
Lion's screen-captured recordings contain artifacts that are NOT part of the exam: Einstein has 14s of leading digital silence (no missing spoken intro — the 0:15 transcript start is just padding); wheat (הקלטה 7) contains a false start (~3.3s partial play, then a full second take — use take 2, which measures 139 wpm). These do not affect the format spec.

## Voice configuration (LOCKED 2026-07-15, validated by acoustic measurement + audio pilot)
This is our production TTS implementation. It refines the aspirational "Voice pool" section above: that section describes NITE's exam property (a mixed-gender pool); for MVP we commit to two locked voices. Extra single-narrator voices are polish (see FUTURE_FEATURES / TASKS backlog); the dialogue two-voice requirement is core.

- **Engine:** Google Cloud Text-to-Speech, en-GB, Chirp3-HD voice family. Free tier (1M neural chars/month, full commercial license). No ElevenLabs — no active subscription, and its free tier forbids commercial use.
- **Narrator** (monologue, continuation, lecture): `en-GB-Chirp3-HD-Charon` (male).
- **Dialogue:** two voices — `en-GB-Chirp3-HD-Charon` (male) + `en-GB-Chirp3-HD-Kore` (female), assembled by generating each turn separately and stitching with ~350ms inter-speaker gaps.
- **speakingRate by register** (rate follows register, NOT difficulty — measured): monologue **0.90**, dialogue **0.95**. Lecture rate TBD by calibration (interim: **0.90**). These map to measured targets: monologue ~128 wpm, dialogue ~176 wpm, lecture ~162 wpm.
- **SSML pauses** (measured from official recordings): comma ~210ms, sentence-boundary ~480ms, pivot/paragraph/speaker-turn ~840ms. ~30% of every clip is silence — do NOT generate wall-to-wall speech.
- **"Jump to the pivot moment" feature:** pivot timestamps are computed BY US via silence-boundary detection on the generated audio (pydub, silence >150ms at -35dB), NOT via Google's SSML `<mark>` timepoints. Reason: Chirp3-HD returns empty timepoints; and self-computed boundaries keep us on the nicer voice AND independent of any TTS engine. Fallback confirmed working in pilot.

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
- ✅ RESOLVED 2026-07-15: Replay IS allowed within the section's time budget (verified against NITE/AMIRNET official notice — adaptive at the per-section level, time budgeted per whole section). Replay is allowed anytime in both practice and exam mode; replay count is tracked and surfaced in Analyze. See CONTENT_GUIDELINES §3 and TASKS Phase 3.
- ✅ RESOLVED 2026-07-15: Accent is en-GB (see Voice configuration above — Chirp3-HD Charon/Kore, en-GB). Confirm via A/B against an official clip once audio is generated.
- Official answer key, if one exists (current key above is inferred from context, not confirmed).
- Sample-2 screenshot shows "immediately after they are picked" selected for the cranberries item, which contradicts the passage's "therefore moderate consumption" logic — likely a stray click during screenshotting, not an official answer; treat with caution until confirmed.
