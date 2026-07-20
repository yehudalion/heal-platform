# HighScore — Architecture & Project Rules
**Version:** 1.2  
**Last Updated:** 2026-05-24

---

## TL;DR — Absolute Rules (קרא תמיד)

> **For AI assistants:** Read this TL;DR section in every session.  
> Read the full document only when: (1) building a new feature, (2) modifying database schema, (3) explicitly asked to "Review Architecture". For small UI tweaks or bug fixes — TL;DR is enough.

### Hard Rules (no opt-out):
1. **Auth:** Every FK to a user → `auth.users(id)`, never `user_profiles`.
2. **Persistence:** User data → Supabase. localStorage only for UI state.
3. **Two-AI Workflow:** No AI-generated content reaches users without calibration.
4. **No ads, ever, in-app.**
5. **No wellbeing-harming mechanics** (no hearts, no punishment for mistakes).
6. **DB Integrity in SRS:** Only the FIRST rating a word receives in a session may be written to the database. Subsequent intra-session ratings are UI-only. Violating this poisons the SRS algorithm permanently for that user.

### Strong Rules (opt-out requires explicit Lion approval):
6. **3-Layer Rule:** Every major section = Learn / Practice / Analyze.
7. **Hebrew-First:** UI in Hebrew RTL. English only inside exercise content.
8. **Impact Score:** `words.impact_score` is the only basis for word selection. `tier` is a label, not an algorithm input.
9. **Extensible Simplicity:** Build simple now, schema/code must accommodate future complexity.
10. **"What to Pay Attention To":** UI term. Backend keeps `trap_type`.
11. **Data Layer Separation:** All DB calls in `src/data/` modules. No direct Supabase calls from screens.

### Guidelines:
12. Tone: professional, warm, never cheap.
13. Mobile-first, desktop-supported.
14. No placeholder content reaches users.

### The Intelligent Override Clause:
If strict adherence to a **Strong Rule** or **Guideline** would degrade UX, add unnecessary friction, or create bad code — pause and ask Lion for an explicit opt-out with reasoning. AI should be a smart advisor, not a rigid robot. **Hard Rules cannot be overridden — they protect security, integrity, and wellbeing.**

---

## 1. Product Identity

**Name:** HighScore (used both internally and publicly)  
**Mission:** End-to-end preparation platform for the Hilal English exam (Israel, December 2026 onward).  
**Target audience:** Any Israeli candidate sitting for the Hilal exam — not limited to medical students.  
**Tagline:** הפלטפורמה הראשונה והיחידה בישראל שמכינה אותך להלאל מקצה לקצה.

---

## 2. Rules Detail

### 2.1 The Intelligent Override Clause
AI assistants working on this codebase are expected to use judgment. If a rule would, in a specific situation:
- Significantly degrade user experience
- Add friction that serves no real purpose
- Force ugly or unmaintainable code
- Conflict with another rule

…then **pause and propose an opt-out with reasoning**. Do not silently violate the rule, and do not robotically follow it. Wait for Lion's explicit approval.

**Hard Rules are exempt from override.**

### 2.2 The 3-Layer Rule (Strong)
Every major content section MUST have three layers:

1. **Learn (לימוד)** — Onboarding for the question type. Teaches the relevant keys explicitly — the number of keys is determined by the content of the section, not by a fixed number. Shown once before first practice + available on demand.
2. **Practice (תרגול)** — Core activity loop.
3. **Analyze (ניתוח אישי)** — Session summaries + cumulative pattern reports.

### 2.3 The Hint Button Rule — Mastery-Based (Strong)
The "💡 Hint" button is available by default on every question.

It becomes **optional (visible only on click)** after the user demonstrates mastery of the relevant key — defined as **3 correct consecutive answers on questions where that key is the critical one**.

Mastery is tracked **per key, not per section.** A user can master "מפתח הכיוון" while still receiving prominent hints for "מפתח העוצמה".

If accuracy on a mastered key drops below 70% across the next 10 questions, the hint becomes prominent again.

### 2.4 The Hebrew-First Rule (Strong)
- All UI text in Hebrew (RTL).
- English appears only inside exercise content.
- All labels, buttons, navigation, feedback → Hebrew.

### 2.5 The Authentication Rule (Hard — no override)
Every foreign key referencing a user MUST point to `auth.users(id)`.

