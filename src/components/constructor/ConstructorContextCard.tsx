import { Box, ArrowRight } from "lucide-react";
import Link from "next/link";
import { constructorContext } from "@/lib/constructor/context-links";
import { CONSTRUCTOR_URL, CONSTRUCTOR_BATHROOM_URL, scenarioHref } from "@/lib/constructor/entry";
import ConstructorEntryLink from "./ConstructorEntryLink";

export default function ConstructorContextCard({ calculatorSlug, placement }: { calculatorSlug?: string; placement: "calculator_context" | "article_context" }) {
  const context = constructorContext(calculatorSlug);
  if (!context) return null;
  return <aside aria-label="Конструктор ремонта в 3D" className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6 dark:border-orange-900/60 dark:bg-orange-950/20" data-print-hide>
    <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-300"><Box size={18} aria-hidden="true" />Конструктор Мастерок</div>
    <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{context.title}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{context.description}</p>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <ConstructorEntryLink href={scenarioHref(context.scenario)} placement={placement} scenario={context.scenario} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white no-underline hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Открыть пример в 3D<ArrowRight size={17} aria-hidden="true" /></ConstructorEntryLink>
      <Link href={context.scenario === "bathroom" ? CONSTRUCTOR_BATHROOM_URL : CONSTRUCTOR_URL} className="inline-flex min-h-11 items-center text-sm font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300">Что умеет конструктор</Link>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Откроется новый пример. Укажите размеры своего помещения: значения из калькулятора или статьи не переносятся.</p>
  </aside>;
}
