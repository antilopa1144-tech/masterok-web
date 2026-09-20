"use client";

import Link from "next/link";
import { trackCalculatorRelatedClick } from "@/lib/analytics";

export interface CalculatorRelatedToolCard {
  slug: string;
  href: string;
  title: string;
  reason: string;
}

interface Props {
  calculatorSlug: string;
  items: CalculatorRelatedToolCard[];
}

export default function CalculatorRelatedTools({ calculatorSlug, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="calculator-related-tools-title"
      className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/60 dark:bg-sky-950/20"
      data-print-hide
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
        Следующий шаг
      </p>
      <h2 id="calculator-related-tools-title" className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
        Проверьте результат на схеме или в справочнике
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            onClick={() => trackCalculatorRelatedClick(calculatorSlug, item.slug)}
            className="group rounded-xl border border-sky-200 bg-white px-4 py-3 no-underline transition-colors hover:border-sky-400 dark:border-sky-900/70 dark:bg-slate-900"
          >
            <span className="block text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
              {item.title} <span aria-hidden>→</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {item.reason}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
