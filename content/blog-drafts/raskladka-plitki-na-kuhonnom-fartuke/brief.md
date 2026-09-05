# Редакционный пакет: кухонный фартук

Дата: 2026-09-05. Статус: опубликована в Ghost в 18:58 (UTC+12), основной сайт проверен после деплоя в 19:08.

## Интент и источники

Вторая из четырёх дополнительных статей. Отдельный интент: согласование раскладки с мебелью, розетками, открытыми краями; не дубль статьи о старте от центра/края и не общий выбор плитки.

Live Wordstat, Россия, все устройства, популярные запросы, 05.08.2026–03.09.2026: широкая фраза «раскладка плитки на фартук» — 209; «раскладка плитки кабанчик на фартуке» — 70; «вертикальная раскладка плитки на фартуке» — 65; «раскладка плитки на фартук онлайн» — 12. Вложенные строки не суммируются, это не уникальные люди и не прогноз трафика. Источник: [Яндекс Wordstat](https://wordstat.yandex.ru/?region=225&view=table&words=раскладка%20плитки%20на%20фартук). В Ghost просмотрен список всех 23 существующих публикаций: отдельного материала про фартук нет.

Первичные источники, проверены 2026-09-05:

- [KERAMA MARAZZI, размеры плитки и фартука](https://ekb.kerama-marazzi.com/blog/stati/podbiraem-razmer-plitki-chto-nuzhno-znat-chtoby-ne-oshibitsya/): зависимость контура от мебели, толщина облицовки. Конкретные заходы не перенесены как универсальная норма; статья сайта производителя не заменяет проект кухни.
- [Ceresit CS 25](https://www.ceresit.ru/ru/products/tiling/grouts-and-sealants/cs_25_silicoflexx): ограничения совместимости силикона. Не рекомендован автоматически для любой столешницы.
- `src/lib/tools/tile-layout.ts`: straight/offset-half/offset-third/diagonal, начало edge/center/custom; offsetY от верха; дверной проём от нижней границы, не розетки. Код не меняется.

## Проверка математики и границ

Все размеры учебные, рабочий габарит после вычета примыканий. Высота: 3×200+2×3=606; 600−(2×200+2×3)=194; 3×198+2×3=600. Ширина: 8×300+8×2+54=2470; 7×300+8×2+2×177=2470. Геометрия ряда не выдана за закупочную ведомость. Нет придуманного процента запаса, строительной нормы высоты фартука или инструкции электромонтажа.

Связи: статья → общий материал о старте раскладки, генератор плитки и калькулятор; обратная ссылка из страницы генератора после публикации. Основной canonical: https://getmasterok.ru/blog/raskladka-plitki-na-kuhonnom-fartuke/ .

## Изображения

Встроенный image_gen. Обложка: насыщенная изумрудная плитка и тёплое дерево, 1280×720. Две внутренние иллюстрации 1200×800: примерка отдельной рамки без электрических проводов; плитка и профиль для открытого края. Генерации помечены в подписях, не изображают реальный объект автора и не выданы за технический чертёж. Финальные WebP хранятся в `images/` рядом с текстом. Исходники сохранены в стандартной папке generated_images; WebP подготовлены через Sharp. Визуально проверены все три генерации.

### Промпт обложки

```text
Use case: photorealistic-natural. Asset type: vivid editorial hero for a Russian renovation article about kitchen backsplash tile layout. Primary request: a beautifully finished glossy emerald-green rectangular ceramic tile backsplash is the clear hero, between warm walnut base cabinets with a light stone countertop and simple warm-white upper cupboards. Straight-on architectural photography, horizontal rows with coherent half-tile stagger, realistic small grout lines, a single neatly installed white two-gang European outlet on the backsplash; no stove, no sink, no electrical work. Rich emerald reflections and warm sunlight, subtle handmade glaze texture, one terracotta bowl as a restrained warm accent. Focus on the backsplash geometry and its boundaries with furniture, clean premium but believable compact kitchen, engaging at thumbnail size. Wide landscape 16:9, no text, no logos, no watermark. Illustration of design intent, not a measured installation plan.
```

### Промпт rozetki.webp

```text
Use case: photorealistic-natural. Asset type: explanatory in-article photo for kitchen backsplash planning. Primary request: dry-layout of glossy emerald-green rectangular ceramic tiles on a clean warm wooden workbench, a separate white two-gang European socket cover frame resting flat over the tile layout as a planning template, a pencil and steel square nearby. No wired outlet, no cables, no electrical installation, no cutting tool. Medium overhead three-quarter closeup, crisp tile edges and tiny spacers, rich green glaze, warm wood contrast, strong clean natural sidelight, editorial renovation photography, vivid and believable. The removable empty cover frame and adjacent tile joints are the clear focal point. Horizontal 3:2. No text, no brands, no watermark. Conceptual illustration, not a technical dimensional drawing.
```

### Промпт torcevoj-profil.webp

```text
Use case: photorealistic-natural. Asset type: in-article editorial closeup of kitchen backsplash edge planning. Primary request: a small dry-laid sample of emerald-green rectangular ceramic tiles beside a brushed-aluminium straight tile edging profile on a clean wooden workbench. One full tile and two cleanly cut broad rectangular tile pieces, clearly visible ceramic cross-section and shiny green glaze; a carpenter square sits nearby. No installed wall, no power tools, no hands, no cables. Close three-quarter view with strong natural side lighting, rich emerald green, warm golden oak, crisp silver metal, realistic fine texture, editorial renovation photography. Focus on how a finishing profile relates to a tile edge, illustrative arrangement not an assembled technical detail. Landscape 3:2. No brands, no text, no watermark.
```

## Выпуск

До публикации: проверить изображения, текст, ссылки, CMS preview desktop/mobile, метаданные, существующие теги без служебного #Import. После публикации: основной URL, canonical, JSON-LD, sitemap, рубрика, картинки, мобильное переполнение, обратная ссылка. Индексация и рекомендации не подтверждаются одной публикацией.

Ghost ID: `6a9bbb09c4aacd28544c7350`. Публичный CMS URL: https://cms.getmasterok.ru/raskladka-plitki-na-kuhonnom-fartuke/ . Подтверждено сообщение Ghost «24 posts published», публикация только на сайте без рассылки, public. HTTP 200, три изображения доступны, ошибочных импортированных путей нет, подписи без повторов. Рубрика «Плитка» первая, служебный #Import снят только с этой статьи; существующие раскладка, #calc:plitka:poly, #icon:🧱 назначены через UI.

Предпросмотр Ghost: desktop 1280×720 и mobile 390×844 визуально проверены, ширина документа 390. Таблица в теме CMS прокручивается внутри блока; перенос на основном сайте проверить отдельно. Обложка 1280×720, alt и раскрытие использования ИИ заполнены. Canonical в метаданных поста задан на основной сайт.

Проверки до commit: 5 арифметических утверждений пройдены; lint чистый; полный Vitest — 3264 passed, 2 failed в существующих несвязанных проверках sewage metaDescription. В этой задаче расчётная логика и эти dirty-файлы не менялись. Релизный CI проверяется отдельно на чистом коммите.

Контент, три изображения и обратная ссылка закоммичены и отправлены в main: `8e9013f`. [CI 33951336284](https://github.com/antilopa1144-tech/masterok-web/actions/runs/33951336284): Test, Lint и Build — success. Timeweb завершил next build 19:03:33, postbuild 19:03:34; публикация образа проверяется отдельно. Формулы и сгенерированные parity-файлы в коммит не включены.

### Проверка production

Timeweb для `8e9013f`: Container started 19:07:05, healthy и Deploy succeeded 19:07:15. Основной URL https://getmasterok.ru/blog/raskladka-plitki-na-kuhonnom-fartuke/ — HTTP 200 и правильный заголовок, единственный основной canonical, BlogPosting + BreadcrumbList, без noindex. URL присутствует в `/sitemap/4.xml` и `/rss.xml`. Обратная ссылка из генератора есть; статья ссылается на генератор, калькулятор и общий материал о старте раскладки. Рубрика «Плитка» и значок 🧱 видны.

Desktop 1440×1000 и mobile 390×844 проверены визуально на основном сайте. Обложка видна; внутренние картинки загружены после прокрутки; таблица переносит текст и целиком помещается на мобильном экране, белый текст заголовков читается. document.scrollWidth = innerWidth = 390. Evidence: `output/playwright/kitchen-release-20260905/desktop.png`, `mobile.png`, `table-mobile.png`, `production-check.json`. Итог 14 публичных проверок — passed. Начальный HTTP 200 со страницей «Статья не найдена» до развёртывания не считался успешной публикацией.

Индексация в поиске, показы Discover и органический трафик ещё не измерены. `max-image-preview:large`, отмеченный после предыдущей статьи, остаётся отдельным техническим пунктом: глобальная metadata в этой контентной задаче не менялась.
