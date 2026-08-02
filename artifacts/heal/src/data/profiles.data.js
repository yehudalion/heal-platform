import { supabase } from '../supabase.js'

/**
 * Get a user's profile.
 * @param {string} userId - auth.users UUID
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('profiles.data.getProfile:', error)
    return { data: null, error }
  }
}

/**
 * Upsert (create or update) a user's profile.
 * @param {string} userId
 * @param {object} fields - any subset of user_profiles columns
 * @returns {{ data: object|null, error: object|null }}
 */
export async function upsertProfile(userId, fields) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('profiles.data.upsertProfile:', error)
    return { data: null, error }
  }
}

/**
 * Save onboarding answers and mark onboarding complete.
 * @param {string} userId
 * @param {{ exam_date, target_score, current_level, daily_time_minutes, has_prev_exam, prev_exam_score }} answers
 * @returns {{ data: object|null, error: object|null }}
 */
export async function completeOnboarding(userId, answers) {
  return upsertProfile(userId, { ...answers, onboarding_complete: true })
}

/**
 * Update streak and last_active. Called at session start.
 * @param {string} userId
 * @returns {{ data: object|null, error: object|null }}
 */
export async function touchLastActive(userId) {
  return upsertProfile(userId, { last_active: new Date().toISOString() })
}
