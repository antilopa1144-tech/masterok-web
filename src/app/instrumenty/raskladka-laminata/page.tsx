import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import LaminateLayoutGenerator from "./LaminateLayoutGenerator";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  description:
    "Бесплатная программа раскладки ламината онлайн: схема 1/3, 1/2 или ёлочкой. Введите размеры комнаты и доски — увидите подрезки, отход и количество к закупке.",
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

      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="page-container-wide py-4 sm:py-5">
          <div className="sr-only">
            <Breadcrumbs items={[
              { href: "/instrumenty/", label: "Инструменты" },
              { label: "Раскладка ламината" },
            ]} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Раскладка ламината онлайн со схемой
          </h1>
          <p className="mt-1.5 max-w-4xl text-sm text-slate-500 sm:text-base dark:text-slate-400">
            Введите размеры комнаты и доски — увидите схему укладки палубой или ёлочкой, отход и количество досок к закупке.
          </p>
        </div>
      </div>

      <div className="page-container-wide py-5 lg:py-6">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка…</div>}>
          <LaminateLayoutGenerator />
        </Suspense>
      </div>
      <ToolPageExtras slug="raskladka-laminata" />
    </>
  );
}
