"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/ui/CategoryIcon";
import {
  getRecentCalculators,
  trackRecentCalculator as trackRecentCalculatorInStorage,
} from "@/lib/storage/recent";
import type { StoredRecentCalculator } from "@/lib/storage/types";

interface RecentCalc {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryIcon: string;
  categoryColor: string;
  categoryBg: string;
}

/** Track a calculator visit (call from calculator page) */
export function trackRecentCalculator(calc: RecentCalc) {
  void trackRecentCalculatorInStorage(calc);
}

/** Display recently viewed calculators */
export default function RecentCalculators() {
  const [recent, setRecent] = useState<StoredRecentCalculator[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getRecentCalculators().then((items) => {
      if (!cancelled) setRecent(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="page-container-wide py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Недавно просмотренные
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-400">
          Последние {recent.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {recent.map((calc) => (
          <Link
            key={calc.id}
            href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
            className="card-hover p-4 flex items-center gap-3 no-underline shrink-0 min-w-[200px] max-w-[260px]"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: calc.categoryBg }}
            >
              <CategoryIcon icon={calc.categoryIcon} size={18} color={calc.categoryColor} />
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug truncate">
              {calc.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
