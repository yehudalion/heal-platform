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
