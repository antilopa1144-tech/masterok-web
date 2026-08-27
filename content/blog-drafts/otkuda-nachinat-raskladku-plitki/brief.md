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

Оба изображения созданы встроенным генератором изображений OpenAI и сохранены как проектные WebP.

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

## Чек-лист перед публикацией

- [ ] Редактор подтвердил заголовок и интент.
- [ ] Числовой пример повторно прогнан на актуальной версии инструмента.
- [ ] Изображения просмотрены в Ghost Preview на desktop и mobile.
- [ ] CTA ведёт именно в генератор раскладки плитки.
- [ ] После добавления обратной перелинковки инструмент показывает эту статью.
- [ ] Metadata уникальны относительно `/blog/vybor-plitki/` и страницы инструмента.
- [ ] В статье нет неподтверждённых норм и универсальных обещаний.
