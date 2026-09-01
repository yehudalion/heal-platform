/**
 * src/data/simulation.data.js — המודול היחיד שנוגע בטבלאות הסימולציה.
 *
 * נבנה 1.9.2026. הסימולציה ("אבחון רמה") שואבת פריטים משלושה בנקי תוכן קיימים
 * — השלמת משפטים, ניסוח מחדש והאזנה — לפי טופס קבוע מוגדר מראש. הפרדת שכבות
 * (ARCHITECTURE §2.11): המסכים לא יודעים מאיזו טבלה הגיע כל פריט, הם מקבלים
 * מכאן צורה אחידה אחת.
 *
 * שלוש החלטות שכדאי להכיר לפני שנוגעים:
 *
 *   1. טופס קבוע, לא אדפטיבי. המבחן האמיתי אדפטיבי, אבל אדפטיביות אמיתית
 *      דורשת כיול פסיכומטרי של כל פריט שאין לנו. טופס קבוע גם נותן נתונים
 *      ברי-השוואה בין נבחנים, וזה שווה יותר בבטא.
 *
 *   2. אין ציון 50–150. אין לנו כיול שמצדיק מספר כזה, ונבחן עלול להחליט על
 *      סמכו אם לגשת למבחן. מוחזרים אחוזי דיוק למיומנות ותקרת רמת קושי.
 *
 *   3. אורח מתרגל בלי חשבון, ושום דבר לא נשמר לו. כל פונקציית כתיבה כאן היא
 *      no-op שקטה כשאין userId — אותו דפוס שכבר קיים ב-rephrase.data.js.
 *
 * אינדקסים: השלמת משפטים שומרת correct_option בבסיס 1, האזנה שומרת
 * correct_option_index בבסיס 0, וניסוח מחדש שומר את הנכונה בעמודה נפרדת.
 * הנרמול כאן מחזיר תמיד correctIndex בבסיס 0 לתוך מערך options.
 */

import { supabase } from '../supabase.js'

/* ── ערבוב דטרמיניסטי ─────────────────────────────────────────────────────────
 * ניסוח מחדש שומר [נכונה, מסיח1, מסיח2, מסיח3] — בלי ערבוב התשובה תמיד ראשונה.
 * הזרע הוא ה-id של השאלה, ולכן אותה שאלה נראית תמיד אותו דבר: חשוב במבחן,
 * גם כדי שרענון דף לא יזיז תשובות מתחת לידיים של הנבחן.
 */
