/* @vitest-environment jsdom */

import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalculateFn } from "@/lib/calculators/types";
import type { CalculatorWidgetProps } from "./useCalculator";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const registry = vi.hoisted(() => ({ getCalculateFn: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/calculators/registry", () => registry);
vi.mock("@/lib/storage/history", () => ({
  addCalculationHistory: vi.fn(async () => []),
  getAccuracyModeSetting: vi.fn(async () => null),
  getCalculationHistory: vi.fn(async () => []),
  setAccuracyModeSetting: vi.fn(async () => undefined),
}));
vi.mock("@/lib/analytics", () => ({
  trackAccuracyModeChange: vi.fn(),
  trackAccuracyModeCalculation: vi.fn(),
  trackCalculatorShare: vi.fn(),
  trackCalculatorStart: vi.fn(),
  trackCalculatorValidationError: vi.fn(),
  trackComparisonOpen: vi.fn(),
}));

import { useCalculator } from "./useCalculator";

const calculator: CalculatorWidgetProps = {
  id: "test",
  slug: "test",
  lastModified: "2026-09-20",
  title: "Тест",
  h1: "Тест",
  description: "Тест",
  metaTitle: "Тест",
  metaDescription: "Тест",
  category: "interior",
  categorySlug: "vnutrennyaya-otdelka",
  tags: [],
  popularity: 1,
  complexity: 1,
  fields: [{
    key: "area",
    label: "Площадь",
    type: "number",
    unit: "м²",
    min: 1,
    max: 1000,
    defaultValue: 10,
  }],
};

let latest: ReturnType<typeof useCalculator>;

function Harness() {
  const calculatorState = useCalculator(calculator);
  useEffect(() => {
    latest = calculatorState;
  }, [calculatorState]);
  return null;
}

describe("useCalculator — сброс", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.useFakeTimers();
    registry.getCalculateFn.mockReset();
    router.replace.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(Harness)));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("не возвращает результат запроса, который завершился после сброса", async () => {
    let resolveCalculateFn: ((value: CalculateFn) => void) | undefined;
    registry.getCalculateFn.mockImplementation(() => new Promise<CalculateFn>((resolve) => {
      resolveCalculateFn = resolve;
    }));

    await act(async () => latest.handleChange("area", 25));
    await act(async () => vi.advanceTimersByTime(300));
    expect(registry.getCalculateFn).toHaveBeenCalledTimes(1);

    await act(async () => latest.handleReset());
    await act(async () => {
      resolveCalculateFn?.((inputs) => ({
        materials: [],
        totals: { area: inputs.area },
        warnings: [],
      }));
      await Promise.resolve();
    });

    expect(latest.values.area).toBe(10);
    expect(latest.result).toBeNull();
    expect(latest.hasCalculated).toBe(false);
  });

  it("при смене точности во время отложенного расчёта применяет только последний режим", async () => {
    const resolvers: Array<(value: CalculateFn) => void> = [];
    registry.getCalculateFn.mockImplementation(() => new Promise<CalculateFn>((resolve) => resolvers.push(resolve)));

    await act(async () => latest.handleChange("area", 25));
    await act(async () => vi.advanceTimersByTime(300));
    expect(resolvers).toHaveLength(1);

    await act(async () => latest.handleAccuracyModeChange("professional"));
    expect(resolvers).toHaveLength(2);

    const stale = vi.fn(() => ({ materials: [], totals: { area: 1 }, warnings: [] }));
    const latestCalculate = vi.fn((inputs) => ({ materials: [], totals: { area: inputs.accuracyMode }, warnings: [] }));
    await act(async () => {
      resolvers[0](stale);
      resolvers[1](latestCalculate);
      await Promise.resolve();
    });

    expect(stale).not.toHaveBeenCalled();
    expect(latestCalculate).toHaveBeenCalledWith(expect.objectContaining({ area: 25, accuracyMode: "professional" }));
    expect(latest.result?.totals.area).toBe("professional");
  });
});
