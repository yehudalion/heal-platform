/**
 * src/data/analytics.data.js — the ONLY module that writes analytics_events.
 *
 * Exists so lib/analytics.js and the screens never touch Supabase directly
 * (ARCHITECTURE §2.11, the data-layer separation rule).
 *
 * Three properties this module guarantees:
 *   - it never throws, so a failed insert can never break a lesson;
 *   - it never blocks, so a slow network can never delay a screen;
 *   - it never sends PII. Only the fields listed in the insert below are sent.
 *
 * is_internal arrives as part of the payload rather than being read from
 * lib/analytics.js, so these two modules do not import each other. (They did
 * briefly; ES modules tolerate the cycle because both sides are hoisted function
 * declarations, but it is a needless trap for the next person.) lib/analytics.js
 * already drops internal events before they get here — this column is the second
 * line of defence, not the first.
 */

import { supabase } from '../supabase.js'
import { getCurrentSession } from '../supabase.js'   // auth only

/**
 * Insert one event. Fire-and-forget: returns a promise the caller ignores.
 * @param {{event:string, props?:object, sessionId?:string|null, path?:string|null, referrer?:string|null, isInternal?:boolean}} e
 */
export async function logEvent(e) {
  try {
    if (!supabase) return

    // A guest has no user_id; RLS requires it to be null for the anon role.
    let userId = null
    try {
      const session = await getCurrentSession()
      userId = session?.user?.id ?? null
    } catch { userId = null }

    const { error } = await supabase.from('analytics_events').insert({
      event:       e.event,
      props:       e.props ?? {},
      user_id:     userId,
      session_id:  e.sessionId ?? null,
      path:        e.path ?? null,
      referrer:    e.referrer ?? null,
      is_internal: e.isInternal === true,
    })

    // Deliberately not rethrown and not surfaced to the learner. A dropped
    // analytics row is an acceptable loss; an interrupted lesson is not.
    if (error) console.debug('analytics.data.logEvent:', error.message)
  } catch (err) {
    console.debug('analytics.data.logEvent:', err?.message ?? err)
  }
}
