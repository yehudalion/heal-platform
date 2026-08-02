/**
 * scripts/rephrase-gen/generate.mjs
 *
 * Draft generator. Batch transport: ONE item per request so the FROZEN,
 * byte-identical system prompt (recipe + CAL goldens + constraints) is cached
 * (cache_control: ephemeral) and read across every request. Per-item variation
 * lives only in the user message, AFTER the cache breakpoint. Model: Opus 4.8.
 *
 * Recipes, gates, and the scanner are unchanged — this only changes transport.
 */

import { callClaudeFull, textOf, mapPool, addUsage } from './lib.mjs';

const GEN_MODEL = 'claude-opus-4-8';

const R_CODES = `Distractor failure mechanisms (assign one R-code per distractor, from this 7-code set only):
- R1: over/understates scope or degree (e.g. "only one" -> "never any", "a quarter" -> "most").
- R2: reverses a relation or polarity (cause<->effect, more<->less, before<->after, X-causes-Y -> Y-causes-X).
- R3: adds information not in the stem (a new reason, actor, or detail the stem never states).
- R5: drops or blurs a load-bearing qualifier so the claim becomes looser/different.
- R6: swaps WHO/WHAT/WHICH — changes the participant, object, or focus of the action.
- R7: lexical corruption — a near-synonym that is subtly wrong (shell for skin, still for saline, quality for location).
- R9: shifts time/tense/sequence (already-happened vs about-to, "by X" vs "after X").
(R4 is merged into R3; R8 is retired. Twin distractors — proximity P3 — are best carried by R9 or R2, NEVER by R3.)`;

const PROXIMITY = `Proximity axis (assign one P-code per distractor):
- P1: clearly different from the correct answer (a test-wise reader rejects it quickly).
- P2: plausibly close — the default; requires reading to reject.
- P3: a TWIN — almost identical to the correct answer, differing in exactly one relation or one word. Carry a twin with R9 or R2, never R3.`;

// Worked failure analysis — concrete method the item-writer should follow. This
// is part of the FROZEN system prompt (stable, cache-eligible) and is genuinely
// load-bearing guidance, not filler.
const WORKED = `WORKED METHOD — build the correct answer, then attack it three ways.

Step 1. Read the stem and name its ONE logical relation (cause, contrast, time, scope/degree) and its participants (who does what to what).

Step 2. Write the correct answer as a from-scratch paraphrase. Change the grammatical spine: nominalize a verb or de-nominalize a noun, flip active/passive, reorder the clauses, and replace the main verb and the relation-word with different words that carry the SAME meaning. Keep every fact — no fact added, none dropped, none changed. Reuse as FEW of the stem's distinctive content words as you can.

Step 3. Write three distractors, each a complete independent sentence that is wrong for exactly ONE reason:
- R7 lexical corruption: keep the sentence's shape but swap ONE content word for a near-neighbour that changes the fact — "saline" -> "still", "founding" -> "location", "shelter" -> "feed". Tempting because everything else is right.
- R2 reversal: flip the direction of the relation — swap cause and effect, more and less, before and after, sustains and threatens. Tempting because it reuses the same words.
- R6 who/what swap: keep the action but change who performs it or what it acts on — "critics praised the memoir" -> "readers praised the memoir". Tempting because the frame is intact.
- R1 scope/degree: over- or under-state — "only one" -> "never any", "a quarter" -> "most", "nearly a metre" -> "exactly a metre". Tempting because it sounds close.
- R3 added information: introduce a reason, actor, or detail the stem never states. NEVER use R3 for a twin — added information is easy to catch, so keep R3 distractors at proximity P1 or P2.
- R5 dropped qualifier: remove a load-bearing hedge or condition so the claim becomes looser or absolute.
- R9 time/sequence shift: move the event in time — "had already finished by his eighth birthday" -> "finished at eight", "once threatened" -> "still threatens". R9 makes the best TWIN because a one-tense change is genuinely hard to see.

Step 4. Build ONE twin (proximity P3) in roughly the target fraction of items: take the correct answer and change exactly ONE thing — a single relation-word or tense — carried by R9 or R2. The twin must read as almost interchangeable with the correct answer until the reader isolates the single difference.

COMMON DEFECTS TO AVOID:
- A distractor that is the stem with a word swapped (not an independent paraphrase). Rewrite it from scratch.
- The correct answer being the only option that keeps the stem's vocabulary, or the only one that opens differently — the scanner catches both as answer-predicting tells.
- Two distractors that fail the same way with no twin — vary the mechanisms.
- An option that copies a long verbatim run from the stem, or shares its opening words.
- Any fact in an option that the stem does not state (unless that IS the item's R3 error).`;

/**
 * The FROZEN generation system prompt for a level. MUST be byte-identical across
 * every request (no per-item interpolation, no trailing spaces) so the prefix
 * caches. `goldens` are the level's CAL items, sorted deterministically.
 */
