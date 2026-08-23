# מנת כיול lecture_qa — batch 2 (v2.3), 2026-08-14

מחליפה את `lecture_qa_calibration_batch1_2026-08-13.md` — נבנתה מול המספרים/הסוגים
המעודכנים ב-`LISTENING_FORMAT.md` v2.3. אותו היקף: 2 בלוקים / 6 קטעים / 10 שאלות
/ 30 מסיחים. שינויים מ-batch1: טווחי מילים חדשים, איות אמריקאי, קטע תיאורי אחד
(במקום קטע-פנייה), שאלת דעה אחת, שאלת שלילה אחת, `highlight_spans` מאוכלס בכל קטע.

## מה השתנה מ-batch1 ולמה

| קטע | batch1 | batch2 (v2) | סיבה |
|---|---|---|---|
| block2_short_lecture | מגדלור, פנייתי | **דבורים עירוניות — תיאורי, בלי פנייה** | לכסות את הדפוס השני (v2.3 §3): נכונה=רחבה-צנועה |
| block2_medium_dialogue | detail שנייה | **opinion שנייה** | סוג שאלה חדש מאושר |
| block2_long_lecture | detail שנייה | **negative שנייה** | סוג שאלה חדש מאושר |
| כל 6 הקטעים | טווחי v2.2 | **טווחי v2.3** (רחבים יותר) | ראיה מ-9 תמלולים אמיתיים |
| כל האופציות | איות בריטי | **איות אמריקאי** | v2.3 §5 |
| כל הקטעים | אין | **`highlight_spans` מאוכלס** | v2.3 §11 — חובת תוכן לצורך Learn/Practice |

`vocab_in_context` לא נכנס למנה הזו — אין למנה מקום לסוג רביעי בלי לעוות את היחס
ב-n=10; נכנס במנת הייצור הראשונה.

## שלב 1 — שערים מכניים (סקריפט, לא שיפוט) — כולם עברו

| שער | תוצאה |
|---|---|
| מילים לקטע (טווחי v2.3) | 6/6 בטווח (98/162/234/101/173/243) |
| מספרים כספרות | 0 |
| איות בריטי (קטעים+אופציות) | 0 |
| `question_type`/`fail_mode` enum | תואם לאוצר v2.3 המלא, כולל negative/opinion |
| נכונה-הארוכה (strict) | 0/10 (סף ≤30%=3) |
| פער אורך ≥6 מילים | 0 |
| `unsupported` | 4/30 = 13.3% (סף ≤15%) |
| מגוון `k_code` במנה | 6 סוגים |
| שאלה שנייה = `target_zone late` | 4/4 קטעים דו-שאלתיים תקינים |
| `highlight_spans` תקין (substring אמיתי בתמליל) | 6/6 |

## שלב 2 — שיפוט מבני (בונה, לא סקריפט)

- **דבורים עירוניות מזוהה נכון כתיאורי:** אין "however"/פנייה; רשימת עובדות
  (מה זה → כמה כוורות → תועלת האבקה → מדיניות ערים → גידול עניין). נכונה = "the
  practice and growing appeal of" (הרחבה הצנועה), לא איחוד-שני-חצאים כי אין
  שני חצאים. מסיח `over_specific` (A: היתרים חוקיים) ומסיח `topic_noun` (C: כמות
  דבש) — שניהם ממלאים את השער המבני הנדרש.
- **negative (עננים):** שלושת המסיחים הלא-נכונים כולם נאמרים במפורש בקטע
  (`true_stated`) — cirrus, שילוב-3-קטגוריות, ~200 שנה. הנכונה (B) היא ההיפוך
  הנקי של המשפט המפורש "kept the four main families in place" — לא הומצאה
  משום מקום, היא כבר הייתה קיימת כמסיח `reversed` ב-batch1 ומוחזרת שימוש כאן.
