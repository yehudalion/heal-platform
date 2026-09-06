import { BRAND } from './brand.js';
/**
 * src/lib/ics.js — ייצוא התוכנית השבועית ליומן.
 *
 * למה זה שווה את הקוד: תלמיד שכותב "אתרגל כל ערב" לא מתרגל. תלמיד שיש לו
 * אירוע חוזר ביומן, עם תזכורת, כן. זה הכלי היחיד שיש לנו שפועל *מחוץ* לאתר,
 * ולכן הוא היחיד שמביא אנשים בחזרה בלי שנשלח להם כלום.
 *
 * הקובץ נבנה בדפדפן ויורד מקומית — בלי שרת, בלי הרשאות יומן, ובלי לשלוח את
 * הלו"ז של התלמיד לשום מקום.
 *
 * RFC 5545: שורות CRLF, DTSTART מקומי עם TZID, RRULE שבועי עד תאריך הבחינה.
 */

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function pad(n) { return String(n).padStart(2, '0'); }

/** YYYYMMDDTHHMMSS מתוך רכיבי תאריך מקומיים. */
function stamp(y, m, d, hh, mm) {
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

/**
 * @param {object} o
 * @param {number[]} o.days ימים לפי getDay (0=ראשון)
 * @param {string} o.hour 'HH:MM'
 * @param {number} o.minutes אורך התרגול
 * @param {string|null} o.examDate 'YYYY-MM-DD' — סוף החזרתיות
 * @returns {string} תוכן ה-ICS
 */
export function buildStudyIcs({ days = [], hour = '18:00', minutes = 20, examDate = null } = {}) {
  const [hh, mm] = String(hour).split(':').map(Number);
  const now = new Date();

  // המופע הראשון: היום הקרוב מבין הימים שנבחרו.
  const start = new Date(now);
  start.setHours(hh || 18, mm || 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const cand = new Date(start);
    cand.setDate(start.getDate() + i);
    if (days.includes(cand.getDay()) && cand > now) { start.setTime(cand.getTime()); break; }
  }

  const end = new Date(start.getTime() + (minutes || 20) * 60000);
  const byday = days.map((d) => DAY_CODES[d]).filter(Boolean).join(',');
  const until = examDate ? `;UNTIL=${String(examDate).replace(/-/g, '')}T235900Z` : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND}//Study Plan//HE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:hs-study-${Date.now()}@adhaptor`,
    `DTSTAMP:${stamp(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes())}Z`,
    `DTSTART;TZID=Asia/Jerusalem:${stamp(start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes())}`,
    `DTEND;TZID=Asia/Jerusalem:${stamp(end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes())}`,
    byday ? `RRULE:FREQ=WEEKLY;BYDAY=${byday}${until}` : '',
    `SUMMARY:תרגול אנגלית — ${BRAND}`,
    'DESCRIPTION:התרגול היומי שלך במבחן האנגלית. https://highscore-eight.vercel.app/',
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:עוד 10 דקות — תרגול אנגלית',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/** מוריד את הקובץ במכשיר. */
export function downloadIcs(content, filename = 'adhaptor-study-plan.ics') {
  try {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.warn('ics.downloadIcs:', err?.message || err);
    return false;
  }
}
