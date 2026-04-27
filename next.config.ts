import type { NextConfig } from "next";

/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * РЕЖИМ: SSR через `next start` (Node.js server)
 * Хостинг: Timeweb Cloud App Platform → Backend Apps (Node.js 24)
 *
 * Build: `npm ci && npm run build`
 * Start: `npm run start` (→ next start, читает PORT из env, дефолт 3000)
 *
 * Этот режим даёт нативную поддержку:
 *  - HTTP 404 со статус-кодом 404 (через src/app/not-found.tsx)
 *  - Custom headers (через headers() ниже)
 *  - Redirects (через redirects() если понадобятся)
 *  - Динамические роуты без предварительного build-time рендеринга (ISR)
 *
 * Раньше был `output: "export"` — он раздавался через Frontend Apps Timeweb,
 * которая делала SPA-fallback на index.html для всех несуществующих URL.
 * Это создавало Soft 404. Теперь запускаем Next.js сервером.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const nextConfig: NextConfig = {
  // Без output → стандартный server mode (next start)

  // Trailing slash для SEO (URL всегда с / на конце)
  trailingSlash: true,

  // Отключаем встроенный 308-редирект — middleware.ts восстанавливает его
  // только для страниц. API-роуты работают без редиректа: Dart http.Client
  // не умеет повторять POST-тело после 308, и стриминг ломается.
  skipTrailingSlashRedirect: true,

  // Убрать X-Powered-By: Next.js
  poweredByHeader: false,

  // API-маршруты должны приниматься и со слэшем, и без — мобильный клиент
  // probrab1 ходит на /api/mikhalych (без слэша), а 308-redirect на POST
  // ломается на части HTTP-клиентов. Rewrite делает оба варианта
  // эквивалентными на сервере без ответа 308.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: "/api/:path*/" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // next/image не используем — blog images с Ghost (внешний URL),
  // остальные ассеты локальные. Оставляем unoptimized чтобы не требовать sharp в runtime.
  images: {
    unoptimized: true,
  },

  // 301-редиректы для удалённых/переименованных URL
  async redirects() {
    return [
      // Страница «О специалисте» удалена — выдуманный эксперт больше не фигурирует.
      // Перенаправляем на «О проекте», чтобы не терять SEO-вес и не получать 404
      // для старых индексированных URL.
      {
        source: "/o-spetsialiste",
        destination: "/o-proekte/",
        permanent: true,
      },
      {
        source: "/o-spetsialiste/",
        destination: "/o-proekte/",
        permanent: true,
      },
    ];
  },

  // HTTP headers — то, ради чего мы перешли на SSR
  async headers() {
    // CSP в enforcement-режиме (с 2026-04-28).
    // До этого был Content-Security-Policy-Report-Only — собирали статистику
    // нарушений. Главный нарушитель (webvisor с WebSocket к mc.yandex.com/solid.ws)
    // отключён в PR #38, теперь можно блокировать. Webvisor URLs убраны
    // из script-src и connect-src — больше там не нужны.
    //
    // 'unsafe-inline' оставлен в script-src из-за:
    //   - inline dark-mode скрипта в layout.tsx (THEME_INIT_SCRIPT)
    //   - JSON-LD <script type="application/ld+json"> в страницах (SEO)
    //   - inline Yandex Metrika init script
    // Переход на nonce-based CSP — отдельный рефакторинг (требует middleware).
    //
    // 'unsafe-eval' оставлен только потому что некоторые dev-инструменты
    // его используют. В production React/Next 15 без 'unsafe-eval' работает.
    // TODO в будущем: убрать 'unsafe-eval' и проверить что production build не сломан.
    //
    // 'unsafe-inline' для style-src безопасен (Tailwind генерирует inline-стили).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru https://yastatic.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http://5.129.248.119",
      "font-src 'self' data:",
      "connect-src 'self' https://mc.yandex.ru https://openrouter.ai",
      "frame-src 'self' https://mc.yandex.ru",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      // Security headers — на всех страницах
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS на 1 год для всех поддоменов. Директива `preload` УБРАНА:
          // getmasterok.ru НЕ зарегистрирован на hstspreload.org, и браузеры её
          // игнорируют без регистрации (создавая ложное чувство безопасности).
          //
          // Чтобы включить preload (после уверенной работы HTTPS на всех subdomains):
          //  1. Проверить статус: https://hstspreload.org/?domain=getmasterok.ru
          //  2. Изменить директиву на: max-age=31536000; includeSubDomains; preload
          //  3. Подать заявку на https://hstspreload.org/ через форму submission
          //  4. ВНИМАНИЕ: это необратимо на 6-12 месяцев. Если разорвёшь HTTPS
          //     на каком-то поддомене — пользователи Chrome не смогут попасть.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      // Content-hashed статика Next.js — иммутабельный кэш на год
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Шрифты — иммутабельный кэш на год
      {
        source: "/:path*.woff2",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Картинки — месяц
      {
        source: "/:path*.(png|jpg|jpeg|svg|webp|ico|gif)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000" },
        ],
      },
      // Sitemap, robots, RSS
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/rss.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=1800" }],
      },
      // HTML страниц — короткий клиентский кэш + длинный CDN-кэш с фоновой ревалидацией.
      // Ключевая оптимизация для crawl budget: бот получит готовый HTML за ~50ms вместо
      // 700ms TTFB. Реальные пользователи получают свежий HTML каждые 5 минут;
      // CDN отдаёт старую версию пока обновляется (stale-while-revalidate).
      // ISR-страницы с export const revalidate = N сами управляют своим Cache-Control,
      // эти заголовки применяются как fallback.
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/kalkulyatory/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/instrumenty/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/blog/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
      // Статические информационные страницы — длинный кэш
      {
        source: "/(o-proekte|prilozhenie|metodologiya|politika-konfidencialnosti|mikhalych)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
