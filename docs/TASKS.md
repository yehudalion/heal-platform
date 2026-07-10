# HighScore — Task Board
**Version:** 1.0
**Last Updated:** 2026-07-10

> משימות מסודרות לפי פאזה ועדיפות.
> P0 = חוסם הכל / P1 = MVP קריטי / P2 = חשוב אך לא חוסם
> גודל: S = שעה-שעתיים / M = חצי יום / L = יום שלם+

---

## Phase 0 — Critical Foundation (חוסמי הכל)

> אלה חייבים להיות פתורים לפני שנוגעים בפיצ'רים.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T001 | P0 | S | **אמת Google OAuth ב-local VS Code** — כנס, בדוק שה-session נשמר, בדוק שה-trigger כתב שורה ל-`user_profiles`. אם לא עובד — תקן לפני הכל. | `src/auth.js`, `src/supabase.js` |
| T002 | P0 | S | **אמת קיום אודיו בסטורג'** — בחר 3-5 headwords אקראיים, בדוק ידנית שה-URLs `{headword}_word.mp3` אכן נגישים בבאקט `heal-audio`. | Supabase Storage console |
| T003 | P0 | L | **בנה את Data Layer (`src/data/`)** — צור את 5 המודולים. בשלב זה ממשו רק את הפונקציות שנדרשות ל-Phase 1. | `src/data/profiles.data.js`, `words.data.js`, `srs.data.js` |
| T004 | P0 | M | **העבר Onboarding לדאטה לייר** — עדכן את `onboarding.js` שיקרא ל-`profiles.data.js` בלבד, לא ישירות ל-Supabase. | `src/screens/onboarding.js`, `src/data/profiles.data.js` |
| T005 | P0 | S | **הרץ את migration_001_clean_slate.sql** בסופאבייס (אם טרם הורץ) ואמת עם 6 ה-verification queries. | Supabase SQL Editor |

---

## Phase 1 — Vocabulary MVP

> שלוש שכבות מלאות: Learn / Practice / Analyze.
> זהו הסעיף הראשון שמשתמש אמיתי יראה.

### 1A — Data Layer (Vocab)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T010 | P0 | M | **`words.data.js`** — פונקציות: `getWordsByImpact(limit, offset, tierFilter)`, `getWordById(id)`, `searchWords(query)` | `src/data/words.data.js` |
| T011 | P0 | M | **`srs.data.js`** — פונקציות: `getDueWords(userId, limit)`, `upsertProgress(userId, wordId, rating)`, `logReview(userId, wordId, ratingData)` | `src/data/srs.data.js` |

### 1B — Learn Layer (שכבת לימוד)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T015 | P1 | M | **`vocab-learn.js`** ✅ DONE — מסך הסבר על מבנה הכרטיסייה, סוגי המידע (הגדרה / משפט / אסוציאציה), ואיך ה-SRS עובד. מוצג פעם אחת לפני תרגול ראשון + כפתור "הסבר שוב" בכל עת. | `src/screens/vocab-learn.js` |

### 1C — Practice Layer (שכבת תרגול)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T020 | P0 | L | **`vocab-practice.js` (rebuild)** ✅ DONE — עדכן כרטיסיות לקרוא מ-`words.data.js` ו-`srs.data.js`. חזרות מ-`getDueWords` קודמות לחדשות. | `src/screens/vocab-practice.js` |
| T021 | P0 | M | **SRS rating כותב ל-DB** ✅ DONE — כפתורי קל/בינוני/קשה קוראים ל-`upsertProgress` + `logReview`. זה P0 — ללא זה אין SRS בכלל. | `src/screens/vocab-practice.js`, `src/data/srs.data.js` |
| T022 | P0 | S | **מחזור מנמוניקות** ✅ DONE — כפתור "החלף" בנוי וקיים. לוודא שהקוד קורא גם `mnemonic_2` / `mnemonic_3` (לאחר מילוי תוכן ב-T030). פיצ'ר עובד — רק תוכן חסר. | `src/screens/vocab-practice.js`, `src/components/card.js` |
| T023 | P1 | S | **כפתור 💡 Hint בסיסי** ✅ DONE — מוצג תמיד כרגע (לפני שמימוש mastery מוכן). | `src/screens/vocab-practice.js`, `src/components/card.js` |
| T024 | P2 | M | **`mastery.js`** — לוגיקה: כפתור hint מוסתר אחרי 3 תשובות רצופות נכונות per key. מחזיר לנראות אם דיוק יורד מ-70% על 10 שאלות. | `src/lib/mastery.js` |

