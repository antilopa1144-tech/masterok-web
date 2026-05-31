import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import BrickworkGenerator from "./BrickworkGenerator";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  description:
    "Визуализатор кирпичной кладки: ложковая, цепная, фламандская и баварская перевязка. Введите размеры стены и кирпича — увидите схему перевязки и количество кирпича к закупке.",
};

export const metadata: Metadata = buildToolPageMetadata("raskladka-kirpicha", {
  description: META.description,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Раскладка кирпичной кладки" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Генератор раскладки кирпичной кладки",
    description: META.description,
    url: `${SITE_URL}/instrumenty/raskladka-kirpicha/`,
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
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Раскладка кирпичной кладки" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Генератор раскладки кирпичной кладки
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Выберите тип перевязки и размеры — увидите схему кладки (ложковая, цепная, фламандская, баварская) и количество кирпича к закупке.
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка…</div>}>
          <BrickworkGenerator />
        </Suspense>
      </div>
      <ToolPageExtras slug="raskladka-kirpicha" />
    </>
  );
}
