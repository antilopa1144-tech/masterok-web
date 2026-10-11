/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RoomCreationForm from "./RoomCreationForm";
import { createDefaultProject, validateProject, type ConstructorRoom } from "@/lib/constructor/core";
import { presetFor } from "@/lib/constructor/interiors";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

describe("Preparing a room before adding it to the project", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onCreate: ReturnType<typeof vi.fn<(room: ConstructorRoom) => string | undefined>>;
  let onCancel: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container); onCreate = vi.fn(() => undefined); onCancel = vi.fn();
    await act(async () => root.render(React.createElement(RoomCreationForm, { existingNames: ["Гостиная", "Ванная"], blocked: false, onCreate, onCancel })));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const button = (text: string) => Array.from(container.querySelectorAll("button")).find((element) => element.textContent?.includes(text))!;
  const click = async (text: string) => { await act(async () => button(text).click()); };
  const enter = async (label: string, value: string) => {
    const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"][type="text"]`)!;
    await act(async () => {
      input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.blur());
  };

  it("creates a separate bathroom with the existing preset and a unique suggested name only after confirmation", async () => {
    await click("Ванная"); await click("Далее: размеры");
    expect(onCreate).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Название помещения"]')?.value).toBe("Ванная 2");
    await click("Добавить помещение");
    const added = onCreate.mock.calls[0][0];
    expect(added).toMatchObject({ name: "Ванная 2", widthMm: presetFor("bathroom").widthMm, lengthMm: presetFor("bathroom").lengthMm, heightMm: 2700, interior: { type: "bathroom" }, floor: { kind: "tile" }, openings: [] });
    expect(validateProject({ ...createDefaultProject(), rooms: [added] })).toEqual([]);
  });

  it("keeps entered dimensions and the name when the user returns to choose another type", async () => {
    await click("Далее: размеры"); await enter("Название помещения", "Моя кухня");
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Увеличить: Ширина"]')!.click());
    await click("Изменить тип"); await click("Кухня"); await click("Далее: размеры"); await click("Добавить помещение");
    expect(onCreate.mock.calls[0][0]).toMatchObject({ name: "Моя кухня", widthMm: 3001, lengthMm: presetFor("kitchen").lengthMm, interior: { type: "kitchen" } });
  });

  it("cancels unfinished input without adding any room", async () => {
    await click("Далее: размеры"); await enter("Название помещения", "");
    expect(button("Добавить помещение").disabled).toBe(true);
    await click("Отмена"); expect(onCancel).toHaveBeenCalledOnce(); expect(onCreate).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range exact dimension and allows correcting it before creation", async () => {
    await click("Далее: размеры");
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Точное значение: Ширина"]')!.click());
    await enter("Ширина", "299");
    expect(button("Добавить помещение").disabled).toBe(true); expect(onCreate).not.toHaveBeenCalled();
    expect(container.querySelector('input[aria-label="Ширина"][type="text"]')?.getAttribute("aria-invalid")).toBe("true");
    await enter("Ширина", "2450.5"); await click("Добавить помещение");
    expect(onCreate.mock.calls[0][0].widthMm).toBe(2450.5);
  });

  it("keeps the form open and explains a project validation failure", async () => {
    onCreate.mockReturnValue("В проекте слишком много элементов раскладки. Уменьшите размеры.");
    await click("Далее: размеры"); await click("Добавить помещение");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Уменьшите размеры");
    expect(onCancel).not.toHaveBeenCalled();
  });
});
