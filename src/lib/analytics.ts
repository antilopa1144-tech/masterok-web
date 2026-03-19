/**
 * Lightweight analytics event helper.
 * Sends goals/events to Yandex.Metrika when available.
 */

const YM_COUNTER = typeof window !== "undefined"
  ? Number(process.env.NEXT_PUBLIC_YM_COUNTER || 0)
  : 0;

export function trackEvent(
  target: string,
  params?: Record<string, unknown>,
): void {
  if (!YM_COUNTER || typeof window === "undefined") return;
  try {
    (window as any).ym?.(YM_COUNTER, "reachGoal", target, params);
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

export function trackExport(
  calculatorSlug: string,
  format: "pdf" | "excel",
  mode: string,
): void {
  trackEvent("calculator_export", {
    calculator: calculatorSlug,
    format,
    accuracy_mode: mode,
  });
}
