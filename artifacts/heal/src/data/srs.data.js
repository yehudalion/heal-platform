import { supabase } from '../supabase.js'

const MAX_NEW_PER_SESSION = 10

/**
 * Get words due for review today, plus new words to fill the session.
 * Priority: overdue reviews first, then new words by impact_score.
 * @param {string} userId
 * @param {{ limit?: number, isPremium?: boolean }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getDueWords(userId, { limit = 20, isPremium = false } = {}) {
  try {
    const now = new Date().toISOString()

    // 1. Get due reviews (state = review or relearning, due_at <= now)
    const { data: dueReviews, error: reviewError } = await supabase
      .from('srs_progress')
      .select('word_id, state, interval_days, ease, due_at, reps, lapses')
      .eq('user_id', userId)
      .in('state', ['review', 'relearning'])
      .lte('due_at', now)
      .order('due_at', { ascending: true })

    if (reviewError) throw reviewError

    // 2. Get IDs already in progress (to exclude from new words)
    const { data: allProgress, error: progressError } = await supabase
      .from('srs_progress')
      .select('word_id')
      .eq('user_id', userId)

    if (progressError) throw progressError

    const seenWordIds = allProgress.map(p => p.word_id)

    // 3. Get new words (not yet seen), ordered by impact_score
    const newSlotsAvailable = Math.max(0, MAX_NEW_PER_SESSION - dueReviews.length)
    let newWordsData = []

    if (newSlotsAvailable > 0) {
      let newQuery = supabase
        .from('words')
        .select('id, headword, definition_he, surface_1, mnemonic, mnemonic_2, mnemonic_3, audio_word_url, audio_sentence_url, impact_score, impact_percentile')
        .order('impact_score', { ascending: false })
        .limit(newSlotsAvailable)

      if (seenWordIds.length > 0) {
        newQuery = newQuery.not('id', 'in', `(${seenWordIds.join(',')})`)
      }

      if (!isPremium) {
        newQuery = newQuery.gte('impact_percentile', 64)
      }

      const { data: newWords, error: newError } = await newQuery
      if (newError) throw newError
      newWordsData = newWords.map(w => ({ ...w, word_id: w.id, state: 'new' }))
    }

    // 4. Fetch full word data for due reviews
    const reviewWordIds = dueReviews.map(r => r.word_id)
    let reviewWordsData = []

    if (reviewWordIds.length > 0) {
      const { data: reviewWords, error: rwError } = await supabase
        .from('words')
        .select('id, headword, definition_he, surface_1, mnemonic, mnemonic_2, mnemonic_3, audio_word_url, audio_sentence_url, impact_score, impact_percentile')
        .in('id', reviewWordIds)

      if (rwError) throw rwError

      reviewWordsData = reviewWords.map(w => {
        const progress = dueReviews.find(r => r.word_id === w.id)
        return { ...w, word_id: w.id, ...progress }
      })
    }

    const data = [...reviewWordsData, ...newWordsData].slice(0, limit)
    return { data, error: null }
  } catch (error) {
    console.error('srs.data.getDueWords:', error)
    return { data: null, error }
  }
}

/**
 * Calculate new SRS state based on current state and rating.
 * Implements SM-2 simplified (per METHODOLOGY.md).
 * @param {{ state, interval_days, ease, reps, lapses }} current
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @returns {{ state, interval_days, ease, due_at, reps, lapses }}
 */
function calculateNextState(current, rating) {
  let { state, interval_days, ease, reps, lapses } = current
  ease = ease || 2.5
  interval_days = interval_days || 0

  const now = new Date()
  let newState = state
  let newInterval = interval_days
  let newEase = ease
  let newReps = reps + 1
  let newLapses = lapses

  if (state === 'new' || state === 'learning') {
    if (rating === 'again') { newState = 'learning'; newInterval = 1 / 1440 }       // 1 min in days
    else if (rating === 'hard') { newState = 'learning'; newInterval = 10 / 1440 }  // 10 min
    else if (rating === 'good') { newState = 'review'; newInterval = 1 }
    else if (rating === 'easy') { newState = 'review'; newInterval = 4 }
  } else if (state === 'review') {
    if (rating === 'again') {
      newState = 'relearning'; newInterval = 10 / 1440; newLapses++
      newEase = Math.max(1.3, ease - 0.2)
    } else if (rating === 'hard') {
      newState = 'review'; newInterval = interval_days * 1.2
      newEase = Math.max(1.3, ease - 0.15)
    } else if (rating === 'good') {
      newState = 'review'; newInterval = interval_days * ease
    } else if (rating === 'easy') {
      newState = 'review'; newInterval = interval_days * ease * 1.3
      newEase = ease + 0.15
    }
  } else if (state === 'relearning') {
    if (rating === 'again') { newState = 'relearning'; newInterval = 10 / 1440 }
    else if (rating === 'good') { newState = 'review'; newInterval = 1 }
    else if (rating === 'easy') { newState = 'review'; newInterval = Math.max(1, interval_days * 0.5) }
  }

  newInterval = Math.max(newInterval, 1 / 1440)
  const dueAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000)

  return {
    state: newState,
    interval_days: newInterval,
    ease: newEase,
    due_at: dueAt.toISOString(),
    reps: newReps,
    lapses: newLapses,
    last_reviewed_at: now.toISOString(),
    last_rating: rating,
  }
}

