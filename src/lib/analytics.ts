/**
 * Lightweight analytics event helper.
 * Sends goals/events to Yandex.Metrika and Google Analytics when available.
 */

import { GOOGLE_ANALYTICS_ID, YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import {
  getSearchQueryMetrics,
  type AnalyticsEventName,
  type AnalyticsEventParams,
  type SearchResultType,
  type ToolInteractionSource,
} from "@/lib/analytics/events";
export type { ToolInteractionSource } from "@/lib/analytics/events";
import { isProductionAnalyticsBrowser } from "@/lib/analytics/runtime";

export function trackEvent<EventName extends AnalyticsEventName>(
  target: EventName,
  params: AnalyticsEventParams[EventName],
): void {
  if (!isProductionAnalyticsBrowser()) return;
  try {
    if (YANDEX_METRIKA_COUNTER_ID) {
      window.ym?.(YANDEX_METRIKA_COUNTER_ID, "reachGoal", target, params);
    }
    if (GOOGLE_ANALYTICS_ID) {
      window.gtag?.("event", target, params);
    }
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

export function trackCalculatorResultView(calculatorSlug: string): void {
  trackEvent("calculator_result_view", { calculator: calculatorSlug });
}

export function trackCalculatorValidationError(
  calculatorSlug: string,
  invalidFieldCount: number,
  firstInvalidField: string,
): void {
  trackEvent("calculator_validation_error", {
    calculator: calculatorSlug,
    invalid_field_count: invalidFieldCount,
    first_invalid_field: firstInvalidField,
  });
}

export function trackCalculatorShare(
  calculatorSlug: string,
  method: "native" | "clipboard",
): void {
  trackEvent("calculator_share", { calculator: calculatorSlug, method });
}

export function trackSearchSelection(
  query: string,
  resultType: SearchResultType,
  resultId: string,
): void {
  trackEvent("site_search_select", {
    ...getSearchQueryMetrics(query),
    result_type: resultType,
    result_id: resultId,
  });
}

export function trackSearchNoResults(query: string): void {
  trackEvent("site_search_empty", getSearchQueryMetrics(query));
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

export function trackToolStart(tool: string, source: ToolInteractionSource): void {
  trackEvent("tool_start", { tool, source });
}

export function trackToolResultView(tool: string): void {
  trackEvent("tool_result_view", { tool });
}

export function trackToolModeChange(tool: string, mode: string): void {
  trackEvent("tool_mode_change", { tool, mode });
}

export function trackToolPresetSelect(
  tool: string,
  presetGroup: "surface" | "material",
  preset: string,
): void {
  trackEvent("tool_preset_select", {
    tool,
    preset_group: presetGroup,
    preset,
  });
}

export function trackToolExport(tool: string, format: "png" | "pdf" | "share"): void {
  trackEvent("tool_export", { tool, format });
}

export function trackToolRelatedClick(tool: string, target: string): void {
  trackEvent("tool_related_click", { tool, target });
}

export function trackCalculatorRelatedClick(calculator: string, target: string): void {
  trackEvent("calculator_related_click", { calculator, target });
}

