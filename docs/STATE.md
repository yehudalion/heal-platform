# HighScore — Project State
**Version:** 1.0  
**Last Updated:** 2026-05-24  
**Updated By:** Lion (post Path-B migration)

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
| Sentence Rephrasing | 🔴 לא פעיל | קוד ישן, FK שגוי, לא מחובר לסכמה חדשה |
| Listening | 🔴 לא קיים | טבלאות ישנות נמחקו, סכמה חדשה ריקה |
| RLS | 🔴 כבוי | מכוון בשלב dev — חובה לפני launch |

## 🟢 עובד ויציב
### Data Layer (`src/data/`)
- `profiles.data.js` — getProfile, upsertProfile, completeOnboarding, touchLastActive ✅
- `words.data.js` — getWordsByImpact, getWordById, searchWords ✅
- `srs.data.js` — getDueWords, rateWord, getSessionStats + SM-2 algorithm ✅
- `rephrase.data.js` — getRephraseQuestions, saveRephraseAttempt, getRephraseAnalytics ✅
- `listening.data.js` — getLectures, getLectureQuestions, startSession, completeSession, saveQuestionResponse, getListeningHistory ✅

### Auth / Google OAuth
* Google OAuth עובד ב-local VS Code ✅
* Trigger `on_auth_user_created` יוצר שורה ב-`user_profiles` עם `display_name` + `avatar_url` מ-Google metadata ✅
* Backfill בוצע ל-2 משתמשים קיימים ✅
* magic-link users מקבלים שורה עם NULL display_name — תקין (אין Google metadata)

### DB Schema (post Migration 001)
* 10 טבלאות נקיות בפרודקשן
* `words` — 550 שורות עם הגדרות עבריות, audio URLs, impact_percentile מאוכלס
* `restatement_questions` — 199 שורות עם anchors_json, blackout_words_json, trap_type
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
### Sentence Rephrasing
* קוד ישן קיים אך לא פעיל
* FK ישן הצביע על user_profiles במקום auth.users — כבר תוקן בסכמה
* נדרש בנייה מחדש כנגד הסכמה החדשה (restatement_attempts) ומבנה 3 שכבות

### Listening
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
| 199 שאלות ב-DB | ✅ (סינתטיות — מקוריות שלנו) |
| anchors_json | ✅ קיים |
| blackout_words_json | ✅ קיים |
| trap_type | ✅ קיים |
| difficulty_level | ❌ ריק (לא תויג — T041 Calibration Batch) |
| UI / Practice screen | ❌ לא קיים |
| Analyze screen | ❌ לא קיים |
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
| difficulty_level ל-199 שאלות — מי ממלא? | 📋 ב-TASKS.md (T041 Calibration Batch) |

## החלטות תוכן (2026-05-27)
| החלטה | סטטוס |
|---|---|
| §2.19 כלל רישוי תוכן נוסף ל-ARCHITECTURE.md | ✅ |
| 520 שאלות מ-NITE PDFs — לא נטענות ל-DB | ✅ החלטה סופית |
| T040 ימשיך מול 199 שאלות סינתטיות קיימות | ✅ |
| T041 Calibration Batch — 30 שאלות מקוריות חדשות לרמות 1+2 | 📋 עתידי |
| CONTENT_SOURCES.md נוצר | ✅ |
