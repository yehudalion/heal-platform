# קורפוס אמת — הבנת הנקרא (2026-09-01)

חומר ייחוס אופליין בלבד. לפי `ARCHITECTURE.md` §2.19 ו-`CONTENT_SOURCES.md`:
**שום פריט מהקורפוס הזה לא נכנס ל-DB ולא לתוכן שהלומד רואה.** הוא מכייל ייצור,
הוא לא מספק אותו.

## מקור

42 מבחני עבר אמיתיים של מאל"ו, 2012–2025, מתיקיית הדרייב "מבחני עבר באנגלית"
של ליאון. מכל מבחן חולצו **רק** החלקים של Reading Comprehension בשני פרקי
האנגלית (Text I = שאלות 13–17, Text II = שאלות 18–22), יחד עם מפתח התשובות.

**ההצדקה לכייל אמירנט על פסיכומטרי** היא ציטוט של מאל"ו עצמם במצגת הרשמית:
*"סוגי השאלות שבה זהים לסוגי השאלות שבפרקי האנגלית בבחינה הפסיכומטרית."*
המבנה גם תואם בפועל — 5 שאלות לקטע בשניהם.

## היקף

| | |
|---|---|
| מבחנים | 42 |
| קטעים | 166 |
| שאלות | 830 (5 לכל קטע, ב-166 מתוך 166) |
| מסיחים מתויגים | 2,490 |

## הקבצים

**`reading_passages_corpus.csv`** — שורה לכל קטע.
`exam, section, text_no, q_range, words, paragraphs, sentences, words_per_sentence,
pct_outside_top5k, pct_outside_top8k, rare_words_per_sentence, domain, subject,
shape, has_pivot, pivot_marker, opening_move, closing_move, is_biography,
requires_outside_knowledge, key_reliability, passage`

**`reading_questions_corpus.csv`** — שורה לכל שאלה.
`exam, section, text_no, n, pos_in_block, type, negative, cited_line, key, stem,
opt1..opt4, locator_in_stem, answer_home, answer_span_sentences, scan_sufficient,
scan_comment, correct_option_relation, correct_shares_wording, key_looks_wrong,
key_comment, key_reliability, mech1..mech4, why1..why4`

`mechN` / `whyN` מלאים רק עבור המסיחים (האינדקס של התשובה הנכונה ריק).

## איך נמדד

1. **חילוץ** — טקסט מלא מכל PDF, ואז הפרדה של חלקי Reading Comprehension בלבד.
   מפתח התשובות בכל מבחן יושר ידנית ואומת מול תוכן הקטע, פריט-פריט.
2. **מדידה לשונית** — סקריפט: ספירת מילים אחרי הסרת סמני השורות `(1) (5) (10)`,
   ספירת פסקאות ומשפטים, ושכיחות מילים לפי `wordfreq` (שמות פרטיים הוצאו).
3. **ניתוח מנגנון** — כל שאלה נותחה בנפרד: איזה עוגן יש בשאלה, איפה התשובה
   באמת גרה, האם קריאה מקומית מספיקה, ומה בדיוק כל מסיח עושה.
4. **בקרה** — כל 830 המפתחות נבדקו שוב מול תוכן הקטע.

## אמינות

8 מפתחות מתוך 830 (0.96%) סומנו כחשודים, מהם 5 במבחן אחד.

- **`autumn_2018` — `key_reliability=SUSPECT` בכל שורותיו. להוציא מכל כיול.**
  (5 מפתחות חשודים + הערת חילוץ משלו על בעיית מפתח.)
- `dec_2016` — 2 שאלות חשודות (סעיף 1 ש' 20, סעיף 2 ש' 20).
- `psy_winter_2021` — שאלה אחת חשודה (סעיף 1 ש' 20).
- 3 מפתחות נשארו `null` (autumn_2018).
- `psy_autumn_2024` — פרק האנגלית השני לא חולץ; יש בו 2 קטעים במקום 4.

## שימוש

המספרים שנגזרו מהקורפוס יושבים ב-`docs/READING_FORMAT.md`.
**לפני שמשנים מספר שם — לאמת מול הקבצים האלה, לא מהזיכרון.**
