/**
 * src/lib/push.js — התראה יומית אחת, אם הלומד ביקש אותה.
 *
 * נבנה 6.9.2026 אחרי האבחון (claude/DIAGNOSIS_retention_2026-09-06.md):
 * ארבעה תלמידים נרשמו, אפס חזרו ליום שני — כי לא היה במוצר שום דבר
 * שקורא להם בחזרה. זה הדבר החסר.
 *
 * שלושה כללים שנגזרים מכלל הרווחה, ולא לשנות בלי החלטה מפורשת:
 *   1. לא מבקשים רשות בטעינת הדף. מבקשים רק אחרי שהלומד סיים מנה —
 *      כלומר אחרי שהוא כבר יודע מה הוא מרוויח. דפדפנים גם חוסמים
 *      בקשות שלא נובעות מלחיצה, אז זה גם הכרח טכני.
 *   2. שואלים פעם אחת. "לא עכשיו" נשמר ולא נשאל שוב במשך 30 יום.
 *      סירוב מוחלט (denied) — לא נשאל לעולם, אין דרך חזרה בדפדפן.
 *   3. תוכן ההתראה אומר מה מחכה ("14 מילים לחזרה"), לעולם לא מה הפסדת.
 *      אין רצף בסכנה, אין "פספסת אתמול".
 *
 * באייפון זה עובד רק אחרי "הוסף למסך הבית" (iOS 16.4+) — לכן כשאנחנו
 * ב-Safari רגיל אנחנו מפנים ל-#/install במקום לבקש רשות שתיכשל.
 */
import { supabase } from '../supabase.js'
import { saveSubscription, revokeSubscription } from '../data/push.data.js'
import { isStandalone, platform } from './installCard.js'

const VAPID_PUBLIC = 'BNaOIwXFH_hA9kHHsuLVr289KPSgzVx6NjYrOhSjdZ6hwQszrLbpZKVP3-5Vjg4NLH94s6brEIisay-aBnIKa3M'
const SNOOZE_KEY = 'hs:push:snoozed'
const SNOOZE_DAYS = 30

function b64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function permission() {
  if (!pushSupported()) return 'unsupported'
  try { return Notification.permission } catch { return 'unsupported' }
}

function snoozed() {
  try {
    const t = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    return t && Date.now() - t < SNOOZE_DAYS * 86400000
  } catch { return false }
}
export function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch { /* noop */ }
}

/**
 * האם להציע עכשיו? רק אם: נתמך, עוד לא הוחלט, לא נדחה לאחרונה,
 * ובאייפון — רק כשכבר רצים כאפליקציה (אחרת הבקשה נכשלת בשקט).
 */
export function shouldOffer() {
  if (!pushSupported() || snoozed()) return false
  if (permission() !== 'default') return false
  if (platform() === 'ios' && !isStandalone()) return false
  return true
}

/** באייפון שלא הותקן — אין טעם לבקש; מפנים להתקנה. */
export function needsInstallFirst() {
  return platform() === 'ios' && !isStandalone() && pushSupported()
}

/**
 * מבקש רשות ונרשם. חייב להיקרא מתוך מטפל לחיצה.
 * @returns {Promise<'granted'|'denied'|'error'|'unsupported'>}
 */
export async function enablePush() {
  if (!pushSupported()) return 'unsupported'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { if (perm === 'default') snooze(); return perm === 'denied' ? 'denied' : 'error' }

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(VAPID_PUBLIC),
    })

    const { data } = await supabase.auth.getSession()
    const userId = data?.session?.user?.id
    if (!userId) return 'error'          // מנוי בלי בעלים חסר טעם

    const { error } = await saveSubscription(userId, sub)
    return error ? 'error' : 'granted'
  } catch (err) {
    console.warn('push.enablePush:', err)
    return 'error'
  }
}

/** כיבוי מתוך ההגדרות. */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    await revokeSubscription(sub.endpoint)
    await sub.unsubscribe()
    return true
  } catch (err) {
    console.warn('push.disablePush:', err)
    return false
  }
}
