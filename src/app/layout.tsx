import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import YandexMetrika from "@/components/analytics/YandexMetrika";

import { SITE_DEFAULT_TITLE, SITE_EXPERT, SITE_METADATA_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_PATH, SITE_OG_IMAGE_WIDTH, SITE_TWITTER_DESCRIPTION, SITE_TWITTER_TITLE, SITE_URL } from "@/lib/site";

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

const YM_INIT_SCRIPT = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${YM_COUNTER},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

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
  authors: [{ name: `${SITE_EXPERT.name}, ${SITE_EXPERT.jobTitle.toLowerCase()}` }],
  creator: SITE_EXPERT.name,
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
    "theme-color": "#f97316",
    "msapplication-TileColor": "#f97316",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "geo.region": "RU",
    "geo.position": "55.7558;37.6173",
    "ICBM": "55.7558, 37.6173",
    "geo.placename": "Россия",
    "citation_title": SITE_DEFAULT_TITLE,
    "citation_author": SITE_EXPERT.name,
    "citation_language": "ru",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — Блог`} href="/rss.xml" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: YM_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})` }} />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <noscript>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${YM_COUNTER}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
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
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
