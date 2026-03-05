import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CALCULATORS } from "@/lib/calculators";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

export const metadata: Metadata = {
  title: "Все строительные калькуляторы онлайн | Мастерок",
  description: "Полный каталог строительных калькуляторов: бетон, кирпич, кровля, полы, отделка. Расчёт материалов по ГОСТ и СНиП.",
};

export default function KalkulyatoryPage() {
  return (
    <div>
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Все калькуляторы
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {ALL_CALCULATORS.length} калькуляторов по всем разделам строительства
          </p>
        </div>
      </div>

      <div className="page-container-wide py-8 space-y-10">
        {CATEGORIES.map((cat) => {
          const calcs = ALL_CALCULATORS.filter((c) => c.category === cat.id);
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
                <span className="text-sm text-slate-400 dark:text-slate-500">({calcs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {calcs.map((calc) => (
                  <Link
                    key={calc.id}
                    href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                    className="card-hover px-5 py-4 block no-underline group"
                  >
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1 group-hover:text-accent-600 transition-colors">
                      {calc.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed line-clamp-2">
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
