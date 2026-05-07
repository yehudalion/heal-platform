import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

const TRAPS = [
  {
    key: 'Extreme Wording', name: 'Extreme Wording — ניסוח קיצוני',
    desc: 'השאלאים מחליפים מילים מתונות (<em>most, some, often</em>) במילים קיצוניות: <strong>always, never, all, none</strong>.',
    examples: [{ orig: 'The treatment is effective for most patients.', trap: 'The treatment is <strong>always</strong> effective.', correct: 'The treatment works for the majority of patients.', why: '"most" → "always": קיצוני ולא נכון.' }],
    quiz: { orig: 'Several studies suggest a link between sleep and memory.', opts: [{ t: 'Some research indicates a connection between sleep and memory.', c: true }, { t: 'All studies prove that sleep always improves memory.', c: false }] },
  },
  {
    key: 'Logical Reversal', name: 'Logical Reversal — היפוך לוגי',
    desc: 'סיבה ותוצאה מתחלפים. "A גורם ל-B" הופך ל-"B <strong>גורם</strong> ל-A".',
    examples: [{ orig: 'Economic instability led to political unrest.', trap: 'Political unrest <strong>caused</strong> economic instability.', correct: 'Economic instability resulted in political turmoil.', why: 'הכיוון הפוך — במקור הכלכלה גרמה לפוליטיקה.' }],
    quiz: { orig: 'The law was enacted in response to public pressure.', opts: [{ t: 'The law led to increased public pressure.', c: false }, { t: 'Public demand prompted the enactment of the law.', c: true }] },
  },
  {
    key: 'Added Detail', name: 'Added Detail — פרט שנוסף',
    desc: 'הניסוח מוסיף מידע שלא היה במקור. הכלל: אם לא נאמר <strong>במפורש</strong> — זו מלכודת.',
    examples: [{ orig: 'Researchers found a link between diet and health.', trap: 'Researchers found that a <strong>Mediterranean</strong> diet improves health.', correct: 'Scientists discovered a connection between nutrition and wellbeing.', why: '"Mediterranean" לא הוזכר במקור.' }],
    quiz: { orig: 'The university announced plans to expand its campus.', opts: [{ t: 'The university announced a $50 million expansion.', c: false }, { t: 'The university revealed plans to enlarge its campus.', c: true }] },
  },
  {
    key: 'Scope Distortion', name: 'Scope Distortion — עיוות היקף',
    desc: 'הרחבה לא מוצדקת (<em>some → all</em>) או צמצום (<em>always → sometimes</em>).',
    examples: [{ orig: 'Some students struggle with standardized testing.', trap: 'Students <strong>generally</strong> struggle with testing.', correct: 'Certain students find standardized exams challenging.', why: '"some" → "generally" מרחיב שלא כדין.' }],
    quiz: { orig: 'A few participants reported side effects.', opts: [{ t: 'Most participants experienced side effects.', c: false }, { t: 'Some participants reported adverse effects.', c: true }] },
  },
  {
    key: 'Synonym Confusion', name: 'Synonym Confusion — בלבול עוצמת מילה',
    desc: 'מילה שנראית נרדפת אך עוצמתה שונה. <em>suggest ≠ prove</em>, <em>limit ≠ prevent</em>.',
    examples: [{ orig: 'The data suggests a correlation between the variables.', trap: 'The data <strong>proves</strong> a causal relationship.', correct: 'The findings indicate a link between the two variables.', why: '"suggest/correlation" ≠ "prove/causal".' }],
    quiz: { orig: 'The policy aims to reduce carbon emissions.', opts: [{ t: 'The policy guarantees elimination of carbon emissions.', c: false }, { t: 'The policy seeks to lower carbon output.', c: true }] },
  },
  {
    key: 'Wrong Inference', name: 'Wrong Inference — הסקה שגויה',
    desc: 'הניסוח מסיק מסקנה שלא נאמרה. Restatement חייב להיצמד למה שנאמר <strong>במפורש</strong>.',
    examples: [{ orig: 'The company reported lower profits this quarter.', trap: 'The company is facing <strong>financial difficulties</strong>.', correct: 'The company experienced reduced earnings this quarter.', why: '"lower profits" ≠ "financial difficulties".' }],
    quiz: { orig: 'The author published three books in five years.', opts: [{ t: 'The author is considered highly prolific.', c: false }, { t: 'The author released three works in five years.', c: true }] },
  },
];

