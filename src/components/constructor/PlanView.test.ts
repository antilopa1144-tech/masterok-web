/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, describe, expect, it, vi } from "vitest";
import PlanView from "./PlanView";
import { calculateProject, createDefaultProject } from "@/lib/constructor/core";
import { createInteriorRoom } from "@/lib/constructor/interiors";
vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

describe("Dragging with icons in the plan toolbar", () => {
  it("converts pointer movement using the room SVG rather than a toolbar icon", async () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior!.items = [{ id: "washer", kind: "washer", position: { xMm: 1200.25, yMm: 1500.5, rotationDeg: 0 } }];
    const calculation = calculateProject({ ...createDefaultProject(), rooms: [room] }).rooms[0];
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container), onPosition = vi.fn();
    try {
      await act(async () => root.render(React.createElement(PlanView, { room, calculation, numbers: false, furnished: true, editing: true, selectedId: "washer", onPosition, onSelect: vi.fn(), onSelectFurnishing: vi.fn() })));
      const wrapper = container.querySelector<HTMLElement>('[aria-label="Редактор расстановки предметов"]')!;
      const object = container.querySelector('g[data-furnishing-id="washer"]')!;
      const drawing = object.closest("svg")!;
      expect(container.querySelector("svg")).not.toBe(drawing);
      for (const svg of container.querySelectorAll("svg")) Object.defineProperty(svg, "getScreenCTM", { configurable: true, value: () => null });
      Object.defineProperty(drawing, "getScreenCTM", { configurable: true, value: () => ({ inverse: () => ({}) }) });
      Object.defineProperty(drawing, "createSVGPoint", { value: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x * 10, y: this.y * 10 }; } }) });
      Object.assign(wrapper, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
      const pointer = async (type: string, x: number, y: number) => {
        const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
        Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
        await act(async () => (type === "pointerdown" ? object : wrapper).dispatchEvent(event));
      };
      await pointer("pointerdown", 10, 10); await pointer("pointermove", 15, 15); await pointer("pointerup", 15, 15);
      expect(onPosition).toHaveBeenCalledExactlyOnceWith("washer", { xMm: 1250, yMm: 1550, rotationDeg: 0 });
    } finally { await act(async () => root.unmount()); container.remove(); }
  });
});
