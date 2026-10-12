/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlanMovementControls from "./PlanMovementControls";
import type { FurnishingDirection, FurnishingMovementStep } from "@/lib/constructor/furnishing-movement";

vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());
describe("Touch controls for precise plan movement", () => {
  let root: Root, container: HTMLDivElement;
  let onMove: ReturnType<typeof vi.fn<(direction: FurnishingDirection) => void>>, onStep: ReturnType<typeof vi.fn<(step: FurnishingMovementStep) => void>>;
  const render = async (step: FurnishingMovementStep = 10, blocked = false) => {
    await act(async () => root.render(React.createElement(PlanMovementControls, { step, blocked, canMove: d => d !== "left", onMove, onStep })));
  };
  beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); onMove = vi.fn(); onStep = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it("selects a fine step and labels the resulting tap accurately", async () => {
    await render(); const select = container.querySelector("select")!;
    await act(async () => { select.value = "1"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(onStep).toHaveBeenCalledExactlyOnceWith(1);
    await render(1);
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Сдвинуть предмет вправо на 1 мм"]')!.click());
    expect(onMove).toHaveBeenCalledExactlyOnceWith("right");
  });
  it("does not issue a move towards a wall or during an unfinished input", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Сдвинуть предмет влево на 10 мм"]')!.click());
    expect(onMove).not.toHaveBeenCalled();
    await render(100, true);
    expect(container.querySelector("select")!.disabled).toBe(true);
    expect(Array.from(container.querySelectorAll("button")).every(b => b.disabled)).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Сдвинуть предмет вправо на 100 мм"]')!.click());
    expect(onMove).not.toHaveBeenCalled();
  });
});
