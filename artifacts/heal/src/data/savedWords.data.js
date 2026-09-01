/**
 * src/data/savedWords.data.js — "המילון שלי".
 *
 * המודול היחיד שנוגע ב-saved_words. הטבלה מחזיקה את מה שהתלמיד **בחר**
 * לשמור, ולא את מה שהמערכת מתזמנת לו — זה `srs_progress`, וזו הפרדה
 * מכוונת: הסרה מהמילון האישי לא נוגעת בהתקדמות החזרות המרווחות.
 *
 * אורח: אין לו שורות ואין לו חשבון. כל הפונקציות כאן הן no-op שקט כשאין
 * userId, באותו דפוס של rephrase.data.js ו-simulation.data.js.
 */

import { supabase } from '../supabase.js'

/** מזהי המילים השמורות, כ-Set — לסימון מהיר של "כבר שמור" ברשימות. */
export async function getSavedIds(userId) {
  if (!userId) return { data: new Set(), error: null }
  try {
    const { data, error } = await supabase
      .from('saved_words')
      .select('word_id')
      .eq('user_id', userId)
    if (error) throw error
    return { data: new Set((data || []).map((r) => r.word_id)), error: null }
  } catch (error) {
    console.error('savedWords.data.getSavedIds:', error)
    return { data: new Set(), error }
  }
}

/**
 * המילים השמורות במלואן, החדשה ראשונה.
 * שתי שאילתות ולא join: הטבלה קטנה, ו-`words` נשלפת ממילא בשאילתה אחת.
 */
export async function getSavedWords(userId) {
  if (!userId) return { data: [], error: null }
  try {
    const { data: rows, error } = await supabase
      .from('saved_words')
      .select('word_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    if (!rows?.length) return { data: [], error: null }

    const { data: words, error: wErr } = await supabase
      .from('words')
      .select('id, headword, definition_he, definition, surface_1, audio_word_url, audio_sentence_url')
      .in('id', rows.map((r) => r.word_id))
    if (wErr) throw wErr

    const byId = new Map((words || []).map((w) => [w.id, w]))
    const ordered = rows.map((r) => byId.get(r.word_id)).filter(Boolean)
    return { data: ordered, error: null }
  } catch (error) {
    console.error('savedWords.data.getSavedWords:', error)
    return { data: [], error }
  }
}

/** שמירה. אידמפוטנטי — שמירה חוזרת לא מייצרת כפילות ולא נכשלת. */
export async function saveWord(userId, wordId) {
  if (!userId || !wordId) return { error: null }
  try {
    const { error } = await supabase
      .from('saved_words')
      .upsert({ user_id: userId, word_id: wordId }, { onConflict: 'user_id,word_id' })
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('savedWords.data.saveWord:', error)
    return { error }
  }
}

/** הסרה מהמילון האישי. לא נוגעת ב-srs_progress. */
export async function unsaveWord(userId, wordId) {
  if (!userId || !wordId) return { error: null }
  try {
    const { error } = await supabase
      .from('saved_words')
      .delete()
      .eq('user_id', userId)
      .eq('word_id', wordId)
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('savedWords.data.unsaveWord:', error)
    return { error }
  }
}
