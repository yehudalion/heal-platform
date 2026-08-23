# פרומפט לג'מיני — הסברים, מנה 2 (30 פריטים מתוך ה-90 הנותרים)

הוראות שימוש: פתח שיחה חדשה ב-AI Studio (בלי להעלות שום קובץ), העתק את כל מה
שמופיע מתחת לקו, הדבק כהודעה אחת, שלח. את התשובה (JSON) תעתיק ותשלח בחזרה בצ'אט הזה.

זו המנה הראשונה מתוך 3 (30 פריטים כל אחת) שמשלימות את שאר ה-100 פריטי ההשלמה.

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
7. כל הסבר באורך 150–250 תווים? בקטעים עם יותר מפנייה אחת — האם ההסבר מציג את השרשרת ולא רק את המסקנה?

### המנה — 30 פריטים

| # | question_id | קטע | אופציות (index: טקסט) | נכונה |
|---|---|---|---|---|
| 1 | `41f010f6-824e-46dc-91fd-bf01b2fea22e` | In the early 1800s, moving heavy goods across the land was extremely slow and costly for traders. Then a network of canals was dug, letting boats carry coal and iron cheaply between distant cities. Because transporting goods suddenly became so much cheaper, | 0: digging the canals had required thousands of strong workers · 1: the price of goods in the cities began to fall · 2: boats were still too slow to carry heavy coal · 3: rich traders decided that canals were a bad idea | 1 |
| 2 | `4348b22b-6691-48c6-9431-184c226d529d` | When tea first arrived in Britain in the 1600s, it was extremely expensive. Only the rich could afford it, and they kept their tea locked away in special boxes. Because the leaves were so costly, servants were not allowed to throw the used leaves away. Instead, the servants were permitted to | 0: lock the fresh tea leaves away in the special boxes · 1: buy their own expensive tea from the same shops · 2: throw the old leaves away once the box was empty · 3: dry the used leaves and sell them a second time | 3 |
| 3 | `84f5b952-904d-40fb-bf8f-db6efb97ec2a` | Honeybees survive the cold winter without hibernating. Instead of sleeping, they gather tightly inside the hive and shiver their muscles to make heat. The bees at the center stay warm, while those on the freezing outer edge grow dangerously cold. To keep any single bee from freezing, the bees | 0: shiver harder to send their heat out to the frozen edge · 1: crowd even more tightly until the outer bees warm up · 2: slowly take turns moving between the edge and the center · 3: push the weakest bees to the edge and let them freeze | 2 |
| 4 | `cd146578-3853-4c40-9e8e-3c9067cc0bdc` | In the ancient world, salt was so valuable that it was used as a form of payment. Roman soldiers were sometimes paid in salt instead of coins. This is even where the English word 'salary' comes from. That is why a lazy worker is still described as | 0: not worth his salt · 1: worth his weight in gold · 2: paid far too much money · 3: bringing home the bacon | 0 |
| 5 | `0d1ac646-2f10-4899-a042-0747aeca2e42` | An ice cream shop in a beach town makes most of its money during the hot summer. In winter, the beaches are completely empty and temperatures drop below freezing. During these cold months, the shop barely gets any customers at all. Because of this, the shop owner decided to | 0: close the store until the warm weather returns · 1: sell ice cream only on the coldest winter days · 2: buy more ice cream machines during the winter · 3: hire extra workers to help with the summer rush | 0 |
| 6 | `120a1e16-a777-4254-89c8-95055752f538` | Long ago, sending a letter was very expensive, and the person receiving it had to pay for it. Since poor people could not afford this, they often refused to accept mail from the postman. To fix this, the post office introduced cheap stamps that the sender paid for in advance. After this change was made, people | 0: could finally receive letters without worrying about the cost · 1: demanded that postmen pay for the letters themselves · 2: stopped writing letters because they were too expensive to send · 3: refused to use the cheap stamps on their mail | 0 |
| 7 | `2977516a-4358-4aaf-81aa-d82047de68b6` | Before modern alarm clocks, people called knocker-uppers were paid to wake up workers. Every morning, they walked through the streets and tapped on bedroom windows with long sticks. Eventually, cheap mechanical alarm clocks were invented and became widely available. As a result, the knocker-uppers | 0: lost their jobs since people woke themselves up · 1: started selling expensive mechanical clocks to workers · 2: began tapping on windows much louder than before · 3: bought longer sticks to reach higher bedroom windows | 0 |
| 8 | `2dacf84f-4f1f-4428-8d9e-4d5bf02f6a43` | Giant sequoia trees have thick bark that can shrug off most forest fires. In fact, their cones need the heat of a fire to crack open and release their seeds. A forest with no fires at all can leave the ground too crowded for young sequoias to grow. For this reason, rangers sometimes decide to | 0: set small, controlled fires on purpose · 1: water the oldest trees during dry summers · 2: cut down the giant sequoias for their seeds · 3: remove every source of heat from the forest | 0 |
| 9 | `329139c4-21c0-4a9e-a761-18910bc5bee5` | In colonial America, lobster was so common that it washed up on beaches in huge piles. It was seen as cheap food fit only for prisoners and the poor. Some servants even had it written into their contracts that they would not be fed lobster too often. Back then, being served lobster was widely considered | 0: a sign of a wealthy and generous household · 1: a mark of low status at the table · 2: something only served on special holidays · 3: a rare treat that servants looked forward to | 1 |
| 10 | `3a31dc1a-9752-4c76-ad96-bd51566ec828` | The patent system was created to reward inventors by giving them exclusive rights to sell their new creations. This protection encourages companies to spend millions of dollars researching useful new technologies. Recently, however, some businesses have been buying up patents just to sue other companies for using basic ideas. As a result of this practice, patents are now | 0: helping small companies research and develop new inventions · 1: sold only to companies that invent useful new technologies · 2: given to anyone who files a basic lawsuit · 3: being used to block innovation rather than encourage it | 3 |
| 11 | `42d36160-071d-429c-97a1-9b3aed1de151` | For decades, libraries were quiet places where visitors were expected to study in silence. Librarians would quickly quiet anyone who made even the slightest noise. Recently, however, libraries have turned into community hubs with loud workshops and noisy play areas. Because of this noisy shift, some traditional visitors | 0: joined the loud workshops with their librarians · 1: began complaining about the lack of quiet spaces · 2: started studying much louder than they did before · 3: demanded that libraries build more community play hubs | 1 |
| 12 | `430fc714-4ac7-47a8-bf90-53ca2a3be735` | For nearly a hundred years, mapmakers drew California as a large island off the coast. The mistake began with one careless map and was copied again and again. Even after explorers sailed around and reported solid land, the island kept appearing. Only when a king ordered the mistake fixed were maps | 0: redrawn to show even more islands nearby · 1: kept exactly as the earlier ones had been · 2: copied faster than ever across Europe · 3: finally changed to join California to the mainland | 3 |
| 13 | `d68179c4-2d0e-4540-bbb7-244644570cff` | A tea merchant wanted to send cheap samples of his loose tea leaves to customers. To save on packaging, he placed the leaves inside small, sewn silk bags instead of tin cans. He expected customers to open the bags and pour the leaves into hot water. Instead, what is surprising is that the customers simply | 0: refused to drink the cheap tea · 1: returned the silk bags to the merchant · 2: demanded heavy tin cans · 3: dropped the entire bag into the water | 3 |
| 14 | `7c757c49-9336-422b-bed5-ad0a73ba3dc8` | Coal miners once carried a small caged canary deep underground with them. The little bird breathed faster than a human and was far more sensitive to poison gas. If dangerous gas leaked into the tunnel, the canary would grow sick long before the miners felt anything. By keeping a close eye on the bird, the miners | 0: got an early warning to escape the tunnel · 1: could tell exactly which direction to dig next · 2: learned to breathe as slowly as the canary · 3: no longer needed to worry about gas at all | 0 |
| 15 | `83c792f8-6dfd-4dae-8be1-405ce366965c` | Female fireflies of one species flash their lights in a unique pattern to attract mates of their own kind. Males recognize this specific flash and fly down to meet them. However, females of a different, larger species have learned to mimic this exact signal. Consequently, when a small male flies down, he is often | 0: attracted to a larger male of his own species · 1: saved from danger by the flashing lights · 2: eaten by the larger female instead of finding a mate · 3: forced to mimic the signals of other female fireflies | 2 |
| 16 | `b608644b-381c-494d-a68e-cd08911ea04c` | City parks are designed as safe spaces for children and families to enjoy nature. Recently, many people have started riding fast electric scooters on the narrow walking paths. Several walkers have already been bumped and hurt by these high-speed riders. As a result, city officials are now planning to | 0: encourage faster scooter riding on the paths · 1: remove the green spaces and trees · 2: ban these fast vehicles from the walking paths · 3: build wider walking paths for family dogs | 2 |
| 17 | `b74e2011-fd58-49bd-a4f3-9ae0aea792ef` | In the 1630s, a single tulip bulb in Holland could cost more than a house. People from every class poured their savings into buying bulbs, sure the prices would keep climbing. Then one morning, buyers simply stopped showing up at the market. Almost overnight, because no one was willing to buy anymore, | 0: the price of bulbs kept climbing even higher · 1: tulips were banned from every garden in Holland · 2: fortunes collapsed and many were left with worthless bulbs · 3: the government stepped in to buy the extra bulbs | 2 |
| 18 | `c4b3460e-f285-400b-977c-7528639b11e6` | Desert plants must find clever ways to survive the burning midday sun. The giant saguaro cactus has deep ridges along its sides that cast small shadows on its own skin. Even a tiny bit of shade can lower the plant's temperature by several degrees. Consequently, the cactus is able to | 0: burn under the hot sun much faster · 1: grow without needing any sunlight at all · 2: make the desert air much warmer · 3: keep itself cool in the extreme heat | 3 |
| 19 | `c5023b0c-fb8e-4751-922f-8d08d2f35cec` | In a lake, a tribe built artificial islands out of floating reeds to live on. If enemies approached, the islands could simply be floated away to a safer area. Today, modern bridges connect these reed islands permanently to the mainland. As a result of these new bridges, | 0: the islands can easily float away to different lakes · 1: they are now completely made of heavy metal · 2: the islands can no longer be moved to escape danger · 3: local tribes built more floating reeds to live on | 2 |
| 20 | `cb37f916-afa3-41b5-b08f-1d88170ba67e` | Researchers wanted to see if crows could use tools to get food from deep bottles. They placed a small bucket of meat inside a tall glass jar, leaving a straight wire nearby. Surprisingly, a crow quickly bent the wire into a hook and pulled the food out. This clever behavior proved that these birds | 0: prefer eating straight wires instead of meat · 1: can design their own tools to solve problems · 2: only eat food that is kept in glass jars · 3: always need researchers to help them find food | 1 |
| 21 | `cbfb3b51-95ed-497f-87bb-febfb14e7725` | In ancient Greece, clubs voted on new members by dropping colored beans into a jar. White beans meant approval, while a black bean meant rejection. If the jar was knocked over early, the secret results were revealed. Because of this custom, we now use the phrase | 0: bite the bullet · 1: spill the beans · 2: sour grapes · 3: cool as a cucumber | 1 |
| 22 | `119a4a5b-4528-4e62-9ff9-34bb2e42b51a` | Healthy pine trees protect themselves by spraying sticky resin to drown attacking beetles. However, during long droughts, trees lack the water needed to produce this defensive resin. Without water, the trees become defenseless, allowing beetles to multiply and destroy entire forests. Therefore, a sudden lack of rainfall is often | 0: followed by massive beetle outbreaks · 1: drowned by the protective resin · 2: helpful for the trees' defense · 3: ended by a swarm of beetles | 0 |
| 23 | `147d0b36-4827-42bc-aef2-49cffc6741ad` | Most wild berries are bright red or blue to attract hungry birds. These birds eat the colorful fruit and spread the seeds across the forest. However, some rare plants grow green berries that birds cannot see against the leaves. As a result, these green berries | 0: are rarely eaten or spread · 1: are easy for birds to find · 2: turn red during the winter · 3: produce many more seeds | 0 |
| 24 | `19489906-2d37-41cc-bfd5-45d99758dc2c` | Bicycle chains must be covered in oil to move smoothly over the gears. Over time, dirt from the road sticks to the oil and creates a thick black paste. This sticky paste makes it very difficult to pedal the bicycle. Therefore, regularly cleaning and re-oiling the chain is | 0: likely to create more black paste · 1: necessary to make pedaling easy again · 2: guaranteed to break the metal gears · 3: only done by professional racers | 1 |
| 25 | `1c06046a-adac-4cbc-998b-f7feac4aef69` | Wild sheep naturally lose their heavy winter wool every single spring. In contrast, domestic sheep have been bred to grow wool continuously without ever stopping. This means domestic sheep cannot shed their thick coats on their own. Without human shearers to cut the wool, these domestic sheep | 0: suffer from extreme summer heat · 1: lose all their wool naturally · 2: run much faster in the wild · 3: grow warm wool only in spring | 0 |
| 26 | `23e0cca8-43a1-43a0-a3de-273d8caf8ec5` | Winter coats keep us warm by trapping a layer of air heated by our bodies. However, if the coat gets wet from rain, water fills the spaces where the air was. Since water conducts heat away much faster than air, a wet coat loses its warmth. Therefore, wearing a wet coat in winter will | 0: trap more body heat than dry clothes · 1: keep the rainwater from entering · 2: make a person feel extremely cold · 3: dry the water using body heat | 2 |
| 27 | `285ff2a8-7019-413b-a9dc-c3d3381a845e` | Forest fires can seem destructive, but they are vital for some trees. For example, certain pinecones are sealed tight with a thick, sticky glue. Only the intense heat of a forest fire can melt this glue and release the seeds. Therefore, without occasional forest fires, these trees | 0: melt their glue too quickly · 1: grow much taller than normal · 2: cannot reproduce and grow new trees · 3: release their seeds in spring | 2 |
| 28 | `46205069-113f-48a1-8da4-32be961a24d3` | Steel tracks expand and grow longer when heated by the summer sun. In the past, tracks were laid tightly together, leaving no room for this expansion. As a result, the hot rails would push against each other and bend dangerously. To prevent this bending, modern tracks are | 0: built tightly with no spaces · 1: laid with small gaps between them · 2: painted black to absorb more heat · 3: made entirely of soft wood | 1 |
| 29 | `4653c2bc-99c5-4731-a371-da130fdce0ac` | Early movies had no sound, so theaters hired pianists to play music. These musicians watched the screen and changed their music to match the action. When scary monsters appeared, the pianist played loud, dark chords. As a result, the audience members felt | 0: bored by the silent screen · 1: happy and started to laugh · 2: frightened by the dramatic scene · 3: inspired to play the piano | 2 |
| 30 | `7807785d-1b1f-4537-94ff-bf6784fc3823` | An ancient myth claimed that crocodiles wept while devouring their prey. In reality, crocodiles produce tears simply to lubricate their eyes while eating. These tears are just a physical reflex, not a sign of real grief. Today, when someone fakes sadness, we say they cry | 0: crocodile eyes · 1: crocodile tears · 2: salty water · 3: wolf tears | 1 |

**סה"כ: 30 פריטים × 4 הסברים = 120 הסברים, ועוד 30 רשימות `highlight_spans`.**
