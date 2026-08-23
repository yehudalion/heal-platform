/**
 * src/data/weakpoints.data.js — the CROSS-MODULE weak-points contract.
 *
 * Same pattern as the daily-plan contract (SITEMAP §6): one function name, one
 * shape, every module answers in the same language so the progress screen never
 * learns any module's internals.
 *
 *   getWeakPoints(userId) → [ModuleReport, ...]
 *
 *   ModuleReport = {
 *     moduleId:        'rephrase',
 *     moduleLabel:     'ניסוח מחדש',
 *     status:          'ok' | 'insufficient_data' | 'not_started',
 *     attempts:        87,      // sample size actually counted
 *     minAttempts:     15,      // the bar this module had to clear
 *     overallMissRate: 0.21,    // THIS learner's own baseline — see note below
 *     points:          [WeakPoint, ...],   // sorted by lift, descending
 *     suppressed:      [{ id, label, exposures, reason }],
 *   }
 *
 *   WeakPoint = { id, label, exposures, misses, missRate, lift }
 *
 * THREE rules this file exists to enforce:
 *
 * (a) EXPOSURE, never a raw failure count. "פעולה קרובה אך שונה" is 37% of every
 *     distractor in the pool — count raw failures and every learner alive looks
 *     weak at it. `missRate = misses / exposures` measures the learner; a bare
 *     `misses` measures the content.
 *
 * (b) `lift` compares the learner to THEMSELVES, not to other learners and not to
 *     an absolute bar: lift = missRate / overallMissRate, where overallMissRate is
 *     this learner's own miss rate across all labels. lift ≈ 1 means "nothing to
 *     report here", which is a real and common answer.
 *     ⚠️ In a single-label module (listening teaches one label) lift is always 1
 *     and carries no information. Such a module's report is read via missRate.
 *
 * (c) NO PROSE. This layer returns numbers and enums only. Every sentence the
 *     learner reads is written in screens/progress.js, so the descriptive-phrasing
 *     rule (SITEMAP §2 — describe the sessions, never label the student) is
 *     enforced in exactly one place instead of once per module.
 *
 * Collectors live here for now. A module may move its collector into its own
 * data file later without touching the shape — that is the point of buildReport.
 */

import { supabase } from '../supabase.js'
import { resolveTrigger } from '../lib/keys.js'

// Below this many attempts a module reports 'insufficient_data' and NO numbers.
// A trend needs a sample; a single bad session is not a trend (Lion, 2026-08-05).
const MIN_ATTEMPTS = 15

// Below this many exposures a single label is moved to `suppressed` instead of
// being ranked. Mirrors the display-threshold rule in SITEMAP §2 — under this,
// the number describes noise, not the learner.
const MIN_EXPOSURES = 8

const round = (n, d = 4) => Number.isFinite(n) ? Number(n.toFixed(d)) : null

/**
 * Turn a module's raw tallies into the shared shape. Pure — no I/O.
 * @param {{ moduleId: string, moduleLabel: string, attempts: number,
 *           tallies: Record<string, { label: string, exposures: number, misses: number }> }} input
 * @returns {object} ModuleReport
 */
export function buildReport({ moduleId, moduleLabel, attempts, tallies }) {
  const base = { moduleId, moduleLabel, attempts, minAttempts: MIN_ATTEMPTS }

  if (!attempts) return { ...base, status: 'not_started', overallMissRate: null, points: [], suppressed: [] }
  if (attempts < MIN_ATTEMPTS) {
    return { ...base, status: 'insufficient_data', overallMissRate: null, points: [], suppressed: [] }
  }

  const rows = Object.entries(tallies).map(([id, t]) => ({ id, ...t }))
  const totalExposures = rows.reduce((s, r) => s + r.exposures, 0)
  const totalMisses = rows.reduce((s, r) => s + r.misses, 0)
  const overallMissRate = totalExposures ? totalMisses / totalExposures : null

  const points = [], suppressed = []
  for (const r of rows) {
    if (r.exposures < MIN_EXPOSURES) {
      suppressed.push({ id: r.id, label: r.label, exposures: r.exposures, reason: 'thin_exposure' })
      continue
    }
    const missRate = r.misses / r.exposures
    points.push({
      id: r.id,
      label: r.label,
      exposures: r.exposures,
      misses: r.misses,
      missRate: round(missRate),
      lift: overallMissRate ? round(missRate / overallMissRate) : null,
    })
  }
  points.sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0))
  suppressed.sort((a, b) => b.exposures - a.exposures)

  return { ...base, status: 'ok', overallMissRate: round(overallMissRate), points, suppressed }
}

/**
 * Rephrase collector.
 *
 * Exposure is per DISTRACTOR, not per question: one answered question exposes the
 * learner to three labelled distractors at once. The label comes from the same
 * resolveTrigger() the practice screen uses, applied to the question's tagging
 * fetched alongside the attempt — NOT from `trap_type`.
 *
 * `trap_type` is deliberately unused: it snapshots `mechanism_n` only, is NULL on
 * correct answers, and resolves a label for just 36.8% of slots (measured over all
 * 1272). `chosen_option_index` is canonical (0=correct, 1/2/3=distractor), so the
 * question join is both sufficient and exact.
 */
async function collectRephrase(userId, { attemptLimit = 2000 } = {}) {
  const { data, error } = await supabase
    .from('restatement_attempts')
    .select(`
      chosen_option_index,
      is_correct,
      restatement_questions (
        trigger_category_1, trigger_category_2, trigger_category_3,
        mechanism_1, mechanism_2, mechanism_3
      )
    `)
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })
    .limit(attemptLimit)

  if (error) throw error

  const tallies = {}
  let attempts = 0

  for (const row of data || []) {
    const q = row.restatement_questions
    if (!q) continue                       // question deleted out from under the attempt
    attempts += 1
    for (const n of [1, 2, 3]) {
      const t = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] })
      if (!t) continue                     // unlabelled slot is not counted in either direction
      if (!tallies[t.id]) tallies[t.id] = { label: t.label, exposures: 0, misses: 0 }
      tallies[t.id].exposures += 1
      if (row.chosen_option_index === n) tallies[t.id].misses += 1
    }
  }

  return { moduleId: 'rephrase', moduleLabel: 'ניסוח מחדש', attempts, tallies }
}

// Registry. A module appears here only once it really implements a collector —
// no placeholder entries, because a fabricated 'not_started' for an unbuilt module
// reads to the learner as "you haven't practised this yet".
// TODO T044+: vocabulary (label = the word itself) and listening (single label,
// "כיוון") plug in here.
const COLLECTORS = [collectRephrase]

/**
 * The contract. Returns one report per module that implements it.
 * A module that throws is skipped rather than taking the whole screen down.
 *
 * `attemptLimit` narrows the window to the N most recent attempts, which is how a
 * SESSION-scoped report is asked for (the practice screen passes the number of
 * questions answered since it loaded). The thresholds do not move: a short session
 * simply comes back 'insufficient_data', and the caller shows nothing.
 *
 * @param {string} userId - auth.users UUID
 * @param {{ attemptLimit?: number }} [options]
 * @returns {Promise<object[]>} ModuleReport[]
 */
export async function getWeakPoints(userId, options = {}) {
  if (!userId) return []
  const settled = await Promise.allSettled(COLLECTORS.map((c) => c(userId, options)))
  const reports = []
  for (const r of settled) {
    if (r.status === 'fulfilled') reports.push(buildReport(r.value))
    else console.error('weakpoints.data.getWeakPoints:', r.reason)
  }
  return reports
}
