# דגימת אמירנט אמיתית — פרק הבנת הנקרא (2026-09-01)

חומר ייחוס אופליין בלבד (`ARCHITECTURE.md` §2.19). **שני הקטעים כאן לא נכנסים
ל-DB ולא לתוכן שהלומד רואה.**

## מקור

מבחן ההתנסות הרשמי של מאל"ו, <https://amirnet-practice.nite.org.il/amirnet.html>
← "להתחלת המבחן" ← Test 1 (Reading, Lecture+Questions, Grammar In Context).
צילומי מסך שליאון לקח ידנית ב-1.9.2026 (הבחינה נפתחת בחלון שדפדפן אוטומטי לא רואה).

**זו הדגימה היחידה שיש לנו מפרק הקריאה של האמירנט עצמו** — אבל היא כבר
משמעותית: n=2 קטעים, ועל **שניהם** יש עכשיו את **5 השאלות המלאות** — כלומר
**שני טקסטים אמירנטיים שלמים, מקצה לקצה, 10 שאלות אמיתיות**. כל שאר הכיול
(166 קטעים, 830 שאלות) הוא מפרקי האנגלית בפסיכומטרי.

## מה נמדד

| | Zubbles | Firdousi | חציון הקורפוס הפסיכומטרי (n=166) |
|---|---|---|---|
| מילים | **254** | **298** | 285 |
| פסקאות | 3 | 3 | 3 |
| משפטים | 16 | 16 | 15 |
| מילים למשפט | 15.9 | 18.6 | 19.0 |
| % מחוץ ל-5,000 השכיחות | 18.8% | 13.6% | 15.6% |
| % מחוץ ל-8,000 השכיחות | 11.4% | 9.3% | 10.7% |
| מילים נדירות למשפט | 0.88 | 1.00 | 0.94 |
| מילים לפסקה | 87 / 96 / 74 | 80 / 158 / 67 | — |

**שני הקטעים נופלים בתוך הטווח שנמדד על הפסיכומטרי, בכל מדד.** 254 ו-298 מילים
מול חציון 285 וטווח p10–p90 של 228–360. אין שום עדות לכך שהקטע באמירנט ארוך יותר.
15 הדקות הן פשוט תקציב נדיב, לא סימן לקטע ארוך.

## ההבדל המבני היחיד שנמצא

**אין מספור שורות.** בשני הקטעים אין את סמני `(1) (5) (10)` שמופיעים ב-166 מתוך
166 הקטעים בקורפוס הפסיכומטרי. זה הגיוני לממשק גולל, וזה מבטל את מנגנון העיגון
של 18.8% מהשאלות בקורפוס — דווקא המחלקה הכי סריקה שיש (87.2% נפתרות מקומית).
ראו `READING_FORMAT.md` §4 ו-§7.

## הממשק (מצילומי המסך)

- הקטע בצד **שמאל**, השאלות בצד **ימין** — תואם לניסוח הרשמי בדף הטיפים של מאל"ו.
- **שאלה אחת מוצגת בכל רגע**, עם חץ מעבר לשאלה הבאה.
- כפתור **"Hide Questions"** מסתיר את חלונית השאלות ומרחיב את הקטע.
- הקטע נכנס במלואו למסך בלי גלילה בקטע של 254 מילים.
- **ממצא חדש וחשוב: הממשק מדגיש (highlight) את המשפט הרלוונטי בקטע בצהוב,
  כשהשאלה מצטטת ניסוח מהטקסט** (נצפה בשאלות 3 ו-4 על Zubbles — ראו למטה).
  זה בפועל תחליף-על למספור שורות עבור השאלות שבהן יש ציטוט במטבע: הממשק
  עושה את הסריקה במקום הלומד. זה **לא** קורה בשאלות בלי עוגן טקסטואלי
  (כותרת, מטרת פסקה) — שם הלומד לבד. ראו ניתוח מלא למטה ובסעיף המסקנות.

## חמש השאלות שנצפו — טקסט אמירנטי שלם (Zubbles)

זה טקסט אמירנטי אחד עם **כל 5 השאלות שלו**, לא רק פריט בודד — הבדיקה
המשמעותית ביותר שיש לנו עד כה, כי אפשר לבדוק מולו את כל הטקסונומיה בבת אחת:
סוגי שאלות, עוגן, מנגנון מסיחים, ומספיקות-סריקה. מפתח התשובות לא נצפה באף
שאלה — הניתוח הוא תמיד מול תוכן הקטע עצמו, לא מול "הנכון שנצפה".

