import { supabase } from '../supabase.js'

/**
 * Get published lectures, optionally filtered by difficulty.
 * @param {{ difficulty?: number|null, limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getLectures({ difficulty = null, limit = 10 } = {}) {
  try {
    let query = supabase
      .from('listening_lectures')
      .select('id, title, audio_url, difficulty, accent, primary_skill, topic, duration_seconds, item_type')
      .eq('is_published', true)
      .order('difficulty', { ascending: true })
      .limit(limit)

    if (difficulty !== null) {
      query = query.eq('difficulty', difficulty)
    }

    const { data, error } = await query
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.getLectures:', error)
    return { data: null, error }
  }
}

/**
 * Get all questions for a lecture, ordered by display_order.
 * @param {string} lectureId
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getLectureQuestions(lectureId) {
  try {
    const { data, error } = await supabase
      .from('listening_questions')
      .select('id, question_text, options, correct_option_index, key_type, explanation_he, display_order')
      .eq('lecture_id', lectureId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.getLectureQuestions:', error)
    return { data: null, error }
  }
}

/**
 * Start a new listening session.
 * @param {string} userId
 * @param {string} lectureId
 * @param {number} totalQuestions
 * @returns {{ data: object|null, error: object|null }}
 */
export async function startSession(userId, lectureId, totalQuestions) {
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .insert({
        user_id: userId,
        lecture_id: lectureId,
        total_questions: totalQuestions,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.startSession:', error)
    return { data: null, error }
  }
}

/**
 * Complete a session with final score.
 * @param {string} sessionId
 * @param {number} correctCount
 * @returns {{ data: object|null, error: object|null }}
 */
export async function completeSession(sessionId, correctCount) {
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .update({
        completed_at: new Date().toISOString(),
        correct_count: correctCount,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.completeSession:', error)
    return { data: null, error }
  }
}

/**
 * Save a single question response within a session.
 * @param {string} sessionId
 * @param {string} questionId
 * @param {string} userId
 * @param {{ chosenOptionIndex: number, isCorrect: boolean, responseTimeMs?: number, hintUsed?: boolean }} responseData
 * @returns {{ data: object|null, error: object|null }}
 */
export async function saveQuestionResponse(sessionId, questionId, userId, responseData) {
  try {
    const { data, error } = await supabase
      .from('listening_question_responses')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        chosen_option_index: responseData.chosenOptionIndex,
        is_correct: responseData.isCorrect,
        response_time_ms: responseData.responseTimeMs ?? null,
        hint_used: responseData.hintUsed ?? false,
        responded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.saveQuestionResponse:', error)
    return { data: null, error }
  }
}

/**
 * Get session history for a user (for analyze screen).
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getListeningHistory(userId, { limit = 20 } = {}) {
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .select('id, lecture_id, started_at, completed_at, total_questions, correct_count, listening_lectures(title, difficulty)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.getListeningHistory:', error)
    return { data: null, error }
  }
}
