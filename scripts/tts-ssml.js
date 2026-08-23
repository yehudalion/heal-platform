/**
 * scripts/tts-ssml.js — the pause architecture, as SSML.
 *
 * Single source of truth for turning a plain transcript into SSML that carries
 * the documented pause architecture (docs/LISTENING_FORMAT.md, "Pause
 * architecture"): comma ~210ms · sentence boundary ~480ms · pivot/connective
 * ~840ms.
 *
 * VERIFIED 2026-08-14 (test-ssml-pauses.js, run by Lion):
 *   - Chirp3-HD ACCEPTS <break> SSML (the render succeeded; note the same
 *     voices ignore <mark> timepoints — features are independent).
 *   - Measured effect on the "Salt" sample: internal silence 20% (plain) →
 *     32% (SSML). The real-corpus band is 23-38% — plain renders sit BELOW it,
 *     SSML renders sit inside it. Confirmed on the 6 rendered lecture_qa clips
 *     too: all plain, all 18-23%.
 *
 * Used by generate-listening-audio.js and generate-lecture-qa-audio.js
 * (default ON, opt out with --no-ssml).
 */

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Connectives that mark a pivot/paragraph shift — the STRONG 840ms pause.
const PIVOT_WORDS = /\b(however|therefore|as a result|in other words|for example|for one thing|even so)\b/gi;

export function toSsml(text) {
  let escaped = escapeXml(text);

  // Pivot connectives first (longer matches), so we don't also comma-break
  // the same word later.
  escaped = escaped.replace(PIVOT_WORDS, (m) => `${m}<break time="840ms"/>`);

  // Sentence boundaries: after . ! ? followed by a space or end.
  escaped = escaped.replace(/([.!?])(\s+)/g, (m, punct, space) => `${punct}<break time="480ms"/>${space}`);

  // Commas: shorter pause — but never stacked onto a break we already
  // inserted (the pivot-word case, "however<break.../>,").
  escaped = escaped.replace(/(?<!\/>)\,(\s+)(?!<break)/g, (m, space) => `,<break time="210ms"/>${space}`);

  // Belt-and-braces cleanup for any comma still glued to a break tag.
  escaped = escaped.replace(/(<break time="\d+ms"\/>)\s*,/g, '$1');

  return `<speak>${escaped}</speak>`;
}
