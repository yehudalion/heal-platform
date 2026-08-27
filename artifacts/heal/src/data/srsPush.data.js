import { supabase } from '../supabase.js'

/**
 * srsPush.data.js — "push the words you missed into your own vocabulary loop".
 *
 * WHY THIS EXISTS
 * A Sentence Completion item is answered by picking one of four words. When the
 * learner picks the wrong one, two vocabulary facts are exposed at once:
 *   1. the distractor they believed  — a word they think means something it doesn't
 *   2. the correct answer they missed — a word they did not know well enough
 * Both are genuine, personally-evidenced gaps, so both are pushed.
 *
 * HOW THIS DIFFERS FROM THE NORMAL VOCABULARY LOOP (important — Lion, 2026-08-26)
 * The daily loop picks words FOR the learner by importance (`impact_score`), and
 * srs.data.js#getDueWords deliberately refuses any word whose impact_score IS NULL
 * (unvalidated content must never be ranked as "important for the exam").
 * This module is the other door: nothing is ranked, nothing is chosen for the
 * learner. A word enters only because THIS learner personally got it wrong, so
 * impact_score is irrelevant here and is never consulted. That is exactly why the
 * 2,116 pending_review words (harvested from SC distractors, no exam-frequency
 * validation) are reachable through this path and through no other.
 *
 * WHY state = 'relearning' AND NOT 'new'
 * getDueWords() fetches due cards with state IN ('review','relearning') — 'new' is
 * NOT in that list, because a 'new' row there means "already picked as a new word".
 * A pushed word written as 'new' would therefore be invisible forever: excluded
 * from the new-word picker (it is already in srs_progress) and skipped by the due
 * query. 'relearning' + due_at = now is what makes it surface in the next session,
 * and it is also honest: the learner demonstrably failed this word.
 * `lapses` stays 0 on purpose — the miss happened in another module, and
 * getSessionStats() reads lapses > 2 as "struggling in SRS". We do not inflate it.
 *
 * NEVER overwrites existing progress: a word already in the learner's srs_progress
 * is skipped, so a mid-schedule card is never reset to relearning by an SC miss.
 */

/** Options that are phrases, not vocabulary items, have no row in `words`.
 *  Measured 2026-08-26 over all 800 SC questions: 2304/2400 distractor slots
 *  (96%) and 768/800 correct answers resolve to a headword. The rest are
 *  grammar-shaped options ("over the past decade", "he was interrogated about").
 *  Those are silently skipped — this feature is about vocabulary, and a grammar
 *  item has nothing to push. */
const UNMATCHED_IS_NORMAL = true

/** Canonical option indexes are 1-based (see sentenceCompletion.data.js#logAttempt). */
const FIRST_OPTION = 1

/** Trim + collapse whitespace + lowercase. Matching against `words.headword` is
 *  case-insensitive because headwords are stored lowercase but option text is not
 *  guaranteed to be. */
function normalizeHeadword(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Push the words exposed by one wrong Sentence Completion answer into the
 * learner's SRS queue.
 *
 * Safe to call on every answered question: it returns immediately (no I/O) when
 * the answer was correct. Safe to call twice for the same attempt: words already
 * in srs_progress are skipped.
 *
 * @param {string} userId - auth.users UUID
 * @param {object} attempt
 * @param {string[]} attempt.options        - the question's `options` array, canonical order
 * @param {number}   attempt.chosenOption   - CANONICAL 1-4 index the learner picked
 * @param {number}   attempt.correctOption  - CANONICAL 1-4 index of the right answer
 * @param {boolean}  attempt.isCorrect      - when true, nothing is pushed
 * @param {string}  [attempt.attemptId]     - sc_attempts.id; when given, what was
 *                                            pushed is recorded in `pushed_words`
 * @returns {Promise<{ data: { pushed: object[], skipped: object[] }|null, error: object|null }>}
 */
export async function pushMissedWords(userId, {
  options = [],
  chosenOption,
  correctOption,
  isCorrect = false,
  attemptId = null,
} = {}) {
  try {
    if (!userId) throw new Error('pushMissedWords: userId is required')
    if (isCorrect) return { data: { pushed: [], skipped: [] }, error: null }

    // 1. The two words this miss exposed, de-duplicated and normalized.
    const optionAt = (idx) => options[idx - FIRST_OPTION]
    const candidates = []
    for (const [source, idx] of [['chosen', chosenOption], ['correct', correctOption]]) {
      const raw = optionAt(idx)
      const headword = normalizeHeadword(raw)
      if (!headword) continue
      if (candidates.some((c) => c.headword === headword)) continue
      candidates.push({ headword, source, raw })
    }
    if (!candidates.length) return { data: { pushed: [], skipped: [] }, error: null }

    // 2. Resolve to real rows in `words`. `ilike` with no wildcard is a
    //    case-insensitive equality test. No impact_score / status filter here —
    //    see the header note: this path is personal, not importance-ranked.
    const { data: matches, error: lookupError } = await supabase
      .from('words')
      .select('id, headword')
      .or(candidates.map((c) => `headword.ilike.${c.headword}`).join(','))
    if (lookupError) throw lookupError

    const byHeadword = new Map((matches || []).map((w) => [normalizeHeadword(w.headword), w]))
    const resolved = []
    const skipped = []
    for (const c of candidates) {
      const word = byHeadword.get(c.headword)
      if (word) resolved.push({ ...c, wordId: word.id })
      else skipped.push({ ...c, reason: 'no_matching_word' })
    }
    if (!resolved.length) return { data: { pushed: [], skipped }, error: null }

    // 3. Never disturb a card the learner already has in flight.
    const { data: existing, error: existingError } = await supabase
      .from('srs_progress')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', resolved.map((r) => r.wordId))
    if (existingError) throw existingError

    const alreadyTracked = new Set((existing || []).map((r) => r.word_id))
    const toInsert = resolved.filter((r) => !alreadyTracked.has(r.wordId))
    for (const r of resolved) {
      if (alreadyTracked.has(r.wordId)) skipped.push({ ...r, reason: 'already_in_srs' })
    }
    if (!toInsert.length) return { data: { pushed: [], skipped }, error: null }

    // 4. Insert as due-now relearning cards (see header for why not 'new').
    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('srs_progress')
      .insert(toInsert.map((r) => ({
        user_id: userId,
        word_id: r.wordId,
        state: 'relearning',
        interval_days: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        due_at: now,
        updated_at: now,
      })))
      .select('word_id')
    if (insertError) throw insertError

    const pushed = toInsert.map((r) => ({ word_id: r.wordId, headword: r.headword, source: r.source }))

    // 5. Record what was pushed on the attempt itself. Non-blocking: the card is
    //    already in the queue, and losing this annotation must not fail the answer.
    if (attemptId) {
      supabase
        .from('sc_attempts')
        .update({ pushed_words: pushed })
        .eq('id', attemptId)
        .then(({ error }) => {
          if (error) console.warn('srsPush: pushed_words annotation failed (non-blocking):', error)
        })
    }

    return { data: { pushed, skipped }, error: null }
  } catch (error) {
    console.error('srsPush.data.pushMissedWords:', error)
    return { data: null, error }
  }
}

/**
 * How many cards currently in the learner's queue arrived through this door.
 * Feeds a future "words you missed in Sentence Completion" line on the progress
 * screen. Counts sc_attempts rows that carry a non-empty pushed_words array.
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
