import { supabase } from '../supabase.js'

// Free tier: top 200 words by impact_percentile
const FREE_TIER_PERCENTILE_CUTOFF = 64

/**
 * Get words ordered by impact_score (highest first).
 * Respects free tier gate if isPremium is false.
 * @param {{ limit?: number, offset?: number, isPremium?: boolean }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getWordsByImpact({ limit = 20, offset = 0, isPremium = false } = {}) {
  try {
    let query = supabase
      .from('words')
      .select('id, headword, definition_he, surface_1, mnemonic, mnemonic_2, mnemonic_3, audio_word_url, audio_sentence_url, impact_score, impact_percentile')
      // Unvalidated words (impact_score IS NULL, e.g. the missing-words batch
      // pending review) must never surface via importance ranking, regardless
      // of tier. NULLS FIRST is Postgres' default on DESC, so without this
      // filter they would outrank every real word. (Lion + Cowork, 2026-08-26)
      .not('impact_score', 'is', null)
      .order('impact_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!isPremium) {
      query = query.gte('impact_percentile', FREE_TIER_PERCENTILE_CUTOFF)
    }

    const { data, error } = await query
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('words.data.getWordsByImpact:', error)
    return { data: null, error }
  }
}

/**
 * Get a single word by ID.
 * @param {string} wordId
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getWordById(wordId) {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('id', wordId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('words.data.getWordById:', error)
    return { data: null, error }
  }
}

/**
 * Search words by headword or definition.
 * @param {string} query
 * @param {{ isPremium?: boolean }} options
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function searchWords(query, { isPremium = false } = {}) {
  try {
    let dbQuery = supabase
      .from('words')
      .select('id, headword, definition_he, impact_percentile')
      .or(`headword.ilike.%${query}%,definition_he.ilike.%${query}%`)
      // Same reason as getWordsByImpact above — exclude unvalidated words.
      .not('impact_score', 'is', null)
      .order('impact_score', { ascending: false })
      .limit(20)

    if (!isPremium) {
      dbQuery = dbQuery.gte('impact_percentile', FREE_TIER_PERCENTILE_CUTOFF)
    }

    const { data, error } = await dbQuery
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('words.data.searchWords:', error)
    return { data: null, error }
  }
}

/**
 * Dictionary/browse — list or search ALL words with real content, regardless
 * of impact_score. Deliberately separate from getWordsByImpact/searchWords
 * above: those exclude unscored words on purpose, because impact_score is
 * the project's one algorithmic driver for practice/SRS selection (never
 * mix ranking logic with a plain reference tool). This is what surfaces the
 * 2,116 'pending_review' words that already have full content (definition,
 * audio, examples, mnemonics) but no impact_score yet — see
 * PLAN_depth_and_new_corners.md. Free for all users (no isPremium gate) per
 * PLAN_levels_analytics_corners.md's monetization table — the dictionary is
 * one of the free, always-open habit-builders.
 * (מוצר/UX chat, 2026-08-29)
 */
export async function browseDictionary({ query = '', limit = 40, offset = 0 } = {}) {
  try {
    let q = supabase
      .from('words')
      .select('id, headword, definition_he, definition, surface_1, mnemonic, mnemonic_2, mnemonic_3, audio_word_url, audio_sentence_url, pos')
      .in('status', ['done', 'pending_review'])
      .order('headword', { ascending: true })
      .range(offset, offset + limit - 1)
    const trimmed = query.trim()
    if (trimmed) {
      q = q.or(`headword.ilike.%${trimmed}%,definition_he.ilike.%${trimmed}%,definition.ilike.%${trimmed}%`)
    }
    const { data, error } = await q
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('words.data.browseDictionary:', error)
    return { data: null, error }
  }
}

/**
 * Total dictionary size (done + pending_review) — a real DB count, not a
 * hardcoded number, so the figure shown to students never goes stale as
 * content is added ("no invented numbers" rule).
 */
export async function getDictionaryCount() {
  try {
    const { count, error } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .in('status', ['done', 'pending_review'])
    if (error) throw error
    return { count: count ?? 0, error: null }
  } catch (error) {
    console.error('words.data.getDictionaryCount:', error)
    return { count: 0, error }
  }
}
