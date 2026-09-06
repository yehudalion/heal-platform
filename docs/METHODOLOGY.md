# מעל הרף — Methodology
**Version:** 1.0
**Last Updated:** 2026-05-24

> קרא קובץ זה לפני שאתה משנה את `srs.data.js`, `words.data.js`, או לוגיקת בחירת מילים.

---

## 1. Impact Score — מה זה ולמה

`words.impact_score` הוא מדד יחיד שקובע סדר הצגת מילים למשתמש.

**הרעיון:** לא כל המילים שוות. מילה שמופיעה בתדירות גבוהה, רלוונטית לבחינה, וקשה למדברי עברית — שווה יותר מאחת שאינה כך.

---

## 2. נוסחת Impact Score

```
impact_score = (frequency_weight × 0.4)
             + (exam_relevance   × 0.35)
             + (difficulty_he    × 0.25)
```

### 2.1 רכיבים

| רכיב | משקל | מה זה | טווח |
|---|---|---|---|
| `frequency_weight` | 40% | תדירות המילה בטקסטים אקדמיים (COCA, BNC) | 0–100 |
| `exam_relevance` | 35% | רלוונטיות ישירה לבחינת הלאל על בסיס מבחנים קודמים | 0–100 |
| `difficulty_he` | 25% | קושי ספציפי למדברי עברית (false friends, אין מקביל עברי קרוב) | 0–100 |

### 2.2 impact_percentile — נגזר מהנוסחה

```sql
impact_percentile = PERCENT_RANK() OVER (ORDER BY impact_score ASC) × 100
```

מחושב פעם אחת ב-migration. חייב להיות מחושב מחדש כאשר מילים נוספות לטבלה.

---

## 3. Pedagogical Tiers — נגזר מ-impact_percentile

| שם | טווח percentile | כמות (מ-550) | שימוש |
|---|---|---|---|
| **מילות ליבה** | ≥ 90 | ~55 | Free tier + ראשונות לתרגול |
| **מילות יתרון** | 60–89 | ~165 | Premium בלבד |
| **מילות העשרה** | < 60 | ~330 | Premium בלבד |

**⚠️ אזהרה בולדית: tier הוא תווית שיווקית בלבד. הקוד תמיד בוחר לפי `impact_score` ישירות — לעולם לא לפי `tier`.**

---

## 4. לוגיקת בחירת מילים (SRS Queue)

### 4.1 סדר עדיפויות

```
1. מילים שdue_at <= NOW()         (חזרות מתוזמנות — עדיפות עליונה)
2. מילים חדשות לפי impact_score   (חשובות ראשון — מבין הלא-למודות)
3. מילים שלא חדשות ולא due         (לא מוצגות עד שמגיע תורן)
```

### 4.2 גדלי session מומלצים
- **Session יומי:** 10-20 מילים (חזרות + חדשות)
- **מילים חדשות per session:** מקסימום 10 — למנוע overload
- **חזרות per session:** אין קפה — כל מה שdue

### 4.3 Free Tier Gate
```sql
WHERE impact_percentile >= 64  -- Top 200 מילים מ-550
```

---

## 5. אלגוריתם SRS — SM-2 מפושט

### 5.1 הגדרות State

| state | משמעות |
|---|---|
| `new` | המילה טרם הוצגה למשתמש |
| `learning` | נוצגה, עדיין לא הגיעה ל-review |
| `review` | נלמדה, חזרות בפרקי זמן גדלים |
| `relearning` | חזרה מ-review, התלמיד שכח (again) |

### 5.2 חישוב Intervals לפי Rating

| state × עכשיו | rating | state חדש | interval |
|---|---|---|---|
| `new` / `learning` | `again` | `learning` | 1 דקה |
| `new` / `learning` | `hard` | `learning` | 10 דקות |
| `new` / `learning` | `good` | `review` | 1 יום |
| `new` / `learning` | `easy` | `review` | 4 ימים |
| `review` | `again` | `relearning` | 10 דקות |
| `review` | `hard` | `review` | interval × 1.2 |
| `review` | `good` | `review` | interval × ease |
| `review` | `easy` | `review` | interval × ease × 1.3 |
| `relearning` | `again` | `relearning` | 10 דקות |
| `relearning` | `good` | `review` | 1 יום |
| `relearning` | `easy` | `review` | interval קודם × 0.5 |

### 5.3 Ease Factor

