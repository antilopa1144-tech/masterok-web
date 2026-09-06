# Монитор Google Search Console

Отдельная ежедневная задача на существующем Ghost VPS. Читает публичную карту `/sitemap/4.xml`, проверяет до 100 canonical URL статей через URL Inspection и получает Search Analytics `web`/`discover` для раздела `/blog/` за семь завершённых дней с задержкой три дня. Календарь данных — America/Los_Angeles. `dataState=final` исключает незавершённые данные; API может вернуть только часть строк. При достижении 25 000 строк отчёт помечается `truncated`, полная пагинация пока не реализована.

Официальный `google-auth[requests]` получает краткоживущий access token с единственным scope `webmasters.readonly`. Сервисный аккаунт имеет роль **Restricted** только в property `https://getmasterok.ru/`, без Cloud IAM roles. URL Inspection читает известную Google версию, не проводит live test и не запрашивает индексацию. Код не содержит Indexing API, отправки sitemap, записи в Ghost, чтения его ключей или новых публичных портов.

`firstObservedIndexed` — дата нашего первого наблюдения `verdict=PASS`, а не реальное время первой индексации. `no_rows` не означает доказанное отсутствие всех показов Discover. API-ошибки сохраняются по каждому endpoint; успешные результаты не теряются при ошибке другого отчёта. Повреждённый предыдущий снимок не обнуляет историю молча. Фатальная ошибка сохраняется отдельно; `--health` проверяет её, неполный отчёт и возраст снимка более 36 часов. Внешний канал уведомлений пока отсутствует: журнал и exit status не выдаём за оповещение владельца.

## Установка

Нужен Python 3.12 с venv. Из проверенной staging-папки выполнить `sh install.sh` от root: создаётся пользователь `masterok-search`, root-owned код и venv в `/opt/masterok-search`, каталог ключа root:masterok-search 0750 и ключ 0640, данные `/var/lib/masterok-search` 0700. Установщик сохраняет существующий ключ/снимки, запускает один ручной проход, но не включает таймер. Не запускать установщик из `/opt/masterok-search`: staging и целевые исходники должны различаться.

Приватный Google-ключ создаётся **на VPS** скриптом `scripts/bootstrap-search-key.py`; скрипт отказывается перезаписывать существующий ключ. В Google Cloud загружается только `google-public-certificate.pem`. Закрытый JSON не покидает сервер, не попадает в Git и журналы. Сертификат действителен 365 дней; перед истечением требуется контролируемая замена. Текущий срок: 6 сентября 2027. Полная автоматическая ротация ещё не настроена.

После первого успешного отчёта:

```sh
runuser -u masterok-search -- /opt/masterok-search/venv/bin/python /opt/masterok-search/monitor.py --health
systemctl enable --now masterok-search-monitor.timer
systemctl list-timers masterok-search-monitor.timer
```

Расписание: ежедневно 06:20 UTC + случайная задержка до пяти минут, `Persistent=true`. История: до 30 атомарных JSON-снимков и latest; off-host backup пока нет. Статус читается той же командой с `--status` без сети. Откат: отключить только `masterok-search-monitor.timer` и остановить одноимённый service; ключ и историю сохранять.

Локальные тесты: `python -m unittest discover -s ops/search-monitor -p 'test_*.py' -v`.

Первичные источники: [авторизация Search Console](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing), [URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect), [Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [загрузка публичного сертификата](https://docs.cloud.google.com/iam/docs/keys-upload).

## Яндекс.Вебмастер

`yandex_monitor.py` — отдельный CLI и timer на 06:35 UTC + до пяти минут jitter. Читает только `GET /user`, `/hosts`, `/summary` и `/search-urls/in-search/samples`. Сайт выбирается по точному `ascii_host_url=https://getmasterok.ru/`; код не регистрирует сайты, не отправляет переобход и не управляет ими. Scope `webmaster:verify` включает дополнительное право добавлять сайты: владелец отдельно согласовал это ограничение API, но монитор использует только GET.

Токен хранится отдельно в `/etc/masterok-search/yandex-webmaster-token.json` root:masterok-search 0640, отчёты — `/var/lib/masterok-search/yandex` 0700. Один проход: summary и до 500 примеров страниц в поиске, ограниченная пагинация. Это примеры, не эквивалент URL Inspection: отсутствие URL в выборке нельзя объявлять отсутствием индексации. Summary и samples могут обновляться неодновременно и давать разные суммарные количества. Отчёта рекомендаций/Дзена этот API не предоставляет в используемых методах.

Установщик запускает Яндекс вручную только при наличии токена. После успешного прохода включить `masterok-yandex-monitor.timer` отдельно. `yandex_monitor.py --status` и `--health` работают без сети; health также предупреждает за 30 дней до истечения токена. Срок выданного токена — 180 дней; автоматического продления нет.

Для разового безопасного импорта доступны `scripts/import-yandex-token-vps.py` и `scripts/import-yandex-token-local.cjs`. Первый размещается на VPS в `/tmp/masterok-import-yandex-token.py`; второй открывает одноразовую форму только на loopback `127.0.0.1:43127`, проверяет Origin/nonce/размер, передаёт токен SSH stdin, не хранит его локально и прекращает принимать запросы после импорта. Перед повторным импортом/ротацией согласовать замену: VPS-скрипт не перезаписывает существующий файл. Секреты не вставлять в команды, Git или чат.

Первичные источники: [авторизация](https://yandex.ru/dev/webmaster/doc/ru/tasks/how-to-get-oauth), [сводка сайта](https://yandex.ru/dev/webmaster/doc/ru/reference/host-id-summary), [примеры страниц в поиске](https://yandex.ru/dev/webmaster/doc/ru/reference/hosts-indexing-insearch-samples).
