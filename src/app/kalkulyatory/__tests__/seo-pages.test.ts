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

/**
 * Разметка обязана описывать то, что реально видно на странице. Раньше здесь
 * были сконструированные строки, которых на странице нет:
 *   HowTo.name      = «Как пользоваться: <title>»
 *   Article.headline = «Советы экспертов: <title>»
 * Google требует соответствия structured data видимому содержимому.
 */
describe("JSON-LD соответствует видимому контенту", () => {
  async function schemasFor(category: string, slug: string) {
    const page = await CalculatorPage({ params: Promise.resolve({ category, slug }) });
    const html = renderToStaticMarkup(page);
    const schemas = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((match) => JSON.parse(match[1]) as Record<string, unknown>);
    return { html, schemas };
  }

  it("HowTo.name совпадает с видимым заголовком инструкции", async () => {
    const { html, schemas } = await schemasFor("poly", "plitka");
    const howTo = schemas.find((s) => s["@type"] === "HowTo");
    expect(howTo?.name).toBe("Как пользоваться");
    // Тот же текст виден пользователю как заголовок аккордеона.
    expect(html).toContain("Как пользоваться");
    expect(html).not.toContain("Как пользоваться: Калькулятор");
  });

  it("Article.headline совпадает с видимым заголовком блока совета", async () => {
    const { html, schemas } = await schemasFor("poly", "plitka");
    const article = schemas.find((s) => s["@type"] === "Article");
    if (!article) return; // у калькулятора может не быть expertTips
    expect(article.headline).toBe("Совет Михалыча");
    expect(html).toContain("Совет Михалыча");
    expect(html).not.toContain("Советы экспертов");
  });

  it("articleBody содержит только тот совет, который показан", async () => {
    const { schemas } = await schemasFor("poly", "plitka");
    const article = schemas.find((s) => s["@type"] === "Article");
    if (!article) return;
    const body = String(article.articleBody ?? "");
    expect(body.length).toBeGreaterThan(0);
    // Один совет, а не склейка всех подсказок через пустую строку.
    expect(body).not.toContain("\n\n");
  });

  it("ни один headline/name не содержит бренд-суффикс", async () => {
    for (const [category, slug] of [["poly", "plitka"], ["fundament", "beton"], ["otdelka", "kraska"]]) {
      const { schemas } = await schemasFor(category, slug);
      for (const schema of schemas) {
        const headline = String(schema.headline ?? schema.name ?? "");
        expect(headline).not.toMatch(/Мастерок/);
        expect(headline).not.toMatch(/\|/);
      }
    }
  });
});
