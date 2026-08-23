import { supabase } from '../supabase.js'

/**
 * Get published lectures, optionally filtered by difficulty / item_type / excluded ids.
 * @param {{ difficulty?: number|null, itemType?: string|null, excludeIds?: string[], limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getLectures({ difficulty = null, itemType = null, excludeIds = [], limit = 10 } = {}) {
  try {
    let query = supabase
      .from('listening_lectures')
      .select('id, title, audio_url, difficulty, accent, primary_skill, topic, duration_seconds, item_type, highlight_spans')
      .eq('is_published', true)
      .order('difficulty', { ascending: true })
      .limit(limit)

    if (difficulty !== null) {
      query = query.eq('difficulty', difficulty)
    }
    if (itemType !== null) {
      query = query.eq('item_type', itemType)
    }
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
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
 *
 * NOTE: `options` is a jsonb array of { text, k_code, fail_mode, explanation_he }.
 * The per-option `explanation_he` inside `options` is the real, student-facing
 * explanation. The top-level `listening_questions.explanation_he` column is
 * internal QA metadata (blind-solver pass notes, e.g. "עבר בוחן עיוור 24/24")
 * and must never be shown to students — do not select it here.
 * Likewise `key_type` is internal-only (see SITEMAP.md §3 decision 2026-08-04).
 *
 * @param {string} lectureId
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getLectureQuestions(lectureId) {
  try {
    const { data, error } = await supabase
      .from('listening_questions')
      .select('id, lecture_id, question_text, options, correct_option_index, display_order')
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
 * Get a single published lecture by id (audio, transcript, highlight_spans, metadata).
 * @param {string} lectureId
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getLectureById(lectureId) {
  try {
    const { data, error } = await supabase
      .from('listening_lectures')
      .select('id, title, audio_url, transcript, item_type, difficulty, accent, primary_skill, topic, duration_seconds, highlight_spans')
      .eq('id', lectureId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('listening.data.getLectureById:', error)
    return { data: null, error }
  }
}

/**
 * Get the lecture_ids of a user's N most recent completed sessions,
 * used to avoid immediately repeating the same item.
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {{ data: string[]|null, error: object|null }}
 */
export async function getRecentLectureIds(userId, { limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .select('lecture_id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data: [...new Set((data || []).map(r => r.lecture_id))], error: null }
  } catch (error) {
    console.error('listening.data.getRecentLectureIds:', error)
    return { data: [], error }
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
 * Overview stats for the section dashboard — computed from the REAL tables
 * (listening_sessions / listening_question_responses). There is deliberately
 * no listening_user_state table (SITEMAP: unowned, never designed) — stats
 * are derived fresh, which is always correct at MVP volumes.
 * @param {string} userId
 * @returns {{ data: { sessionsCompleted, questionsAnswered, correctAnswered, accuracyPct, lastSessionAt }|null, error: object|null }}
 */
export async function getListeningOverview(userId) {
  try {
    const { data: sessions, error: sErr } = await supabase
      .from('listening_sessions')
      .select('id, completed_at, total_questions, correct_count')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (sErr) throw sErr

    const sessionsCompleted  = (sessions || []).length
    const questionsAnswered  = (sessions || []).reduce((s, r) => s + (r.total_questions ?? 0), 0)
    const correctAnswered    = (sessions || []).reduce((s, r) => s + (r.correct_count ?? 0), 0)
    const accuracyPct        = questionsAnswered > 0
      ? Math.round((correctAnswered / questionsAnswered) * 100)
      : null
    const lastSessionAt      = sessions?.[0]?.completed_at ?? null

    return { data: { sessionsCompleted, questionsAnswered, correctAnswered, accuracyPct, lastSessionAt }, error: null }
  } catch (error) {
    console.error('listening.data.getListeningOverview:', error)
    return { data: null, error }
  }
}

/**
 * Recent WRONG answers with the fail_mode of the option that was chosen —
 * the raw material for the Analyze layer's descriptive summary.
 * Joins responses → questions client-side and reads the chosen option's
 * fail_mode out of the options jsonb.
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {{ data: { failMode: string|null, questionId: string, respondedAt: string }[]|null, error: object|null }}
 */
export async function getRecentMistakes(userId, { limit = 60 } = {}) {
  try {
    const { data: responses, error: rErr } = await supabase
      .from('listening_question_responses')
      .select('question_id, chosen_option_index, responded_at')
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('responded_at', { ascending: false })
      .limit(limit)

    if (rErr) throw rErr
    if (!responses?.length) return { data: [], error: null }

    const qIds = [...new Set(responses.map(r => r.question_id))]
    const { data: questions, error: qErr } = await supabase
      .from('listening_questions')
      .select('id, options')
      .in('id', qIds)

    if (qErr) throw qErr
    const qById = Object.fromEntries((questions || []).map(q => [q.id, q]))

    const data = responses.map(r => {
      const q   = qById[r.question_id]
      const opt = q?.options?.[r.chosen_option_index]
      return {
        failMode:    opt?.fail_mode ?? null,
        questionId:  r.question_id,
        respondedAt: r.responded_at,
      }
    })

    return { data, error: null }
  } catch (error) {
    console.error('listening.data.getRecentMistakes:', error)
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

/**
 * Daily-menu contract (SITEMAP §6). The session's own picker keeps selection
 * policy (recency exclusion, warmup, calibration) — the plan only sets the
 * item budget. ~3 min per clip incl. questions and feedback.
 * @returns {{ data: { moduleId, itemIds, targetItems, estimatedMinutes }|null, error }}
 */
export async function getDailyPlan(userId, minutes) {
  const clips = Math.max(1, Math.round(minutes / 3))
  return {
    data: {
      moduleId: 'listening',
      itemIds: [], // session picker owns selection; injectable list is v2
      targetItems: clips,
      estimatedMinutes: clips * 3,
    },
    error: null,
  }
}
