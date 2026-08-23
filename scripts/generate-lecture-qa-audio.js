/**
 * scripts/generate-lecture-qa-audio.js
 *
 * Renders audio for `listening_lectures` rows with item_type='lecture_qa' that
 * don't have one yet (audio_url IS NULL). Sibling script to
 * generate-listening-audio.js (continuation) — kept separate because the two
 * item types differ in every way that matters for rendering:
 *
 *   - lecture_qa NEVER gets the 1050Hz cut tone (that's exclusive to
 *     continuation — see docs/LISTENING_FORMAT.md v2.2 §1, MEASURED_CORPUS).
 *   - format='dialogue' rows are two-voice: the transcript is plain text with
 *     inline "Name: ..." turn labels (not a `segments` array), so this script
 *     parses turns out of the transcript, synthesizes each turn with the
 *     right voice, and concatenates with ~350ms inter-speaker gaps (see
 *     LISTENING_FORMAT.md "Voice configuration", 2026-07-15 LOCKED section).
 *   - format='lecture' rows are single-voice, same narrator as continuation.
 *   - speakingRate differs by format: lecture 0.90, dialogue 0.95 (LOCKED).
 *   - voice_config is NULL on insert for this item type (computed here, not
 *     at content-authoring time) — this script computes it deterministically
 *     from format + a speaker-name→gender map, and writes it back so the
 *     row's audio and its stored voice_config never drift apart.
 *   - after a successful render, duration_seconds is measured via ffprobe and
 *     written back — this is the first real (not estimated) duration these
 *     rows will have.
 *
 * Usage:
 *   node scripts/generate-lecture-qa-audio.js                  # first 5 missing (calibration)
 *   node scripts/generate-lecture-qa-audio.js --limit 20
 *   node scripts/generate-lecture-qa-audio.js --all
 *   node scripts/generate-lecture-qa-audio.js --id <uuid>
 *   node scripts/generate-lecture-qa-audio.js --force --limit 5  # regenerate even if audio_url set
 *
 * Required in env.scripts.txt: GOOGLE_TTS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Requires `ffmpeg` and `ffprobe` on PATH.
 *
 * After rendering, run the mechanical QA gate before trusting the upload:
 *   python3 scripts/qa_listening_audio.py scripts/audio_output_lecture_qa --type lecture_qa
 * (qa_listening_audio.py's TONES/silence checks are keyed off filename/type —
 * confirm the --type flag it expects before the first real run; the flag name
 * itself is not verified by this script.)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { voiceForSingleNarrator, voicePairForDialogue } from './voice-pool.js';
import { toSsml } from './tts-ssml.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'scripts', 'audio_output_lecture_qa');

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

if (!GOOGLE_TTS_API_KEY) { console.error('❌ GOOGLE_TTS_API_KEY missing from env.scripts.txt'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY missing'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ─── Voice pool ─────────────────────────────────────────────────────────────
// Voices themselves come from scripts/voice-pool.js (single source of truth,
// shared with generate-listening-audio.js). What's local to THIS script is
// just the speakingRate-by-format rule (LOCKED, LISTENING_FORMAT.md).
const RATE_BY_FORMAT = { lecture: 0.90, dialogue: 0.95 };

// TESTING ONLY — overrides RATE_BY_FORMAT.lecture for this run alone; the
// locked default (0.90) is untouched unless you pass --lecture-rate.
// Added 2026-08-16: medium/long lecture clips overshoot their duration
// envelope even before SSML (confirmed: the pre-existing coffeehouses clip
// failed at 70.1s/56-62s envelope with NO SSML at rate 0.90 — this is not an
// SSML-only problem). Use this to test a candidate rate on ONE file
// (--id <uuid>) before committing to a batch re-render.
const LECTURE_RATE_OVERRIDE = opt('lecture-rate', null);
if (LECTURE_RATE_OVERRIDE) RATE_BY_FORMAT.lecture = parseFloat(LECTURE_RATE_OVERRIDE);

// --start-rate: seed pass 1 at this rate instead of RATE_BY_FORMAT, for a
// single --id run. Use it when calibration history for that item already
// tells you roughly where the right rate is, so you don't spend the pass
// budget walking there from the generic default.
const START_RATE_OVERRIDE = opt('start-rate', null);

// Duration auto-calibration is ON by default (see "Duration auto-calibration"
// below). --no-calibrate renders a single pass at the fixed rate, which is what
// produced the out-of-envelope clips measured on 2026-08-16.
const NO_CALIBRATE = flag('no-calibrate');

// Known speaker-name → gender, extend as new names show up in future batches.
// Unknown names fall back to first-seen-gets-male, second-seen-gets-female.
// This only decides which of the dialogue's two ASSIGNED voices (see
// voicePairForDialogue) goes to which character — not which voices exist.
const KNOWN_GENDER = {
  daniel: 'm', tom: 'm', sam: 'm', george: 'm', amir: 'm', dan: 'm',
  claire: 'f', maya: 'f', priya: 'f', anna: 'f', tali: 'f', gali: 'f',
  // added 2026-08-16 with batch LQA-PROD-B
  callum: 'm', karl: 'm', peter: 'm',
  rosa: 'f', ella: 'f', nadia: 'f', ruth: 'f', noor: 'f',
};

const SAMPLE_RATE = 24000;
const INTER_SPEAKER_GAP_MS = 350;

// ─── Dialogue turn parsing ──────────────────────────────────────────────────
/** "Daniel: hi. Claire: hey — do you..." -> [{speaker:'Daniel', text:'hi.'}, ...] */
function parseTurns(transcript) {
  const re = /\b([A-Z][a-zA-Z]{1,20}):\s+/g;
  const marks = [...transcript.matchAll(re)];
  if (marks.length === 0) return null; // not a labelled dialogue
  const turns = [];
  for (let i = 0; i < marks.length; i++) {
    const speaker = marks[i][1];
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : transcript.length;
    const text = transcript.slice(start, end).trim();
    if (text) turns.push({ speaker, text });
  }
  return turns;
}

