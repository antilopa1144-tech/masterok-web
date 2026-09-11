import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import CategoryFaqAccordion from "./CategoryFaqAccordion";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const ITEMS = [
  {
    question: "Какой кровельный материал самый долговечный?",
    answer: "Керамическая черепица служит дольше остальных, но тяжёлая и дорогая.",
  },
  {
    question: "Как рассчитать площадь крыши для закупки материала?",
    answer: "Измерьте длину и ширину каждого ската и сложите площади.",
  },
];

/**
 * Страницы категорий отдают FAQPage-разметку с ответами. Раньше аккордеон был
 * клиентским на useState: ответ попадал в DOM только после клика, поэтому
 * разметка описывала текст, которого в HTML нет. Тест держит контракт:
 * вопрос и ответ отдаются сервером, аккордеон работает без JavaScript.
 */
describe("CategoryFaqAccordion", () => {
  it("отдаёт ответы в разметке, не дожидаясь клика", () => {
    const html = renderToStaticMarkup(React.createElement(CategoryFaqAccordion, { items: ITEMS }));
    for (const item of ITEMS) {
      expect(html, `нет ответа: ${item.question}`).toContain(item.answer);
      expect(html, `вопрос не размечен как h3: ${item.question}`).toContain(
        `<h3 class="text-base font-medium">${item.question}</h3>`,
      );
    }
  });

  it("использует нативные details/summary вместо состояния React", () => {
    const html = renderToStaticMarkup(React.createElement(CategoryFaqAccordion, { items: ITEMS }));
    expect((html.match(/<details/g) ?? []).length).toBe(ITEMS.length);
    expect((html.match(/<summary/g) ?? []).length).toBe(ITEMS.length);
    expect(html).not.toContain("<button");
  });
});
