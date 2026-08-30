-- ─────────────────────────────────────────────────────────────────────────────
-- HighScore — snapshot of the LIVE production schema, public schema only.
-- Generated 2026-08-29 from project opjtromnkdgehlqeaqzi by reading pg_catalog.
--
-- WHY THIS FILE EXISTS
-- Nine migrations were applied straight to production over the project's life
-- with no corresponding file in the repo, so the live structure could not be
-- rebuilt from source. This closes that gap for the STRUCTURE.
--
-- ⚠️ THIS IS NOT A BACKUP OF YOUR CONTENT. There is not one row of data here.
-- The 2,666 words with their hand-corrected mnemonics, the 800 + 424 calibrated
-- questions with their Hebrew explanations, and the 250 lecture transcripts are
-- the irreplaceable part, and they are NOT in this file. For those, run:
--     supabase db dump --db-url "<connection string>" -f heal_data_YYYYMMDD.sql --data-only
-- See claude/BACKUP_howto.md.
--
-- Indexes, RLS policies and functions are deliberately out of scope here — they
-- are cheap to re-derive and this file is meant to stay readable.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.analytics_events (
  id bigint NOT NULL DEFAULT nextval('analytics_events_id_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  session_id text,
  path text,
  referrer text,
  is_internal boolean NOT NULL DEFAULT false,
  CONSTRAINT analytics_events_event_check CHECK (((char_length(event) >= 1) AND (char_length(event) <= 60))),
  CONSTRAINT analytics_events_path_check CHECK (((path IS NULL) OR (char_length(path) <= 200))),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_referrer_check CHECK (((referrer IS NULL) OR (char_length(referrer) <= 300))),
  CONSTRAINT analytics_events_session_id_check CHECK (((session_id IS NULL) OR (char_length(session_id) <= 40))),
  CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL);

CREATE TABLE public.listening_lectures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audio_url text,
  transcript text NOT NULL,
  item_type text NOT NULL DEFAULT 'lecture_qa'::text,
  difficulty integer NOT NULL,
  accent text,
  primary_skill text,
  topic text,
  duration_seconds integer,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  generation_batch text,
  source_context text,
  word_count integer,
  wpm_target integer,
  num_speakers integer DEFAULT 1,
  voice_config jsonb,
  pivot_type text,
  bucket text,
  format text,
  highlight_spans jsonb,
  CONSTRAINT listening_lectures_bucket_chk CHECK (((bucket IS NULL) OR (bucket = ANY (ARRAY['s30'::text, 's60'::text, 's90'::text])))) NOT VALID,
  CONSTRAINT listening_lectures_format_chk CHECK (((format IS NULL) OR (format = ANY (ARRAY['lecture'::text, 'dialogue'::text])))) NOT VALID,
  CONSTRAINT listening_lectures_pkey PRIMARY KEY (id));

CREATE TABLE public.listening_question_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  user_id uuid NOT NULL,
  chosen_option_index integer NOT NULL,
  is_correct boolean NOT NULL,
  response_time_ms integer,
  hint_used boolean DEFAULT false,
  responded_at timestamp with time zone NOT NULL DEFAULT now(),
  transcript_viewed boolean NOT NULL DEFAULT false,
  second_answer_index integer,
  second_is_correct boolean,
  replays_used integer NOT NULL DEFAULT 0,
  CONSTRAINT listening_question_responses_pkey PRIMARY KEY (id),
  CONSTRAINT listening_question_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES listening_questions(id) ON DELETE CASCADE,
  CONSTRAINT listening_question_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES listening_sessions(id) ON DELETE CASCADE,
  CONSTRAINT listening_question_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT lqr_replays_nonneg_chk CHECK ((replays_used >= 0)) NOT VALID,
  CONSTRAINT lqr_second_answer_range_chk CHECK (((second_answer_index IS NULL) OR ((second_answer_index >= 0) AND (second_answer_index <= 3)))) NOT VALID);

CREATE TABLE public.listening_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option_index integer NOT NULL,
  key_type text,
  explanation_he text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  question_type text,
  anchor_back_sentences integer,
  target_zone text,
  CONSTRAINT listening_questions_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES listening_lectures(id) ON DELETE CASCADE,
  CONSTRAINT listening_questions_pkey PRIMARY KEY (id),
  CONSTRAINT listening_questions_question_type_chk CHECK (((question_type IS NULL) OR (question_type = ANY (ARRAY['continuation'::text, 'main_idea'::text, 'detail'::text, 'speaker_ref'::text, 'negative'::text, 'opinion'::text, 'vocab_in_context'::text])))) NOT VALID,
  CONSTRAINT listening_questions_target_zone_chk CHECK (((target_zone IS NULL) OR (target_zone = ANY (ARRAY['early'::text, 'late'::text])))) NOT VALID);

