# Брифинг: починить sitemap-index в Next.js 15 + развернуть SEO-фиксы

## Контекст проекта

**Сайт:** getmasterok.ru — строительные калькуляторы онлайн (Next.js 15).
**Стек:** Next.js 15.5.15, TypeScript, React 19, App Router. Деплой на TimeWeb Cloud Apps
(Node.js 24, `npm run build` → `npm run start`). Перед Node.js стоит **их Caddy**
(reverse proxy, мы его не контролируем). HTTPS — Caddy. HTTP/1.1 в ответе
(не наша проблема, к TimeWeb).

**Размер:** ~80 страниц (главная, каталог калькуляторов, 8 категорий,
66 индивидуальных калькуляторов, ~12 инструментов, блог + теги).

**Ключевые файлы конфига:**
- `next.config.ts` — `trailingSlash: true`, `skipTrailingSlashRedirect: true`
- `src/middleware.ts` — добавляет 308 на trailing slash для страниц,
  пропускает API/_next/файлы с расширением. Только что добавлен 301-редирект
  для кириллических URL тегов блога (`/blog/tag/<кириллица>/` → `/blog/tag/<транслит>/`)

## Что уже сделано в этой сессии (закоммичено локально, НЕ запушено)

1. **`src/middleware.ts`** — добавлен 301-редирект для кириллических URL тегов
   блога. Логика: ловит `/blog/tag/<кирилл>/`, транслитерирует, редиректит
   на латинский slug. **Работает корректно**, проверено локально с URL-encoded
   кириллицей.

2. **`next.config.ts`** — поменян `Cache-Control` для HTML-страниц:
   - Было: `max-age=0, s-maxage=N, stale-while-revalidate=86400`
   - Стало: `max-age=300/600, s-maxage=N, stale-while-revalidate=86400`
   Чтобы браузеры пользователей кэшировали страницы на 5-10 минут.

3. **`src/app/sitemap.ts`** — был один большой sitemap на 130 URL,
   сделан **разделённый** через `generateSitemaps()`:
   - 5 подсайтмапов: static, categories, calculators, tools, blog
   - Next.js генерирует `/sitemap/0.xml`, `/sitemap/1.xml`, ... `/sitemap/4.xml`
   - **Все подсайтмапы работают (200 OK, валидный XML)** — проверено локально.

4. **`src/app/sitemap.xml/route.ts`** — создан route handler для корневого
   `/sitemap.xml`, который должен возвращать **sitemap-index XML** со ссылками
   на 5 подсайтмапов. **Тут проблема — см. ниже.**

5. **`scripts/rewrite_meta_titles.py`** и **`scripts/strip_tool_title_overrides.py`** —
   были использованы для рефакторинга `<title>` (это отдельная задача, уже завершена в предыдущих коммитах).

---

## 🔴 ПРОБЛЕМА которую нужно решить

**Корневой `/sitemap.xml` отдаёт HTML 404 (страница "Страница не найдена | Мастерок")
вместо XML sitemap-index.**

### Что построено в `.next/server/app/`:

```
sitemap.xml.body          ← наш route handler, валидный XML внутри!
sitemap.xml.meta
sitemap.xml/
  route.js
  route.js.nft.json
  route_client-reference-manifest.js

sitemap/                  ← подсайтмапы из generateSitemaps()
  0.xml.body              ← валидный XML
  0.xml.meta
  1.xml.body
  1.xml.meta
  2.xml.body              ← список 66 калькуляторов в XML
  ...
  4.xml.body
  [__metadata_id__]/      ← dynamic-route Next.js
```

### Симптомы при `npm run start` локально (Windows, порт 3010):

```
404 http://localhost:3010/sitemap.xml          ← возвращает HTML "not found"!
200 http://localhost:3010/sitemap/0.xml        ← валидный XML
200 http://localhost:3010/sitemap/1.xml        ← валидный XML
200 http://localhost:3010/sitemap/2.xml        ← валидный XML
200 http://localhost:3010/sitemap/3.xml        ← валидный XML
200 http://localhost:3010/sitemap/4.xml        ← валидный XML
```

