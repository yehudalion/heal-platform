/**
 * src/lib/brand.js — שם המותג במקום אחד.
 *
 * יהודה (4.9.2026): "לנקות את השם HighScore מכל מקום — עוד לא החלטתי איך
 * נקרא לזה, בינתיים שים Wordwise." הסיבה: highscore.co.il הוא עסק ישראלי פעיל
 * להכנה במתמטיקה שקורא לעצמו High Score — התנגשות מותג, לא רק דומיין תפוס.
 *
 * כשהשם הסופי יוכרע — משנים כאן בלבד. הקוד מייבא BRAND; עמודי ה-SEO הסטטיים
 * ב-public/ מחזיקים את המחרוזת בטקסט ומוחלפים בסבב אחד (grep "Wordwise").
 * כתובת האתר (highscore-eight.vercel.app) לא משתנה עד שיהיה דומיין.
 */
export const BRAND = 'Wordwise';
/** הלוגו: שני חלקים, השני בצבע הזהב — כמו "High" + "Score" הישן. */
export const BRAND_PARTS = ['Word', 'wise'];
/** האות בריבוע הלוגו. */
export const BRAND_MARK = 'W';
/** שורת התיאור שמופיעה ליד השם. */
export const BRAND_TAGLINE = 'ההכנה למבחן האנגלית — אמירנט והלאל';
