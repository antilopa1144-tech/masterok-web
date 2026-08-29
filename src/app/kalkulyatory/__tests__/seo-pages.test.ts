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
import CatalogPage from "../page";

describe("SEO-страницы калькуляторов", () => {
  it("рендерит полный каталог с поиском и только восемью метками ТОП", () => {
    const html = renderToStaticMarkup(React.createElement(CatalogPage));

    expect(html).toContain('id="calculator-catalog-search"');
    expect(html).toContain("Все калькуляторы");
    expect(html.match(/>ТОП<\/span>/g)).toHaveLength(8);
  });

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
      "<h1 class=\"text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white\">Калькулятор арматуры — метраж, вес и прутки к покупке</h1>",
    );
  });

  it("связывает HowTo JSON-LD с видимыми шагами", async () => {
    const page = await CalculatorPage({
      params: Promise.resolve({
        category: "inzhenernye",
        slug: "elektrika",
      }),
    });
    const html = renderToStaticMarkup(page);
    const schemas = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((match) => JSON.parse(match[1]) as {
      "@type"?: string;
      step?: Array<{ url: string }>;
    });
    const howToSteps = schemas.find((schema) => schema["@type"] === "HowTo")?.step ?? [];

    expect(html).toContain('id="engineering_electrics-howto"');
    expect(howToSteps.length).toBeGreaterThan(0);
    for (const step of howToSteps) {
      const stepId = new URL(step.url).hash.slice(1);
      expect(html).toContain(`id="${stepId}"`);
    }
  });
});
