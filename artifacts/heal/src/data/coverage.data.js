/**
 * src/data/coverage.data.js — the cross-module COVERAGE contract.
 *
 * "Coverage" answers a different question than weakpoints.data.js: not
 * "where do you slip", but "how much of the material have you touched at
 * all". Built for /progress's "empty box" (Lion, 2026-08-26: the box feels
 * empty, a chart could fill it — decided: bars, not a ring, see
 * lib/coverageBar.js) and, once home.js is free to edit again, the home
 * dashboard.
 *
 *   getCoverage(userId) → { data: { vocab: {done,total}, listening: {done,total} }, error }
 *
 * Denominators are fetched live, never hardcoded — the word bank and lecture
 * library both grow between now and Dec 2026.
 *
 *   vocab.done       — distinct words at srs_progress.state = 'review' for
 *                       this user. 'review' is the closest thing to "mastered"
 *                       the SRS schema has today; there is no explicit
 *                       mastered state yet (confirmed against production data,
 *                       2026-08-26 — only 'learning' and 'review' occur).
 *   vocab.total       — words.impact_score IS NOT NULL. Unvalidated words are
 *                       never served to a learner (see srs.data.js
 *                       getDueWords, Lion + Cowork 2026-08-26), so they don't
 *                       belong in the denominator either.
 *   listening.done    — distinct lectures with a completed session for this
 *                       user.
 *   listening.total   — listening_lectures.is_published = true.
 *
 * Rephrase (and, once shipped, Sentence Completion) aren't here: their
 * denominator is the module's own key list (rephrase-learn.js's LEARN_BLOCKS)
 * and their numerator already lives in weakpoints.data.js's report — no new
 * query needed, and duplicating it here would be a second source of truth.
 *
 * Zero direct Supabase from any screen — this file is the only caller.
 */

import { supabase } from '../supabase.js'

/**
 * @param {string} userId
 * @returns {Promise<{ data: { vocab: {done:number,total:number}, listening: {done:number,total:number} } | null, error: object|null }>}
 */
export async function getCoverage(userId) {
  if (!userId) return { data: null, error: null }
  try {
    const [vocabDone, vocabTotal, listenRows, listenTotal] = await Promise.all([
      supabase
        .from('srs_progress')
        .select('word_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('state', 'review'),
      supabase
        .from('words')
        .select('id', { count: 'exact', head: true })
        .not('impact_score', 'is', null),
      supabase
        .from('listening_sessions')
        .select('lecture_id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
      supabase
        .from('listening_lectures')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true),
    ])

    if (vocabDone.error) throw vocabDone.error
    if (vocabTotal.error) throw vocabTotal.error
    if (listenRows.error) throw listenRows.error
    if (listenTotal.error) throw listenTotal.error

    const listeningDone = new Set((listenRows.data || []).map((r) => r.lecture_id)).size

    return {
      data: {
        vocab:     { done: vocabDone.count ?? 0, total: vocabTotal.count ?? 0 },
        listening: { done: listeningDone,        total: listenTotal.count ?? 0 },
      },
      error: null,
    }
  } catch (error) {
    console.error('coverage.data.getCoverage:', error)
    return { data: null, error }
  }
}
