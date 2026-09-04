/**
 * src/data/levels.data.js — persistence for the learner's difficulty CENTER.
 *
 * Fixes the oldest live bug in the product: the adaptive engines in
 * rephrase-practice.js and sc-practice.js worked perfectly and then threw their
 * result away. `level` was in-memory only and reset to START_LEVEL on every
 * session, so a learner who climbed all week came back on Monday to the easiest
 * questions in the bank, with no explanation.
 *
 * ── Shape of the value (Lion, 2026-08-29) ────────────────────────────────────
 * Not an integer level — a numeric CENTER. The learner practises a MIX of levels
 * around it (see lib/levelMix.js) and what moves over time is the average.
 *
 * ⚠️ INTERNAL ONLY. Lion: "I don't want the student to know the level of the
 * question in front of him." Nothing here is for display. There is deliberately
 * no formatting helper, no label, and no CEFR resolution in this file — adding
 * one would invite a screen to render it.
 *
 * Failure policy: every function degrades to the module's own START level rather
 * than throwing. A learner must always be able to practise, even if this table
 * is unreachable — losing adaptivity for one session is a small cost, a blocked
 * practice screen is not.
 */

import { supabase } from '../supabase.js'

/** Range and cold-start per module. Mirrors the constants in the practice screens. */
export const MODULE_LEVELS = {
  rephrase: { min: 2, max: 5, start: 2 },
  // 3.9.2026 — start תוקן מ-1 ל-4: sc-practice.js פותח ב-START_LEVEL = 4, והכותרת
  // כאן מבטיחה "Mirrors the constants in the practice screens". כל עוד זה היה 1,
  // החיווט של הפונקציה הזה היה מפיל כל תלמיד חדש בהשלמת משפטים מרמה 4 לרמה 1.
  sc:       { min: 1, max: 8, start: 4 },
  // Reading is bounded 2..7 rather than the schema's full 1..8: the bank holds a
  // single passage at difficulty 1 and a single one at 8, so a center that
  // drifted to either edge would hand the learner the same text every session.
  reading:  { min: 2, max: 7, start: 4 },
  // 3.9.2026 — פינת התחיליות והסופיות. טווח צר יותר בכוונה: המאגר עדיין מנת
  // כיול של 12 פריטים, ומרכז שנודד לקצה היה מגיש את אותם פריטים כל סשן.
  affix:    { min: 3, max: 6, start: 4 },
}

/**
 * Load a learner's center for one module.
 * A guest (no userId) or a learner with no row yet gets the module's start
 * value — a cold start, not an error.
 *
 * @param {string|null} userId
 * @param {'rephrase'|'sc'} module
 * @returns {Promise<{center:number, isNew:boolean, error:Error|null}>}
 */
export async function getLevelCenter(userId, module) {
  const cfg = MODULE_LEVELS[module] || MODULE_LEVELS.rephrase
  if (!userId) return { center: cfg.start, isNew: true, error: null }

  try {
    const { data, error } = await supabase
      .from('user_module_levels')
      .select('level')
      .eq('user_id', userId)
      .eq('module', module)
      .maybeSingle()
    if (error) throw error

    if (!data) return { center: cfg.start, isNew: true, error: null }

    // Guard the read as well as the write: a row written by an older build, or
    // by a future module with a different range, must not hand a screen a value
    // it will then query the question bank with.
    const raw = Number(data.level)
    const center = Number.isFinite(raw)
      ? Math.min(cfg.max, Math.max(cfg.min, raw))
      : cfg.start

    return { center, isNew: false, error: null }
  } catch (error) {
    console.error('levels.data.getLevelCenter:', error)
    return { center: cfg.start, isNew: true, error }
  }
}

/**
 * Persist a learner's center. Call this only when the center actually MOVED —
 * not after every answer. Guests are a silent no-op, exactly like every other
 * write in the app.
 *
 * @param {string|null} userId
 * @param {'rephrase'|'sc'} module
 * @param {number} center
 * @returns {Promise<{error:Error|null}>}
 */
export async function saveLevelCenter(userId, module, center) {
  if (!userId) return { error: null }
  const cfg = MODULE_LEVELS[module]
  if (!cfg) return { error: null }

  const value = Number(center)
  if (!Number.isFinite(value)) return { error: null }
  const clamped = Math.min(cfg.max, Math.max(cfg.min, Math.round(value * 100) / 100))

  try {
    const { error } = await supabase
      .from('user_module_levels')
      .upsert(
        { user_id: userId, module, level: clamped, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,module' }
      )
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('levels.data.saveLevelCenter:', error)
    return { error }
  }
}
