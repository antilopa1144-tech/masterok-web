import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("@/lib/blog", () => ({
  getAllPosts: vi.fn(async () => []),
}));

vi.mock("@/components/calculator/CalculatorWithMikhalych", () => ({
  default: () => null,
}));

import CategoryPage from "../[category]/page";
import CalculatorPage from "../[category]/[slug]/page";

describe("SEO-страницы калькуляторов", () => {
  it("выводит быстрые ссылки фундаментного кластера", async () => {
    const page = await CategoryPage({
      params: Promise.resolve({ category: "fundament" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('aria-label="Быстрый выбор расчёта"');
    expect(html).toContain(
      'href="/kalkulyatory/fundament/lentochnyy-fundament"',
    );
    expect(html).toContain("Рассчитать опалубку для фундамента");
  });

  it("использует SEO-H1 калькулятора вместо короткого названия", async () => {
    const page = await CalculatorPage({
      params: Promise.resolve({
        category: "fundament",
        slug: "armatura",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(
      "<h1 class=\"text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white\">Калькулятор арматуры — вес, метраж и вязальная проволока</h1>",
    );
  });
});
