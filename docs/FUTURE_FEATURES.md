# HighScore — Future Features
**Version:** 1.1
**Last Updated:** 2026-07-15 (F-L04 split: MC continuation → core, free-writing stays future)

> פיצ'רים שנדחו מה-MVP בכוונה — לא נשכחו.
> כל פיצ'ר כאן תועד עם: מה הוא, למה נדחה, מה כבר קיים בשבילו, ומה נדרש לממשו.
>
> **כלל:** לפני שמוסיפים פיצ'ר מהרשימה הזו — לבדוק ב-TASKS.md שכל Phase הרלוונטי הושלם.

---

## סעיף 1 — Vocabulary

### F-V02 | Etymology
**מה זה:** הצגת מקור המילה (שפה מקור, שורש) כשכבת הרחבה בכרטיסייה.
**למה נדחה:** תוכן חסר. עמודה קיימת.
**מה קיים:** עמודת `etymology` ב-`words` (NULL).
**מה נדרש:** מילוי תוכן ל-550 מילים (Calibration Batch) → הצגה ב-`card.js`.

### F-V03 | Word Image
**מה זה:** תמונה ויזואלית לכל מילה (visual memory hook).
**למה נדחה:** תוכן חסר + pipeline יצירת תמונות לא הוגדר.
**מה קיים:** עמודת `image_url` ב-`words` (NULL).
**מה נדרש:** יצירת תמונות (AI-generated או stock) → מילוי `image_url` → הצגה בכרטיסייה.

### F-V04 | Slow Audio
**מה זה:** כפתור "האט" שמנגן גרסה איטית יותר של ההגייה.
**למה נדחה:** קבצי אודיו איטיים לא קיימים.
**מה קיים:** עמודת `audio_slow_url` ב-`words` (NULL).
**מה נדרש:** יצירת קבצי אודיו איטיים → מילוי URL → כפתור ב-`audio-player.js`.

### F-V05 | Mastery-Based Hint (כפתור 💡 מבוסס שליטה)
**מה זה:** כפתור ה-Hint מוסתר אוטומטית אחרי 3 תשובות רצופות נכונות per key. מחזיר לנראות אם דיוק יורד מ-70%.
**למה נדחה:** ל-MVP מספיק hint תמיד-נראה. Mastery tracking מוסיף מורכבות לפני שיש משתמשים.
**מה קיים:** לוגיקה מתוכננת ב-ARCHITECTURE §2.3. עמודת `hint_used` ב-`restatement_attempts`.
**מה נדרש:** `src/lib/mastery.js` → אינטגרציה ב-`vocab-practice.js` + `rephrase-practice.js`.

---

## סעיף 2 — Sentence Rephrasing

### F-R01 | Verification Exercise (Anchors-Based)
**מה זה:** תרגיל שמציג את המשפט המקורי עם "עוגנים" מודגשים, והתלמיד מסמן אילו עוגנים שונו בניסוח מחדש.
**למה נדחה:** MVP = MC בלבד. Verification מורכב יותר לפתח ולהסביר.
**מה קיים:** `restatement_questions.anchors_json` — 199 שאלות עם anchors מוגדרים. עמודת `verified_count` ב-`restatement_attempts` (NULL).
**מה נדרש:** UI לסימון עוגנים → לוגיקת בדיקה → עדכון `rephrase.data.js` → הוספת מצב `practice_mode = 'verification'`.

### F-R02 | Blackout Exercise
**מה זה:** תרגיל שמציג משפט עם מילות מפתח מוסתרות, והתלמיד צריך להשלים.
**למה נדחה:** MVP = MC בלבד. Blackout דורש UX מורכב יותר.
**מה קיים:** `restatement_questions.blackout_words_json` — 199 שאלות עם מילים מוגדרות. עמודת `blackout_difficulty` ב-`restatement_attempts` (NULL).
**מה נדרש:** UI להסתרה והשלמה → לוגיקת ניקוד → `practice_mode = 'blackout'`.

### F-R03 | Multi-Mode Practice
**מה זה:** בחירת מצב תרגול: MC בלבד / Verification בלבד / Mixed / Blackout.
**למה נדחה:** תלוי ב-F-R01 + F-R02.
**מה קיים:** עמודת `practice_mode` ב-`restatement_attempts`.
**מה נדרש:** F-R01 + F-R02 מלאים → UI בחירת מצב → routing ב-`rephrase-practice.js`.

---

## סעיף 3 — Listening

### F-L01 | Hard Mode
**מה זה:** האזנה ללא transcript + שאלות קשות יותר.
**למה נדחה:** אין ולידציה שהמצב הבסיסי עובד קודם.
**מה קיים:** concept מתועד.
**מה נדרש:** `hard_mode_unlocked` לוגיקה ב-`user_profiles` (עמודה ל-FUTURE) + שאלות מתויגות ל-hard_mode.

