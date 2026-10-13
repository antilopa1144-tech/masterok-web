/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Checklist } from "@/lib/checklists";
import InteractiveChecklist from "./InteractiveChecklist";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/analytics", () => ({
  trackChecklistProgress: vi.fn(),
  trackChecklistStart: vi.fn(),
}));

const checklist: Checklist = {
  slug: "ui-storage-blocked",
  lastModified: "2026-10-13",
  title: "Проверка",
  description: "",
  category: "",
  categoryIcon: "✓",
  complexity: 1,
  totalItems: 1,
  duration: "",
  steps: [{ title: "Первый этап", items: ["Первый пункт"] }],
};

describe("InteractiveChecklist hydration", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
  });

  it("keeps checkbox state interactive when localStorage is blocked after hydration", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    container = document.createElement("div");
    container.innerHTML = renderToString(createElement(InteractiveChecklist, { checklist }));
    document.body.append(container);

    await act(async () => {
      root = hydrateRoot(container!, createElement(InteractiveChecklist, { checklist }));
      await Promise.resolve();
    });

    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(input?.disabled).toBe(false);
    await act(async () => input?.click());
    expect(input?.checked).toBe(true);
  });
});
