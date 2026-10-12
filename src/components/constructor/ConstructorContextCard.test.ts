/* @vitest-environment jsdom */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import ConstructorContextCard from "./ConstructorContextCard";
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

describe("Calculator and article entry into an own constructor project", () => {
  it.each(["laminat", "plitka", "vannaya-komnata"])("keeps a crawlable own-project link and a separate example for %s", slug => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(React.createElement(ConstructorContextCard, { calculatorSlug: slug, placement: "calculator_context" }));
    const links = Array.from(container.querySelectorAll("a"));
    const own = links.find(a => a.textContent?.includes("Создать свой 3D-проект"))!, example = links.find(a => a.textContent?.includes("Открыть готовый пример"))!;
    expect(new URL(own.href).searchParams.get("new")).toBe("1");
    expect(new URL(example.href).searchParams.has("new")).toBe(false);
    expect(new URL(own.href).searchParams.get("start")).toBe(new URL(example.href).searchParams.get("start"));
    expect(container.textContent).toContain("Значения из калькулятора или статьи не переносятся");
    if (slug === "vannaya-komnata") expect(links.some(a => new URL(a.href).pathname.replace(/\/?$/, "/") === "/konstruktor/rasstanovka-mebeli/")).toBe(true);
  });
  it("does not offer unrelated room layouts for unsupported materials", () => {
    expect(renderToStaticMarkup(React.createElement(ConstructorContextCard, { calculatorSlug: "parket", placement: "article_context" }))).toBe("");
  });
});
