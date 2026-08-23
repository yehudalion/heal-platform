# מנת כיול ראשונה — lecture_qa (2 בלוקים / 6 קטעים / 10 שאלות / 30 מסיחים)

**סטטוס:** טיוטה סופית לאישור ליאון, אחרי שלושה סבבי ביקורת. לא נכתב ל-DB, לא הופק אודיו.
תוכן מקורי לפי המפרט המדוד. פרוטוקול הביקורת המלא: `docs/LECTURE_QA_AUDIT_PROTOCOL.md`.

## שובל הביקורת (מה נבדק ומה נמצא)

**סבב 1 — ביקורת עצמית מול המפרט:** נמצאו ותוקנו: ערכי enum שגויים (gist→main_idea, short→s30), שאלה רחבה על דיאלוג שנוסחה כ-main_idea במקום speaker_ref (מפר את ANALYSIS §3.3.3), משפט עם 6 מילים קשות בקטע העננים.

**סבב 2 — שני בודקים חיצוניים (צ'אטים נקיים):**
- *מבקר פרוטוקול מלא:* אישר את כל 30 תיוגי ה-fail_mode מול עצי ההחלטה; מצא 3 חוסמים שתוקנו: שגיאת ייחוס בגזע Q1 (המשפט המכריע היה אצל הדובר הלא נכון), כשל מקבילות תחבירית ב-Q7 (משפטים שלמים אחרי גזע `caused by –`), מסיחי topic_noun קצרים מדי שמסגירים את עצמם (Q6/Q9).
- *מבחן דליפה (אופציות בלבד, בלי שמע):* 9/10 ניחושים נכונים בביטחון — נכשל. תוקן בסבבים.

**סבב 3 — הרצה חוזרת של שני המבחנים על הגרסה המתוקנת:**
- *פתירות (תמליל+שאלה):* 10/10 בביטחון גבוה, אפס דגלי עמימות, הייחוסים בדיאלוגים אומתו.
- *דליפה:* ירידה מ-9/10 ל-7/10, ותוקנו עוד: מסיח לא-קוהרנטי (Q1-D), מילים קיצוניות (permanently/ever/fully), מסיח שלא מתאים תחבירית לגזע (Q10-B), ומבנה "רק הנכונה מורכבת משני חלקים" ב-Q6/Q9.

## שערים מכניים — מצב סופי

| שער | תוצאה | סף |
|---|---|---|
| מילים לפי דלי (אחרי הסרת תוויות דובר) | 98/162/234/83/176/204 — הכל בטווח | s30: 60-105 · s60: 160-180 · s90: 200-280 |
| שאלות לקטע | 1/2/2 בדיוק | כלל n=11 |
| פיזור תשובות | A:3 B:2 C:2 D:3, לא-מחזורי | ± אחיד |
| נכונה-הארוכה (strict) | **0/10** | ≤30% |
| פער אורך ≥6 מהממוצע | 0 | 0 |
| unsupported | 4/30 = 13.3% | ≤15% |
| k_code שונים | 5 | ≥3 |
| אוצר fail_mode לפי סוג שאלה | 0 הפרות | — |
| איות en-GB, מספרים במילים | נקי | — |

## שלוש הכרעות פתוחות לליאון

1. **צורת הבלוק:** התוכנית (ב.1) קובעת בלוק = הרצאה-30 + דיאלוג-60 + הרצאה-90; המדידה v2.2 הוכיחה שפורמט ואורך בלתי-תלויים. המנה הזו סטתה בכוונה — 6 הקטעים מכסים את כל 6 צירופי דלי×פורמט (כולל דיאלוג קצר ודיאלוג ארוך שנצפו בקורפוס). לאשר את הסטייה לכיול, ולהכריע מה תהיה צורת ייצור ה-24.
2. **מכונת הרצאה-בינונית:** למפרט אין הגדרה (רק קצרה=פנייה אחת, ארוכה=שתיים+מונחים). קטע הקפה נבנה עם 2 פניות בלי מערכת מונחים. לאשר או להגדיר אחרת.
3. **דליפה שיורית:** פותר LLM שיטתי שרואה רק אופציות עדיין מנחש נכון חלק משאלות ה-main_idea — כי המבנה הרשמי עצמו (צד-אחד/צד-שני/שם-עצם/שתי-הצדדים) מסגיר לפותר כזה. גם הפריטים הרשמיים היו נכשלים במבחן הזה. נבחן אנושי לחוץ-זמן רגיש לזה הרבה פחות. ההמלצה: לקבל את הרמה הנוכחית כמחיר נאמנות לפורמט. לאשר.

*(הכרעה רביעית שכבר פתוחה מקודם: ארבעת סוגי השאלה החדשים — שלילה/דעה/אוצר-מילים/גזע-השלמה — בפנים או בחוץ ל-MVP.)*

## מה הביקורת לא כיסתה
משלב מול ההקלטות האמיתיות באוזן (רק אתה יכול — ייבדק ב-A/B אחרי פיילוט TTS); שכיחויות (n קטן); שערי אודיו (WPM, שתיקה, משכים) — נבדקים אחרי רינדור.

---

## קטע 1 — `block1_short_dialogue` (בלוק 1, s30, dialogue)
**נושא:** office recycling programme suspended

> Daniel: Claire, what happened to the recycling bins on our floor? They disappeared last month. Claire: That's actually a good question — do you want the full explanation? Daniel: Yes, please, I never understood it. Claire: Well, several bins were filled with food waste instead of paper or plastic, so the material became contaminated. Daniel: I see. Claire: And because of that, the collection company refused to empty the bins at all, and management ended up suspending the whole programme. Daniel: So will the bins ever come back? Claire: Apparently yes — I heard they are testing a new system with clearer labels starting next week.

**שאלה 1** (speaker_ref, target_zone=early): Claire tells Daniel that the recycling programme was suspended because –

- **A. the bins became contaminated, and the collection company refused to empty them.**  ✅ נכונה
- B. a new system with clearer labels is being tested starting next week.  _(k_code=K-TRUE-NOT-ASKED, fail_mode=true_not_asked)_
- C. management refused to empty bins that had been filled with food waste.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- D. the bins became contaminated because the collection company refused to empty them.  _(k_code=K-REVERSE, fail_mode=reversed)_

---

## קטע 2 — `block1_medium_lecture` (בלוק 1, s60, lecture)
**נושא:** seventeenth-century coffeehouses

> Coffeehouses spread rapidly across Europe during the seventeenth century, and quickly became fixtures of daily city life. Unlike taverns, they welcomed conversation and business discussion, so merchants and writers gathered there for hours. For many customers, the appeal was social rather than simply about the drink itself. However, not every authority welcomed this new habit. Tavern owners resented the competition, and several rulers worried that customers sitting together for hours might discuss politics rather than trade. As a result, more than one government attempted to shut the coffeehouses down entirely. In England, for example, an official order tried to close them within weeks, yet public pressure forced its withdrawal almost immediately. The Ottoman authorities also banned coffeehouses outright for a period. In other words, resistance came from official concern, not from any lack of public demand. Even so, that particular ban did not last. Officials reopened them roughly a decade later, largely because the tax revenue had proven impossible to give up.

**שאלה 1** (main_idea, target_zone=early): The lecture mainly discusses –

- A. How coffeehouses became popular gathering places for merchants and writers in the seventeenth century.  _(k_code=K-SCOPE, fail_mode=pre_pivot)_
- **B. How coffeehouses spread across Europe despite opposition from rulers and tavern owners.**  ✅ נכונה
- C. Why several governments in Europe tried to ban coffeehouses.  _(k_code=K-SCOPE, fail_mode=post_pivot)_
- D. The role of coffee drinking in the daily life of European cities in the seventeenth century.  _(k_code=K-SCOPE, fail_mode=topic_noun)_

**שאלה 2** (detail, target_zone=late): According to the lecture, what eventually happened to the Ottoman ban on coffeehouses?

- A. The ban brought public coffee drinking in Ottoman territory to a lasting end.  _(k_code=K-REVERSE, fail_mode=reversed)_
- **B. It was lifted about a decade later, largely because of the tax revenue.**  ✅ נכונה
- C. The English government reopened its coffeehouses because of tax revenue.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- D. The Ottoman authorities replaced coffeehouses with state-run tea houses instead.  _(k_code=K-WORLD, fail_mode=unsupported)_

---

## קטע 3 — `block1_long_dialogue` (בלוק 1, s90, dialogue)
**נושא:** old cinema closing down

> Tom: Maya, did you hear the old cinema on Elm Street is closing for good? Maya: I did. Can you actually explain what happened? I always assumed it was doing fine. Tom: Sure. It started a few years ago when streaming services became so popular that far fewer people bought tickets. Maya: Right, that part I knew. Tom: Well, because of the falling ticket sales, the owners had to cut back on the number of showtimes each week. Maya: That can't have been good for them. Tom: It wasn't — ticket income fell sharply, and with less income, they reduced the staff to just a handful of part-time workers. Maya: I imagine that made it harder to keep the building maintained. Tom: It did. Basic maintenance kept getting delayed, month after month, simply because there wasn't enough money or staff to handle it. Maya: So something eventually broke. Tom: The roof did, actually. A serious leak appeared above the main screen during a storm last winter. Maya: That sounds expensive to fix. Tom: It was far too expensive for the current income to cover. The estimated repair cost came to almost triple what the cinema earns in an average month. Maya: So what did they decide in the end? Tom: They decided it simply wasn't worth staying open. The owners announced last week that the building will be sold, and a local community group is now trying to raise funds to reopen it as a smaller, volunteer-run venue instead.

**שאלה 1** (speaker_ref, target_zone=early): Tom tells Maya that the cinema's closure came down to –

- A. the serious leak that appeared above the main screen last winter.  _(k_code=K-TRUE-NOT-ASKED, fail_mode=true_not_asked)_
- B. a drop in the cinema's maintenance costs that let the owners save money.  _(k_code=K-REVERSE, fail_mode=reversed)_
- C. a sudden rise in competition from a newly opened cinema nearby.  _(k_code=K-WORLD, fail_mode=unsupported)_
- **D. a chain of money problems, from falling ticket sales to an unaffordable repair.**  ✅ נכונה

**שאלה 2** (detail, target_zone=late): What does Tom say a local community group is now trying to do?

- **A. Raise funds to reopen the cinema as a smaller, volunteer-run venue.**  ✅ נכונה
- B. Petition the council to prevent the sale of the cinema building.  _(k_code=K-REVERSE, fail_mode=reversed)_
- C. Help the original owners raise funds to renovate the building themselves.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- D. Apply for a council grant to restore and reopen the old cinema.  _(k_code=K-WORLD, fail_mode=unsupported)_

---

## קטע 4 — `block2_short_lecture` (בלוק 2, s30, lecture)
**נושא:** automation of lighthouse keepers

> For centuries, lighthouses were operated entirely by human keepers, who lived on site and manually maintained the light through every night, regardless of weather. However, by the late twentieth century, automated systems could perform the very same task more reliably, without any risk of human error or fatigue. As a result, most countries removed their keepers entirely within a few decades. Today, only a small number of lighthouses still keep a keeper on site, mostly for tourism rather than any real operational need.

**שאלה 1** (main_idea, target_zone=early): The speaker is mainly describing –

- A. The daily routine of a lighthouse keeper living on site for years at a time.  _(k_code=K-SCOPE, fail_mode=pre_pivot)_
- B. The reliability advantages of modern automated lighthouse systems.  _(k_code=K-SCOPE, fail_mode=post_pivot)_
- **C. How lighthouses moved from human keepers to automation, and why keepers became unnecessary.**  ✅ נכונה
- D. How navigation technology developed, and the role lighthouses played in it.  _(k_code=K-SCOPE, fail_mode=topic_noun)_

---

## קטע 5 — `block2_medium_dialogue` (בלוק 2, s60, dialogue)
**נושא:** low water pressure caused by nearby construction

> Priya: Sam, do you know why the water pressure in our building has been so weak all week? Sam: Actually, yes — I asked the building manager about it yesterday. Priya: Please tell me, because it's been driving me mad. Sam: There's a construction project two streets away that connected into the same main water pipe. Priya: I had no idea. How does that affect our building? Sam: They're drawing from the same source as us, and because the project uses large amounts of water for mixing concrete, the shared pressure drops sharply during working hours. Priya: Which explains why it's worse in the mornings. Sam: Right, that's when the crew is most active on site. Priya: Is there anything we can do about it meanwhile? Sam: Actually, yes. The manager installed a temporary pump in the basement last week, and it boosts the pressure back to a normal level during those hours. Priya: And when will things go back to normal without the pump? Sam: The manager mentioned the project is scheduled to finish within three weeks, after which pressure should return to normal on its own.

**שאלה 1** (speaker_ref, target_zone=early): Sam tells Priya that the weak water pressure is being caused by –

- A. the temporary pump the manager installed in the basement last week.  _(k_code=K-TRUE-NOT-ASKED, fail_mode=true_not_asked)_
- B. a temporary pump the construction crew installed to manage their water use.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- **C. a nearby construction project drawing on the same shared water pipe.**  ✅ נכונה
- D. an old pipe inside their own building that recently began leaking.  _(k_code=K-WORLD, fail_mode=unsupported)_

**שאלה 2** (detail, target_zone=late): According to Sam, what will happen once the construction project finishes?

- A. The temporary pump will stay in use even after the project ends.  _(k_code=K-REVERSE, fail_mode=reversed)_
- B. The construction crew will remove the temporary pump once they finish.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- C. Pressure will still drop sharply during the construction crew's working hours.  _(k_code=K-TRUE-NOT-ASKED, fail_mode=true_not_asked)_
- **D. Water pressure should return to normal by itself once the project ends.**  ✅ נכונה

---

## קטע 6 — `block2_long_lecture` (בלוק 2, s90, lecture)
**נושא:** cloud classification system

> Meteorologists classify clouds into a small number of basic families, based mainly on their shape and altitude. The four core categories are cirrus, which are thin, wispy clouds high in the atmosphere; cumulus, which are puffy, well-defined clouds usually seen on fair days; stratus, flat, featureless layers that often cover the entire sky; and nimbus, a term added to any cloud that is actively producing rain or snow. Each family behaves differently, and pilots and forecasters both rely on this system daily. However, the four-part system has a genuine limitation: many real clouds are combinations rather than pure examples of a single family. A cumulonimbus cloud, for example, begins as an ordinary cumulus cloud but grows so tall that its top flattens out like a stratus layer, while still producing the heavy rain associated with a nimbus cloud. In other words, a single storm cloud can display features of three separate categories at once. However, despite this overlap, forecasters have kept the four main families in place for nearly two centuries, adding small labels to cloud names rather than replacing the families themselves. The system has lasted mainly because it is quick to use in the field, even if it is not perfectly precise.

**שאלה 1** (main_idea, target_zone=early): The lecture mainly discusses –

- **A. The four-category cloud system, and why it has endured despite its limitations.**  ✅ נכונה
- B. The basic shapes and altitudes used to define the four main cloud families.  _(k_code=K-SCOPE, fail_mode=pre_pivot)_
- C. The limitations of the four-part cloud system when clouds combine features.  _(k_code=K-SCOPE, fail_mode=post_pivot)_
- D. How meteorologists study weather patterns, and the tools they use for daily forecasts.  _(k_code=K-SCOPE, fail_mode=topic_noun)_

**שאלה 2** (detail, target_zone=late): According to the lecture, what have forecasters done about clouds that combine features of several families?

- A. They replaced the original four families with an entirely new naming system.  _(k_code=K-REVERSE, fail_mode=reversed)_
- B. They rely on the four-family system in their daily forecasting work.  _(k_code=K-TRUE-NOT-ASKED, fail_mode=true_not_asked)_
- C. They classify every combination cloud as part of the nimbus family.  _(k_code=K-ROLE, fail_mode=anchor_swap)_
- **D. They add small labels to cloud names, keeping the four families.**  ✅ נכונה

---

## הצעד הבא
אחרי אישורך: (1) כתיבה ל-DB עם is_published=false ומטא-דאטה מלאה (bucket/format/question_type/target_zone, מסיחים עם k_code+fail_mode, נכונה עם fail_mode=null, במבנה jsonb של הסכימה); (2) הפקת אודיו — Charon למונולוגים, Charon+Kore לדיאלוגים עם תפירת תורות ~350ms, בלי צליל 1050Hz; (3) QA מכני על האודיו; (4) ייצור ה-24 לפי ההכרעות שלך.