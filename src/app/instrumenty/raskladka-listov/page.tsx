import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import SheetLayoutGenerator from "./SheetLayoutGenerator";

const description = "Визуальная раскладка листов ГКЛ и ОСП: ориентация, разбежка стыков, раскрой, повторное использование обрезков и итог к покупке.";

export const metadata: Metadata = buildToolPageMetadata("raskladka-listov", { description });

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Генератор раскладки листов ГКЛ и ОСП",
    description,
    url: `${SITE_URL}/instrumenty/raskladka-listov/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
      { "@type": "ListItem", position: 3, name: "Раскладка листов" },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="border-b border-slate-200 bg-gradient-to-b from-teal-50 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"><div className="page-container py-6"><Breadcrumbs items={[{ href: "/instrumenty/", label: "Инструменты" }, { label: "Раскладка листов" }]} /><h1 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">Раскладка листов ГКЛ и ОСП</h1><p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">Сравните ориентации листа, разнесите стыки, получите карту раскроя и количество к покупке с повторным использованием обрезков.</p></div></div>
      <div className="page-container py-8"><Suspense fallback={<div className="card animate-pulse p-8 text-sm text-slate-400">Загрузка…</div>}><SheetLayoutGenerator /></Suspense></div>
      <ToolPageExtras slug="raskladka-listov" />
    </>
  );
}
