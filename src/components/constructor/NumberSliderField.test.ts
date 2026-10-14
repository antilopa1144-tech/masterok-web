/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NumberSliderField from "./NumberSliderField";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
afterAll(() => vi.unstubAllGlobals());

describe("Exact number actions", () => {
  let container: HTMLDivElement, root: Root;
  let onCommit: ReturnType<typeof vi.fn<(value: number) => void>>;
  let onStatus: ReturnType<typeof vi.fn<(id: string, message: string | null) => void>>;
  const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}: Высота подоконника"]`)!;
  const input = () => container.querySelector<HTMLInputElement>('input[type="text"]')!;
  const edit = async (value: string) => {
    await act(async () => button("Точное значение").click());
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const activate = async (label: string) => {
    // A touch/click moves focus before click; this must not commit on blur first.
    await act(async () => button(label).focus());
    await act(async () => button(label).click());
  };
  beforeEach(async () => {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    onCommit = vi.fn(); onStatus = vi.fn();
    await act(async () => root.render(React.createElement(NumberSliderField, {
      label: "Высота подоконника", value: 810, min: 0, max: 1300, unit: "мм", onCommit, onStatus,
    })));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("applies a decimal once through the visible action", async () => {
    await edit("900,5"); await activate("Применить");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(900.5);
    expect(input()).toBeNull();
    expect(onStatus.mock.lastCall?.[1]).toBeNull();
  });

  it("restores the saved value without committing the edited number", async () => {
    await edit("1000"); await activate("Вернуть");
    expect(onCommit).not.toHaveBeenCalled();
    expect(button("Точное значение").textContent).toContain("810");
    expect(onStatus.mock.lastCall?.[1]).toBeNull();
  });

  it("keeps invalid or empty input editable and allows correction", async () => {
    await edit(""); await activate("Применить");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(input());
    expect(onCommit).not.toHaveBeenCalled();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), "1300");
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
    await activate("Применить");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(1300);
  });

  it("keeps applying on ordinary blur and cancelling with Escape", async () => {
    await edit("900"); await act(async () => input().blur());
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(900);
    onCommit.mockClear();
    await edit("1000");
    await act(async () => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onCommit).not.toHaveBeenCalled(); expect(input()).toBeNull();
    expect(onStatus.mock.lastCall?.[1]).toBeNull();
  });
});