### F-L02 | Readiness Score
**מה זה:** ציון "כמה אתה מוכן ל-Listening" עם רמות ביטחון והיסטוריה.
**למה נדחה:** דורש היסטוריית דאטה שתיצבר עם הזמן.
**מה קיים:** `listening_question_responses` מאסף את הדאטה הנדרש מיום 1.
**מה נדרש:** אלגוריתם חישוב readiness → מסך הצגה.

### F-L03 | Streak Freezes
**מה זה:** "הקפאת סטריק" — שמירת הסטריק גם ביום שלא למדת.
**למה נדחה:** Wellbeing Rule — נבנה רק אם יש ביקוש מוכח (לא מניח שצריך).
**מה קיים:** concept מתועד.
**מה נדרש:** עמודה ב-`user_profiles` + לוגיקה + UI.

### F-L04 | Continuation — free-writing enrichment (NOT the core MC item)
> ⚠️ **תוקן 15.7.2026.** רשומה זו ערבבה בעבר שני דברים שונים. הבהרה:
>
> **`continuation` כפריט MC = ליבת ה-MVP, לא future.** התברר שהשלמת קטע שמע היא **חצי**
> ממבחן ה-Listening האמיתי (השני מבין שני סוגי הפריטים), כפריט **רב-ברירה** — 4 אפשרויות
> כתובות מקבילות דקדוקית, הבחנה סמנטית בלבד. הוא **הועבר ל-scope הליבה** ומכוסה כעת ב-
> `LISTENING_FORMAT.md` (Item Type 2) וב-CONTENT_GUIDELINES §3, עם רכיב UI `Continuation_View`
> ומשימות ב-TASKS Phase 3. **אין להתייחס אליו כאן כ-future.**

**מה נשאר כאן (future enrichment בלבד, נבדל מהליבה):** תרגיל שבו התלמיד **כותב בעצמו** את ההמשך
(free-writing response) במקום לבחור מבין 4 אפשרויות, עם מנגנון הערכה/ניקוד של טקסט חופשי.
**מה זה:** תחילת קטע מוצגת, התלמיד ממשיך אותה בכתיבה חופשית.
**למה נדחה:** סוג תרגיל שונה מהותית מ-MC (הן מ-lecture_qa והן מ-continuation ה-MC), דורש
pipeline הערכת כתיבה חופשית — קרוב יותר למודול הכתיבה העתידי מאשר ל-Listening MVP.
**מה קיים:** `item_type` enum מוכן לערך `'text_continuation'` (שמור לגרסת ה-free-writing; פריט
ה-MC משתמש בערך continuation הרגיל).
**מה נדרש:** UI כתיבה חופשית + מנגנון הערכה/ניקוד. (טבלת ה-passages עצמה משותפת עם פריט ה-MC.)

### F-L05 | Multi-Accent Tracking
**מה זה:** מעקב אחר ביצועים לפי מבטא (British / American / Australian) וזיהוי מבטא חלש.
**למה נדחה:** דורש תיוג תוכן + מספיק הרצאות per accent.
**מה קיים:** עמודת `accent` ב-`listening_lectures` (NULL).
**מה נדרש:** תיוג תוכן → אגרגציה ב-`listening-analyze.js` → הצגה.

### F-L06 | Daily Free Usage Gate
**מה זה:** הגבלת שימוש יומי לתלמידי חינם (X הרצאות ביום).
**למה נדחה:** monetization טרם הושק. Gate לפני יש משתמשים משלמים = friction מיותר.
**מה קיים:** concept מתועד.
**מה נדרש:** בדיקת `paid_track` ב-`listening.data.js` → הצגת "שדרג" כשמגיעים ללימיט.

---

## סעיף 4 — Hub & Gamification

### F-H01 | Streak Visualization
**מה זה:** מפת חום / calendar view של ימי לימוד.
**למה נדחה:** דורש היסטוריית `srs_review_log` שתיצבר עם הזמן.
**מה קיים:** `srs_review_log.reviewed_at` — timestamp לכל review.
**מה נדרש:** query אגרגציה לפי יום → רכיב calendar UI.

### F-H02 | Weekly Learning Summary
**מה זה:** סיכום שבועי: כמה מילים, כמה תרגילים, מגמת שיפור.
**למה נדחה:** דורש מספיק דאטה היסטורי.
**מה קיים:** כל ה-log tables כותבים מיום 1.
**מה נדרש:** queries שבועיות → UI summary card ב-hub.

---

## סעיף 5 — Personalization & Onboarding

### F-OB01 — Daily Time Budget → Adaptive Session Composition

