import { supabase } from '../supabase.js'
import { resolveKey } from '../lib/scKeys.js'

// Full row — stem, options, correct_option, highlight_spans, explanations_he,
// clue_code, local_kills, difficulty_pos. One place so practice/analyze stay
// in sync if a column is ever added or renamed.
const QUESTION_COLUMNS = '*'

/** Fisher-Yates on a copy. Pure. */
function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Fetch published practice questions at a given difficulty position (1–8).
 * No RPC here (unlike rephrase.data.js's get_rephrase_questions) — the bank is
 * small (≤100 rows per position), so a plain select + client-side shuffle is
 * the two-round-trip pattern rephrase.data.js already uses for label packs,
 * without a schema change for a single ORDER BY RANDOM() workaround.
 * @param {{ level: number, limit?: number, excludeIds?: string[] }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchPracticeQuestions({ level, limit = 5, excludeIds = [] } = {}) {
  try {
    const { data: ids, error: idErr } = await supabase
      .from('sentence_completion_questions')
      .select('id')
      .eq('is_published', true)
      .eq('difficulty_pos', level)
    if (idErr) throw idErr

    const skip = new Set(excludeIds)
    const pool = (ids || []).filter((r) => !skip.has(r.id))
    if (!pool.length) return { data: [], error: null }

    const pick = shuffled(pool).slice(0, limit).map((r) => r.id)
    const { data, error } = await supabase
      .from('sentence_completion_questions')
      .select(QUESTION_COLUMNS)
      .in('id', pick)
    if (error) throw error

    return { data: shuffled(data || []), error: null }
  } catch (error) {
    console.error('sentenceCompletion.data.fetchPracticeQuestions:', error)
    return { data: null, error }
  }
}

/**
 * Fetch a pack of published questions whose clue_code resolves to one label
 * (scKeys.js resolveKey). Difficulty is ignored on purpose — a focused pack is
 * about the label, not the level, same rationale as
 * rephrase.data.js#fetchPracticeQuestionsByKey.
 * @param {{ key: string, limit?: number, excludeIds?: string[] }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchPracticeQuestionsByKey({ key, limit = 5, excludeIds = [] } = {}) {
  try {
    if (!key) throw new Error('fetchPracticeQuestionsByKey: key is required')

    const { data: tagged, error: tagErr } = await supabase
      .from('sentence_completion_questions')
      .select('id, clue_code')
      .eq('is_published', true)
    if (tagErr) throw tagErr

    const skip = new Set(excludeIds)
    const matching = (tagged || []).filter((q) => {
      if (skip.has(q.id)) return false
      return resolveKey(q.clue_code)?.id === key
    })
    if (!matching.length) return { data: [], error: null }

    const pick = shuffled(matching).slice(0, limit).map((q) => q.id)
    const { data, error } = await supabase
      .from('sentence_completion_questions')
      .select(QUESTION_COLUMNS)
      .in('id', pick)
    if (error) throw error

    return { data: shuffled(data || []), error: null }
  } catch (error) {
    console.error('sentenceCompletion.data.fetchPracticeQuestionsByKey:', error)
    return { data: null, error }
  }
}

/**
 * Log one attempt into sc_attempts.
 * @param {{
 *   userId: string,
 *   questionId: string,
 *   chosenOption: number,        // CANONICAL 1–4, matches options[]/correct_option — NOT a shuffled display index
 *   isCorrect: boolean,
 *   responseTimeMs?: number|null,
 *   metaResponse?: 'lexical'|'strategic'|null,   // optional self-tag, see sc-practice.js
 * }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function logAttempt({
  userId,
  questionId,
  chosenOption,
  isCorrect,
  responseTimeMs = null,
  metaResponse = null,
} = {}) {
  // Guest — no account to attach the attempt to. A safe no-op, not an error:
  // the screen's fire-and-forget .then()/.catch() must never see a rejection here.
  if (!userId) return { data: null, error: null }
  try {
    const { data, error } = await supabase
      .from('sc_attempts')
      .insert({
        user_id: userId,
        question_id: questionId,
        chosen_option: chosenOption,
        is_correct: isCorrect,
        time_ms: responseTimeMs,
        meta_response: metaResponse,
        // pushed_words intentionally omitted — "push missed words to SRS" is
        // deferred (scope decision, not yet built). Leave the column NULL.
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('sentenceCompletion.data.logAttempt:', error)
    return { data: null, error }
  }
}

/**
 * The learner's recent wrong answers, with everything needed to re-show the
 * item: the stem, the option they picked, and its explanation. Feeds Analyze,
 * whose rule (same as rephrase-analyze.js) is that a label is never shown bare.
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchRecentMistakes(userId, { limit = 80 } = {}) {
  try {
    if (!userId) throw new Error('fetchRecentMistakes: userId is required')
    const { data, error } = await supabase
      .from('sc_attempts')
      .select(`
        chosen_option, created_at,
        sentence_completion_questions (
          id, stem, options, correct_option, highlight_spans, explanations_he, clue_code
        )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('sentenceCompletion.data.fetchRecentMistakes:', error)
    return { data: null, error }
  }
}

/**
 * The current user's recent sc_attempts rows, newest first.
 * @param {{ limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchRecentAttempts({ limit = 300 } = {}) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('sc_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('sentenceCompletion.data.fetchRecentAttempts:', error)
    return { data: null, error }
  }
}

/**
 * Daily-menu contract (SITEMAP §6). Not yet wired into plan.data.js's adaptive
 * split — that composer currently allocates between exactly two modules
 * (listening, rephrase) and turning it into a three-way split is an
 * architecture change of its own, out of scope for this pass (flagged to Lion,
 * not decided silently). Implemented now so the contract exists the day it is
 * wired in. ~1.2 min/question — SC items are shorter than a rephrase question
 * (one blank vs. a full restatement) so the estimate is lower.
 * @returns {{ data: { moduleId, itemIds, targetItems, estimatedMinutes }|null, error }}
 */
export async function getDailyPlan(userId, minutes) {
  const questions = Math.max(1, Math.round(minutes / 1.2))
  return {
    data: {
      moduleId: 'sentenceCompletion',
      itemIds: [],
      targetItems: questions,
      estimatedMinutes: Math.round(questions * 1.2),
    },
    error: null,
  }
}
