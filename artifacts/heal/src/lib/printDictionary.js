/**
 * src/lib/printDictionary.js — ייצוא "המילון שלי" ל-PDF.
 *
 * דרך ההדפסה של הדפדפן, ובכוונה לא ספריית PDF בקוד (ליאון אישר, 1.9.2026).
 * ספריות כמו jsPDF דורשות הטמעת פונט עברי ידנית ונוטות להפוך את כיווניות
 * הטקסט — בדיוק סוג התקלה שכבר נתקלנו בה. הדפדפן יודע לעשות עברית ו-RTL
 * נכון בעצמו, זה עובד גם בנייד ("שמור כ-PDF" בתפריט השיתוף), ואין תלות
 * חיצונית.
 *
 * המימוש: iframe מוסתר עם מסמך עצמאי, הדפסה ממנו, וניקוי אחריו. לא
 * window.print() על הדף עצמו — זה היה מדפיס את הסיידבר ואת שאר האפליקציה.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * @param {Array<{headword:string, definition_he:string, definition:string, surface_1:string}>} words
 * @param {{ name?: string }} [opts]
 */
export function printMyDictionary(words, { name = '' } = {}) {
  if (!words?.length) return;

  const today = new Date().toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const rows = words.map((w, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td class="en" dir="ltr">${esc(w.headword)}</td>
      <td class="he">
        ${esc(w.definition_he || '')}
        ${w.surface_1 ? `<div class="ex" dir="ltr">${esc(w.surface_1)}</div>` : ''}
      </td>
    </tr>`).join('');

  const doc = `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>המילון שלי — HighScore</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Assistant', Arial, sans-serif; color: #14201A; margin: 0; }
  .head { border-bottom: 2px solid #1F5C43; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #16412F; }
  .meta { font-size: 11px; color: #5C6B60; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: right; font-size: 10px; letter-spacing: .04em; color: #5C6B60;
       border-bottom: 1px solid #E3DDCC; padding: 0 6px 5px; }
  td { border-bottom: 1px solid #EFEADC; padding: 7px 6px; vertical-align: top;
       font-size: 12px; line-height: 1.6; }
  td.n  { width: 26px; color: #9AA79D; font-size: 10px; }
  td.en { width: 34%; direction: ltr; text-align: left; font-weight: 700; }
  .ex   { direction: ltr; text-align: left; color: #5C6B60; font-size: 11px; margin-top: 3px; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .foot { margin-top: 18px; font-size: 10px; color: #9AA79D; }
</style></head>
<body>
  <div class="head">
    <h1>המילון שלי</h1>
    <div class="meta">${words.length} מילים${name ? ` · ${esc(name)}` : ''} · ${esc(today)} · HighScore</div>
  </div>
  <table>
    <thead><tr><th></th><th>מילה</th><th>פירוש</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">נוצר ב-HighScore — הכנה לבחינת האנגלית</div>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0';
  document.body.appendChild(frame);

  const cleanup = () => { setTimeout(() => frame.remove(), 1000); };

  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (_) { /* חסימת הדפסה בדפדפן — לא מפילים את המסך */ }
    cleanup();
  };

  const fdoc = frame.contentWindow.document;
  fdoc.open();
  fdoc.write(doc);
  fdoc.close();
}
