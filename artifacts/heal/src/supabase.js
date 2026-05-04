import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
const GUEST_KEY = "heal:guest";
const GUEST_RATINGS_KEY = "heal:guest:ratings";
const LEVEL_KEY = "heal:level";
export function setGuest(on) {
  if (on) {
    localStorage.setItem(GUEST_KEY, "1");
  } else {
    localStorage.removeItem(GUEST_KEY);
  }
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
  if (supabase) {
    await supabase.auth.signOut();
  }
  setGuest(false);
  localStorage.removeItem(GUEST_RATINGS_KEY);
}
/* -------- Ratings -------- */
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
    {
      user_id: session.user.id,
      word_id: wordId,
      rating,
    },
    { onConflict: "user_id,word_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
export async function getAllRatings() {
  if (isGuest() || !supabase) {
    const all = JSON.parse(localStorage.getItem(GUEST_RATINGS_KEY) || "{}");
    return Object.entries(all).map(([word_id, v]) => ({
      word_id,
      rating: v.rating,
    }));
  }
  const session = await getCurrentSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("ratings")
    .select("word_id, rating")
    .eq("user_id", session.user.id);
  if (error) return [];
  return data || [];
}
/* -------- Words -------- */
export async function getWords() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("words")
    .select(
      "id, headword, definition_he, audio_word_url, audio_sentence_url, surface_1, tier, mnemonic, mnemonic_2, mnemonic_3",
    )
    .order("headword", { ascending: true });
  if (error) return [];
  return data || [];
}
/* -------- Level (preferred difficulty) -------- */
export function getLevel() {
  return localStorage.getItem(LEVEL_KEY) || "intermediate";
}
export function setLevel(level) {
  localStorage.setItem(LEVEL_KEY, level);
}
