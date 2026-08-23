import { toSsml } from './tts-ssml.js';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

const env = {};
for (const line of readFileSync(resolve('..','env.scripts.txt'),'utf8').split('\n')) {
  const t=line.trim(); if(!t||t.startsWith('#'))continue; const eq=t.indexOf('=');
  if(eq>-1) env[t.slice(0,eq).trim()]=t.slice(eq+1).trim();
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {auth:{persistSession:false}});
const { data } = await sb.from('listening_lectures')
  .select('id,title,bucket,format,transcript,word_count').eq('item_type','lecture_qa').order('created_at');

// measured trimmed speech durations from the QA run just now
const measured = {
  '03680e7f':86.1,'1a7976e3':60.1,'243ec943':82.6,'35b399b7':116.3,'76e50c64':45.9,
  '78afc85c':71.6,'9bd8fd88':41.8,'a3dcdbdc':49.2,'a98f0d64':89.1,'cb759760':100.3,
  'd27db410':63.7,'ea531be8':35.6,
};
// envelope aims
const AIM = { s30:{lo:25,hi:47,aim:35}, s60:{lo:56,hi:62,aim:59}, s90:{lo:72,hi:98,aim:84} };
const RATE = { lecture:0.90, dialogue:0.95 };
const GAP_MS = 350;

console.log('item                       bucket fmt      words  breaks  gaps   measured  speech@cur  aim   needRate');
for (const r of data) {
  const key = r.id.slice(0,8);
  const m = measured[key]; if(!m) continue;
  // compute break time exactly as the render script would
  let breakMs = 0, gapMs = 0;
  if (r.format === 'dialogue') {
    const turns = r.transcript.split('\n').filter(l=>l.trim());
    gapMs = (turns.length-1)*GAP_MS;
    for (const t of turns) {
      const body = t.replace(/^[A-Z][a-zA-Z]{1,20}:\s*/,'');
      for (const mm of toSsml(body).matchAll(/time="(\d+)ms"/g)) breakMs += +mm[1];
    }
  } else {
    for (const mm of toSsml(r.transcript).matchAll(/time="(\d+)ms"/g)) breakMs += +mm[1];
  }
  const fixed = (breakMs+gapMs)/1000;
  const curRate = RATE[r.format];
  const speech = m - fixed;                 // pure speech seconds at current rate
  const a = AIM[r.bucket];
  const needRate = speech>0 ? (curRate*speech)/(a.aim - fixed) : NaN;
  const status = (m>=a.lo && m<=a.hi) ? 'ok ' : 'FAIL';
  console.log(
    `${r.title.slice(0,26).padEnd(26)} ${r.bucket} ${r.format.padEnd(8)} ${String(r.word_count).padStart(4)} ${String(breakMs).padStart(6)} ${String(gapMs).padStart(5)}  ${String(m).padStart(6)} ${speech.toFixed(1).padStart(9)} ${String(a.aim).padStart(5)} ${needRate.toFixed(2).padStart(8)}  ${status}`);
}
