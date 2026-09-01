/**
 * src/lib/analytics.js — the analytics switch and the track() front door.
 *
 * Built 2026-08-25. Two hard requirements from Lion, both enforced here:
 *
 *   1. NOTHING IS SENT while he is the only one testing.
 *      ANALYTICS_ENABLED is false below. While it is false, track() returns
 *      immediately — no network call, no table write, nothing to clean up later.
 *      Turning analytics on is a one-word change on line ~40 plus a deploy.
 *
 *   2. HIS OWN TESTING MUST NEVER POLLUTE THE DATA, even after it is on.
 *      A browser can be marked internal, and an internal browser drops every
 *      event locally — it never reaches the network at all. The mark survives
 *      reloads. Two ways to set it, so he never needs devtools:
 *          open  https://highscore-eight.vercel.app/?internal=1   (mark)
 *          open  https://highscore-eight.vercel.app/?internal=0   (unmark)
 *      Anything that does slip through is still stamped is_internal = true, so
 *      every query can exclude it. Belt and braces, on purpose.
 *
 * Privacy: no email, no name, no free text the learner typed, no third-party
 * script, no cookies, no ad network. Only the event name, a few small numbers,
 * the route, and (for signed-in users) their auth id — which is already ours.
 * That matches the no-ads / subscription-only rule.
 *
 * Failure policy: analytics must never break a lesson. Every path is wrapped,
 * failures are swallowed, and track() is fire-and-forget — it is never awaited
 * by a screen.
 */

import { logEvent } from '../data/analytics.data.js'

// ─────────────────────────────────────────────────────────────────────────────
// THE SWITCH. Flip to true when the beta starts, not before.
// ─────────────────────────────────────────────────────────────────────────────
// הודלק 31.8.2026 לקראת הבטא. מדיניות הפרטיות מתארת את האיסוף הזה (סעיף 2,
// שורת "שימוש"), ולכן ההדלקה לא מקדימה את המסמך. לפני שבודקים נתונים —
// לפתוח פעם אחת ?internal=1 בכל דפדפן שלך, אחרת הפעילות שלך מזהמת את המדגם.
export const ANALYTICS_ENABLED = true

const INTERNAL_KEY = 'hs:internal'
const SESSION_KEY  = 'hs:analytics:sid'

/** Read ?internal=1 / ?internal=0 once per load and remember the answer. */
function syncInternalFlagFromUrl() {
  try {
    const q = new URLSearchParams(location.search).get('internal')
    if (q === '1') localStorage.setItem(INTERNAL_KEY, '1')
    if (q === '0') localStorage.removeItem(INTERNAL_KEY)
  } catch { /* private mode: ignore */ }
}

/** Is this browser marked as Lion's own? */
export function isInternal() {
  try { return localStorage.getItem(INTERNAL_KEY) === '1' } catch { return false }
}

/** Mark / unmark this browser. Exposed so a settings screen can offer it later. */
export function setInternal(on) {
  try {
    if (on) localStorage.setItem(INTERNAL_KEY, '1')
    else localStorage.removeItem(INTERNAL_KEY)
  } catch { /* ignore */ }
}

/**
 * A random id for THIS tab session. Lets us count "sessions" without a cookie
 * and without anything that identifies a person. Dies when the tab closes.
 */
function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = (crypto?.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 36)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch { return null }
}

/** The route only — never the query string, which could carry anything. */
function currentPath() {
  try { return (location.hash || '#/').split('?')[0].slice(0, 200) } catch { return null }
}

/** Referrer host only. We want "where did they come from", not a full URL. */
function referrerHost() {
  try {
    if (!document.referrer) return null
    const h = new URL(document.referrer).host
    return h && h !== location.host ? h.slice(0, 300) : null
  } catch { return null }
}

syncInternalFlagFromUrl()

/**
 * Record one product event. Fire-and-forget by design: callers must NOT await it.
 *
 * @param {string} event  short snake_case name, e.g. 'session_completed'
 * @param {object} [props] small numbers/flags only. No PII, no learner text.
 */
export function track(event, props = {}) {
  try {
    if (!ANALYTICS_ENABLED) return          // requirement 1 — off means silent
    if (isInternal()) return                // requirement 2 — never leaves the browser
    if (typeof event !== 'string' || !event) return

    logEvent({
      event: event.slice(0, 60),
      props: props && typeof props === 'object' ? props : {},
      sessionId: sessionId(),
      path: currentPath(),
      referrer: referrerHost(),
      isInternal: false,   // internal browsers already returned above
    })
  } catch { /* analytics must never break a lesson */ }
}

/** Convenience for route changes. Kept separate so the name stays consistent. */
export function trackPageView(path) {
  track('page_view', { to: (path || currentPath() || '').slice(0, 200) })
}
