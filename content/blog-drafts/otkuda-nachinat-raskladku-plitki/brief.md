# Редакционный бриф

## Статус

- Статус: `draft`
- Планируемый slug: `otkuda-nachinat-raskladku-plitki`
- Основной продукт: `/instrumenty/raskladka-plitki/`
- Связанный калькулятор: `/kalkulyatory/poly/plitka/`
- Публикация: только после редакционной и визуальной проверки

## Поисковый интент

Человек уже выбрал плитку или её формат и хочет понять, откуда начинать раскладку: от края, от центра стены/пола или от оси проёма. Ему нужен способ сравнить варианты до нанесения клея, а не общая статья о видах плитки.

### Основной запрос

`откуда начинать раскладку плитки`

### Поддерживающие формулировки

- `раскладка плитки от центра или от края`
- `как избежать узкой подрезки плитки`
- `как разметить плитку по центру стены`
- `как совместить шов плитки с дверным проёмом`
- `стартовая линия укладки плитки`

## Граница с существующим контентом

Статья `/blog/vybor-plitki/` рассказывает о форматах, видах и схемах укладки в целом. Новый материал не повторяет выбор материала, клея и рисунка. Его единственная задача — выбор стартовой линии, оценка крайних доборов и привязка сетки к заметным осям.

## Пользовательская ценность

После чтения пользователь должен уметь:

1. отличить старт от края от центрированной сетки;
2. распознать неудобный узкий добор;
3. сравнить симметрию и расход, не предполагая, что центр всегда дешевле;
4. выбрать центр плитки или межплиточный шов на оси двери;
5. проверить решение в генераторе раскладки до покупки и нанесения клея.

## SEO-конструкция статьи

- Ответ на основной запрос дан в первом абзаце без вступительной воды.
- Основной ключ присутствует в title и description; поддерживающие формулировки распределены по самостоятельным смысловым разделам.
- Таблица в начале помогает попасть в сравнительный интент «центр или край» и даёт короткий ответ для сниппета.
- Числовой пример связывает информационный запрос с реальным генератором, а не подменяет статью рекламным CTA.
- FAQ закрывает уточняющие вопросы о двери, шве, диагонали, собственном сдвиге, стене и полу.
- Внутренние ссылки ведут в инструмент, калькулятор плитки и существующий материал о выборе плитки; анкор каждого URL соответствует его задаче.
- Статья не создаёт отдельные страницы под близкие формулировки и не размножает один интент по нескольким slug.
- Изображения имеют уникальные описательные `alt`, а не повторяют основной ключ дословно.

## Проверяемый пример

Данные взяты из текущего `compareTileLayoutStartModes`:

- поверхность 2500×2600 мм;
- плитка 600×300 мм;
- шов 2 мм;
- прямая раскладка;
- запас 10%.

Результат от края: справа 92 мм, снизу 184 мм, один узкий край, 45 плиток на схему, 50 к покупке.

Результат по центру: слева/справа по 346 мм, сверху/снизу по 91 мм, узких краёв по критерию инструмента нет, 50 плиток на схему, 55 к покупке.

Вывод примера: центр улучшает видимые края, но увеличивает закупку на 5 плиток. Это сравнение вариантов, а не универсальное правило.

## Источники и доказательность

- `src/lib/tools/tile-layout.ts` — источник числового примера и программного критерия «узкий край < 30%».
- MAPEI Reference Guide: рекомендация по возможности избегать подрезок меньше половины плитки. Это практическая инструкция производителя, а не российская обязательная норма.
- MAPEI wall-layout guide: предварительная разметка и проверка раскладки нужны, чтобы не получить тонкие полосы у границ.

В статье нельзя называть 30% или 50% требованием ГОСТ/СП. Для конкретной коллекции, основания, деформационных швов и способа монтажа приоритет имеют проект и документация производителей системы.

## Перелинковка Ghost

Публичные теги:

- `Плитка`
- `Раскладка`
- `Подрезка`

Внутренние теги:

- `#tool:raskladka-plitki`
- `#calc:plitka:poly`
- `#icon:▦`

`#howto` не добавлять: это руководство по выбору решения, а не последовательность монтажных операций.

## Изображения

