/**
 * src/data/waitlist.data.js — the only module that writes waitlist_signups.
 *
 * Built 2026-08-25 (audit item 4): the paid plan is not live yet, so instead of
 * a payment button that does nothing, /progress collects an email and a promise
 * of a launch price. This is the product's own signup data — deliberately NOT
 * an analytics event (analytics stores no PII; a waitlist is nothing but PII).
 *
 * A duplicate email is a SUCCESS from the learner's point of view ("you're
 * already on the list"), so 23505 unique-violation is mapped to ok+already.
 */

import { supabase, getCurrentSession } from '../supabase.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * @param {string} email
 * @param {string} [source]  where the form lives, e.g. 'progress'
 * @returns {Promise<{ok:boolean, already?:boolean, invalid?:boolean}>}
 */
export async function joinWaitlist(email, source = null) {
  const clean = String(email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(clean)) return { ok: false, invalid: true }
  if (!supabase) return { ok: false }

  let userId = null
  try {
    const session = await getCurrentSession()
    userId = session?.user?.id ?? null
  } catch { userId = null }

  const { error } = await supabase.from('waitlist_signups').insert({
    email: clean, source, user_id: userId,
  })
  if (!error) return { ok: true }
  if (error.code === '23505') return { ok: true, already: true }
  console.debug('waitlist.data.joinWaitlist:', error.message)
  return { ok: false }
}
