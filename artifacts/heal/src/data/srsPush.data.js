import { supabase } from '../supabase.js'

/**
 * srsPush.data.js — "add the words I missed to my vocabulary practice".
 *
 * WHY THIS EXISTS
 * A Sentence Completion item is answered by picking one of four words. When the
 * learner picks the wrong one, two vocabulary facts are exposed at once:
 *   1. the distractor they believed  — a word they think means something it doesn't
 *   2. the correct answer they missed — a word they did not know well enough
 *
 * LEARNER-INITIATED, NEVER AUTOMATIC (Lion, 2026-08-27)
 * Nothing is ever pushed as a side effect of answering. A wrong answer only makes
 * the OFFER available; the learner decides. The screen calls getPushableWords()
 * to find out whether there is anything worth offering (and to label the button
 * with the actual words), and calls pushMissedWords() only from the click
 * handler. This is the wellbeing rule applied to the SRS queue: the learner's
 * practice list is theirs, and it does not silently grow every time they slip.
 *
 * HOW THIS DIFFERS FROM THE NORMAL VOCABULARY LOOP
 * The daily loop picks words FOR the learner by importance (`impact_score`), and
 * srs.data.js#getDueWords deliberately refuses any word whose impact_score IS NULL
 * (unvalidated content must never be ranked as "important for the exam").
 * This module is the other door: nothing is ranked, nothing is chosen for the
 * learner. A word enters only because the learner personally asked for it after
 * missing it, so impact_score is irrelevant here and is never consulted. That is
 * exactly why the 2,116 pending_review words (harvested from SC distractors, no
 * exam-frequency validation) are reachable through this path and through no other.
 *
 * WHY state = 'relearning' AND NOT 'new'
 * getDueWords() fetches due cards with state IN ('review','relearning') — 'new' is
 * NOT in that list, because a 'new' row there means "already picked as a new word".
 * A pushed word written as 'new' would therefore be invisible forever: excluded
 * from the new-word picker (it is already in srs_progress) and skipped by the due
 * query. 'relearning' + due_at = now is what makes it surface in the next session.
 * `lapses` stays 0 on purpose — the miss happened in another module, and
 * getSessionStats() reads lapses > 2 as "struggling in SRS". We do not inflate it.
 *
 * NEVER overwrites existing progress: a word already in the learner's srs_progress
 * is skipped, so a mid-schedule card is never reset by an SC miss.
 */

/** Canonical option indexes are 1-based (see sentenceCompletion.data.js#logAttempt). */
const FIRST_OPTION = 1

/** Trim + collapse whitespace + lowercase. Matching against `words.headword` is
 *  case-insensitive because headwords are stored lowercase but option text is not
 *  guaranteed to be. */
