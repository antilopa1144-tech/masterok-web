import { Box, ArrowRight } from "lucide-react";
import Link from "next/link";
import { constructorContext } from "@/lib/constructor/context-links";
import { CONSTRUCTOR_BATHROOM_MATERIALS_URL, CONSTRUCTOR_URL, CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_FURNITURE_URL, projectStartHref, scenarioHref } from "@/lib/constructor/entry";
import ConstructorEntryLink from "./ConstructorEntryLink";

export default function ConstructorContextCard({ calculatorSlug, placement }: { calculatorSlug?: string; placement: "calculator_context" | "article_context" }) {
  const context = constructorContext(calculatorSlug);
  if (!context) return null;
  return <aside aria-label="Конструктор ремонта в 3D" className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6 dark:border-orange-900/60 dark:bg-orange-950/20" data-print-hide>
    <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-300"><Box size={18} aria-hidden="true" />Конструктор Мастерок</div>
    <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{context.title}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{context.description}</p>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <ConstructorEntryLink href={projectStartHref(context.scenario)} placement={placement} scenario={context.scenario} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white no-underline hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Создать свой 3D-проект<ArrowRight size={17} aria-hidden="true" /></ConstructorEntryLink>
      <ConstructorEntryLink href={scenarioHref(context.scenario)} placement={placement} scenario={context.scenario} className="inline-flex min-h-11 items-center text-sm font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300">Открыть готовый пример</ConstructorEntryLink>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">В новом проекте сначала укажите размеры помещения. Значения из калькулятора или статьи не переносятся. Сохранённые проекты останутся.</p>
    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><Link href={context.scenario === "bathroom" ? CONSTRUCTOR_BATHROOM_URL : CONSTRUCTOR_URL} className="font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300">{context.scenario === "bathroom" ? "Как спланировать ванную и раскладку плитки" : "Как проверить отделку и закупку в конструкторе"}</Link>{context.scenario === "bathroom" && <>. Для сантехники и техники пригодится <Link href={CONSTRUCTOR_FURNITURE_URL} className="font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300">расстановка предметов по своим габаритам</Link>.</>}</p>
    {context.scenario === "bathroom" && <Link href={CONSTRUCTOR_BATHROOM_MATERIALS_URL} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300">Материалы для ванной: проверить список перед покупкой</Link>}
  </aside>;
}
