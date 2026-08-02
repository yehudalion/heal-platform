# HighScore — Rephrase Generation Pipeline Spec (for Claude Code)
### 15.7.2026 · Produces the full rephrase question bank (~150/level, 4 levels L2–L5) against the v4 truth model
### Authoritative content model: docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md · Truth data: docs/truth_corpus/

---

## 0 · What this is

Two calibration batches are already in the DB and validated: **CAL-V4-L2** (10 items, difficulty 2) and **CAL-V4-L5** (10 items, difficulty 5), all `is_published=false`. They are the golden reference for tone, length, and distractor style. This spec tells you how to generate the rest — **~150 questions per level, L2–L5, ~600 total** — through two mandatory automated gates so that a human only spot-checks 5–10%.

**Nothing you generate is ever published.** Every insert is `is_published=false`. Publication is a separate manual decision Lion makes later.

---

## 1 · The two gates every batch must pass (in order)

### Gate A — Form scanner (already built: scripts/qa_scan_v4.py)
Checks 29 answer-predicting signals against the real NITE corpus for that level. A batch passes only when it prints `DIVERGING FEATURES: NONE`. Structural violations (verbatim runs, odd-one-out correct answer, twin connectives) are hard fails. Run:
```
python scripts/qa_scan_v4.py batch.json --level L3
```
Feed it JSON: `[{"stem","correct","distractors":[d1,d2,d3],"mechanisms":[R..],"proximities":[P..]}, ...]`.

### Gate B — Blind solver (build-time only — NOT a live-app API call)
For each item, call the Claude API **at generation time** (this is explicitly allowed; the no-realtime-API rule governs the *student-facing app*, not the content factory). Send ONLY the stem + four options in shuffled order, with this prompt:
```
Here is a sentence followed by four restatements. Exactly one preserves its meaning
with no added or altered information. Reply with ONLY the number (1-4).
Sentence: {stem}
1) {opt1}  2) {opt2}  3) {opt3}  4) {opt4}
```
Run it **5 times independently** per item (temperature ~1.0). Pass condition: **all 5 return the intended correct answer.** If any solver picks a distractor, the item has a second defensible reading or a broken key → **discard it** (do not try to patch inline; regenerate a replacement). Log which distractor was chosen — a distractor that fools the solver is usually a `proximity=P3` twin that flipped too subtly.

Model for the solver: `claude-sonnet-4-6`. Budget: 5 calls × ~600 items ≈ 3,000 calls, a few dollars. Cache by item hash so reruns are free.

---

## 2 · Per-level recipe cards

All levels share these invariants (from v4 §4, already enforced by the scanner where measurable):
- Correct answer: **≥2 G-transformations**, never G1 alone. No information absent from the stem. Proper-noun capitalization identical across all four options.
- **All four options are full independent paraphrases** — a distractor is NOT the stem with one word swapped. Each is rewritten from scratch, similar in length and lexical distance to the correct answer. (This was the single hardest lesson from L5 calibration: distractors that stay close to the stem make the correct answer the lexical outlier, which the scanner catches as a consensus/novelty divergence.)
- Distractor mechanisms drawn from the 7-code set **R1,R2,R3,R5,R6,R7,R9** (R4 merged into R3, R8 retired). Twin-ness is `proximity=P3`, a separate axis.
- Topics: general-interest only — popular science, history, nature, art, geography, biography, technology. **No** politics, religion, conflict, personal health, or anything culturally sensitive for an Israeli audience.
- Difficulty is bought by **structure**, not rare vocabulary. Hard-word budget per stem by level below.

| level | difficulty | stem length (words) | mean | stem density | hard words | correct-answer engine | distractor R-mix target | twins (P3) |
|---|---|---|---|---|---|---|---|---|
| **L2** (=q9) | 2 | 5–22 | ~15 | one clear relation | 1–2 | G1 + ≥1 of {G3,G6,G7} | R7≈8 R3≈5 R2≈5 R1≈4 R6≈3 R5≈2 R9≈2 | ~4/10 |
| **L3** (=q10) | 3 | 8–28 | ~17 | one relation + wrapping | 1–2 | G1 + ≥2 of {G3,G6,G7,G9} | R7 lead, R2/R3 strong, spread all 7 | ~3-4/10 |
| **L4** (=q11) "long sentence" | 4 | 14–34 | ~21 | 2–3 clauses, ≥2 relations, commas | 2–3 | G1 + ≥2 of {G3,G6,G7} | R2 peaks (~20%), R9 present, R7 lead | ~5/10 |
| **L5** (=q12) "compressed abstraction" | 5 | 9–27 | ~17.6 | dense not long; relation hidden in a word | 1–3 | ≥1 of {G9,G2}; G6 when a dense word exists | R7≈6-8 R2≈5 R6≈4 R9≈2-3 R5≈1 | ~2/10 |

**Level-specific scanner notes (real-exam tells you must match but not exceed):**
- L2: correct answer is the semantic-consensus hub (~42%) and lexically closest-to-stem (~47%). Present but capped.
- L5: correct answer is longest ~45% (cap ~52%), is the consensus hub (~57%), carries complex punctuation (~48%), and is lexically FAR from the stem (opposite of L2). Do not make it longest every time.
- L4: expect the correct answer to be longest less often than L5; the length spread is wide.

