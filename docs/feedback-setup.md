# Обратная связь с сайта — настройка доставки

Виджет «💬 Отзыв» (плавающая кнопка слева снизу + ссылка в футере) принимает
отзывы и отправляет их владельцу. Сама форма/виджет настройки не требуют —
настраивается только **канал доставки**.

## Текущий канал: e-mail через Resend

Сервер на Timeweb **не достучивается до Telegram API** (блокируется на хостинге),
поэтому доставка идёт по e-mail через Resend — зарубежный API, с сервера доступен
(как DeepSeek у Михалыча).

### Переменные окружения (Timeweb Cloud Apps → переменные)

| Переменная | Обязательно | Назначение |
|------------|-------------|------------|
| `RESEND_API_KEY` | **Да** | Ключ из [resend.com](https://resend.com) → Dashboard → API Keys |
| `FEEDBACK_EMAIL_TO` | **Да** | Почта, куда складывать отзывы (напр. `antilopa1144@gmail.com`) |
| `FEEDBACK_EMAIL_FROM` | Нет | По умолчанию `Мастерок Отзывы <onboarding@resend.dev>` |

### Важно про `onboarding@resend.dev`

Без подтверждения домена Resend разрешает слать только со служебного адреса
`onboarding@resend.dev`, и письма доходят **только на e-mail аккаунта Resend**.
Поэтому регистрируйте Resend на ту же почту, что укажете в `FEEDBACK_EMAIL_TO`.

Когда подтвердите свой домен в Resend (Dashboard → Domains) — сможете слать с
адреса вида `otzyv@getmasterok.ru` на любую почту; задайте его в `FEEDBACK_EMAIL_FROM`.

### Шаги настройки

1. Зарегистрируйтесь на [resend.com](https://resend.com) на нужную почту.
2. Dashboard → **API Keys** → Create → скопируйте ключ (`re_...`).
3. На Timeweb добавьте `RESEND_API_KEY` и `FEEDBACK_EMAIL_TO`, **передеплойте**.
4. Проверка: `GET /api/feedback` вернёт `channel: "email"`, `email.configured: true`,
   `resend.reachable: true`. Затем отправьте отзыв через кнопку на сайте — придёт письмо.

## Диагностика (`GET /api/feedback`)

Безопасный ответ (без значений секретов):

```json
{
  "channel": "email",
  "email": { "configured": true, "apiKey": { "present": true }, "to": { "present": true } },
  "resend": { "reachable": true, "httpStatus": 200, "keyValid": true }
}
```

- `email.configured: false` → не заданы `RESEND_API_KEY`/`FEEDBACK_EMAIL_TO` (или не передеплоили).
- `resend.reachable: false` → сервер не достучался до api.resend.com (сеть/блокировка).
- `resend.keyValid: false` (httpStatus 401) → ключ неверный.

## Telegram (на будущее)

Код доставки в Telegram остался (`src/lib/feedback/telegram.ts`) как запасной канал —
включится автоматически, если Telegram API станет доступен с сервера или появится
релей (напр. Cloudflare Worker). Переменные: `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_FEEDBACK_CHAT_ID`. Приоритет — e-mail (см. `src/lib/feedback/deliver.ts`).

> Временно `POST /api/feedback` и `GET` отдают отладочные поля `channel`/`reason`/`resend`.
> После стабилизации доставки их можно убрать.