function seedFrom(uuid) {
  let h = 2166136261
  for (let i = 0; i < uuid.length; i++) {
    h ^= uuid.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle(arr, seed) {
  const a = [...arr]
  let s = seed || 1
  const rand = () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5;  s >>>= 0
    return s / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── תוויות מיומנות, במקום אחד ─────────────────────────────────────────────── */
export const SECTION_LABELS = {
  sc:           'השלמת משפטים',
  continuation: 'השלמת קטע',
  restatement:  'ניסוח מחדש',
  lecture_qa:   'קטע שמיעה',
  reading:      'הבנת הנקרא',
}

/** סדר התצוגה של הפרקים בדוח. reading שמור לשלב 2. */
export const SECTION_ORDER = ['sc', 'continuation', 'restatement', 'lecture_qa', 'reading']

/* ── קריאה ─────────────────────────────────────────────────────────────────── */

/** כל הטפסים המפורסמים, לפי code. */
export async function listForms() {
  try {
    const { data, error } = await supabase
      .from('simulation_forms')
      .select('*')
      .eq('is_published', true)
      .order('code')
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('simulation.data.listForms:', error)
    return { data: [], error }
  }
}

/**
 * טופס אחד עם כל הפריטים שלו, מנורמלים לצורה אחידה.
 * שלוש שאילתות מרוכזות (אחת לכל בנק) ולא אחת לפריט.
 * @param {string} code  'sim-1' … 'sim-5'
 * @returns {{ data: {form:object, items:object[]}|null, error: object|null }}
 */
export async function loadForm(code) {
  try {
    const { data: form, error: formErr } = await supabase
      .from('simulation_forms')
      .select('*')
      .eq('code', code)
      .eq('is_published', true)
      .single()
    if (formErr) throw formErr

    const [{ data: rows, error: itemErr }, { data: sectionRows, error: secErr }] = await Promise.all([
      supabase.from('simulation_form_items').select('*').eq('form_id', form.id).order('item_order'),
      supabase.from('simulation_form_sections').select('*').eq('form_id', form.id).order('section_no'),
    ])
    if (itemErr) throw itemErr
    if (secErr) throw secErr

    const scIds  = rows.filter((r) => r.item_kind === 'sc').map((r) => r.item_id)
    const rsIds  = rows.filter((r) => r.item_kind === 'restatement').map((r) => r.item_id)
    const lqIds  = rows.filter((r) => r.item_kind === 'listening').map((r) => r.item_id)
    const rdIds  = rows.filter((r) => r.item_kind === 'reading').map((r) => r.item_id)
    const lecIds = [...new Set(rows.map((r) => r.lecture_id).filter(Boolean))]

    const [scRes, rsRes, lqRes, lecRes, rdRes] = await Promise.all([
      scIds.length  ? supabase.from('sentence_completion_questions').select('*').in('id', scIds)   : { data: [] },
      rsIds.length  ? supabase.from('restatement_questions').select('*').in('id', rsIds)           : { data: [] },
      lqIds.length  ? supabase.from('listening_questions').select('*').in('id', lqIds)             : { data: [] },
      lecIds.length ? supabase.from('listening_lectures').select('*').in('id', lecIds)             : { data: [] },
      rdIds.length  ? supabase.from('reading_questions').select('*').in('id', rdIds)               : { data: [] },
    ])

    // קטע קריאה אחד משותף לחמש שאלות — שליפה שנייה, תלוית-תוצאה, לפי passage_id
    // שמופיע בתוך שורות reading_questions (אין עמודת passage_id ב-simulation_form_items עצמה).
    const passageIds = [...new Set((rdRes.data || []).map((q) => q.passage_id).filter(Boolean))]
    const { data: passageRows } = passageIds.length
      ? await supabase.from('reading_passages').select('*').in('id', passageIds)
      : { data: [] }

    const byId = (arr) => new Map((arr || []).map((x) => [x.id, x]))
    const scMap = byId(scRes.data), rsMap = byId(rsRes.data)
    const lqMap = byId(lqRes.data), lecMap = byId(lecRes.data)
    const rdMap = byId(rdRes.data), passageMap = byId(passageRows)

    const items = rows.map((r) => normalize(r, { scMap, rsMap, lqMap, lecMap, rdMap, passageMap })).filter(Boolean)

    // פרק בלי פריטים מדולג לגמרי — כך פרק הבנת הנקרא השמור לא מופיע לנבחן
    // כפרק ריק, אבל גם לא צריך למחוק אותו כדי להריץ את האבחון.
    const sections = (sectionRows || [])
      .map((r) => ({
        no:        r.section_no,
        kind:      r.section_kind,
        title:     r.title,
        seconds:   r.time_limit_seconds,
        isPilot:   r.is_pilot === true,
        items:     items.filter((it) => it.sectionNo === r.section_no),
      }))
      .filter((sec) => sec.items.length > 0)

    return { data: { form, sections, items }, error: null }
  } catch (error) {
    console.error('simulation.data.loadForm:', error)
    return { data: null, error }
  }
}

/**
 * השלמת משפטים שומרת הסברים כאובייקט, לא כמערך:
 *   { correct: '…', distractors: { '1': '…', '3': '…', '4': '…' } }
 * המפתחות ב-distractors הם מספר האופציה בבסיס 1, והאופציה הנכונה חסרה משם.
 * שני הבנקים האחרים מחזירים מערך מיושר לאופציות, ולכן ההמרה כאן — אחרת
 * ההסברים של יותר מחצי מהמבחן פשוט לא מופיעים בדוח, בלי שום שגיאה גלויה.
 * (אותה גישה בדיוק שמשמשת את screens/sc-practice.js.)
 */
function scExplanationsToArray(raw, correctIndex, optionCount) {
  if (!raw || typeof raw !== 'object') return null
  const out = new Array(optionCount).fill(null)
  if (raw.correct && correctIndex >= 0 && correctIndex < optionCount) {
    out[correctIndex] = raw.correct
  }
  const d = raw.distractors
  if (d && typeof d === 'object') {
    for (const key of Object.keys(d)) {
      const i = Number(key) - 1                 // בסיס 1 -> בסיס 0
      if (Number.isInteger(i) && i >= 0 && i < optionCount) out[i] = d[key]
    }
  }
  return out.some(Boolean) ? out : null
}

/** צורה אחידה אחת לשלושת הבנקים. מחזיר null אם התוכן חסר — הפריט פשוט ידולג. */
function normalize(row, maps) {
  const base = {
    order:       row.item_order,
    sectionNo:   row.section_no,
    sectionKind: row.section_kind,
    itemKind:    row.item_kind,
    itemId:      row.item_id,
    lectureId:   row.lecture_id,
    difficulty:  row.difficulty,
  }

  if (row.item_kind === 'sc') {
    const q = maps.scMap.get(row.item_id)
    if (!q) return null
    const options      = Array.isArray(q.options) ? q.options : []
    const correctIndex = (q.correct_option ?? 1) - 1        // הבנק שומר בבסיס 1
    return {
      ...base,
      prompt:       q.stem,
      options,
      correctIndex,
      explanations: scExplanationsToArray(q.explanations_he, correctIndex, options.length),
      clueCode:     q.clue_code,
      topic:        q.topic,
    }
  }

  if (row.item_kind === 'restatement') {
    const q = maps.rsMap.get(row.item_id)
    if (!q) return null
    // סדר קנוני בבנק: [נכונה, מסיח1, מסיח2, מסיח3] — חייב ערבוב.
    const canonical = [q.correct_answer, q.distractor_1, q.distractor_2, q.distractor_3]
    const canonicalExpl = [
      q.correct_explanation_he, q.explanation_1_he, q.explanation_2_he, q.explanation_3_he,
    ]
    const idx = seededShuffle([0, 1, 2, 3], seedFrom(q.id))
    return {
      ...base,
      prompt:       q.original_sentence,
      options:      idx.map((i) => canonical[i]),
      explanations: idx.map((i) => canonicalExpl[i]),
      correctIndex: idx.indexOf(0),
      mechanisms:   [q.mechanism_1, q.mechanism_2, q.mechanism_3],
      topic:        q.topic,
    }
  }

  if (row.item_kind === 'reading') {
    const q = maps.rdMap.get(row.item_id)
    if (!q) return null
    const passage = maps.passageMap.get(q.passage_id) || {}
    // options/explanations_he הם מערכי מחרוזות פשוטים, בסיס 0 — ראו HANDOFF_reading_comprehension_build.md §4.2,
    // במכוון שונה מ-listening_questions (מערך אובייקטים) ומ-sentence_completion_questions (בסיס 1).
    return {
      ...base,
      prompt:         q.question_text,
      options:        Array.isArray(q.options) ? q.options : [],
      correctIndex:   q.correct_option_index ?? 0,     // הבנק שומר בבסיס 0
      explanations:   Array.isArray(q.explanations_he) ? q.explanations_he : null,
      questionType:   q.question_type,
      windowSize:     q.window_size,
      highlightSpans: q.highlight_spans,
      passageId:      q.passage_id,
      passageTitle:   passage.title,
      passageBody:    passage.body,
      passageTopic:   passage.topic,
    }
  }

  // האזנה — גם 'continuation' וגם 'lecture_qa'
  const q = maps.lqMap.get(row.item_id)
  if (!q) return null
  const lec = maps.lecMap.get(row.lecture_id) || {}

  // options כאן הוא מערך של אובייקטים, לא של מחרוזות:
  //   { text, k_code, fail_mode, explanation_he }
  // הסבר הלומד יושב בתוך כל אופציה. העמודה explanation_he ברמת השאלה היא
  // מטא-דאטה של בקרת איכות ("עבר בוחן עיוור 21/21") ואסור להציג אותה ללומד.
  const rawOpts = Array.isArray(q.options) ? q.options : []
  const explanations = rawOpts.map((o) => (o && typeof o === 'object' ? o.explanation_he ?? null : null))

  return {
    ...base,
    prompt:       q.question_text,
    options:      rawOpts.map((o) => (o && typeof o === 'object' ? o.text ?? '' : String(o ?? ''))),
    correctIndex: q.correct_option_index ?? 0,     // הבנק שומר בבסיס 0
    explanations: explanations.some(Boolean) ? explanations : null,
    questionType: q.question_type,
    keyType:      q.key_type,
    audioUrl:     lec.audio_url,
    transcript:   lec.transcript,
    lectureTitle: lec.title,
    lectureFormat: lec.format,
  }
}

/* ── כתיבה. כל פונקציה כאן היא no-op שקט לאורח (userId ריק). ─────────────── */

/** פותח ניסיון חדש. מחזיר null לאורח — הוא מתרגל בזיכרון בלבד. */
export async function startAttempt(userId, formId) {
  if (!userId) return { data: null, error: null }
  try {
    const { data, error } = await supabase
      .from('simulation_attempts')
      .insert({ user_id: userId, form_id: formId })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('simulation.data.startAttempt:', error)
    return { data: null, error }
  }
}

/** שומר תשובה אחת. upsert לפי (attempt, item_order) כדי ששינוי תשובה לא יכפיל. */
export async function saveAnswer(attemptId, answer) {
  if (!attemptId) return { error: null }
  try {
    const { error } = await supabase
      .from('simulation_answers')
      .upsert({
        attempt_id:   attemptId,
        item_order:   answer.order,
        section_kind: answer.sectionKind,
        item_kind:    answer.itemKind,
        item_id:      answer.itemId,
        chosen_index: answer.chosenIndex,
        is_correct:   answer.isCorrect,
        difficulty:   answer.difficulty ?? null,
        response_ms:  answer.responseMs ?? null,
      }, { onConflict: 'attempt_id,item_order' })
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('simulation.data.saveAnswer:', error)
    return { error }
  }
}

/** סוגר את הניסיון ושומר את הסיכום. */
export async function finishAttempt(attemptId, summary) {
  if (!attemptId) return { error: null }
  try {
    const { error } = await supabase
      .from('simulation_attempts')
      .update({
        status:         'completed',
        finished_at:    new Date().toISOString(),
        total_answered: summary.totalAnswered,
        total_correct:  summary.totalCorrect,
        section_stats:  summary.sectionStats,
      })
      .eq('id', attemptId)
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('simulation.data.finishAttempt:', error)
    return { error }
  }
}

/** הניסיונות שהושלמו של נבחן, החדש ראשון. */
export async function listAttempts(userId, limit = 10) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('simulation_attempts')
      .select('*, simulation_forms(code, title)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('simulation.data.listAttempts:', error)
    return { data: [], error }
  }
}

/* ── חישוב הדוח. פונקציה טהורה: אין כאן רשת, וקל לבדוק אותה. ─────────────── */

/**
 * בונה את דוח הפערים מתוך התשובות של הנבחן.
 * מכוון: אין כאן ציון 50–150 ואין ניסיון לגזור אחד.
 * @param {object[]} items    הפריטים המנורמלים של הטופס
 * @param {Map} answers       order -> { chosenIndex, isCorrect }
 */
export function buildReport(items, answers) {
  const sections = {}
  for (const it of items) {
    const s = (sections[it.sectionKind] ||= {
      kind: it.sectionKind, label: SECTION_LABELS[it.sectionKind] || it.sectionKind,
      total: 0, correct: 0, answered: 0, byDifficulty: {},
    })
    s.total += 1
    const a = answers.get(it.order)
    if (!a || a.chosenIndex == null) continue
    s.answered += 1
    if (a.isCorrect) s.correct += 1

    const d = it.difficulty
    if (d != null) {
      const bucket = (s.byDifficulty[d] ||= { total: 0, correct: 0 })
      bucket.total += 1
      if (a.isCorrect) bucket.correct += 1
    }
  }

  for (const s of Object.values(sections)) {
    s.accuracy = s.answered ? Math.round((s.correct / s.answered) * 100) : null
    s.ceiling  = difficultyCeiling(s.byDifficulty)
  }

  const ordered = SECTION_ORDER.filter((k) => sections[k]).map((k) => sections[k])
  const totalAnswered = ordered.reduce((n, s) => n + s.answered, 0)
  const totalCorrect  = ordered.reduce((n, s) => n + s.correct, 0)

  return {
    sections: ordered,
    totalAnswered,
    totalCorrect,
    totalQuestions: items.length,
    accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : null,
    strongest: pickBy(ordered, (a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1)),
    weakest:   pickBy(ordered, (a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101)),
  }
}

/** הרמה הגבוהה ביותר שבה הנבחן עדיין ענה נכון על הרוב. null אם אין מספיק נתונים. */
function difficultyCeiling(byDifficulty) {
  const levels = Object.keys(byDifficulty).map(Number).sort((a, b) => a - b)
  let ceiling = null
  for (const lvl of levels) {
    const b = byDifficulty[lvl]
    if (b.total && b.correct / b.total >= 0.5) ceiling = lvl
  }
  return ceiling
}

function pickBy(list, cmp) {
  const scored = list.filter((s) => s.accuracy != null)
  if (scored.length < 2) return null
  return [...scored].sort(cmp)[0]
}