`user_profiles` holds *content* of the user account, not *identity*.

### 2.6 The "What to Pay Attention To" Rule (Strong)
Database/code keeps `trap_type`, `trap_classification`.  
UI uses "💡 למה לשים לב", concept "מפתחות".

### 2.7 The Persistence Rule (Hard — no override)
User-generated data → Supabase, never solely localStorage.

`localStorage` allowed only for:
- UI state (last tab, scroll position)
- Pre-auth onboarding draft
- Performance caches that can be regenerated

### 2.8 The Impact Score Rule (Strong)
`words.impact_score` = single source of truth for word selection.  
`words.tier` = marketing label only.

Three pedagogical levels derived from `impact_percentile`:
- **מילות ליבה** — Top 10%
- **מילות יתרון** — Top 11–40%
- **מילות העשרה** — Bottom 60%

### 2.9 The Wellbeing Rule (Hard — no override)
No mechanism may punish mistakes or create artificial scarcity. Mistakes are framed as learning opportunities.

### 2.10 The Two-AI Workflow — Calibration Batch Method (Hard — no override)
1. **Generation:** AI creates a small batch (10–15 items).
2. **Calibration Review:** Lion reviews each item, corrects, explains.
3. **Iteration:** AI regenerates with corrections.
4. **Calibration Pass:** When a batch reaches 100% (zero corrections) → AI cleared for autonomous bulk generation.
5. **Random QA on Bulk:** In every large batch (50+ items), Lion samples 5–10% randomly. If 2+ items fail → return to step 1.
6. Content guidelines captured in `CONTENT_GUIDELINES.md`, updated each cycle.

### 2.11 The Data Layer Separation Rule (Strong)
All database interactions MUST go through dedicated data modules in `src/data/`. Screens, components, and lib functions must NEVER call `supabase` directly.

- `src/supabase.js` — only the client initialization and auth helpers
- `src/data/*.data.js` — one file per domain (words, srs, profiles, rephrase, listening)
- The user profile data file is named **`profiles.data.js`**, NOT `users.data.js` (to avoid confusion with Supabase `auth.users`)
- Each data module exports named async functions with clear contracts
- Errors are caught at the data layer, returned as `{ data, error }` objects

This keeps the codebase testable, maintainable, and allows future migration to a different backend without rewriting all screens.

### 2.12 The Extensible Simplicity Rule (Strong)
Build simple but extensible:
- DB schemas include columns for v2/v3 features (kept NULL in v1)
- Functions accept optional future-feature parameters
- UI has clear extension points (slots, props, feature flags)

The opposite — "build it tight for now, refactor later" — is forbidden.

### 2.13 The Content-Quality Rule (Guideline)
No placeholder content reaches users. Hide unready features behind feature flags.

"50 excellent questions" > "200 mediocre questions."

### 2.14 The DB Integrity Rule — Anti-Poisoning (Hard — no override)
When a word is re-shown within the same session (after 'Again' or 'Hard'), the student's second rating is powered by short-term working memory, NOT long-term retention. Writing this rating to the SRS database would corrupt the algorithm's understanding of the user's actual memory state.

**The rule:** Only the FIRST rating a word receives in a given session is written to `srs_progress` and `srs_review_log`. All subsequent intra-session ratings on the same word affect only the local session queue and the analyze summary — never the database.

This rule has no exceptions. It is enforced at the screen level (`card.js` tracks `firstRatings` per word per session).

### 2.15 The Session Queue Rule — Hostage Protection (Strong)
A student must not leave a session with words they failed to recall. When a word is rated 'Again' or 'Hard', it is re-queued within the same session (offset 2 cards for 'Again', 5 cards for 'Hard') and the student must eventually rate it 'Good' for the session to progress past it.

**The cap:** Each word may be re-queued at most 2 times per session (3 total appearances). After hitting the cap, the word is removed from the queue regardless of rating, and is handed off to the SRS algorithm to schedule for tomorrow. This prevents fatigue-driven mis-ratings ('Good' clicked just to escape).

### 2.16 The Audio Rule — Always Manual (Strong)
Audio playback is never automatic. Word audio, sentence audio, and (future) lecture audio all require explicit user interaction (clicking a 🔊 button). Auto-play creates surprise, breaks focus, and is hostile to users in shared spaces.

