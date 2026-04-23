"use client";

import Link from "next/link";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorBySlug } from "@/lib/calculators";
import { getCategoryById } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

const TRANSFERABLE_KEYS = ["area", "length", "width", "height", "inputMode"];

function buildTransferParams(values: Record<string, number>, targetSlug: string): string {
  const params = new URLSearchParams();
  for (const key of TRANSFERABLE_KEYS) {
    if (values[key] != null && values[key] > 0) {
      params.set(key, String(values[key]));
    }
  }
  params.set("from", targetSlug);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

interface Props {
  slug: string;
  values: Record<string, number>;
}

export default function CompanionLinks({ slug, values }: Props) {
  const companions = CALCULATOR_COMPANIONS[slug];
  if (!companions || companions.length === 0) return null;

  const resolved = companions
    .map((c) => {
      const calc = getCalculatorBySlug(c.slug);
      if (!calc) return null;
      const cat = getCategoryById(calc.category);
      return { ...c, calc, cat };
    })
    .filter(Boolean) as {
    slug: string;
    reason: string;
    calc: NonNullable<ReturnType<typeof getCalculatorBySlug>>;
    cat: ReturnType<typeof getCategoryById>;
  }[];

  if (resolved.length === 0) return null;

  return (
    <div
      className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
      data-print-hide
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Также может пригодиться
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {resolved.map((c) => (
          <Link
            key={c.slug}
            href={`/kalkulyatory/${c.calc.categorySlug}/${c.calc.slug}/${buildTransferParams(values, slug)}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-600 transition-all no-underline group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: c.cat?.bgColor ?? "#f1f5f9" }}
            >
              <CategoryIcon icon={c.cat?.icon ?? "wrench"} size={18} color={c.cat?.color ?? "#64748b"} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent-600 transition-colors block">
                {c.calc.title}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {c.reason}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
