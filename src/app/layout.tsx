import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import YandexMetrika from "@/components/analytics/YandexMetrika";
import StorageMigrationInitializer from "@/components/storage/StorageMigrationInitializer";

import { SITE_DEFAULT_TITLE, SITE_METADATA_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_PATH, SITE_OG_IMAGE_WIDTH, SITE_TWITTER_DESCRIPTION, SITE_TWITTER_TITLE, SITE_URL } from "@/lib/site";

const YM_COUNTER = process.env.NEXT_PUBLIC_YM_COUNTER || "108155444";

const THEME_INIT_SCRIPT = `(() => {
  try {
    const key = 'theme';
    const stored = localStorage.getItem(key);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark'
      ? stored
      : (prefersDark ? 'dark' : 'light');

    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch (_) {
    // no-op
  }
})();`;

// Webvisor отключён сознательно: тащил +43 KB JS, +200ms TBT mobile, открывал WebSocket
// к mc.yandex.com/solid.ws (блокировался CSP, генерировал ошибки в консоли).
// Клики/линки/время на странице/отказы продолжают писаться через clickmap+trackLinks.
//
// Важно для Lighthouse/PageSpeed: сам tag.js грузим не сразу afterInteractive,
// а после idle/первого взаимодействия/таймаута. Очередь ym() создаётся сразу,
// поэтому первый hit и SPA-навигация не теряются, но тяжёлый сторонний JS
// не попадает в критический TBT на первом рендере.
const YM_INIT_SCRIPT = `(() => {
  const id = ${YM_COUNTER};
  const src = "https://mc.yandex.ru/metrika/tag.js";
  const w = window;
  const d = document;

  w.ym = w.ym || function(){(w.ym.a = w.ym.a || []).push(arguments)};
  w.ym.l = 1 * new Date();
  w.ym(id, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true});

  let loaded = false;
  const load = () => {
    if (loaded || d.querySelector('script[src="' + src + '"]')) return;
    loaded = true;
    const script = d.createElement("script");
    script.async = true;
    script.src = src;
    (d.head || d.body).appendChild(script);
  };

  const scheduleIdleLoad = () => {
    if ("requestIdleCallback" in w) {
      w.requestIdleCallback(load, { timeout: 8000 });
    } else {
      w.setTimeout(load, 8000);
    }
  };

  if (d.readyState === "complete") {
    scheduleIdleLoad();
  } else {
    w.addEventListener("load", scheduleIdleLoad, { once: true });
  }

  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((eventName) => {
    w.addEventListener(eventName, load, { once: true, passive: true });
  });
})();`;

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
};

export const metadata: Metadata = {
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    SITE_METADATA_DESCRIPTION,
  keywords: [
    "строительный калькулятор",
    "калькулятор бетона",
    "калькулятор кирпича",
    "расчёт материалов",
    "калькулятор кровли",
    "калькулятор ламината",
    "расчёт стройматериалов онлайн",
  ],
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
    "geo.position": "55.7558;37.6173",
    "ICBM": "55.7558, 37.6173",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* next/font self-hostит Inter — preconnect к Google Fonts не нужен.
            Yandex.Metrika подгружается afterInteractive, dns-prefetch ускоряет первый запрос. */}
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — Блог`} href="/rss.xml" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
        <Suspense fallback={null}>
          <YandexMetrika />
        </Suspense>
        <StorageMigrationInitializer />
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
        <Script id="ym-init" strategy="afterInteractive">{YM_INIT_SCRIPT}</Script>
        <Script id="sw-unregister" strategy="afterInteractive">{`if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(r=>r.forEach(w=>w.unregister()))`}</Script>
      </body>
    </html>
  );
}
