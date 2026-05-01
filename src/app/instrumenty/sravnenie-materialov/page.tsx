import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import MaterialComparison from "./MaterialComparison";

const META = {
  title: `Сравнение строительных материалов — таблица характеристик`,
  description: "Сравнение напольных покрытий, утеплителей и отделочных материалов: стоимость, срок службы, сложность монтажа, расход сопутствующих материалов.",
};

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/instrumenty/sravnenie-materialov/`,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Сравнение строительных материалов",
  url: `${SITE_URL}/instrumenty/sravnenie-materialov/`,
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
    { "@type": "ListItem", position: 3, name: "Сравнение материалов" },
  ],
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="bg-gradient-to-b from-violet-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Сравнение материалов" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Сравнение строительных материалов
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Выберите категорию и сравните материалы по ключевым параметрам: цена, срок службы, сложность монтажа.
          </p>
        </div>
      </div>
      <div className="page-container py-8">
        <MaterialComparison />
      </div>
    </>
  );
}
