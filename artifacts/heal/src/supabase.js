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
const GUEST_KEY         = "heal:guest";
const GUEST_RATINGS_KEY = "heal:guest:ratings";
const LEVEL_KEY         = "heal:level";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export function setGuest(on) {
  on ? localStorage.setItem(GUEST_KEY, "1") : localStorage.removeItem(GUEST_KEY);
}
export function isGuest() {
  return localStorage.getItem(GUEST_KEY) === "1";
}
export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  setGuest(false);
  localStorage.removeItem(GUEST_RATINGS_KEY);
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
