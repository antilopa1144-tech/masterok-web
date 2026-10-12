/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, describe, expect, it, vi } from "vitest";
import { calculateProject, createDefaultProject } from "@/lib/constructor/core";
import { createInteriorRoom } from "@/lib/constructor/interiors";
import type { ConstructorVariant } from "@/lib/constructor/workspace";
import VariantComparison from "./VariantComparison";

vi.mock("./MaterialSwatch", () => ({ default: () => null }));
vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

function fixture() {
  const bath = createInteriorRoom("bathroom", []), living = createInteriorRoom("living", []);
  bath.interior!.items = [{ id: "washer", kind: "washer", position: { xMm: 1200.25, yMm: 1600.5, rotationDeg: 0 } }];
  living.interior!.items = [];
  const project = { ...createDefaultProject(), rooms: [bath, living] };
  const first = structuredClone(project.rooms);
  first[0].interior!.items[0].position = { xMm: 1800, yMm: 1999.75, rotationDeg: 90 };
  const variants: ConstructorVariant[] = [
    { id: "first", name: "Машина у стены", rooms: first, savedAt: project.createdAt },
    { id: "second", name: "Только зал", rooms: [structuredClone(living)], savedAt: project.createdAt },
  ];
  return { project, variants, bath, living };
}

describe("Visual constructor variant comparison", () => {
  it.each([
    ["tile", ["Плитка к покупке", "Раскладка плитки"]],
    ["laminate", ["Ламинат к покупке", "Раскрой пола"]],
    ["mixed", ["Ламинат к покупке", "Раскрой пола", "Плитка к покупке", "Раскладка плитки"]],
  ] as const)("shows only assigned material groups for a %s project", async (mode, labels) => {
    const { project, bath, living } = fixture();
    project.rooms = mode === "tile" ? [bath] : mode === "laminate" ? [living] : [bath, living];
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(VariantComparison, { project, calculation: calculateProject(project), variants: [],
        selectedRoomId: project.rooms[0].id, blocked: false, onApply: vi.fn(), onSave: vi.fn(), onContinue: vi.fn(), onRename: vi.fn(), onRemove: vi.fn(), onSelectionChange: vi.fn() })));
      const current = container.querySelector('article[aria-label="Текущий проект"]')!;
      expect([...current.querySelectorAll("dl dt")].map(item => item.textContent)).toEqual(labels);
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("shows exact read-only positions, a missing room and restoration of other rooms", async () => {
    const { project, variants, bath, living } = fixture(), before = structuredClone({ project, variants });
    const onApply = vi.fn(), onSave = vi.fn(), onContinue = vi.fn();
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(VariantComparison, { project, calculation: calculateProject(project), variants,
        selectedRoomId: bath.id, blocked: false, onApply, onSave, onContinue, onRename: vi.fn(), onRemove: vi.fn(), onSelectionChange: vi.fn() })));
      const saved = container.querySelector('article[aria-label="Машина у стены"]')!;
      expect(saved.querySelector('[data-furnishing-id="washer"]')?.getAttribute("data-furnishing-x")).toBe("1800");
      expect(saved.querySelector('[data-furnishing-id="washer"]')?.getAttribute("data-furnishing-y")).toBe("1999.75");
      expect(saved.querySelector('[data-furnishing-id="washer"]')?.getAttribute("data-furnishing-rotation")).toBe("90");
      expect(saved.querySelector('svg [role="button"]')).toBeNull();
      const second = container.querySelector('article[aria-label="Только зал"]')!;
      expect(second.textContent).toContain("Этой комнаты нет в варианте");
      expect(second.querySelector("svg[role=img]")).toBeNull();
      expect(second.textContent).toContain("Помещение будет удалено из текущего проекта");
      const roomSelect = [...container.querySelectorAll<HTMLSelectElement>("select")].find(item => item.parentElement?.textContent?.startsWith("Комната для просмотра"))!;
      await act(async () => { roomSelect.value = living.id; roomSelect.dispatchEvent(new Event("change", { bubbles: true })); });
      expect(second.querySelector('figure')?.getAttribute("aria-label")).toBe(`План комнаты: ${living.name}`);
      expect(onApply).not.toHaveBeenCalled(); expect(onSave).not.toHaveBeenCalled(); expect(onContinue).not.toHaveBeenCalled();
      expect({ project, variants }).toEqual(before);
      await act(async () => [...saved.querySelectorAll("button")].find(button => button.textContent === "Применить")!.click());
      expect(onApply).toHaveBeenCalledExactlyOnceWith(variants[0]);
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("keeps application blocked while a parameter is unfinished", async () => {
    const { project, variants, bath } = fixture(), onApply = vi.fn();
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(VariantComparison, { project, calculation: calculateProject(project), variants,
        selectedRoomId: bath.id, blocked: true, onApply, onSave: vi.fn(), onContinue: vi.fn(), onRename: vi.fn(), onRemove: vi.fn(), onSelectionChange: vi.fn() })));
      const buttons = [...container.querySelectorAll<HTMLButtonElement>("article button")].filter(button => button.textContent === "Применить");
      expect(buttons).toHaveLength(2); expect(buttons.every(button => button.disabled)).toBe(true);
      await act(async () => buttons[0].click()); expect(onApply).not.toHaveBeenCalled();
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("can preview a saved room when the current project is empty, without allowing an empty save", async () => {
    const { project, variants, bath } = fixture(); project.rooms = [];
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(VariantComparison, { project, calculation: calculateProject(project), variants,
        selectedRoomId: "", blocked: false, onApply: vi.fn(), onSave: vi.fn(), onContinue: vi.fn(), onRename: vi.fn(), onRemove: vi.fn(), onSelectionChange: vi.fn() })));
      const current = container.querySelector('article[aria-label="Текущий проект"]')!;
      expect(current.textContent).toContain("Этой комнаты нет в варианте.");
      expect(current.querySelector('svg[role="img"]')).toBeNull();
      const saved = container.querySelector('article[aria-label="Машина у стены"]')!;
      expect(saved.querySelector('figure')?.getAttribute("aria-label")).toBe(`План комнаты: ${bath.name}`);
      expect([...container.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Сохранить вариант")?.disabled).toBe(true);
    } finally { await act(async () => root.unmount()); container.remove(); }
  });
});
