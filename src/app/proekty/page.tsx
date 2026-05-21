import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import ProjectsPageClient from "./ProjectsPageClient";

export const metadata: Metadata = {
  title: `Мой ремонт — сметы и закупка материалов — ${SITE_NAME}`,
  description:
    "Сохраняйте расчёты калькуляторов в проекты: сводная смета, цены материалов, отметки «куплено», экспорт CSV и печать списка закупки.",
  alternates: { canonical: `${SITE_URL}/proekty/` },
};

export default function ProektyPage() {
  return (
    <div className="page-container py-8">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Мой ремонт</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Мой ремонт
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
            Проекты по объекту: сохранённые расчёты, сводная смета, цены и список к покупке.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-auto">
          <Link href="/instrumenty/moy-remont/" className="btn-primary text-sm">
            Мастер по комнате
          </Link>
          <Link href="/instrumenty/kalendar-remonta/" className="btn-secondary text-sm">
            Календарь этапов
          </Link>
          <Link
            href="/kalkulyatory/"
            className="btn-secondary text-sm"
          >
            Калькуляторы
          </Link>
        </div>
      </div>

      {/* Подсказка */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
        <strong>Как работает:</strong>{" "}
        <Link href="/instrumenty/moy-remont/" className="font-semibold underline">
          мастер по комнате
        </Link>{" "}
        или отдельный калькулятор → «Посчитать» → <strong>«В проект»</strong>. Сводная смета обновится здесь.
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
