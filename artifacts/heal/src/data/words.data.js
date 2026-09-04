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

// הוסרו 4.9.2026: getWordById ו-searchWords. שתיהן לא נקראו מאף מקום
// באפליקציה, ו-searchWords הייתה מלכודת ממש מהסוג שההערה ב-supabase.js
// מתארת — פונקציית חיפוש שנראית סבירה, יושבת ליד פונקציות בשימוש, ומחילה
// בשקט את התקרה החינמית ואת סינון impact_score. החיפוש החי במילון הוא
// browseDictionary למטה, שמחפש בכל 2,857 המילים בלי סינון דירוג.

/**
 * Dictionary/browse — list or search ALL words with real content, regardless
 * of impact_score. Deliberately separate from getWordsByImpact
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

/**
 * Number of ranked ("core") words — those with an impact_score, i.e. the pool
 * the spaced-repetition loop draws from. Same reason as getDictionaryCount:
 * the כרטיסיות screen used to print a hardcoded 550, which was already off by
 * seven and became badly wrong when vocabulary stage C added 280 ranked words
 * on 4.9.2026. Counted live so it can never go stale again.
 */
export async function getCoreWordCount() {
  try {
    const { count, error } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .not('impact_score', 'is', null)
    if (error) throw error
    return { count: count ?? 0, error: null }
  } catch (error) {
    console.error('words.data.getCoreWordCount:', error)
    return { count: 0, error }
  }
}

/**
 * קיר המילים: כל מילות הליבה (אלה עם impact_score) יחד עם מצב ה-SRS של הלומד.
 *
 * למה שאילתה נפרדת ולא שימוש ב-getCoverage: coverage מחזיר מספרים מצטברים
 * ("47 מתוך 550"), וקיר המילים צריך את הרשימה עצמה כדי לצייר משבצת לכל מילה.
 * מספר מספר לתלמיד כמה הוא יודע; קיר מראה לו את זה.
 *
 * שתי שאילתות ולא join: הרשאות ה-RLS על srs_progress הן פר-משתמש ועל words
 * ציבוריות, והאיחוד בצד הלקוח פשוט יותר מלהילחם ב-PostgREST על embed.
 *
 * @param {string|null} userId
 * @returns {Promise<{data:{words:Array,counts:object}|null,error:Error|null}>}
 */
export async function getWordWall(userId) {
  try {
    const [wordsRes, srsRes] = await Promise.all([
      supabase
        .from('words')
        .select('id, headword, definition_he, impact_score')
        .not('impact_score', 'is', null)
        .order('impact_score', { ascending: false })
        .limit(1000),
      userId
        ? supabase.from('srs_progress').select('word_id, state, reps').eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (wordsRes.error) throw wordsRes.error
    if (srsRes.error) throw srsRes.error

    const byId = new Map((srsRes.data || []).map((r) => [r.word_id, r]))
    const counts = { total: 0, known: 0, learning: 0, fresh: 0 }

    const words = (wordsRes.data || []).map((w) => {
      const p = byId.get(w.id)
      // שלוש מדרגות בלבד. דירוג עדין יותר היה מדויק יותר ופחות קריא —
      // הקיר נועד להראות תמונה במבט אחד, לא להיות דוח.
      let state = 'fresh'
      if (p) state = (p.state === 'review' || (p.reps || 0) >= 3) ? 'known' : 'learning'
      counts.total += 1
      counts[state] += 1
      return { id: w.id, word: w.headword, he: w.definition_he, state }
    })

    return { data: { words, counts }, error: null }
  } catch (err) {
    console.warn('words.getWordWall:', err?.message || err)
    return { data: null, error: err }
  }
}
