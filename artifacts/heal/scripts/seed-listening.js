/**
 * artifacts/heal/scripts/seed-listening.js
 *
 * For each of the 25 items in listening_content.json:
 *   1. Generate MP3 via ElevenLabs TTS
 *   2. Upload to Supabase Storage bucket "audio" → listening/{id}.mp3
 *   3. INSERT into listening_items, listening_questions, listening_options
 *
 * Usage (from repo root):
 *   node artifacts/heal/scripts/seed-listening.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEAL_ROOT  = resolve(__dirname, '..');          // artifacts/heal
const REPO_ROOT  = resolve(HEAL_ROOT, '..', '..');    // repo root

// ─── Load env from env.scripts.txt ───────────────────────────────────────────
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

const env = loadEnv(resolve(REPO_ROOT, 'env.scripts.txt'));

const ELEVENLABS_API_KEY  = env.ELEVENLABS_API_KEY;
const SUPABASE_URL         = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('\n❌  ELEVENLABS_API_KEY is missing from env.scripts.txt');
  console.error('    Add:  ELEVENLABS_API_KEY=<your-key>\n');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  SUPABASE_URL or SUPABASE_SERVICE_KEY missing from env.scripts.txt\n');
  process.exit(1);
}

// ─── Supabase client (service role) ──────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Load content ─────────────────────────────────────────────────────────────
const CONTENT_PATH = resolve(REPO_ROOT, 'listening_content.json', 'listening_content.json');
const items = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────
async function ttsSegment(text, voiceId) {
  const resolvedVoice = VOICE_FALLBACK[voiceId] ?? voiceId;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoice}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        model_id: 'eleven_turbo_v2_5',
        text,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generateAudio(item) {
  if (item.speaker_count === 1) {
    return ttsSegment(item.transcript, item.voice_id);
  }
  // speaker_count=2: TTS each segment with its voice, then concatenate
  const buffers = [];
  for (const seg of item.segments) {
    const voiceId = seg.speaker === 1 ? item.voice_id : item.speaker2_voice_id;
    buffers.push(await ttsSegment(seg.text, voiceId));
  }
  return Buffer.concat(buffers);
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const BUCKET = 'audio';

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error(`List buckets: ${error.message}`);
  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: ce } = await sb.storage.createBucket(BUCKET, { public: true });
    if (ce) throw new Error(`Create bucket: ${ce.message}`);
    console.log(`  📦 Created public bucket "${BUCKET}"`);
  }
}

async function audioExists(id) {
  const storagePath = `listening/${id}.mp3`;
  const { data } = await sb.storage.from(BUCKET).list('listening', {
    search: `${id}.mp3`,
  });
  return (data ?? []).some((f) => f.name === `${id}.mp3`);
}

function getPublicUrl(id) {
  const { data } = sb.storage.from(BUCKET).getPublicUrl(`listening/${id}.mp3`);
  return data.publicUrl;
}

async function uploadAudio(id, buffer) {
  const storagePath = `listening/${id}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  return getPublicUrl(id);
}

// ─── Voice fallbacks ──────────────────────────────────────────────────────────
// Voices that require a paid plan → swap to known-free premade voices
const VOICE_FALLBACK = {
  '21m00Tcm4TlvDq8ikWAM': 'onwK4e9ZLuTAKqWW03F9', // Rachel  → Daniel  (UK male)
  'XB0fDUnXU5powFXDhCwa': 'IKne3meq5aSn9XLyUdCD', // Charlotte → Matilda (AU female)
};

// ─── Lookup maps ─────────────────────────────────────────────────────────────
const LETTER_TO_ORDER = { A: 1, B: 2, C: 3, D: 4 };

const TRAP_TYPE_MAP = {
  L1: 'L1_absolute_quantifier',
  L2: 'L2_causal_reversal',
  L3: 'L3_fabricated_detail',
  L4: 'L4_unjustified_narrowing',
  L5: 'L5_temporal_distortion',
  L6: 'L6_lexical_soundalike',
  L7: 'L7_tone_misread',
  L8: 'L8_discourse_marker_miss',
};

function mapTrapType(raw) {
  if (!raw) return null;
  return TRAP_TYPE_MAP[raw] ?? raw; // pass through if already full enum value
}

// ─── Duration helpers ─────────────────────────────────────────────────────────
// ElevenLabs outputs 128 kbps MP3 → 16 000 bytes/second
function durationFromBuffer(buf) {
  return Math.max(1, Math.round(buf.length / 16000));
}
// Fallback: ~150 words per minute speaking rate
function durationFromText(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 2.5));
}

// ─── DB inserts ───────────────────────────────────────────────────────────────
async function insertItem(item, audioUrl, durationSeconds) {
  // Build transcript: plain for monologue, joined segments for dialogue
  const transcript = item.speaker_count === 1
    ? item.transcript
    : item.segments.map((s) => s.text).join('\n');

  const { error: iErr } = await sb.from('listening_items').upsert({
    id:            item.id,
    item_type:     item.item_type,
    topic:         item.topic,
    primary_skill: item.primary_skill,
    accent:        item.accent,
    speaker_count: item.speaker_count,
    difficulty:       item.difficulty,
    transcript,
    audio_url:        audioUrl,
    duration_seconds: durationSeconds,
    status:           'published',
  }, { onConflict: 'id' });
  if (iErr) throw new Error(`listening_items: ${iErr.message}`);

  for (const q of item.questions) {
    const { error: qErr } = await sb.from('listening_questions').upsert({
      id:             q.id,
      item_id:        item.id,
      question_order: q.question_order,
      question_text:  q.question_text,
    }, { onConflict: 'id' });
    if (qErr) throw new Error(`listening_questions ${q.id}: ${qErr.message}`);

    for (const o of q.options) {
      const { error: oErr } = await sb.from('listening_options').upsert({
        id:             o.id,
        question_id:    q.id,
        option_order:   LETTER_TO_ORDER[o.option_letter] ?? 1,
        option_text:    o.option_text,
        is_correct:     o.is_correct,
        trap_type:      mapTrapType(o.trap_type),
        explanation_he: o.explanation_he,
      }, { onConflict: 'id' });
      if (oErr) throw new Error(`listening_options ${o.id}: ${oErr.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎧  Seeding ${items.length} listening items into Supabase...\n`);
  await ensureBucket();

  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = `[${String(i + 1).padStart(2, '0')}/${items.length}]`;
    process.stdout.write(`${label} ${item.topic}... `);

    try {
      let audioUrl, durationSeconds;
      const alreadyUploaded = await audioExists(item.id);
      if (alreadyUploaded) {
        // Audio already in Storage — skip TTS, estimate duration from text
        audioUrl         = getPublicUrl(item.id);
        const fullText   = item.speaker_count === 1
          ? item.transcript
          : item.segments.map((s) => s.text).join(' ');
        durationSeconds  = durationFromText(fullText);
        process.stdout.write('(audio cached) ');
      } else {
        const audioBuffer = await generateAudio(item);
        durationSeconds   = durationFromBuffer(audioBuffer);
        audioUrl          = await uploadAudio(item.id, audioBuffer);
      }
      await insertItem(item, audioUrl, durationSeconds);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`        → ${err.message}`);
      errors.push({ topic: item.topic, error: err.message });
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  if (errors.length === 0) {
    console.log(`✅  All ${items.length} items seeded successfully.\n`);
  } else {
    console.log(`⚠️   ${items.length - errors.length}/${items.length} succeeded.\n`);
    console.log('Failed items:');
    errors.forEach((e) => console.log(`  ❌ ${e.topic}`));
    console.log('');
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