### 1D — Analyze Layer (שכבת ניתוח)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T025 | P1 | M | **`vocab-analyze.js`** ✅ DONE — סיכום session: כמה מילים עברו, פירוט לפי rating, מילים שחזרו (lapses > 0). | `src/screens/vocab-analyze.js` |
| T026 | P2 | M | **Analyze מצטבר** — גרף "מילים שנלמדו לאורך זמן" (מ-`srs_review_log`). בניית UI בלבד — דאטה מתחיל להצטבר מ-T021. | `src/screens/vocab-analyze.js` |

### 1E — תוכן

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T030 | P1 | L | **מלא mnemonic_2 / mnemonic_3 ל-550 מילים** ✅ DONE — Calibration Batch Method. התחל עם batch של 15, Lion מאשר, ואז bulk. | DB `words` table |
| T031 | P1 | M | **מלא mnemonic_1 ל-191 מילים חסרות** ✅ DONE — אותה שיטה. | DB `words` table |

---

## Phase 2 — Sentence Rephrasing MVP

> שלוש שכבות. MVP = Multiple Choice בלבד. Verification/Blackout לעתיד.
>
> **Critical path (2026-07-10):** T041a → T041b → T041c → T042 → T043 → T044. T076 (Supabase Pro) חוסם launch — נמצא INACTIVE ב-2026-07-10.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T040 | ✅ | M | **`rephrase.data.js` v2** — `fetchPracticeQuestions` (RPC), `logAttempt`, `fetchRecentAttempts`, `aggregateWeakestKeys`. DONE — RPC solution deployed. | `src/data/rephrase.data.js` |
| T041a | P0 | S | **סקירה עיוורת — Move Review Batch** [בתהליך] — Lion מקבל 7 שאלות מגוונות ומציין "מה השתנה בין המשפט המקורי לתשובה הנכונה" בלי לדעת שזו המטרה. תוצאות בונות את Move Book. | DB `restatement_questions` |
| T041b | P0 | S | **בנה Move Book** — מה שאושר ב-T041a: רשימת וריאציות מבניות מאושרות (synonym swap, clause inversion, etc.) עם דוגמאות. מצורף ל-§1.6 ב-CONTENT_GUIDELINES.md. | `docs/CONTENT_GUIDELINES.md` |
| T041c | P1 | L | **Curation Pass — אצירה למכסה** — סרוק 199 legacy לפי מכסות (L1=40, L2=60, L3=90, L4=90, L5=50). החל שערי מכניקה. re-level כנדרש (L5-B1 → L4, legacy-L3 קשה → L4). נרמל green_type. | DB `restatement_questions` |
| T041d | P2 | M | **תיקון B3/B4 רק לפי צורך** — אם אחרי T041c L5 עדיין לא מגיע ל-50: תקן את הפריטים הטובים ביותר של B3/B4 (הארכת R2 + anti-tell). אל תתחל לפני שיודעים את הפער. | DB `restatement_questions` |
| T041e | P1 | M | **Drip Batches — L1-L2** — batches של ~20 פריטים עם דוח פיזור אוטומטי; Lion מאשר sample של 4-5. ייצור רק לאחר Move Book מאושר (T041b). | DB `restatement_questions` |
| T042 | P1 | M | **`rephrase-learn.js`** — הסבר על 5 המפתחות עם דוגמאות. מוצג לפני תרגול ראשון. | `src/screens/rephrase-learn.js` |
| T043 | P1 | L | **`rephrase-practice.js`** — Multiple choice + פידבק "למה לשים לב" לפי key_type של התשובה השגויה. | `src/screens/rephrase-practice.js` |
| T044 | P1 | M | **`rephrase-analyze.js`** — סיכום session + "מפתח חלש" (המפתח עם אחוז ההצלחה הנמוך ביותר). | `src/screens/rephrase-analyze.js` |
| T045 | P2 | M | **`feedback-panel.js` component** — רכיב משותף להצגת "למה לשים לב" לאחר תשובה. ישמש גם Rephrase וגם Listening. | `src/components/feedback-panel.js` |

---

## Phase 3 — Listening MVP

