import { supabase } from '../supabase.js'
import { logGuestAttempt } from './guestAttempts.data.js'
import { keyForMechanism, resolveTrigger } from '../lib/keys.js'

// Columns the practice screen needs to render a question. Kept in one place so the
// focused-pack fetch and the RPC stay in sync.
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
 * Fetch a pack of published questions that all contain a distractor of one label.
 *
 * Deliberately NOT a new RPC. get_rephrase_questions filters on level only, and
 * teaching it about labels would mean a migration plus duplicating the keys.js
 * mapping in SQL — two sources of truth for the vocabulary. Instead this reads the
 * tagging columns (small: 424 rows of short fields), resolves labels with the very
 * same resolveTrigger the screens use, then fetches only the chosen rows in full.
 * Two round trips, zero schema change, one mapping.
 *
 * Level is ignored on purpose: a focused pack is about the label, not difficulty.
 *
 * @param {{ key: string, limit?: number, excludeIds?: string[] }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchPracticeQuestionsByKey({ key, limit = 5, excludeIds = [] } = {}) {
  try {
    if (!key) throw new Error('fetchPracticeQuestionsByKey: key is required')

    const { data: tagged, error: tagError } = await supabase
      .from('restatement_questions')
      .select('id, trigger_category_1, trigger_category_2, trigger_category_3, mechanism_1, mechanism_2, mechanism_3')
      .eq('is_published', true)
    if (tagError) throw tagError

    const skip = new Set(excludeIds)
    const matching = (tagged || []).filter((q) => {
      if (skip.has(q.id)) return false
      return [1, 2, 3].some((n) => {
        const t = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] })
        return t?.id === key
      })
    })
    if (!matching.length) return { data: [], error: null }

    const ids = shuffled(matching).slice(0, limit).map((q) => q.id)
    const { data, error } = await supabase
      .from('restatement_questions')
      .select(QUESTION_COLUMNS)
      .in('id', ids)
    if (error) throw error

    return { data: shuffled(data || []), error: null }
  } catch (error) {
    console.error('rephrase.data.fetchPracticeQuestionsByKey:', error)
    return { data: null, error }
  }
}

/**
 * The learner's recent wrong answers, with everything needed to re-show the item:
 * the source sentence, the distractor they picked, and its explanation.
 *
 * Feeds the Analyze screen, whose rule is that a label is never shown bare — a
 * label plus a real sentence the learner actually got wrong is the whole point.
 *
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
/**
 * ספירה כוללת של תרגול ניסוח מחדש: כמה נענו, כמה נכון, כמה לא.
 *
 * מסך הניתוח פותח בנתונים האלה לפי בקשת ליאון (1.9.2026) — קודם התמונה
 * הכללית, ורק אחריה הפילוח לפי סוג טעות. שתי שאילתות ספירה בלבד
 * (`head: true`), בלי להוריד שורות.
 *
 * לא נגזר מ-weakpoints: שם `exposures`/`misses` נספרים לכל מפתח בנפרד,
 * ושאלה אחת חושפת כמה מפתחות — סכימה שלהם אינה מספר השאלות.
 */
export async function getRephraseTotals(userId) {
  try {
    if (!userId) return { data: { total: 0, correct: 0, wrong: 0 }, error: null }

    const [totalRes, correctRes] = await Promise.all([
      supabase.from('restatement_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('restatement_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_correct', true),
    ])
    if (totalRes.error) throw totalRes.error
    if (correctRes.error) throw correctRes.error

    const total = totalRes.count ?? 0
    const correct = correctRes.count ?? 0
    return { data: { total, correct, wrong: Math.max(0, total - correct) }, error: null }
  } catch (error) {
    console.error('rephrase.data.getRephraseTotals:', error)
    return { data: { total: 0, correct: 0, wrong: 0 }, error }
  }
}

export async function fetchRecentMistakes(userId, { limit = 200 } = {}) {
  try {
    if (!userId) throw new Error('fetchRecentMistakes: userId is required')
    const { data, error } = await supabase
      .from('restatement_attempts')
      .select(`
        chosen_option_index, attempted_at,
        restatement_questions (
          id, original_sentence, correct_answer,
          distractor_1, distractor_2, distractor_3,
          explanation_1_he, explanation_2_he, explanation_3_he,
          trigger_category_1, trigger_category_2, trigger_category_3,
          mechanism_1, mechanism_2, mechanism_3
        )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('attempted_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('rephrase.data.fetchRecentMistakes:', error)
    return { data: null, error }
  }
}

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
  // אורח — אין חשבון לתלות בו את הניסיון, ולכן לא כותבים ל-restatement_attempts.
  // אבל כן שומרים את הניסיון בנפרד (2.9.2026): קודם לכן הענף הזה החזיר כלום,
  // וכל התרגול של מי שנכנס בלי חשבון נעלם. עדיין מחזיר { data: null } כדי
  // שהמסך, שקורא לזה fire-and-forget, לא יראה שינוי בהתנהגות.
  if (!userId) {
    logGuestAttempt('rephrase', {
      questionId, chosenIndex: chosenOptionIndex, isCorrect, responseTimeMs, hintUsed,
    })
    return { data: null, error: null }
  }
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

/**
 * Daily-menu contract (SITEMAP §6). The practice screen's own picker keeps
 * selection policy (level calibration, packs of 5) — the plan only sets the
 * item budget. ~1.5 min per question incl. feedback.
 * @returns {{ data: { moduleId, itemIds, targetItems, estimatedMinutes }|null, error }}
 */
export async function getDailyPlan(userId, minutes) {
  const questions = Math.max(1, Math.round(minutes / 1.5))
  return {
    data: {
      moduleId: 'rephrase',
      itemIds: [],
      targetItems: questions,
      estimatedMinutes: Math.round(questions * 1.5),
    },
    error: null,
  }
}
