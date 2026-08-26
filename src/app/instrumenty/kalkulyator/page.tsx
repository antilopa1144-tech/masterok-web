"use client";

import Link from "next/link";
import QuickCalculator from "@/components/tools/QuickCalculator";

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Калькулятор",
  title: "Калькулятор",
  description: "Быстрые вычисления прямо на сайте. Поддерживает клавиатуру.",
} as const;

export default function KalkulyatorPage() {
  return (
    <div className="page-container py-4 sm:py-8">
      <Link
        href="/instrumenty/"
        className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 hover:text-accent-600 sm:hidden"
      >
        ← Все инструменты
      </Link>
      <nav className="mb-6 hidden items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 sm:flex">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">
          {UI_TEXT.breadcrumbHome}
        </Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">
          {UI_TEXT.breadcrumbTools}
        </Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
      </nav>

      <div className="mb-4 sm:mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400 sm:hidden">
          Быстрый инструмент
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
          {UI_TEXT.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          {UI_TEXT.description}
        </p>
      </div>

      <QuickCalculator />
    </div>
  );
}
