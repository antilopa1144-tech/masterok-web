import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import YandexMetrikaLoader from "@/components/analytics/YandexMetrikaLoader";
import WebVitalsReporter from "@/components/analytics/WebVitalsReporter";
import StorageMigrationInitializer from "@/components/storage/StorageMigrationInitializer";
import { getYandexMetrikaDeferredInitScript } from "@/lib/analytics/yandex-metrika-deferred";

import { SITE_DEFAULT_TITLE, SITE_METADATA_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_PATH, SITE_OG_IMAGE_WIDTH, SITE_TWITTER_DESCRIPTION, SITE_TWITTER_TITLE, SITE_URL } from "@/lib/site";

const YM_COUNTER = process.env.NEXT_PUBLIC_YM_COUNTER || "108155444";

// Применяет тему до первой отрисовки (без мигания).
// Карта тем дублирует src/lib/theme.ts: значение = тёмная ли тема.
const THEME_INIT_SCRIPT = `(() => {
  try {
    const themes = { light: 0, dark: 1, bronze: 0, emerald: 0, lavender: 0, ocean: 1, graphite: 1 };
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = Object.prototype.hasOwnProperty.call(themes, stored)
      ? stored
      : (prefersDark ? 'dark' : 'light');

    const root = document.documentElement;
    if (theme !== 'light' && theme !== 'dark') root.setAttribute('data-theme', theme);
    const isDark = themes[theme] === 1;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (_) {
    // no-op
  }
})();`;

const YM_INIT_SCRIPT = getYandexMetrikaDeferredInitScript(YM_COUNTER);

// Веса 400/500/600/700 покрывают весь дизайн (font-normal, font-medium, font-semibold,
// font-bold). Вес 800 (font-extrabold) убран сознательно — экономит ~20-40 KB woff2 на
// мобильном FCP. Все font-extrabold заменены на font-bold (визуальная разница минимальна).
// display: "optional" вместо "swap" устраняет CLS от замены шрифта (FOUT).
// next/font самостоятельно прелоадит Inter с высоким приоритетом — браузер
// успевает загрузить его до первого рендера при нормальном соединении.
// На медленном соединении браузер использует системный шрифт без замены.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
  variable: "--font-inter",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    SITE_METADATA_DESCRIPTION,
  authors: [{ name: `Редакция ${SITE_NAME}`, url: `${SITE_URL}/o-proekte/` }],
  creator: `Редакция ${SITE_NAME}`,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  twitter: {
    card: "summary_large_image",
    title: SITE_TWITTER_TITLE,
    description: SITE_TWITTER_DESCRIPTION,
    images: [SITE_OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: SITE_NAME,
    title: SITE_DEFAULT_TITLE,
    description:
      SITE_OG_DESCRIPTION,
    images: [{ url: SITE_OG_IMAGE_PATH, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT }],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "ru": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ?? "",
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION ?? "",
  },
  other: {
    "geo.region": "RU",
    "geo.placename": "Россия",
    "content-language": "ru",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce из middleware для CSP — позволяет убрать 'unsafe-inline' из script-src
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — Блог`} href="/rss.xml" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc.yandex.ru/watch/${YM_COUNTER}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
              aria-hidden="true"
            />
          </div>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-accent-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Перейти к основному содержимому
        </a>
        <YandexMetrikaLoader />
        <WebVitalsReporter />
        <StorageMigrationInitializer />
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
        <Script id="ym-init" strategy="lazyOnload" nonce={nonce}>{YM_INIT_SCRIPT}</Script>
        <Script id="sw-unregister" strategy="lazyOnload" nonce={nonce}>{`if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(r=>r.forEach(w=>w.unregister()))`}</Script>
      </body>
    </html>
  );
}