### 2.17 The Tier Invisibility Rule (Strong)
The `words.tier` and `words.impact_score` / `words.impact_percentile` fields are never exposed to the student in the UI. They are internal-only — used by the algorithm and by marketing copy. Showing 'Tier A' or 'impact 67.2' to a learner creates cognitive load without pedagogical value.

### 2.18 The Single-Source Explanation Rule (Strong)
Pedagogical explanations of HOW a section works (cards, SRS, keys, listening format) belong exclusively in the Learn screen (`vocab-learn.js`, `rephrase-learn.js`, `listening-learn.js`) of that section.

Landing pages (`/flashcards`, `/rephrasing`) must NOT duplicate these explanations. Their job is to show stats and provide the 'Start Practice' button. Explanations live in one place — the Learn screen — accessible always via the '?' button from Practice.

### §2.19 רישוי תוכן — חובת מקוריות מוחלטת

**כלל קשיח, ללא יוצא מן הכלל.** כל פיסת תוכן בפרויקט — כל שאלה, 
כל מסיח, כל הסבר, כל דוגמה, כל משפט אנגלי שהתלמיד רואה — חייבת 
להיות אחת משתי האפשרויות הבאות:

1. **נוצרה על ידינו** (Lion, מודלים בהנחייתנו, חברי צוות שלנו)
2. **מורשית במפורש** ברישיון שמתיר שימוש מסחרי ויצירת נגזרות

