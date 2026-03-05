import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import YandexMetrika from "@/components/analytics/YandexMetrika";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StructuredData } from "@/components/layout/StructuredData";

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

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Мастерок — строительные калькуляторы онлайн",
    template: "%s | Мастерок",
  },
  description:
    "Бесплатные строительные калькуляторы онлайн: бетон, кирпич, кровля, ламинат, плитка, гипсокартон и ещё 50+ расчётов. Точно, быстро, по ГОСТ.",
  keywords: [
    "строительный калькулятор",
    "калькулятор бетона",
    "калькулятор кирпича",
    "расчёт материалов",
    "калькулятор кровли",
    "калькулятор ламината",
    "расчёт стройматериалов онлайн",
  ],
  authors: [{ name: "Мастерок" }],
  creator: "Мастерок",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru"
  ),
  twitter: {
    card: "summary_large_image",
    title: "Мастерок — строительные калькуляторы",
    description: "50+ бесплатных строительных калькуляторов онлайн",
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
    siteName: "Мастерок",
    title: "Мастерок — строительные калькуляторы онлайн",
    description:
      "50+ бесплатных строительных калькуляторов. Точный расчёт материалов по ГОСТ.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <StructuredData />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-accent-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Перейти к содержимому
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