| # | סוג (למול הטקסונומיה) | עוגן בשאלה | האם הדגשה בממשק | סריקה מספיקה? |
|---|---|---|---|---|
| 1 | כותרת (title) | אין | לא | **לא — צריך את כל הטקסט** |
| 2 | מטרת פסקה (paragraph_purpose) | "the first paragraph" (מיקום סידורי) | לא | **לא — צריך את כל הפסקה** |
| 3 | ניסוח מחדש (restatement) | ציטוט מהטקסט | **כן** | כן — מקומי |
| 4 | הסקה (inference) | ציטוט מהטקסט | **כן** | **לא לגמרי — צריך את המשפט שלפני** |
| 5 | פרט/ניסוח מחדש (מילוי חסר) | "the last paragraph" (מיקום סידורי) | לא | **לא — צריך את כל הפסקה** |

**רק 1 מתוך 5 (20%) נפתרת בקריאה מקומית טהורה** — נמוך אפילו מ-39.5% שנמדד על
הפסיכומטרי. n=5 קטן מכדי לעדכן מספר, אבל הכיוון עקבי: **לא פחות דרישה
לקריאה מלאה באמירנט — אולי יותר.**

### שאלה 1 — כותרת

**"An appropriate title for this text would be -"**

1. The Hazards of Inventing Toys — **קטן מדי** (פרט אמיתי מפסקה 2 בלבד — התאונות)
2. Zubbles: A Classic Toy Reinvented — *(לא נצפה כנכונה, אך זו הכותרת התואמת הכי טוב את כל הקטע)*
3. How Kehoe and Sabnis Revolutionized the Toy Market — **גדול מדי** ("revolutionized the toy market" לא נאמר בשום מקום)
4. Spontaneous Fading: Water-Soluble Dyes — **קטן מדי** (פרט אמיתי מפסקה 2 בלבד — כימיית הצבען)

שלושת המסיחים הם אותו מפתח אחד — "קטן מדי או גדול מדי" — בדיוק כמו שנמדד:
69% מהמסיחים בשאלות כותרת בקורפוס.

### שאלה 2 — מטרת פסקה ראשונה

**"The main purpose of the first paragraph is to -"**

1. claim that bubbles are the world's favorite toy — **גדול מדי** (הטקסט אומר "a constant favorite", לא "the world's favorite")
2. explain why new ideas for toys lose their charm quickly — **אמת אבל לא נשאל** (ניסוח שמופיע בטקסט, אבל כרקע-ניגוד, לא כמטרת הפסקה)
3. describe toys that have been available since the 1940s — **קטן מדי** (פרט אמיתי, מפספס את החידוש המרכזי — הצבע)
4. introduce a new form of a favorite toy — *(הניסוח שמסכם בדיוק את תנועת הפסקה: מבועה קלאסית → קהו רוצה לקחת אותה צעד קדימה, בצבע)*

זו בדיוק שאלת ה"מטרת פסקה" שסימנתי כסוג מומלץ להוספה (`READING_FORMAT.md` §9,
שאלה פתוחה 2) — וכאן היא מופיעה בפועל, לא כהשערה. אין עוגן כלל בשאלה עצמה
("the first paragraph" הוא מיקום, לא רמז לתוכן) — הלומד חייב לקרוא את כל
הפסקה ולתמצת אותה, בדיוק המיומנות שהשיטה המקורית (שאלה→סריקה→קריאה→תשובה)
לא מתרגלת במפורש.

### שאלה 3 — ניסוח מחדש (עם הדגשה בממשק)

**"'The realization . . . undertaking' could be restated as -"**
(המשפט המצוטט מודגש בצהוב בקטע עצמו — פסקה 2, משפט 1)

1. Kehoe realized he had wasted eleven years of his life — מערבב פרט אמיתי מפסקה 1 (11 שנים) עם קביעה שקרית ("wasted") — הפסקה מסתיימת בהצלחה
2. The solution turned out to be simple — **ניגוד ישיר** (ההפך מ"no simple undertaking")
3. Kehoe accomplished his goal very quickly — **ניגוד ישיר** (ההפך מ"devoted eleven years")
4. It was extremely difficult to produce colored bubbles — *(ניסוח מחדש נכון — "no simple undertaking" = "extremely difficult")*

