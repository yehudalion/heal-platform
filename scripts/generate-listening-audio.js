/**
 * scripts/generate-listening-audio.js
 *
 * Renders audio for `listening_lectures` rows that don't have one yet
 * (item_type='continuation', audio_url IS NULL by default).
 *
 * Per item:
 *   1. Google Cloud TTS (Chirp3-HD) synthesizes `transcript`. The voice is
 *      COMPUTED from the row's stable rank among all continuation rows
 *      (scripts/voice-pool.js), NOT read from a stored voice_config — as of
 *      2026-08-14 this replaces the old behaviour where every one of the 100
 *      rows was rendered with the same single voice (en-GB-Chirp3-HD-Charon).
 *      Rate is 0.90 for every row (LISTENING_FORMAT.md, unchanged).
 *      Running with --force re-voices already-rendered rows from the pool —
 *      that is the intended way to fix the old single-voice rendering, not a
 *      side effect to avoid.
 *   2. A cut tone (1050 Hz, ~1.3s) + ~1.0s trailing silence is appended —
 *      required for every `continuation` clip, forbidden for `lecture_qa`
 *      (see docs/truth_corpus/MEASURED_CORPUS_2026-08-11.md and the TONES
 *      constant in scripts/qa_listening_audio.py: 1050Hz/1.00-1.65s or
 *      523Hz/0.85-1.00s are both attested; this script always uses 1050Hz —
 *      it was the majority case (7/12) in the measured corpus and there is
 *      no documented rule for choosing between the two).
 *   3. Upload to Supabase Storage bucket "audio" → listening/continuation/{id}.mp3
 *   4. UPDATE listening_lectures.audio_url
 *
 * A local copy of every rendered file is also kept in scripts/audio_output/
 * so you can run the existing QA gate BEFORE trusting what got uploaded:
 *   python3 scripts/qa_listening_audio.py scripts/audio_output --type completion
 *
 * Usage:
 *   node scripts/generate-listening-audio.js                 # first 5 missing items (calibration)
 *   node scripts/generate-listening-audio.js --limit 20       # first 20 missing items
 *   node scripts/generate-listening-audio.js --all            # every missing item (all ~100)
 *   node scripts/generate-listening-audio.js --id <uuid>       # a single lecture, for debugging
 *   node scripts/generate-listening-audio.js --force --limit 5 # regenerate even if audio_url is set
 *
 * Required in env.scripts.txt:
 *   GOOGLE_TTS_API_KEY=...
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=...
 *
 * Requires `ffmpeg` on PATH (used for the cut-tone + silence generation and
 * for concatenating it onto the TTS output — handles the format/samplerate
 * mismatch between the two sources so we don't need a raw stream-copy concat).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { voiceForSingleNarrator } from './voice-pool.js';
import { toSsml } from './tts-ssml.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'scripts', 'audio_output');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const FORCE     = flag('force');
const SINGLE_ID = opt('id', null);
const LIMIT     = SINGLE_ID ? 1 : (flag('all') ? null : parseInt(opt('limit', '5'), 10));
// SSML pause architecture is ON by default (verified 2026-08-14: plain renders
// sit BELOW the real-corpus internal-silence band, SSML renders sit inside it —
// see scripts/tts-ssml.js). --no-ssml reverts to bare-text synthesis.
const USE_SSML  = !flag('no-ssml');
// Duration auto-calibration ON by default — see "Duration auto-calibration".
const NO_CALIBRATE = flag('no-calibrate');

// ─── Env ──────────────────────────────────────────────────────────────────────
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

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Cut tone spec (scripts/qa_listening_audio.py TONES constant) ────────────
const TONE_HZ           = 1050;
const TONE_SECONDS      = 1.3;   // within required 1.00-1.65s window
const TRAILING_SILENCE  = 1.0;   // within required 0.6-2.0s window
const SAMPLE_RATE       = 24000;

/** Build (once) a WAV file containing the tone + trailing silence. */
function buildCutTail() {
  const tonePath    = resolve(OUT_DIR, '_tone.wav');
  const silencePath = resolve(OUT_DIR, '_silence.wav');
  const tailPath     = resolve(OUT_DIR, '_cut_tail.wav');

  execFileSync('ffmpeg', ['-y', '-f', 'lavfi',
    '-i', `sine=frequency=${TONE_HZ}:duration=${TONE_SECONDS}`,
    '-ac', '1', '-ar', String(SAMPLE_RATE), tonePath], { stdio: 'pipe' });

  execFileSync('ffmpeg', ['-y', '-f', 'lavfi',
    '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
    '-t', String(TRAILING_SILENCE), silencePath], { stdio: 'pipe' });

  const listPath = resolve(OUT_DIR, '_cut_tail_list.txt');
  writeFileSync(listPath, `file '${tonePath}'\nfile '${silencePath}'\n`);
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0',
    '-i', listPath, '-c', 'copy', tailPath], { stdio: 'pipe' });

  return tailPath;
}

