import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import LaminateLayoutGenerator from "./LaminateLayoutGenerator";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  description:
    "Визуализатор раскладки ламината: палубой со смещением 1/3 и 1/2 или ёлочкой под 45°. Введите размеры комнаты и доски — увидите схему, отход и количество досок к закупке.",
};

export const metadata: Metadata = buildToolPageMetadata("raskladka-laminata", {
  description: META.description,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Раскладка ламината" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Генератор раскладки ламината",
    description: META.description,
    url: `${SITE_URL}/instrumenty/raskladka-laminata/`,
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

      <div className="bg-gradient-to-b from-orange-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Раскладка ламината" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Генератор раскладки ламината
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Введите размеры комнаты и доски — увидите схему укладки палубой или ёлочкой, отход и количество досок к закупке.
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка…</div>}>
          <LaminateLayoutGenerator />
        </Suspense>
      </div>
      <ToolPageExtras slug="raskladka-laminata" />
    </>
  );
}
