/* @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DraftNumberInput from "./DraftNumberInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function typeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("DraftNumberInput", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("не подменяет 20 минимальным значением во время набора", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(createElement(DraftNumberInput, {
      ariaLabel: "Ширина плитки",
      value: 600,
      min: 10,
      max: 2000,
      onChange,
    })));
    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => typeValue(input, ""));
    await act(async () => typeValue(input, "2"));
    expect(input.value).toBe("2");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => typeValue(input, "20"));
    expect(input.value).toBe("20");
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("восстанавливает последнее допустимое значение после ухода из поля", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(createElement(DraftNumberInput, {
      ariaLabel: "Ширина комнаты",
      value: 4000,
      min: 300,
      max: 30000,
      onChange,
    })));
    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => input.focus());
    await act(async () => typeValue(input, ""));
    await act(async () => input.blur());

    expect(input.value).toBe("4000");
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector("[role=alert]")).toBeNull();
  });

  it("показывает конфликт, если зависимый максимум стал меньше текущего значения", async () => {
    const onChange = vi.fn();
    const renderWithMax = (max: number) => createElement(DraftNumberInput, {
      ariaLabel: "Ширина проёма",
      value: 900,
      min: 100,
      max,
      onChange,
    });

    await act(async () => root.render(renderWithMax(2500)));
    expect(container.querySelector("[role=alert]")).toBeNull();

    await act(async () => root.render(renderWithMax(500)));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("900");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector("[role=alert]")?.textContent).toContain("Допустимо от 100 до 500");
    expect(onChange).not.toHaveBeenCalled();
  });
});
