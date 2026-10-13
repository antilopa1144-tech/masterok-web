/* @vitest-environment jsdom */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModalWindow } from "./ConstructorEditor";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

describe("ModalWindow", () => {
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

  it("keeps focus in a field when the parent rerenders", async () => {
    const render = async (version: number) => act(async () => root.render(
      React.createElement(ModalWindow, { title: "Настройки", onClose: () => undefined },
        React.createElement("input", { "aria-label": "Название варианта", defaultValue: `Вариант ${version}` }),
      ),
    ));
    await render(1);
    const input = container.querySelector("input")!;
    input.focus();
    await render(2);
    expect(document.activeElement).toBe(input);
  });
});
