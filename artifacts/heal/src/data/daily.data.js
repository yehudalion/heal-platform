/**
 * src/data/daily.data.js — האתגר היומי.
 *
 * ── למה בכלל ──────────────────────────────────────────────────────────────────
 * אחרי שמצב האורח הוסר (3.9), האתגר היומי הוא הדלת הציבורית היחידה של המוצר:
 * עמוד אחד שאפשר לשחק בו בלי חשבון, ושנגמר בהזמנה להירשם. הוא לא מצב אורח —
 * אין בו מסלול, אין נתונים אישיים, ואי אפשר להמשיך ממנו לשום מקום באפליקציה.
 *
 * ── במה הוא שונה מהמתחרה ──────────────────────────────────────────────────────
 * אצל mypsychometric: 6 שאלות מעורבות, בונוס מהירות, טבלת מובילים עם כינויים,
 * וההסברים נעולים מאחורי הרשמה. כאן:
 *   · אנגלית בלבד — זו הבחינה שלנו.
 *   · ההסבר המלא נפתח מיד ובחינם. חוסמים שמירת התקדמות, לא הבנה.
 *   · אין דירוג בין אנשים. יש השוואה אנונימית לקהל ("62% ענו נכון על שאלה 3"),
 *     שנותנת הקשר בלי לדרג תלמידים זה מול זה.
 *   · שעון סופר למעלה ולא למטה: מראה קצב בלי ליצור לחץ.
 *
 * ── איך נבחרות השאלות ─────────────────────────────────────────────────────────
 * דטרמיניסטית מהתאריך. אותו זרע ⇒ אותן חמש שאלות לכל מי שנכנס באותו יום, בלי
 * קרון-ג'וב ובלי טבלה שצריך למלא כל לילה. אם קיימת שורה ידנית ב-daily_challenges
 * לאותו יום — היא גוברת, וזה מסלול העקיפה לימים שרוצים לאצור ידנית.
 */

import { supabase } from '../supabase.js'

/** התאריך לפי שעון ישראל. חצות בישראל ולא ב-UTC — אחרת האתגר מתחלף ב-03:00. */
export function todayKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)   // YYYY-MM-DD
}

/** mulberry32 — PRNG קטן ויציב. הזרע הוא התאריך, ולכן הבחירה זהה לכולם. */
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function countOf(table, filter) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_published', true)
  if (filter) q = filter(q)
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

async function rowAt(table, cols, offset, filter) {
  let q = supabase.from(table).select(cols).eq('is_published', true).order('id', { ascending: true })
  if (filter) q = filter(q)
  const { data, error } = await q.range(offset, offset)
  if (error) throw error
  return data?.[0] || null
}

/**
 * ההרכב: 2 השלמת משפטים + 2 ניסוח מחדש + 1 תחיליות/סופיות.
 * בלי קטע קריאה בכוונה — קטע של 400 מילה הופך אתגר של ארבע דקות למשהו אחר.
 *
 * @returns {Promise<{date:string, items:Array}>}
 */
export async function getDailyChallenge(date = todayKey()) {
  const rnd = seededRandom(`hs-daily-${date}`)

  // מסלול עקיפה ידני, אם ליאון אצר יום מסוים
  let manual = null
  try {
    const { data } = await supabase
      .from('daily_challenges').select('items, key_label_he, intro_he')
      .eq('challenge_date', date).maybeSingle()
    manual = data || null
  } catch (_) { /* אין שורה ידנית — הזרימה הרגילה */ }

  const midRange = (q) => q.gte('difficulty_pos', 3).lte('difficulty_pos', 6)

  // סשן שבת 5 (5.9.2026): עד עכשיו השורה הידנית נקראה אבל `items` שלה לא
  // כובדו — רק intro/key_label. עכשיו שורה עם items = [{kind:'sc'|'rephrase'|
  // 'affix', id}] קובעת בדיוק את חמש השאלות (30 ימים אצורים: 6.9–5.10).
  // אם פריט אחד לא נמצא (נמחק/לא מפורסם) — נופלים לזרימה הדטרמיניסטית.
  if (Array.isArray(manual?.items) && manual.items.length >= 5) {
    const curated = await pickCurated(manual.items, rnd).catch(() => null)
    if (curated && curated.length >= 5) {
      return { date, manualIntro: manual.intro_he || null, keyLabel: manual.key_label_he || null, items: curated.slice(0, 5) }
    }
  }

  const [scCount, rpCount, afCount] = await Promise.all([
    countOf('sentence_completion_questions', midRange).catch(() => 0),
    countOf('restatement_questions').catch(() => 0),
    countOf('affix_items').catch(() => 0),
  ])

  const picks = []
  const used = { sc: new Set(), rp: new Set(), af: new Set() }
  const pickOffset = (n, bag) => {
    if (!n) return null
    for (let tries = 0; tries < 12; tries++) {
      const o = Math.floor(rnd() * n)
      if (!bag.has(o)) { bag.add(o); return o }
    }
    return null
  }

  const jobs = []
  for (let i = 0; i < 2; i++) {
    const o = pickOffset(scCount, used.sc)
    if (o !== null) jobs.push(rowAt('sentence_completion_questions',
      'id, stem, options, correct_option, explanations_he, clue_code', o, midRange)
      .then((r) => r && picks.push(normSc(r))))
  }
  for (let i = 0; i < 2; i++) {
    const o = pickOffset(rpCount, used.rp)
    if (o !== null) jobs.push(rowAt('restatement_questions',
      'id, original_sentence, correct_answer, distractor_1, distractor_2, distractor_3, correct_explanation_he, explanation_1_he, explanation_2_he, explanation_3_he', o)
      .then((r) => r && picks.push(normRp(r, rnd))))
  }
  {
    const o = pickOffset(afCount, used.af)
    if (o !== null) jobs.push(rowAt('affix_items',
      'id, stem, options, correct_option, explanations_he, decode_note_he, affix, meaning_he', o)
      .then((r) => r && picks.push(normAf(r))))
  }
  await Promise.all(jobs)

  // סדר יציב: לא לפי סדר סיום הבקשות, אחרת האתגר משתנה בין טעינות.
  picks.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  return {
    date,
    manualIntro: manual?.intro_he || null,
    keyLabel: manual?.key_label_he || null,
    items: picks.slice(0, 5),
  }
}

