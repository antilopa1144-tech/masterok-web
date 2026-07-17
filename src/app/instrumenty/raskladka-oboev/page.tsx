import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import WallpaperLayoutGenerator from "./WallpaperLayoutGenerator";

const META = {
  description:
    "Визуальная раскладка обоев по стенам и рулонам: полосы, прямая и смещённая подгонка рисунка, раппорт, раскрой, остатки и итог к покупке.",
};

export const metadata: Metadata = buildToolPageMetadata("raskladka-oboev", {
  description: META.description,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Раскладка обоев" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Генератор раскладки обоев",
    description: META.description,
    url: `${SITE_URL}/instrumenty/raskladka-oboev/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="border-b border-slate-200 bg-gradient-to-b from-orange-50 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Раскладка обоев" },
          ]} />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
            Генератор раскладки обоев
          </h1>
          <p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">
            Спланируйте полосы на каждой стене и раскрой каждого рулона с учётом раппорта, прямой или смещённой подгонки рисунка.
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <Suspense fallback={<div className="card animate-pulse p-8 text-sm text-slate-400">Загрузка…</div>}>
          <WallpaperLayoutGenerator />
        </Suspense>
      </div>
      <ToolPageExtras slug="raskladka-oboev" />
    </>
  );
}
