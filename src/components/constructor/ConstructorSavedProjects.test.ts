/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ConstructorSavedProjects from "./ConstructorSavedProjects";
import type { WorkspaceSummary } from "@/lib/constructor/storage";

const storage = vi.hoisted(() => ({ listWorkspaces: vi.fn() }));
vi.mock("@/lib/constructor/storage", () => storage);
vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const project: WorkspaceSummary = { id: "saved&project", name: "Сохранённая ванная", updatedAt: "2026-10-07T01:00:00Z", rooms: 2 };
const nativeShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

// Native focus, Escape and top-layer behavior are checked in the real browser.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.open = false; } });
});
afterAll(() => {
  for (const [name, descriptor] of [["showModal", nativeShow], ["close", nativeClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.unstubAllGlobals();
});

describe("Choosing an existing constructor project", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    storage.listWorkspaces.mockReset().mockResolvedValue([]);
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(React.createElement(ConstructorSavedProjects, { activeProjectId: project.id })));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const button = (text: string) => Array.from(container.querySelectorAll("button")).find((element) => element.textContent?.includes(text))!;
  const open = async () => { await act(async () => button("Мои проекты").click()); };

  it("reads projects only when opened and gives an explicit empty state", async () => {
    expect(storage.listWorkspaces).not.toHaveBeenCalled();
    await open();
    expect(container.querySelector("dialog")?.textContent).toContain("Здесь пока нет проектов");
    const href = new URL(container.querySelector("dialog a")!.getAttribute("href")!, "https://getmasterok.ru");
    expect(href.pathname.replace(/\/$/, "")).toBe("/konstruktor");
    expect(href.hash).toBe("#scenarios");
    expect(container.querySelector("input[type=search]")).toBeNull();
  });

  it("explains a storage failure, then retries without losing the exact project link", async () => {
    storage.listWorkspaces.mockRejectedValueOnce(new Error("Хранилище занято другой вкладкой.")).mockResolvedValueOnce([project]);
    await open();
    expect(container.querySelector("[role=alert]")?.textContent).toContain("Хранилище занято");
    await act(async () => button("Попробовать ещё раз").click());
    expect(container.querySelector("[role=alert]")).toBeNull();
    const link = container.querySelector("dialog li a");
    const href = new URL(link!.getAttribute("href")!, "https://getmasterok.ru");
    expect(href.pathname.replace(/\/$/, "")).toBe("/konstruktor/redaktor");
    expect(href.searchParams.get("project")).toBe(project.id);
    expect(Array.from(href.searchParams.keys())).toEqual(["project"]);
    expect(link?.textContent).toContain("2 помещения");
    expect(link?.textContent).toContain("Последний открытый");
  });

  it("ignores a stale read after closing and refreshes the list on reopening", async () => {
    let resolveRead!: (projects: WorkspaceSummary[]) => void;
    storage.listWorkspaces.mockImplementationOnce(() => new Promise<WorkspaceSummary[]>((resolve) => { resolveRead = resolve; }));
    await open();
    expect(container.querySelector("[role=status]")?.textContent).toBe("Загружаем проекты…");
    await act(async () => (container.querySelector('[aria-label="Закрыть список проектов"]') as HTMLButtonElement).click());
    await act(async () => resolveRead([project]));
    await open();
    expect(storage.listWorkspaces).toHaveBeenCalledTimes(2);
    expect(container.querySelector("dialog")?.textContent).toContain("Здесь пока нет проектов");
    expect(container.querySelector("dialog")?.textContent).not.toContain(project.name);
  });

  it("returns focus to search when its clear button disappears", async () => {
    storage.listWorkspaces.mockResolvedValueOnce([project]);
    await open();
    const input = container.querySelector("input[type=search]") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "ванная");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const clear = container.querySelector('[aria-label="Очистить поиск проектов"]') as HTMLButtonElement;
    clear.focus();
    await act(async () => clear.click());
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });
});
