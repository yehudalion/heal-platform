/**
 * src/data/reading.data.js — the ONLY place the Reading corner touches Supabase.
 *
 * Built 2026-09-02, after the content bank was finished and audited
 * (100 passages / 500 questions, calibrated to the measured truth corpus —
 * see claude/AUDIT_reading_vs_truth_corpus.md).
 *
 * ── What makes this module different from the other corners ─────────────────
 * Every other bank is one item at a time. Reading's unit is a PASSAGE plus its
 * five questions — that is the real exam's section 3 (one text, 5 questions,
 * 15 minutes). So the fetch returns a whole session, not a pack of unrelated
 * items, and "seen" is tracked per passage, never per question: showing a
 * learner three questions from a text he already read is not practice.
 *
 * ⚠️ qa_note is deliberately absent from QUESTION_COLUMNS. It is internal
 * authoring metadata and must never reach the client — the same discipline
 * simulation.data.js applies in its reading branch.
 */

import { supabase } from '../supabase.js'

const PASSAGE_COLUMNS  = 'id, title, body, topic, difficulty, word_count'
const QUESTION_COLUMNS =
  'id, passage_id, question_text, options, correct_option_index, explanations_he, ' +
  'question_type, window_size, highlight_spans, display_order'

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
 * One practice session = one passage + its five questions, in exam order.
 *
 * Options are NOT shuffled here, unlike sc/rephrase. The bank's
 * correct_option_index is already uniform across 0–3 by construction (audited),
 * so shuffling buys no protection against position bias, and the authored order
 * of the distractors is deliberate — in summary questions they are true-but-
 * too-narrow statements written to sit in a particular relation to each other.
 *
 * @param {{ levels?: number[], excludePassageIds?: string[] }} options
 *        levels — acceptable difficulties, normally from lib/levelMix.js
 * @returns {{ data: {passage:object, questions:object[]}|null, error: object|null }}
 *          data === null with error === null means "nothing left to serve",
 *          which is a real state (learner finished the bank), not a failure.
 */
export async function fetchPassageSession({ levels = [], excludePassageIds = [] } = {}) {
  try {
    const skip = new Set(excludePassageIds)

    let query = supabase
      .from('reading_passages')
      .select('id, difficulty')
      .eq('is_published', true)
    if (levels.length) query = query.in('difficulty', levels)

    const { data: atLevel, error: idErr } = await query
    if (idErr) throw idErr

    let pool = (atLevel || []).filter((r) => !skip.has(r.id))

    // Widen rather than dead-end: a learner who has exhausted his own band gets
    // a passage from anywhere in the bank before he gets an empty screen.
    if (!pool.length && levels.length) {
      const { data: all, error: allErr } = await supabase
        .from('reading_passages')
        .select('id, difficulty')
        .eq('is_published', true)
      if (allErr) throw allErr
      pool = (all || []).filter((r) => !skip.has(r.id))
    }
    if (!pool.length) return { data: null, error: null }

    const pickId = shuffled(pool)[0].id

    const [passageRes, questionRes] = await Promise.all([
      supabase.from('reading_passages').select(PASSAGE_COLUMNS).eq('id', pickId).single(),
      supabase
        .from('reading_questions')
        .select(QUESTION_COLUMNS)
        .eq('passage_id', pickId)
        .eq('is_published', true)
        .order('display_order', { ascending: true }),
    ])
    if (passageRes.error) throw passageRes.error
    if (questionRes.error) throw questionRes.error

    const passage = passageRes.data
    const questions = questionRes.data || []
    // A passage with a broken question set is a data fault, not a learner state.
    if (!passage || !questions.length) return { data: null, error: null }

    return { data: { passage, questions }, error: null }
  } catch (error) {
    console.error('reading.data.fetchPassageSession:', error)
    return { data: null, error }
  }
}

