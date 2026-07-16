/**
 * Lightweight analytics event helper.
 * Sends goals/events to Yandex.Metrika when available.
 */

import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";

export function trackEvent(
  target: string,
  params?: Record<string, unknown>,
): void {
  if (!YANDEX_METRIKA_COUNTER_ID || typeof window === "undefined") return;
  try {
    (window as any).ym?.(YANDEX_METRIKA_COUNTER_ID, "reachGoal", target, params);
  } catch {
    // silently ignore analytics errors
  }
}

// ── Predefined events ───────────────────────────────────────────────────────

export function trackAccuracyModeChange(
  calculatorSlug: string,
  fromMode: string,
  toMode: string,
): void {
  trackEvent("accuracy_mode_change", {
    calculator: calculatorSlug,
    from: fromMode,
    to: toMode,
  });
}

export function trackAccuracyModeCalculation(
  calculatorSlug: string,
  mode: string,
): void {
  trackEvent("calculator_calculate", {
    calculator: calculatorSlug,
    accuracy_mode: mode,
  });
}

export function trackComparisonOpen(calculatorSlug: string): void {
  trackEvent("accuracy_comparison_open", {
    calculator: calculatorSlug,
  });
}

export function trackCalculatorStart(calculatorSlug: string): void {
  trackEvent("calculator_start", { calculator: calculatorSlug });
}

function safeSearchQuery(query: string): string {
  const value = query.trim().replace(/\s+/g, " ").slice(0, 80);
  const looksLikeEmail = /\S+@\S+\.\S+/.test(value);
  const looksLikePhone = /(?:\+?7|8)[\s()-]*\d(?:[\s()-]*\d){9}/.test(value);
  return looksLikeEmail || looksLikePhone ? "[redacted]" : value;
}

export function trackSearchSelection(
  query: string,
  resultType: string,
  resultId: string,
): void {
  trackEvent("site_search_select", {
    query: safeSearchQuery(query),
    result_type: resultType,
    result_id: resultId,
  });
}

export function trackSearchNoResults(query: string): void {
  trackEvent("site_search_empty", { query: safeSearchQuery(query) });
}

export function trackExport(calculatorName: string, format: "pdf" | "excel"): void {
  trackEvent("calculator_export", { calculator: calculatorName, format });
}

export function trackProjectSave(calculatorId: string, createdProject: boolean): void {
  trackEvent("project_save_calculation", {
    calculator: calculatorId,
    created_project: createdProject,
  });
}

export function trackRuStoreClick(placement: string): void {
  trackEvent("rustore_click", { placement });
}

