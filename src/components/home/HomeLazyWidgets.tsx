"use client";

import dynamic from "next/dynamic";

export const RecentCalculators = dynamic(
  () => import("@/components/calculator/RecentCalculators"),
  {
    ssr: false,
    loading: () => null,
  },
);

export const QuickCalculator = dynamic(
  () => import("@/components/tools/QuickCalculator"),
  {
    ssr: false,
    loading: () => (
      <div className="card h-[312px] animate-pulse bg-slate-100 dark:bg-slate-900" />
    ),
  },
);

export const ProjectManager = dynamic(
  () => import("@/components/calculator/ProjectManager"),
  {
    ssr: false,
    loading: () => (
      <div className="card p-6 text-center space-y-3">
        <div className="text-3xl">📁</div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Мои проекты</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Создайте проект для группировки расчётов.</p>
      </div>
    ),
  },
);
