/**
 * scripts/rephrase-gen/recipes.mjs
 *
 * Per-level recipe cards (spec §2 table + §2 level tells) and level-appropriate
 * golden few-shot examples drawn from the validated CAL-V4-L2 / CAL-V4-L5 batches.
 * Few-shot items are in the exact JSON shape the generator must emit.
 */

// Golden few-shot: CAL-V4-L2 (difficulty 2) — tone/length/distractor anchors.
const GOLD_L2 = [
  {
    stem: 'The octopus alters the color and texture of its skin in order to camouflage itself.',
    correct: 'By changing how its skin looks and feels, the octopus can make itself difficult to spot.',
    distractors: [
      'The octopus changes the shape and pattern of its skin so that it is hard to see.',
      'To hide itself, the octopus can alter the color and texture of its shell.',
      'By changing the color of its skin, the octopus is able to communicate with other octopuses.',
    ],
    mechanisms: ['R7', 'R7', 'R3'],
    proximities: ['P2', 'P2', 'P1'],
    transformations: ['G1', 'G3', 'G6'],
    relation_count: 1,
    hard_word_count: 1,
  },
  {
    stem: 'Vincent van Gogh sold only one painting during his lifetime, yet today his works are priceless.',
    correct: "Though he sold just one work in his lifetime, van Gogh's paintings now command enormous sums.",
    distractors: [
      "Van Gogh's work was greatly admired in his own day, though he sold only one painting.",
      "By the time of his death, van Gogh's canvases had become immensely valuable, though he had managed to sell only one.",
      'Van Gogh was never able to sell any of his paintings, though they are now worth a fortune.',
    ],
    mechanisms: ['R2', 'R9', 'R1'],
    proximities: ['P2', 'P3', 'P2'],
    transformations: ['G1', 'G3', 'G7'],
    relation_count: 2,
    hard_word_count: 1,
  },
  {
    stem: 'The Dead Sea is so saline that swimmers float effortlessly on its surface.',
    correct: 'So much salt is dissolved in the Dead Sea that people float without any strain.',
    distractors: [
      'The waters of the Dead Sea are so still that swimmers have no difficulty remaining on the surface.',
      'The Dead Sea has become increasingly salty because so many people swim in it.',
      'Swimmers must work hard to stay afloat in the Dead Sea, despite its high salt content.',
    ],
    mechanisms: ['R7', 'R2', 'R2'],
    proximities: ['P2', 'P2', 'P2'],
    transformations: ['G1', 'G6', 'G7'],
    relation_count: 1,
    hard_word_count: 1,
  },
  {
    stem: 'Coral reefs occupy less than one percent of the ocean floor but shelter a quarter of all marine species.',
    correct: 'Although they cover a tiny fraction of the seabed, coral reefs are home to a quarter of all sea life.',
    distractors: [
      'Coral reefs stretch across most of the ocean floor, and one in every four sea creatures lives there.',
      'Coral reefs take up only a small part of the seabed, and one in four ocean species goes there to breed.',
      'A quarter of the ocean floor is covered by coral reefs, which shelter many kinds of sea life.',
    ],
    mechanisms: ['R2', 'R3', 'R6'],
    proximities: ['P1', 'P1', 'P2'],
    transformations: ['G1', 'G3', 'G7'],
    relation_count: 2,
    hard_word_count: 0,
  },
];

// Golden few-shot: CAL-V4-L5 (difficulty 5) — compressed abstraction anchors.
const GOLD_L5 = [
  {
    stem: "The discovery of a single inscription forced historians to push back the city's founding by nearly three centuries.",
    correct: 'One newly found inscription convinced historians that the city had been established almost three centuries earlier than they had believed.',
    distractors: [
      "A single inscription led historians to conclude that the city's founding took place three centuries later than once assumed.",
      'The discovery of several inscriptions persuaded historians to shift the date the city was established by only a few decades.',
      'One inscription forced historians to reconsider where, rather than when, the ancient city had first been founded.',
    ],
    mechanisms: ['R9', 'R1', 'R7'],
    proximities: ['P2', 'P2', 'P2'],
    transformations: ['G1', 'G6', 'G9'],
    relation_count: 1,
    hard_word_count: 2,
  },
  {
    stem: "The soprano's farewell performance drew warmer applause than any she had received at the height of her career.",
    correct: 'At her final appearance the soprano drew more enthusiastic applause than she ever had at the height of her career.',
    distractors: [
      'Warm as it was, the applause at her farewell scarcely exceeded what the soprano had known at her peak.',
      "Critics, rather than ordinary listeners, were the ones who gave the soprano's farewell its warmest reception.",
      "The applause that greeted the soprano's last performance was noticeably cooler than any she had enjoyed in her prime.",
    ],
    mechanisms: ['R1', 'R6', 'R2'],
    proximities: ['P2', 'P2', 'P2'],
    transformations: ['G1', 'G3', 'G9'],
    relation_count: 1,
    hard_word_count: 2,
  },
  {
    stem: 'Persistent leaks in the aging reservoir have quietly undone much of the water authority’s recent conservation gains.',
    correct: 'Slow, steady leakage from the aging reservoir has cancelled out much of what the authority recently saved through conservation.',
    distractors: [
      'Much of the water the authority recently managed to conserve has been quietly contaminated by leaks in the aging reservoir.',
      "Quiet, persistent leakage in the aging reservoir has undermined the water authority's recently announced conservation goals.",
      "Only a small share of the authority's recent conservation gains has been lost to occasional leaks in the reservoir.",
    ],
    mechanisms: ['R7', 'R7', 'R1'],
    proximities: ['P2', 'P3', 'P2'],
    transformations: ['G1', 'G6'],
    relation_count: 1,
    hard_word_count: 2,
  },
  {
    stem: 'Meltwater from the retreating glacier now sustains farms it once threatened to bury.',
    correct: 'Farms the glacier once threatened to bury now depend on the water it sheds as it retreats.',
    distractors: [
      "Farms that once relied on the glacier's meltwater are now threatened by its accelerating retreat.",
      'Government irrigation projects, not the shrinking glacier, now sustain the farms it once threatened to bury.',
      'Nearly every farm in the region, once threatened by the glacier, now survives on its meltwater.',
    ],
    mechanisms: ['R2', 'R3', 'R1'],
    proximities: ['P2', 'P2', 'P2'],
    transformations: ['G1', 'G6', 'G9'],
    relation_count: 1,
    hard_word_count: 1,
  },
];