- ברירת מחדל: `2.5`
- `hard`: ease -= 0.15
- `easy`: ease += 0.15
- מינימום ease: `1.3` (לא מאפשרים interval לצמוח עצמאית ללא גבול)

### 5.4 הערה על FSRS

SM-2 מספיק ל-MVP. FSRS (האלגוריתם החדש של Anki) מדויק יותר אך דורש:
1. היסטוריית דאטה מספיקה לאימון
2. impl מורכב יותר

`srs_review_log` אוסף את כל הנתונים הנדרשים ל-FSRS. כשיש 1000+ משתמשים פעילים — שווה לשקול המרצה.

---

## 6. Session Queue & DB Integrity — The Two-World Model

The vocab practice session operates on TWO independent layers that must never be confused:

### World 1 — The Database (long-term, days-to-months)
Every rating is evaluated by the SM-2 algorithm and updates `srs_progress` + appends to `srs_review_log`. The DB tracks long-term retention only. It does not know what a 'session' is — only when each word is next due.

### World 2 — The Local Session Queue (short-term, minutes)
A JavaScript array in `card.js` holding the words shown in this sitting. Manages re-queuing for words the student couldn't recall, so the student doesn't leave the session with un-mastered words.

### The Bridge — Two Critical Rules

**Rule A — DB writes only on first rating (Hard):**
When a word receives multiple ratings within the same session, only the FIRST rating is written to the DB. The reason: a 'Good' rating 2 minutes after seeing the word is powered by working memory, not long-term retention. Treating it as long-term retention would cause the algorithm to schedule the word too far in the future, leading to forgotten words.

**Rule B — Hostage cap (Strong):**
A word can be re-queued at most 2 times per session (max 3 total appearances). After the cap, the word exits the session regardless of rating. Without this cap, a tired student facing the same word 5+ times will click 'Good' just to escape — which Rule A also catches (only the first 'Again' was recorded), but the cap is the cleaner UX.

### State Tracked Per Session

```javascript
firstRatings    : { wordId: 'again' | 'hard' | 'good' }   // for DB integrity gate
intraSessionReps: { wordId: count }                        // for hostage cap
outcomes        : { wordId: 'first_good' | 'recovered' | 'carry_over' }  // for analyze screen
```

### Outcome Categories (Shown on Analyze Screen)

- **first_good** — Student rated 'Good' on first sight. Word goes to next SM-2 interval normally.
- **recovered** — Student rated 'Again' or 'Hard' first, eventually got it right within the session. DB recorded the failure; the recovery is for morale only.
- **carry_over** — Word hit the cap without ever being rated 'Good'. DB has its failure logged; word will return tomorrow scheduled by SRS.

### Example Walkthrough

```
Session starts with 20 words: [evaluation, appropriate, ...]

Click 1: evaluation → 'Again'
  DB: state='learning', lapses+=1, due_at=+1min  (FIRST rating, written)
  Local: firstRatings[eval]='again', reps[eval]=1
  Queue: [appropriate, resilient, EVALUATION, ...]  (re-queued 2 positions back)

Click 2: appropriate → 'Good'
  DB: state='review', due_at=+1day  (FIRST rating, written)
  Local: outcomes[appropriate]='first_good'
  Queue: [resilient, evaluation, ...]

Click 4: evaluation (returns) → 'Good'
  DB: NOTHING  (not first rating — Rule A blocks the write)
  Local: outcomes[evaluation]='recovered'
  Queue: evaluation removed

Session continues until queue is empty.
```

This two-world architecture is the foundation of all future Practice screens (Rephrase, Listening). They will reuse the same pattern.

---

## 7. איך לעדכן impact_score

### 6.1 מתי לעדכן
- בהוספת מילים חדשות ל-`words`
- בשינוי המשקלות (דורש אישור Lion בכתב)

### 6.2 SQL לחישוב מחדש של percentile

```sql
UPDATE words w
SET    impact_percentile = ranked.pct
FROM (
  SELECT id,
         ROUND((100.0 * PERCENT_RANK() OVER (ORDER BY impact_score ASC))::numeric, 2) AS pct
  FROM   words
  WHERE  impact_score IS NOT NULL
) ranked
WHERE w.id = ranked.id;
```

### 6.3 שינוי משקלות — תהליך

שינוי המשקלות (0.4 / 0.35 / 0.25) הוא החלטה מהותית שתשנה את סדר **550 מילים**. אם רוצים לשנות:
1. לנמק בכתב
2. לאשר עם Lion
3. לתעד ב-Decision Log ב-ARCHITECTURE.md
