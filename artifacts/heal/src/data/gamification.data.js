/**
 * src/data/gamification.data.js — שכבת הנתונים של המשחוק.
 *
 * הלקוח לא כותב XP בעצמו. כל כתיבה עוברת דרך ה-RPC record_activity, שמחליט
 * כמה להעניק, מעדכן את הרצף לפי שעון ישראל, ואוכף תקרה יומית. הסיבה איננה
 * חשש מרמאות (אין מה לזכות בו) אלא נכונות: חישוב רצף בצד הלקוח היה שובר
 * בכל מעבר חצות, בכל שינוי אזור זמן, ובכל שני מכשירים במקביל.
 *
 * מדיניות כשל: כל פונקציה כאן מחזירה null ולא זורקת. משחוק הוא שכבת עידוד —
 * אם השרת לא זמין, התלמיד ממשיך לתרגל בלי להרגיש כלום. אסור שפס XP יפיל מסך.
 */

import { supabase } from '../supabase.js'

/**
 * המצב הנוכחי, לטעינת מסך הבית. לא כותב כלום.
 * @returns {Promise<object|null>} { xp, rank, xp_into_rank, xp_per_rank, streak, longest_streak, shields, active_days, practised_today }
 */
export async function getGamificationState() {
  try {
    const { data, error } = await supabase.rpc('get_gamification_state')
    if (error) throw error
    return data?.ok ? data : null
  } catch (err) {
    console.warn('gamification.getGamificationState:', err?.message || err)
    return null
  }
}

/**
 * מדווח על פעילות ומעניק XP. קורא לזה פעמיים בסשן:
 * פעם ראשונה כשהתלמיד עונה על השאלה הראשונה (מסמן את היום כפעיל ומתחיל רצף),
 * ופעם שנייה בסיכום עם הצבירה של המנה.
 *
 * @param {string} source מזהה קצר של המקור, למשל 'rephrase_session'
 * @param {number} xp כמה להעניק (0 = רק לסמן פעילות ולעדכן רצף)
 * @returns {Promise<object|null>} המצב אחרי העדכון, כולל rank_up ו-streak_grew
 */
export async function recordActivity(source, xp = 0) {
  try {
    const { data, error } = await supabase.rpc('record_activity', {
      p_source: String(source || 'unknown').slice(0, 40),
      p_xp: Math.max(0, Math.round(Number(xp) || 0)),
    })
    if (error) throw error
    return data?.ok ? data : null
  } catch (err) {
    console.warn('gamification.recordActivity:', err?.message || err)
    return null
  }
}

/**
 * התגים שהושגו.
 * @param {string|null} userId
 * @returns {Promise<string[]>} מערך קודים
 */
export async function getBadges(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('badge_code, earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: true })
    if (error) throw error
    return (data || []).map(r => r.badge_code)
  } catch (err) {
    console.warn('gamification.getBadges:', err?.message || err)
    return []
  }
}

/**
 * מעניק תג. אידמפוטנטי — PK על (user_id, badge_code), ולכן הענקה חוזרת נבלעת
 * בשקט ולא נחשבת שגיאה.
 *
 * @param {string|null} userId
 * @param {string} code
 * @returns {Promise<boolean>} true אם זה היה תג חדש
 */
export async function awardBadge(userId, code) {
  if (!userId || !code) return false
  try {
    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_code: code })
    if (error) {
      // 23505 = כבר קיים. זה המצב הרגיל, לא תקלה.
      if (error.code === '23505') return false
      throw error
    }
    return true
  } catch (err) {
    console.warn('gamification.awardBadge:', err?.message || err)
    return false
  }
}

/**
 * שלוש המשימות של היום.
 *
 * אין טבלה חדשה בכוונה: ההתקדמות נגזרת מ-xp_events, שכבר מתעד כל סשן עם
 * המקור והזמן. משימה היא שאילתה, לא מצב נוסף שצריך לסנכרן — ולכן היא לא
 * יכולה לצאת מסנכרון עם מה שהתלמיד באמת עשה.
 *
 * המשימות קבועות ולא מוגרלות: "לסיים מנה", "לגעת בשתי פינות", "האתגר היומי".
 * שלושתן מכוונות בדיוק להתנהגויות שאנחנו רוצים — לחזור, להרחיב, ולשחק את
 * האתגר — ותלמיד שיודע מראש מה מצפה ממנו מתחיל מהר יותר.
 *
 * @returns {Promise<Array<{code,label,sub,done,progress,target,href}>|null>}
 */
export async function getTodayMissions() {
  try {
    // חלון היום לפי שעון ישראל, מחושב בצד הלקוח כדי לא להוסיף עוד RPC.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    const startLocal = new Date(`${parts}T00:00:00+03:00`)

    const { data, error } = await supabase
      .from('xp_events')
      .select('source, created_at')
      .gte('created_at', startLocal.toISOString())
      .limit(200)
    if (error) throw error

    const rows = data || []
    const sessions = rows.filter((r) => /_session$/.test(r.source || ''))
    const corners = new Set(sessions
      .map((r) => String(r.source).replace(/_session$/, ''))
      .filter((c) => ['vocab', 'rephrase', 'sc', 'reading', 'listening', 'affix'].includes(c)))
    const playedDaily = rows.some((r) => String(r.source).startsWith('daily'))

    return [
      {
        code: 'one_pack', label: 'לסיים מנת תרגול אחת',
        sub: 'כל פינה נחשבת', href: '/home',
        progress: Math.min(1, sessions.length), target: 1, done: sessions.length >= 1,
      },
      {
        code: 'two_corners', label: 'לגעת בשתי פינות שונות',
        sub: 'רוחב עוזר יותר מעומק ביום אחד', href: '/home',
        progress: Math.min(2, corners.size), target: 2, done: corners.size >= 2,
      },
      {
        code: 'daily', label: 'האתגר היומי',
        sub: '5 שאלות, בערך 4 דקות', href: '/daily',
        progress: playedDaily ? 1 : 0, target: 1, done: playedDaily,
      },
    ]
  } catch (err) {
    console.warn('gamification.getTodayMissions:', err?.message || err)
    return null
  }
}