Файл `sitemap.xml.body` в `.next/server/app/` **физически существует и содержит
правильный XML** (проверено `cat`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/0.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
  ...
</sitemapindex>
```

Но Next.js при запросе `/sitemap.xml` его не отдаёт, возвращает HTML 404.

### Гипотезы, почему так

1. **Конфликт между `app/sitemap.ts` (с `generateSitemaps()`) и `app/sitemap.xml/route.ts`.**
   Next.js, возможно, при наличии `sitemap.ts` зарезервирует роут `/sitemap.xml`
   для собственного механизма, и route handler по тому же пути не работает.

2. **`trailingSlash: true` в `next.config.ts`** конфликтует с route handler
   на пути с точкой (`/sitemap.xml`). Next.js пытается сделать его
   `/sitemap.xml/` и теряется.

3. **Middleware пропускает `/sitemap.xml`** (там есть точка → `NextResponse.next()`),
   но Next.js всё равно роутит на 404. **НЕ проверено:** возможно, route
   handler с расширением в имени папки (`sitemap.xml/`) — это вообще
   undefined behavior в App Router Next.js 15.

4. **`force-static` на route handler** мог зашедулить файл, но рантайм
   `next start` не подцепляет — в `.next/routes-manifest.json` возможно
   нет правильной записи.

### Что НЕ помогло (уже попробовано)

- Перестроить с нуля (`rm -rf .next && npm run build`) — не помогло.
- В route handler есть `export const dynamic = "force-static"` и `revalidate = 3600` —
  файл генерируется в build time, но не отдаётся.

### Что ещё не пробовал (попробуй ты)

1. **Дать route handler другое имя пути**, чтобы избежать конфликта `.xml` в имени папки.
   Например, `src/app/sitemap-index/route.ts` с возвращением XML, и **редирект
   `/sitemap.xml` → `/sitemap-index` через `redirects()` в next.config.ts**.
   ⚠️ Но это сломает robots.txt (там `Sitemap: ${BASE_URL}/sitemap.xml`).

2. **Полностью отказаться от `generateSitemaps()` и собрать всё руками** через
   route handlers (`src/app/sitemap.xml/route.ts` возвращает индекс,
   `src/app/sitemap/[id]/route.ts` возвращает подсайтмапы). Это даёт
   полный контроль, но больше кода.

3. **Удалить наш `route.ts` и оставить только `sitemap.ts`** с
   `generateSitemaps()`. Тогда Next.js **должен** автоматически создать индекс
   на `/sitemap.xml`. Но в Next.js 15 этот автоиндекс не создаётся
   (известное упущение, см. https://github.com/vercel/next.js/discussions/61257).
   На предыдущей итерации тоже видели 404.

4. **Проверить через `next start` с trailing slash**: `/sitemap.xml/` —
   может быть, оно отдаёт правильно (а без слэша 308-редирект через middleware ломается).

5. **Посмотреть в `.next/routes-manifest.json`** — есть ли запись про
   `/sitemap.xml`? Если нет — Next.js не зарегистрировал route handler.

---

## 🟢 Что нужно сделать

### Главная задача: починить `/sitemap.xml`

Нужно, чтобы по URL `https://getmasterok.ru/sitemap.xml` отдавался
**валидный XML sitemap-index**, перечисляющий 5 подсайтмапов
(`/sitemap/0.xml` ... `/sitemap/4.xml`). Все 5 подсайтмапов уже работают
правильно, их не трогать.

**Формат XML:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/0.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/1.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/2.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/3.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://getmasterok.ru/sitemap/4.xml</loc>
    <lastmod>2026-05-25</lastmod>
  </sitemap>
</sitemapindex>
```

Content-Type: `application/xml; charset=utf-8`.

### Дополнительно

После того как починишь sitemap-index — провалидировать всё локально:

```powershell
cd C:\masterok-web
npm run build
$env:PORT="3010"; npm run start
# в другом окне:
curl -s http://localhost:3010/sitemap.xml | head -20      # должен быть sitemapindex XML
curl -s http://localhost:3010/sitemap/0.xml | head -20    # urlset XML
curl -s http://localhost:3010/sitemap/2.xml | head -20    # urlset XML с калькуляторами
```

После успешной проверки — закоммитить и запушить:

```powershell
cd C:\masterok-web
git add -A
git commit -m "fix(seo): корневой sitemap.xml + разделение на 5 подсайтмапов"
git push origin main
```

TimeWeb автоматически задеплоит. После деплоя проверить на проде:
- `https://getmasterok.ru/sitemap.xml` — должен быть sitemap-index XML
- `https://getmasterok.ru/sitemap/0.xml`, ... `/4.xml` — urlset XML

И отправить новый sitemap-index в Google Search Console и Яндекс.Вебмастер.

---

## 📋 Полный контекст: какие SEO-проблемы есть сейчас

(Чтобы ты понимал, зачем мы вообще это делаем.)

**Google Search Console на 2026-05-26:**
- 55 страниц indexed
- 81 страница NOT indexed:
  - 72 "Discovered - currently not indexed" (Google знает URL, но не зашёл)
  - 7 "Crawled - currently not indexed" (зашёл, не положил в индекс)
  - 1 "Not found (404)" — **причина:** `/blog/tag/площадь/` — старая ссылка
    с кириллицей в slug тега. **Уже фикшено** в middleware: redirect 301
    на транслитерированный slug.
  - 1 "Blocked due to access forbidden (403)" — мелкий, неизвестно какой URL.

**В Яндексе всё проиндексировано нормально.** Проблема только в Google.

**Корневая причина "Discovered, not indexed":**
- Сайт медленный: TTFB ~1 сек, TLS handshake 700ms (HTTP/1.1, не HTTP/2).
  Это инфраструктура TimeWeb, мы не управляем.
- crawl budget Google → этот сайт ограничен. С 130 URL и 1.5 сек на запрос
  бот не успевает обойти за разумное время.

**Стратегия лечения** (текущая итерация):
1. ✅ Починить 404 (кириллический тег → middleware redirect)
2. ✅ Усилить кэш (`max-age` поднят до 5-10 минут для пользователей)
3. 🔴 **Разделить sitemap на части** ← мы здесь, sitemap-index сломан
4. ⏳ Усилить внутреннюю перелинковку (популярные калькуляторы
   на главной + кросс-ссылки между категориями) — следующий шаг,
   ещё не делали

**Зачем разделять sitemap:**
- Google назначает crawl budget на **каждый sitemap отдельно** —
  разделение даёт каждой группе свою квоту обхода.
- Independent lastmod: изменение одного блог-поста не заставляет
  Google переоценивать весь файл (раньше был один на 130 URL,
  любой коммит — `lastmod` всех URL вылетал).
- Можно переотправить **отдельный** sitemap в GSC при проблемах
  с конкретной группой.

---

## 📁 Структура файлов sitemap (текущая)

```
src/app/
├── sitemap.ts                       ← export default sitemap({id}) +
│                                       export async function generateSitemaps()
│                                       → создаёт /sitemap/0.xml ... /sitemap/4.xml
│
├── sitemap.xml/
│   └── route.ts                     ← наш route handler для /sitemap.xml,
│                                       должен возвращать sitemap-index XML,
│                                       НЕ РАБОТАЕТ — отдаёт 404
│
└── robots.ts                        ← указывает Sitemap: ${BASE_URL}/sitemap.xml
                                       (этот URL и должен работать)
```

### Текущий код `src/app/sitemap.xml/route.ts`

```typescript
import { SITE_URL, SITE_LAST_REVIEWED } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 3600;

const SITEMAP_COUNT = 5;

export async function GET(): Promise<Response> {
  const lastmod = SITE_LAST_REVIEWED;

  const entries = Array.from({ length: SITEMAP_COUNT }, (_, i) => {
    return `  <sitemap>
    <loc>${SITE_URL}/sitemap/${i}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
```

Этот код **компилируется правильно** — `npm run build` без ошибок,
файл `.next/server/app/sitemap.xml.body` создан с правильным XML.
Но `next start` его не отдаёт по URL `/sitemap.xml`.

### Текущий код `src/app/sitemap.ts` (для контекста)

```typescript
const SITEMAP_CHUNKS = ["static", "categories", "calculators", "tools", "blog"] as const;
type SitemapChunkId = number;

export async function generateSitemaps(): Promise<Array<{ id: SitemapChunkId }>> {
  return SITEMAP_CHUNKS.map((_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: SitemapChunkId;
}): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case 0: return buildStaticSitemap();
    case 1: return buildCategoriesSitemap();
    case 2: return buildCalculatorsSitemap();
    case 3: return buildToolsSitemap();
    case 4: return buildBlogSitemap();
    default: return [];
  }
}
```

### Текущий код `src/middleware.ts` (для контекста)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CYRILLIC_TO_LATIN: Record<string, string> = { /* ... */ };

function transliterateTag(tag: string): string {
  return tag
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tag";
}

const CYRILLIC_OR_ENCODED = /[Ѐ-ӿ]|%D[0-9A-Fa-f]/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API, _next, статика и файлы с расширением — без изменений.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Кириллические URL тегов — 301 на транслит.
  if (pathname.startsWith("/blog/tag/") && CYRILLIC_OR_ENCODED.test(pathname)) {
    // ... transliterate & redirect 301
  }

  // Trailing slash для страниц.
  if (!pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = `${pathname}/`;
    return NextResponse.redirect(url.toString(), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Важно:** middleware **пропускает** `/sitemap.xml` (там есть точка),
так что это **не оно ломает**.

---

## 🎯 Что я рекомендую тебе сделать в первую очередь

1. **Запусти `npm run build` и проверь `.next/routes-manifest.json`** —
   есть ли там запись для `/sitemap.xml`? Это даст понять, регистрирует ли
   Next.js route handler. Поищи:
   ```bash
   cat .next/routes-manifest.json | grep -i sitemap
   ```

2. **Проверь, что `app/sitemap.ts` (с `generateSitemaps()`) не
   "крадёт" URL `/sitemap.xml`**. Возможно, при наличии `app/sitemap.ts`
   Next.js резервирует имя и `app/sitemap.xml/route.ts` игнорируется.

3. Если гипотеза №2 верна — попробуй один из двух подходов:

   **Вариант A:** Удалить `app/sitemap.ts` целиком, переписать всё через route handlers:
   ```
   app/sitemap.xml/route.ts          → sitemap-index
   app/sitemap/[id]/route.ts         → подсайтмапы (через generateStaticParams)
   ```

   **Вариант B:** Не использовать `app/sitemap.xml/route.ts` вообще. Вместо этого
   в `app/sitemap.ts` оставить только один sitemap (id=0 = индекс) и сделать
   так, чтобы он содержал ссылки на остальные. Но в формат `MetadataRoute.Sitemap`
   нельзя ввести `sitemapindex` элементы — Next.js всегда генерирует `urlset`. Не сработает.

   **Я считаю Вариант A более надёжным.**

4. Используй `curl -v http://localhost:3010/sitemap.xml` (с `-v`) — увидишь
   какой именно response status и header возвращается. Это поможет понять,
   действительно ли 404 идёт от Next.js, или это middleware/что-то ещё.