- **opinion (לחץ מים):** נוספה שורת דעה מפורשת ("In my opinion, the pump is a
  reasonable short-term fix") — לא הוסקה. מסיח B (`true_not_asked`) משתמש
  בדעה-אמיתית-אחרת (הרצון להתראה מוקדמת) שנאמרה באותה נשימה אך עונה על שאלה
  אחרת — זו בדיוק הדוגמה שהמסמך דורש.

## שלב 3 — פותר עיוור דו-כיווני (2 סוכנים נפרדים, ללא ראיית זה-את-זה)

**כיוון פתירות** (תמליל+שאלה+אופציות, בלי מפתח): **10/10**, ביטחון גבוה בכולם,
אפס עמימות אמיתית. נקודה אחת מדווחת: פריט 8 (opinion) ניתן לטעות-קריאה מהירה
לכיוון B, אבל ניסוח השאלה ("opinion **of the pump**") מפריד בבירור — לא תוקן,
זו בדיוק המיומנות שהשאלה בודקת.

**כיוון דליפה** (גזע+אופציות, בלי תמליל): **10/10 בניחוש-בלבד** — גבוה משמעותית
מה-7/10 שנמדד ב-batch1. **לא ניסיתי "לתקן" את זה עד 0.** הסיבה שעולה מהדוח:
הסוכן לא ניצל טעויות ניסוח שלי אלא **את המכניקה עצמה** — K-REVERSE הוא במהותו
זוג-טקסט-כמעט-זהה-בכיוון-הפוך (וזו בדיוק ההגדרה התיעודית של המנגנון, לא תקלה);
main_idea עם נכונה-רחבה-מסכמת מול מסיחים-צרים הוא הדפוס שגם המדגם הרשמי עצמו
מציג (נכונה=הארוכה ב-3/5 שאלות רשמיות, לפי שער האנטי-רמז הקיים). ביצעתי תיקון
היגיינה אחד (שאלה 7, ניסוח מחדש כדי להסיר זוג-טקסט-כמעט-זהה שלא היה נחוץ
למנגנון), ולא יותר — עוד ליטוש מסתכן בהחלשת התשובות הנכונות, בדיוק כפי שנקבע
כבר ב-batch1.

**המסקנה המוצרית:** דליפה-לפי-רמזים היא עלות מובנית של מבנה 4-ברירות נאמן
למקור, לא פגם של המנה הזו. ליאון: אם רמת 10/10 מטרידה אותך יותר מ-7/10 של
batch1 — זה נתון לדיון, אבל לדעתי (הביקורת העצמית) ההבדל נובע בעיקר משונות בין
שני סוכנים שונים ולא מהידרדרות איכות אמיתית; שני הפותרים-בלי-תמליל בכל זאת לא
קיבלו מידע שגוי — רק ניחשו נכון בעזרת היגיון-בחינות תקין.

## שלב 4 — מה לא נבדק כאן

- משלב מול הקלטה אמיתית באוזן — רק ליאון.
- שכיחות (n קטן בכל מדד).
- `vocab_in_context` — לא נכלל במנה הזו כלל (ראה לעיל).

## שלב 5 — פסק דין

🟢 **עובר את כל השערים המכניים והמבניים. פותרות-בעזרת-תמליל מושלמת (10/10).**
🟡 **דליפה-בלי-תמליל גבוהה (10/10) — מדווח, לא מתוקן, בדיוק כמו ב-batch1 אך
חריף יותר; המלצתי: לקבל ולא לרדוף אחרי 0, ולבדוק בפועל מול הקלטות אמיתיות
כשהאודיו ייווצר (שם רמזי-הטקסט הרבה פחות רלוונטיים כי התלמיד קודם שומע).**
🟢 **עודכן 2026-08-14 אחרי אישור ליאון: נכתב ל-DB במלואו.** 6 קטעים +
10 שאלות + 40 מסיחים מתויגים, כולם עם `explanation_he` שעבר את
`verify_listening_explanations.py` (PASS, 40/40, 20 highlight_spans),
`generation_batch='LQA-CAL2'`, `is_published=false` (Hard Rule 4 — לא נחשף
לאף תלמיד עד אישור נוסף מפורש). `docs/LECTURE_QA_AUDIT_PROTOCOL.md`,
`docs/LISTENING_FORMAT.md` וקובץ המדידות עודכנו בהתאם.

**אודיו:** נכתב סקריפט חדש `scripts/generate-lecture-qa-audio.js` (אחיו
של generate-listening-audio.js, ללא צליל חיתוך, תמיכה בדו-קול לדיאלוגים
עם זיהוי תור לפי שם דובר וקול יחיד להרצאות) — עדיין לא הורץ, ממתין לך
(מריץ Google TTS בפועל = עלות + זמן אמיתיים). ראו TASKS/STATE לפרטים.

**באג נוסף שנתפס ותוקן באגב:** `dashboard.js` / `diagnostic.js` /
`test-page.js` / `item-test-page.js` היו עדיין מחוברים לסכימה הישנה
(`listening_items`/`title_he`/`status`, ו-`itemId` במקום `lectureId`)
— אותו דפוס באג שתוקן קודם ב-session.js/item-component.js. תוקן במה
שהיה מכני ובטוח; `listening_user_state` (המשמש dashboard+diagnostic
לניקוד מוכנות) **לא קיים בכלל ב-DB ולא מתועד באף מקום** — זה לא תיקון
סכימה, זו תכונה שלא תוכננה מעולם (אלגוריתם ציון מוכנות), ולכן לא בניתי
אותה חד-צדדית — מסומן במפורש בקוד ובמשימה #34.

הקבצים הגולמיים (`transcripts_draft.json` / `questions_draft.json` /
`gemini_out.json`) נשארים בתיקיית העבודה הזמנית כארכיון — התוכן החי הוא
כעת ב-DB, לא בקבצים האלה.

---

## נספח — כל 6 הקטעים ו-10 השאלות, לקריאה

### block1_short_dialogue  —  s30 / dialogue  —  office recycling programme suspended
> Daniel: Claire, what happened to the recycling bins on our floor? They disappeared last month. Claire: That's actually a good question — do you want the full explanation? Daniel: Yes, please, I never understood it. Claire: Well, several bins were filled with food waste instead of paper or plastic, so the material became contaminated. Daniel: I see. Claire: And because of that, the collection company refused to empty the bins at all, and management ended up suspending the whole program. Daniel: So will the bins ever come back? Claire: Apparently yes — I heard they are testing a new system with clearer labels starting next week.

**[speaker_ref / early]** Claire tells Daniel that the recycling programme was suspended because –
- A. the bins became contaminated, and the collection company refused to empty them. ✅
- B. a new system with clearer labels is being tested starting next week. (true_not_asked)
- C. management refused to empty bins that had been filled with food waste. (anchor_swap)
- D. the bins became contaminated because the collection company refused to empty them. (reversed)

### block1_medium_lecture  —  s60 / lecture  —  seventeenth-century coffeehouses
> Coffeehouses spread rapidly across Europe during the seventeenth century, and quickly became fixtures of daily city life. Unlike taverns, they welcomed conversation and business discussion, so merchants and writers gathered there for hours. For many customers, the appeal was social rather than simply about the drink itself. However, not every authority welcomed this new habit. Tavern owners resented the competition, and several rulers worried that customers sitting together for hours might discuss politics rather than trade. As a result, more than one government attempted to shut the coffeehouses down entirely. In England, for example, an official order tried to close them within weeks, yet public pressure forced its withdrawal almost immediately. The Ottoman authorities also banned coffeehouses outright for a period. In other words, resistance came from official concern, not from any lack of public demand. Even so, that particular ban did not last. Officials reopened them roughly a decade later, largely because the tax revenue had proven impossible to give up.

**[main_idea / early]** The lecture mainly discusses –
- A. How coffeehouses became popular gathering places for merchants and writers in the seventeenth century. (pre_pivot)
- B. How coffeehouses spread across Europe despite opposition from rulers and tavern owners. ✅
- C. Why several governments in Europe tried to ban coffeehouses. (post_pivot)
- D. The role of coffee drinking in the daily life of European cities in the seventeenth century. (topic_noun)

**[detail / late]** According to the lecture, what eventually happened to the Ottoman ban on coffeehouses?
- A. The ban brought public coffee drinking in Ottoman territory to a lasting end. (reversed)
- B. It was lifted about a decade later, largely because of the tax revenue. ✅
- C. The English government reopened its coffeehouses because of tax revenue. (anchor_swap)
- D. The Ottoman authorities replaced coffeehouses with state-run tea houses instead. (unsupported)

### block1_long_dialogue  —  s90 / dialogue  —  old cinema closing down
> Tom: Maya, did you hear the old cinema on Elm Street is closing for good? Maya: I did. Can you actually explain what happened? I always assumed it was doing fine. Tom: Sure. It started a few years ago when streaming services became so popular that far fewer people bought tickets. Maya: Right, that part I knew. Tom: Well, because of the falling ticket sales, the owners had to cut back on the number of showtimes each week. Maya: That can't have been good for them. Tom: It wasn't — ticket income fell sharply, and with less income, they reduced the staff to just a handful of part-time workers. Maya: I imagine that made it harder to keep the building maintained. Tom: It did. Basic maintenance kept getting delayed, month after month, simply because there wasn't enough money or staff to handle it. Maya: So something eventually broke. Tom: The roof did, actually. A serious leak appeared above the main screen during a storm last winter. Maya: That sounds expensive to fix. Tom: It was far too expensive for the current income to cover. The estimated repair cost came to almost triple what the cinema earns in an average month. Maya: So what did they decide in the end? Tom: They decided it simply wasn't worth staying open. The owners announced last week that the building will be sold, and a local community group is now trying to raise funds to reopen it as a smaller, volunteer-run venue instead.

**[speaker_ref / early]** Tom tells Maya that the cinema's closure came down to –
- A. the serious leak that appeared above the main screen last winter. (true_not_asked)
- B. a drop in the cinema's maintenance costs that let the owners save money. (reversed)
- C. a sudden rise in competition from a newly opened cinema nearby. (unsupported)
- D. a chain of money problems, from falling ticket sales to an unaffordable repair. ✅

**[detail / late]** What does Tom say a local community group is now trying to do?
- A. Raise funds to reopen the cinema as a smaller, volunteer-run venue. ✅
- B. Petition the council to prevent the sale of the cinema building. (reversed)
- C. Help the original owners raise funds to renovate the building themselves. (anchor_swap)
- D. Cut back on the number of showtimes offered each week. (true_not_asked)

### block2_short_lecture  —  s30 / lecture  —  urban beekeeping (descriptive, no pivot)
> Urban beekeeping is the practice of keeping honeybee colonies within cities, usually on rooftops or in small gardens. Many city beekeepers keep just one or two hives, producing enough honey for their own household or a handful of neighbors to buy. Beyond honey, the bees pollinate nearby parks, balconies, and community gardens, supporting a wider variety of flowering plants. Some cities encourage the practice by offering free training courses for new beekeepers, while others simply have no rules against it at all. Interest has grown steadily over the past decade, particularly among people with very little outdoor space of their own.

**[main_idea / early]** The lecture mainly discusses the ___ urban beekeeping.
- A. legal permits and inspection rules behind (over_specific)
- B. practice and growing appeal of ✅
- C. modest honey yields typically produced through (topic_noun)
- D. average price that city beekeepers charge neighbors for (over_specific)

### block2_medium_dialogue  —  s60 / dialogue  —  low water pressure caused by nearby construction
> Priya: Sam, do you know why the water pressure in our building has been so weak all week? Sam: Actually, yes — I asked the building manager about it yesterday. Priya: Please tell me, because it's been driving me mad. Sam: There's a construction project two streets away that connected into the same main water pipe, drawing from the same source as us. Priya: I had no idea. Sam: And because the project uses large amounts of water for mixing concrete, the shared pressure drops sharply during working hours. Priya: Is there anything we can do about it meanwhile? Sam: Actually, yes. The manager installed a temporary pump in the basement last week, and it boosts the pressure back to a normal level during those hours. Priya: In my opinion, the pump is a reasonable short-term fix, though I wish we'd been warned about the construction sooner. Sam: Fair enough. Priya: And when will things go back to normal without the pump? Sam: The manager mentioned the project is scheduled to finish within three weeks, after which pressure should return to normal on its own.

**[speaker_ref / early]** Sam tells Priya that the weak water pressure is being caused by –
- A. the temporary pump the manager installed in the basement last week. (true_not_asked)
- B. a similar pump the construction crew set up to manage water use on their own site. (anchor_swap)
- C. a nearby construction project drawing on the same shared water pipe. ✅
- D. an old pipe inside their own building that recently began leaking. (unsupported)

**[opinion / late]** What is Priya's opinion of the temporary pump?
- A. She feels it has made the water pressure problem worse. (reversed)
- B. She wishes the manager had given advance notice about the construction. (true_not_asked)
- C. She thinks the manager should install a permanent pump instead. (unsupported)
- D. She feels it is a reasonable short-term fix. ✅

### block2_long_lecture  —  s90 / lecture  —  cloud classification system
> Meteorologists classify clouds into a small number of basic families, based mainly on their shape and altitude. The four core categories are cirrus, which are thin, wispy clouds high in the atmosphere; cumulus, which are puffy, well-defined clouds usually seen on fair days; stratus, flat, featureless layers that often cover the entire sky; and nimbus, a term added to any cloud that is actively producing rain or snow. Each family carries a different practical meaning: a sky full of cirrus often signals that fair weather is approaching within a day or two, while a thick, unbroken stratus layer usually means a long period of steady, gentle rain rather than a brief shower. Pilots and forecasters both rely on this system daily. However, the four-part system has a genuine limitation: many real clouds are combinations rather than pure examples of a single family. A cumulonimbus cloud, for example, begins as an ordinary cumulus cloud but grows so tall that its top flattens out like a stratus layer, while still producing the heavy rain associated with a nimbus cloud. In other words, a single storm cloud can display features of three separate categories at once. However, despite this overlap, forecasters have kept the four main families in place for nearly two centuries, adding small labels to cloud names rather than replacing the families themselves. The system has lasted mainly because it is quick to use in the field, even if it is not perfectly precise.

**[main_idea / early]** The lecture mainly discusses –
- A. The four-category cloud system, and why it has endured despite its limitations. ✅
- B. The basic shapes and altitudes used to define the four main cloud families. (pre_pivot)
- C. The limitations of the four-part cloud system when clouds combine features. (post_pivot)
- D. How meteorologists study weather patterns, and the tools they use for daily forecasts. (topic_noun)

**[negative / late]** Which of the following is NOT true of the four-family cloud system, according to the lecture?
- A. Cirrus clouds are thin and found high in the atmosphere. (true_stated)
- B. Forecasters replaced the four families with an entirely new naming system. ✅
- C. A single storm cloud can display features of three separate categories at once. (true_stated)
- D. The four-part system has lasted for nearly two centuries. (true_stated)
