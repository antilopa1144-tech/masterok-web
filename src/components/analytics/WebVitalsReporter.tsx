"use client";

import { useReportWebVitals } from "next/web-vitals";
import { Suspense } from "react";

/**
 * Real User Monitoring — отправляет Web Vitals (LCP, INP, CLS, FCP, TTFB)
 * в Яндекс.Метрику как достижение целей и параметры визита.
 *
 * Использует нативный хук Next.js useReportWebVitals — без дополнительных
 * зависимостей. Данные уходят только в production (YM определена).
 *
 * Метрика получает:
 *  - goal 'web_vitals' — с параметрами LCP, FCP, TTFB, CLS, INP
 *  - userParams — browser_size, effective_connection_type
 */

function reportMetric(metric: {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  navigationType: string;
}) {
  const ym = (window as Record<string, unknown>)["ym"] as
    | ((counter: number, action: string, event: string, params?: Record<string, unknown>) => void)
    | undefined;

  if (!ym) return;

  const counter = parseInt(process.env.NEXT_PUBLIC_YM_COUNTER ?? "0", 10);
  if (!counter) return;

  // Отправляем каждый Web Vital как параметр визита + достижение цели
  ym(counter, "params", {
    [`web_vital_${metric.name.toLowerCase()}`]: Math.round(metric.value),
    [`web_vital_${metric.name.toLowerCase()}_rating`]: metric.rating,
    web_vital_navigation: metric.navigationType,
  });

  // Для LCP и INP дополнительно шлём как цель (для воронок в Метрике)
  if (metric.name === "LCP" || metric.name === "INP") {
    ym(counter, "reachGoal", `web_vital_${metric.name.toLowerCase()}`, {
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  }
}

function WebVitalsInner() {
  useReportWebVitals(reportMetric);
  return null;
}

/** Загружается только в браузере — не влияет на SSR. */
export default function WebVitalsReporter() {
  if (typeof window === "undefined") return null;
  return (
    <Suspense fallback={null}>
      <WebVitalsInner />
    </Suspense>
  );
}