export function frozenGenSystem(recipe, goldens) {
  // No subject tagging: strip the topic field from the golden examples too.
  const gold = JSON.stringify(goldens.map(({ topic, ...g }) => g), null, 2);
  return `You are a senior item-writer for the Israeli HILAL English exam "restatement" (rephrase) section, difficulty level ${recipe.level} (exam position ${recipe.position}). You write ONE English sentence (the stem) and four full restatements: exactly one preserves the meaning with no added, dropped, or altered information; the other three are wrong for specific, principled reasons. You output STRICT JSON only — a single object, no prose, no markdown, no code fences.

STEM RULES
- One English sentence, ${recipe.lengthRange[0]}–${recipe.lengthRange[1]} words (mean ~${recipe.lengthMean}); density: ${recipe.density}.
- Hard-word budget: ${recipe.hardBudget} genuinely hard words per stem. Difficulty comes from STRUCTURE, not rare vocabulary.
- General-interest topics ONLY: popular science, history, nature, art, geography, biography, technology. NO politics, religion, conflict, personal health, or anything culturally sensitive for an Israeli audience.

CORRECT ANSWER
- A full restatement preserving the meaning EXACTLY — no added, dropped, or altered information.
- Apply the correct-answer engine: ${recipe.correctEngine}. It must use at least TWO G-transformations; never G1 (synonym swap) alone.
- Do NOT reuse the stem's main verb or its relation-word verbatim. Rewrite from scratch.

DISTRACTORS (exactly three, all WRONG)
- Each is a COMPLETE independent paraphrase — NOT the stem with one word swapped. Rewrite each from scratch, similar in length and lexical distance to the correct answer.
- Each fails for ONE specific reason (assign its R-code).
${R_CODES}
${PROXIMITY}

${WORKED}

DISTRIBUTION (aim for these tendencies across many items — this single item should contribute to them)
- R-mix target for the level: ${recipe.rMix}.
- Proximity mix ≈ P1 23% / P2 62% / P3 15%; about ${recipe.twinsPer15} of every 15 items carry one P3 twin.
- Within an item it is NORMAL for 2 of the 3 distractors to share an R-family; full monoculture (all 3 same) is essentially never.

LEVEL TELL: ${recipe.tells}

${recipe.featureControl}

HARD CONSTRAINTS (each is a scanner hard-fail — a violation wastes the whole item)
- Proper nouns keep IDENTICAL capitalization across all four options.
- Every one of the four options must BEGIN WITH A DIFFERENT FIRST WORD. None may begin with the stem's first word.
- Never share more than 3 opening words with the stem or with the correct answer (prefer 0–1).
- No two options may open with the same connective (although/though/while/because/since/if/when...).
- No option may share a verbatim run of more than 5 words with the stem or with another option. Break up any borrowed phrase by reordering and re-wording.
- Do NOT make the correct answer the only option that opens differently from the other three (they should ALL open differently).

OUTPUT — a single JSON object, EXACTLY:
{
  "stem": string,
  "correct": string,
  "distractors": [string, string, string],
  "mechanisms": [Rcode, Rcode, Rcode],
  "proximities": [Pcode, Pcode, Pcode],
  "transformations": [Gcode, ...],
  "relation_count": integer,
  "hard_word_count": integer
}

VALIDATED GOLDEN EXAMPLES for this level — match their tone, length, and distractor style:
${gold}`;
}

// Rotating subject domains force topic spread: Opus 4.8 (no temperature) clusters
// topics otherwise, and the pool must have no repeated subjects across the bank.
const DOMAINS = [
  'astronomy and space', 'marine biology', 'geology and rocks', 'weather and climate',
  'botany and plants', 'the animal kingdom', 'ancient history', 'medieval history',
  'the Renaissance', 'classical music', 'painting and sculpture', 'architecture',
  'world rivers and mountains', 'famous explorers', 'inventors and inventions',
  'materials and metals', 'aviation and flight', 'bridges and engineering',
  'writing systems and languages', 'world festivals and customs', 'the history of sport',
  'photography and film', 'maps and cartography', 'clocks and timekeeping',
  'light and optics', 'the human body', 'birds', 'insects', 'trees and forests',
  'deserts', 'oceans and seas', 'volcanoes and earthquakes', 'paper and printing',
  'coffee, tea and spices', 'textiles and dyes', 'glass and ceramics',
  'coins and currency', 'lighthouses and navigation', 'gardens and farming',
  'mythology and folklore',
];

/**
 * Build `count` generation requests for a level as batch entries. The frozen
 * system carries cache_control; per-item variation (index + rotating domain +
 * avoid-list) is in the user message, after the breakpoint.
 */
export function buildGenRequests(recipe, { count, round, avoidSubjects = [], goldens }) {
  const system = [{ type: 'text', text: frozenGenSystem(recipe, goldens), cache_control: { type: 'ephemeral', ttl: '1h' } }];
  const avoid = avoidSubjects.length ? avoidSubjects.join('; ') : '(none yet)';
  const reqs = [];
  for (let i = 0; i < count; i++) {
    const domain = DOMAINS[((round - 1) * count + i) % DOMAINS.length];
    const user = `Write restatement item #${round}.${i + 1}. Its subject MUST come from this domain: ${domain}. Pick a SPECIFIC, concrete topic within it (a particular animal, place, person, object, or event) — not the whole domain — that is NOT among these already-used subjects: ${avoid}. Set "topic" to a specific 2–3 word tag. Output the single JSON object only.`;
    reqs.push({
      custom_id: `gen-${recipe.level}-r${round}-i${i}`,
      params: {
        model: GEN_MODEL,
        max_tokens: 1500,
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: user }],
      },
    });
  }
  return reqs;
}

