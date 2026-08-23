# פרומפט לג'מיני — הסברים, מנה 3 (30 פריטים מתוך ה-90 הנותרים)

הוראות שימוש: פתח שיחה חדשה ב-AI Studio (בלי להעלות שום קובץ), העתק את כל מה
שמופיע מתחת לקו, הדבק כהודעה אחת, שלח. את התשובה (JSON) תעתיק ותשלח בחזרה בצ'אט הזה.

זו המנה השנייה מתוך 3 (30 פריטים כל אחת). אחרי זו נשארת רק מנה אחת.

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

כל מחרוזת חייבת להופיע מילה במילה בקטע — נבדק מכנית. **כל מילת מפתח בודדת עד 6 מילים.**

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
6. כל `highlight_span` מופיע מילה במילה בקטע, **ועד 6 מילים כל אחד**?
7. כל `highlight_spans` מכיל **2 עד 4** מחרוזות, לא פחות ולא יותר?
8. כל הסבר באורך 150–250 תווים? בקטעים עם יותר מפנייה אחת — האם ההסבר מציג את השרשרת ולא רק את המסקנה?

### המנה — 30 פריטים

| # | question_id | קטע | אופציות (index: טקסט) | נכונה |
|---|---|---|---|---|
| 1 | `7e0cf23d-784b-4a37-9b1f-d54b66bf733e` | During cold winters, water on roads freezes and turns into dangerous ice. To prevent accidents, trucks spread large amounts of salt onto the streets. Salt lowers the freezing point of water, keeping it liquid even in cold weather. Because of this salt, the icy roads | 0: become much more slippery · 1: freeze at much higher temperatures · 2: melt and become safer · 3: turn into dry desert sand | 2 |
| 2 | `8183bcf1-a776-49f0-b875-da53b220e96e` | Early pencils were filled with pure lead, which was soft and left dark marks. However, this material also broke easily and often stained people's hands. To fix this, creators mixed the lead with clay and baked it. As a result, the new pencils were | 0: harder to write with on paper · 1: stronger and much cleaner · 2: made of pure soft lead · 3: painted yellow to attract buyers | 1 |
| 3 | `89dac647-69b5-414e-a4de-6ecb216420f3` | For generations, farmers grew the same crop on the same field every single year. Eventually, the plants drained all the nutrients from the soil, leaving the land useless. To fix this, farmers began rotating different crops, which naturally restored the lost nutrients. By rotating their crops, farmers successfully | 0: drained the remaining nutrients · 1: stopped using the land entirely · 2: kept the soil healthy and fertile · 3: grew the same crop every year | 2 |
| 4 | `a85aae05-5793-4c0e-9710-30ac41ac667f` | Ice rinks need a smooth surface for skaters to glide safely. Over time, skates cut deep grooves into the ice, making it rough. To solve this, a machine was built to shave off the damaged layer and spray fresh water. After the machine finished its work, the ice | 0: became much rougher than before · 1: was smooth and clean again · 2: melted into a warm pool · 3: contained many deep grooves | 1 |
| 5 | `b5b93eee-50e3-4928-a527-4ff47b7eadb0` | In dry deserts, plants compete fiercely for every drop of rain. Some bushes release toxic chemicals into the surrounding soil to stop other plants from growing nearby. This clever trick ensures that the bush has no neighbors to steal its water. As a result, these toxic bushes usually | 0: grow very close to other plants · 1: die from a lack of water · 2: produce very colorful desert flowers · 3: stand completely alone in the sand | 3 |
| 6 | `bb27a71f-704c-4805-96c0-852244e99d3a` | For decades, food companies removed fat from products to make them healthier. However, food without fat tastes terrible, so companies added massive amounts of sugar instead. This sugar made the low-fat food taste great, but it also caused weight gain. Consequently, people who bought these low-fat products | 0: completely stopped eating sugar · 1: often gained weight anyway · 2: lost fat faster than before · 3: demanded the return of fat | 1 |
| 7 | `bffd7489-df9b-4c2e-a805-8f7d45655d15` | Giant pandas have the digestive system of carnivores, which are built to digest meat. Yet, pandas eat almost nothing but bamboo, which contains very little nutrition. Because bamboo is so weak in nutrients, pandas must eat for sixteen hours a day to survive. As a result of their poor diet, pandas | 0: spend most of their time eating · 1: hunt other animals for meat · 2: have a very strong digestive system · 3: sleep through the entire day | 0 |
| 8 | `d21ecfad-db56-43f2-bbe8-9ec04fcdb3eb` | Mapmakers must ensure that countries sharing a border do not have the same color. If neighboring nations looked identical, people would struggle to see where one ended. Using different colors makes political boundaries clear and easy to read. Therefore, two countries that touch each other must be | 0: given the exact same color · 1: separated by a wide ocean · 2: printed in different colors · 3: drawn with identical boundaries | 2 |
| 9 | `d7f6c87a-a85c-45b0-aaee-58763a2ba0e4` | In medieval England, bakers faced severe fines for selling underweight bread. Because loaves can shrink unpredictably in the oven, bakers feared making an honest mistake. To avoid any risk of punishment, they began adding an extra loaf to every order of twelve. This clever practice is the origin of the expression | 0: half a loaf is better than none · 1: a baker's dozen · 2: to sell like hotcakes · 3: to earn one's daily bread | 1 |
| 10 | `e443cacf-b45b-440f-945e-860dd9f59974` | Coffee plants produce a chemical called caffeine to protect themselves from pests. This bitter chemical is highly toxic to small insects that try to eat the plant's leaves. However, larger animals like humans are not harmed by small amounts of it. Therefore, while caffeine kills destructive insects, it | 0: is safe for humans to consume · 1: protects humans from forest pests · 2: tastes extremely sweet to humans · 3: helps plants grow larger leaves | 0 |
| 11 | `fdea7682-bf15-43cd-a198-fea94c2d474c` | Long ago, royal chefs wore tall white hats to show their high status. The tallest hat always belonged to the master chef of the kitchen. Other cooks wore shorter hats depending on their experience. Therefore, a chef with very little experience was | 0: allowed to wear the master's hat · 1: given a very tall white hat · 2: forced to work outside the kitchen · 3: given a very short hat | 3 |
| 12 | `00b69c60-cb2d-48a4-b8d5-63fb4c7b460b` | A chef was angry because a difficult customer kept sending his fried potatoes back for being too thick. To teach the customer a lesson, the chef sliced the potatoes paper-thin and fried them until they were completely hard. What is surprising is that the difficult customer | 0: refused to pay for the sliced potatoes · 1: demanded a thicker plate of food · 2: absolutely loved the crispy snack · 3: left the restaurant to eat elsewhere | 2 |
| 13 | `0206150d-a2b6-4fde-a611-fe98a556ce3c` | An ancient emperor only drank water that was freshly boiled to ensure it was clean. One windy afternoon, while his servants were boiling water under a tree, some wild leaves blew into the pot. The leaves colored the water and released a rich, pleasant aroma. Instead of throwing the dirty water away, the curious emperor | 0: drank it and discovered tea · 1: ordered his servants to cut the tree · 2: boiled fresh water in a clean pot · 3: realized the windy day was ending | 0 |
| 14 | `04d906db-ef93-4979-9f84-b650d9ca0c90` | For centuries, violin strings were made from the dried intestines of sheep. These traditional strings produced a beautiful warm sound, but they easily went out of tune in damp weather. Modern makers solved this constant frustration by wrapping durable metal wire around synthetic plastic cores. Because of this modern change, the strings now | 0: require sheep intestines to function · 1: stay in tune much better · 2: produce a terrible sound · 3: break during damp winter storms | 1 |
| 15 | `08edc807-d54f-43dd-82bf-8b0e219bba44` | Early car tires were made of pure natural rubber, which was light gray. To make them stronger, tire manufacturers started adding carbon black chemical powder. This protective black powder increased the lifespan of the rubber by five times. As a result, car tires became | 0: dark and lasted much longer · 1: light gray and very weak · 2: much more expensive to purchase · 3: filled with natural rubber powder | 0 |
| 16 | `1620bec2-5f73-4070-874d-18f0bc33513c` | Polar bears hunt seals on the white sea ice to survive. During the cold winter, they easily find plenty of food on the thick frozen surface. However, global warming is now melting the sea ice much earlier in the spring. Because of this loss of ice, the polar bears | 0: struggle to catch enough food · 1: easily find seals in the winter · 2: enjoy swimming in the warm water · 3: grow much larger and stronger | 0 |
| 17 | `3f19d83d-03cd-4f64-8c95-bd9406089032` | Early piano keys were covered in real ivory harvested from elephant tusks. Over time, the ivory keys would turn yellow, crack easily, and require constant cleaning. Today, piano makers protect wild elephants and solve these durability issues by using high-quality white plastic. Because of this transition to plastic, modern piano keys | 0: are still harvested from elephant tusks · 1: turn yellow and crack much faster · 2: require more ivory to remain white · 3: last longer and stay clean easily | 3 |
| 18 | `44dd2699-e88d-4f84-9ca0-3b7c11cf323a` | Neon gas glows with a bright red color when electricity passes through it. To create different colors, sign makers must mix neon with other gases like argon or mercury. However, these other gases require higher voltage and are much more expensive to use. Therefore, simple red signs are generally | 0: mixed with expensive argon gas · 1: brighter than any other color · 2: much cheaper to run than blue ones · 3: built with electricity instead of neon | 2 |
| 19 | `4a49dcb2-b935-415f-8824-c96983f905ea` | Before the printing press was invented, books had to be copied slowly by hand. Consequently, books were rare luxury items that only very wealthy people could buy. This situation changed when a machine was built that could print thousands of pages quickly. Because books could now be printed easily, | 0: wealthy people stopped buying them · 1: writers refused to write new books · 2: they became much cheaper and more common · 3: copying books by hand became faster | 2 |
| 20 | `4a999e88-4faf-4c2a-bc12-384cb6d22a4c` | Paper wasps are known for building sturdy, waterproof nests to protect their eggs. To do this, they chew dry wood and mix it with their own sticky saliva to make a paste. This raw paste is then spread out in thin sheets, which quickly dry into tough paper. Consequently, to build their nests, these wasps do not | 0: lay eggs in their nests · 1: chew dry wood anymore · 2: need to find human paper · 3: build nests during the summer | 2 |
| 21 | `60fa90a6-1592-47fb-9fe1-725a2112b151` | Baby flamingos are born with dull gray feathers. As they grow up, they eat massive quantities of tiny red algae and pink shrimp. These colorful foods contain natural red pigments that accumulate inside the birds' growing feathers over time. Therefore, as adult flamingos eat more of this food, they | 0: turn back to a dull gray · 1: start eating tiny red fish · 2: lose all their feathers · 3: become bright pink | 3 |
| 22 | `6295529f-fcc6-4e26-9c07-1aef4b4e05f0` | In medieval times, soldiers had to buy their own warm leather boots before joining a battle. Poor soldiers who could not afford boots marched into battle with bare, freezing feet. Often, these terrified soldiers would run away from the battlefield to save themselves from freezing. Today, someone too afraid to act has | 0: boots on the ground · 1: a heart of gold · 2: a head in the clouds · 3: cold feet | 3 |
| 23 | `69942a65-df36-43c1-8210-55c4cd4edadc` | Wooden ships used to be attacked by shipworms, which ate tiny holes into the wood. Over time, these small holes would fill with water and cause the ship to sink. To protect the wood, builders eventually covered the bottom of the ships with thin copper sheets. Because shipworms could not bite through metal, the copper sheets | 0: kept the wooden ships from sinking · 1: ate tiny holes into the copper sheets · 2: made the ships sink much faster · 3: were made from heavy wooden planks | 0 |
| 24 | `720c8291-3c16-41c4-8686-c01829bc2cb0` | Early subway trains were powered by steam engines that burned coal. This coal burning filled the underground tunnels with thick, black smoke that choked the passengers. To solve this health crisis, cities replaced the steam engines with clean electric trains. After the electric trains were introduced, the underground tunnels | 0: burned much more coal than before · 1: were closed to passengers completely · 2: became even smokier and more dangerous · 3: became clean and safe to breathe in | 3 |
| 25 | `73e08152-2060-4c75-a89b-8fa52e713e3b` | In the ancient Roman Empire, salt was highly valuable and hard to obtain. Soldiers were often paid their monthly wages directly in valuable blocks of salt instead of coins. This salt was used to preserve food, making it essential for survival during long winter military campaigns. Consequently, a soldier who lost his salt would | 0: earn more coins from the Roman Empire · 1: campaign to find more winter food · 2: melt the blocks of salt quickly · 3: struggle to keep his food fresh | 3 |
| 26 | `824044fa-293a-4dd1-93ce-e8858f5e423f` | Early traffic signals used red lights for stop and green lights for go. However, drivers had no warning when the green light was about to end, causing sudden car crashes. To fix this dangerous problem, engineers added a bright yellow light in the middle. Therefore, the new yellow light was meant to | 0: replace the green light completely · 1: make cars go even faster · 2: turn red during the night · 3: warn drivers to slow down | 3 |
| 27 | `87f29225-92bc-4cb9-b96f-3f9b5c94332b` | In ancient Venice, the secret formula for making clear glass was protected by strict laws. Glassblowers were treated like royalty but were forced to live on an isolated island to prevent secrets from spreading. If a glassmaker tried to escape the island, assassins were sent to hunt him down. Therefore, despite their wealthy and royal lifestyles, Venice's glassmakers | 0: freely shared their secrets with other nations · 1: built clean ships to escape the island · 2: were essentially prisoners in their own homes · 3: protected the assassins from the city's laws | 2 |
| 28 | `8a95b17f-61d8-4386-8120-64b6d896d863` | Certain rare bamboo species bloom and produce seeds only once every hundred years. When they finally bloom, they release millions of seeds across the forest floor at once. This sudden flood of food attracts giant swarms of forest rats that multiply rapidly. After the seeds are gone, these rat swarms | 0: produce even more bamboo seeds · 1: attack human farms for food · 2: starve because the bamboo blooms again · 3: sleep under the dry forest floor | 1 |
| 29 | `8f25c0a0-81c6-449d-9526-c7348345d594` | In the early nineteenth century, keeping food fresh during hot summer months was extremely difficult. People had to buy large blocks of natural ice harvested from cold northern lakes during winter. However, this ice melted quickly, causing food to spoil within days. Therefore, the invention of the electric refrigerator was | 0: rejected because it used too much natural ice · 1: welcomed as a way to preserve food safely · 2: built to harvest ice from northern lakes · 3: only used during the cold winter months | 1 |
| 30 | `9498a8bf-a05d-4ff4-ae9f-62446677b9b3` | Early telescopes used glass lenses that were thick and heavy, which limited their size. If the lenses were made any larger, they would bend under their own weight and distort images. Consequently, astronomers built modern telescopes using lightweight, curved mirrors instead of glass lenses. Because these modern mirrors are so light, they can | 0: bend under their own heavy weight · 1: be made much larger without distorting · 2: only view the sun during the day · 3: be easily replaced with thick glass lenses | 1 |

**סה"כ: 30 פריטים × 4 הסברים = 120 הסברים, ועוד 30 רשימות `highlight_spans`.**
