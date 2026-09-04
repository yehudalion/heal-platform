/**
 * src/lib/itemFeedback.js — משוב על שאלה בודדת.
 *
 * הרעיון נלקח מהמתחרה, שמציג "Great item — QA" ו-"Report issue" ליד כל שאלה
 * עם ה-ID שלה. אצלנו יש כבר דגל גלובלי (🚩 "משהו לא בסדר"), אבל דגל גלובלי
 * מגיע בלי הקשר: אני לא יודע על איזו שאלה הוא מדבר. משוב פר-שאלה נוחת עם
 * מזהה הפריט, ולכן הוא הופך ישירות לרשימת עבודה על התוכן.
 *
 * זה שווה במיוחד בבטא: המאגר נכתב במנות כיול, וכל דיווח הוא בדיוק סוג
 * המידע שמכייל את המנה הבאה.
 *
 * נשמר ב-client_errors עם source='item_feedback' — אותה טבלה שכבר משמשת
 * לדיווחי משתמש, בלי טבלה חדשה למשהו שנקרא מה-SQL editor פעם בשבוע.
 */

import { supabase } from '../supabase.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * ה-HTML של שתי הכפתורים. מוצג רק אחרי שהתלמיד ענה — לפני זה הוא לא יכול
 * לדעת אם השאלה טובה, ושאלה על איכות באמצע פתרון היא הסחה.
 * @param {string} module
 * @param {string|number} itemId
 */
export function itemFeedbackHtml(module, itemId) {
  return `
    <div class="if-bar" data-if-module="${esc(module)}" data-if-item="${esc(itemId)}">
      <button class="if-btn if-good" data-if="good" title="שאלה טובה">👍 שאלה טובה</button>
      <button class="if-btn if-bad" data-if="bad" title="משהו לא בסדר בשאלה">⚠️ יש בעיה בשאלה</button>
    </div>`;
}

/**
 * מחבר את המאזינים. קורא לזה אחרי כל ציור, על ה-root של המסך.
 * @param {HTMLElement} root
 */
export function wireItemFeedback(root) {
  root.querySelectorAll('.if-bar').forEach((bar) => {
    if (bar.dataset.ifWired === '1') return;
    bar.dataset.ifWired = '1';
    bar.querySelectorAll('.if-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const kind = btn.dataset.if;
        const module = bar.dataset.ifModule;
        const itemId = bar.dataset.ifItem;
        // משוב חיובי נשלח מיד; דיווח על בעיה פותח שדה קצר, כי "מה הבעיה"
        // הוא כל הערך של הדיווח.
        if (kind === 'good') {
          send(module, itemId, 'good', '');
          bar.innerHTML = `<span class="if-thanks">תודה — נרשם 🙏</span>`;
          return;
        }
        bar.innerHTML = `
          <div class="if-form">
            <input class="if-input" id="ifNote" maxlength="200"
                   placeholder="מה לא בסדר? (למשל: שתי תשובות נכונות, שגיאת כתיב)" />
            <button class="if-btn if-send" id="ifSend">שליחה</button>
          </div>`;
        const input = bar.querySelector('#ifNote');
        input.focus();
        const submit = () => {
          send(module, itemId, 'bad', input.value || '');
          bar.innerHTML = `<span class="if-thanks">תודה — הדיווח נשלח 🙏</span>`;
        };
        bar.querySelector('#ifSend').addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      });
    });
  });
}

async function send(module, itemId, kind, note) {
  try {
    let userId = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch (_) { /* לא קריטי */ }

    await supabase.from('client_errors').insert({
      user_id: userId,
      message: `[${kind}] ${module}/${itemId} ${String(note || '').slice(0, 200)}`.slice(0, 500),
      source: 'item_feedback',
      route: String(location.hash || '/').slice(0, 200),
      user_agent: String(navigator.userAgent || '').slice(0, 300),
    });
  } catch (err) {
    // משוב שלא נשלח הוא לא תקלה שהתלמיד צריך לראות.
    console.warn('itemFeedback:', err?.message || err);
  }
}