Все изображения созданы встроенным генератором изображений OpenAI и сохранены как проектные WebP. В статье используется не декоративная галерея, а последовательный визуальный сценарий: сравнение сеток → замеры → качество подрезки → сухая раскладка → ось проёма → сложные узлы → перенос линий → пол от входа → остатки и запас.

### Обложка

- Файл: `images/feature.webp`
- Размер: 1200×630
- Alt: `Сравнение раскладки плитки от края и по центру на стене с дверным проёмом`
- Назначение: визуально показать одинаковую стену с двумя вариантами стартовой сетки.

### Внутренняя иллюстрация

- Файл: `images/razmetka-po-tsentru.webp`
- Размер: 1200×800
- Alt: `Разметка центральных осей и сухая раскладка плитки перед укладкой`
- Назначение: показать проверку осей и подрезок до нанесения клея.

### Дополнительная визуальная серия

| Файл | Alt | Что объясняет |
|---|---|---|
| `images/sdvig-setki.webp` | `Сдвиг модульной сетки плитки относительно границ стены` | Почему одинаковая поверхность даёт разные крайние доборы |
| `images/zamery-osnovaniya.webp` | `Замеры подготовленной стены перед расчётом раскладки плитки` | Какие исходные размеры нужны до построения схемы |
| `images/uzkaya-podrezka.webp` | `Сравнение узкой подрезки плитки и широкого устойчивого добора` | Чем тонкая полоса отличается от рабочего края |
| `images/os-proema.webp` | `Проверка оси дверного проёма относительно сетки плитки` | Как зафиксировать визуальную ось проёма |
| `images/nisha-i-santehnika.webp` | `Проверка сетки плитки вокруг ниши и сантехнических выводов` | Почему нишу и выводы проверяют в общей сетке стены |
| `images/razmetka-steny-lazerom.webp` | `Разметка вертикальной стены лазерным уровнем перед укладкой плитки` | Как перенести выбранную схему на основание |
| `images/raskladka-pola-ot-vhoda.webp` | `Проверка раскладки напольной плитки по линии взгляда от входа` | Почему вход и переход покрытий важнее формального центра комнаты |
| `images/podrezki-i-zapas.webp` | `Сортировка целой плитки, повторно используемых подрезок и отходов` | Разницу между полезным остатком и отходом |

Итого: одна обложка и девять иллюстраций внутри статьи. При объёме около 3500 слов это даёт осмысленный визуальный акцент примерно на каждые 300–400 слов без перегрузки страницы.

## Промпты генерации

Промпты сохранены дословно, чтобы изображения можно было воспроизвести или точечно переработать без изменения художественного направления.

### Обложка

```text
Use case: photorealistic-natural
Asset type: wide blog header image for a Russian construction calculator website, intended crop about 1200×630
Primary request: show the same modern bathroom wall as a clear visual comparison of two tile starting strategies, edge start versus centered layout, without any written labels
Scene/backdrop: bright realistic unfinished-to-finished bathroom wall mockup, straight rectangular wall with a centered doorway opening, warm off-white surroundings
Subject: two adjacent presentation panels of the same wall geometry; one layout starts with a full 600×300 mm beige stone-look tile at one edge and visibly ends with an awkward narrow strip; the other layout is centered on the wall and has balanced, wider edge cuts on both sides
Style/medium: premium photorealistic architectural visualization, accurate ceramic tile grid, believable grout lines and cut pieces
Composition/framing: symmetrical wide front elevation, two equal comparison panels separated by a subtle vertical gap, enough clean margin around the wall, no people
Lighting/mood: soft neutral daylight, warm and trustworthy, restrained contrast
Color palette: warm white, light beige stone, subtle orange construction guide accents
Materials/textures: matte porcelain stoneware, fine mineral texture, realistic grout and wall shadow
Constraints: the two panels must use identical wall, door and tile dimensions; tile rows and columns must remain geometrically straight; clearly show a very narrow terminal cut only in the edge-start panel and balanced cuts in the centered panel; no text, no numbers, no logos, no trademarks, no watermark
Avoid: distorted rooms, warped grout, impossible tile joints, luxury clutter, dramatic cinematic lighting, tools floating in space
```

### Внутренняя иллюстрация

