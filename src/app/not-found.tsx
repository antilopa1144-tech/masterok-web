import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import CategoryIcon from "@/components/ui/CategoryIcon";
import CalculatorSearch from "@/components/calculator/CalculatorSearch";

export const metadata: Metadata = {
  title: "Страница не найдена | Мастерок",
  description: "Запрошенная страница не найдена. Перейдите к каталогу строительных калькуляторов или на главную.",
  robots: {
    index: false,
    follow: true,
  },
};

const POPULAR = ALL_CALCULATORS_META.filter((c) => c.popularity >= 9).slice(0, 6);

const UI_TEXT = {
  title: "Страница не найдена",
  description:
    "Возможно, калькулятор переехал или адрес изменился. Выберите нужный раздел ниже или вернитесь на главную.",
  popularTitle: "Популярные калькуляторы",
  categoriesTitle: "Все категории",
  homeCta: "На главную",
  mikhalychCta: "Спросить Михалыча",
} as const;

export default function NotFound() {
  return (
    <div className="page-container py-16">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🔨</div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {UI_TEXT.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          {UI_TEXT.description}
        </p>
        <div className="max-w-md mx-auto">
          <CalculatorSearch calculators={ALL_CALCULATORS_META} />
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">
          {UI_TEXT.popularTitle}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {POPULAR.map((calc) => {
            const cat = CATEGORIES.find((c) => c.id === calc.category);
            return (
              <Link
                key={calc.id}
                href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                className="card-hover p-4 flex items-center gap-3 no-underline"
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat?.bgColor ?? "#f1f5f9" }}
                >
                  <CategoryIcon
                    icon={cat?.icon ?? "wrench"}
                    size={18}
                    color={cat?.color ?? "#64748b"}
                  />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                  {calc.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">
          {UI_TEXT.categoriesTitle}
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/kalkulyatory/${cat.slug}/`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:border-accent-300 dark:hover:border-accent-500/40 hover:text-accent-600 transition-all no-underline"
            >
              <CategoryIcon icon={cat.icon} size={16} color={cat.color} />
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/" className="btn-primary">
          {UI_TEXT.homeCta}
        </Link>
        <Link href="/mikhalych/" className="btn-secondary">
          {UI_TEXT.mikhalychCta}
        </Link>
      </div>
    </div>
  );
}
