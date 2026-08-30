"use client";

import Link from "next/link";
import { trackToolRelatedClick } from "@/lib/analytics";
import {
  buildCalculatorHrefForChecklist,
  getCalculatorLinkForChecklist,
} from "@/lib/tools/checklist-calculator-links";

export default function ChecklistCalculatorLink({ checklistSlug }: { checklistSlug: string }) {
  const link = getCalculatorLinkForChecklist(checklistSlug);
  const href = buildCalculatorHrefForChecklist(checklistSlug);
  if (!link || !href) return null;

  return (
    <section
      className="mt-8 rounded-2xl border border-accent-200 bg-accent-50 p-5 dark:border-accent-800/50 dark:bg-accent-950/20"
      aria-labelledby="checklist-calculator-title"
      data-testid="checklist-calculator-link"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">
        До начала работ
      </p>
      <h2 id="checklist-calculator-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        Сначала проверьте закупку материалов
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Чек-лист отвечает за порядок и контроль работ. {link.calculatorTitle} отдельно посчитает нужное количество и итог к покупке.
      </p>
      <Link
        href={href}
        onClick={() => trackToolRelatedClick(`chek-listy/${checklistSlug}`, link.calculatorSlug)}
        className="btn-primary mt-4 min-h-11 justify-center text-center text-sm no-underline sm:inline-flex"
      >
        {link.calculatorCta} <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
