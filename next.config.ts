import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone — Node.js сервер, поддерживает API роуты
  output: "standalone",
  // Trailing slash для SEO
  trailingSlash: true,
  // Убрать X-Powered-By: Next.js
  poweredByHeader: false,
  // Оптимизация изображений
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
