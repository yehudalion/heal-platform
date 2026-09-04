import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || 'https://opjtromnkdgehlqeaqzi.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wanRyb21ua2RnZWhscWVhcXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzU1NzksImV4cCI6MjA5MjgxMTU3OX0.o0Sz1P5Nvw8xDCi2YbcVCLHo5VQvgfaySBMVuDhSQ-A';

export const isSupabaseConfigured = true;

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    })
  : null;

// ─── Storage keys ────────────────────────────────────────────────────────────
const LEVEL_KEY         = "heal:level";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// Guest mode was removed 3.9.2026 (Lion's call) — every visitor now signs in
// with Google before entering any screen. isGuest() stays as a permanent
// `false` stub rather than being deleted outright, because a handful of
// data-layer files still read it defensively (`if (!userId) ...` no-op
// guards) and there is no value in touching all of them today just to delete
// an already-unreachable branch. Do not resurrect setGuest() — the moment
// something can flip this back to true, every one of those "unreachable"
// branches becomes reachable again.
export function isGuest() {
  return false;
}
export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

// ─── מה שהיה כאן והוסר (2.9.2026) ────────────────────────────────────────────
//
// הקובץ הזה החזיק שתי שכבות זו על גבי זו: שכבת ההתחברות שלמעלה, שהיא חיה
// ומיובאת בעשרות מקומות, ומתחתיה שכבת דאטה מלפני העיצוב מחדש שאף קובץ
// באפליקציה לא ייבא כבר: recordRating, getAllRatings, getWords, getDueWords,
// saveSrsRating, calcNextReview, getLevel, setLevel, playAudio, getLocalWords,
// והנפילה-לאחור ל-src/data/words.json.
//
// 🔴 הסיבה האמיתית להסרה, לא רק ניקיון: getWords() סיננה
// `.in("tier", ["gold","silver"])` — מנגנון סינון שלישי של המילים שלא מתועד
// בשום מקום וסותר את שני המנגנונים החיים (impact_score, ובריכת ליבה/הרחבה).
// היא ישבה ליד פונקציות שכן בשימוש ונראתה סבירה לגמרי. צ'אט שהיה צריך
// "להביא מילים" ורואה פונקציה בשם getWords היה לוקח אותה, והמילים היו
// מסוננות לפי tier — תווית שהוכרעה כשיווקית בלבד. זה לא היה זועק בשום שלב.
//
// שכבת הדאטה הנכונה: src/data/*.data.js בלבד. מסכים לא קוראים ל-supabase
// ישירות (ARCHITECTURE.md). getLevel/setLevel הוחלפו מזמן ב-
// user_module_levels + src/data/levels.data.js.
