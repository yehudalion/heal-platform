# מעל הרף — Task Board
**Version:** 1.1
**Last Updated:** 2026-07-15 (Listening tasks reworked per 15.7 design review)

> משימות מסודרות לפי פאזה ועדיפות.
> P0 = חוסם הכל / P1 = MVP קריטי / P2 = חשוב אך לא חוסם
> גודל: S = שעה-שעתיים / M = חצי יום / L = יום שלם+
>
> ⚠️ **הלוח הזה עודכן לאחרונה 20.7.2026 ומיושן חלקית.**
> הבקלוג החי — מה פתוח *עכשיו*, חוצה־צ'אטים — יושב בפרויקט:
> **`claude/BACKLOG_next.md`**. שם גם תיאום העבודה על השלמת משפטים.

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
| T041b | P0 | M | **הוכחת שיטה + נעילת Move Book** — (1) שכתב Q2/Q5/Q7 מה-review batch תוך שימוש במהלכים המועמדים כהוכחת שיטה → סקירת Lion שנייה לאישור שהמהלכים עובדים בפועל; (2) לאחר אישור: נעל Move Book ומצרף ל-§1.6 ב-CONTENT_GUIDELINES.md. | `docs/CONTENT_GUIDELINES.md`, DB `restatement_questions` |
| ~~T041c~~ | ❌ **OBSOLETE** | L | ~~**Curation Pass — אצירה למכסה** — סרוק 199 legacy לפי מכסות... נרמל green_type.~~ **מיושן: התוכן נמחק ב-v4 clean-slate reset (14.7.2026).** אין legacy לאצור — 279 הפריטים נמחקו ואורכבו ל-`docs/archive/restatement_questions_pre_v4_2026-07-14.csv`. גם `green_type` עצמה כבר לא קיימת. הוחלף ב-T-CAL-V4-L2. | ~~DB `restatement_questions`~~ |
| T041d | P2 | M | **תיקון B3/B4 רק לפי צורך** — אם אחרי T041c L5 עדיין לא מגיע ל-50: תקן את הפריטים הטובים ביותר של B3/B4 (הארכת R2 + anti-tell). אל תתחל לפני שיודעים את הפער. | DB `restatement_questions` |
| T041e | P1 | M | **Drip Batches — L1-L2** — batches של ~20 פריטים עם דוח פיזור אוטומטי; Lion מאשר sample של 4-5. ייצור רק לאחר Move Book מאושר (T041b). | DB `restatement_questions` |
| **T-CAL-V4-L2** | **P0** | M | **מנת כיול ראשונה של v4 — 10 פריטים** [בתהליך, נוסחה 14.7.2026] — recipe `CAL-V4-L2`, רמה 2. תיוג מלא לפי v4: `mechanism_1/2/3` (R1,R2,R3,R5,R6,R7,R9), `proximity_1/2/3` (P1/P2/P3), `transformations` (G1–G9), `relation_count`, `hard_word_count`. `is_published=false` עד אישור מפורש של Lion. מכייל את המחולל מול קורפוס האמת (`docs/truth_corpus/`) לפני ייצור בקנה מידה. | DB `restatement_questions`, `docs/מעל הרף_Rephrase_Master_Plan_v4_2026-07-14.md` |
| T042 | P1 | M | **`rephrase-learn.js`** — הסבר על 5 המפתחות עם דוגמאות. מוצג לפני תרגול ראשון. | `src/screens/rephrase-learn.js` |
| T043 | P1 | L | **`rephrase-practice.js`** — Multiple choice + פידבק "למה לשים לב" לפי key_type של התשובה השגויה. | `src/screens/rephrase-practice.js` |
| T044 | P1 | M | **`rephrase-analyze.js`** — סיכום session + "מפתח חלש" (המפתח עם אחוז ההצלחה הנמוך ביותר). | `src/screens/rephrase-analyze.js` |
| T045 | P2 | M | **`feedback-panel.js` component** — רכיב משותף להצגת "למה לשים לב" לאחר תשובה. ישמש גם Rephrase וגם Listening. | `src/components/feedback-panel.js` |

---

## Phase 3 — Listening MVP