**Status:** Future — post-MVP
**Priority:** P2
**Depends on:** Phase 2 + Phase 3 complete

**Concept:**
During onboarding, ask the student how many minutes per day they intend to study (options: 5 / 10 / 15 / 20 / 30 / 45+ min). Store as `user_profiles.daily_minutes_target`.

When the student opens the Hub, instead of presenting separate "go practice vocab" / "go practice rephrase" / "go practice listening" buttons, build them a single mixed-session package that fits their time budget, drawing proportionally from all unlocked sections.

**Time estimates per item (calibration baseline):**
- Vocab card: ~30 seconds
- Rephrase question: ~60-90 seconds
- Listening lecture + questions: ~3 minutes

**Example for 15-minute target:**
- 10 vocab cards (5 min)
- 5 rephrase questions (6 min)
- 1 listening lecture (3 min)
- Total: ~14 min

**Pedagogical rationale:**
Mixed-interleaved practice has stronger retention than blocked practice (cognitive science: Rohrer & Taylor 2007). Students who get a "daily mission" sized to their declared budget have higher completion

---

## סעיף 6 — Platform & Operations

### F-P01 | RLS Policies
**מה זה:** Row Level Security על כל הטבלאות.
**למה נדחה:** כבוי בכוונה בשלב dev בגלל שגיאות policy שחסמו פיתוח.
**מה קיים:** ARCHITECTURE §3.4 מתעד את הדרישה. כל ה-FKs נכונים (`auth.users`).
**מה נדרש:** policies לכל טבלה → בדיקת penetration בסיסית → **חוסם launch (T070)**.

### F-P02 | Conversion Events Tracking
**מה זה:** תיעוד אירועי funnel: signup → onboarding → first_session → paywall_hit → purchased.
**למה נדחה:** לא רלוונטי לפני שיש traffic אמיתי.
**מה קיים:** concept. `conversion_events` נמחקה מה-schema — תיבנה מחדש כשצריך.
**מה נדרש:** הגדרת event taxonomy → טבלה חדשה → כתיבה מ-screens בנקודות funnel.

### F-P03 | Offline Support (PWA)
**מה זה:** לימוד ללא אינטרנט — service worker + cache של מילים + sync כשחוזר לרשת.
**למה נדחה:** complexity גבוה, אין ראיות שזו דרישה מהמשתמשים.
**מה קיים:** —
**מה נדרש:** service worker → cache strategy → sync queue → testing.

### F-P04 | B2B Light — Teacher Dashboard
**מה זה:** מורים משלמים ~199₪/חודש עבור dashboard של 5 תלמידים: מעקב התקדמות, אזורי חולשה, המלצות.
**למה נדחה:** post-launch. דורש ולידציה שמורים מעוניינים.
**מה קיים:** STRATEGY_NOTES מתעד את המודל.
**מה נדרש:** role/permissions system → teacher_students relation table → dashboard screens → pricing page נפרד.

### F-P05 | Mock Exam Simulation
**מה זה:** מבחן מדומה מלא בתנאי בחינה אמיתיים (זמן, לחץ, כל סוגי השאלות).
**למה נדחה:** דורש תוכן בשלות מלאה בכל הסעיפים.
**מה קיים:** —
**מה נדרש:** תוכן מלא לכל הסעיפים → exam engine עם timer → ציון מסכם + פירוט.

---

## סעיף 7 — UI Components (נדחו כ"הפשטה מוקדמת")

### F-UI01 | Modal Component
**מה זה:** רכיב modal/dialog גנרי לאישורים, הסברים, layered UI.
**למה נדחה:** לא בנינו הפשטה גנרית ללא use-case ספציפי.
**מה נדרש:** כשמסך ראשון זקוק ל-modal → `src/components/modal.js`.

### F-UI03 | Profile Menu (כפתור חבר/ה)
**מה זה:** לחיצה על כפתור "חבר/ה" בפינה ימנית תחתונה פותח תפריט עם: צפייה בפרופיל, עריכת פרטים (תאריך מבחן, ציון יעד), התנתקות.
**למה נדחה:** MVP — logout ישיר מספיק לפי עתה.
**מה קיים:** הכפתור קיים ב-UI אך לא לחיץ.
**מה נדרש:** event listener על הכפתור → dropdown menu → ניתוב ל-`profile.js` + פונקציית `signOut()` מ-`supabase.js`.

### F-UI02 | Toast / Notification System
**מה זה:** הודעות זמניות (success/error/info) שנעלמות אחרי כמה שניות.
**למה נדחה:** אותה סיבה — הפשטה מוקדמת.
**מה נדרש:** כשצורך ראשון עולה → `src/components/toast.js`.
