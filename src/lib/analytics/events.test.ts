import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_DEFINITIONS } from "./events";

const EXPECTED_EVENTS = [
  "accuracy_comparison_open",
  "accuracy_mode_change",
  "calculator_calculate",
  "calculator_export",
  "calculator_related_click",
  "calculator_result_view",
  "calculator_share",
  "calculator_start",
  "calculator_validation_error",
  "project_create",
  "project_export",
  "project_open",
  "project_related_click",
  "project_save_calculation",
  "rustore_click",
  "site_search_empty",
  "site_search_select",
  "tool_export",
  "tool_mode_change",
  "tool_preset_select",
  "tool_related_click",
  "tool_result_view",
  "tool_start",
].sort();

describe("analytics event contract", () => {
  it("фиксирует полный закрытый каталог продуктовых событий", () => {
    expect(Object.keys(ANALYTICS_EVENT_DEFINITIONS).sort()).toEqual(EXPECTED_EVENTS);
  });

  it("назначает владельца, KPI-роль, PII-правило и дедупликацию каждому событию", () => {
    for (const definition of Object.values(ANALYTICS_EVENT_DEFINITIONS)) {
      expect(definition.owner).toBe("product");
      expect(["primary", "driver", "guardrail", "diagnostic"]).toContain(definition.kpiRole);
      expect(definition.pii).toBe("none");
      expect(definition.trigger.length).toBeGreaterThan(10);
      expect(definition.dedupe.length).toBeGreaterThan(5);
    }
  });

  it("не даёт документации расходиться с каталогом", () => {
    const contract = readFileSync(
      path.join(process.cwd(), "docs", "analytics-event-contract.md"),
      "utf8",
    );

    for (const eventName of EXPECTED_EVENTS) {
      expect(contract).toContain(`\`${eventName}\``);
    }
  });
});
