/* @vitest-environment jsdom */
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

describe("ThemeToggle hydration", () => {
  let host: HTMLDivElement;
  let root: Root | undefined;
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    host = document.createElement("div");
    document.body.append(host);
  });
  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    host.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });
  it.each(["dark", "ocean"])("hydrates server markup before applying stored %s choice", async (choice) => {
    const html = renderToString(React.createElement(ThemeToggle));
    localStorage.setItem("theme", choice);
    // Browser preferences cannot change the HTML used for initial hydration.
    expect(renderToString(React.createElement(ThemeToggle))).toBe(html);
    host.innerHTML = html;
    const errors: unknown[] = [];
    await act(async () => { root = hydrateRoot(host, React.createElement(ThemeToggle), { onRecoverableError: error => errors.push(error) }); });
    expect(errors).toEqual([]);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe(choice === "ocean" ? "ocean" : null);
    await act(async () => host.querySelector("button")!.click());
    expect(host.querySelector('[aria-checked="true"]')?.textContent).toContain(choice === "dark" ? "Тёмная" : "Океан");
  });
});
