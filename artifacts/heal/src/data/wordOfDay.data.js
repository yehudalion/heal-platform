/**
 * wordOfDay.data.js — "המילה של היום" למסך הבית.
 *
 * למה קובץ נפרד ולא words.data.js: הוא בבעלות צ'אט אחר, וזו שאילתה עצמאית
 * שלא נוגעת בשום דבר קיים. אותו שיקול כמו savedWords.data.js.
 *
 * הבחירה דטרמיניסטית לפי התאריך, לא אקראית: אותה מילה לכל אורך היום ולכל
 * התלמידים. אקראיות הייתה מחליפה מילה בכל רענון — התלמיד לא היה מספיק
 * לקרוא, ולא היה על מה לדבר עם חבר. הרוטציה עוברת על כל 543 המילים
 * המדורגות לפי סדר האימפקט, כלומר השכיחות קודם.
 *
 * המיון חייב להיות יציב (impact_score ואז id): בלי שובר-שוויון, שתי מילים
 * באותו ציון יכולות להתחלף בין שאילתות ולהזיז את כל החלון.
 */
import { supabase } from '../supabase.js';

/** מספר הימים מאז 1.1.1970 בזמן מקומי — מתחלף בחצות של התלמיד, לא ב-UTC. */
function dayIndex(d = new Date()) {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86400000);
}

/**
 * מחזיר { word, error }. word הוא null כשאין תוכן או כשהשאילתה נכשלה —
 * המסך פשוט לא מצייר את הפינה. אין מצב ביניים ואין טקסט ממלא מקום.
 */
export async function getWordOfDay() {
  try {
    const { count, error: cErr } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .not('impact_score', 'is', null)
      .not('surface_1', 'is', null)
      .not('mnemonic', 'is', null)
      .not('definition_he', 'is', null);
    if (cErr) return { word: null, error: cErr };
    if (!count) return { word: null, error: null };

    const offset = ((dayIndex() % count) + count) % count;
    const { data, error } = await supabase
      .from('words')
      .select('id, headword, definition_he, surface_1, mnemonic, audio_word_url, audio_sentence_url')
      .not('impact_score', 'is', null)
      .not('surface_1', 'is', null)
      .not('mnemonic', 'is', null)
      .not('definition_he', 'is', null)
      .order('impact_score', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset);
    if (error) return { word: null, error };
    return { word: data?.[0] || null, error: null };
  } catch (err) {
    console.error('wordOfDay.data.getWordOfDay:', err);
    return { word: null, error: err };
  }
}
