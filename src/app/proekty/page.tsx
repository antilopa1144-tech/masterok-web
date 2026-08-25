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
    <div className="page-container py-5 sm:py-8">
      {/* Хлебные крошки */}
      <nav className="mb-6 hidden items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 sm:flex">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Мой ремонт</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Мой ремонт
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
            Все расчёты объекта в одном месте: материалы, цены и отметки о покупке.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:self-auto">
          <Link href="/instrumenty/moy-remont/" className="btn-primary text-sm">
            Мастер по комнате
          </Link>
          <Link href="/instrumenty/kalendar-remonta/" className="btn-secondary text-sm">
            Календарь этапов
          </Link>
        </div>
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