/**
 * Log one answer.
 *
 * question_type and window_size are written as a SNAPSHOT rather than joined at
 * read time on purpose: the analyze report must keep describing what the learner
 * actually met, even if an item is re-tagged later. The bank was re-tagged once
 * already (window_size, 2.9.2026) — that is not hypothetical.
 *
 * @param {{
 *   userId: string, passageId: string, questionId: string,
 *   chosenOption: number,        // 0-based, matches reading_questions.correct_option_index
 *   isCorrect: boolean,
 *   questionType: string, windowSize: 'anchor'|'paragraph'|'text',
 *   mode?: 'practice'|'exam', responseTimeMs?: number|null,
 * }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function logAttempt({
  userId,
  passageId,
  questionId,
  chosenOption,
  isCorrect,
  questionType,
  windowSize,
  mode = 'practice',
  responseTimeMs = null,
} = {}) {
  // Guest — nothing to attach the row to. A silent no-op, never a rejection:
  // the practice screen fires this and moves on.
  if (!userId) return { data: null, error: null }
  try {
    const { data, error } = await supabase
      .from('reading_attempts')
      .insert({
        user_id: userId,
        passage_id: passageId,
        question_id: questionId,
        chosen_option: chosenOption,
        is_correct: isCorrect,
        question_type: questionType,
        window_size: windowSize,
        mode,
        time_ms: responseTimeMs,
      })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('reading.data.logAttempt:', error)
    return { data: null, error }
  }
}

/**
 * The learner's recent attempts, newest first. Feeds the gate's one number and
 * the analyze report.
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchRecentAttempts(userId, { limit = 300 } = {}) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('reading_attempts')
      .select('question_id, passage_id, is_correct, question_type, window_size, mode, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('reading.data.fetchRecentAttempts:', error)
    return { data: null, error }
  }
}

/**
 * Passage ids the learner has already worked through, so a session never
 * re-serves a text he has read.
 * @returns {{ data: string[], error: object|null }}
 */
export async function fetchSeenPassageIds(userId, { limit = 1000 } = {}) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('reading_attempts')
      .select('passage_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: [...new Set((data || []).map((r) => r.passage_id))], error: null }
  } catch (error) {
    console.error('reading.data.fetchSeenPassageIds:', error)
    return { data: [], error }
  }
}

/**
 * The Analyze layer's numbers, computed here so no screen does arithmetic on
 * raw rows.
 *
 * The PRIMARY axis is window size — that is the one axis the learner is taught
 * and tracked on (READING_FORMAT.md §6), because it is exactly what the Window
 * Method teaches. Question type is the secondary axis, and is also the axis the
 * Mastery-Hints rule runs on.
 *
 * @returns {{ data: {
 *   total:number, correct:number,
 *   byWindow: Record<string,{total:number,correct:number}>,
 *   byType:   Record<string,{total:number,correct:number}>,
 *   typeStreaks: Record<string, number>,   // current run of correct answers per type
 * }|null, error: object|null }}
 */
export async function fetchAnalyzeSummary(userId, { limit = 300 } = {}) {
  const { data: rows, error } = await fetchRecentAttempts(userId, { limit })
  if (error) return { data: null, error }

  const byWindow = {}
  const byType = {}
  let correct = 0

  for (const r of rows) {
    if (r.is_correct) correct++
    const w = (byWindow[r.window_size] ||= { total: 0, correct: 0 })
    w.total++
    if (r.is_correct) w.correct++
    const t = (byType[r.question_type] ||= { total: 0, correct: 0 })
    t.total++
    if (r.is_correct) t.correct++
  }

  // rows are newest-first, so the leading run per type IS the current streak.
  const typeStreaks = {}
  const closed = new Set()
  for (const r of rows) {
    if (closed.has(r.question_type)) continue
    if (r.is_correct) typeStreaks[r.question_type] = (typeStreaks[r.question_type] || 0) + 1
    else closed.add(r.question_type)
  }

  return { data: { total: rows.length, correct, byWindow, byType, typeStreaks }, error: null }
}

/**
 * Recent wrong answers with everything needed to re-show the item. The rule the
 * other corners follow applies here too: a finding is never shown bare, always
 * with the item behind it.
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function fetchRecentMistakes(userId, { limit = 40 } = {}) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('reading_attempts')
      .select(`
        chosen_option, created_at, window_size, question_type,
        reading_questions ( id, question_text, options, correct_option_index, explanations_he ),
        reading_passages  ( id, title )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('reading.data.fetchRecentMistakes:', error)
    return { data: null, error }
  }
}

/**
 * Daily-menu contract (SITEMAP §6), same shape the other modules expose.
 *
 * The estimate is per PASSAGE, not per question, and it is the one number in
 * the app that comes straight from the official exam: NITE allots 15 minutes
 * to one text and its five questions. Practice mode runs lighter than a timed
 * section, so 10 minutes is the working figure — but a reading block is still
 * far chunkier than an SC item (~1.2 min), and plan.data.js should treat it as
 * an all-or-nothing block rather than slicing it.
 */
export async function getDailyPlan(userId, minutes) {
  const MINUTES_PER_PASSAGE = 10
  const passages = Math.max(1, Math.floor(minutes / MINUTES_PER_PASSAGE))
  return {
    data: {
      moduleId: 'reading',
      itemIds: [],
      targetItems: passages,
      estimatedMinutes: passages * MINUTES_PER_PASSAGE,
    },
    error: null,
  }
}
