# Расход затирки: редакционный пакет

Дата: 2026-09-06. Статус: опубликована в Ghost 02:54:48 UTC; основной сайт проверен. [Приёмка](../../../docs/seo/evidence-2026-09-06-editorial-publication.md).

Интент: объяснить изменение расхода при смене формата и шва, дать прозрачное сравнение и покупку упаковок. Не заменять калькулятор и не представлять условную таблицу как паспортную по маркам. В авторизованном Ghost проверены все24 публикации: отдельной статьи о затирке нет. Существующие статьи о выборе плитки и клее имеют другие основные интенты.

## Спрос

Live Яндекс Wordstat 2026-09-06, Россия, все устройства, окно05.08.2026–03.09.2026: широкая фраза «расход затирки»6570; «расход затирки для плитки»1937; «расход затирки на м2»1256; «расход затирки на плитку600х600»121; «расход затирки на плитку300х300»78; «расход затирки на плитку1200х600»75. Вложенные строки не суммируются, запросы не равны людям или прогнозу трафика. Источник: https://wordstat.yandex.ru/?region=225&view=table&words=расход%20затирки .

## Источники и границы

- Первичный источник по подготовке швов и опытному участку: https://www.litokol-market.ru/catalog/zatirochnye-smesi/litochrom-1-6-evo/ — официальный магазин производителя, прочитан2026-09-06. Не переносим его продуктовый расход в условную таблицу.
- `engine/tile-grout.ts`, `src/lib/calculators/formulas/tile-grout.ts`: текущие формулы и ограничения формы. Только чтение, без изменения расчётов. Глубина авто4/6/8/10, целый шов1–20, тип меняет условную плотность, запас×1,10 доaccuracy/scenario.
- Формула таблицы — собственная геометрическая демонстрация: `(1000/A+1000/B) * (W/1000) * (D/1000) *1000*K`, гдеD=6мм,K=1,6кг/л условны; без запаса. Приближение сетки явно раскрыто. Это не таблица фактического расхода сухого порошка конкретной марки.
- PDF Mapei были найдены поиском, но прямое получение вернуло403. Их не выдаём за полностью прочитанные и не используем как источник чисел статьи. Ceresit в финальный текст не включён из-за нестабильного доступа.

## Приёмка

Проверены 12 ячеек таблицы, оба примера покупки, ссылки, три изображения, desktop/mobile, public canonical/BlogPosting/RSS/sitemap. Feature 1279×720, внутренние 1200×800. Подписи ИИ присутствуют. Public tag «Плитка» первым; internal #calc:zatirka:poly и #icon:🧱, без #howto и #Import. Публикация только на сайте, без email. На мобильной ширине 390 px таблица 620 px прокручивается внутри блока 352 px, переполнения страницы нет.

До публикации: VPS worker --status/--health healthy, 24 posts, jobs {}; записано 2026-09-06. После: новая revision подтверждена, public gate пройден, IndexNow HTTP 200 и job done в 03:00:06 UTC. Это не доказательство индексации или Discover. Проверки браузером могут добавлять наши собственные просмотры и не являются органическим трафиком.

## Визуальные промпты

Встроенный image_gen, не API/CLI. Насыщенная бирюза, тёплая контрастная затирка, направленный свет; кликабельность — гипотеза, CTR не измерен.

- feature: photorealistic-natural, wide16:9 editorial bathroom cover, peacock-teal glazed tile wall80%frame, straight warm ivory grout grid, copper faucet and terracotta edge accents, rich believable colors, no people/text/brands, not dimensional diagram.
- formaty-plitki: photorealistic-natural, two sample tile boards small vs large teal squares on charcoal workbench, visibly more grout lines in small format, warm ivory joints, orange pencil, landscape3:2, no exact dimensions/text/brands.
- upakovki-zatirki: photorealistic-natural, two unbranded closed white tubs, terracotta-handled grout float and three ivory samples on teal bench, small dry powder bowl, landscape3:2, no text/brands or implied exact package mass.
