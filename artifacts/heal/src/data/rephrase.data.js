import { supabase } from '../supabase.js'
import { keyForMechanism } from '../lib/keys.js'

/**
 * Fetch published practice questions for a given difficulty level.
 * Uses the get_rephrase_questions RPC to work around PostgREST RANDOM() ordering.
 * @param {{ level: number, limit?: number, excludeIds?: string[] }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchPracticeQuestions({ level, limit = 10, excludeIds = [] } = {}) {
  try {
    const { data, error } = await supabase.rpc('get_rephrase_questions', {
      p_level: level,
      p_limit: limit,
      p_exclude: excludeIds,
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('rephrase.data.fetchPracticeQuestions:', error)
    return { data: null, error }
  }
}

/**
 * Log a single attempt on a rephrase question into `restatement_attempts`.
 * @param {{
 *   userId: string,
 *   questionId: string,
 *   chosenOptionIndex: number,   // CANONICAL index: 0=correct_answer, 1=distractor_1,
 *                                //   2=distractor_2, 3=distractor_3 (NOT a shuffled display index)
 *   isCorrect: boolean,
 *   rCode?: string|null,         // R-code of the chosen distractor; null if the correct answer was chosen
 *   responseTimeMs?: number|null,
 *   hintUsed?: boolean|null,
 *   practiceMode?: string|null,
 * }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function logAttempt({
  userId,
  questionId,
  chosenOptionIndex,
  isCorrect,
  rCode = null,
  responseTimeMs = null,
  hintUsed = null,
  practiceMode = null,
} = {}) {
  try {
    const { data, error } = await supabase
      .from('restatement_attempts')
      .insert({
        user_id: userId,
        question_id: questionId,
        chosen_option_index: chosenOptionIndex,
        is_correct: isCorrect,
        trap_type: rCode,
        response_time_ms: responseTimeMs,
        hint_used: hintUsed,
        practice_mode: practiceMode,
        attempted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('rephrase.data.logAttempt:', error)
    return { data: null, error }
  }
}

/**
 * Fetch the current user's recent rephrase attempts, newest first.
 * @param {{ limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchRecentAttempts({ limit = 300 } = {}) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('restatement_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('rephrase.data.fetchRecentAttempts:', error)
    return { data: null, error }
  }
}

/**
 * Pure helper: tally wrong attempts by student-facing key.
 * Feed this the result of fetchRecentAttempts().data. Each wrong attempt's
 * `trap_type` (R-code) is translated to one of the five keys via keys.js, then
 * grouped. Returns keys the student fails on most, weakest (highest count) first.
 *
 * NOTE: this is a failure-COUNT, not an accuracy. Per-key accuracy is not
 * computable from restatement_attempts alone (correct attempts store
 * trap_type = NULL, so per-key denominators are unknown) — a T044 concern.
 *
 * @param {object[]} attempts
 * @returns {{ key: string, code: string, count: number }[]} sorted descending by count
 */
export function aggregateWeakestKeys(attempts) {
  const tally = {}
  for (const attempt of attempts) {
    if (attempt.is_correct || !attempt.trap_type) continue
    const { key, code } = keyForMechanism(attempt.trap_type)
    if (!tally[code]) tally[code] = { key, code, count: 0 }
    tally[code].count += 1
  }
  return Object.values(tally).sort((a, b) => b.count - a.count)
}
