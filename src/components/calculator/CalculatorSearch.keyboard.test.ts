/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => React.createElement("a", { href, ...props }, children) }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/analytics", () => ({ trackSearchNoResults: vi.fn(), trackSearchSelection: vi.fn() }));

import CalculatorSearch from "./CalculatorSearch";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

describe("CalculatorSearch keyboard selection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(React.createElement(CalculatorSearch, { calculators: ALL_CALCULATORS_META })));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("clears keyboard selection after the query changes", async () => {
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "плитка");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(input.getAttribute("aria-activedescendant")).toBe("search-result-0");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "бетон");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
  });
});