/**
 * Upsert SRS progress for a word after a rating.
 * @param {string} userId
 * @param {string} wordId
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @param {{ currentState?: object, responseTimeMs?: number }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function rateWord(userId, wordId, rating, { currentState = {}, responseTimeMs = null } = {}) {
  try {
    const defaultState = { state: 'new', interval_days: 0, ease: 2.5, reps: 0, lapses: 0 }
    // Guard against callers passing partial state (e.g. a brand-new word
    // has no prior reps/lapses/interval_days/ease) — an explicit `undefined`
    // key would otherwise override the default via spread and corrupt the
    // upsert (reps becomes NaN -> null, violating the NOT NULL constraint).
    const cleanCurrentState = Object.fromEntries(
      Object.entries(currentState).filter(([, v]) => v !== undefined)
    )
    const current = { ...defaultState, ...cleanCurrentState }
    const next = calculateNextState(current, rating)

    // Upsert srs_progress
    const { data, error } = await supabase
      .from('srs_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        ...next,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,word_id' })
      .select()
      .single()

    if (error) throw error

    // Append to srs_review_log (fire and forget — don't block on failure)
    supabase.from('srs_review_log').insert({
      user_id: userId,
      word_id: wordId,
      rating,
      response_time_ms: responseTimeMs,
      previous_interval_days: current.interval_days,
      new_interval_days: next.interval_days,
      previous_ease: current.ease,
      new_ease: next.ease,
      previous_state: current.state,
      new_state: next.state,
      reviewed_at: new Date().toISOString(),
    }).then(({ error: logError }) => {
      if (logError) console.warn('srs_review_log insert failed (non-blocking):', logError)
    })

    return { data, error: null }
  } catch (error) {
    console.error('srs.data.rateWord:', error)
    return { data: null, error }
  }
}

/**
 * Count of words currently due for review (state = review/relearning, due_at <= now).
 * Lightweight — no word data fetched. Used by screens that only need the count
 * (e.g. the flashcards landing page), not a full getDueWords() call.
 * @param {string} userId
 * @returns {{ data: number, error: object|null }}
 */
export async function getDueCount(userId) {
  try {
    const now = new Date().toISOString()
    const { count, error } = await supabase
      .from('srs_progress')
      .select('word_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('state', ['review', 'relearning'])
      .lte('due_at', now)

    if (error) throw error
    return { data: count || 0, error: null }
  } catch (error) {
    console.error('srs.data.getDueCount:', error)
    return { data: 0, error }
  }
}

/**
 * Get session stats for the analyze screen.
 * @param {string} userId
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getSessionStats(userId) {
  try {
    const { data, error } = await supabase
      .from('srs_progress')
      .select('state, lapses, last_rating, last_reviewed_at')
      .eq('user_id', userId)

    if (error) throw error

    const stats = {
      total_seen: data.length,
      in_review: data.filter(r => r.state === 'review').length,
      learning: data.filter(r => r.state === 'learning').length,
      struggling: data.filter(r => r.lapses > 2).length,
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('srs.data.getSessionStats:', error)
    return { data: null, error }
  }
}

/**
 * Daily-menu contract (SITEMAP §6). SRS is time-critical: due cards first,
 * the composer caps our share of the plan. ~0.5 min per card.
 * @returns {{ data: { moduleId, itemIds, targetItems, estimatedMinutes }|null, error }}
 */
export async function getDailyPlan(userId, minutes) {
  const maxCards = Math.floor(minutes / 0.5)
  const { data: due, error } = await getDueWords(userId, { limit: maxCards })
  if (error) return { data: null, error }
  const items = due || []
  return {
    data: {
      moduleId: 'vocab',
      itemIds: items.map(w => w.word_id),
      targetItems: items.length,
      estimatedMinutes: Math.round(items.length * 0.5),
    },
    error: null,
  }
}
