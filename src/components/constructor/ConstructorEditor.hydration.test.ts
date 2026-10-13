/* @vitest-environment jsdom */
import React, { StrictMode, act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspace, type ConstructorWorkspace } from "@/lib/constructor/workspace";

const storage = vi.hoisted(() => ({
  listWorkspaces: vi.fn(),
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
}));
const navigation = vi.hoisted(() => ({ search: null as string | null }));

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search ?? window.location.search),
}));
vi.mock("@/lib/constructor/storage", () => storage);
vi.mock("@/components/ui/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("./MaterialSwatch", () => ({ default: () => null }));

import ConstructorEditor from "./ConstructorEditor";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const fixture = (id: string, name: string): ConstructorWorkspace => {
  const workspace = createWorkspace();
  workspace.project.id = id;
  workspace.project.name = name;
  return workspace;
};

describe("ConstructorEditor SSR hydration", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    navigation.search = null;
    storage.listWorkspaces.mockReset().mockResolvedValue([]);
    storage.loadWorkspace.mockReset();
    storage.saveWorkspace.mockReset().mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  const hydrateAt = async (path: string) => {
    window.history.replaceState(null, "", path);
    container.innerHTML = renderToString(React.createElement(ConstructorEditor));
    const recoverable: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, React.createElement(StrictMode, null, React.createElement(ConstructorEditor)), {
        onRecoverableError: error => recoverable.push(error),
      });
      await Promise.resolve();
    });
    return recoverable;
  };

  it("reads a bathroom new-project URL only after hydration", async () => {
    const recoverable = await hydrateAt("/konstruktor/redaktor/?new=1&start=bathroom");
    expect(storage.loadWorkspace).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Конструктор · Новый проект");
    expect(container.textContent).toContain("Начнём с вашего помещения");
    expect(recoverable).toEqual([]);
  });

  it("keeps the saved project load through StrictMode hydration", async () => {
    const saved = fixture("saved-hydration-project", "Сохранённый проект");
    storage.loadWorkspace.mockResolvedValue(saved);
    const recoverable = await hydrateAt("/konstruktor/redaktor/?project=saved-hydration-project");
    await act(async () => { await Promise.resolve(); });
    expect(storage.loadWorkspace).toHaveBeenCalledWith("saved-hydration-project");
    expect((container.querySelector('input[aria-label="Название проекта"]') as HTMLInputElement).value).toBe("Сохранённый проект");
    expect(recoverable).toEqual([]);
  });

  it("uses the pending router URL while window.location still points at the landing", async () => {
    navigation.search = "new=1&start=bathroom";
    const recoverable = await hydrateAt("/konstruktor/");
    expect(storage.loadWorkspace).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Конструктор · Новый проект");
    expect(recoverable).toEqual([]);
  });
});
