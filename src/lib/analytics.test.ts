import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import {
  trackCalculatorRelatedClick,
  trackSearchNoResults,
  trackSearchSelection,
  trackToolExport,
  trackToolModeChange,
  trackToolPresetSelect,
  trackToolRelatedClick,
  trackToolResultView,
  trackToolStart,
} from "@/lib/analytics";

describe("tool analytics", () => {
  const ym = vi.fn();
  const gtag = vi.fn();

  beforeEach(() => {
    ym.mockClear();
    gtag.mockClear();
    vi.stubGlobal("window", {
      location: { hostname: "getmasterok.ru" },
      ym,
      gtag,
    });
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
    expect(gtag).toHaveBeenNthCalledWith(
      1,
      "event",
      "tool_start",
      { tool: "raskladka-plitki", source: "surface_size" },
    );
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      "event",
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

  it("фиксирует переход из калькулятора в связанный инструмент", () => {
    trackCalculatorRelatedClick("laminat", "raskladka-laminata");

    expect(ym).toHaveBeenCalledWith(
      YANDEX_METRIKA_COUNTER_ID,
      "reachGoal",
      "calculator_related_click",
      { calculator: "laminat", target: "raskladka-laminata" },
    );
  });

  it("не загрязняет production-счётчики с localhost", () => {
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      ym,
      gtag,
    });

    trackToolStart("raskladka-plitki", "surface_size");

    expect(ym).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  });

  it("не отправляет сырой поисковый запрос и возможные персональные данные", () => {
    const rawQuery = "Иван +7 999 123-45-67 ищет плитку";

    trackSearchSelection(rawQuery, "calculator", "plitka");
    trackSearchNoResults(rawQuery);

    const serializedCalls = JSON.stringify(ym.mock.calls);
    expect(serializedCalls).not.toContain("Иван");
    expect(serializedCalls).not.toContain("999");
    expect(ym.mock.calls[0]?.[3]).toEqual({
      query_length: 33,
      query_word_count: 6,
      result_type: "calculator",
      result_id: "plitka",
    });
    expect(ym.mock.calls[1]?.[3]).toEqual({
      query_length: 33,
      query_word_count: 6,
    });
  });
});
