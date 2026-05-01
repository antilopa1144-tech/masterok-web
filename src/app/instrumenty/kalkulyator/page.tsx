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
    <div className="page-container py-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 mb-6">
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

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        {UI_TEXT.title}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">{UI_TEXT.description}</p>

      <QuickCalculator />
    </div>
  );
}
