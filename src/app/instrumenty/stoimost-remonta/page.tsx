import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import RenovationCostCalculator from "./RenovationCostCalculator";

const META = {
  title: `Калькулятор стоимости ремонта квартиры онлайн | ${SITE_NAME}`,
  description: "Рассчитайте примерную стоимость ремонта квартиры или комнаты. Косметический, стандартный и капитальный ремонт — смета по материалам и работам.",
};

const PAGE_URL = `${SITE_URL}/instrumenty/stoimost-remonta/`;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
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
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Стоимость ремонта" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Калькулятор стоимости ремонта
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Введите площадь и тип ремонта — получите примерную смету по материалам и работам. Цены актуальны для средних по России.
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <RenovationCostCalculator />
      </div>
    </>
  );
}
