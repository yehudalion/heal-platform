/**
 * src/screens/practice.js — /practice: הטאב "תרגול" בסרגל התחתון של המובייל.
 *
 * למה (סשן שבת 1, 5.9.2026): במובייל אין סרגל צדדי, ורשת הפינות הייתה רק
 * במסך הבית — כלומר מהאזנה אי אפשר היה להגיע להבנת הנקרא בלי לחזור הביתה.
 * המסך הזה הוא אותה רשת בדיוק (corners.js), נגישה מכל מסך בלחיצה אחת.
 * בדסקטופ הוא מיותר ולא מופיע בסרגל הצדדי — שם יש את הפינות עצמן.
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { loadCornerState, cornersGridHtml, wireCorners } from './corners.js';

export async function renderPractice(root) {
  await renderLayout(root, '/practice');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  const corners = await loadCornerState(userId);

  el.innerHTML = `
    <div class="fade-in home2">
      <div class="page-title">תרגול</div>
      <div class="page-sub">בוחרים פינה ומתחילים. המספרים מתעדכנים אחרי כל מנה.</div>
      ${cornersGridHtml(corners)}
    </div>`;

  el.querySelectorAll('[data-nav]').forEach((t) => {
    t.addEventListener('click', () => navigate(t.dataset.nav));
  });
  wireCorners(el);
}
