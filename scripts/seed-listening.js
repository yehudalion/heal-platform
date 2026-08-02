/**
 * scripts/seed-listening.js
 *
 * For each of the 25 items in listening_content.json:
 *   1. Generate MP3 via ElevenLabs TTS
 *   2. Upload to Supabase Storage  bucket "audio" → listening/{id}.mp3
 *   3. INSERT into listening_items, listening_questions, listening_options
 *
 * Usage:
 *   node scripts/seed-listening.js
 *
 * Required in env.scripts.txt:
 *   ELEVENLABS_API_KEY=...
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=...
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

const env = loadEnv(resolve(ROOT, 'env.scripts.txt'));

const ELEVENLABS_API_KEY   = env.ELEVENLABS_API_KEY;
const SUPABASE_URL          = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;   // service_role

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY is missing from env.scripts.txt');
  console.error('   Add a line:  ELEVENLABS_API_KEY=sk-...');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY missing from env.scripts.txt');
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Load content ─────────────────────────────────────────────────────────────
const items = JSON.parse(
  readFileSync(resolve(ROOT, 'listening_content.json', 'listening_content.json'), 'utf8')
);

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────
const TTS_URL = (voiceId) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

const TTS_BODY = (text) => ({
  model_id: 'eleven_turbo_v2_5',
  text,
  voice_settings: { stability: 0.5, similarity_boost: 0.75 },
});

async function ttsSegment(text, voiceId) {
  const res = await fetch(TTS_URL(voiceId), {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify(TTS_BODY(text)),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generateAudio(item) {
  if (item.speaker_count === 1) {
    return ttsSegment(item.transcript, item.voice_id);
  }
  // speaker_count=2: concatenate all segments
  const buffers = [];
  for (const seg of item.segments) {
    const voiceId = seg.speaker === 1 ? item.voice_id : item.speaker2_voice_id;
    const buf = await ttsSegment(seg.text, voiceId);
    buffers.push(buf);
    // small pause between speakers: 300ms silence (not needed for MP3 concat)
  }
  return Buffer.concat(buffers);
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const BUCKET = 'audio';

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Create bucket: ${error.message}`);
    console.log(`  📦 Created bucket "${BUCKET}"`);
  }
}

async function uploadAudio(id, buffer) {
  const path = `listening/${id}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload ${id}: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── DB Insert ────────────────────────────────────────────────────────────────
async function insertItem(item, audioUrl) {
  // listening_items
  const { error: iErr } = await sb.from('listening_items').upsert({
    id:            item.id,
    item_type:     item.item_type,
    topic:         item.topic,
    primary_skill: item.primary_skill,
    accent:        item.accent,
    speaker_count: item.speaker_count,
    difficulty:    item.difficulty,
    audio_url:     audioUrl,
    status:        'published',
  }, { onConflict: 'id' });
  if (iErr) throw new Error(`Insert item ${item.id}: ${iErr.message}`);

  // listening_questions + options
  for (const q of item.questions) {
    const { error: qErr } = await sb.from('listening_questions').upsert({
      id:             q.id,
      item_id:        item.id,
      question_order: q.question_order,
      question_text:  q.question_text,
    }, { onConflict: 'id' });
    if (qErr) throw new Error(`Insert question ${q.id}: ${qErr.message}`);

    for (const o of q.options) {
      const { error: oErr } = await sb.from('listening_options').upsert({
        id:             o.id,
        question_id:    q.id,
        option_letter:  o.option_letter,
        option_text:    o.option_text,
        is_correct:     o.is_correct,
        trap_type:      o.trap_type ?? null,
        explanation_he: o.explanation_he,
      }, { onConflict: 'id' });
      if (oErr) throw new Error(`Insert option ${o.id}: ${oErr.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎧 Seeding ${items.length} listening items...\n`);
  await ensureBucket();

  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prefix = `[${String(i + 1).padStart(2, '0')}/${items.length}]`;
    process.stdout.write(`${prefix} ${item.topic}... `);

    try {
      // 1. TTS
      const audioBuffer = await generateAudio(item);

      // 2. Upload
      const audioUrl = await uploadAudio(item.id, audioBuffer);

      // 3. DB
      await insertItem(item, audioUrl);

      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`       ${err.message}`);
      errors.push({ topic: item.topic, error: err.message });
    }
  }

  console.log('\n─────────────────────────────────────────');
  if (errors.length === 0) {
    console.log(`✅ All ${items.length} items seeded successfully.`);
  } else {
    console.log(`⚠️  ${items.length - errors.length}/${items.length} succeeded.`);
    console.log('\nFailed items:');
    errors.forEach((e) => console.log(`  ❌ ${e.topic}: ${e.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