// Per-item correct-answer profile. Split ~50/50 so the pool's stem-similarity /
// consensus rates land near the real NITE distribution (correct is the stem-close
// hub ~half the time, never the most-reworded outlier); admission fine-tunes.
const ANCHOR = `CORRECT-ANSWER PROFILE — ANCHORED (follow exactly). Make the CORRECT answer the option CLOSEST to the stem: KEEP THE STEM'S KEY NOUNS (its subject and objects) intact or barely changed, and reuse several of the stem's distinctive words. Transform the GRAMMAR, VERBS, and connectives — NOT the nouns. Keep one short exact phrase (3–5 words, not the opening words). The correct answer must share MORE vocabulary with the stem, and with the other three options, than any single distractor. It is NOT the longest option and has NO MORE commas than a distractor. Make the three distractors each reword the stem's nouns MORE than the correct answer does.`;
const MIDDLE = `CORRECT-ANSWER PROFILE — MIDDLE (follow exactly). Do NOT make the correct answer the most stem-similar option: make ONE distractor clearly the closest to the stem (keeping the most of its exact nouns). The correct answer keeps SOME of the stem's nouns but is a fuller paraphrase — yet it must NEVER be the most-reworded option, so make at least one OTHER distractor reword the stem MORE than the correct answer does. The correct answer is neither the longest nor the shortest and has no more commas than a distractor.`;
// Weight toward ANCHOR (~60%) — real NITE correct answers are stem-close more often than not.
const PROFILE = (round, i) => (((round - 1) * 25 + i) % 5 < 3 ? ANCHOR : MIDDLE);

/**
 * Synchronous generation: fire `count` Messages calls concurrently (pool),
 * each sharing the FROZEN cache-marked system (so cache_read applies once the
 * cache is warm). Per-item user message carries the rotating domain hint and a
 * short recent-stems list (near-dup avoidance) — no subject avoid-list, no tags.
 * Returns { items, usage } (usage = summed token tally).
 */
export async function generateSync(recipe, { count, round, recentStems = [], goldens, concurrency = count }) {
  const system = [{ type: 'text', text: frozenGenSystem(recipe, goldens), cache_control: { type: 'ephemeral', ttl: '1h' } }];
  const recent = recentStems.length ? recentStems.map((s) => `- ${s}`).join('\n') : '(none yet)';
  const usage = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
  const idxs = Array.from({ length: count }, (_, i) => i);
  const raws = await mapPool(idxs, concurrency, (i) => {
    const domain = DOMAINS[((round - 1) * count + i) % DOMAINS.length];
    const profile = PROFILE(round, i);
    const user =
      `Write restatement item #${round}.${i + 1}. Its subject MUST come from this domain: ${domain}. ` +
      `Pick a SPECIFIC, concrete topic within it (a particular animal, place, person, object, or event). ` +
      `Do NOT write a sentence that closely resembles or paraphrases any of these recent stems:\n${recent}\n\n` +
      `${profile}\n\n` +
      `Output the single JSON object only.`;
    return callClaudeFull({ model: GEN_MODEL, max_tokens: 1500, thinking: { type: 'disabled' }, system, messages: [{ role: 'user', content: user }] })
      .then((data) => { addUsage(usage, data.usage); return parseGenItem(textOf(data)); })
      .catch(() => null);
  });
  return { items: raws.filter(Boolean), usage };
}

/** One-shot cache warmup: a single gen call that writes the frozen-prefix cache. */
export async function warmGenCache(recipe, goldens) {
  const system = [{ type: 'text', text: frozenGenSystem(recipe, goldens), cache_control: { type: 'ephemeral', ttl: '1h' } }];
  const data = await callClaudeFull({
    model: GEN_MODEL, max_tokens: 1500, thinking: { type: 'disabled' }, system,
    messages: [{ role: 'user', content: 'Write restatement item #0.1. Its subject MUST come from this domain: astronomy and space. Output the single JSON object only.' }],
  });
  return data.usage;
}

/** Extract the first top-level JSON object; validate item shape. Returns item|null. */
export function parseGenItem(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cand = fenced ? fenced[1] : text;
  const start = cand.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cand.length; i++) {
    const c = cand[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return validate(JSON.parse(cand.slice(start, i + 1))); } catch { return null; } } }
  }
  return null;
}

function validate(it) {
  if (!it || typeof it.stem !== 'string' || typeof it.correct !== 'string') return null;
  if (!Array.isArray(it.distractors) || it.distractors.length !== 3) return null;
  if (!it.distractors.every((d) => typeof d === 'string')) return null;
  return it;
}
