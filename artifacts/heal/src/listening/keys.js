/**
 * listening/keys.js — the single fail_mode → student-language map.
 *
 * Dual-labeling rule (SITEMAP §2): the DB stores the exact raw tag
 * (`fail_mode` inside listening_questions.options); the code maps it to
 * student language. Changing student wording = editing THIS file only.
 *
 * Label vocabulary for the listening module is ONE label — "כיוון" (SITEMAP §3):
 * Learn teaches direction, Practice explains every mistake in direction terms,
 * Analyze summarizes direction. The per-mode texts below are the Practice-layer
 * explanations; DIRECTION_MODES marks which raw modes the Analyze layer counts
 * as direction-related.
 *
 * Hard Rule #8: never "מלכודת" — always "מפתח" / "למה לשים לב".
 * Wellbeing rule: descriptive session language only ("בסשן הזה…"), never
 * "אתה נוטה…" (SITEMAP §2, descriptive-phrasing rule 2026-08-04).
 */

// ─── Per-mode student-facing descriptions (Practice feedback) ─────────────────
export const KEY_LABELS = {
  // continuation
  anchor_lost:    'התרחקות מהעוגן — התשובה חורגת ממה שהקטע בפועל אמר',
  wrong_slot:     'לא עונה בדיוק על מה שהקטע ביקש בנקודה הזו',
  unsupported:    'מידע שלא נתמך בקטע',

  // lecture_qa — main_idea (pivot-based / descriptive)
  pre_pivot:      'נשען על מה שנאמר לפני שינוי הכיוון — הקטע המשיך הלאה',
  post_pivot:     'נאחז בפרט אחד שאחרי שינוי הכיוון במקום בתמונה המלאה',
  topic_noun:     'חוזר על נושא הקטע בלי לומר מה באמת נאמר עליו',
  over_specific:  'צר מדי — פרט אחד מתוך הקטע במקום הרעיון כולו',

  // lecture_qa — detail / speaker_ref / opinion
  true_not_asked: 'נכון לפי הקטע — אבל לא עונה על מה שנשאל',
  reversed:       'הופך את הכיוון של מה שנאמר בקטע',
  anchor_swap:    'מייחס פרט נכון לדובר או לגורם הלא-נכון',

  // lecture_qa — negative questions
  true_stated:    'דווקא כן נאמר בקטע — והשאלה ביקשה את מה שלא נאמר',

  // lecture_qa — vocab_in_context
  wrong_sense:    'משמעות מילונית נכונה של המילה — אבל לא במובן שבו שימשה כאן',
};

// ─── Which raw modes the Analyze layer counts as "direction" ──────────────────
export const DIRECTION_MODES = new Set(['pre_pivot', 'post_pivot', 'reversed']);

/** Practice-layer label for one mode (falls back to the raw code, flagged). */
export function keyLabel(failMode) {
  return KEY_LABELS[failMode] || failMode || '';
}

/**
 * Analyze-layer session summary — DESCRIPTIVE, about the session, never the
 * student. Input: array of raw fail_mode strings of the wrong answers chosen.
 * Returns { headline, details[] } in student language.
 */
export function summarizeMistakes(failModes) {
  const modes = (failModes || []).filter(Boolean);
  if (modes.length === 0) {
    return { headline: 'בסשן הזה לא נרשמו טעויות — כל התשובות היו נכונות.', details: [] };
  }

  const directionCount = modes.filter(m => DIRECTION_MODES.has(m)).length;

  // Count per mode for the detail list
  const counts = {};
  for (const m of modes) counts[m] = (counts[m] || 0) + 1;
  const details = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, n]) => ({ mode, n, label: keyLabel(mode) }));

  let headline;
  if (directionCount === modes.length) {
    headline = 'בסשן הזה כל הטעויות היו סביב שינוי כיוון בקטע.';
  } else if (directionCount > 0) {
    headline = `בסשן הזה ${directionCount} מתוך ${modes.length} הטעויות היו סביב שינוי כיוון בקטע.`;
  } else {
    headline = 'בסשן הזה הטעויות לא היו סביב שינוי כיוון — הפירוט למטה מראה סביב מה הן כן היו.';
  }

  return { headline, details };
}
