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
import { resolveKey } from '../lib/scKeys.js'
import { familyLabel } from '../lib/affixKeys.js'

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
export function buildReport({ moduleId, moduleLabel, attempts, tallies }, { minAttempts = MIN_ATTEMPTS, minExposures = MIN_EXPOSURES } = {}) {
  const base = { moduleId, moduleLabel, attempts, minAttempts }

  if (!attempts) return { ...base, status: 'not_started', overallMissRate: null, points: [], suppressed: [] }
  if (attempts < minAttempts) {
    return { ...base, status: 'insufficient_data', overallMissRate: null, points: [], suppressed: [] }
  }

  const rows = Object.entries(tallies).map(([id, t]) => ({ id, ...t }))
  const totalExposures = rows.reduce((s, r) => s + r.exposures, 0)
  const totalMisses = rows.reduce((s, r) => s + r.misses, 0)
  const overallMissRate = totalExposures ? totalMisses / totalExposures : null

  const points = [], suppressed = []
  for (const r of rows) {
    if (r.exposures < minExposures) {
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
async function collectRephrase(userId, { attemptLimit = 2000, sinceDays = null } = {}) {
  let q = supabase
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
  if (sinceDays) q = q.gte('attempted_at', sinceIso(sinceDays))
  const { data, error } = await q

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

/**
 * Sentence Completion collector.
 *
 * Unlike Rephrase, the label here belongs to the QUESTION (one clue_code per
 * row), not to a specific distractor — so exposure is per ATTEMPT, one label
 * per attempt, not three. resolveKey() is the same function sc-practice.js and
 * sc-analyze.js use, so an unresolvable clue_code is excluded here exactly as
 * it would be from a screen — no attempt is silently double-counted.
 */
async function collectSentenceCompletion(userId, { attemptLimit = 2000, sinceDays = null } = {}) {
  let q = supabase
    .from('sc_attempts')
    .select(`
      is_correct,
      sentence_completion_questions ( clue_code )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(attemptLimit)
  if (sinceDays) q = q.gte('created_at', sinceIso(sinceDays))
  const { data, error } = await q

  if (error) throw error

  const tallies = {}
  let attempts = 0

  for (const row of data || []) {
    const q = row.sentence_completion_questions
    if (!q) continue
    const key = resolveKey(q.clue_code)
    if (!key) continue
    attempts += 1
    if (!tallies[key.id]) tallies[key.id] = { label: key.label, exposures: 0, misses: 0 }
    tallies[key.id].exposures += 1
    if (!row.is_correct) tallies[key.id].misses += 1
  }

  return { moduleId: 'sentenceCompletion', moduleLabel: 'השלמת משפטים', attempts, tallies }
}

/**
 * Affix collector (סשן שבת 5, 5.9.2026). Label = the affix FAMILY (family_code
 * → affixKeys.js), one label per attempt like Sentence Completion. Feeds the
 * journey map, "התובנה שלך השבוע" and /progress — affix-analyze.js keeps its own
 * simpler per-family accuracy and is untouched.
 */
async function collectAffix(userId, { attemptLimit = 2000, sinceDays = null } = {}) {
  let q = supabase
    .from('affix_attempts')
    .select('is_correct, affix_items ( family_code )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(attemptLimit)
  if (sinceDays) q = q.gte('created_at', sinceIso(sinceDays))
  const { data, error } = await q
  if (error) throw error

  const tallies = {}
  let attempts = 0
  for (const row of data || []) {
    const code = row.affix_items?.family_code
    if (!code) continue
    attempts += 1
    if (!tallies[code]) tallies[code] = { label: familyLabel(code), exposures: 0, misses: 0 }
    tallies[code].exposures += 1
    if (!row.is_correct) tallies[code].misses += 1
  }
  return { moduleId: 'affix', moduleLabel: 'תחיליות וסופיות', attempts, tallies }
}

/** ISO של "לפני N ימים" — לחלון של 14 יום בתובנה השבועית. */
function sinceIso(days) {
  return new Date(Date.now() - days * 86400000).toISOString()
}

// Registry. A module appears here only once it really implements a collector —
// no placeholder entries, because a fabricated 'not_started' for an unbuilt module
// reads to the learner as "you haven't practised this yet".
// TODO T044+: vocabulary (label = the word itself) and listening (single label,
// "כיוון") plug in here.
const COLLECTORS = [collectRephrase, collectSentenceCompletion, collectAffix]

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
 * @param {{ attemptLimit?: number, sinceDays?: number, thresholds?: {minAttempts?:number, minExposures?:number} }} [options]
 *   `thresholds` — רק לתובנה השבועית (journey.data.js), שהיא עצה על חלון קצר
 *   ולא דוח; כל מסך שמציג מספרים לתלמיד משאיר את הספים המקוריים.
 *   `sinceDays` (סשן שבת 5) — רק ניסיונות מ-N הימים האחרונים; "התובנה שלך
 *   השבוע" קוראת עם 14. הספים לא זזים: חלון קצר פשוט מחזיר insufficient_data.
 * @returns {Promise<object[]>} ModuleReport[]
 */
export async function getWeakPoints(userId, options = {}) {
  if (!userId) return []
  const settled = await Promise.allSettled(COLLECTORS.map((c) => c(userId, options)))
  const reports = []
  for (const r of settled) {
    if (r.status === 'fulfilled') reports.push(buildReport(r.value, options.thresholds))
    else console.error('weakpoints.data.getWeakPoints:', r.reason)
  }
  return reports
}
