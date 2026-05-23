"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import ViewportDeferred from "@/components/ui/ViewportDeferred";

const RecentCalculatorsInner = dynamic(
  () => import("@/components/calculator/RecentCalculators"),
  { ssr: false, loading: () => null },
);

const QuickCalculatorInner = dynamic(
  () => import("@/components/tools/QuickCalculator"),
  {
    ssr: false,
    loading: () => (
      <div className="card h-[312px] animate-pulse bg-slate-100 dark:bg-slate-900" />
    ),
  },
);

const ProjectManagerInner = dynamic(
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

/** Недавние калькуляторы — JS только при скролле к блоку. */
export function RecentCalculators() {
  return (
    <ViewportDeferred rootMargin="600px" fallback={null}>
      <RecentCalculatorsInner />
    </ViewportDeferred>
  );
}

/** Боковая панель desktop: быстрый калькулятор монтируется при появлении aside. */
export function QuickCalculator(props: ComponentProps<typeof QuickCalculatorInner>) {
  return (
    <ViewportDeferred rootMargin="200px" minHeight={280}>
      <QuickCalculatorInner {...props} />
    </ViewportDeferred>
  );
}

export function ProjectManager() {
  return (
    <ViewportDeferred rootMargin="200px" minHeight={120}>
      <ProjectManagerInner />
    </ViewportDeferred>
  );
}