> **שני** סוגי פריטים בליבה: `lecture_qa` **ו-`continuation`** (השלמת קטע שמע, רב-ברירה) —
> continuation הוא חצי מהמבחן האמיתי, לא future (עודכן 15.7.2026; ראה `LISTENING_FORMAT.md`,
> CONTENT_GUIDELINES §3, ו-FUTURE_FEATURES F-L04). Audio existence must be confirmed (T002) before starting.
> החלטות עיצוב מ-review של 15.7.2026 (שתי ביקורות חיצוניות + הכרעות Lion) משוקפות במשימות T056+.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T050 | P0 | S | **אמת אודיו** — T002 חייב להיות ירוק לפני שמתחילים Phase 3. | — |
| T051 | P0 | M | **`listening.data.js`** — פונקציות: `getLectures(difficulty)`, `getQuestions(lectureId)`, `saveSession(data)`, `saveResponse(data)` | `src/data/listening.data.js` |
| T052 | P1 | L | **תוכן: קליפים + שאלות** [תוקן 15.7.2026] — יחידת התוכן היא **section שלם**, לא "2 הרצאות×5 שאלות": או **3 קליפים (1+2+2 שאלות)** ל-`lecture_qa`, או **4 קליפי `continuation`**. Calibration Batch → Lion מאשר → bulk (ראה T067 — מנת הכיול הראשונה היא continuation). | DB `listening_lectures`, `listening_questions` |
| T053 | P1 | M | **`listening-learn.js`** — הסבר על פורמט הלאל listening, מה לצפות, אסטרטגיות בסיסיות. | `src/screens/listening-learn.js` |
| T054 | P1 | L | **`listening-practice.js`** — player אודיו + שאלות MC לאחר הקליפ + שמירת session/responses. | `src/screens/listening-practice.js`, `src/components/audio-player.js` |
| T055 | P1 | M | **`listening-analyze.js`** — סיכום session: ציון, מפתח חלש, השוואה לממוצע. | `src/screens/listening-analyze.js` |
| T056 | P1 | M | **שני רכיבי UI נפרדים** — `LectureQA_View` (עם גזע שאלה) ו-`Continuation_View` (ללא גזע; האפשרויות הן המשכים תחביריים של המשפט החתוך). | `src/screens/listening-practice.js`, `src/components/` |
| T057 | P1 | M | **Replay חופשי** — מותר להשמיע שוב בכל עת בתוך טיימר הסעיף, ב-practice וב-exam mode. עקוב אחר מספר ה-replays והצג ב-Analyze כ**"cost reflection"** (למשל: "השמעת שוב 40% מהקליפים — זה צרך X מתוך Y דקות"). מלמד ניהול זמן דרך רפלקציה, לא דרך חסימה (Wellbeing Rule). | `src/data/listening.data.js`, `src/screens/listening-practice.js`, `listening-analyze.js` |
| T058 | P1 | M | **פידבק לאחר טעות** — קודם השמע **רק את אזור המפנה** ("הַאזן שוב לחלק המסומן"); **ללא transcript**. אחר כך הסבר עברי קצר על מה קרה לוגית ב-pivot. (Transcript-in-feedback נדחה — ראה Backlog T082 — מה שגם מסיר את סיכון ה-split-attention.) | `src/components/feedback-panel.js`, `src/screens/listening-practice.js` |
| T059 | P1 | S | **prompt מטא-קוגניטיבי אחרי טעות** — שאלה אחת: "מה השתבש? [1] לא הצלחתי לזהות את המילים / [2] הבנתי אבל התבלבלתי בין התשובות". תפיסתי → דחוף את המילים למודול הווקאבולרי עם האודיו שלהן. לוגי → תן משקל גבוה יותר לסוג-המפנה הרלוונטי בזרם התרגול. | `src/screens/listening-practice.js`, `src/data/` |
| T064 | P1 | M | **זרם תרגול עם interleaving אמיתי** — משקלל את סוג-המפנה החלש של התלמיד **יותר** בתוך תערובת interleaved (**לא** 3 קליפים רצופים מאותו סוג — זה blocking). ייתכן set ממוקד אופציונלי קצר של 3 קליפים, אך הוא לא המנגנון הראשי. | `src/data/listening.data.js`, `src/screens/listening-practice.js` |
| T065 | P1 | M | **Blind-solver validation** — לכל שאלה מחוברת: תן קליפ+שאלה ללא המפתח, ובדוק שה-pivot המכוון אכן קובע את התשובה (אותה שיטה כמו במודול Rephrase, T041a). | תהליך QA + DB `listening_questions` |
| T066 | P2 | M | **קליפי "global" ללא מפנה יחיד** — לבניית stamina להאזנה לאורך 90 שניות שלמות; מתויגים ככאלה. | DB `listening_lectures` |
| T067 | P0 | M | **מנת כיול ראשונה** — Calibration-Batch Method חל (batch קטן מבוקר → Lion מאשר → ואז bulk). המנה הראשונה חייבת להיות **פריטי `continuation`** (הסוג שהוזנח פעמיים) כדי לחשוף unknowns מוקדם. `is_published=false` עד אישור. | DB `listening_lectures`, `listening_questions` |

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
| T070 | P0 | L | **הפעל RLS** על כל הטבלאות — policies לפי `auth.uid()`. כולל: `restatement_questions`, `restatement_attempts`. בדוק מ-client שמשתמש לא יכול לקרוא דאטה של אחר. | Supabase SQL (policies) |
| T071 | P0 | L | **מערכת תשלומים** — Stripe integration, webhooks, עדכון `paid_track`/`paid_expires_at` ב-`user_profiles`. | `src/data/profiles.data.js`, Supabase edge functions |
| T072 | P0 | M | **Free tier enforcement** — gate תוכן לפי `paid_track`: 200 מילים ראשונות בלבד, sampling של תרגילים, מוק סימולציה אחד. | Data modules + screens |
| T073 | P1 | M | **Teacher partner landing** — עמוד נחיתה + טופס הצטרפות לשותפי מורים (15-20% עמלה). | דפי landing (מחוץ ל-app) |
| T074 | P1 | S | **Error tracking** — Sentry או דומה, לפחות console error aggregation. | `src/main.js` |
| T075 | P2 | M | **Mock simulation** — מבחן מדומה מלא. פיצ'ר premium. | סעיף נפרד בפרויקט |
| T076 | P0 | S | **⛔ BLOCKER — שדרג Supabase ל-Pro** — free tier מושהה אוטומטית אחרי שבוע חוסר פעילות; יהרוג פרודקשן. שדרג לפני כל חשיפה ציבורית. | Supabase dashboard |
| ~~T077~~ | ❌ **OBSOLETE** | S | ~~**אשר batch L5-B1** (25 שאלות)... `UPDATE restatement_questions SET is_published=true WHERE generation_batch='L5-B1'`.~~ **מיושן: התוכן נמחק ב-v4 clean-slate reset (14.7.2026).** batch L5-B1 היה חלק מ-279 הפריטים שנמחקו ואורכבו. עקרון האישור-לפני-פרסום נשמר וחל על כל batch של v4. | ~~DB `restatement_questions`~~ |