---

## ⚙️ Команды для проверки на Windows (PowerShell)

```powershell
# Полная пересборка
cd C:\masterok-web
Remove-Item -Recurse -Force .next
npm run build

# Запуск на нестандартном порту (3000 может быть занят)
$env:PORT = "3010"
npm run start

# В другом окне PowerShell — тесты
curl http://localhost:3010/sitemap.xml -v
curl http://localhost:3010/sitemap/0.xml
curl http://localhost:3010/sitemap/2.xml | Select-Object -First 30

# Что в build получилось
Get-Content .next\routes-manifest.json | Select-String -Pattern "sitemap"
```

---

## Status коммитов (НЕ запушены, локально на `main`)

```
$ git log --oneline origin/main..HEAD
<твой следующий коммит будет здесь>
af07d8e seo: разделить sitemap на 5 подсайтмапов + sitemap-index
        (этот коммит ещё не сделан — сломанный sitemap.xml не даёт)
```

Готовых коммитов **в этой ветке нет** — все изменения файлов **uncommitted**:

```
modified:   next.config.ts                       ← Cache-Control обновлён
modified:   src/app/sitemap.ts                   ← generateSitemaps + 5 chunks
new file:   src/app/sitemap.xml/route.ts        ← sitemap-index (СЛОМАН)
modified:   src/middleware.ts                    ← redirect для кириллических тегов
```

