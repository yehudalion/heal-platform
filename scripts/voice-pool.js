/**
 * scripts/voice-pool.js
 *
 * Single source of truth for the TTS voice pool used by BOTH
 * generate-listening-audio.js (continuation) and generate-lecture-qa-audio.js
 * (lecture_qa). Do not hardcode voice names in either render script — import
 * from here, so there is exactly one place that defines "which voices exist
 * in our pool and in what order."
 *
 * Why this exists (2026-08-14): all 100 continuation items were rendered with
 * a SINGLE voice, en-GB-Chirp3-HD-Charon, 100/100 — confirmed by query. The
 * real exam corpus does not do this: 2 of the 4 official completion
 * recordings use a FEMALE narrator (see docs/LISTENING_FORMAT.md, "Voice
 * pool" — measured 2026-07-14). Training on one unfamiliar-proof voice for
 * 100 items and then meeting a different voice on exam day adds a real,
 * untrained-for difficulty. Lion confirmed the pool should mix.
 *
 * Voice names below are the REAL list returned by `voices.list` on our own
 * Google Cloud account (list-tts-voices.js, run 2026-08-14) — not names
 * remembered or guessed. 16 male + 14 female Chirp3-HD voices are available;
 * we use 4 male + 3 female, matching the target already documented in
 * LISTENING_FORMAT.md ("Cast 3-4 distinct male voices... 2-3 distinct female
 * voices").
 *
 * Charon and Kore are kept in the pool at position 0 — they are the voices
 * Lion already approved by ear ("קול מכובד וטוב לבחינה" / the dialogue
 * partner in the 6 lecture_qa calibration clips). They are not being
 * replaced, only joined by others.
 *
 * ASSIGNMENT IS DETERMINISTIC, NOT RANDOM — same input always produces the
 * same voice, so a re-run (e.g. --limit 5 then later --all) never reshuffles
 * a voice that a human has already listened to and approved. See
 * voiceForSingleNarrator() / voicePairForDialogue() below for how the index
 * is computed — always the item's stable rank in creation order among ALL
 * rows of its kind, never just its position within one script run's batch.
 */

const NAMES_MALE   = ['Charon', 'Fenrir', 'Orus', 'Iapetus'];
const NAMES_FEMALE = ['Kore', 'Aoede', 'Despina'];

export const MALE_VOICES   = NAMES_MALE.map((n) => `en-GB-Chirp3-HD-${n}`);
export const FEMALE_VOICES = NAMES_FEMALE.map((n) => `en-GB-Chirp3-HD-${n}`);

// Single-narrator items (continuation monologues, and lecture_qa format='lecture')
// draw from BOTH genders mixed together — this is the direct fix for the
// 100/100-male finding above. Order matters: it's the rotation order.
export const SINGLE_NARRATOR_POOL = [...MALE_VOICES, ...FEMALE_VOICES]; // 7 voices

/** Deterministic voice for a single-narrator item, given its stable rank
 *  (0-based) among ALL single-narrator items of its type, in creation order. */
export function voiceForSingleNarrator(rank) {
  return SINGLE_NARRATOR_POOL[rank % SINGLE_NARRATOR_POOL.length];
}

/** Deterministic (male, female) voice pair for a dialogue item, given its
 *  stable rank (0-based) among ALL dialogues, in creation order. Always one
 *  male + one female — required for clear speaker distinction (LOCKED rule,
 *  LISTENING_FORMAT.md "Voice configuration": "always cast M+F for dialogues"). */
export function voicePairForDialogue(rank) {
  return {
    male:   MALE_VOICES[rank % MALE_VOICES.length],
    female: FEMALE_VOICES[rank % FEMALE_VOICES.length],
  };
}
