# ARCHIVED — v3 rephrase generator (retired 2026-07-14)

**Do not run anything in this folder. Do not learn the taxonomy from it.**

These files were moved out of the repo root as part of the **v4 clean-slate reset**
(migration `rephrase_v4_clean_slate`, 2026-07-14). They are kept for history only.

## Why they were retired

`question_generator.py` writes four columns that **no longer exist** in
`restatement_questions` — the v4 migration dropped them:

- `explanation_trap_1`, `explanation_trap_2`, `explanation_trap_3`, `explanation_correct`
  (legacy English explanation fields; the UI is Hebrew and reads `explanation_*_he`)

It also encodes the **retired v3.1 taxonomy** (`green_type`, `trap_type_1/2/3`,
`low_surface_similarity_check`), which v4 replaces entirely:

| v3.1 (retired)            | v4 (current)                                          |
|---------------------------|-------------------------------------------------------|
| `green_type`              | `transformations` — G1–G9                              |
| `trap_type_1/2/3`         | `mechanism_1/2/3` — R1,R2,R3,R5,R6,R7,R9 (R4→R3, R8 retired) |
| —                         | `proximity_1/2/3` — P1/P2/P3 (separate axis, new in v4) |
| `low_surface_similarity_check` | dropped                                          |

Running it would fail on INSERT and, worse, would teach the wrong taxonomy.

## Contents

| File | What it was |
|---|---|
| `question_generator.py` | v3 generation pipeline. Superseded by Master Plan v4. |
| `constraint_matrix_v3.csv` | Its input constraint matrix (v3 topics × trap types). |
| `generated_questions_v2.csv` | v2 output. |
| `generated_questions_v3.csv` | v3 output. |

The 279 questions this pipeline produced are archived at
`docs/archive/restatement_questions_pre_v4_2026-07-14.csv` and were deleted from the
database in the v4 reset.

**Source of truth going forward:** `docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md`.