// ─── Duration auto-calibration (mirrors generate-lecture-qa-audio.js) ────────
// ADDED 2026-08-16. A fixed speakingRate cannot hold a clip inside its duration
// envelope once SSML <break> time is in play, because break time is CONSTANT —
// it does not shrink when speech speeds up. Measured on the lecture_qa side:
// 5 of 12 clips fell outside their envelope at the locked rates. Continuations
// are shorter and were rendered WITHOUT SSML, so they passed; re-rendering them
// with pauses would push the longer ones over the 27s ceiling. So: render,
// MEASURE the speech (before the cut tail is appended), solve for the rate that
// hits this item's own target, re-render once if the miss is worth another call.
//     target      = word_count / wpm_target * 60   (clamped to 12.0-25.0s speech)
//     correctRate = rate × (measured − pauses) / (target − pauses)
// ⚠️ MEASURED 2026-08-16: Chirp3-HD scales <break> time along WITH speakingRate
// (9 of 12 lecture_qa clips matched duration ∝ 1/rate to within 3%). So there is
// no constant pause term to subtract — correction is the plain ratio, applied
// iteratively against a real measurement. Model-free, converges either way.
const SPEECH_MIN = 12.0, SPEECH_MAX = 24.0;   // gate counts speech + the 1.3s tone
const RATE_MIN = 0.70, RATE_MAX = 1.60;
const TOLERANCE_S = 1.0;
const MAX_PASSES = 3;

function ffprobeDurationSeconds(path) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', path], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

