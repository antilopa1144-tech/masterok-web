import Link from "next/link";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { getCategoryById } from "@/lib/calculators/categories";
import type { CalcRef } from "@/lib/tools/config";
import { calcHref } from "@/lib/tools/config";

interface Props {
  refs: CalcRef[];
  title?: string;
}

export default function RelatedCalculators({
  refs,
  title = "Связанные калькуляторы",
}: Props) {
  const items = refs
    .map((ref) => {
      const calc = ALL_CALCULATORS_META.find(
        (c) => c.slug === ref.slug && c.categorySlug === ref.categorySlug,
      );
      return calc ? { ref, calc } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-slate-200 dark:border-slate-800 pt-8" data-print-hide>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ calc }) => {
          const cat = getCategoryById(calc.category);
          return (
            <Link
              key={calc.id}
              href={calcHref({ slug: calc.slug, categorySlug: calc.categorySlug })}
              className="card-hover p-4 flex items-start gap-3 no-underline group"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: (cat?.color ?? "#64748b") + "18" }}
              >
                <CategoryIcon icon={cat?.icon ?? "wrench"} size={20} color={cat?.color ?? "#64748b"} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-accent-700 transition-colors leading-snug">
                  {calc.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{calc.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
