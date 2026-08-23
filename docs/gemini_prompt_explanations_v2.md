# פרומפט לג'מיני — הסברים, גרסה 2 (אותם 10 פריטים)

**מה שונה מגרסה 1:** ההנחיה על אורך. נמדד שהגרסה הראשונה ייצרה הסברים של 123 תווים
בחציון, כשהתקרה הייתה 200 — כלומר התקרה מעולם לא הגבילה, ההנחיה "משפט או שניים" כן.
גרסה 2 מבקשת במפורש להציג את **שרשרת** שינויי הכיוון בקטעים שיש בהם יותר מפנייה אחת.

הוראות שימוש: פתח שיחה חדשה ב-AI Studio (בלי להעלות שום קובץ), העתק את כל מה
שמופיע מתחת לקו, הדבק כהודעה אחת, שלח. את התשובה (JSON) תעתיק ותשלח בחזרה בצ'אט הזה.

---

### התפקיד שלך
אתה כותב תוכן פדגוגי לפלטפורמה ישראלית להכנה לבחינת הלל באנגלית. אתה מקבל פריטי "השלמה": קטע אנגלי קצר שנקטע באמצע משפט, ו-4 אופציות להשלמה. אחת נכונה, שלוש שגויות.

**המשימה: לכל פריט, לכתוב הסבר נפרד לכל אחת מ-4 האופציות, ולסמן את מילות המפתח בקטע.**

### כלל 1 — הסבר נפרד לכל אופציה (לא הסבר אחד מאוחד)
התלמיד בוחר אופציה אחת ורואה רק את ההסבר שלה. לכן:
- ❌ **אסור** לכתוב "מסיח 1 ו-2 לוקחים מנגנון שנשמע... מסיח 4 הפוך" — התלמיד לא רואה מספרים ולא סופר אופציות.
- ❌ **אסור** להזכיר אופציות אחרות בהסבר של אופציה מסוימת.
- ✅ כל הסבר עומד בפני עצמו ומסביר **רק** את האופציה שלו.
- לאופציה הנכונה: להסביר **למה היא נובעת** מהקטע.
- לאופציה שגויה: להסביר **מה בדיוק לא מסתדר** בה מול הקטע.

### כלל 2 — ציטוט מילולי באנגלית (כלל מחייב, נבדק אוטומטית)
כל הסבר חייב לצטט **מילה במילה** את הטקסט האנגלי שמכריע — או מהאופציה עצמה, או מהקטע.
- הציטוט חייב להופיע **בדיוק** כמחרוזת רציפה בטקסט המקורי. אנחנו בודקים את זה מכנית.
- ❌ **אסור** לתרגם לעברית במקום לצטט. לא "המילה 'למרות'" אלא `"Despite"`.
- ❌ **אסור** להשתמש בשלוש נקודות בתוך ציטוט. לא `"turned as... stone"` אלא `"turned as hard as stone"`. אם הציטוט ארוך מדי — בחר קטע קצר יותר ורציף.
- ההסבר עצמו בעברית; רק הציטוט באנגלית, בתוך מרכאות כפולות.

### כלל 3 — מילות המפתח בקטע (`highlight_spans`)
לכל קטע, החזר רשימה של 2-4 **מחרוזות מילוליות מתוך הקטע** — מילות הקישור והפנייה שקובעות את כיוון הקטע. אלה שאם התלמיד יפספס אותן, הוא יטעה.

מה לסמן: מילות ניגוד (`However`, `But`, `Despite`, `Actually`), מילות תוצאה (`Therefore`, `Consequently`, `As a result`, `Thus`, `Because of`), מילות מטרה (`To stop this`, `To protect themselves`), ומסמני ציפייה (`You might expect`, `People long believed`).

מה **לא** לסמן: שמות עצם, נושא הקטע, פרטים. רק מה שמכוון את **הכיוון**.

כל מחרוזת חייבת להופיע מילה במילה בקטע — נבדק מכנית.

### כלל 4 — אורך: הצג את השרשרת, לא רק את המסקנה
- **שניים עד שלושה משפטים בעברית פשוטה. 150–240 תווים. מקסימום מוחלט 250.**
- אל תסתפק במסקנה. **אם בקטע יש יותר מנקודת מפנה אחת — הצג את התנועה** בין הנקודות,
  לפי הסדר שבו הן מופיעות בקטע.
- אם בקטע יש פנייה אחת בלבד — משפט או שניים מספיקים. אל תמתח סתם כדי למלא תווים.

**דוגמה להבדל (אותו מסיח, אותו פריט — הגמל):**

❌ קצר מדי, קופץ למסקנה:
`האפשרות מתארת שימוש בשומן, אך הקטע מציין כי השומן הוא מקור מזון ולא מים.`

✅ מציג את השרשרת:
`הקטע פותח באמונה הרווחת ש"People long believed" הדבשת מלאה במים, ואז "Actually" מתקן: היא עשויה משומן, שהוא "a rich food source". השאלה שואלת מה הגמל עושה כדי לשתות — ושומן אינו מים.`

