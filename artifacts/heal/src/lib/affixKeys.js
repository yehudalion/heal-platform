/**
 * src/lib/affixKeys.js — משפחות התחיליות והסופיות, בשפה של התלמיד.
 *
 * שבע משפחות, לא שלושים תחיליות. הפדגוגיה כאן היא לא שינון רשימה אלא זיהוי
 * *כיוון*: כשמופיעה מילה לא מוכרת, מה החלק שלה מספר לי — שהיא שלילה? שהיא
 * שם עצם? שהיא אדם? זה מה שהופך ניחוש מתוך 4 לניחוש מתוך 2.
 *
 * הקוד (family_code) הוא מה ששמור ב-DB; התווית והתיאור לתלמיד חיים כאן,
 * בדיוק כמו ב-scKeys.js — כדי שאפשר יהיה לשנות ניסוח בלי לגעת בתוכן.
 */

export const AFFIX_FAMILIES = {
  NEGATION: {
    label: 'שלילה',
    hint: 'התחילית הופכת את המשמעות: un-, in-/im-/il-/ir-, non-',
    examples: ['unfounded — חסר בסיס', 'imprecise — לא מדויק', 'irregular — לא סדיר'],
  },
  REVERSE: {
    label: 'היפוך פעולה',
    hint: 'לא רק "לא" — עושה את ההפך: dis-, un- בפעלים, de-',
    examples: ['disprove — להפריך', 'disconnect — לנתק', 'decrease — להקטין'],
  },
  AGAIN: {
    label: 'שוב',
    hint: 're- פירושה עוד פעם. חפשו במשפט again / for the second time',
    examples: ['reconstruct — לבנות מחדש', 'reconsider — לשקול מחדש'],
  },
  WRONGLY: {
    label: 'בטעות',
    hint: 'mis- מסמנת שהפעולה נעשתה לא נכון — בלי כוונה רעה',
    examples: ['misinterpret — לפרש לא נכון', 'mislead — להטעות'],
  },
  DEGREE: {
    label: 'מידה — יותר מדי או מעט מדי',
    hint: 'over- ו-under- הן זוג הפוך. הקשר המשפט קובע לאיזה כיוון',
    examples: ['overestimate — להעריך יתר על המידה', 'underestimate — להעריך בחסר'],
  },
  TIME_PLACE: {
    label: 'זמן ומקום',
    hint: 'pre- לפני, post- אחרי, sub- מתחת, inter- בין, trans- מעבר',
    examples: ['preassembled — מורכב מראש', 'postwar — שלאחר המלחמה'],
  },
  WITHOUT: {
    label: 'עם או בלי',
    hint: '-less בלי, -ful עם. שתי סופיות שהופכות שם עצם לשם תואר',
    examples: ['pointless — חסר טעם', 'harmful — מזיק'],
  },
  CAPABLE: {
    label: 'שאפשר לעשות לו',
    hint: '-able / -ible פירושן שניתן לבצע את הפעולה על הדבר',
    examples: ['readable — קריא', 'avoidable — שניתן להימנע ממנו'],
  },
  NOUN: {
    label: 'זה שם עצם',
    hint: '-tion, -ment, -ness, -ity הופכות פועל או תואר לשם עצם',
    examples: ['conclusion — מסקנה', 'happiness — אושר'],
  },
  ADJ: {
    label: 'זה שם תואר',
    hint: '-ous, -ive, -al, -ic מסמנות תיאור, לא פעולה ולא עצם',
    examples: ['effective — יעיל', 'historical — היסטורי'],
  },
  AGENT: {
    label: 'זה בן אדם',
    hint: '-ist, -er, -or, -ant מציינות מי שעושה את הפעולה',
    examples: ['specialist — מומחה', 'observer — משקיף'],
  },
  VERB: {
    label: 'זה פועל',
    hint: '-ize, -ify, -en הופכות שם תואר לפעולה של לגרום למצב',
    examples: ['stabilize — לייצב', 'clarify — להבהיר'],
  },
};

/** @param {string} code @returns {{label:string,hint:string,examples:string[]}} */
export function familyInfo(code) {
  return AFFIX_FAMILIES[code] || { label: 'פירוק מילים', hint: '', examples: [] };
}

/** @param {string} code @returns {string} */
export function familyLabel(code) {
  return familyInfo(code).label;
}
