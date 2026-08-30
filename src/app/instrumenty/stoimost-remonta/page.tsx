import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import RenovationCostCalculator from "./RenovationCostCalculator";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  title: `Калькулятор стоимости ремонта квартиры онлайн`,
  description: "Рассчитайте примерную стоимость ремонта квартиры или комнаты по своим ценам. Косметический, стандартный и капитальный ремонт — смета по материалам и работам.",
};

const PAGE_URL = `${SITE_URL}/instrumenty/stoimost-remonta/`;

export const metadata: Metadata = buildToolPageMetadata("stoimost-remonta", {
  description: META.description,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Стоимость ремонта" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Калькулятор стоимости ремонта",
    description: META.description,
    url: PAGE_URL,
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

      <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-3 sm:py-6">
          <div className="sr-only sm:not-sr-only">
            <Breadcrumbs items={[
              { href: "/instrumenty/", label: "Инструменты" },
              { label: "Стоимость ремонта" },
            ]} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-4 sm:text-2xl md:text-3xl">
            Калькулятор стоимости ремонта
          </h1>
          <p className="mt-1 hidden max-w-2xl text-slate-500 dark:text-slate-400 sm:block sm:mt-2">
            Введите площадь, тип ремонта и свои цены — получите примерную смету по материалам и работам для вашего региона.
          </p>
        </div>
      </div>

      <div className="page-container py-4 sm:py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка сметы…</div>}>
          <RenovationCostCalculator />
        </Suspense>
      </div>
      <ToolPageExtras slug="stoimost-remonta" />
    </>
  );
}