### כלל 5 — טון ושפה
- **בלי** "אתה טעית", "שגית", "נפלת". מתארים את הטקסט, לא את התלמיד.
- **בלי** המילה "מלכודת". אם צריך לתאר את סוג הכשל — "הכיוון התהפך", "המילה נשמעה בקטע אבל בהקשר אחר", "זה מידע שלא נאמר".
- **אסור** לכתוב הערות ייצור/QA לתוך שדות התוכן.

### שתי דוגמאות מאושרות (עמוד על הרמה הזו)

**דוגמה א' — W4_paper_money**
קטע: `Early paper money was easy for criminals to copy using basic printing presses. To stop this, governments began using complex designs and special paper that was hard to find. Today, modern bills even include glowing ink and tiny metal threads. Because of these security features, modern counterfeiters`

```json
{
  "question_id": "8d48b282-4bce-4bb8-80da-31fa7dee15bd",
  "options": [
    {"index": 0, "explanation_he": "המשפט האחרון נפתח ב\"Because of these security features\" — התוצאה חייבת לנבוע מאמצעי האבטחה. אמצעים כאלה מקשים על זיוף, ולכן הזייפנים \"struggle to make convincing fakes\"."},
    {"index": 1, "explanation_he": "\"easily print their own paper bills\" הוא הכיוון ההפוך. הקטע מתאר אמצעי אבטחה שנועדו לעצור זיוף, ולכן התוצאה לא יכולה להיות שהזיוף נעשה קל יותר."},
    {"index": 2, "explanation_he": "\"basic printing presses\" אכן נשמע בקטע, אבל בתיאור העבר של \"Early paper money\". המילה \"Today\" מסמנת שהמשפט האחרון עוסק בהווה, לא בעבר."},
    {"index": 3, "explanation_he": "\"prefer to use actual gold coins\" — מטבעות זהב לא מוזכרים בקטע כלל. זו טענה חדשה מידע כללי, לא משהו שנאמר."}
  ],
  "highlight_spans": ["To stop this", "Today", "Because of these security features"]
}
```

**דוגמה ב' — W3_venice**
קטע: `Venice is built on soft mud held up by millions of wooden poles below the water. You might expect the wood to have rotted away over so many centuries. But underwater, cut off from air, the poles slowly turned as hard as stone. Despite its watery base, Venice has managed to`

```json
{
  "question_id": "6d4c4625-d163-4460-aff0-3fe255e60410",
  "options": [
    {"index": 0, "explanation_he": "\"float gently from one lagoon to another\" — הקטע אומר שהעמודים \"turned as hard as stone\", כלומר הבסיס התקשה ויציב. עיר שצפה היא ההפך מבסיס יציב."},
    {"index": 1, "explanation_he": "\"Despite its watery base\" מסמן ניגוד: למרות הבסיס המימי, התוצאה חיובית. הקטע הסביר שהעמודים \"turned as hard as stone\", ולכן העיר נשארה עומדת."},
    {"index": 2, "explanation_he": "\"replace its wooden poles with steel ones\" — החלפה בפלדה לא מוזכרת בקטע. הקטע דווקא מסביר שהעמודים המקוריים החזיקו מעמד."},
    {"index": 3, "explanation_he": "\"sink a little lower into the mud each year\" — המילה \"Despite\" מכריזה שהתוצאה חיובית למרות המים. שקיעה היא תוצאה שלילית, בכיוון ההפוך."}
  ],
  "highlight_spans": ["You might expect", "But underwater", "Despite its watery base"]
}
```

### פורמט הפלט
JSON array בלבד, ללא טקסט לפניו או אחריו. אובייקט אחד לכל פריט, בדיוק במבנה של הדוגמאות (`question_id`, `options` עם `index` + `explanation_he`, ו-`highlight_spans`).
שמור על ה-`index` המקורי של כל אופציה — אל תשנה סדר.

### בדיקה עצמית לפני שאתה מחזיר
1. כל אופציה קיבלה הסבר? (4 לכל פריט)
2. כל הסבר מכיל לפחות ציטוט אנגלי אחד במרכאות?
3. כל ציטוט מופיע **מילה במילה** במקור (באופציה או בקטע)?
4. אין שלוש נקודות בתוך אף ציטוט?
5. אף הסבר לא מזכיר אופציה אחרת או מספר מסיח?
6. כל `highlight_span` מופיע מילה במילה בקטע?
7. **כל הסבר באורך 150–250 תווים? בקטעים עם יותר מפנייה אחת — האם ההסבר מציג את השרשרת ולא רק את המסקנה?**

### המנה — 10 פריטים

