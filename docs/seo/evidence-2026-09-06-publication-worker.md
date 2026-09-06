# Приёмка B: очередь публикации

Обновление 2026-09-06 03:07 UTC: две настоящие статьи прошли public gate и получили IndexNow HTTP 200, обе задачи `done`. Контроль первой production-публикации закрыт. [Редакционная приёмка с точными временами](evidence-2026-09-06-editorial-publication.md). Ниже сохранена хронология первоначальной установки; старый webhook не отключён.

Дата: 06.09.2026. Статус: **код `c13bba1044be3f2081ad11073aef29e19c0b3b71` выпущен на production; VPS worker включён в active, без повторной отправки истории**. [CI 34002954514](https://github.com/antilopa1144-tech/masterok-web/actions/runs/34002954514): lint, web/Python tests и build — success.

## Что проверено

- Python: 37 тестов состояния, проверки public HTML/XML/обложки и обработки отправок; все прошли. Включены restart, baseline без массовой отправки, дубли, последовательные rename, republish, неполный/нулевой snapshot, независимый lookup исчезнувшего id, stale HTML/RSS, robots Google/Яндекса, 429/Retry-After, блокировка 403 и observe без расхода retry-бюджета.
- TypeScript↔Python: общий SHA-256 golden vector с русским текстом/emoji; HTML и RSS используют одну исходную редакцию.
- `npm run lint` — зелёный. Полный тест корневого dirty worktree: 3298 passed, 2 ранее существовавших sewage SEO failed. Эти посторонние изменения в релиз не включены.
- Полный тест изолированного release-снимка: **3314/3314**. Production build с локальной тестовой CMS успешен.
- Production-mode lifecycle: новая статья после build **57 с**, правка **62 с**, снятие **61 с**, закрытая инвалидация **0 с**. Проверены совпадающие метки HTML/RSS, canonical, large preview, полные даты, индексы/теги/sitemap, 404 и отсутствие ложного пустого успеха при сбое CMS. Это локальные измерения технической свежести, не срок индексации.
- На Ghost VPS: отдельный пользователь и SQLite, config 0640, постоянный каталог 0700, read-only исходники, ограниченные RAM/CPU, два systemd timer. Установленная версия Ghost 6.26.0; ресурсы проверены, новые порты не открыты. База/контент Ghost, приложение ParaPlanet, webhook-rebuild и счётчик не менялись.
- Первый реальный snapshot в observe: **24 статьи, jobs={}, healthy=true**, 0 отправок IndexNow. Ключ существующей Content-интеграции использован только на сервере; конфигурация/значения в Git и журналы не выводились.

## Что меняется

`ops/publication-worker/` — автономный poller/outbox/readiness/отправка + installer/systemd/tests/runbook. `blog-source-revision.ts`, `ghost.ts`, `blog.ts`, страница статьи и RSS — общий маркер исходной редакции. `package.json` — снят автоматический postbuild-пинг IndexNow; старый скрипт оставлен только явной ручной командой. CI запускает новые Python-тесты. Сценарий Next lifecycle расширен проверкой маркеров.

## Границы приёмки

После выкатки выполнен полный read-only gate на двух настоящих статьях: `raskladka-plitki-na-kuhonnom-fartuke` (WebP 1280×720) и `otkuda-nachinat-raskladku-plitki` (WebP 1200×630). Обе HTTP 200; исходный digest CMS точно совпал с HTML/RSS, даты BlogPosting/sitemap/RSS согласованы, canonical/robots/ссылки прошли. Существующий IndexNow proof-файл: HTTP 200, содержимое совпадает, значение не выводилось. Проверки без JS не увеличивали счётчик просмотров.

В 01:13 UTC / 13:13 Камчатка включён active. Подтверждены `mode=active`, `revalidation_configured=false`, `jobs={}`, snapshot 24 и `healthy=true`; оба timer включены. Перезапуск worker/SQLite и отдельный health запуск успешны; Ghost, views и старый webhook остаются active. Первая настоящая публикация/правка редактора должна дать сохранённое `done` с HTTP-ответом IndexNow; такого production-события пока не наблюдали. Искусственные тестовые статьи и исторические повторные отправки не создавались. HTTP 200/202 означает приём уведомления, не индексацию. [IndexNow](https://www.indexnow.org/documentation).

Старый rebuild-webhook сохраняется до первого реального контрольного события. Подписанный webhook не открываем: первичный путь B — полная сверка CMS каждую минуту. Внешние оповещения, off-host backup очереди, API GSC/Яндекс.Вебмастер не настроены. Health-watchdog независим от poller, но пока пишет только в systemd/journal. Не выдавать это за завершённое наблюдение поиска/Discover: это пакет C.

Отдельное замечание вне diff B: Timeweb `npm install` показал 13 dependency advisories (включая 1 critical). Пакет B не добавлял npm-зависимостей и не менял lockfile; затронутый пакет, runtime-эксплуатируемость и безопасное обновление ещё не исследованы. Не запускать `npm audit fix --force` автоматически; требуется отдельная адресная проверка.

Операционные команды, ограничения и безопасный откат: [README worker](../../ops/publication-worker/README.md). Изолированные локальные артефакты в `output/publication-a-smoke-20260906/` в Git не включены; env-like файл внутри — tracked template `.env.local.example`, не конфигурация с секретами.