```text
Use case: photorealistic-natural
Asset type: in-article educational construction photograph, intended wide crop about 1200×800
Primary request: a tile installer planning a ceramic floor layout before adhesive, using crossed center lines and dry-laid tiles to compare edge cuts
Scene/backdrop: clean empty bathroom under renovation, prepared light-gray floor, plain plastered walls
Subject: top-down three-quarter view of a realistic installer’s hands marking two perpendicular center axes with a chalk line and measuring tape; several 600×300 mm warm beige porcelain tiles are dry-laid symmetrically around the axes; wide balanced perimeter cuts are clearly visible; a laser level casts one subtle orange line
Style/medium: premium photorealistic editorial construction photography, documentary rather than staged
Composition/framing: wide landscape, hands and measuring tools in lower third, tile grid and intersecting axes clearly readable, no face required
Lighting/mood: soft neutral daylight, practical and trustworthy
Color palette: warm beige tiles, light-gray substrate, restrained orange guide line, dark neutral tools
Materials/textures: realistic matte porcelain, fine grout spacers, chalk marks, metal tape measure, slight construction dust
Constraints: straight geometrically plausible tile grid; axes cross at the room center; no adhesive applied yet; no written text, no numbers, no logos, no trademarks, no watermark
Avoid: impossible perspective, warped tiles, random tools, finished luxury bathroom, dramatic lighting, excessive dirt, safety violations
```

### Сдвиг сетки

```text
Use case: infographic-diagram
Asset type: wide in-article educational comparison image for a Russian construction calculator website, intended crop 1200×800
Primary request: show how shifting the same ceramic tile grid changes the edge cuts on the same wall, without any written labels
Scene/backdrop: clean warm-white technical studio background, two equal front-elevation wall panels separated by a narrow gap
Subject: identical rectangular bathroom wall geometry in both panels, warm beige 600×300 mm horizontal porcelain tiles with thin gray grout; left panel starts with a full tile at the left edge and ends with an obviously narrow vertical strip at the right; right panel shifts the whole grid to create two equal wide edge cuts; one subtle orange vertical guide axis in each panel
Style/medium: premium photorealistic technical visualization with precise architectural geometry, clean editorial infographic feel
Composition/framing: symmetrical landscape comparison, straight-on orthographic elevation, generous margins, tiles large enough to inspect
Lighting/mood: soft neutral studio daylight, clear and trustworthy
Color palette: warm white, light beige stone, pale gray grout, restrained orange guide line
Materials/textures: matte porcelain stoneware with subtle natural mineral variation
Constraints: both panels must use identical wall and tile dimensions; rows and columns perfectly straight; no perspective distortion; no text, no numbers, no arrows, no logos, no watermark
Avoid: warped grout, impossible joints, luxury decor, people, tools, dramatic shadows, random tile sizes
```

После визуальной проверки исходник скорректирован, чтобы обе половины использовали одну и ту же прямую схему:

```text
Use case: precise-object-edit
Asset type: wide in-article educational comparison image, intended crop 1200×800
Primary request: correct only the tile joint pattern so the comparison demonstrates grid shift, not a different layout mode
Input images: Image 1: edit target
Required edit: in both panels use the exact same strict straight stack-bond grid with every vertical grout joint aligned through every row; preserve identical 600×300 mm horizontal tiles; left panel must start with a full tile at the left edge and end with one narrow vertical cut at the right edge; right panel must shift the entire straight grid horizontally so the left and right edge cuts are equal and wide
Constraints: change only tile joint positions necessary for this correction; preserve the two-panel front elevation, wall dimensions, materials, orange guide lines, lighting, background and framing; no offset or brick pattern; no text, no numbers, no arrows, no logos, no watermark
Avoid: alternating rows, changing tile format, warped grout, changing camera or colors
```

### Замеры основания

```text
Use case: photorealistic-natural
Asset type: wide in-article educational construction photograph, intended crop 1200×800
Primary request: professional installer accurately measuring a prepared bathroom wall before calculating a tile layout
Scene/backdrop: clean bathroom under renovation, smooth light-gray prepared wall, bare floor, no finished fixtures
Subject: realistic installer seen from the side and slightly behind, measuring wall width at three heights with a laser distance meter and metal tape; a vertical laser line, a notebook with simple blank sketch marks, several unpacked beige 600×300 mm tiles leaning safely nearby
Style/medium: premium photorealistic editorial construction photography, documentary and practical
Composition/framing: wide landscape, wall dominates the frame, measuring action clearly readable, installer’s face not prominent
Lighting/mood: soft neutral daylight, calm professional jobsite
Color palette: warm gray, beige tile, restrained orange laser accent, dark neutral workwear
Materials/textures: realistic plaster, matte porcelain, metal tape, fine construction dust
Constraints: plausible tool use and body position; prepared substrate; no adhesive yet; no readable text, no numbers, no logos, no trademarks, no watermark
Avoid: distorted room, floating tools, unsafe ladder, excessive dirt, staged stock-photo smile, luxury finished bathroom
```