| # | question_id | קטע | אופציות (index: טקסט) | נכונה |
|---|---|---|---|---|
| 1 | `00a04a54-3621-437d-81c7-7bb2ce652b98` | Camels live in hot deserts where water is very hard to find. People long believed their humps were filled with water to help them survive. Actually, the hump is made of fat, which acts as a rich food source. Therefore, to drink water, a camel must | 0: rely on the fat inside its hump · 1: find real pools of water on the ground · 2: travel to colder climates during the day · 3: avoid drinking any liquids for several years | 1 |
| 2 | `9f24b8b1-1efd-487b-b2ff-37b8f7b9f4ce` | Today, we use umbrellas to keep dry during heavy rainstorms. Thousands of years ago in ancient Egypt, however, people used them for a very different reason. The wealthy wanted to protect their pale skin from the harsh, burning sun. Therefore, early Egyptian umbrellas were made to | 0: attract rain to the dry Egyptian fields · 1: help people swim in the deep Nile river · 2: block out sunlight rather than water · 3: keep dry during major winter storms | 2 |
| 3 | `3a5ad3d8-17ba-46d5-84b6-59bbf1651313` | Early pencils were made of pure lead, which left dark, clear marks on paper. Unfortunately, lead is a toxic material that can make people very sick if it enters the body. To solve this safety concern, manufacturers replaced the lead with a harmless mineral called graphite. Therefore, modern pencils are | 0: entirely safe to use even though they contain no lead · 1: much more toxic than the original wooden pencils · 2: made of lead that is painted with graphite · 3: unable to leave any dark marks on paper | 0 |
| 4 | `ce470e8a-f5f8-44a7-a7a3-3ae1889ceacd` | During a metal shortage, a town printed temporary coins made of wood. Shopkeepers accepted them because the local government promised to replace them with real money later. However, criminals quickly realized how easy it was to carve matching pieces of wood at home. Because of this growing problem, the government was forced to | 0: print even more wooden coins for the shopkeepers · 1: replace all the metal coins with carved wood · 2: hire local criminals to carve the official money · 3: stop using the wooden money much earlier than planned | 3 |
| 5 | `210a9576-4cba-4c1b-842f-0ef2c11af689` | Desert frogs must stay wet to live, but they inhabit very dry sand. To survive the hot daytime heat, they dig deep underground where the soil is damp. Only after the sun sets and the air cools do they emerge. During the hot day, these frogs | 0: hunt for insects on the sand · 1: drink water from dry clouds · 2: remain hidden below the surface · 3: die from the extreme cold | 2 |
| 6 | `2d24d481-55cb-445f-ac03-a63253f1a2d7` | Goldfish are very often kept in small, round bowls without filters. However, these small bowls hold very little oxygen, which goldfish need to breathe. Without enough oxygen, the fish become weak and struggle to survive. For this reason, experts recommend that goldfish | 0: be kept in even smaller bowls · 1: breathe less oxygen to survive · 2: be fed only twice a week · 3: live in large, filtered tanks | 3 |
| 7 | `4ffb3e42-a7b8-46e2-a047-0dc1db48e5ad` | Glass greenhouses let in light, which warms the soil inside. The warm soil then releases heat, but this heat cannot pass back through the glass roof. This trapping of heat makes the greenhouse much warmer than the air outside. Earth's atmosphere works similarly by trapping heat with greenhouse gases. Consequently, an increase in these gases will | 0: let more light escape into space · 1: cool down the planet's surface · 2: destroy the protective glass roof · 3: make the Earth warmer | 3 |
| 8 | `1cf0467d-00f4-4abc-9fc5-0322003c84be` | Scientists studied how sleep loss affects a person's ability to drive safely. They discovered that staying awake for twenty-four hours slows reactions significantly. Surprisingly, this level of sleep deprivation matches the impairment caused by drinking too much alcohol. Thus, driving while extremely tired can be | 0: completely safe during the daytime · 1: improved by drinking alcohol · 2: prevented by sleeping while driving · 3: just as dangerous as drunk driving | 3 |
| 9 | `920216b3-c943-4a09-bbb9-7488bb9c2562` | Honeybees use a complex wiggle dance to show their hive mates where sweet flowers are located. The angle of the dance tells the other bees the exact direction of the food. However, if cloudy skies block the sun, the bees cannot calculate this angle correctly. Therefore, on dark and cloudy days, bees are | 0: unable to guide their mates to flowers · 1: forced to do the wiggle dance faster · 2: still able to find sweet flowers easily · 3: likely to fly to other distant hives | 0 |
| 10 | `b71b7e6b-2e55-4fce-b2ef-49ecf32491e1` | Desert cactus plants store large quantities of water inside their thick, fleshy stems to survive droughts. However, this hidden water supply makes them prime targets for thirsty desert animals. To protect themselves, cacti grew hundreds of sharp, painful needles over generations. As a result of these sharp needles, thirsty animals are | 0: able to store water inside their bodies · 1: kept away from the plant's water · 2: invited to eat the fleshy stems safely · 3: forced to migrate to northern forests | 1 |

**סה"כ: 10 פריטים × 4 הסברים = 40 הסברים, ועוד 10 רשימות `highlight_spans`.**
