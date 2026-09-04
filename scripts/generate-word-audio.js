/**
 * scripts/generate-word-audio.js
 *
 * Renders audio for `words` rows that don't have it yet — targets the 2,116
 * rows added with status='pending_review' (originated as distractors in
 * sentence-completion that weren't already in `words`; they already have a
 * full headword + example sentence, just no audio).
 *
 * This is a SEPARATE pipeline from generate-listening-audio.js /
 * generate-lecture-qa-audio.js: different Storage bucket (`heal-audio`, not
 * `audio`), different naming (flat `<headword>_word.mp3` /
 * `<headword>_sentence.mp3`, not `listening/<type>/<id>.mp3`), no cut tone,
 * no dialogue — one voice reads one word, then the same voice reads one
 * example sentence.
 *
 * Per item:
 *   1. Google Cloud TTS (Chirp3-HD) synthesizes `headword` (spoken as
 *      natural text, spaces and all) → *_word.mp3, and `surface_1` (the
 *      stored example sentence) → *_sentence.mp3.
 *   2. Upload both to Storage bucket "heal-audio" (flat, no subfolder).
 *   3. UPDATE words.audio_word_url / words.audio_sentence_url.
 *
 * VOICE: set WORD_VOICE below after running identify-word-voice.js and
 * listening to which of the 7 pool voices matches the existing 550 words.
 * Every row uses the SAME single voice — the existing 550 are one voice
 * (not a rotating pool like listening/lecture_qa), so matching means picking
 * ONE and using it for all 2,116, not rotating.
 *
 * MULTI-WORD HEADWORDS (verified 2026-08-27 by query): 138 of the 2,116
 * pending rows are phrases, e.g. "troubled by", "turned down", "watches out
 * for" — none of the existing 550 done words are multi-word, so there is no
 * precedent to follow, only a decision to make. Convention used here (SLUG
 * below): lowercase, spaces → underscore, everything else kept as-is
 * (checked: all 2,116 headwords contain only [a-z, space, hyphen] — no
 * apostrophes/slashes/quotes to worry about, and the 2,116 slugs it
 * produces are already unique with zero collisions against the 550 existing
 * filenames). The TTS input text itself is NOT slugified — "in charge of"
 * is spoken as "in charge of", only the *filename* uses the underscore.
 *
 * This script does NOT touch `words.status`, `tier`, or `impact_score` —
 * generating audio and approving content for publish/scoring are kept as
 * separate gates (matches the project's is_published-requires-explicit-
 * approval rule elsewhere). Flip those separately, after review.
 *
 * Usage:
 *   node scripts/generate-word-audio.js                    # first 5 missing (calibration)
 *   node scripts/generate-word-audio.js --limit 50
 *   node scripts/generate-word-audio.js --all               # all ~2,116
 *   node scripts/generate-word-audio.js --headword "urban"          # single row, for debugging
 *   node scripts/generate-word-audio.js --headword "in charge of"   # single multi-word row
 *   node scripts/generate-word-audio.js --force --limit 5   # regenerate even if audio already set
 *   node scripts/generate-word-audio.js --status done --all  # the 226 stage-C rows (4.9.2026)
 *
 * Calibration batch (recommended before --all): run --limit 20 first, PLUS
 * explicitly test one multi-word row by hand — checked (2026-08-27): the
 * 138 multi-word rows are NOT spread evenly, the first one is only at
 * creation-order rank 103, so a plain --limit 20 run will not exercise the
 * naming convention at all. Run e.g.
 *   node scripts/generate-word-audio.js --headword "in charge of"
 * once, listen to the result, confirm the uploaded filename looks right
 * (in_charge_of_word.mp3 / in_charge_of_sentence.mp3), THEN run --all.
 *
 * After a full run, verify with:
 *   select count(*) from words where status='pending_review'
 *     and audio_word_url is not null and audio_sentence_url is not null;
 *   -- should read 2116
 *
 * Required in env.scripts.txt:
 *   GOOGLE_TTS_API_KEY=...
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=...
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── SET THIS after running identify-word-voice.js ─────────────────────────
const WORD_VOICE = 'en-GB-Chirp3-HD-Iapetus'; // confirmed by Lion 2026-08-27 — "מספיק קרוב" against the real ElevenLabs reference

// ─── CLI args ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const FORCE         = flag('force');
const SINGLE_HEADWORD = opt('headword', null);
const LIMIT         = SINGLE_HEADWORD ? 1 : (flag('all') ? null : parseInt(opt('limit', '5'), 10));
// Which status to render audio for. Defaults to 'pending_review' so every
// existing invocation behaves exactly as before. Vocabulary stage C
// (4.9.2026) created 191 new rows and rewrote 35 existing ones straight to
// status='done' with audio_word_url NULL, so those need --status done.
const STATUS        = opt('status', 'pending_review');

// ─── Env ────────────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(ROOT, 'env.scripts.txt'));
const GOOGLE_TTS_API_KEY   = env.GOOGLE_TTS_API_KEY;
const SUPABASE_URL         = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!GOOGLE_TTS_API_KEY) {
  console.error('❌ GOOGLE_TTS_API_KEY is missing from env.scripts.txt');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY missing from env.scripts.txt');
  process.exit(1);
}
if (WORD_VOICE.includes('REPLACE_ME')) {
  console.error('❌ WORD_VOICE is still a placeholder — run identify-word-voice.js first and set the real voice name at the top of this file.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = 'heal-audio';

// Filename convention for multi-word headwords (e.g. "in charge of") — see
// header comment. Only affects the filename; the TTS input text uses the
// raw headword unchanged.
function slugify(headword) {
  return headword.toLowerCase().trim().replace(/\s+/g, '_');
}

// ─── TTS ────────────────────────────────────────────────────────────────────
async function synthesize(text) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'en-GB', name: WORD_VOICE },
        // sampleRateHertz matches the existing 550 ElevenLabs files (44.1kHz,
        // 128kbps) as closely as Google's API allows — Chirp3-HD defaults to
        // 24kHz otherwise, which would make new files sound thinner side by
        // side. Not a functional requirement (mixed sample rates play fine),
        // just consistency.
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, sampleRateHertz: 44100 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return Buffer.from(json.audioContent, 'base64');
}

async function uploadAudio(slug, suffix, buffer) {
  const path = `${slug}_${suffix}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload ${path} failed: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  let query = sb
    .from('words')
    .select('id, headword, surface_1, audio_word_url, audio_sentence_url')
    .eq('status', STATUS);

  if (SINGLE_HEADWORD) {
    query = query.eq('headword', SINGLE_HEADWORD);
  } else if (!FORCE) {
    query = query.is('audio_word_url', null);
  }
  if (LIMIT) query = query.limit(LIMIT);

  const { data: rows, error } = await query;
  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
  if (!rows.length) {
    console.log('Nothing to do — no matching rows.');
    return;
  }

  console.log(`Rendering ${rows.length} row(s) with voice ${WORD_VOICE}...\n`);

  let ok = 0, failed = 0;
  for (const row of rows) {
    try {
      if (!row.surface_1) {
        console.warn(`⚠️  ${row.headword}: no surface_1 (example sentence) — skipping sentence audio, word only.`);
      }

      const slug = slugify(row.headword);
      const wordBuf = await synthesize(row.headword); // spoken as natural text, not the slug
      const wordUrl = await uploadAudio(slug, 'word', wordBuf);

      let sentenceUrl = row.audio_sentence_url ?? null;
      if (row.surface_1) {
        const sentBuf = await synthesize(row.surface_1);
        sentenceUrl = await uploadAudio(slug, 'sentence', sentBuf);
      }

      const { error: updErr } = await sb
        .from('words')
        .update({ audio_word_url: wordUrl, audio_sentence_url: sentenceUrl })
        .eq('id', row.id);
      if (updErr) throw new Error(updErr.message);

      console.log(`✅ ${row.headword}`);
      ok++;
    } catch (err) {
      console.error(`❌ ${row.headword}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} succeeded, ${failed} failed.`);
}

main();