---

## Backlog — תשתית ותחזוקה (לא חוסם)

> לא חוסם launch ולא חוסם עבודת האזנה. לטיפול כשיש זמן.

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T078 | P2 | S | אתחול Supabase CLI בריפו (supabase init + config.toml) — כרגע אין מנגנון push/pull מקומי. | `supabase/` |
| T079 | P2 | M | `supabase db pull` מלא כדי לסנכרן את 9 המיגרציות הקיימות ב-production שאין להן קובץ בריפו (כרגע יש רק `listening_pipeline_prep`). | `supabase/migrations/` |

### Backlog — Listening (P2, לא חוסם; החלטות review 15.7.2026)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T080 | P2 | M | **סימולציית קושי אדפטיבי** — המבחן אדפטיבי per-section, אבל ה-MVP לא צריך סימולטור אדפטיבי; תרגול טוב בכל רמה מספיק. | — |
| T081 | P2 | S | **כיול speakingRate מדויק per-genre** — כרגע בשימוש interim 0.90 (monologue) / 0.95 (dialogue); lecture TBD. | `LISTENING_FORMAT.md`, pipeline הפקת אודיו |
| T082 | P2 | M | **הצגת transcript בפידבק** — נדחה (מסיר בינתיים את חשש ה-split-attention). מומש כרגע כ"השמעת אזור המפנה בלבד" ב-T058. | `src/components/feedback-panel.js` |
| T083 | P2 | S | **קולות narrator נוספים מעבר ל-Charon** — דרישת שני-הקולות של dialogue (Charon+Kore) נשארת core; קולות single-narrator נוספים הם polish, להוסיף רק אם טריוויאלי. | pipeline הפקת אודיו, `listening_lectures.voice_config` |
| T084 | P2 | S | **שריון slot ניווט למודול כתיבה עתידי** — ("כתיבה — בקרוב") ולוודא שהסכימה לא חוסמת אותו. מבחן הלאל האמיתי כולל כתיבה/word-formation, אבל זה מודול נפרד, כבר future-scoped — לא תפקיד מודול ה-Listening. | `src/components/navbar.js`, schema |

### Open Validation — Listening (לפני bulk production; לא חוסם עדכון docs)

| ID | עדיפות | גודל | משימה | קבצים מושפעים |
|---|---|---|---|---|
| T085 | P1 | M | **הסכמת מומחים על 7 הקליפים הרשמיים** — 2-3 מומחים (מורה לאנגלית / סטודנט חזק לשעבר-פסיכומטרי) פותרים את 7 הקליפים הרשמיים באופן עצמאי; מדוד הסכמה מול מפתח התשובות המשוער. **אין לנו מפתח רשמי** — כל התשובות ה"נכונות" משוערות. | `docs/LISTENING_FORMAT.md` (Inferred answer key) |
| T086 | P1 | M | **Re-validation של ממצאי n=7** — הממצאים ("מילים קיצוניות מנבאות קושי", "3 משפחות hinge") הם **מחוללי-השערות, לא מוכחים** — לְאמת מחדש ככל שהספרייה גדלה, רצוי עם blind coding בצ'אט נפרד (כפי שנעשה ל-Rephrase). לסווג מחדש את המתאם 0.82 (אורך↔קושי) כ**השערה** (חלקית מעגלי). | `docs/LISTENING_FORMAT.md` |

---

## מחסום הזמן

| אבן דרך | תאריך יעד | מה נדרש |
|---|---|---|
| Alpha (Lion בלבד) | יוני 2026 | Phase 0 + Phase 1 מלא |
| Beta (50 משתמשים) | יולי 2026 | Phase 1 + 2 + Hub |
| Launch | ספטמבר 2026 | Phase 1-4 + Phase 5 חוסמי-launch |
| מבחן ראשון | דצמבר 2026 | 🎯 |