### Узкая и широкая подрезка

```text
Use case: infographic-diagram
Asset type: wide in-article educational comparison image, intended crop 1200×800
Primary request: compare an awkward narrow ceramic tile edge cut with a robust wide edge cut, without written labels
Scene/backdrop: clean neutral technical studio with two adjacent close-up wall-corner mockups
Subject: same warm beige horizontal 600×300 mm porcelain wall tile system in both panels; left panel ends at the corner with a very thin fragile vertical strip; right panel ends with a wide balanced cut approximately half a tile; subtle orange outline emphasizes only the terminal cut in each panel
Style/medium: premium photorealistic construction visualization with precise tile geometry and editorial infographic clarity
Composition/framing: landscape split comparison, straight-on slight three-quarter close-up so tile thickness and corner are believable, large simple forms
Lighting/mood: soft neutral daylight, high clarity, restrained contrast
Color palette: beige stone, warm white, gray grout, one muted orange accent
Materials/textures: matte porcelain, clean cut edges, realistic thin grout
Constraints: identical tile format and wall geometry; straight grout lines; obvious difference in terminal cut width; no chips or broken installation; no text, no numbers, no logos, no watermark
Avoid: warped tiles, random masonry pattern, dramatic shadows, tools, people, finished luxury decor
```

### Ось дверного проёма

Финальный файл получен точечной корректировкой первоначального варианта с проёмом.

```text
Use case: precise-object-edit
Asset type: wide in-article educational comparison image, intended crop 1200×800
Primary request: change only the tile joint geometry so the two doorway-axis options are unmistakable
Input images: Image 1: edit target
Required edit: use a strict straight stack-bond tile grid in both panels, with every vertical joint aligned through all rows; in the left panel place the dashed orange doorway axis through the exact center of one full tile above the doorway; in the right panel place the dashed orange axis exactly on a continuous vertical grout joint
Constraints: preserve the two-panel composition, identical doorway geometry, warm beige material, front elevation, lighting and clean background; keep tiles rectangular and grout perfectly straight; no staggered brick pattern; no text, no numbers, no arrows, no logos, no watermark
Avoid: changing the camera, doorway, colors or overall layout; warped joints; offset rows
```

### Ниша и сантехнические выводы

```text
Use case: photorealistic-natural
Asset type: wide in-article educational construction photograph, intended crop 1200×800
Primary request: installer checking a planned tile grid around a shower niche and plumbing outlets before applying adhesive
Scene/backdrop: modern bathroom under renovation, prepared waterproofed shower wall in warm light gray, rectangular recessed niche and two round plumbing outlets
Subject: straight orange laser cross projects across the wall and niche; several warm beige 600×300 mm porcelain tiles are dry-positioned on a support batten; installer’s gloved hands hold one template tile near the niche to check the cut, no adhesive applied
Style/medium: premium photorealistic editorial construction photography, practical and technically believable
Composition/framing: wide front three-quarter view, niche and outlets clearly visible, hands in lower side, grid relationship is the focus
Lighting/mood: soft neutral jobsite daylight, clean professional atmosphere
Color palette: warm gray waterproofing, beige stone tile, subtle orange laser, dark neutral gloves
Materials/textures: matte porcelain, waterproofing membrane, metal plumbing outlets, realistic tile spacers
Constraints: plausible straight tile rows; niche integrated into the same wall grid; safe tool use; no readable text, no numbers, no logos, no trademarks, no watermark
Avoid: finished luxury bathroom, running water, warped niche, floating tile, excessive dirt, dramatic lighting
```

### Перенос сетки на стену

