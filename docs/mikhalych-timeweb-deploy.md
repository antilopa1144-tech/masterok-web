# Михалыч-агент: деплой на Timeweb Cloud

Инструкция для Backend App (Node.js) на [Timeweb Cloud](https://timeweb.cloud) — тот же способ, что и основной сайт Мастерок (`next start`).

---

## 1. Что должно быть на сервере

| Переменная | Обязательно | Назначение |
|------------|-------------|------------|
| `DEEPSEEK_API_KEY` | **Да** | [DeepSeek Platform](https://platform.deepseek.com/api_keys) — агент работает только с прямым API |
| `NEXT_PUBLIC_SITE_URL` | Да | `https://getmasterok.ru` — ссылки на калькуляторы в ответах |
| `MIKHALYCH_AGENT_ENABLED` | Нет | По умолчанию `true`. `false` — откат на старый линейный чат |
| `MIKHALYCH_MODEL` | Нет | По умолчанию `deepseek-v4-pro` |
| `MIKHALYCH_AGENT_MAX_TOOL_ROUNDS` | Нет | Лимит циклов tools (дефолт `8`) |
| `SERPER_API_KEY` | Нет | [serper.dev](https://serper.dev) — `web_search` (цены, нормы в сети) |
| `JINA_API_KEY` | Нет | [jina.ai/reader](https://jina.ai/reader) — стабильнее `fetch_url` |
| `LANGFUSE_PUBLIC_KEY` | Нет | Трейсинг агента |
| `LANGFUSE_SECRET_KEY` | Нет | Трейсинг агента |
| `LANGFUSE_BASE_URL` | Нет | `https://cloud.langfuse.com` или self-host |
| `LANGFUSE_ENABLED` | Нет | Явно `false` отключает Langfuse |

`OPENROUTER_API_KEY` — только fallback **без агента** (нет tool calling).

---

## 2. Куда добавить переменные в Timeweb

1. Панель Timeweb → **Облачные приложения** → ваше Backend-приложение (Мастерок).
2. **Настройки** → **Переменные окружения**.
3. Добавьте ключи из таблицы (значения без кавычек, без пробелов в начале/конце).
4. **Сохранить** и **перезапустить** приложение (Redeploy / Restart).

Рекомендуется также (из `next.config.ts`):

```
NPM_CONFIG_CACHE=/tmp/.npm-cache
```

---

## 3. Минимальный набор для продакшена

```env
DEEPSEEK_API_KEY=sk-...
NEXT_PUBLIC_SITE_URL=https://getmasterok.ru
```

После деплоя проверка:

```bash
curl -s https://getmasterok.ru/api/mikhalych/ | jq
```

Ожидаемо:

```json
{
  "ok": true,
  "agentEnabled": true,
  "provider": "deepseek",
  "chatModel": "deepseek-v4-pro"
}
```

---

## 4. Расширенный набор (веб + смета + наблюдаемость)

```env
DEEPSEEK_API_KEY=sk-...
NEXT_PUBLIC_SITE_URL=https://getmasterok.ru
SERPER_API_KEY=...
JINA_API_KEY=...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Langfuse: проект → Settings → API Keys. В UI появятся traces `mikhalych-agent` с шагами tools и LLM.

---

## 5. Сборка и старт (как в репозитории)

Timeweb обычно настроен так:

| Этап | Команда |
|------|---------|
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm run start` |

`npm run build` подтянет `langfuse` и серверный код агента в bundle API routes.

---

## 6. API для клиентов (сайт и Flutter)

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/mikhalych/` | Статус, `agentEnabled` |
| `POST` | `/api/mikhalych/` | Чат: JSON или SSE (`stream: true`) |
| `POST` | `/api/mikhalych/agent/` | То же, явный endpoint агента |

Тело запроса (без `system` — сервер подставляет сам):

```json
{
  "messages": [
    { "role": "user", "content": "Сколько штукатурки на 12 м², 10 мм?" }
  ],
  "calcContext": "опционально — текст с страницы калькулятора",
  "stream": true
}
```

Ответ JSON (без стрима):

```json
{
  "choices": [{ "message": { "role": "assistant", "content": "..." } }],
  "mikhalych": {
    "mode": "agent",
    "toolsUsed": ["run_calculator"],
    "calculatorLinks": [{ "slug": "shtukaturka", "title": "...", "url": "..." }],
    "projectEntries": [{ "calcId": "...", "materials": [...] }]
  }
}
```

`projectEntries` — для кнопки **«В смету»** на сайте (IndexedDB). Мобильное приложение может сохранять те же поля в своё хранилище.

Стрим (SSE): события `status`, `tool_start`, `tool_end`, `delta`, `done`.

Откат на старый чат:

```json
{ "legacy": true, "messages": [...] }
```

или `MIKHALYCH_AGENT_ENABLED=false`.

---

## 7. Сеть и CSP

Исходящие запросы с сервера:

- `https://api.deepseek.com` — LLM
- `https://google.serper.dev` — поиск (если включён)
- `https://r.jina.ai` — чтение страниц
- Langfuse host из `LANGFUSE_BASE_URL`

Убедитесь, что firewall Timeweb не блокирует исходящий HTTPS.

---

## 8. Типичные проблемы

| Симптом | Решение |
|---------|---------|
| `AI not configured` | Нет `DEEPSEEK_API_KEY` в env приложения |
| Агент не вызывает tools | Провайдер не DeepSeek — проверьте, что не только OpenRouter |
| Нет цен из интернета | Добавьте `SERPER_API_KEY` |
| Пустой `fetch_url` | Добавьте `JINA_API_KEY` или проверьте URL |
| Нет traces в Langfuse | Ключи + redeploy; не ставьте `LANGFUSE_ENABLED=false` |
| 429 Too many requests | Лимит 20 req/min/IP на `/api/mikhalych` |

---

## 9. Flutter / мобильное приложение

1. `POST` на `https://getmasterok.ru/api/mikhalych/` **без** слэша или со слэшем — rewrite в Next принимает оба.
2. Не отправляйте свой `system` prompt — не нужен.
3. Для стрима: `stream: true`, парсить SSE (как на сайте).
4. Сохранение в смету: используйте `mikhalych.projectEntries` из ответа.

---

## 10. Локальная проверка перед деплоем

```bash
cp .env.local.example .env.local
# заполнить DEEPSEEK_API_KEY

npm run dev
# открыть /mikhalych/ — задать вопрос про штукатурку
# в DevTools → Network → POST /api/mikhalych/ → stream или JSON с toolsUsed
```

Тесты агента:

```bash
npm test -- src/lib/mikhalych/agent
```