let step = 0, quizDone = false;

export async function renderTrapTrainer(root) {
  await renderLayout(root, '/trap-trainer');
  step = 0; quizDone = false;
  drawStep(getPageContent());
}

function drawStep(el) {
  const T = TRAPS[step];
  quizDone = false;

  const dots = TRAPS.map((_, i) =>
    `<div class="tt-dot${i < step ? ' done' : i === step ? ' active' : ''}"></div>`).join('');

  const exHtml = T.examples.map(e => `
    <div class="ex-card">
      <div class="ex-lbl">משפט מקורי</div>
      <div class="ex-text">"${e.orig}"</div>
      <div style="margin:6px 0"><span class="tag-bad">✗ מלכודת — ${T.key}</span></div>
      <div class="ex-text bad">"${e.trap}"</div>
      <div class="ex-why">⚠️ ${e.why}</div>
      <div style="margin-top:6px"><span class="tag-good">✓ נכון</span></div>
      <div class="ex-text good">"${e.correct}"</div>
    </div>`).join('');

  const shuffled = [...T.quiz.opts].sort(() => Math.random() - .5);

  el.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">
        <div class="tt-dots">${dots}</div>
        <span style="font-size:.75rem;color:var(--muted);white-space:nowrap">${step + 1}/${TRAPS.length}</span>
        <button class="btn-exit" id="btn-exit">✕ יציאה</button>
      </div>

      <div class="tt-info-box">
        <div class="tt-info-badge">קטגוריה ${step + 1}</div>
        <div class="tt-info-name">${T.name}</div>
        <div class="tt-info-desc">${T.desc}</div>
      </div>

      <div class="sec-title" style="margin-top:1rem">דוגמאות</div>
      ${exHtml}

      <div class="quiz-box">
        <div class="quiz-q">🎯 תרגיל — איזה הוא ניסוח המלכודת?</div>
        <div class="quiz-orig">"${T.quiz.orig}"</div>
        <div class="quiz-opts" id="quiz-opts">
          ${shuffled.map(o => `<button class="qopt" data-c="${o.c}">${o.t}</button>`).join('')}
        </div>
        <div class="quiz-fb" id="quiz-fb"></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1.2rem">
        <span style="font-size:.79rem;color:var(--muted)" id="tt-info-lbl">ענה על תרגיל הזיהוי כדי להמשיך</span>
        <button class="btn-pp" id="btn-next" disabled>${step < TRAPS.length - 1 ? 'הבא ←' : 'סיום ←'}</button>
      </div>
    </div>`;

  el.querySelector('#btn-exit').addEventListener('click', () => navigate('/rephrasing'));
  el.querySelector('#btn-next').addEventListener('click', () => {
    if (step < TRAPS.length - 1) { step++; drawStep(el); }
    else navigate('/rephrasing');
  });

  el.querySelectorAll('.qopt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (quizDone) return;
      quizDone = true;
      const isTrap = opt.getAttribute('data-c') === 'false';
      el.querySelectorAll('.qopt').forEach(o => o.classList.add('locked'));
      const fb = el.querySelector('#quiz-fb');
      if (isTrap) {
        opt.classList.add('correct');
        fb.className = 'quiz-fb ok';
        fb.textContent = '✓ נכון! זיהית את המלכודת.';
      } else {
        opt.classList.add('wrong');
        el.querySelectorAll('.qopt').forEach(o => { if (o.getAttribute('data-c') === 'false') o.classList.add('correct'); });
        fb.className = 'quiz-fb ng';
        fb.textContent = '✗ לא בדיוק — המלכודת הייתה האפשרות השנייה.';
      }
      el.querySelector('#btn-next').disabled = false;
      el.querySelector('#tt-info-lbl').textContent = '';
    });
  });
}
