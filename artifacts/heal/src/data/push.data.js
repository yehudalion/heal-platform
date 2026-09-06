/**
 * src/data/push.data.js — שכבת הנתונים של מנויי ההתראות.
 *
 * מסכים לא נוגעים ב-Supabase ישירות (כלל הארכיטקטורה); כל מה שקשור
 * ל-push_subscriptions עובר דרך כאן. השמירה היא upsert לפי endpoint —
 * המפתח שהדפדפן מנפיק — כדי שהרשמה חוזרת מאותו מכשיר תעדכן ולא תכפיל.
 */
import { supabase } from '../supabase.js'

/** @returns {Promise<{error: any}>} */
export async function saveSubscription(userId, subscription) {
  if (!userId || !subscription) return { error: new Error('missing args') }
  const j = subscription.toJSON ? subscription.toJSON() : subscription
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: j.endpoint,
    p256dh: j.keys?.p256dh ?? '',
    auth: j.keys?.auth ?? '',
    user_agent: (navigator.userAgent || '').slice(0, 300),
    revoked_at: null,
    failure_count: 0,
    last_error: null,
  }, { onConflict: 'endpoint' })
  if (error) console.warn('push.data.saveSubscription:', error)
  return { error }
}

/** נקרא כשהלומד מכבה התראות. מסמן, לא מוחק — כדי לדעת שזה קרה. */
export async function revokeSubscription(endpoint) {
  if (!endpoint) return { error: null }
  const { error } = await supabase.from('push_subscriptions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('endpoint', endpoint)
  if (error) console.warn('push.data.revokeSubscription:', error)
  return { error }
}