---

## 3 · Generation loop (per level, target ~150)

```
for level in [L2, L3, L4, L5]:              # 4 levels, one-to-one with exam positions 9–12
    accepted = load_existing(level)          # CAL-V4-L2 / CAL-V4-L5 already count as seed
    while len(accepted) < 150:
        draft = generate_batch(level, n=15)  # 15 at a time; see prompt below
        draft = run_scanner(draft, level)    # Gate A — drop structural fails, regenerate on divergence
        draft = run_blind_solver(draft)      # Gate B — keep only items 5/5 solvers agree on
        dedup(draft, accepted)               # reject near-duplicate stems (topic+subject overlap)
        accepted += draft
    insert(accepted, is_published=false, generation_batch=f"GEN-V4-{level}", recipe=f"GEN-V4-{level}")
```

**Batch-level distribution targets (enforce across each 15, not each item):**
- Within-item mechanism diversity: ~1% full monoculture (essentially never), ~50–75% partial repeat (same R-family on 2 of 3 distractors — this is the real pattern, not a bug), rest fully diverse.
- Global R-mix per level per the table above (±5 points).
- Proximity: P1≈23% · P2≈62% · P3≈15% overall; twin count per level per table.
- Answer position: shuffle so correct answer is evenly spread across slots 1–4 (the DB stores correct_answer separately from distractor_1..3, so "position" is only meaningful at render time — but still vary which distractor slot the strongest twin occupies).

---

## 4 · Generation prompt (per item, model claude-sonnet-4-6 or opus for L4/L5)

```
You are writing a single "restatement" question for the Israeli HILAL English exam,
difficulty level {level} ({description}). Output JSON only.

Write:
- "stem": one English sentence, {length_range} words, general-interest topic, ONE clear
  logical relation (cause/contrast/time/scope), hard-word budget {hard_budget}.
- "correct": a full restatement that preserves the meaning EXACTLY — no added, dropped, or
  altered information. It must apply at least two of these transformations: {G_menu}.
  Do NOT reuse the stem's main verb or relation-word verbatim. Rewrite from scratch.
- "distractors": three WRONG restatements, each a COMPLETE independent paraphrase (not the
  stem with a word changed), similar in length to the correct answer. Each must fail for a
  specific reason:
    {mechanism_assignments}   # e.g. d1 = R7 lexical corruption; d2 = R2 reversal; d3 = R3 added info
  {twin_instruction}          # if this item carries a P3 twin: "make d{k} almost identical to
                              #  correct, differing in exactly one relation/word"
- "mechanisms": [the R-code of each distractor]
- "proximities": [P1/P2/P3 for each distractor]
- "transformations": [G-codes used in the correct answer]

Constraints: proper nouns keep identical capitalization in all four options. No option may
copy 4+ opening words from the stem or from the correct answer. Do not make the correct answer
the only option that opens differently from the others.
```

Rotate mechanism_assignments across the batch to hit the R-mix targets. For twins, assign the natural carrier: **R9 (time) or R2 (reversal) make the best P3 twins; R3 (added info) makes the worst — avoid R3 twins.**

---

## 5 · Insert rules

- Table `restatement_questions`. Columns: `original_sentence, correct_answer, distractor_1..3, difficulty_level, generation_batch, is_published(=false), mechanism_1..3, proximity_1..3, transformations, relation_count, hard_word_count, recipe`.
- Use `$hs$...$hs$` dollar-quoting for every text value (handles apostrophes + Hebrew).
- `generation_batch` and `recipe` = `GEN-V4-{level}`.
- All DB access stays server-side in the generation script; the app never sees this pipeline.
- After each level, run `SELECT count(*), min(hard_word_count), max(hard_word_count) FROM restatement_questions WHERE difficulty_level={n}` and report.

---

## 6 · Explanations (deferred)

Do NOT generate the Hebrew explanations (`explanation_1_he` etc.) in this pass — leave them NULL. They are a separate task after the bank is built and Lion has spot-checked. The Learn layer needs them but the Practice loop does not.

---

## 7 · What to report back to Lion after each level

- count accepted / count discarded by Gate A / count discarded by Gate B (the Gate-B discard rate is the interesting signal — high discards mean the twins are too aggressive).
- the scanner's final divergence line (should be NONE).
- 3 random sample items (stem + 4 options + key) so he can spot-check tone.
- any level where the pipeline couldn't reach 150 without divergences (means the recipe needs Lion's input).

---

## Appendix — hand this to Claude Code together with:
- docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md (the full model)
- docs/HighScore_Truth_Document.md (the measured reality)
- docs/truth_corpus/truth_items_full.csv (scanner baseline)
- scripts/qa_scan_v4.py (Gate A, already staged)
- The two golden batches are queryable: SELECT * FROM restatement_questions WHERE generation_batch IN ('CAL-V4-L2','CAL-V4-L5')
