import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getLevel, recordRating, getAllRatings, getWords } from '../supabase.js';
import wordsData from '../data/words.json';

let queue = [];
let index = 0;
let revealed = false;
let extraOpen = false;
let mnemonicOpen = false;

const LEVEL_LABELS = { basic: 'בסיסי', intermediate: 'בינוני', advanced: 'מתקדם' };

async function buildQueue() {
  const ratings = await getAllRatings();
  const ratedEasy = new Set(ratings.filter((r) => r.rating === 'easy').map((r) => r.word_id));

  const remote = await getWords();
  const level = getLevel();
  const pool = remote.length > 0 ? remote : wordsData.filter((w) => w.level === level);

  const ordered = [
    ...pool.filter((w) => !ratedEasy.has(w.id)),
    ...pool.filter((w) => ratedEasy.has(w.id)),
  ];
  return ordered.length ? ordered : pool;
}

function splitDef(def) {
  if (!def) return { primary: '', rest: '' };
  const i = def.indexOf(',');
  if (i === -1) return { primary: def.trim(), rest: '' };
  return { primary: def.slice(0, i).trim(), rest: def.slice(i + 1).trim() };
}

function renderRevealed(word) {
  const { primary, rest } = splitDef(word.definition);
  const mnemonic = (word.mnemonic || '').trim();

  const extraBtn = rest
    ? '<button class="more-meanings-btn" id="moreMeaningsBtn">משמעויות נוספות ›</button>'
    : '';
  const extraText =
    rest && extraOpen
      ? '<p class="extra-meanings" dir="rtl">' + rest + '</p>'
      : '';

  const mnemBtn = mnemonic
    ? '<button class="mnemonic-btn' +
      (mnemonicOpen ? ' active' : '') +
      '" id="mnemonicBtn"><span>💡</span><span>אסוציאציה</span></button>'
    : '';
  const mnemText =
    mnemonic && mnemonicOpen
      ? '<p class="mnemonic-text" dir="rtl">' + mnemonic + '</p>'
      : '';

  return (
    '<div class="def-block">' +
    '<div class="section-label">הגדרה</div>' +
    '<p class="definition" dir="rtl">' + primary + '</p>' +
    (extraOpen ? '' : extraBtn) +
    extraText +
    mnemBtn +
    mnemText +
    '</div>' +
    '<div class="rate-bar">' +
    '<button class="rate-btn" data-tone="easy" data-rating="easy"><span class="rk">ידעתי</span><span>קל</span></button>' +
    '<button class="rate-btn" data-tone="medium" data-rating="medium"><span class="rk">ידעתי חלקית</span><span>בינוני</span></button>' +
    '<button class="rate-btn" data-tone="hard" data-rating="hard"><span class="rk">חדש לי</span><span>קשה</span></button>' +
    '</div>'
  );
}

function renderHidden() {
  return (
    '<div class="reveal-prompt">' +
    '<p>הקישו לחשיפת ההגדרה</p>' +
    '<button class="reveal-btn" id="revealBtn">חשוף</button>' +
    '</div>'
  );
}

function draw(root) {
  if (!queue.length) {
    root.innerHTML =
      '<div class="shell">' + renderTopbar() + '<div class="spinner">אין מילים זמינות.</div></div>';
    return;
  }

  const word = queue[index % queue.length];
  const level = getLevel();
  const levelLabel = LEVEL_LABELS[level] || level;
  const counter = (index % queue.length) + 1 + ' / ' + queue.length;

  root.innerHTML =
    '<div class="shell fade-in">' +
    renderTopbar() +
    '<div class="card-wrap">' +
    '<div class="card-meta"><span>מילה ' + counter + '</span><span class="level">' + levelLabel + '</span></div>' +
    '<div class="card">' +
    '<div class="card-headword-row"><div class="card-headword" dir="ltr">' + word.headword + '</div></div>' +
    '<div class="reveal-zone" id="revealZone">' +
    (revealed ? renderRevealed(word) : renderHidden()) +
    '</div>' +
    '</div>' +
    '<div class="card-footer">' +
    '<a href="#/fork">&rarr; תפריט המפגש</a>' +
    '<a href="#/gap">דו"ח פערים &larr;</a>' +
    '</div>' +
    '</div>' +
    '</div>';

  if (!revealed) {
    root.querySelector('#revealBtn').addEventListener('click', () => {
      revealed = true;
      extraOpen = false;
      mnemonicOpen = false;
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

    const mnemBtn = root.querySelector('#mnemonicBtn');
    if (mnemBtn) {
      mnemBtn.addEventListener('click', () => {
        mnemonicOpen = !mnemonicOpen;
        draw(root);
      });
    }

    root.querySelectorAll('.rate-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        await recordRating(word.id, b.dataset.rating);
        revealed = false;
        extraOpen = false;
        mnemonicOpen = false;
        index = (index + 1) % queue.length;
        draw(root);
      });
    });
  }
}

export async function renderCard(root) {
  root.innerHTML = '<div class="shell"><div class="spinner">טוען רשימה…</div></div>';
  queue = await buildQueue();
  index = 0;
  revealed = false;
  extraOpen = false;
  mnemonicOpen = false;
  draw(root);
}
