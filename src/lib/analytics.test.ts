import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import {
  trackToolExport,
  trackToolModeChange,
  trackToolPresetSelect,
  trackToolRelatedClick,
  trackToolResultView,
  trackToolStart,
} from "@/lib/analytics";

describe("tool analytics", () => {
  const ym = vi.fn();

  beforeEach(() => {
    ym.mockClear();
    vi.stubGlobal("window", { ym });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("отправляет этапы воронки визуального инструмента", () => {
    trackToolStart("raskladka-plitki", "surface_size");
    trackToolResultView("raskladka-plitki");

    expect(ym).toHaveBeenNthCalledWith(
      1,
      YANDEX_METRIKA_COUNTER_ID,
      "reachGoal",
      "tool_start",
      { tool: "raskladka-plitki", source: "surface_size" },
    );
    expect(ym).toHaveBeenNthCalledWith(
      2,
      YANDEX_METRIKA_COUNTER_ID,
      "reachGoal",
      "tool_result_view",
      { tool: "raskladka-plitki" },
    );
  });

  it("передаёт режим, пресет, экспорт и переход без пользовательских данных", () => {
    trackToolModeChange("raskladka-laminata", "deck-half");
    trackToolPresetSelect("raskladka-laminata", "surface", "Спальня 3×4 м");
    trackToolExport("raskladka-laminata", "png");
    trackToolRelatedClick("raskladka-laminata", "laminat-calculator");

    expect(ym.mock.calls.map((call) => call[2])).toEqual([
      "tool_mode_change",
      "tool_preset_select",
      "tool_export",
      "tool_related_click",
    ]);
  });
});
