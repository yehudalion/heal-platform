/**
 * scripts/list-tts-voices.js
 *
 * Asks Google Cloud TTS which en-GB voices actually exist on this account,
 * and prints them grouped by family + gender.
 *
 * Why this script exists: the voice pool for our listening audio was locked to
 * a SINGLE voice (en-GB-Chirp3-HD-Charon, male) across all 100 continuation
 * items. Measurement of the real exam recordings shows a MIXED-GENDER pool —
 * 2 of the 4 official completion clips are read by a female narrator
 * (see docs/LISTENING_FORMAT.md, "Voice pool"). Before assigning a real pool
 * we need the true list of available voice names, not remembered ones.
 *
 * Read-only. Touches nothing, writes nothing, costs nothing (voices.list is
 * not billed as synthesis).
 *
 * Usage:
 *   node scripts/list-tts-voices.js              # en-GB only (default)
 *   node scripts/list-tts-voices.js --all        # every language
 *   node scripts/list-tts-voices.js --json       # raw JSON for pasting back
 *
 * Required in env.scripts.txt:  GOOGLE_TTS_API_KEY
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const argv    = process.argv.slice(2);
const ALL     = argv.includes('--all');
const AS_JSON = argv.includes('--json');

// ─── Env ──────────────────────────────────────────────────────────────────────
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
const KEY = env.GOOGLE_TTS_API_KEY;
if (!KEY) {
  console.error('❌ GOOGLE_TTS_API_KEY missing from env.scripts.txt');
  process.exit(1);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
const url = 'https://texttospeech.googleapis.com/v1/voices?key=' + KEY
          + (ALL ? '' : '&languageCode=en-GB');

const res = await fetch(url);
if (!res.ok) {
  console.error(`❌ Google TTS voices.list ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const { voices = [] } = await res.json();

if (AS_JSON) {
  console.log(JSON.stringify(voices, null, 2));
  process.exit(0);
}

// ─── Group + print ────────────────────────────────────────────────────────────
const GENDER_HE = { MALE: 'גברי', FEMALE: 'נשי', NEUTRAL: 'ניטרלי', SSML_VOICE_GENDER_UNSPECIFIED: '?' };

/** "en-GB-Chirp3-HD-Charon" -> "Chirp3-HD" ; "en-GB-Neural2-A" -> "Neural2" */
function familyOf(name) {
  const m = name.match(/^[a-z]{2}-[A-Z]{2}-(.+?)-[^-]+$/);
  return m ? m[1] : '(other)';
}

const byFamily = new Map();
for (const v of voices) {
  const fam = familyOf(v.name);
  if (!byFamily.has(fam)) byFamily.set(fam, []);
  byFamily.get(fam).push(v);
}

// Chirp3-HD first — that's the family we're already using.
const order = [...byFamily.keys()].sort((a, b) => {
  if (a.startsWith('Chirp3') && !b.startsWith('Chirp3')) return -1;
  if (b.startsWith('Chirp3') && !a.startsWith('Chirp3')) return 1;
  return a.localeCompare(b);
});

console.log(`\n🎙️  ${voices.length} voices available${ALL ? '' : ' for en-GB'}\n`);

for (const fam of order) {
  const list = byFamily.get(fam).slice().sort((a, b) => a.name.localeCompare(b.name));
  const males   = list.filter(v => v.ssmlGender === 'MALE');
  const females = list.filter(v => v.ssmlGender === 'FEMALE');
  const others  = list.filter(v => !['MALE', 'FEMALE'].includes(v.ssmlGender));

  const star = fam.startsWith('Chirp3') ? '  ⭐ (המשפחה שאנחנו כבר משתמשים בה)' : '';
  console.log(`── ${fam} — ${list.length} voices${star}`);
  for (const [label, group] of [['גברי', males], ['נשי', females], ['אחר', others]]) {
    if (!group.length) continue;
    console.log(`   ${label} (${group.length}):`);
    for (const v of group) {
      const short = v.name.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
      console.log(`     • ${v.name}`.padEnd(46) + `${short}`);
    }
  }
  console.log('');
}

// ─── What we currently use ────────────────────────────────────────────────────
const CURRENT = ['en-GB-Chirp3-HD-Charon', 'en-GB-Chirp3-HD-Kore'];
console.log('── בשימוש אצלנו כרגע');
for (const name of CURRENT) {
  const v = voices.find(x => x.name === name);
  const role = name.endsWith('Charon')
    ? 'קריין יחיד — כל 100 ההשלמות + הרצאות'
    : 'הדוברת השנייה בדיאלוגים בלבד';
  console.log(v
    ? `   ✓ ${name}  (${GENDER_HE[v.ssmlGender] || v.ssmlGender}) — ${role}`
    : `   ⚠️ ${name} — לא נמצא ברשימה! (השם השתנה או לא זמין לחשבון הזה)`);
}

const chirpMale   = (byFamily.get('Chirp3-HD') || []).filter(v => v.ssmlGender === 'MALE').length;
const chirpFemale = (byFamily.get('Chirp3-HD') || []).filter(v => v.ssmlGender === 'FEMALE').length;

console.log(`\n── סיכום למאגר הקולות`);
console.log(`   ב-Chirp3-HD זמינים: ${chirpMale} קולות גבריים, ${chirpFemale} נשיים.`);
console.log(`   היעד המתועד (LISTENING_FORMAT.md): 3–4 גבריים + 2–3 נשיים.`);
if (chirpMale >= 3 && chirpFemale >= 2) {
  console.log(`   ✅ יש מספיק — אפשר לבנות מאגר אמיתי בלי לצאת מהמשפחה הזו.`);
} else {
  console.log(`   ⚠️ פחות מהיעד. נצטרך להחליט: לערבב משפחות (איכות שונה) או להסתפק בפחות.`);
}

console.log(`\n📋 העתק לי את כל הפלט הזה ואבנה את חלוקת הקולות.\n`);