**מקורות אסורים (רשימה לא ממצה):**
- מבחנים פסיכומטריים של המרכז הארצי לבחינות והערכה (NITE)
- חוברות הכנה רשמיות (אמיר, אמירם, אמיר"ם, מבחני בגרות באנגלית)
- ספרי לימוד מסחריים ללא רישיון מפורש
- תוכן שחולץ מ-PDFs של מבחנים מוגנים זכויות יוצרים
- שאלות שנגרדו מאתרי הכנה (Psychometry.co.il, נושאון, וכו')
- כל תוכן שצריך להחליט "האם זה fair use" — אם צריך להחליט, התשובה לא

**חריג מותר: ניתוח דפוסים (לא תוכן):**
- ניתוח סטטיסטי של דפוסי מסיחים במבחנים פומביים — מותר
- ציטוט קצר (פחות מ-15 מילים) לצורך הדגמה במסמכים פנימיים — מותר
- טקסונומיות של סוגי שאלות — מותר (מנתחות מבנה, לא תוכן)

**משמעות מעשית למצב הנוכחי:**
- 520 השאלות שחולצו מ-PDFs של NITE — אסורות לשימוש בפרודקשן
- שאלות סינתטיות הקיימות ב-`restatement_questions` — מותרות אם נוצרו 
  על ידינו (Lion + Claude) במסגרת הפרויקט
- כל תוכן עתידי (T041a, T041b ואילך) חייב להיות מקורי 100%

**בדיקת חובה לפני כל משימת תוכן:**
לפני שמייצרים, מייבאים, או מתקנים תוכן בפרויקט, יש לענות על:
1. האם אנחנו יצרנו את זה בעצמנו?
2. האם יש לנו רישיון מפורש?
אם התשובה לשניהם "לא" — לעצור ולשאול את Lion.

---

## 3. Technical Stack

### 3.1 Frontend
- Vite + Vanilla JavaScript
- Custom hash-based router in `src/router.js` with `route(path, handler)` + `Maps(path)`
- Each screen = function receiving `rootEl`

### 3.2 Backend
- Supabase (PostgreSQL)
- Project: `https://opjtromnkdgehlqeaqzi.supabase.co`
- Audio: Supabase Storage, public bucket `heal-audio`

### 3.3 Authentication
- Google OAuth (primary), Magic link email (fallback)

### 3.4 RLS
- Currently disabled in development
- Must be enabled pre-launch (tracked in TASKS.md)

---

## 4. Documentation Structure

The project maintains the following active documents:

| File | Purpose | Read When |
|---|---|---|
| `ARCHITECTURE.md` | Rules, stack, structure | New feature / schema change / "Review Architecture" |
| `STATE.md` | What works / what doesn't right now | Each session start |
| `TASKS.md` | Active tasks by priority | Each session start |
| `FUTURE_FEATURES.md` | Deferred features with rebuild plans | When considering deferred work |
| `STRATEGY_NOTES.md` | Marketing, pricing, branding, business decisions | When making business decisions |
| `CONTENT_GUIDELINES.md` | Rules for AI-generated content quality | Each content generation session |
| `METHODOLOGY.md` | Impact score formula | When debating word selection logic |

### 4.1 What Goes Where

- **Technical decision** → `ARCHITECTURE.md` (Decision Log)
- **Feature idea for future** → `FUTURE_FEATURES.md`
- **Business thought** → `STRATEGY_NOTES.md`
- **Current bug or unfinished work** → `STATE.md` + `TASKS.md`
- **Learned lesson** → `ARCHITECTURE.md` (Lessons Learned, see 9)

---

## 5. Code Organization

### 5.1 Project Structure

### 5.2 Layer Responsibilities

| Layer | Responsibility | May Talk To |
|---|---|---|
| `screens/` | Render UI, handle user interactions | `data/`, `components/`, `lib/` |
| `components/` | Reusable UI pieces, presentational | `lib/` (for pure logic only) |
| `data/` | All Supabase calls, error handling | `supabase.js` |
| `lib/` | Pure logic, algorithms, no side effects | Nothing (pure functions) |
| `supabase.js` | Client init + auth | External Supabase only |

**Rule:** Dependencies flow downward. A `lib/` file may never import from `screens/` or `data/`.

### 5.3 Naming Conventions
- Files: kebab-case (`vocab-practice.js`)
- Data modules: `{domain}.data.js`
- JavaScript functions/variables: camelCase
- Database tables: snake_case
- Database columns: snake_case
- CSS classes: kebab-case with BEM-lite

---

## 6. Business Model

See `STRATEGY_NOTES.md` for full business strategy.

Summary:
- **Free tier:** 200 top-impact words + sampling of each exercise type + 1 mock sim
- **Premium:** 89₪/month, 199₪/3-month, 299₪/until-exam
- **Teacher partner program:** 15-20% commission, primary growth channel
- **No ads, no rewarded video, ever**

---

## 7. UX/UI Principles

### 7.1 Tone
Professional but warm. Compliments are specific and earned.

### 7.2 Visual Language
Generous whitespace, 1–2 accent colors, quality fonts, subtle animations, deliberate emojis only.

### 7.3 Responsiveness
Mobile-first. Desktop fully supported.

### 7.4 Accessibility
WCAG AA, keyboard navigable, audio with on-screen controls.

---

## §8 — סוגי מסיחים (Trap Types) ל-Sentence Rephrasing

מסך התרגול מציג שאלת רפראז: משפט מקור באנגלית + 4 חלופות. אחת מהן 
היא פראפראזה לוגית של המקור, שלוש האחרות הן מסיחים. כל מסיח מתויג 
ב-trap_type המבטא את המנגנון שלו.

המקורות לטקסונומיה: ניתוח של 100 שאלות אמיתיות ממבחני NITE (ראה 
`highscore_rephrase_taxonomy.docx`), שזיהה 7 קטגוריות מאקרו. R1-R7 
מקבילים ל-6 מתוך 7 הקטגוריות; R8 נוסף כדי לכסות את ATTRIBUTE_DRIFT 
שלא היה מיוצג קודם.

### R1 — שפת מוחלטות (SCOPE_SHIFT: ניפוח)

הוספת ניסוח קיצוני שלא במקור: "כל", "תמיד", "ללא יוצא מן הכלל", 
"כולם", "היחיד".

**דוגמא:** המקור: "Gardening is a popular pastime."  
המסיח: "Everyone enjoys a beautiful garden." (פופולרי → כולם)

### R2 — היפוך סיבתי (REVERSAL: סיבה⇄תוצאה)

A גורם ל-B הופך ל-B גורם ל-A. הרכיבים זהים, כיוון הסיבתיות התחלף.

**דוגמא:** המקור: "Prolonged stress erodes executive function."  
המסיח: "Deteriorating executive function generates persistent stress."

### R3 — סיבה מפוברקת (FABRICATION: הוספת הסבר)

הוספת הסבר סיבתי שלא קיים במקור. המסיח שומר על העובדות אבל מוסיף 
"because" / "due to" / "as a result of" שלא נאמר.

**דוגמא:** המקור: "Mammals reduce metabolism during hibernation."  
המסיח: "Because cold exposure triggers stress, mammals reduce 
metabolism during hibernation." (סיבה מפוברקת)

### R4 — צמצום לא מוצדק (SCOPE_SHIFT: צמצום)

הגבלה לסוג/דוגמא ספציפית שלא הוזכרה במקור. הפוך מ-R1: כאן ההיקף 
מצטמצם במקום להתנפח.

**דוגמא:** המקור: "Microfinance institutions serve excluded entrepreneurs."  
המסיח: "Specifically Grameen Bank-style organizations serve excluded 
entrepreneurs." (כללי → ספציפי)

### R5 — היפוך תוצאה/מטרה (REVERSAL: וקטור התוצאה)

X חיזק את Y הופך ל-X החליש את Y. אותם רכיבים, התוצאה הפוכה.

**דוגמא:** המקור: "Excessive taxation undermined the legitimacy of rulers."  
המסיח: "Excessive taxation reinforced the legitimacy of rulers."

### R6 — החלפת סוכן (AGENT_SWAP)

A פועל על B הופך ל-B פועל על A. הקורבן הופך לפעיל, המאמץ למאמצן.

**דוגמא:** המקור: "The Hundred Years' War inflicted misery on France."  
המסיח: "France devastated its enemies in the Hundred Years' War." 
(קורבן → תוקף)

### R7 — היפוך רצף זמני (TEMPORAL_SHIFT)

סדר אירועים הופך. המקור: A קדם ל-B. המסיח: B קדם ל-A.

**דוגמא:** המקור: "Greater biodiversity enhances productivity."  
המסיח: "Once productivity was achieved, biodiversity emerged afterward."

### R8 — הסחת תכונה (ATTRIBUTE_DRIFT) ⭐ חדש

המסיח מחליף את התכונה שעליה מדובר במשפט. המקור עוסק בתכונה X של 
הנושא; המסיח מחליף את התכונה ל-Y, גם אם Y הוא תכונה לגיטימית אחרת 
של אותו נושא. השפה והאוצרי המילים נראים דומים מאוד למקור, אבל הציר 
התוכני זז.

זוהי הקטגוריה הכי שכיחה בדאטה האמיתי של NITE (35% מהמסיחים, לפי 
הניתוח של 100 שאלות מ-64 PDFs).

**דוגמא:** המקור: "Gardening is a popular pastime."  
המסיח: "Gardening is very time-consuming." (פופולריות → זמן)

### תיוג ב-DB — מודל v4 (בתוקף מ-14.7.2026)

> ⚠️ **ARCHIVED — המודל הישן (v3.1):** עמודות `trap_type_1/2/3` ו-`green_type` הוסרו מה-DB
> במיגרציה `20260714184952_rephrase_v4_clean_slate`. ערכי R1–R8 הישנים כבר אינם בתוקף.
> הסעיף נשמר להיסטוריה בלבד — אין לייצר לפיו תוכן חדש.

מודל v4 מפריד שלושה צירים עצמאיים (חולץ מ-116 פריטים אמיתיים, 15 מבחנים רשמיים 2021–2025).
המקור המלא: `docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md`.

**ציר 1 — מנגנון (`mechanism_1/2/3`, טקסט, R-codes).** שבעה מנגנונים. `R4` מוזג לתוך `R3`;
`R8` הוצא משימוש.

| קוד | מנגנון | שכיחות |
|---|---|---|
| **R7** | חברים כוזבים / שיבוש לקסיקלי (מילה קרובת-צליל, משמעות שגויה) | **25% — השכיח ביותר** |
| R3 | הוספת תוכן (סיבה או פרט שאינו בגזע; קלט את R4 הישן) | 18% |
| R2 | היפוך כיוון/משמעות לוגית | 17% |
| R1 | הקצנה (hedge→absolute, עובדה↔דעה) | 14% |
| R6 | החלפת נושא/רפרנס/סקופ (מי-עשה-למי) | 11% |
| R5 | השמטת רכיב מהותי | 7% |
| R9 | היפוך זמן/רצף | 7% |

כלל-הכרעה סגור בין R7 ל-R3: **החלפת מילה אחת = R7; הוספת רכיב שלם = R3.**

**ציר 2 — קרבה (`proximity_1/2/3`, טקסט).** ציר נפרד ובלתי-תלוי במנגנון.
נאכף ב-DB ע"י CHECK constraint `restatement_questions_proximity_valid`:
ערך חוקי הוא `P1` / `P2` / `P3` בלבד (או NULL).

| קוד | קרבה | שכיחות |
|---|---|---|
| P1 | פסילה גסה — ניכרת גם בלי השוואה לגזע | 23% |
| **P2** | **פסילה עדינה — נפסלת רק בהשוואה מודעת לגזע** | **62% — רוב המסיחים** |
| P3 | תאומה — כמעט-זהה לנכונה, יחס/מילה אחת הפוכה | 15% |

**ציר 3 — טרנספורמציות (`transformations`, טקסט, G-codes).** מתארות את **התשובה הנכונה**,
לא את המסיחים. G1–G9:

| קוד | טרנספורמציה | שכיחות |
|---|---|---|
| G1 | החלפת מילים נרדפות | 81% |
| G2 | פעיל↔סביל | 21% |
| G3 | שינוי מבנה תחבירי/סדר | 37% |
| G4 | החלפת נקודת מבט/רפרנס | 15% |
| G5 | פישוט | 9% |
| G6 | פירוק מילה דחוסה | ~33–38% |
| G7 | החלפת/מחיקת מילת קישור | 19% |
| G8 | הזזת כמת | 16% |
| G9 | נומינליזציה↔פועל + היפוך כיוון | 31% |

עמודות תומכות: `relation_count` (מספר היחסים הלוגיים בגזע), `hard_word_count`, `recipe`
(מזהה כרטיס-מתכון, למשל `CAL-V4-L2`).

### קיבוץ למסך Learn — ⚠️ ARCHIVED (הוחלף ב-2026-07-20)

> ⚠️ **ARCHIVED — בוטל.** הקיבוץ ל-4 משפחות למטה הוחלף במיפוי הרשמי של 5 מפתחות
> ב-CONTENT_GUIDELINES.md §1.3 (טבלת "7 מנגנוני R → 5 מפתחות"). המקור היחיד לתרגום
> trap_type→מפתח הוא הטבלה שם. הבלוק למטה נשמר להיסטוריה בלבד — אין לבנות UI לפיו.
> הערה: הבלוק הישן התייחס ל-R4/R8 שכבר אינם בטקסונומיית v4.

ההצגה לתלמיד תקבץ את שמונת הסוגים לארבע משפחות-על:

| משפחה | כולל | משמעות לתלמיד |
|---|---|---|
| היפוך | R2, R5 | "כיוון התחלף — בדוק מי גורם, מי תוצאה" |
| הזזת היקף | R1, R4 | "כמתים — האם המקור באמת אומר 'כולם'?" |
| הוספה | R3 + הוספות אחרות | "המקור לא אמר את זה — נוסף מבחוץ" |
| החלפה | R6, R7, R8 | "מה התחלף — הסוכן, הזמן, או התכונה?" |

---

## 9. Lessons Learned

| Date | Lesson | Context |
|---|---|---|
| 2026-05-24 | Don't over-engineer before users exist | Listening grew to 7 tables with hard_mode unlocks before a real user touched it |
| 2026-05-24 | Hardcoded numbers in rules are arbitrary | "5 keys", "5 questions" → replaced with content-driven and mastery-based logic |
| 2026-05-24 | AI content needs calibration, not per-item review | Per-item approval doesn't scale |
| 2026-05-24 | Data layer must be separated from screens early | Otherwise `supabase.js` becomes a 1,500-line dumping ground |
| 2026-05-26 | Working memory ≠ long-term memory in SRS data | A 'Good' clicked 2 minutes after seeing the word does not mean the user knows it long-term. Must be filtered before reaching the DB. |
| 2026-05-26 | Hostage situations create data poisoning | If a student can't escape a word, they will mis-click to escape the app. Cap re-queues to prevent this. |
| 2026-05-26 | Stale STATE.md notes can mislead planning | We had 'mnemonic_2/3 empty' in STATE.md when in fact the DB was fully populated. Always verify with a query before acting on documented state. |

---

## 10. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-24 | Path B: clean foundation rebuild | DB had too many violations to incrementally fix |
| 2026-05-24 | "Traps" → "למה לשים לב" in UI only | Cultural friction in Hebrew market |
| 2026-05-24 | Teacher partner program from launch | Realistic conversion math too slow with only organic growth |
| 2026-05-24 | No in-app ads, ever | Tone + math + brand integrity |
| 2026-05-24 | HighScore = both internal & public name | Simplicity, keeps options open |
| 2026-05-24 | Intelligent Override Clause adopted | AI should be advisor, not rigid robot |
| 2026-05-24 | Calibration Batch over per-item approval | Time efficiency without sacrificing quality |
| 2026-05-24 | Hint button mastery-based (3 streak per key) | Performance-based, not arbitrary count |
| 2026-05-24 | Data layer in `src/data/`, screens never touch Supabase directly | Maintainability + future testability |
| 2026-05-24 | Layout components (navbar, audio-player, etc.) factored out from day one | Prevent duplication, prepare for complex audio in future |
| 2026-05-24 | `profiles.data.js` (not `users.data.js`) | Avoid Supabase `auth.users` naming conflict |
| 2026-05-26 | Rating buttons: 3, not 4 (no 'Easy') | 'Easy' overlaps with 'Good' in practice; users hesitate between them. SM-2 in srs.data.js still supports 4 ratings for future flexibility, but UI only exposes 3. |
| 2026-05-26 | Session queue logic in frontend, not DB | 'Again'/'Hard' re-queues a word within the session (offset 2/5 cards). Cap of 2 re-queues prevents infinite loop. Local state only — does not touch DB. |
| 2026-05-26 | DB Integrity Rule (Hard) | Only first rating per word per session writes to DB. Prevents algorithm poisoning from working-memory recalls. |
| 2026-05-26 | Definition splitting at frontend | `definition_he` is a single string ('מתאים, ראוי, הולם'). Main definition = parts[0], extras = parts.slice(1), split client-side. If true polysemy is needed later, separate DB column will be added. |
| 2026-05-26 | Audio is always manual | Auto-play removed across vocab card screens. Applies to word audio and sentence audio. |
| 2026-05-26 | Tier/impact invisible to student | `Tier A`, `impact 67.2` etc. removed from all student-facing UI. Internal use only. |
| 2026-05-26 | Explanations live in Learn screens only | Removed duplicate SRS-explanation accordion from `/flashcards`. The Learn screen is the canonical place. |

### 2026-05-27 — חובת מקוריות תוכן + הרחבת ספריית השאלות

**ההחלטה:** לא משתמשים בשאלות מ-NITE או ממקור מוגן זכויות יוצרים 
אחר. כל תוכן בפרודקשן חייב להיות מקורי או מורשה מפורשות. בנוסף, 
הוחלט להרחיב את ספריית השאלות מ-199 ל-517 שאלות לפני לאנץ' מסחרי.

**הקשר:** במהלך ניתוח של 64 PDFs של מבחני NITE לצורך הבנת טקסונומיית 
המסיחים, חולצו 520 שאלות שאומתו מול מפתחות תשובות רשמיים. הצעה לטעון 
אותן ל-DB ולהשתמש כתוכן Practice נדחתה משום הפרה ברורה של זכויות 
יוצרים של המרכז הארצי.

**מה כן נשמר מהניתוח:** הטקסונומיה (7 קטגוריות מאקרו), הסטטיסטיקות 
(35% ATTRIBUTE_DRIFT וכו׳), ההמלצות לרובריקת קושי, ההמלצה להוסיף R8.

**מה לא נשמר:** 520 השאלות עצמן, ה-catalog JSONs עם משפטי מקור מלאים, 
ה-CSV הישן. אסור לטעון אותם ל-DB.

**פיצול משימת התוכן:**
- T041a: יייצר 200 שאלות מקוריות לרמות 1+2 (100 לכל רמה). חוסם T043 
  (Practice) — חייב להסתיים לפני שאפשר לחשוף Practice לתלמידים.
- T041b: יייצר 118 שאלות מקוריות לרמות 3+5 (56 לרמה 3, 62 לרמה 5). 
  לא חוסם MVP אבל חובה לפני לאנץ' מסחרי לאיזון הספרייה.
- רמה 4 (117 שאלות) — נשארת כפי שהיא.

**יעד פילוג סופי ב-DB:**
| רמה | יעד | פעולה |
|---|---|---|
| 1 | 100 | T041a +100 |
| 2 | 100 | T041a +100 |
| 3 | 100 | T041b +56 |
| 4 | 117 | (שמירה) |
| 5 | 100 | T041b +62 |

### 2026-05-27 — הוספת R8 (ATTRIBUTE_DRIFT) ותיעוד מלא של R1-R8

**ההחלטה:** הרחבת טקסונומיית סוגי המסיחים מ-R1-R7 ל-R1-R8. עדכון §8 
לתיעוד מלא של כל 8 הסוגים.

**הקשר:** ניתוח של 100 שאלות אמיתיות מ-NITE זיהה ש-35% מהמסיחים 
שייכים לקטגוריה ATTRIBUTE_DRIFT (הסחת תכונה) שלא הייתה מיוצגת ב-R1-R7. 
זו הקטגוריה הגדולה ביותר בדאטה. בנוסף, R6 ו-R7 קיימים ב-DB אך לא 
היו מתועדים — עם 73 ו-73 שאלות לכל אחד.

**אין שינוי schema ב-DB:** עמודות `trap_type_*` הן text ללא constraint. 
R8 מותר כברירת מחדל.

> ⚠️ **ARCHIVED (14.7.2026) — ההחלטה הזו בוטלה.** v4 החליף את הטקסונומיה כולה:
> `R8` **הוצא משימוש**, `R4` **מוזג לתוך R3**, ונותרו שבעה מנגנונים (R1, R2, R3, R5, R6, R7, R9).
> קטגוריית ATTRIBUTE_DRIFT שתוארה כאן נגזרה מ-100 שאלות; הניתוח מחדש על **116 פריטים אמיתיים
> מ-15 מבחנים רשמיים (2021–2025)** לא שחזר אותה כציר עצמאי.
>
> **וגם שינוי ה-schema כן קרה בסוף:** עמודות `trap_type_*` ו-`green_type` **הוסרו** מה-DB,
> והוחלפו ב-`mechanism_1/2/3` + `proximity_1/2/3` + `transformations` — עם CHECK constraint
> על ערכי ה-proximity. ראה §8 (מודל v4) ומיגרציה `20260714184952_rephrase_v4_clean_slate`.
> הסעיף נשמר להיסטוריה בלבד.

**הצעד הבא:** במסך Learn (T042) להציג את 8 הסוגים מקובצים ב-4 משפחות-על 
(היפוך / היקף / הוספה / החלפה).

### 2026-06-07 — Re-Queue Principle for Rephrase (§2.15 applied)

**ההחלטה:** תשובות שגויות בסעיף Rephrase **לא** חוזרות לתור הסשן (בניגוד ל-SRS 
vocab). `trap_type` נרשם ב-`restatement_attempts` ומוזן ל-`aggregateWeakestKeys()` 
בשכבת Analyze.

**הנימוק:** שאלות Rephrase ארוכות ויקרות קוגניטיבית יותר מכרטיסי vocab. 
חשיפה כפויה מחדש באותו סשן יוצרת תסכול ללא תועלת לזיכרון.

### 2026-06-07 — Level Mapping: L2–L5 = NITE Q9–Q12, L1 = On-Ramp

L2 מקביל לרמת קושי NITE Q9, L3→Q10, L4→Q11, L5→Q12. L1 הוא on-ramp 
מעוצב ללא מקבילה ב-NITE — גבעולים קצרים יותר, מסיח יחיד-ציר, R1/R4 בלבד.
מיפוי זה קובע את spec היצירה לכל רמה ואת ציפיות הקאליברציה.

### 2026-06-07 — L5 Generation Spec Locked

גבעול שטוח 17–20 מילים. רמת לשון אקדמית-הוגנת. סט מסיחים: 1 micro-pivot killer 
(ATTRIBUTE_DRIFT / R8) + 1 היפוך מבני (R2 או R5) + 1 גרסת R8 מוצקה.
נדרש camouflage לקסיקלי: anti-tell variance (אף מסיח לא זיהוי לפי מאפייני 
פני שטח בלבד). Batch מאושר: L5-B1 (25 שאלות), is_published=false — ממתין לסקירת Lion.
