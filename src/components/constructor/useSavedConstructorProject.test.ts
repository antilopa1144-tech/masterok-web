/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useSavedConstructorProject from "./useSavedConstructorProject";

const storage = vi.hoisted(() => ({ loadWorkspace: vi.fn() }));
vi.mock("@/lib/constructor/storage", () => storage);
vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const workspace = (name: string) => ({ project: { id: "saved-room", name, rooms: [{}, {}], updatedAt: "2026-10-08T01:00:00Z" } });
function Probe() {
  const project = useSavedConstructorProject();
  return React.createElement("output", null, project ? `${project.name}|${project.rooms}` : "Нет проекта");
}

describe("saved constructor project on returning to the page", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    storage.loadWorkspace.mockReset().mockResolvedValue(null);
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const mount = async () => { await act(async () => root.render(React.createElement(Probe))); };

  it("refreshes the active project when the browser returns to a restored page", async () => {
    storage.loadWorkspace.mockResolvedValue(workspace("Ванная"));
    await mount();
    expect(container.textContent).toBe("Ванная|2");
    storage.loadWorkspace.mockResolvedValue(workspace("Моя кухня"));
    await act(async () => window.dispatchEvent(new Event("pageshow")));
    expect(container.textContent).toBe("Моя кухня|2");
  });

  it("does not let an older asynchronous read replace the latest project", async () => {
    let resolveOld!: (value: unknown) => void;
    storage.loadWorkspace.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue(workspace("Новый проект"));
    await mount();
    await act(async () => window.dispatchEvent(new Event("focus")));
    await act(async () => resolveOld(workspace("Старый проект")));
    expect(container.textContent).toBe("Новый проект|2");
  });

  it("clears stale project information when storage becomes unavailable", async () => {
    storage.loadWorkspace.mockResolvedValue(workspace("Ванная"));
    await mount();
    storage.loadWorkspace.mockRejectedValue(new Error("Storage unavailable"));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(container.textContent).toBe("Нет проекта");
  });

  it("does not keep reading storage after leaving the page", async () => {
    await mount();
    await act(async () => root.render(null));
    storage.loadWorkspace.mockClear();
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    expect(storage.loadWorkspace).not.toHaveBeenCalled();
  });
});
