# משימה: כתיבת הסברים בעברית לפריטי השלמת קטע (Batch 4 — 30 פריטים אחרונים)

אתה מסביר לתלמיד ישראלי מדוע כל אחת מ-4 האפשרויות בשאלת "השלמת משפט" (continuation) נכונה
או שגויה. התלמיד שומע קטע באנגלית ובוחר את הסיום ההגיוני ביותר.

## חוקים (חובה לעקוב אחריהם במדויק)

1. **הסבר נפרד לכל אחת מ-4 האפשרויות.** גם לאופציה הנכונה, גם לשלוש השגויות.
2. **כל הסבר חייב לכלול ציטוט מילולי אחד לפחות מתוך הטרנסקריפט באנגלית**, בתוך מירכאות,
   בדיוק כפי שהוא מופיע בטקסט (אותיות, פיסוק). זהו התנאי שנבדק אוטומטית — אם הציטוט לא
   מדויק מילה-במילה, הפריט נכשל.
3. **אל תסתפק במסקנה — הראה את שרשרת ההיגיון** (הסיבה → המילה המסמנת → המסקנה).
   הימנע מהסברים כמו "זו התשובה הנכונה כי היא הגיונית" בלי חיבור לטקסט.
   **כל מילת מפתח בודדת (highlight_span) עד 6 מילים.**
4. **טון לא-שיפוטי, לא מאשים.** אל תגיד "טעות", תגיד מה כתוב בקטע לעומת מה שהאפשרות טוענת.
5. **אורך כל הסבר: 150–250 תווים** (עברית, כולל הציטוט האנגלי בתוכו).

## highlight_spans