Когда починишь — собери всё в один коммит:

```powershell
git add -A
git commit -m @"
fix(seo): починка индексации в Google Search Console

- middleware: 301-редирект для кириллических URL тегов блога
  (закрывает Not Found 404 в GSC: /blog/tag/площадь/)
- Cache-Control: max-age=300-600 для HTML (раньше 0)
  улучшает повторные визиты пользователей и Core Web Vitals
- sitemap.xml разделён на 5 подсайтмапов через generateSitemaps()
  (static, categories, calculators, tools, blog) — каждый получает
  свой crawl budget от Google, lastmod обновляется независимо
- sitemap-index на /sitemap.xml через route handler

Co-Authored-By: <ваш AI>
"@
git push origin main
```

После деплоя — отправить sitemap в **Google Search Console** (Sitemaps → добавить
`https://getmasterok.ru/sitemap.xml`) и **Яндекс.Вебмастер**.

---

## Ссылки

- Next.js generateSitemaps: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- Issue про автоиндекс: https://github.com/vercel/next.js/discussions/61257
- Sitemap protocol: https://www.sitemaps.org/protocol.html
- robots.txt: https://getmasterok.ru/robots.txt
- Текущий "сломанный" sitemap на проде (старый формат, один файл):
  https://getmasterok.ru/sitemap.xml — пока работает ДО деплоя наших изменений
