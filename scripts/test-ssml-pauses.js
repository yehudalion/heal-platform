/**
 * scripts/test-ssml-pauses.js
 *
 * DIAGNOSTIC, not a production script. Renders the SAME transcript TWO ways
 * so you can compare them directly:
 *   1. plain.mp3  — exactly what generate-listening-audio.js sends today:
 *      `{ input: { text } }`, no pauses, left entirely to the voice's default
 *      prosody.
 *   2. paused.mp3 — the SAME text wrapped in SSML with the pause architecture
 *      that LISTENING_FORMAT.md documents but that NO render script has ever
 *      actually sent: comma ~210ms, sentence-boundary ~480ms, pivot/
 *      connective ~840ms (docs/LISTENING_FORMAT.md, "Pause architecture").
 *
 * Why this exists (2026-08-14): Lion's ear-test on audio_ab_check.html came
 * back "always the same sound" versus the real recordings. The render script
 * has NEVER sent SSML — every one of the 100 continuation files was
 * synthesized from bare text, so Chirp3-HD's default (largely flat, evenly
 * paced) delivery is literally the only thing that's ever been rendered.
 * This script tests whether adding the documented pauses closes the gap —
 * WITHOUT touching any of the 100 live files or the DB. Local files only.
 *
 * There is a real open question this script also answers: does Chirp3-HD
 * even accept SSML input, or only plain text? (LISTENING_FORMAT.md already
 * notes Chirp3-HD ignores SSML <mark> timepoints — this checks <break> too,
 * separately, since a voice can honor one SSML feature and ignore another.)
 * If the SSML call fails outright, that is itself the answer: this voice
 * family needs a different fix (post-processing pauses with ffmpeg instead
 * of SSML), not this one.
 *
 * Usage:
 *   node scripts/test-ssml-pauses.js                  # uses the built-in sample text
 *   node scripts/test-ssml-pauses.js --id <uuid>       # pulls a real transcript from listening_lectures
 *
 * Output: scripts/audio_output/_ssml_test_plain.mp3 and _ssml_test_paused.mp3
 * Nothing is uploaded. Nothing is written to the DB.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'scripts', 'audio_output');

function loadEnv(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(ROOT, 'env.scripts.txt'));
const GOOGLE_TTS_API_KEY   = env.GOOGLE_TTS_API_KEY;
const SUPABASE_URL         = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!GOOGLE_TTS_API_KEY) { console.error('❌ GOOGLE_TTS_API_KEY missing from env.scripts.txt'); process.exit(1); }

const argv = process.argv.slice(2);
const idIdx = argv.indexOf('--id');
const SINGLE_ID = idIdx !== -1 ? argv[idIdx + 1] : null;

// Same "Salt" item already used in audio_ab_check.html's pair #1 (vs the real
// "קרח" recording) — so this test's plain.mp3 is directly comparable to what
// Lion already listened to and judged "always the same sound".
const SAMPLE_ID   = '6cd36327-e03a-4e2a-b777-7abdd1941936';
const SAMPLE_TEXT = `Ancient Roman soldiers were sometimes paid an allowance to buy salt, since it was so valuable for preserving food. This allowance was called a "salarium." Over time, however, the word came to refer to payment in general, not just for salt. As a result, the modern English word "salary" descends directly from this Roman practice.`;
const VOICE = 'en-GB-Chirp3-HD-Charon';
const RATE  = 0.90;

async function getTranscript(id) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('⚠️  No Supabase creds — using the built-in sample text instead of fetching by --id.');
    return SAMPLE_TEXT;
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from('listening_lectures').select('transcript').eq('id', id).single();
  if (error) throw new Error(`Fetch transcript ${id}: ${error.message}`);
  return data.transcript;
}

// ─── plain text → SSML with the documented pause architecture ────────────────
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Connectives that mark a pivot/paragraph shift — get the STRONG 840ms pause
// (LISTENING_FORMAT.md "pivot / paragraph shift / speaker turn: ~840 ms").
const PIVOT_WORDS = /\b(however|therefore|as a result|in other words|for example|for one thing|even so)\b/gi;

function toSsml(text) {
  let escaped = escapeXml(text);

  // Pivot connectives first (longer matches), so we don't also comma-break
  // the same word later.
  escaped = escaped.replace(PIVOT_WORDS, (m) => `${m}<break time="840ms"/>`);

  // Sentence boundaries: after . ! ? followed by a space or end.
  escaped = escaped.replace(/([.!?])(\s+)/g, (m, punct, space) => `${punct}<break time="480ms"/>${space}`);

  // Commas: shorter pause — but not one that sits directly after a break we
  // already inserted (the pivot-word case, "however<break.../>,") or one
  // already followed by a break. Either way a stacked double pause is
  // redundant; the stronger break already covers it.
  escaped = escaped.replace(/(?<!\/>)\,(\s+)(?!<break)/g, (m, space) => `,<break time="210ms"/>${space}`);

  // Belt-and-braces cleanup for any comma that still ended up glued to a
  // break tag (covers edge cases the lookbehind above might miss).
  escaped = escaped.replace(/(<break time="\d+ms"\/>)\s*,/g, '$1');

  return `<speak>${escaped}</speak>`;
}

// ─── Google Cloud TTS ─────────────────────────────────────────────────────────
async function synthesize({ text, ssml }, voice, rate) {
  const input = ssml ? { ssml } : { text };
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        voice: { languageCode: 'en-GB', name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, errText };
  }
  const { audioContent } = await res.json();
  if (!audioContent) return { ok: false, status: 200, errText: 'no audioContent in response' };
  return { ok: true, buffer: Buffer.from(audioContent, 'base64') };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const text = SINGLE_ID ? await getTranscript(SINGLE_ID) : SAMPLE_TEXT;
  const ssml = toSsml(text);

  console.log('── טקסט המקור ──');
  console.log(text);
  console.log('\n── אותו טקסט עם הפסקות SSML (מה שנשלח בגרסה 2) ──');
  console.log(ssml);
  console.log('');

  console.log('1/2 מייצר plain.mp3 (כמו שהסקריפט הרגיל עושה היום — בלי הפסקות)...');
  const plain = await synthesize({ text }, VOICE, RATE);
  if (!plain.ok) {
    console.error(`❌ plain render failed: ${plain.status} ${plain.errText}`);
    process.exit(1);
  }
  writeFileSync(resolve(OUT_DIR, '_ssml_test_plain.mp3'), plain.buffer);
  console.log('   ✅ scripts/audio_output/_ssml_test_plain.mp3');

  console.log('2/2 מייצר paused.mp3 (עם ה-SSML)...');
  const paused = await synthesize({ ssml }, VOICE, RATE);
  if (!paused.ok) {
    console.error(`❌ SSML render failed: ${paused.status} ${paused.errText}`);
    console.error('\n   זו תשובה חשובה בפני עצמה: אם גוגל דוחה SSML לקול הזה,');
    console.error('   הפתרון צריך להיות אחר (הוספת שקט אחרי-ההפקה עם ffmpeg,');
    console.error('   לא SSML). אל תמשיך לפני שתדביק לי את השגיאה הזו.');
    process.exit(1);
  }
  writeFileSync(resolve(OUT_DIR, '_ssml_test_paused.mp3'), paused.buffer);
  console.log('   ✅ scripts/audio_output/_ssml_test_paused.mp3');

  console.log('\n📋 עכשיו תשמע את שני הקבצים בתיקייה scripts/audio_output/');
  console.log('   (_ssml_test_plain.mp3 מול _ssml_test_paused.mp3), ותשווה גם');
  console.log('   מול ההקלטה האמיתית "קרח" שכבר יש לך פתוחה מ-audio_ab_check.html.');
  console.log('   תגיד לי: paused.mp3 קרוב יותר למקור, או שאין הבדל אמיתי?');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
