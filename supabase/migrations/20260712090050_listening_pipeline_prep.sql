-- Listening content pipeline prep (applied directly to production via Supabase MCP apply_migration)
-- Recorded in supabase_migrations.schema_migrations as version 20260712090050 (2026-07-12).
-- ALREADY APPLIED — do NOT re-run. This file exists only to bring the repo's
-- migration history in sync with production; the filename version matches the
-- version already present in the remote history table, so `supabase db push`
-- will treat it as applied and skip it.
--
-- All listening tables were empty at the time; changes are additive + policy fixes only.
-- User FKs to auth.users were verified pre-existing and correct (Migration 001) — no FK changes needed here.

-- 1) Content policy: nothing is published without explicit approval
ALTER TABLE public.listening_lectures ALTER COLUMN is_published SET DEFAULT false;

-- 2) Scripts-before-audio workflow: audio_url stays NULL until audio is produced
ALTER TABLE public.listening_lectures ALTER COLUMN audio_url DROP NOT NULL;

-- 3) Content-pipeline columns (Extensible Simplicity: NULL until used)
ALTER TABLE public.listening_lectures
  ADD COLUMN IF NOT EXISTS generation_batch text,
  ADD COLUMN IF NOT EXISTS source_context text,
  ADD COLUMN IF NOT EXISTS word_count integer,
  ADD COLUMN IF NOT EXISTS wpm_target integer,
  ADD COLUMN IF NOT EXISTS num_speakers integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS voice_config jsonb,
  ADD COLUMN IF NOT EXISTS pivot_type text;

ALTER TABLE public.listening_questions
  ADD COLUMN IF NOT EXISTS question_type text,
  ADD COLUMN IF NOT EXISTS anchor_back_sentences integer;
