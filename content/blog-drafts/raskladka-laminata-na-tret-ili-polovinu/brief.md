# Редакционный пакет: раскладка ламината

Статус: первая из четырёх дополнительных статей опубликована в Ghost 2026-09-05. Post ID: `6a9bb274c4aacd28544c7331`. Основной URL: `https://getmasterok.ru/blog/raskladka-laminata-na-tret-ili-polovinu/`. Финальную проверку production выполнять после пересборки.

Production-проверка 2026-09-05 18:26 (Asia/Kamchatka): URL отвечает HTTP 200, canonical совпадает с основным адресом, BlogPosting и BreadcrumbList присутствуют, статья включена в `/sitemap/4.xml`, ссылки статья → инструмент/калькулятор и инструмент → статья подтверждены. Desktop 1440×1000 и mobile 390×844 просмотрены; горизонтального переполнения страницы нет, обе внутренние иллюстрации загружаются, таблица читается. CI коммита `40b023b` и деплой Timeweb успешны.

После этой проверки обнаружен и исправлен порядок тегов: служебный `#Import` удалён только из этой статьи, «Полы» теперь первый тег, добавлен существующий `#icon:🪵`. Изменение метаданных в Ghost сохранено; повторный production-чек категории выполняется после webhook-сборки. В следующих пакетах служебный тег удалять до публикации.

Редакторская проверка: Ghost Preview desktop и mobile пройдены, 1253 слова, одна таблица, обложка и две внутренние иллюстрации. В HTML-карточке таблицы явно задана контрастная шапка `background:#17313a;color:#ffffff`; на узком экране таблица прокручивается внутри блока. Исправлены пути изображений после Universal Import, обложка загружена штатным загрузчиком. Выбраны существующие теги «Полы», «ламинат», «раскладка», `#calc:laminat:poly`. Canonical задан вручную на основной сайт. Публикация только на сайте, без email-рассылки.

Локальные итоговые изображения: `images/feature.webp` (1200×630), `images/proverka-stykov.webp` и `images/obrezki.webp` (1200×800). Исходные PNG сохранены генератором, WebP скопированы и оптимизированы для проекта.

Релизные проверки: lint без ошибок; полный локальный test — 3264 passed, два существующих сбоя метаданных sewage в посторонних dirty-изменениях. Они не входят в commit статьи. Шесть арифметических утверждений примеров проверены отдельно через Node assert. Обратная ссылка добавлена в серверную страницу генератора без изменения формул и полей.

Интент: сравнить смещение на 1/3 и 1/2, а не повторить общий расчёт площади пола. В карте `docs/seo/semantic-map-2026-09-05.md` есть наблюдения Wordstat по сравнению и обоим режимам; это исторический срез указанного в карте окна, не прогноз трафика.

Источники: https://quick-step.ru/laminate/installation/ (проверен 2026-09-05); `src/lib/tools/laminate-layout.ts` (режимы deck-third/deck-half, разграничение деталей и покупки). Существующая статья `/blog/kak-rasschitat-laminat-na-komnatu/` прочитана: она обзорная, отдельный сравнительный интент не раскрыт. Её спорные универсальные утверждения не перенесены.

Проверка чисел: 1200/3=400; 1200/2=600; 4300-3*1200=700; 1200-700=500 до учёта пропила; ceil(73/8)=10 пачек, 80 досок, остаток7. Примеры не выданы за нормы и не соединены в один фиктивный объект.

Перелинковка: статья → генератор и калькулятор ламината, общий материал о закупке; обратная ссылка из генератора после публикации. Не использовать #howto.

Визуальная задача пользователя: более сочные и кликабельные изображения. Реализация: насыщенный тёплый дуб, глубокий бирюзовый контраст, направленный свет, крупный предмет. Кликабельность — дизайнерская гипотеза, CTR ещё не измерен. Обложка не обещает точный шаг разбежки. Две внутренние иллюстрации объясняют стыки и остатки; все изображения обозначены как ИИ.

Генерация: встроенный image_gen, не CLI/API. Промпты:

## feature

```text
Use case: photorealistic-natural. Asset type: striking wide editorial cover for a Russian home-renovation blog, landscape 16:9. Primary request: beautifully detailed honey-oak laminate floor is the hero, photographed from a low three-quarter angle in a contemporary living room. Clear straight parallel planks with believable staggered end joints, rich natural wood grain. A deep petrol-teal wall and a small burnt-orange armchair at the far edge provide saturated contrast; warm directional afternoon window light cuts across the foreground floor, clean bright highlights and deep but open shadows. Floor takes 75% of frame, calm background, crisp main subject readable at thumbnail size. Polished architectural editorial photo, not beige washed-out stock, vivid but credible colors, no excessive HDR. No people, no text, no labels, no logos, no watermark. Not a technical measurement diagram; no promise of a specific exact stagger fraction.
```

## laminateJoints

```text
Use case: photorealistic-natural. Asset type: landscape in-article editorial image for laminate floor planning. Primary request: close-up of warm honey-oak laminate planks dry-arranged in staggered parallel rows on a clean renovation floor, a gloved hand holding a short steel ruler near a clearly visible staggered end joint. Only one hand, no cutting tools in use. Slight overhead three-quarter view, crisp realistic click-lock plank edges on the unassembled edge, rich wood texture and straight joints. Soft teal background detail, small orange carpenter pencil as restrained accent. Strong clear daylight, vivid warm wood and cool teal contrast, premium informative construction photography, not desaturated stock. It is an illustrative planning scene, not an exact numeric diagram. No text, no numbers visible on ruler, no logos, no watermark. 3:2 landscape.
```

## laminateOffcuts

```text
Use case: photorealistic-natural. Asset type: landscape editorial photo inside a renovation guide about laminate waste. Primary request: three distinct sizes of honey-oak laminate offcuts neatly arranged on a deep petrol-teal workbench, a full length plank behind them and a small plain cardboard pack of matching planks at the far end. Close three-quarter overhead view, show the laminated wood surface and brown HDF cut edge, realistic rectangular geometry and subtle fine sawdust only. One short scrap and two longer reusable-looking pieces clearly distinguished by size, no printed labels. Rich saturated teal and golden oak, strong directional studio daylight, crisp texture, lively high-end construction editorial composition readable at small sizes. No people, no blade or powered tool in use, no text, no brands, no watermark. 3:2 landscape.
```
