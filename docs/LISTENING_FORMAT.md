# LISTENING_FORMAT.md — v2.3 (2026-08-14) — base v2.1 + cut tone/solver-side tagging/corner mechanic, corrected by v2.2 and v2.3 blocks below
Source of truth: official AMIRNET sample tests 1–3 (screenshots/PDF) + 7 official audio transcripts with timestamps + option sets for all 4 continuation items, plus acoustic analysis of all 7 official mp3 recordings (durations, speech rate, pause architecture, F0/formant voice profiling). Every number below is MEASURED from this material, not invented. Hilal listening runs as experimental AMIRNET sections since 17.3.2025; English separates from the Psychometric in Dec 2026.

> ## ⚠️ v2.2 CORRECTIONS (2026-08-11) — measured on 24 real recordings + 2 official question docs
> Full measurements: `docs/truth_corpus/MEASURED_CORPUS_2026-08-11.md`. These OVERRIDE the v2.1 text below.
> 1. **Two cut tones, not one.** 1050 Hz (7/12, 1.05–1.60 s) **and 523 Hz** (5/12, 0.90–0.95 s), mixed within the same material. v2.1's "1050 Hz, 1.30–1.60 s" single spec is wrong on both counts. Present in 12/12 completions, 0 lectures.
> 2. **Format ⊥ length.** v2.1 tied 30s→lecture, 60s→dialogue, 90s→lecture. Refuted: dialogues measured at 29.7 s, 61.3 s and 99.0 s; lectures at 34.7 s and 61.4 s. Produce both formats in every bucket.
> 3. **Bucket boundaries, measured on SPEECH duration after trimming screen-capture padding:** short **26.0–45.0 s**, medium **58.0–60.2 s**, long **74.2–95.8 s**. Completions **12.5–25.4 s** (mean 20.3 — the official "about 20 seconds" is exact). Always trim before measuring: leading padding runs 1.1–15.4 s, trailing 0.9–6.7 s. Raw file durations are not the item.
> 3b. **Einstein is a MEDIUM item, not long.** Raw 77.1 s, but 15.4 s of that is leading digital silence — true length 60.0 s. Its 2 questions fit medium→2Q.
> 3c. **Silence share: v2.1's 23–38% is CORRECT — do not change it.** Trimmed measurement gives 12.2–36.0% (completions mean 23.4%, conversations mean 26.8%). An earlier raw measurement of 30–77% was a padding artifact, not a finding.
> 3d. **WPM re-derived from trimmed durations reproduces v2.0's figures to within 3 wpm on all six recordings with transcripts** (127/176/164/140/145/99 vs documented 128/176/162/141/148/100). The v2.0 acoustic work is sound.
> 4. **Question-count rule now n=11, zero exceptions:** short→1, medium→2, long→2.
> 5. **`speaker_ref` CONFIRMED** (`George tells Anna that –`) — v2.1 listed it as predicted-but-unobserved.
> 6. **Four question types not in our taxonomy:** negative (`Which of the following is **not** true…` — three distractors are TRUE, inverting the whole solving logic), opinion (`What is Gali's opinion…`), vocabulary-in-context (`What does "jackals are omnivores" mean?`), and cloze stems (a blank inside the stem).
> 7. **New completion sub-format: paired blanks** — `identified, they can be avoided` / `developed, they can be treated`. Zero of our 100 items use it.
> 8. **Official answer keys now in hand** for these items — the "Inferred answer key" section below is superseded for them.
> 9. Completion durations measured **18.4–33.2 s** (instructions say "about 20 seconds").

