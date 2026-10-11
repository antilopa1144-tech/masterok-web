/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpeningCreationForm from "./OpeningCreationForm";
import { createDefaultProject, type ConstructorProject, type Opening } from "@/lib/constructor/core";
import { createOpeningDraft } from "@/lib/constructor/opening-draft";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

describe("The door and window setup form", () => {
  let container: HTMLDivElement, root: Root, project: ConstructorProject;
  let onConfirm: ReturnType<typeof vi.fn<(opening: Opening) => string | undefined>>;
  let onCancel: ReturnType<typeof vi.fn>;
  const render = async (initialOpening: Opening, editing = false) => {
    await act(async () => root.render(React.createElement(OpeningCreationForm, { project, room: project.rooms[0], initialOpening, editing, blocked: false, onConfirm, onCancel })));
  };
  beforeEach(() => {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    project = createDefaultProject(); onConfirm = vi.fn(() => undefined); onCancel = vi.fn();
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const button = (text: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes(text))!;
  const click = async (text: string) => { await act(async () => button(text).click()); };
  const exact = async (label: string, value: string) => {
    await act(async () => container.querySelector<HTMLButtonElement>(`button[aria-label="Точное значение: ${label}"]`)!.click());
    const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"][type="text"]`)!;
    await act(async () => {
      input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.blur());
  };

  it("confirms a door on the explicitly chosen wall only after setup", async () => {
    await render(createOpeningDraft(project.rooms[0], "door", 0, "door"));
    await click("Стена 3"); await exact("Ширина проёма", "850.5"); await exact("Отступ от угла", "350.25");
    expect(onConfirm).not.toHaveBeenCalled(); expect(project.rooms[0].openings).toEqual([]);
    await click("Добавить дверь");
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ wall: 2, widthMm: 850.5, offsetMm: 350.25, sillMm: 0 });
    expect(container.textContent).toContain("нижнего правого угла");
  });

  it("keeps an invalid draft isolated and allows cancelling unfinished exact input", async () => {
    await render(createOpeningDraft(project.rooms[0], "door", 0, "door"));
    await exact("Ширина проёма", "3001");
    expect(button("Добавить дверь").disabled).toBe(true);
    expect(container.querySelector('input[aria-label="Ширина проёма"][type="text"]')?.getAttribute("aria-invalid")).toBe("true");
    await click("Отмена"); expect(onCancel).toHaveBeenCalledOnce(); expect(onConfirm).not.toHaveBeenCalled();
    expect(project.rooms[0].openings).toEqual([]);
  });

  it("blocks an overlapping opening and enables confirmation on a free wall", async () => {
    project.rooms[0].openings = [createOpeningDraft(project.rooms[0], "door", 0, "existing")];
    await render({ ...project.rooms[0].openings[0], id: "new" });
    expect(button("Добавить дверь").disabled).toBe(true); expect(container.querySelector('[role="alert"]')?.textContent).toContain("пересекаются");
    await click("Стена 2"); expect(button("Добавить дверь").disabled).toBe(false);
    await click("Добавить дверь"); expect(onConfirm.mock.calls[0][0].wall).toBe(1);
    expect(project.rooms[0].openings).toHaveLength(1);
  });

  it("preserves the window size and sill when choosing another wall", async () => {
    await render(createOpeningDraft(project.rooms[0], "window", 0, "window"));
    await exact("Ширина проёма", "1200.5"); await exact("Высота подоконника", "850.5"); await click("Стена 4");
    await click("Добавить окно");
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ wall: 3, widthMm: 1200.5, heightMm: 1400, sillMm: 850.5 });
  });

  it("keeps a full-wall opening valid by reducing its draft offset when width increases", async () => {
    await render(createOpeningDraft(project.rooms[0], "door", 0, "door"));
    await exact("Ширина проёма", "3000");
    expect(button("Добавить дверь").disabled).toBe(false);
    await click("Добавить дверь");
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ widthMm: 3000, offsetMm: 0 });
    expect(project.rooms[0].openings).toEqual([]);
  });

  it("edits existing values without applying intermediate changes", async () => {
    const initial = createOpeningDraft(project.rooms[0], "door", 1, "existing"); project.rooms[0].openings = [initial];
    await render(initial, true); await click("Стена 4"); await exact("Отступ от угла", "400");
    expect(project.rooms[0].openings).toEqual([initial]); expect(onConfirm).not.toHaveBeenCalled();
    await click("Сохранить проём"); expect(onConfirm.mock.calls[0][0]).toMatchObject({ id: "existing", wall: 3, offsetMm: 400 });
  });

  it("repairs an existing out-of-bounds opening after narrowing the room", async () => {
    const initial = createOpeningDraft(project.rooms[0], "door", 0, "existing");
    project.rooms[0].openings = [initial]; project.rooms[0].widthMm = 1000;
    await render(initial, true); expect(button("Сохранить проём").disabled).toBe(true);
    await exact("Отступ от угла", "50"); expect(button("Сохранить проём").disabled).toBe(false);
    await click("Сохранить проём"); expect(onConfirm.mock.calls[0][0]).toMatchObject({ widthMm: 900, offsetMm: 50 });
    expect(project.rooms[0].openings[0].offsetMm).toBe(1050);
  });
});