/** שולף את הפריטים האצורים לפי סוג ומזהה, ומחזיר אותם בסדר השורה. */
async function pickCurated(items, rnd) {
  const out = []
  for (const it of items) {
    if (!it?.id || !it?.kind) continue
    if (it.kind === 'sc') {
      const { data } = await supabase.from('sentence_completion_questions')
        .select('id, stem, options, correct_option, explanations_he, clue_code').eq('id', it.id).eq('is_published', true).maybeSingle()
      if (data) out.push({ ...normSc(data), sortKey: String(out.length).padStart(2, '0') })
    } else if (it.kind === 'rephrase') {
      const { data } = await supabase.from('restatement_questions')
        .select('id, original_sentence, correct_answer, distractor_1, distractor_2, distractor_3, correct_explanation_he, explanation_1_he, explanation_2_he, explanation_3_he').eq('id', it.id).eq('is_published', true).maybeSingle()
      if (data) out.push({ ...normRp(data, rnd), sortKey: String(out.length).padStart(2, '0') })
    } else if (it.kind === 'affix') {
      const { data } = await supabase.from('affix_items')
        .select('id, stem, options, correct_option, explanations_he, decode_note_he, affix, meaning_he').eq('id', it.id).eq('is_published', true).maybeSingle()
      if (data) out.push({ ...normAf(data), sortKey: String(out.length).padStart(2, '0') })
    }
  }
  return out
}

function normSc(r) {
  const opts = Array.isArray(r.options) ? r.options : []
  return {
    sortKey: 'a' + r.id, kind: 'sc', kindLabel: 'השלמת משפטים', id: r.id,
    stem: r.stem, options: opts,
    correct: (r.correct_option || 1) - 1,
    explanations: Array.isArray(r.explanations_he) ? r.explanations_he : [],
    note: null,
  }
}

function normRp(r, rnd) {
  // המסיחים מעורבבים לפי אותו זרע, כדי שהתשובה הנכונה לא תהיה תמיד ראשונה.
  const base = [
    { t: r.correct_answer, e: r.correct_explanation_he, ok: true },
    { t: r.distractor_1, e: r.explanation_1_he, ok: false },
    { t: r.distractor_2, e: r.explanation_2_he, ok: false },
    { t: r.distractor_3, e: r.explanation_3_he, ok: false },
  ].filter((o) => o.t)
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]]
  }
  return {
    sortKey: 'b' + r.id, kind: 'rephrase', kindLabel: 'ניסוח מחדש', id: r.id,
    stem: r.original_sentence,
    options: base.map((o) => o.t),
    correct: base.findIndex((o) => o.ok),
    explanations: base.map((o) => o.e || ''),
    note: null,
  }
}

function normAf(r) {
  const opts = Array.isArray(r.options) ? r.options : []
  return {
    sortKey: 'c' + r.id, kind: 'affix', kindLabel: 'תחיליות וסופיות', id: r.id,
    stem: r.stem, options: opts,
    correct: (r.correct_option || 1) - 1,
    explanations: Array.isArray(r.explanations_he) ? r.explanations_he : [],
    note: r.decode_note_he || null,
  }
}

/** מזהה אקראי לדפדפן. לא PII — רק כדי לא לספור אותו שחקן פעמיים. */
export function playerKey() {
  const K = 'hs:daily:pk'
  try {
    let v = localStorage.getItem(K)
    if (!v) { v = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(K, v) }
    return v
  } catch (_) { return 'p_anon' }
}

/** האם כבר שיחק היום (באותו דפדפן). */
export function playedToday(date = todayKey()) {
  try { return localStorage.getItem('hs:daily:done') === date } catch (_) { return false }
}

export function markPlayed(date, payload) {
  try {
    localStorage.setItem('hs:daily:done', date)
    localStorage.setItem('hs:daily:last', JSON.stringify(payload || {}))
  } catch (_) { /* מצב פרטי — מפסידים רק את הזיכרון המקומי */ }
}

export function lastResult() {
  try { return JSON.parse(localStorage.getItem('hs:daily:last') || 'null') } catch (_) { return null }
}

/**
 * שומר תוצאה. כתיבה-בלבד, גם בלי חשבון.
 * @param {object} o { date, correct, total, elapsedMs, answers:[{i,correct}], userId }
 */
export async function saveDailyResult({ date, correct, total, elapsedMs, answers, userId }) {
  try {
    const { error } = await supabase.from('daily_challenge_results').insert({
      challenge_date: date,
      player_key: playerKey(),
      user_id: userId || null,
      correct_count: correct,
      total,
      elapsed_ms: elapsedMs ?? null,
      answers: answers || [],
    })
    if (error) throw error
    return true
  } catch (err) {
    console.warn('daily.saveDailyResult:', err?.message || err)
    return false
  }
}

/** סטטיסטיקת הקהל להיום. מחזיר null בשקט אם אין. */
export async function getDailyStats(date = todayKey()) {
  try {
    const { data, error } = await supabase.rpc('get_daily_challenge_stats', { p_date: date })
    if (error) throw error
    return data || null
  } catch (err) {
    console.warn('daily.getDailyStats:', err?.message || err)
    return null
  }
}
