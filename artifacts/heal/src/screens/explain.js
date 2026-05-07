import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

const TRAP_LIST = ['Extreme Wording','Logical Reversal','Added Detail','Scope Distortion','Synonym Confusion','Wrong Inference'];

const QUESTIONS = [
  {
    orig: 'The committee postponed the vote due to insufficient information.',
    opts: [
      { t: 'The committee delayed its decision because it lacked adequate data.', correct: true },
      { t: 'The committee never voted on the issue.', correct: false, trap: 'Extreme Wording', why: '"Never" קיצוני — המקור אמר "postponed".' },
      { t: 'The committee voted against the proposal.', correct: false, trap: 'Logical Reversal', why: 'המקור דיבר על דחייה, לא הצבעה נגד.' },
      { t: "The committee postponed due to the chair's absence.", correct: false, trap: 'Added Detail', why: '"Chair\'s absence" לא הוזכר במקור.' },
    ],
  },
  {
    orig: 'Increased exercise has been shown to improve cognitive performance.',
    opts: [
      { t: 'More physical activity is linked to better mental functioning.', correct: true },
      { t: 'Exercise cures all cognitive disorders.', correct: false, trap: 'Extreme Wording', why: '"Improve" ≠ "cure all".' },
      { t: 'Better cognition leads to more exercise.', correct: false, trap: 'Logical Reversal', why: 'הכיוון הפוך.' },
      { t: 'Running 5km daily improves cognition.', correct: false, trap: 'Added Detail', why: '"5km" לא הוזכר.' },
    ],
  },
  {
    orig: 'The study found that moderate coffee consumption was associated with lower rates of cognitive decline.',
    opts: [
      { t: 'Research suggests a link between moderate coffee intake and reduced cognitive decline.', correct: true },
      { t: 'Coffee consumption always prevents cognitive decline.', correct: false, trap: 'Extreme Wording', why: '"Always prevents" קיצוני מדי.' },
      { t: 'Cognitive decline causes people to drink more coffee.', correct: false, trap: 'Logical Reversal', why: 'הכיוון הפוך.' },
      { t: 'Drinking exactly two cups of coffee daily prevents Alzheimer\'s.', correct: false, trap: 'Added Detail', why: '"Two cups" ו-"Alzheimer\'s" לא הוזכרו.' },
    ],
  },
];

let qIdx = 0, score = 0, answered = false, trapDone = false;

export async function renderExplain(root) {
  await renderLayout(root, '/explain');
  qIdx = 0; score = 0;
  drawQ(getPageContent());
}

function drawQ(el) {
  if (qIdx >= QUESTIONS.length) { drawDone(el); return; }
  answered = false; trapDone = false;

  const q = QUESTIONS[qIdx];
  const shuffled = [...q.opts].sort(() => Math.random() - .5);
  const letters = ['A','B','C','D'];

  el.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.3rem">
        <button class="btn-exit" id="btn-exit">← יציאה</button>
        <span style="font-size:.75rem;color:var(--muted)">שאלה ${qIdx + 1} מתוך ${QUESTIONS.length}</span>
        <span style="font-size:.75rem;color:var(--muted)" id="score-lbl">ניקוד: ${score}</span>
      </div>

      <div style="font-size:.69rem;font-weight:700;color:var(--purple);text-transform:uppercase;margin-bottom:.5rem">משפט מקורי</div>
      <div class="ea-sentence">${q.orig}</div>
      <div style="font-size:.85rem;font-weight:700;margin-bottom:.7rem">בחר את הניסוח הנכון:</div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1rem" id="ea-opts">
        ${shuffled.map((o, i) => `
          <button class="ea-opt" data-correct="${o.correct}" data-trap="${o.trap||''}" data-why="${o.why||''}">
            <span class="ea-opt-letter">${letters[i]}</span>
            <span>${o.t}</span>
          </button>`).join('')}
      </div>

      <div id="phase2" style="display:none">
        <div id="result-banner"></div>
        <div style="font-size:.87rem;font-weight:700;margin-bottom:8px">🎯 מה הייתה המלכודת?</div>
        <div class="trap-chips" id="trap-chips">
          ${TRAP_LIST.map(t => `<button class="tchip" data-trap="${t}">${t}</button>`).join('')}
        </div>
        <div id="explain-box"></div>
        <div style="display:flex;justify-content:flex-end;margin-top:1rem">
          <button class="btn-pp" id="btn-next">הבא ←</button>
        </div>
      </div>
    </div>`;

  el.querySelector('#btn-exit').addEventListener('click', () => navigate('/rephrasing'));

  el.querySelectorAll('.ea-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      el.querySelectorAll('.ea-opt').forEach(o => o.classList.add('locked'));
      const ok = opt.getAttribute('data-correct') === 'true';
      opt.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) el.querySelectorAll('.ea-opt').forEach(o => { if (o.getAttribute('data-correct') === 'true') o.classList.add('correct'); });
      if (ok) score++;
      const banner = el.querySelector('#result-banner');
      banner.className = `result-banner ${ok ? 'ok' : 'ng'}`;
      banner.innerHTML = ok ? '<strong>✓ נכון!</strong> עכשיו זהה את הטריק.' : '<strong>✗ שגוי.</strong> זהה את הטריק ולמד.';
      el.querySelector('#phase2').style.display = 'block';
    });
  });

  el.querySelectorAll('.tchip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (trapDone) return;
      trapDone = true;
      el.querySelectorAll('.tchip').forEach(c => c.classList.add('locked'));
      const wrongOpt    = el.querySelector('.ea-opt.wrong');
      const correctTrap = wrongOpt?.getAttribute('data-trap') || '';
      const why         = wrongOpt?.getAttribute('data-why')  || '';
      const gotIt       = chip.dataset.trap === correctTrap && correctTrap !== '';
      chip.classList.add(gotIt ? 'correct' : 'miss');
      if (correctTrap) el.querySelectorAll('.tchip').forEach(c => { if (c.dataset.trap === correctTrap) c.classList.add('correct'); });
      if (gotIt) score++;
      el.querySelector('#explain-box').innerHTML = `
        <div class="explain-box">
          ${gotIt ? '<div class="bonus-pill">⭐ +1 בונוס!</div>' : ''}
          <strong>${gotIt ? 'נכון! ' : ''}מלכודת: ${correctTrap || '—'}</strong><br>${why || 'הניסוח שמר על אותה משמעות.'}
        </div>`;
    });
  });

  el.querySelector('#btn-next').addEventListener('click', () => { qIdx++; drawQ(el); });
}

function drawDone(el) {
  el.innerHTML = `
    <div class="srs-done fade-in">
      <div class="srs-done-emoji">🎉</div>
      <h2>סיימת! ניקוד: ${score}</h2>
      <p>כל שאלה לימדה אותך לזהות מלכודת. הניקוד מחושב גם לפי זיהוי הטריק.</p>
      <button class="btn-primary" id="btn-again">סשן חדש ←</button>
    </div>`;
  el.querySelector('#btn-again').addEventListener('click', () => { qIdx = 0; score = 0; drawQ(el); });
}
