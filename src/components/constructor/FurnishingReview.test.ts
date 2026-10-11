/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FurnishingReview from "./FurnishingReview";
import { createInteriorRoom } from "@/lib/constructor/interiors";
import { reviewFurnishings, type FurnishingReviewItem } from "@/lib/constructor/furnishing-review";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

describe("Visible room-wide furnishing remarks", () => {
  let container: HTMLDivElement, root: Root;
  let onInspect: ReturnType<typeof vi.fn<(id: string) => void>>;
  const render = async (items: FurnishingReviewItem[], blocked = false) => {
    await act(async () => root.render(React.createElement(FurnishingReview, { items, blocked, onInspect })));
  };
  beforeEach(() => {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container); onInspect = vi.fn();
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("does not present a clear model as a validated installation project", async () => {
    await render([]);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Замечаний к размещённым габаритам нет");
    expect(container.textContent).toContain("Зоны у дверей и окон условные");
    expect(container.textContent).toContain("монтажные зазоры нужно проверить отдельно");
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("opens the correct duplicate instance rather than only its furniture kind", async () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior!.items = ["one", "two"].map((id) => ({ id, kind: "washer", position: { xMm: 100, yMm: 100, rotationDeg: 0 } }));
    await render(reviewFurnishings(room));
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Предметов с замечаниями: 2");
    expect(container.textContent).toContain("Пересечение с предметом");
    const button = container.querySelector<HTMLButtonElement>('[aria-label="Проверить предмет: Стиральная машина 2"]')!;
    await act(async () => button.click());
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("two");
  });

  it("also offers inspection of an omitted item and blocks it while an input is unfinished", async () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior!.items = [{ id: "bath", kind: "bathtub", dimensions: { widthMm: 5000, depthMm: 5000, heightMm: 1000 } }];
    await render(reviewFurnishings(room), true);
    expect(container.textContent).toContain("Не размещён");
    const button = container.querySelector<HTMLButtonElement>("button")!;
    await act(async () => button.click()); expect(onInspect).not.toHaveBeenCalled();
    await render(reviewFurnishings(room));
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("bath");
  });
});
