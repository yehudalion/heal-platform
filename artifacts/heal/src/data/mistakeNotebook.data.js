/**
 * src/data/mistakeNotebook.data.js — the Mistake Notebook's data layer
 * (מוצר/UX chat, 2026-08-29 — BACKLOG_next.md #14 / PLAN_levels_analytics_corners.md §2.א).
 *
 * Zero new content: surfaces wrong attempts that are ALREADY fully explained in
 * the DB (restatement_attempts/sc_attempts/listening_question_responses + their
 * question tables) but that no screen was showing back to the learner as a
 * reviewable list. Read-only against those three tables — this file never
 * writes to them.
 *
 * Reuses the SAME label vocabulary the practice/analyze screens already use
 * (lib/keys.js for Rephrase, lib/scKeys.js for Sentence Completion) — no new
 * "trap"/"key" taxonomy invented here. Listening has no approved label mapping
 * yet (its options carry a raw k_code like 'K-REVERSE' with no student-facing
 * Hebrew name anywhere in the app), so listening rows simply carry no keyLabel
 * rather than inventing one.
 *
 * ⚠️ Two non-obvious things a future reader must NOT get wrong (found while
 * building this, both confirmed against live data before shipping):
 * (a) `restatement_attempts.trap_type` is NOT used for labelling — per
 *     weakpoints.data.js's own comment it's NULL on correct answers and only
 *     resolves ~37% of slots. The label comes from joining
 *     restatement_questions and reading trigger_category_N/mechanism_N for
 *     N = chosen_option_index (1/2/3; 0 is always correct).
 * (b) `listening_questions.explanation_he` is an INTERNAL QA note (e.g.
 *     "עבר בוחן עיוור 21/21"), NOT a student-facing explanation. The real
 *     per-option explanation lives inside `options[i].explanation_he` in the
 *     jsonb array. Do not surface the column-level one to a learner.
 *
 * Every collector returns the same shape:
 *   Mistake = { module, questionId, attemptedAt, keyLabel|null, prompt,
 *               wrongText, wrongExplanation|null, correctText,
 *               correctExplanation|null, extra: { audioUrl|null } }
 */

import { supabase } from '../supabase.js'
import { resolveTrigger } from '../lib/keys.js'
import { resolveKey } from '../lib/scKeys.js'

const RAW_LIMIT = 300 // attempts fetched before de-dup by question — generous headroom, bounded cost

function dedupeByQuestion(rows, getId) {
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const id = getId(r)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(r)
  }
  return out
}

/** Rephrase (ניסוח מחדש) — wrong restatement_attempts, joined to their question. */
export async function getRephraseMistakes(userId, { limit = 30 } = {}) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('restatement_attempts')
      .select(`
        question_id, attempted_at, chosen_option_index,
        restatement_questions (
          original_sentence, correct_answer, distractor_1, distractor_2, distractor_3,
          correct_explanation_he, explanation_1_he, explanation_2_he, explanation_3_he,
          trigger_category_1, trigger_category_2, trigger_category_3,
          mechanism_1, mechanism_2, mechanism_3
        )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('attempted_at', { ascending: false })
      .limit(RAW_LIMIT)
    if (error) throw error

    const deduped = dedupeByQuestion(data || [], (r) => r.question_id)
    const mistakes = deduped.map((row) => {
      const q = row.restatement_questions
      if (!q) return null
      const n = row.chosen_option_index // 1, 2 or 3 — 0 is always correct
      const key = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] })
      return {
        module: 'rephrase',
        questionId: row.question_id,
        attemptedAt: row.attempted_at,
        keyLabel: key?.label ?? null,
        prompt: q.original_sentence,
        wrongText: q['distractor_' + n],
        wrongExplanation: q['explanation_' + n + '_he'] || null,
        correctText: q.correct_answer,
        correctExplanation: q.correct_explanation_he || null,
        extra: {},
      }
    }).filter(Boolean).slice(0, limit)

    return { data: mistakes, error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.getRephraseMistakes:', error)
    return { data: [], error }
  }
}

/** Sentence Completion (השלמת משפטים) — wrong sc_attempts, joined to their question. */
export async function getScMistakes(userId, { limit = 30 } = {}) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('sc_attempts')
      .select(`
        question_id, created_at, chosen_option,
        sentence_completion_questions ( stem, options, correct_option, explanations_he, clue_code )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('created_at', { ascending: false })
      .limit(RAW_LIMIT)
    if (error) throw error

    const deduped = dedupeByQuestion(data || [], (r) => r.question_id)
    const mistakes = deduped.map((row) => {
      const q = row.sentence_completion_questions
      if (!q || !Array.isArray(q.options)) return null
      const key = resolveKey(q.clue_code)
      return {
        module: 'sc',
        questionId: row.question_id,
        attemptedAt: row.created_at,
        keyLabel: key?.label ?? null,
        prompt: q.stem,
        wrongText: q.options[row.chosen_option - 1] ?? null,
        wrongExplanation: q.explanations_he?.distractors?.[String(row.chosen_option)] || null,
        correctText: q.options[q.correct_option - 1] ?? null,
        correctExplanation: q.explanations_he?.correct || null,
        extra: {},
      }
    }).filter(Boolean).slice(0, limit)

    return { data: mistakes, error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.getScMistakes:', error)
    return { data: [], error }
  }
}

