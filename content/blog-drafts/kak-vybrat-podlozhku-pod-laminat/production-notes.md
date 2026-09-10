# Выпуск: выбор подложки под ламинат

Опубликовано 2026-09-10 в 00:26:06 UTC через существующую интеграцию Ghost; без рассылки. Ghost post ID: `6aa1f80fc4aacd28544c7391`.

Основной URL: https://getmasterok.ru/blog/kak-vybrat-podlozhku-pod-laminat/

## Редакционная проверка

Перед созданием проверены 26 опубликованных материалов Ghost и пустой список черновиков. Отдельного материала о выборе подложки не было. Статья отвечает на выбор совместимости и покупку, не дублирует расчёт досок и рисунок раскладки.

Первичные источники прочитаны 10 сентября; ссылки стоят у соответствующих утверждений в `article.md`: FAQ Quick-Step RU; FAQ EGGER, Underlay materials; Quick-Step об отоплении; технический лист Silent Walk (12/2023); релевантные разделы бюллетеня EPLF (12/2022). Числовые технические допуски производителей не обобщались и не переносились в статью. Важны инструкции конкретного изделия, не универсальная «лучшая» толщина.

Проверен учебный пример: 20 × 1,05 = 21 м²; ceil(21/10) = 3 упаковки, 30 − 21 = 9 м²; 21/1,2 = 17,5 пог. м; при шаге 1 м покупка 18 пог. м = 21,6 м², остаток 0,6 м². 5% явно названы допущением, расчёт по площади — не картой раскроя.

## Иллюстрации

Три изображения созданы встроенным генератором изображений, затем закодированы в WebP quality 83 без изменения размера: 1536×1024 каждое. `feature.webp` — 187938 байт, `materials.webp` — 278652 байта, `base-check.webp` — 183332 байта. Alt и подписи заданы; внутренние иллюстрации явно помечены как ИИ. Обложка также имеет AI-caption в Ghost; основной шаблон её подпись не выводит.

Краткая запись использованных промптов (для воспроизведения художественного направления, не побайтовый лог):

- Cover, photorealistic editorial 1536×1024: honey-oak laminate, sunlit room, rich teal wall, blurred terracotta chair; low-angle oak plank sample beside one thin graphite underlay sheet with a rolled end. Separate samples, not installed layers. Vivid natural light and textures, central crop-safe composition; no people, logos, text or watermarks.
- Materials, overhead editorial 1536×1024: three separate samples side by side, not stacked — cork, dense grey underlay, pale green rigid fibre panel. Oak plank and plain instruction booklet, warm oak worktable, teal background, natural light; no hands, labels, logos or fake certifications.
- Base check, photorealistic editorial 1536×1024: straightedge and feeler gauges on clean dry grey screed in an unfinished sunlit room; teal wall and oak plank sample. Inspecting the base before underlay, no installed stack, people, text or branding.

## Проверка доставки

Ghost draft просмотрен до публикации. Основной сайт после публикации: HTTP 200; canonical указывает на основной URL; `BlogPosting` и `BreadcrumbList`; robots `index, follow, max-image-preview:large`. Все три изображения загрузились. Ссылка на существующую статью расчёта ламината проверена.

Статья появилась в `/sitemap/4.xml` и `/rss.xml`, оба HTTP 200. Сразу после публикации основной URL кратковременно отдавал 404, RSS не содержал статью; повторные проверки после обновления кеша успешны, без ручного деплоя или сброса кеша.

Просмотрены desktop и mobile 390×844 основного сайта (тёмная тема), включая таблицу: ширина документа 384 при viewport 390, таблица имеет собственный горизонтальный скролл 620. Это выборочная визуальная проверка, не всех устройств. Ghost-preview также проверен в светлом оформлении.

Обратная ссылка добавлена в `laminateDef.seoContent.descriptionHtml` и существующий regression-тест. Полный test: 208 файлов, 3348 тестов успешно; lint без ошибок. Формулы, дефолты и Flutter не менялись. Production этой обратной ссылки зависит от следующего git-деплоя и в данной записи ещё не подтверждён.

## Ограничения и следующий шаг

HTTP/RSS/sitemap не подтверждают индексацию, отправку IndexNow, обработку очереди мониторинга или Discover. Эти статусы в данном пакете не проверялись. Метрики оценивать по сопоставимым окнам после накопления данных.

При проверке соседней старой статьи `/blog/kak-rasschitat-laminat-na-komnatu/` замечены слишком широкие утверждения о толщине, нормах и промежуточном округлении площади. Не исправлялись молча в этом пакете: следующий ограниченный редакционный пакет — проверить и уточнить эту статью по первичным документам, сохранив URL и изображения.
