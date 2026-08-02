import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || 'https://opjtromnkdgehlqeaqzi.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wanRyb21ua2RnZWhscWVhcXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzU1NzksImV4cCI6MjA5MjgxMTU3OX0.o0Sz1P5Nvw8xDCi2YbcVCLHo5VQvgfaySBMVuDhSQ-A';

export const isSupabaseConfigured = true;

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    })
  : null;

// ─── Storage keys ────────────────────────────────────────────────────────────
const GUEST_KEY         = "heal:guest";
const GUEST_RATINGS_KEY = "heal:guest:ratings";
const LEVEL_KEY         = "heal:level";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export function setGuest(on) {
  on ? localStorage.setItem(GUEST_KEY, "1") : localStorage.removeItem(GUEST_KEY);
}
export function isGuest() {
  return localStorage.getItem(GUEST_KEY) === "1";
}
export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  setGuest(false);
  localStorage.removeItem(GUEST_RATINGS_KEY);
}

// ─── Ratings ──────────────────────────────────────────────────────────────────
export async function recordRating(wordId, rating) {
  if (isGuest() || !supabase) {
    const all = JSON.parse(localStorage.getItem(GUEST_RATINGS_KEY) || "{}");
    all[wordId] = { rating, at: Date.now() };
    localStorage.setItem(GUEST_RATINGS_KEY, JSON.stringify(all));
    return { ok: true };
  }
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Not signed in" };
  const { error } = await supabase.from("ratings").upsert(
    { user_id: session.user.id, word_id: wordId, rating },
    { onConflict: "user_id,word_id" }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getAllRatings() {
  if (isGuest() || !supabase) {
    const all = JSON.parse(localStorage.getItem(GUEST_RATINGS_KEY) || "{}");
    return Object.entries(all).map(([word_id, v]) => ({ word_id, rating: v.rating }));
  }
  const session = await getCurrentSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("ratings")
    .select("word_id, rating")
    .eq("user_id", session.user.id);
  return error ? [] : (data || []);
}

// ─── Local words fallback (words.json) ───────────────────────────────────────
// Used when Supabase words table is empty or unavailable.
// Maps local schema → Supabase schema so normaliseRows works on both.
async function getLocalWords() {
  const { default: raw } = await import('./data/words.json', { with: { type: 'json' } }).catch(
    () => import('./data/words.json')
  );
  return raw.map((w, i) => ({
    id:                 w.id,
    headword:           w.headword,
    pos:                w.pos || '',
    tier:               w.level === 'advanced' ? 'A' : w.level === 'intermediate' ? 'B' : 'C',
    impact_score:       String((1.0 - i * 0.01).toFixed(2)),
    definition:         w.definition || '',
    definition_he:      '',
    sentence:           w.sentence || '',
    sentence_he:        '',
    mnemonic:           null,
    mnemonic_2:         null,
    mnemonic_3:         null,
    audio_word_url:     w.audio_url || null,
    // Reuse word audio for sentence panel until real sentence audio is available
    audio_sentence_url: w.audio_url || null,
  }));
}

// ─── Words — all columns restored ────────────────────────────────────────────
export async function getWords() {
  if (!supabase) return getLocalWords();
  const { data, error } = await supabase
    .from("words")
    .select(
      "id, headword, tier, impact_score, pos, " +
      "definition, definition_he, " +
      "surface_1, " +
      "mnemonic, mnemonic_2, mnemonic_3, " +
      "audio_word_url, audio_sentence_url"
    )
    .in("tier", ["gold", "silver"])
    .order("impact_score", { ascending: false });
  const result = error ? [] : (data || []);
  // If Supabase table is empty, fall back to local words
  return result.length > 0 ? result : getLocalWords();
}

// ─── SRS helpers ──────────────────────────────────────────────────────────────
// Returns words due for review today, topped up with new words to reach `limit`
export async function getDueWords(limit = 20) {
  if (!supabase) return [];
  const session = await getCurrentSession();
  if (!session && !isGuest()) return [];

  const now = new Date().toISOString();

  if (!isGuest() && session) {
    // Due reviews first
    const { data: due } = await supabase
      .from("words")
      .select(
        "id, headword, tier, impact_score, pos, " +
        "definition, definition_he, " +
        "surface_1, " +
        "mnemonic, mnemonic_2, mnemonic_3, " +
        "audio_word_url, audio_sentence_url, " +
        "ratings!left(ease_factor, review_count, next_review)"
      )
      .in("tier", ["gold", "silver"])
      .eq("ratings.user_id", session.user.id)
      .lte("ratings.next_review", now)
      .order("impact_score", { ascending: false })
      .limit(limit);

    const result = normaliseRows(due || []);

    if (result.length >= limit) return result;

    // Top up with unseen words
    const seenIds = result.map((w) => w.id).filter(Boolean);
    let q = supabase
      .from("words")
      .select(
        "id, headword, tier, impact_score, pos, " +
        "definition, definition_he, " +
        "surface_1, " +
        "mnemonic, mnemonic_2, mnemonic_3, " +
        "audio_word_url, audio_sentence_url"
      )
      .in("tier", ["gold", "silver"])
      .order("impact_score", { ascending: false })
      .limit(limit - result.length + 10);

    if (seenIds.length) q = q.not("id", "in", `(${seenIds.join(",")})`);

    const { data: fresh } = await q;
    const combined = [...result, ...normaliseRows(fresh || []).slice(0, limit - result.length)];
    if (combined.length > 0) return combined;
    // Fall through to guest path if auth queries returned nothing
  }

  // Guest (or auth fallback) — return top words normalised
  return getWords().then((ws) => normaliseRows(ws).slice(0, limit));
}

function normaliseRows(rows) {
  return rows.map((w) => ({
    id:           w.id,
    word:         w.headword,
    pos:          w.pos || "",
    tier:         w.tier === 'gold' ? 'A' : w.tier === 'silver' ? 'B' : w.tier || 'C',
    impact:       parseFloat(w.impact_score) || 0,
    def:          w.definition || "",
    def_he:       w.definition_he || w.definition || "",
    sentence:     w.surface_1 || w.sentence || "",
    sentence_he:  "",
    meanings:     [w.definition_he].filter(Boolean),
    assoc:        [w.mnemonic, w.mnemonic_2, w.mnemonic_3].filter(Boolean),
    audioWord:    w.audio_word_url   || null,
    audioSentence:w.audio_sentence_url || null,
    // SRS state (may be null for new words)
    easeFactor:   w.ratings?.[0]?.ease_factor  ?? 2.5,
    reviewCount:  w.ratings?.[0]?.review_count ?? 0,
  }));
}

// ─── Traps ────────────────────────────────────────────────────────────────────
export async function getTraps() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("traps")
    .select("key, g");
  return error ? [] : (data || []);
}

// ─── SRS — save rating with SM-2 ─────────────────────────────────────────────
export function calcNextReview(rating, ef = 2.5, count = 0) {
  let interval, newEF = ef;
  if (rating === "hard")        { interval = 1; newEF = Math.max(1.3, ef - 0.2); }
  else if (rating === "medium") { interval = count <= 1 ? 3 : Math.round(count * ef); }
  else                          { interval = count <= 1 ? 4 : Math.round(count * ef * 1.3); newEF = Math.min(2.5, ef + 0.1); }
  const next = new Date();
  next.setDate(next.getDate() + interval);
  return { nextReview: next.toISOString(), newEF };
}

export async function saveSrsRating(wordId, rating, ef, count) {
  if (isGuest() || !supabase) return recordRating(wordId, rating);
  const session = await getCurrentSession();
  if (!session) return { ok: false };
  const { nextReview, newEF } = calcNextReview(rating, ef, count);
  const { error } = await supabase.from("ratings").upsert(
    {
      user_id:      session.user.id,
      word_id:      wordId,
      rating,
      ease_factor:  newEF,
      review_count: count + 1,
      next_review:  nextReview,
    },
    { onConflict: "user_id,word_id" }
  );
  return error ? { ok: false } : { ok: true };
}

// ─── Progress stats ───────────────────────────────────────────────────────────
export async function getProgressStats() {
  if (!supabase) return null;
  const session = await getCurrentSession();
  if (!session) return null;

  const [ratingsRes, profileRes] = await Promise.all([
    supabase.from("ratings").select("rating, review_count").eq("user_id", session.user.id),
    supabase.from("user_profiles").select("streak_days, target_score, exam_date").eq("id", session.user.id).single(),
  ]);

  const ratings = ratingsRes.data || [];
  const profile = profileRes.data || {};
  const acquired = ratings.filter((r) => r.rating === "easy" && r.review_count >= 2).length;

  return {
    acquired,
    totalRated:  ratings.length,
    streak:      profile.streak_days || 0,
    targetScore: profile.target_score || 130,
    examDate:    profile.exam_date    || null,
  };
}

// ─── Level ────────────────────────────────────────────────────────────────────
export function getLevel() {
  return localStorage.getItem(LEVEL_KEY) || "intermediate";
}
export function setLevel(level) {
  localStorage.setItem(LEVEL_KEY, level);
}

// ─── Audio playback ───────────────────────────────────────────────────────────
export function playAudio(url) {
  if (!url) return;
  try { new Audio(url).play(); } catch (_) {}
}