לכל קטע (lecture), צור מערך `highlight_spans` נפרד — 2 עד 4 ביטויים מהטרנסקריפט המסמנים את
מילות הכיוון/הסיבתיות המרכזיות (like "However", "Because of this", "Therefore", "To solve
this", "As a result", "Consequently" וכו'). כל ביטוי בודד עד 6 מילים, ציטוט מדויק מהטקסט.

## דוגמה עבודה 1

**קטע:** "During cold winters, water on roads freezes and turns into dangerous ice. To
prevent accidents, trucks spread large amounts of salt onto the streets. Salt lowers the
freezing point of water, keeping it liquid even in cold weather. Because of this salt, the
icy roads"

**אופציות:**
0. become much more slippery
1. freeze at much higher temperatures
2. melt and become safer (נכונה)
3. turn into dry desert sand

**פלט לדוגמה:**
```json
{
  "question_id": "EXAMPLE-1",
  "options": [
    {"index": 0, "explanation_he": "הקטע מסביר שפיזור המלח נועד \"To prevent accidents\" ולשמור על המים במצב נוזלי. לכן, התוצאה היא לא כבישים חלקים ומסוכנים יותר כמו \"become much more slippery\"."},
    {"index": 1, "explanation_he": "הקטע מציין כי המלח \"lowers the freezing point\", כלומר מוריד את נקודת הקיפאון. לכן, לא ייתכן שהכבישים יקפאו בטמפרטורות גבוהות יותר כמו \"freeze at much higher temperatures\"."},
    {"index": 2, "explanation_he": "הקטע מציג מטרה של \"To prevent accidents\" ומסביר שהמלח שומר על המים נוזליים. מכאן שהתוצאה היא שהקרח נמס והדרכים בטוחות יותר, כפי שמתואר ב-\"melt and become safer\"."},
    {"index": 3, "explanation_he": "המלח שומר על המים במצב נוזלי, אך אין בקטע שום אזכור לכך שהכבישים הופכים לחול מדברי יבש, כפי שמוצע בביטוי \"turn into dry desert sand\". זהו מידע לא רלוונטי."}
  ],
  "highlight_spans": ["To prevent accidents", "Because of this salt"]
}
```

## דוגמה עבודה 2

**קטע:** "In medieval England, bakers faced severe fines for selling underweight bread.
Because loaves can shrink unpredictably in the oven, bakers feared making an honest mistake.
To avoid any risk of punishment, they began adding an extra loaf to every order of twelve.
This clever practice is the origin of the expression"

**אופציות:**
0. half a loaf is better than none
1. a baker's dozen (נכונה)
2. to sell like hotcakes
3. to earn one's daily bread

**פלט לדוגמה:**
```json
{
  "question_id": "EXAMPLE-2",
  "options": [
    {"index": 0, "explanation_he": "המנהג המתואר בקטע כולל הוספת כיכר לחם נוספת מעל לנדרש כדי להימנע מקנס, כלומר להגדיל את הכמות. לכן, הביטוי \"half a loaf is better than none\" אינו מתאים לתוכן זה."},
    {"index": 1, "explanation_he": "האופים הוסיפו כיכר נוספת לכל הזמנה של שתים-עשרה כדי להימנע מעונש. מנהג זה יצר קבוצה של שלוש-עשרה פריטים, המכונה \"a baker's dozen\", כפי שנובע מתיאור ההיסטוריה בקטע."},
    {"index": 2, "explanation_he": "תוספת הלחם נועדה למנוע קנסות על משקל חסר, ולא לתאר קצב מכירות מהיר של לחם. לכן, הביטוי \"to sell like hotcakes\" אינו המקור ההיסטורי שמתואר כאן."},
    {"index": 3, "explanation_he": "הוספת כיכר הלחם ה-13 נועדה למנוע \"risk of punishment\". אף על פי שהמילה לחם מופיעה בביטוי \"to earn one's daily bread\", אין קשר בין המשמעות שלו למנהג ההוספה של כיכר לחם."}
  ],
  "highlight_spans": ["Because loaves can shrink", "To avoid any risk"]
}
```

## בדיקה עצמית לפני הגשה (8 סעיפים)

1. יש הסבר לכל אחת מ-4 האפשרויות בכל אחד מ-30 הפריטים?
2. כל הסבר מכיל ציטוט מילולי מדויק מהטרנסקריפט, במירכאות?
3. כל הסבר מראה את שרשרת ההיגיון (סיבה ← מילה מסמנת ← מסקנה), לא רק מסקנה יבשה?
4. הטון לא שיפוטי ולא מאשים?
5. כל הסבר בין 150 ל-250 תווים?
6. כל `highlight_span` מופיע מילה במילה בקטע, **ועד 6 מילים כל אחד**?
7. כל `highlight_spans` מכיל **2 עד 4** מחרוזות, לא פחות ולא יותר?
8. ה-`question_id` בפלט תואם בדיוק ל-`id` שבטבלה למטה?

## פורמט פלט

החזר מערך JSON יחיד ותקין (ללא טקסט נוסף לפניו או אחריו), כאשר כל איבר הוא:
```json
{
  "question_id": "...",
  "options": [
    {"index": 0, "explanation_he": "..."},
    {"index": 1, "explanation_he": "..."},
    {"index": 2, "explanation_he": "..."},
    {"index": 3, "explanation_he": "..."}
  ],
  "highlight_spans": ["...", "..."]
}
```

## 30 הפריטים

| # | question_id | קטע | אופציות (index: טקסט) | נכונה |
|---|---|---|---|---|
| 1 | 6d4c4625-d163-4460-aff0-3fe255e60410 | Venice is built on soft mud held up by millions of wooden poles below the water. You might expect the wood to have rotted away over so many centuries. But underwater, cut off from air, the poles slowly turned as hard as stone. Despite its watery base, Venice has managed to | 0: float gently from one lagoon to another / 1: stay standing for hundreds of years / 2: replace its wooden poles with steel ones / 3: sink a little lower into the mud each year | 1 |
| 2 | 8d48b282-4bce-4bb8-80da-31fa7dee15bd | Early paper money was easy for criminals to copy using basic printing presses. To stop this, governments began using complex designs and special paper that was hard to find. Today, modern bills even include glowing ink and tiny metal threads. Because of these security features, modern counterfeiters | 0: struggle to make convincing fakes / 1: easily print their own paper bills / 2: only use basic printing presses / 3: prefer to use actual gold coins | 0 |
| 3 | a59da05a-bbc6-4cc1-942e-900c7c652d82 | Long ago, people believed that tiny forest fairies loved to drink milk. Whenever a servant accidentally spilled a cup of milk, they believed the fairies drank it and blessed the house. Because the spill was considered a blessing, getting angry about the lost milk was seen as useless. Today, when someone worries about a past mistake, we say | 0: a bird in the hand is worth two in the bush / 1: there is no such thing as a free lunch / 2: there is no use crying over spilled milk / 3: don't put all your eggs in one basket | 2 |
| 4 | bc38bc2d-c4a3-425e-b498-98f82b53238e | Camels carry a large amount of fat stored inside their humps. When traveling through the dry desert, their bodies slowly turn this stored fat into water and energy. Consequently, camels can survive for many days without finding any fresh food or drink. After a very long desert journey, the camel's hump is | 0: filled with more fresh water / 1: much smaller and softer / 2: turning into a dark gray color / 3: protected from the hot sun | 1 |
| 5 | d2b28088-ebeb-4bc8-b24c-f4672ebd838d | Pure cocoa beans contain chemicals that are highly toxic to dogs, though harmless to humans. A dog's small body cannot break down these chemicals, which can cause severe heart damage. For this reason, veterinarians constantly warn pet owners about the dangers of chocolate. Consequently, feeding chocolate to a dog can | 0: make the animal extremely sick / 1: help protect the dog's heart / 2: make cocoa beans harmless to humans / 3: cost pet owners a lot of money | 0 |
| 6 | 0f1ec6cf-8db0-416c-a3eb-c5cc71e78225 | Regular ice is frozen water, which melts into a wet liquid when it warms up. Dry ice, made of frozen carbon dioxide, turns directly into gas without melting. Because of this, shipping companies prefer dry ice for sending frozen foods by mail. Therefore, once it warms up, the food package is | 0: kept completely dry and safe / 1: filled with wet liquid water / 2: frozen into carbon dioxide gas / 3: returned to the shipping company | 0 |
| 7 | 15350c58-6d73-4072-b29a-8d25e40bf469 | Early artists used soft pieces of bread to erase pencil mistakes from their drawing paper. However, these bread erasers spoiled quickly and attracted mice into the artists' studios. This messy problem was solved when a scientist discovered that natural rubber could erase pencil marks just as well. By switching to natural rubber erasers, the artists | 0: attracted many more hungry mice / 1: kept their studios clean and pest-free / 2: had to eat more soft bread / 3: erased all their drawing paper completely | 1 |
| 8 | 1682e4b7-1f7c-4580-8e25-12d71f029267 | Beavers build sturdy dams across fast-moving streams using mud, stones, and tree branches. These dams block the flowing water, creating deep, calm ponds where the beavers can safely build their homes. Without these protective ponds, wild predators could easily reach the beavers. Therefore, building these wooden dams is essential for the beavers' | 0: predators to find food easily / 1: safety and survival / 2: streams to flow faster / 3: diet of mud and stones | 1 |
| 9 | 1d92b037-9cfb-4a9e-a3d8-77364fd9cfd9 | Cork oak trees grow a thick bark that can be harvested every nine years without harming the tree. However, if workers harvest the bark too early, the tree loses its protection and dies. Therefore, strict laws prevent workers from harvesting bark before nine years have passed. Consequently, these strict laws help to | 0: harvest bark from dead trees / 1: kill the cork oak trees / 2: keep the trees alive and healthy / 3: reduce the nine years of growth | 2 |
| 10 | 29af436c-9eec-4719-bd78-8d11c066e6ed | Geese fly in a V-shaped formation to save energy on long winter migrations. The leading goose flies in front, cutting the wind and easing the path for those behind. However, flying at the front is exhausting, and no single goose can do it forever. Therefore, when the leader gets exhausted, another goose | 0: flies down to find winter food / 1: forces the leader to fly faster / 2: takes over the front position / 3: cuts through the V-shape formation | 2 |
| 11 | 2c31c400-81ec-48c4-a304-6dffcd9212fb | Wind turbines use massive blades to capture the energy of moving air and generate clean electricity. When the wind blows strongly, the blades spin very quickly, producing a large amount of power. On completely calm days, however, there is no moving air to push the blades. As a result, on these calm days, the turbines | 0: cannot produce any electricity / 1: spin much faster than usual / 2: burn massive amounts of coal / 3: capture more clean moving air | 0 |
| 12 | 2d6cf9ac-b998-4ca4-8f33-583c769bdfe7 | Many people rely on loud electric alarm clocks to wake up for work on time. However, if the power goes out during the night, these electric clocks will turn off completely. To prevent this, some modern clocks include a small backup battery inside them. Consequently, even if a power outage occurs, these backup batteries | 0: keep the clocks running / 1: turn the clocks off completely / 2: wake up the electricity workers / 3: require loud alarms to wake | 0 |
| 13 | 38d3ed7f-a06f-4a94-a2b1-801262c87060 | Raw milk contains harmless bacteria that grow rapidly when kept in warm temperatures. As these bacteria multiply, they produce acid that turns the sweet milk sour. Keeping milk inside a cold refrigerator slows the growth of these bacteria. Because of this cold temperature, the fresh milk | 0: turns sour much faster than usual / 1: stays sweet for a longer time / 2: contains many more harmless bacteria / 3: freezes into a solid white block | 1 |
| 14 | 39d58861-6b8b-435a-a414-a753485c8a26 | Agricultural disasters, wars, or plant diseases can easily wipe out entire species of important food crops. To protect the future of human food, scientists built a secure vault deep inside a freezing arctic mountain. Inside this frozen vault, millions of crop seeds are safely stored at freezing temperatures. If a major plant disease destroys crops worldwide, scientists can | 0: freeze the arctic mountain further / 1: build a larger secure vault / 2: use the stored seeds to replant them / 3: avoid protecting the future of food | 2 |
| 15 | 3cc02b35-279c-47c2-945c-acab2234714a | Long ago, battlefield doctors had no painkillers to help wounded soldiers during operations. To stop soldiers from screaming or biting their tongues, doctors placed a soft lead bullet in their mouths. Soldiers had to grit down and endure the surgery with nothing but sheer willpower. Today, facing pain with courage, we say | 0: chew the lead / 1: bite the bullet / 2: fight tooth and nail / 3: hold their tongue | 1 |
| 16 | 49820553-9c93-4958-953b-dcbb45acbf6c | Glass becomes soft and highly flexible when it is heated to extremely high temperatures in a furnace. While the glass is in this hot, soft state, artists can easily bend and shape it. However, as the glass cools down, it slowly hardens back into its stiff, breakable form. Therefore, any shaping or bending of the glass must be | 0: stopped when the glass is hot / 1: avoided by the glass artists / 2: washed with hot furnace water / 3: completed before the material cools | 3 |
| 17 | 4ccf48bd-2fe9-43b9-bccc-3c4fb8d59a7b | In warm climates, fresh meat spoils quickly because harmful bacteria multiply rapidly in the heat. Long ago, people discovered that certain spices, like pepper and garlic, naturally kill these bacteria. Consequently, using heavy spices on fresh meat was not just about improving the taste of the food. Instead, the spices also helped to | 0: attract more harmful bacteria / 1: improve the taste of bad meat / 2: preserve the meat for longer / 3: warm up the local climate | 2 |
| 18 | 4da6937d-2c65-4791-83ca-3da9c35d600c | Silkworms are very selective creatures that only eat fresh leaves of the white mulberry tree. Farmers grow entire orchards of these trees just to feed their silkworm colonies. Without this specific leaf, the worms cannot produce the strong fibers needed for silk thread. Therefore, if the mulberry trees die, | 0: silk production will completely stop / 1: silkworms will eat other tree leaves / 2: high-quality silk will become very cheap / 3: the worms will produce stronger cocoons | 0 |
| 19 | 531d2c10-c52c-4ee8-b1d4-ace1f9fb43f7 | Outer space is a freezing vacuum with no oxygen for humans to breathe. To survive these deadly conditions, astronauts must wear thick, heavy spacesuits when they go outside their spacecraft. These special suits provide warmth, continuous air, and protection from dangerous radiation. Consequently, without these protective suits, astronauts walking in space would | 0: breathe the freezing oxygen safely / 1: return to their warm spacecraft / 2: die within a few seconds / 3: feel much warmer and lighter | 2 |
| 20 | 56f5eb5f-e232-40e8-9566-880a2e78c12c | Early humans used sundials, which track the sun's shadow, to tell the time of day. However, because sundials rely on sunlight, people could not tell time at night. To solve this, inventors created water clocks that measured time using dripping water. Because water clocks did not need sunlight, they | 0: were only used on sunny days / 1: allowed people to tell time at night / 2: tracked the shadow of the sun / 3: ran out of water during storms | 1 |
| 21 | 5c750471-f4db-4bc9-92b8-3c3220fd00ba | Deep underground salt mines are completely free of pollen, dust, and other pollutants. Because of this clean air, miners rarely suffered from breathing problems. Doctors have realized that time spent in these salt-rich environments helps heal damaged lungs. As a result, many old salt mines are now | 0: used as health clinics for patients / 1: closed to protect the miners' lungs / 2: filled with pollen and dust / 3: dug deeper to find more salt | 0 |
| 22 | 65c03447-d5d3-4919-935b-cac76787ccb1 | Male fireflies flash bright yellow lights in the dark to attract female fireflies. Each species has its own unique flashing pattern, which helps females recognize the correct mates. Today, however, bright streetlights in cities make the night sky too bright for these flashes to be seen. As a result of this light pollution, female fireflies | 0: struggle to find the correct mates / 1: flash yellow lights even brighter / 2: fly toward the city streetlights / 3: recognize the unique flashing patterns easily | 0 |
| 23 | 68163876-4023-4f99-a9d8-d919cbc39fb9 | Burning coal and oil provides the energy needed to power modern factories and vehicles. However, this process releases carbon dioxide, which traps heat in the atmosphere and warms the planet. To prevent catastrophic warming, countries are investing heavily in solar and wind energy. Therefore, switching to these clean energy sources is | 0: expected to trap more atmospheric heat / 1: causing factories to burn more oil / 2: highly dangerous for the local weather / 3: meant to reduce global warming | 3 |
| 24 | 6bd1a6af-d578-4541-aebb-8a539e40f903 | Underground subway trains generate loud screeching noises as they travel around sharp curves. This noise occurs because the train's steel wheels grind directly against the steel tracks. To solve this, engineers built systems that spray a thin layer of grease onto the tracks. Because this grease reduces friction, the trains | 0: generate much louder screeching noises / 1: travel around curves much more quietly / 2: spray grease onto the passengers / 3: must travel on straight tracks only | 1 |
| 25 | 89360d09-f75f-4b91-bdd1-dd0b02af3985 | Chocolate bars contain unique fats that melt easily when exposed to warm temperatures. A bar left inside a hot car during summer will quickly turn into a sticky liquid. This liquid chocolate loses its familiar solid shape and firm texture entirely. To return it to a solid state, it must be | 0: kept in the warm car / 1: heated to a higher temperature / 2: washed with warm soapy water / 3: placed in a cool area | 3 |
| 26 | 9c08db0f-5a5e-4500-8496-b970174dd5d3 | In the early days of sound movies, studios struggled to sell English films abroad. Since foreign audiences did not understand spoken English, they refused to watch these movies. This economic problem was solved when studios printed translated subtitles on screen. Consequently, because of the subtitles, foreign audiences | 0: could finally understand and enjoy the films / 1: completely stopped watching English movies / 2: struggled to see the bottom of the screen / 3: learned how to speak English quickly | 0 |
| 27 | b3dcfe1a-c8c5-4346-96f3-9c37f5732c04 | Roman concrete built two thousand years ago still stands strong, even in ocean water. Modern concrete, in contrast, often crumbles apart after just a few decades. Scientists found the Romans mixed in volcanic ash, which seals cracks over time. Consequently, adding volcanic ash to modern concrete would make it | 0: fall apart in a few decades / 1: melt inside salty ocean water / 2: dry much faster than Roman concrete / 3: last much longer without crumbling | 3 |
| 28 | b932326d-adc8-4fab-b11b-d4ec8b49ea4c | In nineteenth-century Ireland, poor farmers planted only one single variety of potato across the entire country. Because all the potato plants were genetically identical, they lacked any defense against a newly arrived plant disease. Within months, this fast-spreading disease rotted almost every potato crop in the nation. As a result of planting only one potato variety, | 0: genetic defenses became much stronger / 1: the entire nation suffered a massive famine / 2: farmers started planting identical potato seeds / 3: the new disease disappeared within months | 1 |
| 29 | c4ddbf3b-40c8-4fa5-8100-3c7f07cca347 | Sunlight helps human skin produce vitamin D, which is essential for strong bones. However, getting too much direct summer sun can cause painful burns and skin damage. To prevent this damage, doctors recommend applying sunscreen before going outside. Therefore, wearing sunscreen allows people to | 0: avoid producing any vitamin D / 1: make their bones much weaker / 2: enjoy the outdoors without getting burned / 3: stay inside their houses all day | 2 |
| 30 | d37242ad-9f33-45f0-a3ea-8cbfe58fbdd5 | Strong winds in dry deserts constantly push sand dunes across the land. This moving sand can quickly cover roads, block railways, and swallow small villages. To stop this, workers plant deep-rooted grass along the edges of the dunes. Therefore, once the grass is planted, the dunes are | 0: pushed much faster by strong winds / 1: covering the railways more quickly / 2: turned into green forests / 3: prevented from moving across the land | 3 |