function normalizeHeadword(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** The two words a wrong answer exposes, normalized and de-duplicated.
 *  Pure — no I/O. */
function candidatesFor({ options = [], chosenOption, correctOption, isCorrect = false }) {
  const optionAt = (idx) => options[idx - FIRST_OPTION]
  const out = []
  const add = (idx, source) => {
    const headword = normalizeHeadword(optionAt(idx))
    if (!headword) return
    if (out.some((c) => c.headword === headword)) return
    out.push({ headword, source })
  }

  if (isCorrect) {
    // תשובה נכונה (ליאון, 1.9.2026): השלמת משפטים היא בבסיסה שאלת אוצר
    // מילים, ומי שענה נכון לא בהכרח מכיר את כל ארבע האופציות — ולפעמים גם
    // לא באמת את זו שבחר. לכן מוצעות כל האופציות: הנכונה קודם, ואז המסיחים.
    // מה שכבר בתור התרגול שלו מסונן בהמשך ממילא.
    add(correctOption, 'correct')
    for (let idx = FIRST_OPTION; idx < FIRST_OPTION + options.length; idx++) {
      if (idx !== correctOption) add(idx, 'distractor')
    }
    return out
  }

  for (const [source, idx] of [['chosen', chosenOption], ['correct', correctOption]]) {
    add(idx, source)
  }
  return out
}

/**
 * What COULD be added, without adding anything. Read-only.
 *
 * The screen uses this to decide whether to render the offer at all and what to
 * put on the button ("הוסף ל- lucid ו- vivid לתרגול"). On a WRONG answer it offers
 * the chosen word and the correct one; on a CORRECT answer it offers the
 * distractors instead (Lion, 2026-09-01 — the learner picked right but still may
 * not know the other three). Returns an empty array when the options are phrases
 * rather than vocabulary
 * (grammar-shaped items like "over the past decade" have no row in `words`), or
 * when the learner already has both words in their queue — in each of those cases
 * the button should simply not appear.
 *
 * Measured 2026-08-26 over all 800 SC questions: 2304/2400 distractor slots (96%)
 * and 768/800 correct answers resolve to a headword.
 *
 * @param {string} userId
 * @param {{ options: string[], chosenOption: number, correctOption: number, isCorrect?: boolean }} attempt
 * @returns {Promise<{ data: Array<{ wordId: string, headword: string, source: 'chosen'|'correct' }>, error: object|null }>}
 */
export async function getPushableWords(userId, {
  options = [],
  chosenOption,
  correctOption,
  isCorrect = false,
} = {}) {
  try {
    if (!userId) return { data: [], error: null }

    const candidates = candidatesFor({ options, chosenOption, correctOption, isCorrect })
    if (!candidates.length) return { data: [], error: null }

    // `ilike` with no wildcard is a case-insensitive equality test. No
    // impact_score / status filter — see the header: this path is personal,
    // not importance-ranked.
    const { data: matches, error: lookupError } = await supabase
      .from('words')
      .select('id, headword')
      .or(candidates.map((c) => `headword.ilike.${c.headword}`).join(','))
    if (lookupError) throw lookupError

    const byHeadword = new Map((matches || []).map((w) => [normalizeHeadword(w.headword), w]))
    const resolved = candidates
      .map((c) => ({ ...c, wordId: byHeadword.get(c.headword)?.id }))
      .filter((c) => c.wordId)
    if (!resolved.length) return { data: [], error: null }

    // Words already in the learner's queue are not offered again.
    const { data: existing, error: existingError } = await supabase
      .from('srs_progress')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', resolved.map((r) => r.wordId))
    if (existingError) throw existingError

    const alreadyTracked = new Set((existing || []).map((r) => r.word_id))
    return {
      data: resolved.filter((r) => !alreadyTracked.has(r.wordId)),
      error: null,
    }
  } catch (error) {
    console.error('srsPush.data.getPushableWords:', error)
    return { data: [], error }
  }
}

/**
 * Add words to the learner's vocabulary queue. CALL THIS FROM A CLICK HANDLER
 * ONLY — never automatically after an answer (see the header).
 *
 * Pass the array getPushableWords() returned, so the learner adds exactly what
 * the button offered. Passing a subset is fine and is how a per-word button
 * would work.
 *
 * Safe to call twice: words already in srs_progress are skipped.
 *
 * @param {string} userId - auth.users UUID
 * @param {Array<{ wordId: string, headword: string, source?: string }>} words
 * @param {{ attemptId?: string|null }} [options] - sc_attempts.id; when given,
 *        what was added is recorded in that row's `pushed_words` column
 * @returns {Promise<{ data: { added: object[] }|null, error: object|null }>}
 */
export async function pushMissedWords(userId, words = [], { attemptId = null } = {}) {
  try {
    if (!userId) throw new Error('pushMissedWords: userId is required')
    const wanted = (words || []).filter((w) => w?.wordId)
    if (!wanted.length) return { data: { added: [] }, error: null }

    // Re-check against the queue at click time: the offer may have been rendered
    // minutes ago, and the same word can have arrived from another question since.
    const { data: existing, error: existingError } = await supabase
      .from('srs_progress')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', wanted.map((w) => w.wordId))
    if (existingError) throw existingError

    const alreadyTracked = new Set((existing || []).map((r) => r.word_id))
    const toInsert = wanted.filter((w) => !alreadyTracked.has(w.wordId))
    if (!toInsert.length) return { data: { added: [] }, error: null }

    const now = new Date().toISOString()
    const { error: insertError } = await supabase
      .from('srs_progress')
      .insert(toInsert.map((w) => ({
        user_id: userId,
        word_id: w.wordId,
        state: 'relearning',
        interval_days: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        due_at: now,
        updated_at: now,
      })))
    if (insertError) throw insertError

    const added = toInsert.map((w) => ({
      word_id: w.wordId,
      headword: w.headword,
      source: w.source ?? null,
    }))

    // Annotate the attempt. Non-blocking: the cards are already in the queue and
    // losing this annotation must not fail the learner's click.
    if (attemptId) {
      supabase
        .from('sc_attempts')
        .update({ pushed_words: added })
        .eq('id', attemptId)
        .then(({ error }) => {
          if (error) console.warn('srsPush: pushed_words annotation failed (non-blocking):', error)
        })
    }

    return { data: { added }, error: null }
  } catch (error) {
    console.error('srsPush.data.pushMissedWords:', error)
    return { data: null, error }
  }
}

/**
 * How many distinct words the learner has added through this door.
 * Feeds a future "words you added from Sentence Completion" line on the
 * progress screen.
 * @param {string} userId
 * @returns {Promise<{ data: number, error: object|null }>}
 */
export async function getPushedWordCount(userId) {
  try {
    if (!userId) return { data: 0, error: null }
    const { data, error } = await supabase
      .from('sc_attempts')
      .select('pushed_words')
      .eq('user_id', userId)
      .not('pushed_words', 'is', null)
    if (error) throw error
    const ids = new Set()
    for (const row of data || []) {
      for (const w of row.pushed_words || []) if (w?.word_id) ids.add(w.word_id)
    }
    return { data: ids.size, error: null }
  } catch (error) {
    console.error('srsPush.data.getPushedWordCount:', error)
    return { data: 0, error }
  }
}
