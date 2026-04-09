import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Статический экспорт — хостинг без Node.js
  // Security headers: см. public/_headers (Netlify/Cloudflare) или nginx:
  //   add_header X-Content-Type-Options "nosniff" always;
  //   add_header X-Frame-Options "SAMEORIGIN" always;
  //   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  //   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  //   add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
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
