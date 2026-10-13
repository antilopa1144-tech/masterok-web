/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.search) }));
vi.mock("@/components/tools/useToolAnalytics", () => ({ useToolAnalytics: () => ({ markStarted: vi.fn(), selectMode: vi.fn() }) }));
vi.mock("@/components/calculator/SaveToProjectButton", () => ({ default: () => null }));
vi.mock("@/components/commerce/SaveLayoutToProject", () => ({ default: () => null }));
import SheetLayoutGenerator from "./SheetLayoutGenerator";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

describe("sheet URL initialization", () => {
  let root: Root;
  let host: HTMLDivElement;
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  it.each([["", 5], ["reservePercent=0", 0]])("preserves the reserve for query %s", async (search, reserve) => {
    navigation.search = String(search);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(SheetLayoutGenerator)));
    expect(host.textContent).toContain(`запас ${reserve}%`);
  });
});