CREATE TABLE public.listening_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  total_questions integer,
  correct_count integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT listening_sessions_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES listening_lectures(id) ON DELETE CASCADE,
  CONSTRAINT listening_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT listening_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE);

CREATE TABLE public.mistake_marks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  question_id uuid NOT NULL,
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mistake_marks_module_check CHECK ((module = ANY (ARRAY['rephrase'::text, 'sc'::text, 'listening'::text]))),
  CONSTRAINT mistake_marks_pkey PRIMARY KEY (id),
  CONSTRAINT mistake_marks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT mistake_marks_user_id_module_question_id_key UNIQUE (user_id, module, question_id));

CREATE TABLE public.restatement_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  chosen_option_index integer NOT NULL,
  is_correct boolean NOT NULL,
  trap_type text,
  response_time_ms integer,
  hint_used boolean DEFAULT false,
  practice_mode text DEFAULT 'multiple_choice'::text,
  verified_count integer,
  blackout_difficulty integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restatement_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT restatement_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES restatement_questions(id) ON DELETE CASCADE,
  CONSTRAINT restatement_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE);

CREATE TABLE public.restatement_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_sentence text NOT NULL,
  correct_answer text NOT NULL,
  distractor_1 text NOT NULL,
  distractor_2 text NOT NULL,
  distractor_3 text NOT NULL,
  difficulty_level integer NOT NULL,
  source_context text NOT NULL DEFAULT 'synthetic_gen_v1'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  topic text,
  anchors_json jsonb,
  blackout_words_json jsonb,
  anchor_matches_json jsonb,
  explanation_1_he text,
  explanation_2_he text,
  explanation_3_he text,
  correct_explanation_he text,
  is_published boolean DEFAULT false,
  generation_batch text,
  mechanism_1 text,
  mechanism_2 text,
  mechanism_3 text,
  proximity_1 text,
  proximity_2 text,
  proximity_3 text,
  transformations text,
  relation_count integer,
  hard_word_count integer,
  recipe text,
  trigger_category_1 text,
  trigger_category_2 text,
  trigger_category_3 text,
  trigger_word_1 text,
  trigger_word_2 text,
  trigger_word_3 text,
  CONSTRAINT restatement_questions_difficulty_level_check CHECK (((difficulty_level >= 1) AND (difficulty_level <= 5))),
  CONSTRAINT restatement_questions_pkey PRIMARY KEY (id),
  CONSTRAINT restatement_questions_proximity_valid CHECK ((((proximity_1 IS NULL) OR (proximity_1 = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text]))) AND ((proximity_2 IS NULL) OR (proximity_2 = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text]))) AND ((proximity_3 IS NULL) OR (proximity_3 = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text]))))),
  CONSTRAINT restatement_questions_trigger_category_valid CHECK ((((trigger_category_1 IS NULL) OR (trigger_category_1 = ANY (ARRAY['causal'::text, 'logical'::text, 'measure'::text, 'anchor'::text, 'unstated'::text]))) AND ((trigger_category_2 IS NULL) OR (trigger_category_2 = ANY (ARRAY['causal'::text, 'logical'::text, 'measure'::text, 'anchor'::text, 'unstated'::text]))) AND ((trigger_category_3 IS NULL) OR (trigger_category_3 = ANY (ARRAY['causal'::text, 'logical'::text, 'measure'::text, 'anchor'::text, 'unstated'::text]))))));

CREATE TABLE public.sc_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  chosen_option integer NOT NULL,
  is_correct boolean NOT NULL,
  meta_response text,
  pushed_words jsonb,
  time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sc_attempts_chosen_option_check CHECK (((chosen_option >= 1) AND (chosen_option <= 4))),
  CONSTRAINT sc_attempts_meta_response_check CHECK (((meta_response IS NULL) OR (meta_response = ANY (ARRAY['lexical'::text, 'strategic'::text])))),
  CONSTRAINT sc_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT sc_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES sentence_completion_questions(id),
  CONSTRAINT sc_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id));

