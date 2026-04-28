import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getLevel, recordRating, getAllRatings, getWords } from '../supabase.js';
import wordsData from '../data/words.json';

const speakerIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

let queue = [];
let index = 0;
let revealed = false;
let extraOpen = false;
let audioEl = null;

async function buildQueue() {
  const level = getLevel();
  const ratings = await getAllRatings();
  const ratedEasy = new Set(ratings.filter((r) => r.rating === 'easy').map((r) => r.word_id));

  const remote = await getWords();
  const usingRemote = remote.length > 0;
  const pool = usingRemote
    ? remote
    : wordsData.filter((w) => w.level === level);

  const ordered = [
    ...pool.filter((w) => !ratedEasy.has(w.id)),
    ...pool.filter((w) => ratedEasy.has(w.id)),
  ];
  return ordered.length ? ordered : pool;
}

function splitDefinition(def) {
  if (!def) return { primary: '', rest: '' };
  const i = def.indexOf(',');
  if (i === -1) return { primary: def.trim(), rest: '' };
  return {
    primary: def.slice(0, i).trim(),
    rest: def.slice(i + 1).trim(),
  };
}

const LEVEL_LABELS = {
  basic: 'בסיסי',
  intermediate: 'בינוני',
  advanced: 'מתקדם',
};

export async function renderCard(root) {
  root.innerHTML = `<div class="shell"><div class="spinner">טוען רשימה…</div></div>`;

  queue = await buildQueue();
  index = 0;
  revealed = false;
  extraOpen = false;
  draw(root);
}

function draw(root) {
  if (!queue.length) {
    root.innerHTML = `
      <div class="shell">
        ${renderTopbar()}
        <div class="spinner">אין מילים זמינות ברמה זו.</div>
      </div>`;
    return;
  }

  const word = queue[index % queue.length];
  const level = getLevel();
  const levelLabel = LEVEL_LABELS[level] || level;

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

          <button class="audio-btn" id="audioBtn" ${word.audio_url ? '' : 'disabled'}>
            ${speakerIcon}
            <span>השמע</span>
          </button>

          <div class="reveal-zone" id="revealZone">
            ${
              revealed
                ? (() => {
                    const { primary, rest } = splitDefinition(word.definition);
                    return `
              <div>
                <div class="section-label">הגדרה</div>
                <p class="definition" dir="rtl">${primary}</p>
                ${
                  rest
                    ? `
                  <button class="more-meanings-btn" id="moreMeaningsBtn" ${extraOpen ? 'hidden' : ''}>
                    משמעויות נוספות
                  </button>
                  <p class="extra-meanings" dir="rtl" ${extraOpen ? '' : 'hidden'}>${rest}</p>
                `
                    : ''
                }
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
              `;
                  })()
                : `
              <div class="reveal-prompt">
                <p>הקישו לחשיפת ההגדרה</p>
                <button class="reveal-btn" id="revealBtn">חשוף</button>
              </div>
              `
            }
          </div>
        </div>

        <div class="card-footer">
          <a href="#/fork">&rarr; תפריט המפגש</a>
          <a href="#/gap">דו״ח פערים &larr;</a>
        </div>
      </div>
    </div>
  `;

  // audio
  const audioBtn = root.querySelector('#audioBtn');
  if (audioBtn && word.audio_url) {
    audioBtn.addEventListener('click', () => {
      if (audioEl) {
        audioEl.pause();
      }
      audioEl = new Audio(word.audio_url);
      audioBtn.classList.add('playing');
      audioEl.play().catch(() => {
        audioBtn.classList.remove('playing');
      });
      audioEl.addEventListener('ended', () => audioBtn.classList.remove('playing'));
      audioEl.addEventListener('error', () => audioBtn.classList.remove('playing'));
    });
  }

  if (!revealed) {
    root.querySelector('#revealBtn').addEventListener('click', () => {
      revealed = true;
      extraOpen = false;
      draw(root);
    });
  } else {
    const moreBtn = root.querySelector('#moreMeaningsBtn');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        extraOpen = true;
        draw(root);
      });
    }
    root.querySelectorAll('.rate-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        await recordRating(word.id, b.dataset.rating);
        revealed = false;
        extraOpen = false;
        index = (index + 1) % queue.length;
        draw(root);
      });
    });
  }
}