/** Assign each distinct speaker name a voice from this dialogue's pair
 *  (voicePairForDialogue(rank) — deterministic per-lecture, not fixed
 *  Charon/Kore for every dialogue), known-gender first, else alternate. */
function assignVoices(turns, pair) {
  const order = [...new Set(turns.map((t) => t.speaker))];

  // BUG FIXED 2026-08-16: the previous version tracked the "next unknown"
  // gender with a cursor that was only advanced inside the *unknown* branch.
  // So Tom(known m) + Rosa(unknown) both received pair.male, and three of the
  // nine batch-B dialogues shipped with one voice reading both parts
  // (Orus+Orus, Orus+Orus, Charon+Charon). Correct rule: known names claim
  // their gender FIRST, then each unknown takes a gender that is still free.
  const genders = {};
  for (const name of order) {
    const g = KNOWN_GENDER[name.toLowerCase()];
    if (g) genders[name] = g;
  }
  const taken = new Set(Object.values(genders));
  for (const name of order) {
    if (genders[name]) continue;
    let g;
    if (!taken.has('m')) g = 'm';
    else if (!taken.has('f')) g = 'f';
    else g = Object.values(genders).filter((x) => x === 'm').length
      <= Object.values(genders).filter((x) => x === 'f').length ? 'm' : 'f';
    genders[name] = g;
    taken.add(g);
  }

  const voiceOf = {};
  for (const name of order) voiceOf[name] = genders[name] === 'f' ? pair.female : pair.male;

  // Hard guard: a two-speaker dialogue read by one voice is unusable, and it
  // shipped silently once. Never let that happen again.
  if (order.length === 2 && voiceOf[order[0]] === voiceOf[order[1]]) {
    throw new Error(
      `Both speakers (${order.join(', ')}) resolved to the same voice ` +
      `${voiceOf[order[0]]}. Add the names to KNOWN_GENDER in this file.`);
  }
  return voiceOf;
}

// ─── Google Cloud TTS ─────────────────────────────────────────────────────────
async function synthesize(text, voiceName, speakingRate) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Pause architecture via SSML <break> (default; --no-ssml for bare text)
        input: USE_SSML ? { ssml: toSsml(text) } : { text },
        voice: { languageCode: 'en-GB', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
    }
  );
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
  const { audioContent } = await res.json();
  if (!audioContent) throw new Error('Google TTS: no audioContent in response');
  return Buffer.from(audioContent, 'base64');
}

