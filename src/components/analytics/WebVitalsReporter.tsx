"use client";

import { useReportWebVitals } from "next/web-vitals";
import { Suspense } from "react";
import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";

/**
 * Real User Monitoring — отправляет Web Vitals (LCP, INP, CLS, FCP, TTFB)
 * в Яндекс.Метрику как параметры визита.
 */

type YmFunction = (counter: number, method: string, ...args: unknown[]) => void;

function getYm(): YmFunction | undefined {
  const w = window as unknown as { ym?: YmFunction };
  return w.ym;
}

function reportMetric(metric: {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  navigationType: string;
}) {
  const ym = getYm();
  if (!ym) return;

  if (!YANDEX_METRIKA_COUNTER_ID) return;

  ym(YANDEX_METRIKA_COUNTER_ID, "params", {
    [`web_vital_${metric.name.toLowerCase()}`]: Math.round(metric.value),
    [`web_vital_${metric.name.toLowerCase()}_rating`]: metric.rating,
    web_vital_navigation: metric.navigationType,
  });
}

function WebVitalsInner() {
  useReportWebVitals(reportMetric);
  return null;
}

export default function WebVitalsReporter() {
  return (
    <Suspense fallback={null}>
      <WebVitalsInner />
    </Suspense>
  );
}
