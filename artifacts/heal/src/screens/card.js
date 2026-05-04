import { renderTopbar } from "../topbar.js";
import { navigate } from "../router.js";
import {
  getLevel,
  recordRating,
  getAllRatings,
  getWords,
} from "../supabase.js";
import wordsData from "../data/words.json";

const speakerIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

let queue = [];
let index = 0;
let revealed = false;
let meaningsOpen = false;
let sentenceOpen = false;
let assocOpen = false;
let mnemonicIndex = 0;
let audioEl = null;

async function buildQueue() {
  const level = getLevel();
  const ratings = await getAllRatings();
  const ratedEasy = new Set(
    ratings.filter((r) => r.rating === "easy").map((r) => r.word_id),
  );
  const remote = await getWords();
  const pool = remote;

  // Safety check - fail loudly if Supabase didn't load
  if (pool.length === 0) {
    console.error("No words loaded from Supabase!");
    return [];
  }
  const ordered = [
    ...pool.filter((w) => !ratedEasy.has(w.id)),
    ...pool.filter((w) => ratedEasy.has(w.id)),
  ];
  return ordered.length ? ordered : pool;
}

const LEVEL_LABELS = {
  basic: "בסיסי",
  intermediate: "בינוני",
  advanced: "מתקדם",
};

export async function renderCard(root) {
  root.innerHTML = `<div class="shell"><div class="spinner">טוען רשימה…</div></div>`;
  queue = await buildQueue();
  index = 0;
  revealed = false;
  meaningsOpen = false;
  sentenceOpen = false;
  assocOpen = false;
  mnemonicIndex = 0;
  draw(root);
}

function getMnemonics(word) {
  return [word.mnemonic || "", word.mnemonic_2 || "", word.mnemonic_3 || ""];
}

function playAudio(url) {
  if (!url) return;
  if (audioEl) audioEl.pause();
  audioEl = new Audio(url);
  audioEl.play().catch(() => {});
}

