import type { NextConfig } from "next";

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
