import { supabase } from '../supabase.js'

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
 * Log a single attempt on a rephrase question.
 * Resolves the current user from the session — caller must be authenticated.
 * @param {{ questionId: string, chosenSlot: 'correct'|'d1'|'d2'|'d3', isCorrect: boolean, violatedKey?: string|null, responseMs?: number|null }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function logAttempt({ questionId, chosenSlot, isCorrect, violatedKey = null, responseMs = null } = {}) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('rephrase_attempts')
      .insert({
        user_id: user.id,
        question_id: questionId,
        chosen_slot: chosenSlot,
        is_correct: isCorrect,
        violated_key: violatedKey,
        response_ms: responseMs,
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
      .from('rephrase_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('rephrase.data.fetchRecentAttempts:', error)
    return { data: null, error }
  }
}

/**
 * Pure helper: count violated_key occurrences across wrong attempts.
 * Feed this the result of fetchRecentAttempts().data.
 * @param {object[]} attempts
 * @returns {{ key: string, count: number }[]} sorted descending by count
 */
export function aggregateWeakestKeys(attempts) {
  const counts = {}
  for (const attempt of attempts) {
    if (attempt.is_correct || !attempt.violated_key) continue
    counts[attempt.violated_key] = (counts[attempt.violated_key] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}