// ─── ffmpeg helpers ───────────────────────────────────────────────────────────
function buildSilence(ms, outPath) {
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi',
    '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
    '-t', String(ms / 1000), outPath], { stdio: 'pipe' });
}

/** Concatenate an ordered list of mp3/wav files into one mp3, re-encoding. */
function concatToMp3(filePaths, outMp3Path, workDir) {
  const listPath = resolve(workDir, `_concat_${Date.now()}.txt`);
  writeFileSync(listPath, filePaths.map((p) => `file '${p}'`).join('\n') + '\n');
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-codec:a', 'libmp3lame', '-qscale:a', '4', outMp3Path], { stdio: 'pipe' });
}

function ffprobeDurationSeconds(path) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', path], { encoding: 'utf8' });
  return Math.round(parseFloat(out.trim()));
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const BUCKET = 'audio';

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: cErr } = await sb.storage.createBucket(BUCKET, { public: true });
    if (cErr) throw new Error(`Create bucket: ${cErr.message}`);
  }
}

async function uploadAudio(lectureId, buffer) {
  const path = `listening/lecture_qa/${lectureId}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg', upsert: true,
  });
  if (error) throw new Error(`Upload ${lectureId}: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ─── Duration auto-calibration ────────────────────────────────────────────────
// ADDED 2026-08-16 after a measured failure: a FIXED speakingRate cannot hold a
// clip inside its duration envelope, because SSML <break> time and the dialogue
// inter-turn gaps are CONSTANT — they do not shrink when speech speeds up. So a
// pivot-dense passage overshoots while a plain one lands fine, at the same rate.
// (Measured 2026-08-16: at the locked rates, 5 of 12 clips fell outside their
// envelope, and the needed rate ranged 0.93–1.41 across items.)
//
// Fix: render once at the default rate, MEASURE, then solve for the rate that
// hits the item's own target duration and render once more if needed:
//     target      = word_count / wpm_target * 60   (clamped into the envelope)
//     speech      = measured − fixedPauses
//     correctRate = rate × speech / (target − fixedPauses)
// Per-item rate variation is faithful to the real corpus, which measures
// 99–176 wpm across clips (MEASURED_CORPUS §6.4) — not one uniform pace.
const ENVELOPE = { s30: [25, 47], s60: [56, 62], s90: [72, 98] };
const RATE_MIN = 0.70, RATE_MAX = 1.60;
const TOLERANCE_S = 1.0;
// Raised 3->5 on 2026-08-16: the postal-sorting-office dialogue oscillated
// 67s -> 56s -> 63s over its two budgeted correction passes and never
// converged — the rate correction is a good first-order fix, but Chirp3-HD's
// own render-to-render variance on <break> timing means one item in ~18
// needs a third correction to land inside a tight envelope (medium is only
// 56-62s wide). More passes cost nothing but a few extra seconds of render
// time per item.
const MAX_PASSES = 5;

// ⚠️ MEASURED CORRECTION 2026-08-16 (second attempt).
// The first version of this calibration subtracted `<break>` time as a CONSTANT,
// assuming pauses don't shrink when speech speeds up. Measured on all 12 clips:
// that is FALSE — 9 of 12 matched a pure-scaling model (duration ∝ 1/rate) to
// within 3%, i.e. **Chirp3-HD scales <break> durations along with speakingRate.**
// So no closed-form pause model is needed — and a wrong one overshoots (the
// coffeehouses clip landed at 54.7s when the model predicted 60.5s).
// This version is model-free: measure what the QA gate measures, correct by the
// plain ratio, repeat. It converges regardless of how the engine treats pauses.

/**
 * Speech seconds as the QA gate counts them: total minus leading and trailing
 * silence (scripts/qa_listening_audio.py "trim"). Reads ~0.5-1.0 s higher than
 * the gate's adaptive threshold, which is why targets sit mid-envelope.
 */
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

/**
 * The duration this item should have: its own word count at its own wpm target,
 * kept 2 s inside the envelope so a ±1 s measurement difference can't fail it.
 */
function targetSeconds(row) {
  const [lo, hi] = ENVELOPE[row.bucket] ?? [0, Infinity];
  const wpm = row.wpm_target || 155;
  const wanted = (row.word_count || 0) > 0 ? (row.word_count / wpm) * 60 : (lo + hi) / 2;
  return Math.min(Math.max(wanted, lo + 2), hi - 2);
}

// ─── Per-row render ───────────────────────────────────────────────────────────
// `rank` is the row's stable position (0-based) among all rows of its own
// format ('lecture' rows ranked separately from 'dialogue' rows) — see
// main()'s rankOfLecture/rankOfDialogue. This is what makes voice assignment
// reproducible across separate runs (see scripts/voice-pool.js).
async function renderRow(row, rank, rateOverride = null) {
  const rate = rateOverride ?? RATE_BY_FORMAT[row.format] ?? 0.90;

  if (row.format === 'dialogue') {
    const turns = parseTurns(row.transcript);
    if (!turns) throw new Error('format=dialogue but no "Name: " turns found in transcript');
    const pair = voicePairForDialogue(rank);
    const voiceOf = assignVoices(turns, pair);

    const partPaths = [];
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      const buf = await synthesize(t.text, voiceOf[t.speaker], rate);
      const p = resolve(OUT_DIR, `_part_${row.id}_${i}.mp3`);
      writeFileSync(p, buf);
      partPaths.push(p);
      if (i < turns.length - 1) {
        const gapPath = resolve(OUT_DIR, `_gap_${row.id}_${i}.wav`);
        buildSilence(INTER_SPEAKER_GAP_MS, gapPath);
        partPaths.push(gapPath);
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    const finalPath = resolve(OUT_DIR, `${row.id}.mp3`);
    concatToMp3(partPaths, finalPath, OUT_DIR);
    return { finalPath, voiceConfig: { format: 'dialogue', speakingRate: rate, ssml: USE_SSML, voices: voiceOf, turns: turns.map((t) => t.speaker) } };
  }

  // format === 'lecture' (or null) -> single narrator, drawn from the mixed pool
  const voice = voiceForSingleNarrator(rank);
  const buf = await synthesize(row.transcript, voice, rate);
  const finalPath = resolve(OUT_DIR, `${row.id}.mp3`);
  writeFileSync(finalPath, buf);
  return { finalPath, voiceConfig: { format: 'lecture', speakingRate: rate, ssml: USE_SSML, voice } };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Voice pool ranks: 'lecture' rows and 'dialogue' rows are ranked in two
  // SEPARATE sequences (a lecture's rank never affects a dialogue's voice
  // pair, and vice versa) — each in creation order, over ALL matching rows,
  // not just this run's batch. See scripts/voice-pool.js.
  const { data: allRows, error: allErr } = await sb
    .from('listening_lectures')
    .select('id, format')
    .eq('item_type', 'lecture_qa')
    .order('created_at', { ascending: true });
  if (allErr) throw new Error(`Fetch id order: ${allErr.message}`);

  const rankOfLecture = new Map();
  const rankOfDialogue = new Map();
  for (const r of allRows) {
    if (r.format === 'dialogue') rankOfDialogue.set(r.id, rankOfDialogue.size);
    else rankOfLecture.set(r.id, rankOfLecture.size);
  }

  let query = sb
    .from('listening_lectures')
    .select('id, transcript, format, bucket, audio_url, word_count, wpm_target')
    .eq('item_type', 'lecture_qa')
    .order('created_at', { ascending: true });

  if (SINGLE_ID) query = query.eq('id', SINGLE_ID);
  else if (!FORCE) query = query.is('audio_url', null);
  if (LIMIT) query = query.limit(LIMIT);

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw new Error(`Fetch lectures: ${fetchErr.message}`);
  if (!rows?.length) {
    console.log('Nothing to do — no matching lecture_qa rows (try --force, or check generation_batch).');
    return;
  }

  console.log(`\n🎧 Rendering audio for ${rows.length} lecture_qa item(s)`
    + (LIMIT && !SINGLE_ID ? ` (--limit ${LIMIT}; pass --all for every missing item)` : '') + '\n');
  console.log('   NOTE: no cut tone is appended — that marker is exclusive to `continuation`.\n');
  await ensureBucket();

  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prefix = `[${String(i + 1).padStart(3, '0')}/${rows.length}]`;
    process.stdout.write(`${prefix} ${row.id} (${row.bucket}/${row.format})... `);

    try {
      const rank = row.format === 'dialogue' ? rankOfDialogue.get(row.id) : rankOfLecture.get(row.id);
      if (rank === undefined) throw new Error('row not found in the id-order fetch (race?)');
      // Pass 1 — render at the default rate for this format, unless --start-rate
      // was given (only honored on a single-item --id run, as a safety rail).
      const pass1Rate = (START_RATE_OVERRIDE && SINGLE_ID) ? parseFloat(START_RATE_OVERRIDE) : null;
      let { finalPath, voiceConfig } = await renderRow(row, rank, pass1Rate);
      let speechSeconds = measureSpeechSeconds(finalPath);
      let durationSeconds = Math.round(ffprobeDurationSeconds(finalPath));
      const passes = [Math.round(speechSeconds * 10) / 10];

      // Passes 2..N — measure, correct by the plain ratio, re-render. Model-free:
      // no assumption about how the engine treats pauses (see note above).
      if (!NO_CALIBRATE) {
        const target = targetSeconds(row);
        let rate = voiceConfig.speakingRate;
        for (let pass = 2; pass <= MAX_PASSES; pass++) {
          if (Math.abs(speechSeconds - target) <= TOLERANCE_S) break;
          const next = Math.min(Math.max(rate * (speechSeconds / target), RATE_MIN), RATE_MAX);
          if (Math.abs(next - rate) < 0.01) break;   // clamped or converged
          rate = next;
          process.stdout.write(`(${speechSeconds.toFixed(0)}s→${target.toFixed(0)}s @${rate.toFixed(2)}) `);
          ({ finalPath, voiceConfig } = await renderRow(row, rank, rate));
          speechSeconds   = measureSpeechSeconds(finalPath);
          durationSeconds = Math.round(ffprobeDurationSeconds(finalPath));
          passes.push(Math.round(speechSeconds * 10) / 10);
        }
        if (passes.length > 1) {
          voiceConfig = { ...voiceConfig, calibration: {
            targetSeconds: Math.round(target * 10) / 10, passes, finalRate: rate } };
        }
      }

      const audioUrl = await uploadAudio(row.id, readFileSync(finalPath));

      const { error: uErr } = await sb
        .from('listening_lectures')
        .update({ audio_url: audioUrl, voice_config: voiceConfig, duration_seconds: durationSeconds })
        .eq('id', row.id);
      if (uErr) throw new Error(`DB update: ${uErr.message}`);

      const voiceLabel = voiceConfig.format === 'dialogue'
        ? Object.values(voiceConfig.voices).map((v) => v.replace('en-GB-Chirp3-HD-', '')).join('+')
        : voiceConfig.voice.replace('en-GB-Chirp3-HD-', '');
      const [lo, hi] = ENVELOPE[row.bucket] ?? [0, Infinity];
      const inRange = speechSeconds >= lo && speechSeconds <= hi ? '' : ' ⚠️ still outside envelope';
      console.log(`✅ (${speechSeconds.toFixed(0)}s speech, ${voiceLabel})${inRange}`);
    } catch (err) {
      console.log('❌');
      console.error(`        ${err.message}`);
      errors.push({ id: row.id, error: err.message });
    }

    await new Promise((r) => setTimeout(r, 400)); // gentle pacing on the TTS API
  }

  console.log('\n─────────────────────────────────────────');
  if (errors.length === 0) {
    console.log(`✅ All ${rows.length} item(s) rendered and uploaded.`);
  } else {
    console.log(`⚠️  ${rows.length - errors.length}/${rows.length} succeeded.`);
    console.log('\nFailed items:');
    errors.forEach((e) => console.log(`  ❌ ${e.id}: ${e.error}`));
  }
  console.log(`\nLocal copies are in ${OUT_DIR} — spot-check a dialogue item by ear before`);
  console.log('trusting the two-voice split; the speaker→gender map is a heuristic for');
  console.log('unfamiliar names and has not been validated against real audio yet.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