```text
Use case: photorealistic-natural
Asset type: wide in-article educational construction photograph, intended crop 1200×800
Primary request: professional installer transferring a tile layout grid onto a vertical bathroom wall using a laser level and straight support batten
Scene/backdrop: clean bathroom under renovation, prepared smooth wall, unfinished floor
Subject: installer seen in profile fixing a perfectly level temporary metal support rail for the first working row; orange laser horizontal and vertical axes cross the wall; a short dry row of warm beige 600×300 mm tiles with spacers confirms the line; pencil and long spirit level nearby
Style/medium: premium photorealistic editorial construction photography, authentic working process
Composition/framing: wide landscape, wall grid and support rail dominate, installer in one third, no face emphasis
Lighting/mood: soft neutral daylight, orderly professional jobsite
Color palette: light warm gray, beige stone, restrained orange laser, charcoal workwear
Materials/textures: smooth prepared plaster, matte porcelain, brushed metal rail, realistic spacers
Constraints: geometrically straight axes and rail; no adhesive yet; plausible installation posture; no readable text, no numbers, no logos, no trademarks, no watermark
Avoid: crooked rail, unsafe improvisation, finished bathroom fixtures, excessive dust, staged smile, dramatic cinematic shadows
```

### Пол от входа

```text
Use case: photorealistic-natural
Asset type: wide in-article educational construction photograph, intended crop 1200×800
Primary request: dry planning of a floor tile layout viewed from the doorway, showing why the entrance sightline and flooring transition matter
Scene/backdrop: empty bathroom under renovation viewed from just outside an open doorway; prepared light-gray floor, unfinished walls, clean threshold to an adjacent room
Subject: warm beige 600×300 mm porcelain tiles dry-laid in a straight grid from the entrance into the room; balanced cuts along the visible sides; a subtle orange laser line follows the doorway center into the room; metal transition profile placed at the threshold but not installed
Style/medium: premium photorealistic editorial construction photography, architectural and practical
Composition/framing: wide low eye-level view from the entrance, doorway frames the floor, tile grid is the main subject, no people required
Lighting/mood: soft neutral daylight from the room, clear and calm
Color palette: beige tile, warm gray substrate, off-white walls, restrained orange guide line
Materials/textures: matte porcelain, concrete substrate, brushed metal profile, small clean spacers
Constraints: straight plausible tile grid and perspective; dry layout only, no adhesive; clear visible transition line; no readable text, no numbers, no logos, no trademarks, no watermark
Avoid: warped tiles, impossible doorway, finished luxury furniture, excessive debris, dramatic lighting
```

### Подрезки и запас

```text
Use case: photorealistic-natural
Asset type: wide in-article educational construction photograph, intended crop 1200×800
Primary request: organized sorting of whole tiles, reusable cut pieces and true waste after planning a bathroom tile layout
Scene/backdrop: clean professional cutting table in a bright renovation workspace, neutral plaster wall behind
Subject: three visually distinct groups arranged from left to right without labels: unopened stack of full warm beige porcelain tiles; neat stack of large rectangular offcuts suitable for reuse with clean straight edges; small irregular fragments and one tile with a plumbing hole in a shallow waste tray; measuring tape, tile pencil and manual cutter nearby
Style/medium: premium photorealistic editorial construction still life, practical and believable
Composition/framing: wide top-down three-quarter view, three groups easy to compare, generous breathing room
Lighting/mood: soft neutral daylight, orderly professional workshop
Color palette: warm beige stone, light gray table, dark neutral tools, restrained orange cutter detail
Materials/textures: matte porcelain, clean cut edges, fine mineral texture, metal tools
Constraints: clearly distinguish reusable large cuts from unusable small fragments; no unsafe sharp clutter; no readable text, no numbers, no logos, no trademarks, no watermark
Avoid: random messy rubble, broken glass, dramatic shadows, product packaging, luxury decor
```

## Чек-лист перед публикацией

- [ ] Редактор подтвердил заголовок и интент.
- [x] Числовой пример повторно прогнан на актуальной версии инструмента.
- [ ] Изображения просмотрены в Ghost Preview на desktop и mobile.
- [x] CTA ведёт именно в генератор раскладки плитки.
- [ ] После добавления обратной перелинковки инструмент показывает эту статью.
- [x] Metadata уникальны относительно `/blog/vybor-plitki/` и страницы инструмента.
- [x] В статье нет неподтверждённых норм и универсальных обещаний.
