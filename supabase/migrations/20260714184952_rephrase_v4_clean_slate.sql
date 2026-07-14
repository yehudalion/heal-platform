-- Rephrase v4 clean slate: scrap v3.1 content, adopt v4 taxonomy.
-- APPLIED to production 2026-07-14 via Supabase MCP apply_migration.
-- Recorded in supabase_migrations.schema_migrations as version 20260714184952.
-- Filename version matches the recorded version, so `supabase db push` treats it as applied.
--
-- 279 rows (19 published) were archived to
--   docs/archive/restatement_questions_pre_v4_2026-07-14.csv
-- and committed to git BEFORE this ran. That CSV is the only remaining copy.
--
-- restatement_attempts + rephrase_attempts have FK ON DELETE CASCADE to this table,
-- but both were empty (verified 0 rows) -> the delete cascaded to nothing. No user data lost.
-- Vocabulary and listening tables untouched. No NITE truth-corpus table is created
-- (copyright boundary: the corpus stays as reference CSVs in docs/truth_corpus/ only).

BEGIN;

-- 1) Clean slate. Table kept, rows removed.
DELETE FROM public.restatement_questions;

-- 2) BUGFIX: content-approval rule violation. Was DEFAULT true.
ALTER TABLE public.restatement_questions ALTER COLUMN is_published SET DEFAULT false;

-- 3) Drop retired v3.1 taxonomy columns.
ALTER TABLE public.restatement_questions
  DROP COLUMN IF EXISTS green_type,
  DROP COLUMN IF EXISTS trap_type_1,
  DROP COLUMN IF EXISTS trap_type_2,
  DROP COLUMN IF EXISTS trap_type_3,
  DROP COLUMN IF EXISTS low_surface_similarity_check;

-- 4) Drop legacy English explanation columns (were NOT NULL; unused by the Hebrew UI,
--    which reads explanation_1_he/2_he/3_he + correct_explanation_he).
ALTER TABLE public.restatement_questions
  DROP COLUMN IF EXISTS explanation_trap_1,
  DROP COLUMN IF EXISTS explanation_trap_2,
  DROP COLUMN IF EXISTS explanation_trap_3,
  DROP COLUMN IF EXISTS explanation_correct;

-- 5) Add v4 taxonomy columns (all nullable).
ALTER TABLE public.restatement_questions
  ADD COLUMN IF NOT EXISTS mechanism_1     text,     -- R-codes per distractor, e.g. 'R7' or 'R7,R3'
  ADD COLUMN IF NOT EXISTS mechanism_2     text,
  ADD COLUMN IF NOT EXISTS mechanism_3     text,
  ADD COLUMN IF NOT EXISTS proximity_1     text,     -- 'P1' | 'P2' | 'P3'
  ADD COLUMN IF NOT EXISTS proximity_2     text,
  ADD COLUMN IF NOT EXISTS proximity_3     text,
  ADD COLUMN IF NOT EXISTS transformations text,     -- G-codes of correct answer, e.g. 'G1,G6,G9'
  ADD COLUMN IF NOT EXISTS relation_count  integer,  -- logical relations in the stem
  ADD COLUMN IF NOT EXISTS hard_word_count integer,
  ADD COLUMN IF NOT EXISTS recipe          text;     -- recipe card id, e.g. 'CAL-V4-L2'

-- 6) proximity_N must be P1/P2/P3 when not null.
ALTER TABLE public.restatement_questions
  ADD CONSTRAINT restatement_questions_proximity_valid CHECK (
        (proximity_1 IS NULL OR proximity_1 IN ('P1','P2','P3'))
    AND (proximity_2 IS NULL OR proximity_2 IN ('P1','P2','P3'))
    AND (proximity_3 IS NULL OR proximity_3 IN ('P1','P2','P3'))
  );

COMMIT;
