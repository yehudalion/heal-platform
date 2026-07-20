# HighScore — Project State
**Version:** 1.0  
**Last Updated:** 2026-07-10  
**Updated By:** Lion (Library Mode strategy + inventory analysis)

לשימוש בתחילת כל session:
קרא את הקובץ הזה לפני שאתה כותב שורת קוד. הוא מתאר מה עובד, מה שבור, ומה עדיין לא נבנה.
לאחר כל session — עדכן את הסטטוסים הרלוונטיים.

## סיכום מהיר
| שכבה | סטטוס | הערה |
|---|---|---|
| DB Schema | 🟢 תקין | Migration 001 רץ בהצלחה |
| Auth / Google OAuth | 🟢 עובד | Session נשמר, trigger יוצר user_profiles, display_name מאוכלס מ-Google |
| Data Layer (`src/data/`) | 🟢 תקין | 5 מודולים: profiles, words, srs, rephrase, listening |
| Onboarding | 🟡 חלקי | UI קיים, אבל לא כותב ל-DB (עמודות חסרו — עכשיו תוקן) |
| Hub / Dashboard | 🟡 קיים אך לא מחובר | מציג UI סטטי, לא שולף דאטה אמיתי |
| Vocabulary | 🟢 עובד | vocab-practice עובד end-to-end — SRS כותב ל-DB, מנמוניקות + פירושים נוספים + אודיו משפט, data layer נקי |
| Sentence Rephrasing | 🟡 v4 clean slate | Master Plan v4 אומץ (14.7.2026). **0 שאלות ב-DB** — 279 נמחקו ואורכבו. סכימת v4 מוכנה, data layer v2 ✅, RPC ✅, UI לא קיים |
| Listening | 🟡 Schema + format ready | פורמט מתועד (LISTENING_FORMAT.md v0.1), סכמה מוכנה לpipeline — אין תוכן ב-DB, אין UI |
| RLS | 🔴 כבוי | מכוון בשלב dev — חובה לפני launch |

## 🟢 עובד ויציב
### Data Layer (`src/data/`)
- `profiles.data.js` — getProfile, upsertProfile, completeOnboarding, touchLastActive ✅
- `words.data.js` — getWordsByImpact, getWordById, searchWords ✅
- `srs.data.js` — getDueWords, rateWord, getSessionStats + SM-2 algorithm ✅
- `rephrase.data.js` — fetchPracticeQuestions (RPC), logAttempt, fetchRecentAttempts, aggregateWeakestKeys ✅ (v2)
- `listening.data.js` — getLectures, getLectureQuestions, startSession, completeSession, saveQuestionResponse, getListeningHistory ✅

### Auth / Google OAuth
* Google OAuth עובד ב-local VS Code ✅
* Trigger `on_auth_user_created` יוצר שורה ב-`user_profiles` עם `display_name` + `avatar_url` מ-Google metadata ✅
* Backfill בוצע ל-2 משתמשים קיימים ✅
* magic-link users מקבלים שורה עם NULL display_name — תקין (אין Google metadata)

### DB Schema (post Migration 001)
* 10 טבלאות נקיות בפרודקשן
* `words` — 550 שורות עם הגדרות עבריות, audio URLs, impact_percentile מאוכלס
* `restatement_questions` — **0 שורות** (clean-slate reset של v4, 14.7.2026). 30 עמודות, סכימת v4.
  לפני האיפוס היו **279 שורות** (מתוכן 19 published) — לא 199 כפי שנרשם כאן בטעות. **כל ספירה בקובץ הזה
  חייבת להיות מאומתת בשאילתה, לא מהזיכרון.**
* `impact_percentile` מחולק נכון: 55 / 165 / 330 (Core / Advantage / Enrichment)
* Trigger `on_auth_user_created` — יוצר user_profiles אוטומטית בכל signup חדש
* FK-integrity: כל user_id מצביע על `auth.users(id)` — מאומת עם verification query 6.3

### Words Content
* 550 מילים עם definition_he, surface_1, mnemonic
* Audio URLs בפורמט `{headword}_word.mp3` / `{headword}_sentence.mp3` בבאקט heal-audio
* ✅ קבצי אודיו אומתו — נגישים ומתנגנים (נבדק ידנית על 5 מילים אקראיות)

### Vocabulary Cards & Learn Screen (src/screens/card.js + vocab-learn.js)
* כרטיסיות טוענות מילים לפי getDueWords → impact_score ✅
* due words קודמות למילים חדשות ✅
* rateWord כותב ל-srs_progress + srs_review_log (fire-and-forget) ✅
* 3 כפתורי דירוג: שוב / קשה / ידעתי (תואם SM-2) ✅
* פירוש מרכזי + 3 פאנלים מתקפלים: משפט (עם אודיו), פירושים נוספים, אסוציאציה ✅
* מחזור מנמוניקות (עד 3, NULL מסוננים) ✅
* אודיו ידני בלבד — מילה + משפט (אין auto-play) ✅
* כפתור "?" בטופ-בר מחזיר ל-Learn screen ✅
* Learn screen (vocab-learn.js) — מוצג חד-פעמית לפני session ראשון, נגיש תמיד דרך "?" ✅
* hub → /flashcards → /card (תיקון ניתוב הושלם) ✅
* data layer נקי — אפס קריאות ישירות ל-Supabase ✅
* Session queue logic: re-queue על 'שוב'/'קשה' עם cap של 2 חזרות, כתיבה ל-DB רק על הדירוג הראשון (manet DB integrity) ✅
* Analyze screen (vocab-analyze.js) — סיכום session עם 3 קטגוריות + streak ✅

