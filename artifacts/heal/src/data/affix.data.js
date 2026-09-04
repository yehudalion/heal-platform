/**
 * src/data/affix.data.js — שכבת הנתונים של פינת התחיליות והסופיות.
 *
 * מבנה זהה ל-sentenceCompletion.data.js בכוונה: אותה חתימה, אותה מדיניות
 * כשל, אותו בסיס 1 ב-chosen_option. פינה שנראית אחרת בשכבת הנתונים היא פינה
 * שאף אחד לא יזכור איך לתחזק בעוד חודשיים.
 */

import { supabase } from '../supabase.js'

/**
 * מביא מנת שאלות. נמנע מפריטים שכבר נענו לאחרונה.
 *
 * @param {object} o
 * @param {number} [o.limit]
 * @param {number[]} [o.levels] טווח difficulty_pos מבוקש
 * @param {string[]} [o.excludeIds]
 * @returns {Promise<{data:Array,error:Error|null}>}
 */
export async function fetchAffixItems({ limit = 5, levels = null, excludeIds = [] } = {}) {
  try {
    let q = supabase
      .from('affix_items')
      .select('id, affix, affix_type, family_code, meaning_he, target_word, stem, options, correct_option, explanations_he, decode_note_he, difficulty_pos')
      .eq('is_published', true)
    if (levels?.length) q = q.in('difficulty_pos', levels)
    if (excludeIds?.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`)

    const { data, error } = await q.limit(60)
    if (error) throw error

    // ערבוב בצד הלקוח: המאגר קטן, ו-order random בפוסטגרס דרך PostgREST יקר.
    const pool = [...(data || [])]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return { data: pool.slice(0, limit), error: null }
  } catch (err) {
    console.warn('affix.fetchAffixItems:', err?.message || err)
    return { data: [], error: err }
  }
}

/**
 * רושם ניסיון. no-op בטוח בלי userId — אחרי הסרת מצב האורח זה לא אמור לקרות,
 * וזו בכל זאת הגנה: מסך תרגול לעולם לא נופל בגלל כתיבה.
 */
export async function logAffixAttempt({ userId, itemId, chosenOption, isCorrect, responseTimeMs = null, hintUsed = null } = {}) {
  if (!userId) return { data: null, error: null }
  try {
    const { data, error } = await supabase.from('affix_attempts').insert({
      user_id: userId,
      item_id: itemId,
      chosen_option: chosenOption,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      hint_used: hintUsed,
    }).select('id').maybeSingle()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.warn('affix.logAffixAttempt:', err?.message || err)
    return { data: null, error: err }
  }
}

/** ניסיונות אחרונים, למסך הניתוח ולמונה בעמוד הפינה. */
export async function fetchAffixAttempts(userId, { limit = 300 } = {}) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('affix_attempts')
      .select('id, item_id, is_correct, created_at, affix_items(affix, affix_type, family_code)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    console.warn('affix.fetchAffixAttempts:', err?.message || err)
    return { data: [], error: err }
  }
}

/**
 * סיכום לפי משפחה — הבסיס למסך הניתוח.
 * @returns {Promise<{data:{total:number,correct:number,families:Array},error:Error|null}>}
 */
export async function fetchAffixSummary(userId, { limit = 300 } = {}) {
  const { data, error } = await fetchAffixAttempts(userId, { limit })
  if (error) return { data: null, error }

  const byFamily = new Map()
  let correct = 0
  for (const a of data) {
    if (a.is_correct) correct += 1
    const fam = a.affix_items?.family_code || 'OTHER'
    const cur = byFamily.get(fam) || { code: fam, total: 0, correct: 0 }
    cur.total += 1
    if (a.is_correct) cur.correct += 1
    byFamily.set(fam, cur)
  }
  const families = [...byFamily.values()]
    .map((f) => ({ ...f, accuracy: f.total ? Math.round((f.correct / f.total) * 100) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy)

  return { data: { total: data.length, correct, families }, error: null }
}
