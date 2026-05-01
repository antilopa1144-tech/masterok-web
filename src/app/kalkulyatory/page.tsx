import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Все строительные калькуляторы онлайн`,
  description: "Полный каталог строительных калькуляторов: бетон, кирпич, кровля, полы, отделка. Расчёт материалов по ГОСТ и СНиП.",
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

      <div className="page-container-wide py-8 space-y-10">
        {CATEGORIES.map((cat) => {
          const calcs = ALL_CALCULATORS_META.filter((c) => c.category === cat.id);
          if (calcs.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.bgColor }}
                >
                  <CategoryIcon icon={cat.icon} size={20} color={cat.color} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{cat.label}</h2>
                <span className="text-sm text-slate-400 dark:text-slate-400">({calcs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {calcs.map((calc) => (
                  <Link
                    key={calc.id}
                    href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                    className="card-hover px-5 py-4 block no-underline group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-accent-700 transition-colors">
                        {calc.title}
                      </h3>
                      {calc.popularity >= 9 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 font-medium shrink-0">
                          ТОП
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {calc.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}






