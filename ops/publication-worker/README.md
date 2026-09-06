# Очередь публикации Ghost

Python 3.12 + SQLite, без pip-пакетов. Живёт на существующем Ghost VPS, не в эфемерном контейнере Next. Не открывает портов, не выполняет JavaScript аналитики и не меняет контент Ghost.

## Контракт

Каждую минуту после окончания предыдущего прохода читается полная опубликованная выборка Content API. Первый успешный снимок — только baseline: старые статьи не отправляются массово. Далее сохраняются публикация, изменение, исчезновение и смена slug. Ошибочная/пустая/неполная выборка не применяется; отсутствующие известные id дополнительно проверяются отдельным запросом Content API. Публичное удаление подтверждается отдельно.

Редакция — SHA-256 нормализованных полей Ghost, единый golden vector с `src/lib/blog-source-revision.test.ts`. Next добавляет её в HTML meta и RSS extension. Это метка исходной CMS-редакции до существующих content/image overrides, не хеш каждого байта итогового HTML. Изменения самого кода overrides требуют обычного Git-релиза и его проверки, не являются событиями CMS.

Перед IndexNow: настоящий 200 без редиректа; canonical; отсутствие noindex; H1/текст; точная редакция HTML и RSS; BlogPosting/dates; ссылка из блога; sitemap/lastmod; доступная обложка с шириной не меньше 1200 px. Размер определяется по заголовку PNG/JPEG/WebP, это не полная визуальная оценка/декодирование изображения. Порог обложки — наш редакционный gate, не обещание рекомендаций. Для снятия: 404/410 и отсутствие ссылки в блоге, RSS и sitemap.

Уведомления отправляются по одному canonical URL в IndexNow. 200/202 — принятие запроса, **не обход/индексация/рекомендации**. Доставка at-least-once: если сервер принял запрос, но ответ потерялся до записи SQLite, повтор возможен и безопасен. Дубли завершённой редакции и устаревшие задания не отправляются. Восемь неудач либо 400/401/403/422 переводят задание в blocked; 429 учитывает Retry-After. Ошибки самой CMS не расходуют попытки отдельных статей.

`observe` сохраняет очередь и проверяет страницы, но не инвалидирует Next и не отправляет IndexNow. `active` включает отправку. В обоих режимах изменения контента выполняет только редактор. Опциональный `revalidate_secret` позволяет ускорить обновление; проверенный TTL-путь работает без него.

## Установка

Пакет устанавливает оператор после тестов и проверки VPS. `bootstrap-config.cjs --inspect` выводит только имена/ID существующих Content-интеграций. Ключ выбранной интеграции читается на сервере из Ghost DB, без DB-записей, и сохраняется исключительно в `/etc/masterok-publication/config.json` (root:masterok-publication, 0640). Пользователь службы не получает доступ к конфигурации Ghost/MySQL. IndexNow proof берётся из уже существующего публичного файла сайта; доставляется в staging как `indexnow-public-key.txt`, в Git не добавляется.

```sh
python3 /tmp/REVIEWED-PACKAGE/install.py --integration EXISTING_CONTENT_INTEGRATION_ID
runuser -u masterok-publication -- python3 /opt/masterok-publication/worker.py --status
runuser -u masterok-publication -- python3 /opt/masterok-publication/worker.py --verify EXISTING_PUBLISHED_SLUG
# Только после проверки выкатки меток HTML/RSS:
python3 /tmp/REVIEWED-PACKAGE/install.py --integration EXISTING_CONTENT_INTEGRATION_ID --activate
```

`--verify` не создаёт события и не отправляет URL. Установка сохраняет существующую конфигурацию/очередь и затрагивает только собственные unit-файлы/пользователя/каталоги. Bootstrap не перезаписывает существующий config. Исходники root-owned в `/opt/masterok-publication`; база/WAL и lock в `/var/lib/masterok-publication` (0700). Служба ограничена 128 MB RAM и 20% CPU, без root/новых сетевых listeners. Два timer включены после перезагрузки.

## Эксплуатация и границы

```sh
systemctl list-timers masterok-publication.timer masterok-publication-health.timer
journalctl -u masterok-publication.service -n 20 --no-pager
runuser -u masterok-publication -- python3 /opt/masterok-publication/worker.py --health
# После устранения причины blocked — осознанная повторная постановка:
runuser -u masterok-publication -- python3 /opt/masterok-publication/worker.py --retry-blocked
```

Независимый health timer каждые 10 минут проверяет возраст snapshot и blocked. Неуспех виден в systemd/journal. Внешний канал оповещения **не подключён**: journal не выдаём за уведомление владельцу. Для резервирования SQLite используйте online backup API либо согласованный останов службы; нельзя копировать только основной файл при активном WAL. Отдельный off-host backup/retention пока не настроен. Перезапуск процесса и ОС не очищает очередь.

Существующий rebuild-webhook пока сохранён как прежний резерв. Его отключение — отдельная контролируемая точка после наблюдения первой реальной редакционной публикации. Подписанные Ghost webhooks можно добавить позже для меньшей задержки; сейчас надёжность обеспечивает регулярная сверка, новый публичный receiver не нужен. Секрет Next опционален и на первом запуске не настроен.

Google Indexing API для обычных статей не вызывается. Google получает доступные страницы, ссылки, RSS и sitemap; API-наблюдение GSC/Яндекс.Вебмастер и внешние оповещения — следующий пакет C. Смена slug регистрирует старый/новый URL, но не придумывает 301 и не переносит счётчик просмотров: это отдельное редакционное решение.

Откат: `systemctl disable --now masterok-publication.timer masterok-publication-health.timer`, затем `systemctl stop masterok-publication.service`. Сохранить config и SQLite для восстановления; Ghost/счётчик/старый webhook не затрагивать. Возврат web-коммита делается отдельным Git revert, не сбросом dirty worktree.

Тесты: `python3 -m unittest discover -s ops/publication-worker -p 'test_*.py' -v`.
