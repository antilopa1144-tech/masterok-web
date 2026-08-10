# Production incident playbook

## Быстрая классификация

| Симптом | Сначала проверить |
|---|---|
| Весь сайт недоступен | Timeweb status/logs, process start, регион и анти-DDoS |
| Один маршрут даёт 404 | Route params, generate/static behavior, существование сущности |
| Блог пуст | Ghost response, credentials presence, published count, error propagation |
| Build падает | Первый meaningful error, prebuild/postbuild, внешние fetch, env presence |
| API 500 | Route logs, upstream status, timeout, error mapping |
| Работает из РФ, но не из VPN | Региональную фильтрацию и anti-DDoS до вывода «сайт упал» |
| Старые данные | Cache, revalidation, deploy revision, upstream freshness |

## Порядок проверки

1. Подтвердить точный URL и HTTP/render результат.
2. Сравнить соседний здоровый маршрут.
3. Найти route entry point и data source.
4. Проверить обработку success, not-found, empty и upstream-error раздельно.
5. Сопоставить production revision с ожидаемым commit.
6. Проверить platform/CMS logs без вывода секретов.
7. Сформулировать минимальную воспроизводимую причину.

## Ghost-контракт

- `fetchAllPosts`: missing config, API failure и ноль опубликованных записей являются ошибкой deployment/revalidation.
- `fetchPostBySlug`: нормальный отсутствующий slug возвращает not-found; configuration и CMS errors должны распространяться.
- Не заменять ошибки `[]` или `undefined`, если это публикует ложное пустое состояние.

## Формат вывода

- Симптом и масштаб.
- Evidence по слоям.
- Root cause и уверенность.
- Временное безопасное восстановление.
- Постоянная минимальная правка.
- Regression-проверка и live-проверка.