> ## ⚠️ v2.3 CORRECTIONS (2026-08-14) — 9 new real transcripts + full official 15-question key
> Full evidence: `docs/truth_corpus/TRANSCRIPTS_2026-08-13.md` (verbatim transcripts, all 9 remaining lecture_qa recordings) + `docs/truth_corpus/OFFICIAL_QUESTIONS_2026-08-13.md` (full official key: all 15 lecture_qa questions + 9 completion option-sets, extracted from the two official question docx files). These OVERRIDE v2.2 where they conflict. Triggered by: "the listening doc is old, don't decide against it — get real evidence and update it."
> 1. **Word-count/WPM targets (§Item Type 1) were too narrow — widen.** Real data (9 new + 3 known, mostly UNTRIMMED so true wpm will run higher, not lower, once trimmed): short 70–131 words / 128–170 wpm · medium 142–176 words / 139–175 wpm · long 218–308 words / 154–187 wpm. New provisional targets: **short 65–135 words @ 125–170 wpm · medium 140–180 words @ 135–180 wpm · long 215–310 words @ 150–190 wpm.** Re-tighten once all 12 are trimmed.
> 2. **Third dialogue sub-format confirmed: guide + visitor** (מוצג/Norblin candlesticks). Not two peers — one role-holder explains at length, the other asks 1–2 short clarifying questions. Gist stems anchor to the role ("The guide is mainly discussing –"), same mechanic as speaker_ref.
> 3. **Second main_idea pattern found: broadest-option-correct on descriptive, pivot-free lectures.** תנים/jackals: correct = "provide basic information about jackals" (the most general option); a more specific distractor ("explain why jackals may be in danger") fails for overreaching beyond what's stated. This sits ALONGSIDE the pivot-based pattern (§ pivot count), not replacing it — a descriptive lecture with no clear pivot doesn't force a "bridges both halves" correct answer, it forces the least-overreaching one. Batches should include both patterns.
> 4. **Four new question types confirmed for MVP** (real frequency 4/15 ≈ 27% — not a rare edge case): negative, opinion, vocabulary-in-context, cloze-stem. fail_mode vocabulary added below (§ Solver-side tagging).
> 5. **Spelling reopened and reverted to American**, the SITEMAP default. The en-GB exception (v2.0) rested on 4 completion items (`grey/colour/labour/ploughs`); new official lecture_qa material (Fordite: "colorful," not "colourful") shows the source itself isn't spelling-consistent. No solid basis remains for a British exception in generated written content. TTS *voice accent* is unaffected — Chirp3-HD en-GB stays locked (§ Voice configuration); this is about written option/transcript spelling only.
> 6. **Gemini speaker-attribution is unreliable at sentence granularity.** Two independent transcription runs of the same מעבדה recording assign the same causal line to different speakers. Do not build fail_mode tagging that depends on which specific speaker said a specific line, sourced from a single transcription run — verify with a second run or Lion's ear first.
> 7. **File-naming bug fixed:** the recording filed as "צבועים" (hyenas) is actually the תנים/jackals recording — content matches the official jackals questions exactly. The old MEASURED_CORPUS warning ("צבועים ≠ תנים, don't pair") was itself the error; corrected there.
> 8. **Real answer-key position distribution is skewed, not uniform** (lecture_qa: (1)×2 (2)×2 (3)×5 (4)×5; completions: (2)×5/9). We do NOT relax our own anti-tell gate over this — that gate stops OUR generation from leaking a tell; it's independent of whether NITE's small real sample happens to be skewed. No change to the generation gate.
> 9. **Evidence-grade caveat (Lion, 2026-08-14): the 2026-08-13 material is PREP-grade, not simulation-grade.** These are the center's practice/preparation questions, one tier below the official sample-test screenshots that grounded v2.0–v2.1. Consequences: (a) the full Hebrew translations found in them are a prep-material property, NOT an exam property — no product/UI conclusions from that; (b) v2.3's structural findings stand (they're measured on real recordings + real option sets), but hold them more loosely than the simulation-derived rules; (c) **standing task: after a few real exam cycles (Dec 2026+), re-calibrate this entire doc against what the real exam actually asks.**
> 10. **Learn layer stays ONE lesson (Lion, 2026-08-14).** The two passage shapes (argument-with-pivot vs. descriptive) are builder/QA machinery only — the student is NEVER taught passage-type labels ("he doesn't know which type he'll get"). The single lesson remains "where is the passage heading, and do the connectives change its direction"; a descriptive passage is simply the case where the honest answer to "did it turn?" is "no — so the modest summary wins." Same skill, no taxonomy.
> 11. **Highlighted-connective transcript view (Lion, 2026-08-14).** At some stage the student must be able to see the passage with the load-bearing connective/signal highlighted. Placement decided: (a) Practice — already contracted (post-wrong-answer explanation part 1 highlights the direction-change sentence); (b) Learn — the lesson gets 2–3 worked example passages rendered with the same highlight mechanism. Content-side obligation NOW: populate `highlight_spans` for every lecture_qa clip at generation time (the pivot/connective sentence, or the definitional gloss for vocab questions). UI work comes with the corner build.

**v2.1 changes (2026-08-04), all evidence-backed — see `LISTENING_REAL_CORPUS_ANALYSIS_2026-08-03.md` for the derivations:**
1. **NEW REQUIREMENT:** a ~1050 Hz tone marks the cut in every continuation clip (FFT-measured on all 3 available). Was entirely absent from v2.0.
2. **CORRECTED:** "exactly one pivot per passage" holds for the 30s monologue but is **false for the 90s lecture**, which has two.
3. **ADDED:** a solver-side tagging axis (`fail_mode`) alongside the existing builder-side K-codes. All 300 continuation distractors are now tagged.
4. **ADDED:** the corner's UX contract — simulation-only practice, per-item explanation after a wrong answer, no student-facing labels, descriptive session summary.
5. **OPEN:** the replay ruling and the TTS engine are both under review (see Open items).

## Scope
Two listening item types only. Grammar-in-context and word-formation sections are TEXT-ONLY (confirmed: no headphone icon, no audio player in official samples) → out of listening scope. Word-formation noted in FUTURE_FEATURES.md as a vocab-synergy candidate for a future module.

## Item Type 1 — `lecture_qa` (שאלות על הרצאה או שיחה)
- Section: 7 min, 3 clips: ~30s→1Q, ~60s→2Q, ~90s→2Q (5 questions total).
- Replay allowed within the section's time budget (RESOLVED 2026-07-15 — supersedes the earlier "single play" reading; see Open items). UI: headphones icon, "Click ▶ to start the recording."
- Genres observed: expository monologue (30s), 2-student conversation (~60s), academic mini-lecture (90s).
- Speech rate is NOT uniform — it varies by register (measured from audio, padding removed): monologue 128 wpm (immune, 30s slot), academic mini-lecture 162 wpm (Schleicher, 90s slot), 2-speaker dialogue 176 wpm (Einstein, 60s slot). Difficulty is NOT bought with speed — the short easy monologue is the SLOWEST; the long lecture is faster; casual dialogue is fastest. Generation targets by register: monologue ~130 wpm, lecture ~160 wpm, dialogue ~175 wpm.
- Nominal "30/60/90s" slots are really ~32/60/80s measured. **Word-count/WPM targets widened in v2.3 (2026-08-14) on 9 additional real transcripts — see the v2.3 block above; the original 65–75/165–185/200–225 range below is superseded:** short (s30) 65–135 words @ 125–170 wpm · medium (s60) 140–180 words @ 135–180 wpm · long (s90) 215–310 words @ 150–190 wpm.
- Silence is ~30% of every clip (23–38% measured). This is essential to the exam feel — do NOT generate wall-to-wall speech.
- Hard words (≥9 chars, not in the words.impact_score top-550 list, proper nouns excluded): 1.1–1.9/sentence typical; one dense-medical outlier at 3.5. Generation budget: ≤2/sentence, spice words preferably from the impact-550 list.
- **Pivot count is a function of the slot (CORRECTED 2026-08-04 — v2.0 said "exactly one pivot per passage" across the board; the 90s exemplar contradicts it).** 30s monologue: SETUP (norm/definition) → PIVOT (however/flaw) → CONSEQUENCE/example, **exactly one pivot**. 90s lecture: **two pivots** — Schleicher has "However, there are several flaws…" and then, seven sentences later, "However, we note that sister languages sometimes do converge." A 90s clip generated with one pivot is not faithful to the source. Do not add a second pivot to a 30s clip — it makes the single question unfair.
- **90s lecture additionally requires a named terminology system of ≥3 members** (Schleicher: parent / daughter / sister / descendants / family tree). This is the raw material the detail question's K-ROLE distractors are built from — "parent language" misattributed to Standard British English only works because the term is genuinely the passage's own. Without such a system the detail question degenerates into plain fact retrieval.
- Dialogue architecture: shared reaction → topic pick → clarification request → explanation chain → closure. **The explanation chain must have ≥3 causal links** (Einstein: photons → atoms → electrons → current → appliances). It is the sole source of both correct answers and the K-ROLE/K-REVERSE distractors. A dialogue that is only small talk generates no answerable questions.
- **Not every discourse marker is a pivot.** Measured in-corpus: reversal (`however`, `instead of`, `recently though`), escalation (`what is surprising is that`), consequence (`as a result`, `therefore`, `so`), and **continuation** (`for example`, `in other words`, `for one thing`) — the last group signals that direction does NOT change. Schleicher runs "in other words" and "for example" inside the post-pivot half. Generation must include continuation markers, not only pivots.
- Stems observed: "The speaker's purpose is to –" / "The speaker is mainly talking about –" / "According to the lecture, X –" / "What surprised X and Y?" / "Which of the following was [verb]ed by X?"

## Item Type 2 — `continuation` (השלמת קטע שמע)
- Section: ~4 min, 4 clips of ~17–26s, single speaker, cut MID-SENTENCE immediately after a discourse pivot (therefore / as a result / what is surprising is that / after the war).
- 4 written options and **NO written question stem** — the screen shows only the audio icon and the 4 options (re-confirmed 2026-08-04 across all 4 continuation screens in sample 2). Any design that assumes a written stem here is wrong.
- Replay allowed within the section's time budget (RESOLVED 2026-07-15 — earlier "no replay confirmed in UI copy" was superseded; see Open items).
- **CUT TONE — mandatory, new in v2.1.** Official instruction text: *"The recording ends with a tone before the last sentence is complete."* FFT-measured on all three continuation mp3s available: **~1050 Hz sine, 1.30–1.60 s, at the cut point, followed by ~1 s of silence to end of file.** Oscars 26.65→28.25s · Cranberries 20.45→21.75s · Wheat 25.70→27.00s. The immune-system lecture clip has **no tone** — the tone is exclusive to the continuation format and must NOT be added to `lecture_qa` clips. This is part of the item, not decoration: it is the signal that the student's turn begins. All 100 items currently in the DB were rendered without it — a render-time fix, zero content cost.
- **Option-length range is much wider than our corpus.** Official: 1–12 words, with intra-item spreads of 3–6 words (cranberries runs `raw` / `every day` / `in small quantities` / `immediately after they are picked`). Our 100 items: 8.3–9.7 words, max spread 4, **zero** items with a spread ≥5 and **zero** with a one-word option. Short-option items are not easier — they remove the length cue entirely and force reliance on structure alone.
- **Cutting immediately after the connective is legitimate and unrepresented in our corpus.** Wheat cuts at `As a result, ___`, requiring the student to supply a whole clause. Our 100 items: 0 of 100 do this; 36 of 100 cut after an auxiliary or `to` (official does that in 2 of 4, so that pattern is fine).
- **A long internal pause is a legitimate difficulty device.** Wheat contains a 3.6 s internal pause; its overall rate reads ~100 wpm while articulation is ~130.
- **Methodological warning: n=4.** These findings prove these item types EXIST. They do NOT establish frequency. Do not infer "25% of items should have short options."
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

**Refinement 2026-08-04:** K-ROLE and K-REVERSE are lumped together above but are two distinct mechanisms and should be separated when tagging. **K-REVERSE** flips the direction of a stated relation ("Electricity is needed to operate a solar panel" — the panel generates it). **K-ROLE** leaves direction intact and instead attaches a real element of the audio to the wrong entity: `1921` (the Nobel year) reattached to solar panels; `parent language` (Old English's role) reattached to Standard British English; "sunlight contains atoms and electrons" (the atoms are in the panel). Same family, different repair in the explanation screen.

## Solver-side tagging — `fail_mode` (added 2026-08-04)
The K-codes above are the **builder's** view: how a distractor was constructed. They do not describe how a student fails, and they do not map 1:1 onto it (measured across the 100-item continuation corpus: K-WORLD → `unsupported` in only 9/10 cases; K-ECHO → `wrong_slot` in only 7/14; K-REVERSE → `anchor_lost` in only 7/11). A second, independent axis is therefore stored per option.

**Storage:** `listening_questions.options` is a jsonb array of `{text, k_code, fail_mode}`. The correct option carries `fail_mode: null`. No migration was required.

**Continuation vocabulary** (all 300 distractors tagged, verified by query 2026-08-04 — `wrong_slot` 173 · `anchor_lost` 117 · `unsupported` 10):
- `wrong_slot` — fills a different slot than the one the final marker opened.
- `anchor_lost` — gives up the number or entity the passage established.
- `unsupported` — plausible on the topic, never grounded in the passage.

**Decision order is load-bearing and must be applied strictly.** Check slot-match FIRST, groundedness LAST. Tagging that jumps straight to "sounds invented" systematically over-assigns `unsupported`; this error occurred in the first calibration pass and required reclassifying 13 of 36 rows. Expect `unsupported` to be a small minority (it is 3.3% of the live corpus). A distractor that survives all three checks means the ITEM is broken — report it, do not tag it.

**`lecture_qa` vocabulary** (n=15 real distractors, confirmed against the full official key 2026-08-14):
- Gist/main_idea questions: `pre_pivot` / `post_pivot` (describes only one side of the turn) / `topic_noun` (a recurring term promoted to be the subject, with no argument). The correct answer is the only option that cannot be stated without the turn — held in 2/2 pivot-structured gist questions. **Does not apply to the broadest-correct pattern** (v2.3 §3) — a descriptive lecture without a pivot instead needs an `over_specific` distractor (true-sounding but claims more than the passage states) alongside the usual `topic_noun`.
- Detail and speaker-reference questions: `true_not_asked` / `reversed` / `anchor_swap` / `unsupported`. Same strict order — check faithfulness before assuming falsehood.
- `wrong_speaker` (a claim made by the OTHER speaker) is available only to dialogues and was **not observed**. Pilot candidate, not an established mechanism.

**New question types, added v2.3 (2026-08-14) — all four confirmed for MVP:**
- **`negative`** (stem: "Which of the following is NOT true of X?"). Inverts the whole mechanism: the correct answer is the one FALSE/unsupported option, tagged with the normal `reversed`/`unsupported`/`anchor_swap` vocabulary; the three distractors are each independently TRUE and stated in the passage — tag them `true_stated` (new tag; means "faithful, and that's exactly why it's wrong to pick here"). Do not reuse `true_not_asked` for these — that tag means "true but off-topic," these are true and directly on-topic, which is the whole trap.
- **`opinion`** (stem: "What is X's opinion of Y?"). Requires an explicit evaluative statement in the passage ("In my opinion, ..." or equivalent) — not inferred sentiment. Distractor vocabulary unchanged (`true_not_asked`/`reversed`/`anchor_swap`/`unsupported`); the correct answer paraphrases the stated opinion, distractors typically swap it for a flatter/different judgment (`reversed`) or a fact the speaker stated without evaluating (`true_not_asked`).
- **`vocab_in_context`** (stem: "What does '[phrase]' mean?", anchored to a phrase actually spoken). Correct answer restates the passage's own definition/gloss of the term (jackals: "omnivores" is glossed in the same sentence — "which means..."). New distractor tag `wrong_sense` — a real but different meaning of the term/a related term from the passage, not what was glossed here. Only usable when the passage actually defines or glosses the term; do not invent a vocab question where the audio never explains the word.
- **`cloze_stem`** — not a new question_type, a stem SHAPE available to `main_idea`: a blank inside the question stem itself ("The lecture mainly discusses the ___ the U.S. Constitution") instead of a full sentence stem. Distractor/correct-answer logic is unchanged from ordinary main_idea; only the stem's grammar differs. Store normally under `question_type='main_idea'`.

**A third question type exists: speaker-reference.** "What surprised Alex and Amy?" is the broad question on the dialogue, but its distractors are detail-type, not gist-type — because a dialogue has no single argument to summarise, so the broad question anchors to a SPEAKER instead. v2.0's implicit "first question is always gist" holds for Schleicher and fails for Einstein, where both questions are detail-type.

**Student-facing reduction.** The seven tags collapse to three checks, identical across both item types, and only these three ever reach the learner — and never as named labels: *does it answer what was asked · is it faithful to what was said · was it said at all.*

## Acoustic spec (measured from official recordings, 2026-07-14)
### Speech rate
Monologue ~130 wpm · lecture ~160 wpm · dialogue ~175 wpm · continuation ~145 wpm. Rate follows register, not difficulty.
### Pause architecture (the SSML blueprint)
99 pauses measured across the corpus, clustering in three bands:
- intra-sentence / comma: ~210 ms → <break time="210ms"/>
- sentence boundary: ~480 ms → <break time="480ms"/>
- pivot / paragraph shift / speaker turn: ~840 ms → <break time="840ms"/>
Total silence ≈ 30% of clip duration. Generation must insert these breaks, not rely on default TTS prosody.

> ✅ **IMPLEMENTED 2026-08-14.** Until today NO render script ever sent SSML —
> all 106 rendered clips were bare-text synthesis. Verified by measurement
> (`test-ssml-pauses.js`, run by Lion + ffmpeg silencedetect): Chirp3-HD
> **accepts `<break>`**, and on the "Salt" sample internal silence moved from
> 20% (plain, BELOW the real-corpus 23–38% band) to 32% (SSML, inside the
> band). The 6 lecture_qa clips rendered plain all sit at 18–23% — same gap.
> The blueprint above now lives in `scripts/tts-ssml.js` and is wired into both
> render scripts, ON by default (`--no-ssml` to opt out). Existing audio
> becomes SSML-paused only on re-render (`--force` for continuations).
> ⚠️ **RESOLVED 2026-08-16 — duration auto-calibration.** The risk flagged here
> materialised: after the SSML re-render, 5 of 12 lecture_qa clips fell outside
> their duration envelope (measured: 49.2s in a 25–47s bucket, 116.3s in a
> 72–98s bucket, etc.). Root cause: **`<break>` time and dialogue inter-turn
> gaps are CONSTANT** — they do not shrink when `speakingRate` rises — so no
> single fixed rate can hold clips of differing pivot-density inside one
> envelope. The needed rate ranged **0.93–1.41** across the same 12 items.
> Fix (both render scripts): render → measure → solve → re-render once.
>     target      = word_count / wpm_target × 60   (clamped into the envelope)
>     correctRate = rate × (measured − fixedPauses) / (target − fixedPauses)
> Verified arithmetically against all 12 measured clips: 12/12 land inside
> their envelope at 155–172 wpm, all within the v2.3 wpm bands.
> **`RATE_BY_FORMAT` (lecture 0.90 / dialogue 0.95) stays the documented
> starting point** — it is now a pass-1 seed, not the final value; the value
> actually used is recorded per item in `voice_config.calibration`.
> Per-item rate variation is faithful to the corpus, which measures 99–176 wpm
> across real clips (MEASURED_CORPUS §6.4). `--no-calibrate` restores the old
> single-pass behaviour. Cost: a second TTS call for any item that misses.
### Voice pool (F0 + formant profiling, validated against Lion's ear)
NITE uses a MIXED-GENDER POOL of voices, not one narrator — rotate voices across items (store per-item in listening_lectures.voice_config).
- Male narrators: F0 median 123–152 Hz. Sub-variation exists: some low+flat (Schleicher/wheat ~123 Hz, F0 sd ~24), some higher (immune ~150 Hz). Cast 3–4 distinct male voices.
- Female narrators: F0 median ~153–160 Hz, calm register (cranberries, gray-hair). Cast 2–3 distinct female voices.
- Dialogue: male ~128 Hz + female ~212 Hz, 84 Hz apart — always cast M+F for dialogues, clearly distinguishable.
- Voice accent: en-GB standard (British-leaning), unaffected by the v2.3 spelling reversal below. Evidence: the Schleicher clip explicitly frames Standard British English as the prestige variety; delivery is mild/standard, not heavy RP. Confirm via A/B against an official clip once audio is generated.
- **Written spelling: American, per SITEMAP default (REVERSED v2.3, 2026-08-14).** Original v2.1 called British spelling from 4 completion options (`grey/colour/labour/ploughs`); new official lecture_qa material (Fordite: "colorful") shows the source isn't spelling-consistent, so the exception's basis is too thin to keep. Generated transcripts/options use American spelling going forward. This does not touch the *voice* accent above — narration stays en-GB Chirp3-HD regardless of written spelling convention.
- Expressiveness by topic (F0 sd): technical/historical topics are read FLAT (sd ~22–25: linguistics, farming stats, Oscar history); human-interest topics warmer (sd ~44–50: health, social stereotypes); dialogue warmest (sd ~57). Match TTS expressiveness to topic.
### Recording-artifact notes (Lion's source mp3s — not exam properties)
Lion's screen-captured recordings contain artifacts that are NOT part of the exam: Einstein has 14s of leading digital silence (no missing spoken intro — the 0:15 transcript start is just padding); wheat (הקלטה 7) contains a false start (~3.3s partial play, then a full second take — use take 2, which measures 139 wpm). These do not affect the format spec.

## Voice configuration (LOCKED 2026-07-15; **pool widened 2026-08-14**, validated by acoustic measurement + audio pilot)
This is our production TTS implementation. It refines the aspirational "Voice pool" section above: that section describes NITE's exam property (a mixed-gender pool).

> ⚠️ **CORRECTION 2026-08-14.** The single-narrator commitment below ("we commit
> to two locked voices... extra single-narrator voices are polish") turned out
> to have a real cost: all 100 continuation rows were rendered with ONE voice
> (`en-GB-Chirp3-HD-Charon`, 100/100, confirmed by query) — a much flatter
> pool than what "polish, backlog" implies. This directly contradicts the
> "Voice pool" section's own finding that 2 of the 4 official completion
> recordings use a FEMALE narrator. A student who trains on one voice for 100
> items and meets an unfamiliar voice on exam day carries an untrained-for
> difficulty. Lion confirmed by ear (Charon "נשמע מכובד וטוב") that it should
> stay in the pool — just not be the whole pool. Fixed by widening to a real,
> deterministic 7-voice pool. See `scripts/voice-pool.js` (single source of
> truth, shared by both render scripts) for the implementation.

- **Engine:** Google Cloud Text-to-Speech, en-GB, Chirp3-HD voice family. Free tier (1M neural chars/month, full commercial license). No ElevenLabs — no active subscription, and its free tier forbids commercial use. Real voice list confirmed 2026-08-14 via `scripts/list-tts-voices.js` against our own account: 16 male + 14 female Chirp3-HD voices available for en-GB (not a remembered/guessed list).
- **Pool (7 voices — 4 male, 3 female):** male = Charon, Fenrir, Orus, Iapetus. female = Kore, Aoede, Despina. Charon and Kore are kept at pool position 0 — they are not being replaced, only joined.
- **Single-narrator items** (continuation monologues, and lecture_qa format='lecture'): voice = the item's stable rank (0-based, creation order, among ALL single-narrator rows of its item_type) modulo 7, cycling through the full mixed-gender pool — `voiceForSingleNarrator(rank)`. Deterministic, not random: re-running the render script never reshuffles a voice a human already approved by ear.
- **Dialogue** (lecture_qa format='dialogue'): each dialogue gets a (male, female) pair from `voicePairForDialogue(rank)` — rank = the dialogue's stable position among all dialogues, male index = rank mod 4, female index = rank mod 3. Turns are generated separately per speaker and stitched with ~350ms inter-speaker gaps. Always one male + one female voice — required for clear speaker distinction (unchanged rule).
- **speakingRate by register** (rate follows register, NOT difficulty — measured): monologue/lecture **0.90**, dialogue **0.95**. These map to measured targets: monologue ~128 wpm, dialogue ~176 wpm, lecture ~162 wpm.
- **Re-rendering the 100 existing continuation rows to pick up the wider pool is NOT automatic** — it requires `node scripts/generate-listening-audio.js --all --force`, a real re-render (TTS cost + time) that overwrites the existing single-voice files. Building the capability is done; triggering it is Lion's call (see `LISTENING_PRODUCTION_ROADMAP_2026-08-14.md`).
- **SSML pauses** (measured from official recordings): comma ~210ms, sentence-boundary ~480ms, pivot/paragraph/speaker-turn ~840ms. ~30% of every clip is silence — do NOT generate wall-to-wall speech.
- **"Jump to the pivot moment" feature:** pivot timestamps are computed BY US via silence-boundary detection on the generated audio (pydub, silence >150ms at -35dB), NOT via Google's SSML `<mark>` timepoints. Reason: Chirp3-HD returns empty timepoints; and self-computed boundaries keep us on the nicer voice AND independent of any TTS engine. Fallback confirmed working in pilot.

## Anti-tell gate (measured from official samples)
lecture_qa sample: the correct answer was the uniquely longest option in 3 of 5 questions — a real tell in NITE's own sample that we must NOT replicate. continuation sample: 2/4 longest, 1/4 shortest — no consistent tell there. Our generation gate: correct-answer-is-longest in ≤30% of any batch, plus the standard length-parity gate (no option ≥6 words shorter than the mean of the others), mirroring the rephrase module's gates.

## Inferred answer key (high confidence, UNOFFICIAL — no official key in hand, verify before publishing anything derived from it)
immune: "describe a malfunction of the immune system" · einstein-Q1: "practical effect on people's lives" · einstein-Q2: "Atoms release electrons when hit by photons" · schleicher-Q1: "Schleicher's theory and a problem with it" · schleicher-Q2: "strong influence on the regional dialects" · oscars: "invited to exchange their statuettes for bronze ones" · cranberries: "in small quantities" · gray-hair: "are choosing to colour their hair grey" · wheat: "a farmer could produce the same amount of wheat in less time".

## Generation gates for calibration batches (v0 — every number anchored above, none arbitrary)
1. Speech rate target 140±10 wpm (150±10 for dialogue); verify against actual TTS output once voice_config is locked.
2. Hard-word budget ≤2/sentence; spice words preferably drawn from the words table's impact-550 list.
3. Pivot count by slot (CORRECTED 2026-08-04): 30s monologue and every continuation clip = **exactly one** pivot (setup → pivot → consequence/example). 90s lecture = **two**, plus a named terminology system of ≥3 members. 60s dialogue = no pivot; a ≥3-link explanation chain instead. Include continuation markers (`for example`, `in other words`), not only pivots.
4. lecture_qa batch: answer positions roughly uniform across A/B/C/D; correct-is-longest ≤30%; every distractor tagged with a K-code **and a `fail_mode`**; ≥3 distinct K-codes represented per batch. Gist questions must pass the partial-truth gate (≥1 distractor true of PART of the passage) and the pivot gate (the correct answer unstatable without the turn). In a 2-question clip the second question must be unanswerable from the first half.
5. continuation batch: 40–60 words before the cut; cut immediately after the pivot; 4 grammatically parallel options; correct answer stores `anchor_back_sentences`; 3 distractors drawn from ≥2 different K-classes, each carrying a `fail_mode`; `unsupported` ≤15% of the batch's distractors. Render must append the 1050 Hz cut tone.
6. Numbers always written as words in scripts (never digits) to force correct TTS pronunciation. Topics: general register only (history/society/economy/nature/daily life) — no lab-technical/scientific-jargon content. Proper nouns keep capitalization in every option.
7. All inserts default to is_published=false. Listening items are single-use per user (skill practice, not SRS), same principle as restatement_questions.

## Corner mechanic — UX contract (DECIDED 2026-08-04 with Lion)
This section governs what the learner experiences. It is deliberately smaller than the tagging above; the tagging is production machinery, not curriculum.

- **Practice is simulation.** The item behaves exactly as in the exam: press ▶, listen, choose from 4. No pre-answer prompt, no "name the slot" step, no guess-before-options step. Rejected explicitly — those add friction for a signal that is already derivable from WHICH wrong option was chosen.
- **Two thin wrappers, one item component.** Practice mode: feedback per item, transcript available after a wrong answer, optional second attempt, replays logged in `replays_used`. Simulation mode: section timer, feedback withheld until the end.
- **The per-item explanation is the corner's primary asset.** After a wrong answer, three parts, fixed structure: (1) the transcript with the direction-change sentence highlighted; (2) one sentence on what the passage required at that point; (3) one sentence on why the chosen option does not satisfy it. Written by hand per item, reviewed by Lion per batch — never auto-generated at runtime (CLAUDE.md hard rule 5). 100 explanations are owed for the existing corpus.
- **`fail_mode` never appears in the UI.** It selects the TEMPLATE for sentence (3) so that hundreds of explanations stay consistent, and it feeds the session summary. The learner never sees a tag name. This satisfies SITEMAP's double-tagging rule: the DB keeps the precise raw tagging, the code maps it to student language.
- **The Learn layer is one lesson, not a taxonomy** (REAFFIRMED by Lion 2026-08-14 against the two-passage-shapes finding — see v2.3 §10): where the passage is heading, and when it changes direction — connectives are the signals. The lesson additionally shows 2–3 worked example passages with the key connective highlighted (v2.3 §11), using the same `highlight_spans` mechanism as the Practice explanation. Rationale: the whole taxonomy derives from n=4 official continuation items and n=5 official passage questions, so its category boundaries are ours, not the exam's. Teaching them as fact sells a certainty we do not have.
- **The session summary is descriptive, not diagnostic.** "In this session most mistakes were about direction" — never "you tend to miss direction changes." No minimum question count is needed, because a report that describes what happened is safe at any n. A minimum would only be required for a cumulative across-sessions trend, which is not being built. See SITEMAP §2, "כלל הניסוח התיאורי".
- **Diagnostic mechanism, unchanged:** transcript-then-retry separates hearing from comprehension. Corrects with the transcript visible → a listening problem. Still wrong with the transcript visible → a comprehension problem, routed like rephrase. Requires columns `transcript_viewed`, `second_answer_index`, `second_is_correct`, `replays_used` on `listening_question_responses` — migration still outstanding.

## Corpus status (verified by query 2026-08-04)
- `listening_lectures` 100 · `listening_questions` 100 · all `question_type='continuation'` · all `is_published=false` · all 300 distractors carry `fail_mode`.
- **Verdict on the 100: sound, keep them.** Stem length, rate, accent, answer-position spread and length bias all match the official samples. Three gaps to close with a third batch of 12–15 items, not a rebuild: no cut tone (render fix), no short-option items, no cut-immediately-after-connective items.
- `lecture_qa`: **zero rows.** Built from scratch. The official block shape is 30s monologue (1 question) + 60s dialogue (2) + 90s lecture (2) = 5 questions. **Production target (Lion, 2026-08-16): 50 clips per bucket → 150 clips, 250 questions, 1,000 distractors** (supersedes the earlier ×8 → 24 figure). Calibration batch first: 2 blocks = 6 clips / 10 questions / 30 distractors. New fields required before that batch: `bucket` (s30/s60/s90) and `format` (lecture/dialogue) on the clip; `question_type` (main_idea/detail/speaker_ref, plus negative/opinion/vocab_in_context added v2.3 — "gist" elsewhere in this doc is informal shorthand for `main_idea`, not the enum value) and `target_zone` (early/late) on the question.
- **Second question must target late material.** In both official 2-question clips the second question is unanswerable from the first half. QA gate.
- **Partial-truth gate for gist questions:** at least one distractor must be a true description of PART of the passage. Held in 2/2 official gist questions. If every distractor is false, the item is too easy and unfaithful.

## Open items (Lion to confirm when possible — not blocking calibration)
- ⚠️ **REOPENED 2026-08-04 — replay.** v2.0 resolved this as "replay allowed within the section's time budget," on the strength of an official NITE/AMIRNET notice about per-section adaptivity. The 2026-08-03 screenshot review found **no replay control on any of the 9 listening screens** across both samples, and neither instructions screen mentions replay — only "Click ▶ to start the recording." Screenshots are weaker evidence than the official notice, so v2.0's ruling STANDS for now and nothing downstream changes. Flagging because our simulation mode currently assumes a single play, which is stricter than the ruling. Lion to decide which the simulation should mirror.
- ⚠️ **OPEN 2026-08-04 — TTS engine.** `voice_config` on all 100 existing rows locks `en-GB-Chirp3-HD-Charon` (Google Cloud TTS). Lion reports a promising informal test with AI Studio / Gemini TTS. Switching engines requires an `UPDATE` across all 100 rows before any re-render, or the metadata lies and re-rendering breaks. Before switching, confirm Gemini's commercial-use licensing — the Cloud TTS choice was made partly on licensing grounds (ElevenLabs was rejected for exactly that reason). Blocks rendering, not content.
- ✅ RESOLVED 2026-07-15: Replay IS allowed within the section's time budget (verified against NITE/AMIRNET official notice — adaptive at the per-section level, time budgeted per whole section). Replay is allowed anytime in both practice and exam mode; replay count is tracked and surfaced in Analyze. See CONTENT_GUIDELINES §3 and TASKS Phase 3.
- ✅ RESOLVED 2026-07-15: Accent is en-GB (see Voice configuration above — Chirp3-HD Charon/Kore, en-GB). Confirm via A/B against an official clip once audio is generated.
- Official answer key, if one exists (current key above is inferred from context, not confirmed).
- Sample-2 screenshot shows "immediately after they are picked" selected for the cranberries item, which contradicts the passage's "therefore moderate consumption" logic — likely a stray click during screenshotting, not an official answer; treat with caution until confirmed.