## 🟡 חלקי / בעבודה
### Sentence Rephrasing — Infrastructure (src/data/rephrase.data.js)
* data layer v2 מלא — 4 exports: `fetchPracticeQuestions` (RPC), `logAttempt`, `fetchRecentAttempts`, `aggregateWeakestKeys` ✅
* RPC `get_rephrase_questions` — פעיל ב-Supabase ✅
* טבלה `restatement_attempts` — פעילה ב-Supabase (RLS כבוי, dev state — T070) ✅
* UI — עדיין לא קיים (ממתין ל-T042-T044)

#### 🔄 v4 Clean-Slate Reset (14.7.2026)
* **אומץ Master Plan v4** — מחליף את v3.1. מבוסס על ניתוח ground-truth של **116 פריטים אמיתיים
  מ-15 מבחנים רשמיים (2021–2025)**. מקור: `docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md`.
* **כל התוכן נמחק:** 279 שאלות (מתוכן 19 published) נמחקו מ-`restatement_questions`.
  **ארכיון מלא (29 עמודות) קומיט לגיט:** `docs/archive/restatement_questions_pre_v4_2026-07-14.csv`.
  אומת: 279 רשומות / 279 מזהים ייחודיים / 0 שורות פגומות / עברית תקינה.
* 🐛 **תוקן באג חוצה-חוק:** `is_published` היה **DEFAULT true** — הפרה ישירה של כלל אישור-התוכן.
  עכשיו **DEFAULT false**.
* **סכימה:** 30 עמודות. הוסרו 9 (`green_type`, `trap_type_1/2/3`, `low_surface_similarity_check`,
  `explanation_trap_1/2/3`, `explanation_correct`), נוספו 10 (`mechanism_1/2/3`, `proximity_1/2/3`,
  `transformations`, `relation_count`, `hard_word_count`, `recipe`) + CHECK constraint על proximity.
  מיגרציה: `20260714184952_rephrase_v4_clean_slate`.
* **מחולל v3 הוצא לארכיון:** `question_generator.py` + ה-CSVs שלו הועברו ל-`docs/archive/v3_generator/`
  (כתב לעמודות שנמחקו וקידד טקסונומיה שפגה — מלכודת חיה בריפו).
* **קורפוס האמת** נשאר כ-CSVs להתייחסות ב-`docs/truth_corpus/` בלבד — **לעולם לא ב-DB** (גבול זכויות יוצרים).
* **הצעד הבא:** T-CAL-V4-L2 — מנת כיול ראשונה, 10 פריטים.

### Onboarding (src/screens/onboarding.js)
* UI קיים ועובד ויזואלית
* אוסף: exam_date, target_score, current_level, daily_time_minutes, has_prev_exam
* בעיה: כתב ל-user_profiles שהיו חסרות עמודות — עכשיו הסכמה תוקנה, אבל הקוד לא עודכן לקרוא לדאטה לייר החדש (profiles.data.js שטרם נבנה)
* name ו-avatar מגיעים מ-Google OAuth — לא נשאלים ידנית ✅

### Hub / Dashboard (src/screens/hub.js)
* UI בסיסי קיים
* לא שולף דאטה אמיתי (streak, words due, progress) — מציג ערכים סטטיים
* תלוי ב-profiles.data.js ו-srs.data.js שטרם נבנו

## 🔴 שבור / לא קיים
### Listening
* האזנה: פורמט האמת חולץ ותועד ב-docs/LISTENING_FORMAT.md v0.1 (12.7.2026). הסכימה עודכנה לצנרת תוכן (is_published ברירת מחדל false, audio_url nullable, נוספו עמודות קוד-K ועוגן-אחורה). מנת כיול ראשונה (LC1, 3 קטעים / 5 שאלות) נוסחה ב-12.7.2026, ממתינה לביקורת ליאון. פיילוט קול (Google Cloud TTS Chirp3-HD מול Gemini-TTS) בתהליך. עדיין לא הוכנס תוכן ל-DB — אין תוכן האזנה חי.
* סכמה ישנה נמחקה לחלוטין
* סכמה חדשה קיימת אך ריקה (אין תוכן, אין UI, אין קוד)
* ✅ קבצי אודיו אומתו — נגישים ומתנגנים (נבדק ידנית על 5 מילים אקראיות)

### Profile Screen
* לא קיים (רק שדות ב-user_profiles קיימים)

### Mastery Tracking (src/lib/mastery.js)
* לא קיים — נדרש לפיצ'ר כפתור ה-💡 Hint מבוסס-שליטה