// Distribution-control notes (the single hardest lesson — the scanner CAPS these
// answer-predicting tells; the correct answer must not hold them more than the real
// exam does). These steer generation so the accumulated set stays inside real bounds.
// STRUCTURAL PARITY — the single most important constraint for passing the scanner.
// The scanner rejects any surface feature on which the CORRECT answer is the
// systematic outlier (longest, comma-richest, closest to the stem, the hub, …).
// This instruction makes the distractors match the correct answer's surface form
// so no single option stands out, keeping the pool inside the real distribution.
const STRUCTURAL_PARITY = `STRUCTURAL PARITY — the correct answer must not be the surface standout. Two rules:
- LENGTH: at least one distractor should be roughly as long as (or longer than) the correct answer. The correct answer is not the longest option every time.
- COMMAS & PUNCTUATION: at least one distractor must have AS MANY commas/dashes/semicolons as the correct answer — the correct answer is NEVER the unique punctuation leader. Prefer to keep the correct answer's comma count low.
(A separate per-item instruction below fixes the correct answer's exact stem-closeness — follow it precisely.)`;

export const RECIPES = {
  L2: {
    level: 'L2',
    difficulty: 2,
    position: 9,
    lengthRange: [5, 22],
    lengthMean: 15,
    hardBudget: '1–2',
    density: 'one clear logical relation',
    correctEngine: 'G1 plus at least one of {G3 clause-reorder, G6 lexical substitution, G7 nominalization/de-nominalization}',
    rMix: 'across the level aim R7≈8, R3≈5, R2≈5, R1≈4, R6≈3, R5≈2, R9≈2 (per 15: roughly R7×4, R3×2, R2×2, R1×1, R6×1, and a couple others)',
    twinsPer15: 6, // ~4/10 -> ~6/15
    tells:
      'The correct answer is the semantic-consensus hub (~42%) and lexically closest to the stem (~47%) — present but CAPPED, not every item. Do not always make the correct answer the closest to the stem.',
    featureControl: STRUCTURAL_PARITY,
    fewShot: GOLD_L2,
  },
  L3: {
    level: 'L3',
    difficulty: 3,
    position: 10,
    lengthRange: [8, 28],
    lengthMean: 17,
    hardBudget: '1–2',
    density: 'one relation plus a wrapping clause (relative clause, apposition, or fronted adverbial)',
    correctEngine: 'G1 plus at least two of {G3, G6, G7, G9 tense/time-reference shift}',
    rMix: 'R7 leads, R2 and R3 strong, spread across all seven codes {R1,R2,R3,R5,R6,R7,R9}',
    twinsPer15: 5, // ~3-4/10
    tells:
      'A wrapping clause adds structure without adding a second logical relation. Keep exactly one relation but bury it in subordination. Correct answer need not be the longest or the closest to the stem.',
    featureControl: STRUCTURAL_PARITY,
    fewShot: GOLD_L2,
  },
  L4: {
    level: 'L4',
    difficulty: 4,
    position: 11,
    lengthRange: [14, 34],
    lengthMean: 21,
    hardBudget: '2–3',
    density: '2–3 clauses, at least two logical relations, commas',
    correctEngine: 'G1 plus at least two of {G3, G6, G7}',
    rMix: 'R2 peaks (~20% of distractors — the reversal is the signature L4 trap), R9 present, R7 still leads',
    twinsPer15: 8, // ~5/10
    tells:
      'The "long sentence": genuinely multi-clause with two or more relations joined by commas. The correct answer is longest LESS often than at L5 — keep the length spread WIDE (some correct answers short, some long).',
    featureControl: STRUCTURAL_PARITY,
    fewShot: GOLD_L5,
  },
  L5: {
    level: 'L5',
    difficulty: 5,
    position: 12,
    lengthRange: [9, 27],
    lengthMean: 18,
    hardBudget: '1–3',
    density: 'dense not long — the relation is hidden inside a single loaded word, not spelled out in a clause',
    correctEngine: 'at least one of {G9 tense/time-reference shift, G2 voice change}; add G6 whenever a dense word can be unpacked',
    rMix: 'R7≈6-8, R2≈5, R6≈4, R9≈2-3, R5≈1',
    twinsPer15: 3, // ~2/10
    tells:
      'Compressed abstraction. The correct answer is often the LONGEST (~45%, cap ~52%), is the consensus hub (~57%), carries complex punctuation (~48%), and is lexically FAR from the stem (the OPPOSITE of L2 — it unpacks the compressed stem into plainer, longer wording). Do not make it longest EVERY time.',
    featureControl: STRUCTURAL_PARITY,
    fewShot: GOLD_L5,
  },
};
