import type { Metadata } from "next";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import CalculatorCatalog from "@/components/calculator/CalculatorCatalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Все строительные калькуляторы онлайн`,
  description: "Полный каталог строительных калькуляторов: бетон, кирпич, кровля, полы, отделка. Расход материалов, запас и количество к покупке.",
} as const;

const PAGE_URL = `${SITE_URL}/kalkulyatory/`;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
});

const UI_TEXT = {
  title: "Все калькуляторы",
  countSuffix: "калькуляторов по всем разделам строительства",
} as const;

function CollectionJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: META.title,
    description: META.description,
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ALL_CALCULATORS_META.length,
      itemListElement: ALL_CALCULATORS_META.slice(0, 20).map((calc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
        name: calc.title,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Калькуляторы", item: PAGE_URL },
      ],
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function KalkulyatoryPage() {
  return (
    <div>
      <CollectionJsonLd />
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {UI_TEXT.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {ALL_CALCULATORS_META.length} {UI_TEXT.countSuffix}
          </p>
        </div>
      </div>

      <div className="page-container-wide py-8">
        <CalculatorCatalog calculators={ALL_CALCULATORS_META} categories={CATEGORIES} />
      </div>
    </div>
  );
}