/** Speech seconds as the QA gate counts them (total minus lead/trail silence). */
function measureSpeechSeconds(path) {
  const total = ffprobeDurationSeconds(path);
  const res = spawnSync('ffmpeg', ['-v', 'error', '-i', path,
    '-af', 'silencedetect=noise=-35dB:d=0.1', '-f', 'null', '-'], { encoding: 'utf8' });
  const log = `${res.stderr || ''}`;
  const starts = [...log.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const ends   = [...log.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  let lead = 0, tail = 0;
  if (starts.length && starts[0] < 0.05 && ends.length) lead = ends[0];
  if (starts.length && (ends.length < starts.length || total - ends[ends.length - 1] < 0.05)) {
    tail = total - starts[starts.length - 1];
  }
  return Math.max(0, total - lead - tail);
}

/** The speech duration this item should have, from its own word count + wpm. */
function targetSpeechSeconds(row) {
  const wpm = row.wpm_target || 139;
  const wanted = (row.word_count || 0) > 0
    ? (row.word_count / wpm) * 60
    : (SPEECH_MIN + SPEECH_MAX) / 2;
  return Math.min(Math.max(wanted, SPEECH_MIN + 0.5), SPEECH_MAX - 0.5);
}

/** Append the cut tail onto a speech mp3, re-encoding so formats never have to match. */
function appendCutTail(speechMp3Path, cutTailWavPath, outMp3Path) {
  execFileSync('ffmpeg', ['-y',
    '-i', speechMp3Path,
    '-i', cutTailWavPath,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
    '-map', '[out]',
    '-codec:a', 'libmp3lame', '-qscale:a', '4',
    outMp3Path,
  ], { stdio: 'pipe' });
}

// ─── Google Cloud TTS ─────────────────────────────────────────────────────────
async function synthesize(text, voiceConfig) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Pause architecture via SSML <break> (default; --no-ssml for bare text)
        input: USE_SSML ? { ssml: toSsml(text) } : { text },
        voice: { languageCode: 'en-GB', name: voiceConfig.voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: voiceConfig.speakingRate ?? 0.9 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google TTS ${res.status}: ${errText}`);
  }
  const { audioContent } = await res.json();
  if (!audioContent) throw new Error('Google TTS: no audioContent in response');
  return Buffer.from(audioContent, 'base64');
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const BUCKET = 'audio';

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: cErr } = await sb.storage.createBucket(BUCKET, { public: true });
    if (cErr) throw new Error(`Create bucket: ${cErr.message}`);
    console.log(`  📦 Created bucket "${BUCKET}"`);
  }
}

async function uploadAudio(lectureId, buffer) {
  const path = `listening/continuation/${lectureId}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload ${lectureId}: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log('🔊 Building cut tone + trailing silence...');
  const cutTailPath = buildCutTail();

  // Voice pool (scripts/voice-pool.js): fetch EVERY continuation row's id, in
  // creation order, so each row's voice is its stable rank among ALL rows —
  // never just its position within this run's batch. This is what makes
  // re-running with --limit 5 today and --all next week never reshuffle a
  // voice a human already listened to and approved.
  const { data: allIds, error: allIdsErr } = await sb
    .from('listening_lectures')
    .select('id')
    .eq('item_type', 'continuation')
    .order('created_at', { ascending: true });
  if (allIdsErr) throw new Error(`Fetch id order: ${allIdsErr.message}`);
  const rankOf = new Map(allIds.map((r, i) => [r.id, i]));

  let query = sb
    .from('listening_lectures')
    .select('id, transcript, voice_config, audio_url, word_count, wpm_target')
    .eq('item_type', 'continuation')
    .order('created_at', { ascending: true });

  if (SINGLE_ID) {
    query = query.eq('id', SINGLE_ID);
  } else if (!FORCE) {
    query = query.is('audio_url', null);
  }
  if (LIMIT) query = query.limit(LIMIT);

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw new Error(`Fetch lectures: ${fetchErr.message}`);
  if (!rows?.length) {
    console.log('Nothing to do — no matching rows (maybe everything already has audio_url; try --force).');
    return;
  }

  if (FORCE) {
    console.log('⚠️  --force: every rendered row gets its voice RECOMPUTED from');
    console.log('   the pool (scripts/voice-pool.js), overwriting any existing');
    console.log('   voice_config — this is the intended way to re-voice the 100');
    console.log('   existing items away from the single-voice (Charon-only) render.\n');
  }

  console.log(`\n🎧 Generating audio for ${rows.length} item(s)`
    + (LIMIT && !SINGLE_ID ? ` (--limit ${LIMIT}; pass --all for every missing item)` : '') + '\n');
  await ensureBucket();

  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prefix = `[${String(i + 1).padStart(3, '0')}/${rows.length}]`;
    process.stdout.write(`${prefix} ${row.id}... `);

    const speechMp3Path = resolve(OUT_DIR, `_speech_${row.id}.mp3`);
    const finalMp3Path  = resolve(OUT_DIR, `${row.id}.mp3`);

    try {
      // Voice comes from the pool, computed from this row's stable rank —
      // NOT from row.voice_config, which (pre-2026-08-14) was uniformly
      // Charon for all 100 rows. See scripts/voice-pool.js.
      const rank = rankOf.get(row.id);
      if (rank === undefined) throw new Error('row not found in the id-order fetch (race?)');
      let voiceConfig = { voice: voiceForSingleNarrator(rank), speakingRate: 0.9, ssml: USE_SSML };

      // 1. TTS (speech only) — pass 1 at the default rate
      let speechBuf = await synthesize(row.transcript, voiceConfig);
      writeFileSync(speechMp3Path, speechBuf);

      // 1b. Measure → correct by ratio → re-render, up to MAX_PASSES.
      if (!NO_CALIBRATE) {
        const target = targetSpeechSeconds(row);
        let measured = measureSpeechSeconds(speechMp3Path);
        const passes = [Math.round(measured * 10) / 10];
        let rate = voiceConfig.speakingRate;
        for (let pass = 2; pass <= MAX_PASSES; pass++) {
          if (Math.abs(measured - target) <= TOLERANCE_S) break;
          const next = Math.min(Math.max(rate * (measured / target), RATE_MIN), RATE_MAX);
          if (Math.abs(next - rate) < 0.01) break;
          rate = next;
          voiceConfig = { ...voiceConfig, speakingRate: rate };
          speechBuf = await synthesize(row.transcript, voiceConfig);
          writeFileSync(speechMp3Path, speechBuf);
          measured = measureSpeechSeconds(speechMp3Path);
          passes.push(Math.round(measured * 10) / 10);
        }
        if (passes.length > 1) {
          voiceConfig = { ...voiceConfig, calibration: {
            targetSeconds: Math.round(target * 10) / 10, passes, finalRate: rate } };
        }
      }

      // 2. Append cut tone + silence
      appendCutTail(speechMp3Path, cutTailPath, finalMp3Path);
      const finalBuf = readFileSync(finalMp3Path);

      // 3. Upload
      const audioUrl = await uploadAudio(row.id, finalBuf);

      // 4. Write back — audio_url and voice_config together, atomically, so
      // the metadata can never describe a voice that isn't the one in the file.
      const { error: uErr } = await sb
        .from('listening_lectures')
        .update({ audio_url: audioUrl, voice_config: voiceConfig })
        .eq('id', row.id);
      if (uErr) throw new Error(`DB update: ${uErr.message}`);

      console.log(`✅ (${voiceConfig.voice.replace('en-GB-Chirp3-HD-', '')})`);
    } catch (err) {
      console.log('❌');
      console.error(`        ${err.message}`);
      errors.push({ id: row.id, error: err.message });
    }

    // Gentle pacing — avoid hammering the TTS API
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('\n─────────────────────────────────────────');
  if (errors.length === 0) {
    console.log(`✅ All ${rows.length} item(s) rendered and uploaded.`);
  } else {
    console.log(`⚠️  ${rows.length - errors.length}/${rows.length} succeeded.`);
    console.log('\nFailed items:');
    errors.forEach((e) => console.log(`  ❌ ${e.id}: ${e.error}`));
  }

  console.log(`\nLocal copies are in ${OUT_DIR} — before trusting the upload, run:`);
  console.log(`  python3 scripts/qa_listening_audio.py ${OUT_DIR} --type completion`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
