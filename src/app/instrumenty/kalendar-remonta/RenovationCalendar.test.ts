/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("@/components/tools/useToolAnalytics", () => ({ useToolAnalytics: () => ({ markStarted: vi.fn() }) }));
vi.mock("@/components/renovation/RenovationHubStrip", () => ({ default: () => null }));
vi.mock("@/lib/analytics", () => ({ trackToolModeChange: vi.fn(), trackToolRelatedClick: vi.fn() }));

import RenovationCalendar from "./RenovationCalendar";

describe("RenovationCalendar hydration", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    window.localStorage.clear();
  });

  it("restores saved scenario without URL and allows collapsing its first stage", async () => {
    window.localStorage.setItem("masterok:renovation-calendar:v2", JSON.stringify({
      scenarioId: "kitchen", startDate: null, completedStageIds: [], completedTaskKeys: [],
    }));
    container = document.createElement("div");
    container.innerHTML = renderToString(createElement(RenovationCalendar));
    document.body.append(container);
    await act(async () => {
      root = hydrateRoot(container!, createElement(RenovationCalendar));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Кухня");
    const stageButton = container.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
    expect(stageButton).toBeTruthy();
    await act(async () => stageButton?.click());
    expect(stageButton?.getAttribute("aria-expanded")).toBe("false");
  });
});
