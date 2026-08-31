/**
 * src/lib/learner.js — who is practising right now, without walling them out.
 *
 * Built 2026-08-31 (product/UX chat), implementing PLAN_guest_mode_and_payments.md §1.
 *
 * Every practice screen used to repeat the same block: fetch the session, and
 * if there was no userId, show a wall BEFORE the learner ever saw a question.
 * But the data layer never actually needed an account to serve content —
 * fetchPracticeQuestions, getLectures and getWordsByImpact all work with no
 * userId. The wall was a side effect of the write paths (rateWord, logAttempt,
 * startSession...) leaking into the read path, not a real product decision.
 *
 * getLearner() replaces that repeated block. A screen calls it once, gets
 * back { id, isGuest }, and keeps going either way — no branch, no wall.
 * Writes guard themselves (see the data-layer functions this touches: a null
 * userId is a safe no-op there, never an error) instead of the screen
 * blocking entry to protect them.
 */
import { getCurrentSession } from '../supabase.js';

/**
 * @returns {Promise<{ id: string|null, isGuest: boolean }>}
 */
export async function getLearner() {
  const session = await getCurrentSession();
  const id = session?.user?.id ?? null;
  return { id, isGuest: !id };
}

// ─── Guest-only local history ──────────────────────────────────────────────
// A signed-in learner's "don't repeat this" list lives in the DB (progress,
// attempts, srs_progress). A guest has none of that, so without this a
// returning guest would see the exact same pack every visit. This is the
// guest's own substitute: item ids they've already seen, kept in their own
// browser only, capped so it never grows unbounded. It is scoped per module
// (vocab/rephrase/sc/listening each get their own key) and is NEVER read for
// a signed-in learner — their real history already does this job properly.
const SEEN_PREFIX = 'hs:guest:seen:';
const MAX_SEEN = 300;

/** @param {string} moduleKey e.g. 'rephrase', 'sc', 'listening' */
export function getGuestSeenIds(moduleKey) {
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + moduleKey);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/** @param {string} moduleKey  @param {Array<string|number>} ids */
export function addGuestSeenIds(moduleKey, ids) {
  if (!ids?.length) return;
  try {
    const merged = [...getGuestSeenIds(moduleKey), ...ids];
    // Keep only the most recent MAX_SEEN — old entries age out rather than
    // growing forever in localStorage.
    localStorage.setItem(SEEN_PREFIX + moduleKey, JSON.stringify(merged.slice(-MAX_SEEN)));
  } catch (_) {
    // localStorage full or unavailable (private browsing, quota) — worst case
    // the guest sees a repeat sooner than ideal. Never worth breaking practice over.
  }
}