function draw(root) {
  if (!queue.length) {
    root.innerHTML = `
      <div class="shell">
        ${renderTopbar()}
        <div class="spinner">אין מילים זמינות.</div>
      </div>`;
    return;
  }

  const word = queue[index % queue.length];
  console.log("Word data:", word); // ← just add this, don't repeat const word
  console.log("Mnemonics:", word.mnemonic, word.mnemonic_2, word.mnemonic_3);
  console.log("Mnemonics:", word.mnemonic, word.mnemonic_2, word.mnemonic_3); // ADD THIS LINE
  const level = getLevel();
  const levelLabel = LEVEL_LABELS[level] || level;
  const mnemonics = getMnemonics(word);
  const currentMnemonic = mnemonics[mnemonicIndex % (mnemonics.length || 1)];

  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="card-wrap">
        <div class="card-meta">
          <span>מילה ${(index % queue.length) + 1} / ${queue.length}</span>
          <span class="level">${levelLabel}</span>
        </div>

        <div class="card">
          <div class="card-headword-row">
            <div class="card-headword" dir="ltr">${word.headword}</div>
          </div>

          ${
            revealed
              ? `
          <p class="definition" dir="rtl">${(word.definition_he || "").split(",")[0].trim()}</p>
          `
              : ""
          }

          <button class="audio-btn" id="audioBtnWord" ${word.audio_word_url ? "" : "disabled"}>
            ${speakerIcon}
            <span>השמע</span>
          </button>

          ${
            !revealed
              ? `
            <div class="reveal-prompt">
              <p>הקישו לחשיפת ההגדרה</p>
              <button class="reveal-btn" id="revealBtn">חשוף</button>
            </div>
          `
              : `
            <div class="expand-sections">

              <div class="expand-item">
                <button class="expand-btn ${meaningsOpen ? "open" : ""}" id="meaningsBtn">
                  פירושים אחרים ${meaningsOpen ? "▲" : "▼"}
                </button>
                ${
                  meaningsOpen
                    ? `
                  <div class="expand-content" dir="rtl">
                  <p>${(word.definition_he || "").split(",").slice(1).join(",").trim()}</p>
                  </div>
                `
                    : ""
                }
              </div>

              <div class="expand-item">
                <button class="expand-btn ${sentenceOpen ? "open" : ""}" id="sentenceBtn">
                  משפט עם המילה ${sentenceOpen ? "▲" : "▼"}
                </button>
                ${
                  sentenceOpen
                    ? `
                  <div class="expand-content" dir="ltr">
                    <p>${word.surface_1 || ""}</p>
                    ${
                      word.audio_sentence_url
                        ? `
                      <button class="audio-btn small" id="audioBtnSentence">
                        ${speakerIcon}
                        <span>השמע משפט</span>
                      </button>
                    `
                        : ""
                    }
                  </div>
                `
                    : ""
                }
              </div>

              <div class="expand-item">
                <button class="expand-btn ${assocOpen ? "open" : ""}" id="assocBtn"
                  ${mnemonics.length === 0 ? "disabled" : ""}>
                  אסוציאציה ${assocOpen ? "▲" : "▼"}
                </button>
                ${
                  assocOpen && mnemonics.length > 0
                    ? `
                  <div class="expand-content" dir="rtl">
                    <p>${currentMnemonic}</p>
                    ${
                      mnemonics.length > 1
                        ? `
                      <button class="swap-btn" id="swapMnemBtn">החלף ↺</button>
                    `
                        : ""
                    }
                  </div>
                `
                    : ""
                }
              </div>

            </div>

            <div class="rate-bar">
              <button class="rate-btn" data-tone="easy" data-rating="easy">
                <span class="rk">ידעתי</span>
                <span>קל</span>
              </button>
              <button class="rate-btn" data-tone="medium" data-rating="medium">
                <span class="rk">ידעתי חלקית</span>
                <span>בינוני</span>
              </button>
              <button class="rate-btn" data-tone="hard" data-rating="hard">
                <span class="rk">חדש לי</span>
                <span>קשה</span>
              </button>
            </div>
          `
          }
        </div>

        <div class="card-footer">
          <a href="#/fork">&rarr; תפריט המפגש</a>
          <a href="#/gap">דו״ח פערים &larr;</a>
        </div>
      </div>
    </div>
  `;

  // Word audio
  const audioBtnWord = root.querySelector("#audioBtnWord");
  if (audioBtnWord && word.audio_word_url) {
    audioBtnWord.addEventListener("click", () =>
      playAudio(word.audio_word_url),
    );
  }

  if (!revealed) {
    root.querySelector("#revealBtn").addEventListener("click", () => {
      revealed = true;
      meaningsOpen = false;
      sentenceOpen = false;
      assocOpen = false;
      mnemonicIndex = 0;
      draw(root);
    });
  } else {
    // Sentence audio
    const audioBtnSentence = root.querySelector("#audioBtnSentence");
    if (audioBtnSentence) {
      audioBtnSentence.addEventListener("click", () =>
        playAudio(word.audio_sentence_url),
      );
    }

    // Expand toggles
    root.querySelector("#meaningsBtn").addEventListener("click", () => {
      meaningsOpen = !meaningsOpen;
      draw(root);
    });
    root.querySelector("#sentenceBtn").addEventListener("click", () => {
      sentenceOpen = !sentenceOpen;
      draw(root);
    });
    const assocBtn = root.querySelector("#assocBtn");
    if (assocBtn && mnemonics.length > 0) {
      assocBtn.addEventListener("click", () => {
        assocOpen = !assocOpen;
        draw(root);
      });
    }

    // Swap mnemonic
    const swapBtn = root.querySelector("#swapMnemBtn");
    if (swapBtn) {
      swapBtn.addEventListener("click", () => {
        mnemonicIndex = (mnemonicIndex + 1) % mnemonics.length;
        draw(root);
      });
    }

    // Rating buttons
    root.querySelectorAll(".rate-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        await recordRating(word.id, b.dataset.rating);
        revealed = false;
        meaningsOpen = false;
        sentenceOpen = false;
        assocOpen = false;
        mnemonicIndex = 0;
        index = (index + 1) % queue.length;
        draw(root);
      });
    });
  }
}