> שכבת lecture_qa בלבד. Audio existence must be confirmed (T002) before starting.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T050 | P0 | S | **אמת אודיו** — T002 חייב להיות ירוק לפני שמתחילים Phase 3. | — |
| T051 | P0 | M | **`listening.data.js`** — פונקציות: `getLectures(difficulty)`, `getQuestions(lectureId)`, `saveSession(data)`, `saveResponse(data)` | `src/data/listening.data.js` |
| T052 | P1 | L | **תוכן: הרצאות + שאלות** — Calibration Batch: 2 הרצאות עם 5 שאלות כל אחת → Lion מאשר → bulk. | DB `listening_lectures`, `listening_questions` |
| T053 | P1 | M | **`listening-learn.js`** — הסבר על פורמט הלאל listening, מה לצפות, אסטרטגיות בסיסיות. | `src/screens/listening-learn.js` |
| T054 | P1 | L | **`listening-practice.js`** — player אודיו + שאלות MC לאחר ההרצאה + שמירת session/responses. | `src/screens/listening-practice.js`, `src/components/audio-player.js` |
| T055 | P1 | M | **`listening-analyze.js`** — סיכום session: ציון, מפתח חלש, השוואה לממוצע. | `src/screens/listening-analyze.js` |

---

## Phase 4 — Hub & Profile Polish

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T060 | P1 | M | **Hub מחובר** — שולף דאטה אמיתי: מילים לחזרה היום, streak, התקדמות לפי סעיף. | `src/screens/hub.js`, data modules |
| T061 | P1 | M | **`profile.js`** — מסך פרופיל: תאריך מבחן + ספירה לאחור, רמה, יעד, עריכת הגדרות. | `src/screens/profile.js`, `src/data/profiles.data.js` |
| T062 | P2 | S | **`navbar.js` component** — ניווט תחתון קבוע (Hub / Vocab / Rephrase / Listening / Profile). | `src/components/navbar.js` |
| T063 | P2 | S | **`progress-ring.js` component** — טבעת אחוז התקדמות. | `src/components/progress-ring.js` |

---

## Phase 5 — Pre-Launch

> אלה חוסמי-launch — לא נכנסים לפרודקשן בלעדיהם.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T070 | P0 | L | **הפעל RLS** על כל הטבלאות — policies לפי `auth.uid()`. כולל: `restatement_questions`, `rephrase_attempts`. בדוק מ-client שמשתמש לא יכול לקרוא דאטה של אחר. | Supabase SQL (policies) |
| T071 | P0 | L | **מערכת תשלומים** — Stripe integration, webhooks, עדכון `paid_track`/`paid_expires_at` ב-`user_profiles`. | `src/data/profiles.data.js`, Supabase edge functions |
| T072 | P0 | M | **Free tier enforcement** — gate תוכן לפי `paid_track`: 200 מילים ראשונות בלבד, sampling של תרגילים, מוק סימולציה אחד. | Data modules + screens |
| T073 | P1 | M | **Teacher partner landing** — עמוד נחיתה + טופס הצטרפות לשותפי מורים (15-20% עמלה). | דפי landing (מחוץ ל-app) |
| T074 | P1 | S | **Error tracking** — Sentry או דומה, לפחות console error aggregation. | `src/main.js` |
| T075 | P2 | M | **Mock simulation** — מבחן מדומה מלא. פיצ'ר premium. | סעיף נפרד בפרויקט |
| T076 | P0 | S | **⛔ BLOCKER — שדרג Supabase ל-Pro** — free tier מושהה אוטומטית אחרי שבוע חוסר פעילות; יהרוג פרודקשן. שדרג לפני כל חשיפה ציבורית. | Supabase dashboard |
| T077 | P1 | S | **אשר batch L5-B1** (25 שאלות, is_published=false) — Lion סוקר, לאחר אישור: `UPDATE restatement_questions SET is_published=true WHERE generation_batch='L5-B1'`. חזור לכל batch נוסף. | DB `restatement_questions` |

---

## מחסום הזמן

| אבן דרך | תאריך יעד | מה נדרש |
|---|---|---|
| Alpha (Lion בלבד) | יוני 2026 | Phase 0 + Phase 1 מלא |
| Beta (50 משתמשים) | יולי 2026 | Phase 1 + 2 + Hub |
| Launch | ספטמבר 2026 | Phase 1-4 + Phase 5 חוסמי-launch |
| מבחן ראשון | דצמבר 2026 | 🎯 |
