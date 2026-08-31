/**
 * src/data/coverage.data.js — the cross-module COVERAGE contract.
 *
 * "Coverage" answers a different question than weakpoints.data.js: not
 * "where do you slip", but "how much of the material have you touched at
 * all". Read by /progress and by the home dashboard.
 *
 *   getCoverage(userId) → { data: {...}, error }
 *
 * ─── 🔴 THE ONE RULE THIS FILE EXISTS TO PROTECT (Lion, 2026-08-31) ─────────
 *
 *   "לגבי הפס זה חייב רק להתקדם."  A progress bar may only ever move forward.
 *
 * The old implementation computed the denominator live, as
 * `count(words WHERE impact_score IS NOT NULL)`. That silently breaks the
 * rule: the day the content pipeline scores the remaining 2,116 words, the
 * denominator jumps 550 → 2,666 and EVERY existing learner's bar shrinks by
 * ~79% overnight, through no fault of their own.
 *
 * So the denominator is frozen per learner, once, into
 * user_profiles.vocab_core_goal / vocab_ext_goal, and never recomputed. The
 * numerator only grows, the denominator never moves → the bar is monotonic
 * by construction, not by convention.
 *
 * A single bar cannot satisfy the rule either: a learner who finishes core
 * sits at 550/550 = 100%, and the moment they open the extension pool a
 * combined bar would drop them to 550/2,666 = 21%. Hence TWO independent
 * bars — core, and (only once opened) extension. Neither can go down.
 *
 * ─── Shape ──────────────────────────────────────────────────────────────────
 *   vocab          — kept as-is for backward compatibility; equals vocabCore.
 *                    home.js reads this and needs no change.
 *   vocabCore      — { done, total, complete }
 *   vocabExtension — { done, total } once the learner opened it, else null
 *   pool           — 'core' | 'extended'
 *   listening      — { done, total } (unchanged: is_published is stable)
 *
 *   *.done   — distinct words at srs_progress.state = 'review', counted
 *              against the matching pool. 'review' is the closest thing to
 *              "mastered" the SRS schema has today.
 *
 * Rephrase and Sentence Completion aren't here: their denominator is the
 * module's own key list and their numerator already lives in
 * weakpoints.data.js — duplicating it would be a second source of truth.
 *
 * Zero direct Supabase from any screen — this file is the only caller.
 */

import { supabase } from '../supabase.js'

const ID_BATCH = 200 // keep the ?id=in.(...) URL well under any length limit

/**
 * Count this learner's mastered words inside one pool. Never throws.
 *
 * Deliberately two plain queries instead of one embedded join
 * (`words!inner(impact_score)` + a filter on the embedded column). That
 * syntax is correct PostgREST, but it appears nowhere else in this codebase
 * and there is no way to smoke-test it from the device bridge — node_modules
 * is a pnpm symlink farm the mount cannot follow, so the Supabase client
 * cannot be imported here. An untested query that fails would not throw
 * loudly; it would quietly report 0 mastered words and show the learner an
 * empty bar. `.in()` / `.not()` / `.is()` are all already proven in
 * srs.data.js, so this path is the one that can be reasoned about.
 */
async function countMastered(userId, { scored }) {
  try {
    const { data: rows, error } = await supabase
      .from('srs_progress')
      .select('word_id')
      .eq('user_id', userId)
      .eq('state', 'review')
    if (error) throw error

    const ids = [...new Set((rows || []).map((r) => r.word_id).filter(Boolean))]
    if (!ids.length) return 0

    let total = 0
    for (let i = 0; i < ids.length; i += ID_BATCH) {
      const batch = ids.slice(i, i + ID_BATCH)
      let q = supabase.from('words').select('id').in('id', batch)
      q = scored ? q.not('impact_score', 'is', null) : q.is('impact_score', null)
      const { data, error: err } = await q
      if (err) throw err
      total += (data || []).length
    }
    return total
  } catch (error) {
    console.error('coverage.data.countMastered:', error)
    return 0
  }
}