/** Listening (האזנה) — wrong listening_question_responses, joined to question + lecture. */
export async function getListeningMistakes(userId, { limit = 30 } = {}) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('listening_question_responses')
      .select(`
        question_id, responded_at, chosen_option_index,
        listening_questions (
          question_text, options, correct_option_index,
          listening_lectures ( title, audio_url )
        )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('responded_at', { ascending: false })
      .limit(RAW_LIMIT)
    if (error) throw error

    const deduped = dedupeByQuestion(data || [], (r) => r.question_id)
    const mistakes = deduped.map((row) => {
      const q = row.listening_questions
      if (!q || !Array.isArray(q.options)) return null
      const chosenOpt = q.options[row.chosen_option_index]
      const correctOpt = q.options[q.correct_option_index]
        || q.options.find((o) => o?.k_code === 'CORRECT')
      const lecture = q.listening_lectures
      return {
        module: 'listening',
        questionId: row.question_id,
        attemptedAt: row.responded_at,
        keyLabel: null, // no approved student-facing label for k_code yet — see file header
        prompt: lecture?.title ? `קטע: ${lecture.title}` : q.question_text,
        wrongText: chosenOpt?.text ?? null,
        wrongExplanation: chosenOpt?.explanation_he || null,
        correctText: correctOpt?.text ?? null,
        correctExplanation: correctOpt?.explanation_he || null,
        extra: { audioUrl: lecture?.audio_url || null },
      }
    }).filter(Boolean).slice(0, limit)

    return { data: mistakes, error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.getListeningMistakes:', error)
    return { data: [], error }
  }
}

/**
 * Marks — "סומן כתוקן". A tiny, isolated table (mistake_marks) added just for
 * this feature; it does NOT touch restatement_attempts/sc_attempts/
 * listening_question_responses. Returns a Set of "module:questionId" keys.
 */
export async function getMistakeMarks(userId) {
  if (!userId) return { data: new Set(), error: null }
  try {
    const { data, error } = await supabase
      .from('mistake_marks')
      .select('module, question_id')
      .eq('user_id', userId)
    if (error) throw error
    return { data: new Set((data || []).map((r) => `${r.module}:${r.question_id}`)), error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.getMistakeMarks:', error)
    return { data: new Set(), error }
  }
}

export async function markMistakeResolved(userId, module, questionId) {
  if (!userId) return { error: null }
  try {
    const { error } = await supabase
      .from('mistake_marks')
      .upsert({ user_id: userId, module, question_id: questionId }, { onConflict: 'user_id,module,question_id' })
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.markMistakeResolved:', error)
    return { error }
  }
}

export async function unmarkMistakeResolved(userId, module, questionId) {
  if (!userId) return { error: null }
  try {
    const { error } = await supabase
      .from('mistake_marks')
      .delete()
      .eq('user_id', userId)
      .eq('module', module)
      .eq('question_id', questionId)
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('mistakeNotebook.data.unmarkMistakeResolved:', error)
    return { error }
  }
}