זו הדוגמה הכי נקייה ל"הדגשה = הסריקה כבר נעשתה בשביל הלומד": ברגע שהמשפט
מודגש, קריאתו לבד (±1 משפט) מספיקה. שלושת המסיחים לא דורשים לקרוא שום דבר
מעבר לזה — הם נבדלים בהיגיון הפנימי, לא במיקום.

### שאלה 4 — הסקה (עם הדגשה בממשק)

**'It can be inferred that "a water-soluble dye that faded spontaneously" would -'**
(הניסוח המצוטט מודגש בצהוב — פסקה 2, משפט אחרון)

1. wash out easily — **מילים נכונות, יחס שגוי**: זו התכונה של הצבען *הקודם* (בר-שטיפה) שכבר "still not ready", לא של הצבען החדש שדוהה מעצמו
2. horrify parents — **ניגוד ישיר**: זו בדיוק הבעיה שהתכונה החדשה פותרת
3. not leave stains — *(ההסקה הנכונה: אם הצבע דוהה מעצמו, לא נשאר כתם בכלל — גם לא זמני)*
4. not be ready to market — **ניגוד ישיר**: זו התכונה שבפועל הביאה את Zubbles לשוק ב-2009

זו השאלה היחידה מתוך ה-5 שבה ה**הדגשה לא מספיקה**: המשפט המודגש נותן את
המונח, אבל התשובה תלויה בהבנת המשפט *שלפניו* ("even temporary stains
horrified parents") — כלומר עדיין `needs_paragraph`, לא `yes_local`, למרות
ההדגשה. חשוב לשיטת החלון: הדגשה מצביעה לאן להסתכל, לא פוטרת מלקרוא סביב.

### שאלה 5 — פרט מהפסקה האחרונה (מילוי חסר)

**"According to the last paragraph, ___ experts on dye chemistry."**

1. Sabnis trains — **לא נאמר** (המצאה, אין בסיס בטקסט)
2. Kehoe consulted with several — **מילים נכונות, יחס שגוי**: "handful of experts... in the world" (יש מעט בעולם) מתערבב עם כמה קהו בעצמו פנה אליהם (**אחד** — Sabnis)
3. Kehoe could not find any — **ניגוד ישיר** (הוא כן מצא ופנה לסבניס)
4. there are very few — *(ניסוח מחדש נכון של "a handful of ... in the world")*

שוב אין הדגשה (העוגן הוא "the last paragraph" — מיקום סידורי, לא ציטוט), ושוב
נדרשת קריאת הפסקה השלמה כדי להבחין בין "יש מעט מומחים בעולם" ל"קהו פנה
לכמה מהם" — שתי טענות שונות שהמסיח הכי טוב (2) עומד בדיוק על הקו ביניהן.

### מה זה אומר במצטבר

- **כל 8 מנגנוני המסיחים שנמדדו בפסיכומטרי מופיעים כאן** בקנה מידה זעיר:
  קטן-מדי/גדול-מדי, אמת-אבל-לא-נשאל, ניגוד, מילים-נכונות-יחס-שגוי, לא-נאמר.
  שום מנגנון חדש לא הופיע — עדות טובה שהטקסונומיה מ-830 השאלות הפסיכומטריות
  אכן מתעתקת לאמירנט, לא רק לתוכן אלא גם למכניקת ההסחה.
- **שאלת "מטרת פסקה" (שאלה 2) קיימת בפועל** — לא השערה. זה מחזק משמעותית
  את ההמלצה להוסיף אותה כסוג נפרד (`READING_FORMAT.md` §9, שאלה 2).
- **ההדגשה הצהובה היא ממצא UX חדש שלא היה בפסיכומטרי כלל.** היא הופכת
  שאלות "ציטוט" לכמעט-מובטחות-סריקה — אבל רק כשאין עוד שכבת הסקה מעליהן
  (השוו שאלה 3 מול שאלה 4). ל-`READING_FORMAT.md` §7 (מפרט הפקה) כדאי
  להתייחס לזה: אם ניצור חוויית תרגול דיגיטלית, יש כאן החלטת עיצוב — האם
  לחקות את ההדגשה של מאל"ו (מתרגל את הלומד על הפורמט האמיתי) או להשאיר בלי
  (מתרגל את מיומנות הסריקה עצמה, כי בבחינת הנייר של הפסיכומטרי אין הדגשה
  כזו, רק מספרי שורות).

## חמש השאלות שנצפו — טקסט אמירנטי שני, שלם (Firdousi)

ליאון השיג גם את 5 השאלות המלאות על הקטע השני. **עכשיו יש לנו 2 טקסטים
שלמים, 10 שאלות אמיתיות** — לא עוד מדגם נקודתי. אף שאלה כאן לא מצטטת ניסוח
מהקטע במטבע — ולכן **אין הדגשה צהובה באף אחת מהן**. זה מחדד את הממצא
מ-Zubbles: ההדגשה מופעלת על-ידי ציטוט מילולי בגוף השאלה, לא על-ידי כל עוגן.
כשהעוגן הוא "הפסקה השנייה" או "הפסקה האחרונה" (מיקום סידורי) — אין שום עזרה
ויזואלית, גם אם קיים עוגן.

| # | סוג (למול הטקסונומיה) | עוגן בשאלה | הדגשה בממשק | סריקה מספיקה? |
|---|---|---|---|---|
| 1 | מטרת פסקה (paragraph_purpose) | "the second paragraph" | לא | **לא — כל הפסקה** |
| 2 | פרט (detail) | "the second paragraph" + ישות ("the advisors") | לא | **לא — פסקה, כולל אבחנה מפסקאות אחרות** |
| 3 | פרט/ניסוח מחדש | "the second paragraph" | לא | **לא — כל הפסקה** |
| 4 | מטרת פסקה (paragraph_purpose) | "the last paragraph" | לא | **לא — כל הפסקה** |
| 5 | שלילית/EXCEPT (negative) | אין (כל הטקסט) | לא | **לא — כל הטקסט** |

**0 מתוך 5 נפתרות בקריאה מקומית טהורה.** יחד עם Zubbles: **1 מתוך 10 (10%)**
בשני הטקסטים המלאים גם יחד — נמוך משמעותית מ-39.5% שנמדד בפסיכומטרי. ראו
סיכום מצטבר בסוף הסעיף.

### שאלה 1 — מטרת פסקה שנייה

**"The main purpose of the second paragraph is to -"**

הפסקה השנייה כולה: הסיפור על ההבטחה, הכסף, הסירוב, החרטה, השליחים וההלוויה.

1. explain why the Sultan was disappointed with Firdousi's Shahnameh — **לא נאמר**: הסולטן לא התאכזב מהשיר, הוא התחרט על *התנהגותו שלו* כלפי המשורר
2. discuss the historical events described in the Shahnameh — **ישות שגויה**: "האירועים המתוארים בשאהנאמה" הם ההיסטוריה הפרסית (מפסקה 1); הפסקה הזו מספרת סיפור *על* פירדוסי עצמו, לא תוכן מהשיר
3. compare several versions of the Shahnameh — **לא נאמר** (אין שום השוואת גרסאות)
4. present one story about the Shahnameh — *(הפסקה נפתחת ב"There are many different accounts... According to one" — זה בדיוק "מציג סיפור אחד מיני רבים")*

### שאלה 2 — מה המליצו היועצים

**"The advisors mentioned in the second paragraph recommended giving Firdousi -"**

1. less than what the Sultan had promised — *(כסף = ההבטחה המקורית זהב, היועצים המליצו כסף — פחות שווה)*
2. a robe — **מיקום שגוי**: הגלימה מוזכרת בהמשך הפסקה, אבל כחלק ממתנת ההתנצלות של הסולטן *עצמו*, לא המלצת היועצים
3. nothing — **ניגוד ישיר** (הם כן המליצו — כסף)
4. a gold coin for every verse he wrote — **מיקום שגוי/ניגוד**: זו ההבטחה *המקורית*, בדיוק מה שהיועצים המליצו *נגדו*

מסיחים 2 ו-4 הם שני פרטים אמיתיים מאותה פסקה, ממוקמים בטעות — בדיוק "מיקום
שגוי" (`wrong_location`) כפי שהוגדר בטקסונומיה: תשובה שנכונה איפשהו בטקסט,
אבל לא מהמקום שהשאלה שואלת עליו.

### שאלה 3 — מה עשה הסולטן (הפריט המעניין)

**"According to the second paragraph, Sultan Mahmud -"**

1. was invited to Firdousi's funeral — **לא נאמר**: השיירה הגיעה *במקרה* בזמן ההלוויה, לא שהוזמן אליה
2. requested that Firdousi write another poem — **לא נאמר**
3. did not do as his advisors suggested — *נכון באופן טכני* (הוא בסוף שלח זהב, בניגוד להמלצת הכסף), אבל זו מסקנה שהתלמיד צריך לחשב בעצמו — הפסקה לא אומרת את זה במפורש
4. realized he had behaved badly towards Firdousi — *(ניסוח כמעט מילולי: "deeply regretted his unfair treatment of the poet")*

**זה הפריט היחיד מתוך 10 שבו הניתוח שלי לא חד-משמעי.** אופציה 4 היא ניסוח
מחדש כמעט-מילולי ונראית כמו התשובה המיועדת, אבל אופציה 3 היא גם טענת אמת
לגיטימית שדורשת רק חישוב-שרשרת אחד (המלצה → כסף → בסוף בכל זאת זהב = לא
עשה כמו שיעצו). אם 3 היא המסיח, זה מסיח מתוחכם בהרבה מהרגיל — "אמת, אבל לא
מה שהפסקה *אומרת*" ולא רק "אמת אבל לא נשאל". שווה בדיקה מול מפתח אמיתי אם
יזדמן.

### שאלה 4 — מטרת פסקה אחרונה

**"The main purpose of the last paragraph is to -"**

1. explain why Firdousi's daughter turned down the gold coins — **לא נאמר**: היא סירבה, אבל שום סיבה לא ניתנת בטקסט בכלל
2. discuss how the Sultan's money was used — *(מסכם בדיוק את הפסקה: האחות השתמשה בכסף לחומה ולפונדק)*
3. describe the wall built in Firdousi's memory — **קטן מדי + יחס שגוי**: החומה נבנתה למניעת הצפה (בקשתו של פירדוסי), ה*פונדק* הוא זה שנבנה לזכרו — הטקסט מבלבל בין השניים בכוונה
4. describe the caravanserai built at the Sultan's request — **ישות שגויה**: הפונדק נבנה ביוזמת האחות לזכר אחיה, לא לבקשת הסולטן

### שאלה 5 — שלילית (EXCEPT), כל הטקסט

**"According to the text, Firdousi was not -"**

1. a respected poet — נאמר (משורר "of great eminence"), נפסל
2. an advisor to the Sultan — *(אף פעם לא נאמר — ולהפך: "היועצים" בטקסט הם יועצי הסולטן שלו, אנשים אחרים לגמרי)*
3. familiar with Persian legends — נאמר (מבוסס על "an earlier collection of Persian stories"), נפסל
4. interested in protecting his village — נאמר (רצה לבנות חומת הגנה מפני הצפה), נפסל

זו דוגמה נקייה ל"ישות שגויה" בשיא העוצמה שלה: הטקסט *כן* מזכיר "advisors" —
אבל אלה יועצי הסולטן, לא פירדוסי. תלמיד שסורק את המילה "advisor" ומוצא אותה
בטקסט עלול לפסול את האופציה הנכונה בטעות, כי "המילה כן מופיעה שם". זה בדיוק
סוג המלכודת ש"שיטת החלון" נועדה למנוע — לזהות *מי* עושה את הפעולה, לא רק
*אם* המילה מופיעה.

## מסקנות משתי הדגימות המלאות יחד (10 שאלות אמיתיות)

- **סוגי שאלות:** 3 מתוך 10 (30%) הן "מטרת פסקה" — לא שוליים כלל. זה כבר לא
  השערה שדורשת אישוש — זה סוג ליבה שחוזר בכל טקסט אמירנטי שנצפה. ממליץ
  להסיר את ההסתייגות ב-`READING_FORMAT.md` §9 ולאשר את הוספת הסוג כברירת
  מחדל, לא כאופציה.
- **מספיקות סריקה: 1/10 (10%) בלבד "מקומי טהור"** — נמוך משמעותית מ-39.5%
  שנמדד בפסיכומטרי, ובעקביות בשני הטקסטים (0/5 ו-1/5). n=10 עדיין קטן
  סטטיסטית, אבל שני-מתוך-שני טקסטים מראים את אותו כיוון, לא רעש אקראי.
  זה מחזק — לא רק "לא סותר" — את ההמלצה לשיטת החלון (`READING_FORMAT.md`
  §5.4): אם משהו, הצורך לקרוא פסקה שלמה לפני מענה חזק יותר באמירנט מאשר
  במה שנמדד בפסיכומטרי, כנראה כי אין מספרי שורות שמאפשרים "לזרוק עוגן"
  מדויק ולקרוא רק סביבו.
- **מנגנון "מיקום שגוי" (`wrong_location`) בולט**: כששני פרטים אמיתיים
  יושבים בפסקאות סמוכות (הגלימה / הבטחת הזהב המקורית; החומה / הפונדק), האמירנט
  בונה מסיחים שמזיזים פרט נכון למקום הלא נכון. זה מנגנון שדורש בדיוק את מה
  שהשיטה המקורית (שאלה→סריקה→קריאה→תשובה) לא מלמדת: לוודא *מאיפה* הפרט,
  לא רק *שהוא קיים*.
- **שאלה 3 (Firdousi) פתוחה**: המסיח היחיד מתוך 10 שנראה כמעט-נכון גם לי.
  לא מזיז מסקנה, אבל מסומן כאן כדי לחזור אליו אם יגיע מפתח תשובות אי-פעם.

## הקטעים

### Zubbles (254 מילים)

> In the world of toys, where new ideas lose their charm alarmingly quickly, a
> small bottle containing soapy liquid used to blow bubbles has been a constant
> favorite since the 1940s. According to one current industry estimate, 200
> million bottles of bubble liquid are sold annually. Tim Kehoe, a toy inventor
> from St. Paul, Minnesota, dreamed of taking the classic, transparent bubble one
> step further. He devoted eleven years of his life to creating colored bubbles –
> bubbles of a single vibrant hue, be it green, blue, or pink.
>
> The realization of Kehoe's dream proved to be no simple undertaking. In the
> process, he stained his car, several bathtubs, and a few dozen children. He
> ruined kitchen countertops and corporate conference tables, and caused a
> chemical fire or two. Eventually, he succeeded in making colored bubbles with a
> dye that could be washed off skin and clothing, but market research showed that
> the product was still not ready. Even temporary stains horrified parents.
> Unfortunately for Kehoe, in the history of organic chemistry no one had ever
> created a water-soluble dye that faded spontaneously.
>
> Kehoe called in Dr. Ram Sabnis, one of a handful of experts on dye chemistry in
> the world. Sabnis, who eventually solved the problem, says the project was the
> most difficult he had ever worked on. "Nobody has made this chemistry before.
> We have synthesized a whole new class of dyes." Zubbles, the product of Sabnis
> and Kehoe's collaboration, appeared on the market in 2009 – to the delight of
> bubble lovers big and small.

### Firdousi (298 מילים)

> Abu'l Qasim Mansur (c. 935-1026), more commonly known by his pen name,
> Firdousi, was a medieval Persian poet of great eminence. He is best known for
> his *Shahnameh* (Book of Kings), a lengthy epic poem that recounts the history
> and legends of Persia. Firdousi, who spent 35 years working on the poem, based
> his work on an earlier collection of Persian stories and historical records.
> For nearly a thousand years, Persians have read and listened to recitations
> from this literary masterpiece.
>
> There are many different accounts about the events preceding and following the
> production of the *Shahnameh*. According to one, Sultan Mahmud had promised to
> give Firdousi one gold coin for each verse of the *Shahnameh*, to be paid upon
> its completion. The poem ended up being 60,000 verses long. The Sultan's
> advisors pointed out that the payment would be enormous and convinced him to
> pay Firdousi in silver coins rather than gold. When Firdousi heard this, he was
> outraged and refused to accept the money. Ten years later – as the story goes –
> the Sultan read a beautiful line of poetry written by Firdousi and deeply
> regretted his unfair treatment of the poet. He sent messengers to deliver the
> 60,000 gold coins, along with a letter of apology and a special robe as a sign
> of respect. However, the caravan carrying the treasure arrived in Firdousi's
> village just as the poet's funeral procession was passing through the streets.
>
> The Sultan's messengers offered the money to Firdousi's daughter, but she
> turned it down. Firdousi's sister, however, remembered that the poet had often
> discussed the need to build a stone wall along the river to protect the village
> from flooding. She used part of the gold for this and, to commemorate her
> brother, used the rest to build a caravanserai – a guesthouse for travelers.

### שתי הערות על התוכן, ששתיהן מאשרות את המפרט

- **שניהם ביוגרפיים ובעלי גיבור אנושי בשם** (Tim Kehoe · Firdousi) — בדיוק
  ההטיה שנמדדה: 78% מהקטעים נוקבים בשם של בן אדם, וביוגרפיה היא הנושא השכיח ביותר.
- **שניהם מסתובבים על `However` / `Unfortunately`**, ובשניהם התפנית היא הציר
  שעליו שאלת הרעיון המרכזי נשענת — 73% מהקטעים בקורפוס מתנהגים כך.
- **0 ידע חיצוני** בשניהם; `caravanserai` ו-`water-soluble` שניהם מוגדרים בטקסט עצמו.