/** Size of a pool in the library right now. Only ever used to FREEZE a goal. */
// Kept in sync with FREE_PERCENTILE_FLOOR in data/srs.data.js — that file
// decides who is served which word; this one only describes it on the bar.
const FREE_PERCENTILE_FLOOR = 64

async function countPool({ scored, freeOnly = false }) {
  try {
    let q = supabase.from('words').select('id', { count: 'exact', head: true })
    q = scored ? q.not('impact_score', 'is', null) : q.is('impact_score', null)
    if (scored && freeOnly) q = q.gte('impact_percentile', FREE_PERCENTILE_FLOOR)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  } catch (error) {
    console.error('coverage.data.countPool:', error)
    return 0
  }
}

/**
 * Freeze a goal the first time it is needed, then never touch it again.
 * Writing on read is deliberate: the goal has to be captured at the learner's
 * own starting line, and this is the only place that knows when that is.
 */
async function freezeGoal(userId, column, value) {
  try {
    await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, [column]: value }, { onConflict: 'user_id' })
  } catch (error) {
    // A failed freeze is not fatal — the caller still renders with the value
    // it computed; the next call simply tries to freeze again.
    console.error('coverage.data.freezeGoal:', error)
  }
}

export async function getCoverage(userId) {
  if (!userId) return { data: null, error: null }
  try {
    const [profileRes, coreDone, listenRows, listenTotal] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('vocab_pool, vocab_core_goal, vocab_ext_goal, paid_track, paid_expires_at')
        .eq('user_id', userId)
        .maybeSingle(),
      countMastered(userId, { scored: true }),
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

    if (listenRows.error) throw listenRows.error
    if (listenTotal.error) throw listenTotal.error

    const profile = profileRes?.data ?? null
    const pool = profile?.vocab_pool === 'extended' ? 'extended' : 'core'
    const notExpired = !profile?.paid_expires_at || new Date(profile.paid_expires_at) > new Date()
    const isPremium = Boolean(profile?.paid_track) && notExpired

    // ── core goal: frozen on first read, never recomputed ──
    let coreGoal = profile?.vocab_core_goal ?? null
    if (coreGoal === null || coreGoal === undefined) {
      coreGoal = await countPool({ scored: true })
      if (coreGoal > 0) await freezeGoal(userId, 'vocab_core_goal', coreGoal)
    }

    // ── extension goal: only exists once the learner opened that pool ──
    let extension = null
    if (pool === 'extended') {
      let extGoal = profile?.vocab_ext_goal ?? null
      if (extGoal === null || extGoal === undefined) {
        extGoal = await countPool({ scored: false })
        if (extGoal > 0) await freezeGoal(userId, 'vocab_ext_goal', extGoal)
      }
      extension = { done: await countMastered(userId, { scored: false }), total: extGoal ?? 0 }
    }

    // How much of the frozen goal this learner can actually reach on their tier.
    // The denominator stays the full 550 so the bar never moves backwards; the
    // gap between `reachable` and `total` is what the UI draws as locked.
    // Counted live on purpose — it is a marker, not a goal, and if the free
    // tier ever changes size the marker should follow it.
    const reachable = isPremium ? (coreGoal ?? 0) : await countPool({ scored: true, freeOnly: true })

    const listeningDone = new Set((listenRows.data || []).map((r) => r.lecture_id)).size
    const core = {
      done: coreDone,
      total: coreGoal ?? 0,
      reachable: Math.min(reachable, coreGoal ?? 0),
      complete: coreGoal > 0 && coreDone >= coreGoal,
    }

    return {
      data: {
        vocab:          { done: core.done, total: core.total },   // back-compat
        isPremium,
        vocabCore:      core,
        vocabExtension: extension,
        pool,
        listening:      { done: listeningDone, total: listenTotal.count ?? 0 },
      },
      error: null,
    }
  } catch (error) {
    console.error('coverage.data.getCoverage:', error)
    return { data: null, error }
  }
}
