import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ReverseCalculator from "./ReverseCalculator";

const META = {
  title: `Калькулятор «Сколько осталось» — на какую площадь хватит материала | ${SITE_NAME}`,
  description: "Обратный калькулятор: введите сколько материала осталось, узнайте на какую площадь его хватит. Краска, грунтовка, клей, штукатурка, шпаклёвка.",
};

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/instrumenty/skolko-ostalos/`,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Калькулятор «Сколько осталось»",
  url: `${SITE_URL}/instrumenty/skolko-ostalos/`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
  description: META.description,
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Сколько осталось" },
  ],
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Сколько осталось" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            На какую площадь хватит материала?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Введите сколько материала у вас осталось — калькулятор покажет на какую площадь его хватит.
          </p>
        </div>
      </div>
      <div className="page-container py-8">
        <ReverseCalculator />
      </div>
    </>
  );
}
