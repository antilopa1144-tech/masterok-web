import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import {
  trackCalculatorRelatedClick,
  trackChecklistExport,
  trackChecklistProgress,
  trackChecklistStart,
  trackProjectCreate,
  trackProjectExport,
  trackProjectOpen,
  trackProjectRelatedClick,
  trackSearchNoResults,
  trackSearchSelection,
  trackToolExport,
  trackToolCatalogSelect,
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

  it("передаёт поиск и категорию справочника без текста запроса", () => {
    trackToolStart("normy-raskhoda", "search");
    trackToolModeChange("normy-raskhoda", "category:kraska");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["tool_start", { tool: "normy-raskhoda", source: "search" }],
      ["tool_mode_change", { tool: "normy-raskhoda", mode: "category:kraska" }],
    ]);
  });

  it("измеряет утилиты без выражений и числовых значений", () => {
    trackToolStart("kalkulyator", "calculation");
    trackToolResultView("kalkulyator");
    trackToolStart("konverter", "unit");
    trackToolModeChange("konverter", "group:area");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["tool_start", { tool: "kalkulyator", source: "calculation" }],
      ["tool_result_view", { tool: "kalkulyator" }],
      ["tool_start", { tool: "konverter", source: "unit" }],
      ["tool_mode_change", { tool: "konverter", mode: "group:area" }],
    ]);

    const serializedCalls = JSON.stringify(ym.mock.calls);
    expect(serializedCalls).not.toContain("expression");
    expect(serializedCalls).not.toContain("input_value");
    expect(serializedCalls).not.toContain("density");
  });

  it("отделяет запуск таймера от просмотра запущенного отсчёта", () => {
    trackToolStart("tajmer-skhvatyvaniya", "timer_start");
    trackToolResultView("tajmer-skhvatyvaniya");
    trackToolModeChange("tajmer-skhvatyvaniya", "completed");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["tool_start", { tool: "tajmer-skhvatyvaniya", source: "timer_start" }],
      ["tool_result_view", { tool: "tajmer-skhvatyvaniya" }],
      ["tool_mode_change", { tool: "tajmer-skhvatyvaniya", mode: "completed" }],
    ]);
  });

  it("фиксирует выбор только известного назначения каталога инструментов", () => {
    trackToolCatalogSelect("tool:moy-remont", "tool_grid");
    trackToolCatalogSelect("checklist:ukladka-plitki", "checklist_preview");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["tool_catalog_select", { target: "tool:moy-remont", placement: "tool_grid" }],
      [
        "tool_catalog_select",
        { target: "checklist:ukladka-plitki", placement: "checklist_preview" },
      ],
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

  it("отправляет воронку проектов только с агрегированными параметрами", () => {
    trackProjectCreate("empty");
    trackProjectOpen(0);
    trackProjectOpen(2);
    trackProjectOpen(8);
    trackProjectRelatedClick("calculator:plitka");
    trackProjectExport("csv");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["project_create", { source: "empty" }],
      ["project_open", { source: "catalog", entry_count_bucket: "0" }],
      ["project_open", { source: "catalog", entry_count_bucket: "1-3" }],
      ["project_open", { source: "catalog", entry_count_bucket: "4+" }],
      ["project_related_click", { target: "calculator:plitka" }],
      ["project_export", { format: "csv" }],
    ]);

    const serializedCalls = JSON.stringify(ym.mock.calls);
    expect(serializedCalls).not.toContain("project_id");
    expect(serializedCalls).not.toContain("project_name");
    expect(serializedCalls).not.toContain("price");
  });

  it("отправляет воронку чек-листа без текста пунктов и прогресса пользователя", () => {
    trackChecklistStart("ukladka-plitki");
    trackChecklistProgress("ukladka-plitki", 25);
    trackChecklistProgress("ukladka-plitki", 100);
    trackChecklistExport("ukladka-plitki", "pdf");

    expect(ym.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ["checklist_start", { checklist: "ukladka-plitki" }],
      ["checklist_progress", { checklist: "ukladka-plitki", milestone: 25 }],
      ["checklist_progress", { checklist: "ukladka-plitki", milestone: 100 }],
      ["checklist_export", { checklist: "ukladka-plitki", format: "pdf" }],
    ]);
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