CREATE TABLE public.sentence_completion_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_item_id integer NOT NULL,
  stem text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  difficulty_pos integer NOT NULL,
  clue_code text NOT NULL,
  opt_type text,
  distr text,
  zipf_mean numeric,
  topic text,
  highlight_spans jsonb,
  explanations_he jsonb,
  local_kills integer,
  meta_source_profile text,
  generation_batch text,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sentence_completion_questions_correct_option_check CHECK (((correct_option >= 1) AND (correct_option <= 4))),
  CONSTRAINT sentence_completion_questions_difficulty_pos_check CHECK (((difficulty_pos >= 1) AND (difficulty_pos <= 8))),
  CONSTRAINT sentence_completion_questions_local_kills_check CHECK (((local_kills >= 0) AND (local_kills <= 3))),
  CONSTRAINT sentence_completion_questions_pkey PRIMARY KEY (id));

CREATE TABLE public.srs_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'new'::text,
  interval_days numeric NOT NULL DEFAULT 0,
  ease numeric NOT NULL DEFAULT 2.5,
  due_at timestamp with time zone,
  reps integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamp with time zone,
  last_rating text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT srs_progress_pkey PRIMARY KEY (id),
  CONSTRAINT srs_progress_unique_user_word UNIQUE (user_id, word_id),
  CONSTRAINT srs_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT srs_progress_word_id_fkey FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE);

CREATE TABLE public.srs_review_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  reviewed_at timestamp with time zone NOT NULL DEFAULT now(),
  rating text NOT NULL,
  response_time_ms integer,
  previous_interval_days numeric,
  new_interval_days numeric,
  previous_ease numeric,
  new_ease numeric,
  previous_state text,
  new_state text,
  CONSTRAINT srs_review_log_pkey PRIMARY KEY (id),
  CONSTRAINT srs_review_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT srs_review_log_word_id_fkey FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE);

CREATE TABLE public.user_module_levels (
  user_id uuid NOT NULL,
  module text NOT NULL,
  level numeric(4,2) NOT NULL,
  cefr_label text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_module_levels_module_check CHECK ((module = ANY (ARRAY['rephrase'::text, 'sc'::text]))),
  CONSTRAINT user_module_levels_pkey PRIMARY KEY (user_id, module),
  CONSTRAINT user_module_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE);

CREATE TABLE public.user_profiles (
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  exam_date date,
  target_score integer,
  current_level text,
  daily_time_minutes integer,
  has_prev_exam boolean,
  prev_exam_score integer,
  onboarding_complete boolean DEFAULT false,
  streak_days integer DEFAULT 0,
  last_active timestamp with time zone,
  paid_track text,
  paid_at timestamp with time zone,
  paid_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE);

CREATE TABLE public.waitlist_signups (
  id bigint NOT NULL DEFAULT nextval('waitlist_signups_id_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL,
  source text,
  user_id uuid,
  CONSTRAINT waitlist_signups_email_check CHECK (((char_length(email) >= 5) AND (char_length(email) <= 200))),
  CONSTRAINT waitlist_signups_pkey PRIMARY KEY (id),
  CONSTRAINT waitlist_signups_source_check CHECK (((source IS NULL) OR (char_length(source) <= 60))),
  CONSTRAINT waitlist_signups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL);

CREATE TABLE public.words (
  id uuid NOT NULL,
  headword text NOT NULL,
  tier text,
  impact_score numeric(5,2),
  pos text,
  definition text,
  surface_1 text,
  audio_word_url text,
  audio_sentence_url text,
  status text DEFAULT 'ready'::text,
  created_at timestamp with time zone DEFAULT now(),
  mnemonic text,
  etymology text,
  audio_slow_url text,
  image_url text,
  content_version integer DEFAULT 1,
  updated_at timestamp with time zone DEFAULT now(),
  definition_he text,
  audio_url text,
  mnemonic_2 text,
  mnemonic_3 text,
  impact_percentile numeric(5,2),
  CONSTRAINT mnemonic_not_empty CHECK (((mnemonic IS NULL) OR (length(TRIM(BOTH FROM mnemonic)) > 0))),
  CONSTRAINT words_pkey PRIMARY KEY (id));

CREATE TABLE public.words_mnemonics_backup_20260825 (
  id uuid,
  headword text,
  mnemonic text,
  mnemonic_2 text,
  mnemonic_3 text,
  backed_up_at timestamp with time zone);
