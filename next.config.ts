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
    return [
      // Security headers — на всех страницах
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
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
    ];
  },
};

export default nextConfig;
