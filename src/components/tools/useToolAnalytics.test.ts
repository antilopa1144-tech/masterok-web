/* @vitest-environment jsdom */

import { act, createElement, Fragment, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/analytics", () => ({
  trackToolModeChange: vi.fn(),
  trackToolResultView: vi.fn(),
  trackToolStart: vi.fn(),
}));

import { trackToolResultView, trackToolStart } from "@/lib/analytics";
import { useToolAnalytics } from "./useToolAnalytics";

function Harness({ resultReady }: { resultReady: boolean }) {
  const resultRef = useRef<HTMLDivElement>(null);
  const { markStarted } = useToolAnalytics("test-tool", resultRef, resultReady);

  return createElement(
    Fragment,
    null,
    createElement(
      "button",
      { type: "button", onClick: () => markStarted("surface_size") },
      "Начать",
    ),
    createElement("div", { ref: resultRef }, "Результат"),
  );
}

describe("useToolAnalytics", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("ждёт корректный результат и отправляет его просмотр один раз", async () => {
    await act(async () => root.render(createElement(Harness, { resultReady: false })));
    await act(async () => container.querySelector("button")?.click());

    expect(trackToolStart).toHaveBeenCalledWith("test-tool", "surface_size");
    expect(trackToolResultView).not.toHaveBeenCalled();

    await act(async () => root.render(createElement(Harness, { resultReady: true })));
    expect(trackToolResultView).toHaveBeenCalledTimes(1);
    expect(trackToolResultView).toHaveBeenCalledWith("test-tool");

    await act(async () => root.render(createElement(Harness, { resultReady: false })));
    await act(async () => root.render(createElement(Harness, { resultReady: true })));
    expect(trackToolResultView).toHaveBeenCalledTimes(1);
  });
});
