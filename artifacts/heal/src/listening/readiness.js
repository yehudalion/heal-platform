/**
 * Listening — Learn layer (שכבת הלמידה)
 *
 * REWRITTEN 2026-08-14 per SITEMAP §3 ("למידה | לקח אחד: לאן הקטע הולך ומתי
 * הוא משנה כיוון | listening/readiness.js | חלקי — דורש שכתוב").
 * The old content of this file was an M6 readiness-score computation that
 * queried tables that do not exist (listening_responses / listening_items /
 * listening_user_state) — it could never run, and the readiness-score feature
 * has no owner in the map. Removed entirely.
 *
 * The lesson is ONE lesson (Lion, 2026-08-14: teaching passage types
 * complicates — the student doesn't know which passage he'll get):
 * a passage goes somewhere, and connective words signal when it changes
 * direction. This is also where the highlighted-connective feature lives
 * (Lion: "שיהיה מודגש בו מילת הקישור הרלוונטית… אולי לרן").
 *
 * Static content — no DB reads. UI Hebrew/RTL, examples English.
 */
import { navigate } from '../router.js';
import './dashboard.css';

export function renderListeningLearn(root) {
  root.className = 'ldash-wrap';
  root.innerHTML = `
    <div class="ldash-body" style="gap:20px;">

      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn-ldash-link" id="btn-back" style="padding:6px 12px;">→ חזרה</button>
        <h1 class="ldash-title" style="margin:0;">איך מקשיבים נכון 🎧</h1>
      </div>

      <!-- ── The one lesson ── -->
      <div class="ldash-main" style="text-align:right;">
        <p class="ldash-main-title" style="margin-bottom:8px;">הלקח האחד של הפינה</p>
        <p style="margin:0;line-height:1.7;">
          כל קטע במבחן <strong>הולך לאנשהו</strong> — הוא מציג רעיון, ולפעמים
          משנה כיוון באמצע. מי ששומע <strong>לאן הקטע הולך</strong> עונה נכון גם
          כשלא הבין כל מילה. מי שנאחז במילים בודדות — נופל בדיוק במקום שבו
          הקטע שינה כיוון.
        </p>
      </div>

      <!-- ── Direction words ── -->
      <div class="ldash-main" style="text-align:right;">
        <p class="ldash-main-title" style="margin-bottom:8px;">למה לשים לב: מילות הכיוון</p>
        <p style="margin:0 0 10px;line-height:1.7;">
          מילים כמו אלה הן רמזור. כששומעים אותן — הקטע מודיע מה יקרה עכשיו:
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:.92rem;">
          <div><span dir="ltr" style="font-weight:700;color:var(--green,#4CAF6F);">however · but · even so</span> — שינוי כיוון: מה שנאמר עד עכשיו מקבל "אבל"</div>
          <div><span dir="ltr" style="font-weight:700;color:var(--green,#4CAF6F);">therefore · as a result</span> — מסקנה: עכשיו יגיע "ולכן…"</div>
          <div><span dir="ltr" style="font-weight:700;color:var(--green,#4CAF6F);">for example · for one thing</span> — פירוט: דוגמה לרעיון שכבר נאמר</div>
          <div><span dir="ltr" style="font-weight:700;color:var(--green,#4CAF6F);">in other words</span> — ניסוח מחדש: אותו רעיון במילים אחרות</div>
        </div>
      </div>

      <!-- ── Worked example with the connective highlighted ── -->
      <div class="ldash-main" style="text-align:right;">
        <p class="ldash-main-title" style="margin-bottom:8px;">דוגמה — שימו לב למילה המודגשת</p>
        <p dir="ltr" style="margin:0 0 12px;text-align:left;line-height:1.8;font-size:.95rem;background:var(--bg,#F4F8F5);border-radius:10px;padding:12px 14px;">
          Ancient Roman soldiers were paid an allowance to buy salt, called a
          "salarium."
          <mark style="background:#FFE9A8;border-radius:4px;padding:0 4px;font-weight:700;">Over time, however,</mark>
          the word came to refer to payment in general, not just for salt.
        </p>
        <p style="margin:0;line-height:1.7;">
          עד המילה המודגשת הקטע דיבר על <strong>מלח</strong>. המילה
          <span dir="ltr" style="font-weight:700;">however</span> מודיעה: הכיוון משתנה —
          ומכאן הקטע כבר מדבר על <strong>משכורת באופן כללי</strong>.
          שאלה שתגיע על הקטע הזה תיבדק בדיוק כאן: האם שמעת את שינוי הכיוון,
          או נשארת אצל המלח.
        </p>
      </div>

      <!-- ── What the exercise looks like ── -->
      <div class="ldash-main" style="text-align:right;">
        <p class="ldash-main-title" style="margin-bottom:8px;">איך נראה התרגול</p>
        <p style="margin:0;line-height:1.7;">
          כל קטע מושמע <strong>פעם אחת</strong>, כמו במבחן. אחריו שאלה (או שתיים)
          עם 4 תשובות. אחרי כל תשובה תקבל הסבר מלא — כולל ציטוט מילת הכיוון
          מהקטע, כדי שתדע <strong>איך יכולת לדעת</strong>.
        </p>
      </div>

      <div class="ldash-main" style="align-items:center;">
        <button class="btn-ldash-primary" id="btn-practice" style="max-width:280px;">
          לתרגול ←
        </button>
      </div>

    </div>`;

  root.querySelector('#btn-back').addEventListener('click', () => navigate('/listening'));
  root.querySelector('#btn-practice').addEventListener('click', () => navigate('/listening/session'));
}
