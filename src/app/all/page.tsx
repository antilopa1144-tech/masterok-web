import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Все калькуляторы — ${SITE_NAME}`,
  description: `Полный список всех строительных калькуляторов ${SITE_NAME}: фундамент, стены, кровля, полы, отделка, фасад, потолки. Расход, запас и количество к покупке.`,
  alternates: { canonical: `${SITE_URL}/all/` },
  robots: { index: true, follow: true },
};

/** Сгруппировать калькуляторы по categorySlug */
function groupByCategory() {
  const map = new Map<string, typeof ALL_CALCULATORS_META>();
  for (const calc of ALL_CALCULATORS_META) {
    const group = map.get(calc.categorySlug) || [];
    group.push(calc);
    map.set(calc.categorySlug, group);
  }
  return map;
}

export default function AllCalculatorsPage() {
  const grouped = groupByCategory();

  return (
    <div className="page-container-wide py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Все строительные калькуляторы
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-2xl">
          Полный список из {ALL_CALCULATORS_META.length} калькуляторов {SITE_NAME}. Выберите нужный раздел или калькулятор.
        </p>

        <nav aria-label="Оглавление" className="mb-10">
          <ul className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const count = grouped.get(cat.slug)?.length ?? 0;
              return (
                <li key={cat.slug}>
                  <a
                    href={`#cat-${cat.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors no-underline"
                  >
                    {cat.label}
                    <span className="text-xs text-slate-400 dark:text-slate-500">({count})</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const calcs = grouped.get(cat.slug);
            if (!calcs || calcs.length === 0) return null;
            return (
              <section key={cat.slug} id={`cat-${cat.slug}`}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <Link
                    href={`/kalkulyatory/${cat.slug}/`}
                    className="hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
                  >
                    {cat.label}
                  </Link>
                  <span className="text-sm font-normal text-slate-400">
                    {calcs.length} шт.
                  </span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {calcs
                    .sort((a, b) => b.popularity - a.popularity)
                    .map((calc) => (
                      <li key={calc.id}>
                        <Link
                          href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                          className="block p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-accent-50/50 dark:hover:bg-accent-900/10 transition-colors no-underline group"
                        >
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-accent-700 dark:group-hover:text-accent-400 transition-colors">
                            {calc.title}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                            {calc.metaDescription.length > 120
                              ? calc.metaDescription.slice(0, 120) + "…"
                              : calc.metaDescription}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-12 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Всего{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {ALL_CALCULATORS_META.length}
            </strong>{" "}
            калькуляторов с нормами расхода, запасом и округлением до упаковок.{" "}
            <Link
              href="/metodologiya/"
              className="text-accent-700 dark:text-accent-400 hover:underline"
            >
              Методология расчётов
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
