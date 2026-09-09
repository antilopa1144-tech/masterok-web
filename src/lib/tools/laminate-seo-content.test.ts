import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import ToolSeoBlock from "@/components/tools/ToolSeoBlock";
import { getToolConfig } from "./config";
import { calculateLaminateLayout } from "./laminate-layout";

const tool = getToolConfig("raskladka-laminata")!;

describe("laminate cluster content contract", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("keeps complete visible answers identical to FAQPage", () => {
    const html = renderToStaticMarkup(React.createElement(ToolSeoBlock, {
      intro: tool.seoIntro, faq: tool.faq,
      pageUrl: "https://getmasterok.ru/instrumenty/raskladka-laminata/",
    }));
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    expect(script).not.toBeNull();
    const schema = JSON.parse(script![1]);
    const visible = html.replace(/<script\b[^>]*>.*?<\/script>/gs, "");
    expect(schema.mainEntity).toEqual(tool.faq.map(({ question, answer }) => ({
      "@type": "Question", name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })));
    for (const { question, answer } of tool.faq) {
      expect(visible).toContain(question);
      expect(visible).toContain(answer);
    }
  });

  it("distinguishes a room preview, area estimate and transferred parameters", () => {
    const content = tool.seoIntro + tool.faq.map(({ answer }) => answer).join(" ");
    expect(content).toContain("2.5D");
    expect(content).toContain("одной прямоугольной комнаты");
    expect(content).toContain("а не точную карту раскроя");
    expect(content).toContain("площадь пачки не переносятся");
    expect(content).toContain("результаты двух инструментов не нужно складывать");
    expect(tool.seoTitle).toBe("Раскладка ламината онлайн со схемой");
  });

  it.each(["deck-third", "deck-half", "herringbone"] as const)("keeps %s notes free from universal installation claims", (mode) => {
    const notes = calculateLaminateLayout(4000, 5000, 1285, 192, mode).notes.join(" ");
    expect(notes).toContain("инструкции");
    expect(notes).not.toMatch(/считается браком|8–12|минимум на 30/);
    if (mode === "herringbone") expect(notes).toContain("не является точной картой раскроя");
  });
});
