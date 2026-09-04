import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import ToolSeoBlock from "@/components/tools/ToolSeoBlock";
import { getToolConfig } from "./config";

const tool = getToolConfig("raskladka-plitki")!;
const pageUrl = "https://getmasterok.ru/instrumenty/raskladka-plitki/";

describe("tile layout editorial content", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("renders the same complete questions and answers in HTML and FAQPage", () => {
    const html = renderToStaticMarkup(React.createElement(ToolSeoBlock, {
      intro: tool.seoIntro, faq: tool.faq, pageUrl,
    }));
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    expect(script).not.toBeNull();
    const schema = JSON.parse(script![1]);
    const visible = html.replace(/<script\b[^>]*>.*?<\/script>/gs, "");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.url).toBe(pageUrl);
    expect(schema.mainEntity).toEqual(tool.faq.map(({ question, answer }) => ({
      "@type": "Question", name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })));
    for (const { question, answer } of tool.faq) {
      expect(visible).toContain(question);
      expect(visible).toContain(answer);
    }
    expect(visible.match(/<h3\b/g)).toHaveLength(tool.faq.length);
  });

  it("explains supported formats and the single-surface scope", () => {
    const answers = tool.faq.map(({ answer }) => answer).join(" ");
    expect(answers).toContain("600×600 мм");
    expect(answers).toContain("1200×600 мм");
    expect(answers).toContain("одной прямоугольной поверхности");
    expect(answers).toContain("2.5D");
    expect(answers).toContain("не заменяют полноценный 3D-проект");
  });

  it("keeps the existing search title and three procurement destinations", () => {
    expect(tool.title).toBe("Генератор раскладки плитки");
    expect(tool.seoTitle).toBeUndefined();
    expect(tool.relatedCalculators).toEqual([
      { slug: "plitka", categorySlug: "poly" },
      { slug: "klej-dlya-plitki", categorySlug: "poly" },
      { slug: "zatirka", categorySlug: "poly" },
    ]);
    expect(tool.faq.find(({ question }) => question.includes("перенести"))?.answer)
      .toContain("Клей и затирка открываются отдельными ссылками");
  });
});
