-- 20260811182124_listening_passages_and_diagnostics.sql
--
-- One migration, three jobs, all additive. No data is destroyed and nothing existing
-- is rewritten, so it is safe to run against the live 100-item completion corpus.
--
--   1. Fields the lecture_qa (passage) track needs before its calibration batch.
--   2. Diagnostic columns for the transcript-then-retry mechanism.
--   3. highlight_spans, so the Gemini pass that writes explanations can store the
--      connective spans in the same run instead of re-reading every passage later.
--
-- Sources: docs/LISTENING_FORMAT.md v2.2, docs/truth_corpus/MEASURED_CORPUS_2026-08-11.md
-- Bucket boundaries are SPEECH duration after trimming capture padding, not raw file
-- length: short 26.0-45.0s, medium 58.0-60.2s, long 74.2-95.8s.

BEGIN;

-- ─── 1. passage-track fields ────────────────────────────────────────────────

ALTER TABLE public.listening_lectures
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS highlight_spans jsonb;

COMMENT ON COLUMN public.listening_lectures.bucket IS
  'Length bucket by TRIMMED speech duration: s30=26.0-45.0s, s60=58.0-60.2s, '
  's90=74.2-95.8s. NULL for continuation items. Raw file duration is not the item.';
COMMENT ON COLUMN public.listening_lectures.format IS
  'lecture | dialogue. Independent of bucket: dialogues were measured at 29.7s, '
  '61.3s and 99.0s, lectures at 34.7s and 61.4s. Produce both in every bucket.';
COMMENT ON COLUMN public.listening_lectures.highlight_spans IS
  'jsonb array of verbatim substrings of transcript — the connectives that set '
  'direction. Verified mechanically by scripts/verify_listening_explanations.py. '
  'Stored ahead of the UI that will render them.';

ALTER TABLE public.listening_lectures
  ADD CONSTRAINT listening_lectures_bucket_chk
    CHECK (bucket IS NULL OR bucket IN ('s30','s60','s90')) NOT VALID,
  ADD CONSTRAINT listening_lectures_format_chk
    CHECK (format IS NULL OR format IN ('lecture','dialogue')) NOT VALID;

ALTER TABLE public.listening_questions
  ADD COLUMN IF NOT EXISTS target_zone text;

COMMENT ON COLUMN public.listening_questions.target_zone IS
  'early | late. QA gate: in a two-question clip the SECOND question must be '
  'unanswerable from the first half (observed 2/2 in the official samples).';

ALTER TABLE public.listening_questions
  ADD CONSTRAINT listening_questions_target_zone_chk
    CHECK (target_zone IS NULL OR target_zone IN ('early','late')) NOT VALID;

-- question_type already exists and currently holds 'continuation' for all 100 rows.
-- The passage track adds: main_idea | detail | speaker_ref.
-- Deliberately NOT constrained yet — the real corpus also shows negation, opinion,
-- vocabulary-in-context and cloze stems (LISTENING_FORMAT v2.2 item 6), and that
-- vocabulary is not settled. Add the CHECK once Lion rules on those types.

-- ─── 2. diagnostic columns ──────────────────────────────────────────────────
-- Separates a listening failure from a comprehension failure: right after seeing the
-- transcript => heard it wrong; still wrong with the transcript visible => understood
-- it wrong, which routes to the same remediation as the rephrase module.

ALTER TABLE public.listening_question_responses
  ADD COLUMN IF NOT EXISTS transcript_viewed    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_answer_index  integer,
  ADD COLUMN IF NOT EXISTS second_is_correct    boolean,
  ADD COLUMN IF NOT EXISTS replays_used         integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.listening_question_responses.second_answer_index IS
  'Canonical option index of the retry, NULL if none. Canonical, never the shuffled '
  'display index — the whole Analyze layer rests on that and it must not drift.';

ALTER TABLE public.listening_question_responses
  ADD CONSTRAINT lqr_second_answer_range_chk
    CHECK (second_answer_index IS NULL OR second_answer_index BETWEEN 0 AND 3) NOT VALID,
  ADD CONSTRAINT lqr_replays_nonneg_chk
    CHECK (replays_used >= 0) NOT VALID;

-- ─── 3. k_code hygiene ──────────────────────────────────────────────────────
-- Two batches wrote bare 'hedge' (3) and 'messy' (6) while every other row uses the
-- K- prefix. Merge only: fail_mode and every other key on the option are preserved.

UPDATE public.listening_questions q
SET options = (
  SELECT jsonb_agg(
    CASE
      WHEN elem.value->>'k_code' = 'hedge'
        THEN elem.value || '{"k_code":"K-HEDGE"}'::jsonb
      WHEN elem.value->>'k_code' = 'messy'
        THEN elem.value || '{"k_code":"K-MESSY"}'::jsonb
      ELSE elem.value
    END ORDER BY elem.ord)
  FROM jsonb_array_elements(q.options) WITH ORDINALITY elem(value, ord)
)
WHERE q.options::text ~ '"k_code"\s*:\s*"(hedge|messy)"';

COMMIT;

-- Verification (run manually after applying):
--   SELECT o->>'k_code' k, count(*) FROM listening_questions q,
--     LATERAL jsonb_array_elements(q.options) o GROUP BY 1 ORDER BY 2 DESC;
--     -- expect K-ECHO 102, CORRECT 100, K-REVERSE 96, K-WORLD 93, K-MESSY 6, K-HEDGE 3
--   SELECT count(*) FROM listening_questions q, LATERAL jsonb_array_elements(q.options) o
--     WHERE o ? 'fail_mode';                      -- expect 400 (unchanged)