### RLS
* כבוי בכוונה בשלב dev
* חובה לפני launch — tracked ב-TASKS.md

## ⚠️ הפרות ארכיטקטוניות פעילות
| הפרה | קובץ משוער | חוק שמופר | תיקון נדרש |
|---|---|---|---|
| Onboarding לא שומר ל-DB | src/screens/onboarding.js | §2.7 Persistence | עדכן לשימוש ב-profiles.data.js |

## מצב תוכן לפי סעיף
### Vocabulary
| פריט | מצב |
|---|---|
| 550 מילים ב-DB | ✅ |
| הגדרות עבריות | ✅ |
| audio_word_url / audio_sentence_url | ✅ (URLs קיימים, קבצים אומתו — נגישים ומתנגנים) |
| mnemonic (עמודה 1) | ✅ מלא — כל 550 המילים |
| mnemonic_2 / mnemonic_3 | ✅ מלא — כל 550 המילים |
| impact_percentile | ✅ מחושב |
| etymology / image_url | ❌ ריק (FUTURE) |

### Sentence Rephrasing
| פריט | מצב |
|---|---|
| **Supabase project** | ⚠️ נמצא INACTIVE (2026-07-10) — free-tier auto-pause אחרי חוסר פעילות; שוחזר ידנית → מחזק T076 כ-P0 |
| **מלאי מלא** | ✅ 273 שאלות נותחו (2026-07-10) |
| legacy 199 שאלות | ✅ עוברות שערי מכניקה ב-82-95%, אורכים בריאים, גיוון trap גבוה — מקור אצירה ראשי |
| L5 מאומת | ✅ 4 עוגני B2 + 3 ניצולי B3 (museum-repatriation, dam-resettlement, cathedral-restoration) |
| bank v2 — L5-B1 (25 שאלות, difficulty=5) | 🔄 drafted, is_published=false — ממתין לאישור Lion (T077); B3/B4 קרסו לתבנית R5\|R2\|R8 |
| bank v2 — L1-L4 | ❌ טרם נוצר — נדרשת אצירה מהllegacy + drip batches |
| rephrase.data.js | ✅ v2 — fetchPracticeQuestions (RPC), logAttempt, fetchRecentAttempts, aggregateWeakestKeys |
| RPC get_rephrase_questions | ✅ live in Supabase |
| restatement_attempts table | ✅ live in Supabase (RLS off — dev state, T070) |
| UI / Practice screen | ❌ לא קיים (T043) |
| Analyze screen | ❌ לא קיים (T044) |
| 520 שאלות מ-NITE PDFs | 🚫 אסור — לא נטענות ל-DB (§2.19) |

### Listening
| פריט | מצב |
|---|---|
| הרצאות ב-DB | ❌ ריק (תוכן ישן נמחק) |
| שאלות ב-DB | ❌ ריק |
| UI | ❌ לא קיים |
| קבצי אודיו בסטורג' | ❓ לא אומת |

## הכרעות פתוחות
| שאלה | מצב |
|---|---|
| האם קבצי אודיו קיימים בסטורג'? | ✅ אומת — קבצים קיימים ונגישים |
| Google OAuth ב-local — עובד? | ✅ אומת — עובד, trigger יוצר user_profiles |
| 191 מילים ללא mnemonic — מתי ימולא? | 📋 ב-TASKS.md |
| difficulty_level לlegacy — מי ממלא? | 📋 נעשה כחלק מאצירה (re-leveling מאושר — §1.6 CONTENT_GUIDELINES.md) |

## החלטות תוכן (2026-05-27)
| החלטה | סטטוס |
|---|---|
| §2.19 כלל רישוי תוכן נוסף ל-ARCHITECTURE.md | ✅ |
| 520 שאלות מ-NITE PDFs — לא נטענות ל-DB | ✅ החלטה סופית |
| T040 ימשיך מול 199 שאלות סינתטיות קיימות | ✅ |
| CONTENT_SOURCES.md נוצר | ✅ |

## החלטות תוכן (2026-07-10)
| החלטה | סטטוס |
|---|---|
| **אסטרטגיה: מפעל → ספרייה** — bulk generation קרס לתבנית יחידה (R5\|R2\|R8 ב-25/25 של B3+B4). מעבר לאצירה + drip batches. | ✅ |
| **Re-leveling מאושר** — difficulty_level הוא תווית; שאלות יכולות לרדת רמה | ✅ |
| **Bulk L5 מוקפא** עד שיש דאטה ממשתמשים | ✅ |
| **מכסות השקה (רצפה):** L1=40, L2=60, L3=90, L4=90, L5=50 | ✅ |
| **שערי מכניקה חדשים** — length-parity (≥6 מילים) + anti-tell (≤30% batch) | ✅ |
| **Move Book** — נבנה דרך סקירה עיוורת, יצורף ל-CONTENT_GUIDELINES.md לאחר אישור | 🔄 בתהליך |
| **T076 P0 מחוזק** — Supabase נמצא INACTIVE ושוחזר 2026-07-10 | ✅ |
