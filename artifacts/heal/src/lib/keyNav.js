/**
 * src/lib/keyNav.js — מקלדת במסכי תרגול: 1-4 לבחירת תשובה, חצים למעבר.
 *
 * נוסף 3.9.2026. הרעיון נלקח מהמתחרה (שם כתוב "Keys 1-4 pick an answer"),
 * אבל הסיבה האמיתית היא מהירות: תלמיד שמתאמן שעה עובר עשרות שאלות, ולחיצה
 * במקלדת חוסכת לו את המסלול עכבר-עין-עכבר בכל אחת מהן.
 *
 * כיוון החצים מותאם ל-RTL: הממשק בעברית, ולכן שמאלה = קדימה וימינה = אחורה.
 *
 * לא נורה כשהמיקוד בשדה קלט, כשיש דיאלוג פתוח, או כשמקש מודיפייר לחוץ —
 * אחרת Ctrl+1 להחלפת טאב היה בוחר תשובה.
 */

/**
 * @param {object} h
 * @param {(index:number)=>void} [h.onPick]  אינדקס 0-based
 * @param {()=>void} [h.onNext]
 * @param {()=>void} [h.onPrev]
 * @param {number} [h.options] כמה אפשרויות יש (ברירת מחדל 4)
 * @returns {()=>void} פונקציית ניתוק
 */
export function attachKeyNav({ onPick, onNext, onPrev, options = 4 } = {}) {
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const t = e.target;
    const tag = t?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
    // דיאלוג פתוח (אישור סיום פרק, מודאל הגדרות) — המקלדת שייכת לו.
    if (document.querySelector('[role="dialog"], .sim-confirm, .ov-wrap')) return;

    const n = Number(e.key);
    if (onPick && Number.isInteger(n) && n >= 1 && n <= options) {
      e.preventDefault();
      onPick(n - 1);
      return;
    }
    if (onNext && (e.key === 'ArrowLeft' || e.key === 'Enter')) { e.preventDefault(); onNext(); return; }
    if (onPrev && e.key === 'ArrowRight') { e.preventDefault(); onPrev(); }
  }

  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

/** הרמז שמוצג מתחת לאפשרויות. מוסתר במסכי מגע, שם אין מקלדת. */
export const KEY_HINT_HTML =
  '<div class="key-hint">אפשר לבחור עם המקשים <b>1</b>–<b>4</b>, ולעבור שאלה עם החצים</div>';
