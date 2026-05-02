import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import ProjectsPageClient from "./ProjectsPageClient";

export const metadata: Metadata = {
  title: `Мои проекты и сметы — ${SITE_NAME}`,
  description: "Сохранённые расчёты, сводные сметы по проектам и ориентировочная стоимость материалов.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/proekty/` },
};

export default function ProektyPage() {
  return (
    <div className="page-container py-8">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Мои проекты</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Мои проекты
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
            Сохранённые расчёты, сводные сметы и ориентировочная стоимость материалов.
          </p>
        </div>
        <Link
          href="/kalkulyatory/"
          className="btn-primary shrink-0 self-start sm:self-auto text-sm"
        >
          + Новый расчёт
        </Link>
      </div>

      {/* Подсказка */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
        <strong>Как работает:</strong> откройте любой калькулятор, выполните расчёт, введите цены материалов и нажмите <strong>«В проект»</strong>. Смета обновится автоматически.
      </div>

      <Suspense fallback={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      }>
        <ProjectsPageClient />
      </Suspense>
    </div>
  );
}
