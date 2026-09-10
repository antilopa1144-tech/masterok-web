# Иллюстрации

Обложка создана встроенным imagegen, не CLI/API fallback. Выбранный результат конвертирован в WebP quality 85 без изменения композиции: `images/feature.webp`, 1536×1024, 252992 байта. Изображение просмотрено: направление досок едино, свет и фактура различимы. ИИ-происхождение указано в caption.

## Финальный промпт обложки

Use case: photorealistic-natural. Asset: landscape editorial cover for Russian home renovation article about choosing laminate plank direction. Photorealistic inviting modern rectangular living room, honey oak laminate boards running toward large window at far end, rich teal sofa along side wall, warm off-white walls, beautiful strong afternoon sunlight grazing clearly visible wood grain and subtle realistic staggered plank joints. Camera low-ish wide interior viewpoint with floor occupying lower two thirds, crisp architectural geometry, tasteful lived-in interior, saturated but natural colors, appealing premium magazine photograph. No rug obscuring floor, no people, no text, no labels, no logos, no watermark. Single coherent straight plank orientation, no herringbone. Landscape 1536 by 1024.

## Схема

`images/directions.svg` — авторская кодовая схема одной комнаты с неизменным окном. `images/directions.webp` — экспорт 1440×1050, quality 90, 37778 байт. Это не ИИ-рендер и не монтажная карта. Поворот досок на 90° детерминирован; рисунок стыков условный. Подпись прямо ограничивает назначение схемы.

## Визуалы переработки

`images/hallway.webp` создан встроенным imagegen: светлая длинная прихожая, доски медового дуба идут к дальнему окну, бирюзовая скамья и естественный свет. Результат конвертирован в 1536×1024 WebP quality 85; в статье это интерьерный пример, не правило укладки.

`images/viewpoints.svg` и `images/cuts-comparison.svg` — авторские условные схемы, экспортированные в WebP. Первая показывает разные точки, из которых читатель оценивает рисунок; вторая — как при повороте меняется ориентир рядов. Обе не являются картой раскроя и не содержат монтажных норм.

## 3D-иллюстрации вместо плоских схем

10 сентября старые внутренние WebP-схемы заменены в статье на `directions-3d.webp`, `viewpoints-3d.webp` и `cuts-comparison-3d.webp`. Все созданы встроенным imagegen и конвертированы в WebP quality 86. Общий подход промптов: «premium realistic 3D architectural visualization, editorial magazine quality; warm oak laminate; no text, labels, numbers, arrows, logos, watermarks; illustration rather than technical construction drawing». Первый визуал честно сравнивает один интерьер при двух поворотах досок; второй — точки взгляда; третий — два поворота покрытия в одной комнате.
