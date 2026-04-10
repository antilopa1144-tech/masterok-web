import type { NextConfig } from "next";

/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ХОСТИНГ: Timeweb Cloud, сервер Caddy.
 * Деплой статики из out/ автоматически с push в main.
 *
 * КРИТИЧНО: Caddy на Timeweb по умолчанию настроен с SPA-fallback —
 * отдаёт index.html для всех несуществующих URL вместо 404. Это создаёт
 * Soft 404 в Яндексе и Google. Нужна правка Caddyfile через панель Timeweb:
 *
 *   example.com {
 *     root * /path/to/out
 *     encode gzip zstd
 *
 *     # try_files: точное совпадение → .html → index.html → 404
 *     try_files {path} {path}.html {path}/index.html
 *     file_server
 *
 *     # 404 страница со статус-кодом 404
 *     handle_errors {
 *       @404 expression {http.error.status_code} == 404
 *       rewrite @404 /404.html
 *       file_server
 *     }
 *
 *     # ── Security headers ────────────────────────────────────────────────
 *     header X-Content-Type-Options "nosniff"
 *     header X-Frame-Options "SAMEORIGIN"
 *     header X-XSS-Protection "1; mode=block"
 *     header Referrer-Policy "strict-origin-when-cross-origin"
 *     header Permissions-Policy "camera=(), microphone=(), geolocation=()"
 *     header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
 *
 *     # ── Cache-Control ──────────────────────────────────────────────────
 *     # Хэшированная статика Next.js — иммутабельный кэш на год
 *     @hashed_assets path /_next/static/*
 *     header @hashed_assets Cache-Control "public, max-age=31536000, immutable"
 *
 *     # Шрифты
 *     @fonts path *.woff2 *.woff *.ttf *.eot
 *     header @fonts Cache-Control "public, max-age=31536000, immutable"
 *
 *     # Изображения — 30 дней
 *     @media path *.png *.jpg *.jpeg *.svg *.webp *.ico
 *     header @media Cache-Control "public, max-age=2592000"
 *
 *     # HTML — короткий кэш + ревалидация
 *     @html path *.html /
 *     header @html Cache-Control "public, max-age=300, must-revalidate"
 *
 *     # Sitemap, robots, RSS
 *     header /sitemap.xml Cache-Control "public, max-age=3600"
 *     header /robots.txt Cache-Control "public, max-age=86400"
 *     header /rss.xml Cache-Control "public, max-age=1800"
 *   }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const nextConfig: NextConfig = {
  // Статический экспорт — хостинг без Node.js
  output: "export",
  // Trailing slash для SEO
  trailingSlash: true,
  // Убрать X-Powered-By: Next.js
  poweredByHeader: false,
  // Оптимизация изображений — unoptimized для static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
