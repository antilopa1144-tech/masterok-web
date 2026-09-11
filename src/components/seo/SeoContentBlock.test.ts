import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import SeoContentBlock from "./SeoContentBlock";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const FAQ = [
  { question: "Сколько цемента нужно на куб бетона?", answer: "Ориентир зависит от марки смеси." },
  { question: "Почему калькулятор не считает арматуру?", answer: "Это отдельный расчёт по схеме армирования." },
];

type Props = Parameters<typeof SeoContentBlock>[0];

function render(props: Partial<Props> = {}): string {
  return renderToStaticMarkup(
    React.createElement(SeoContentBlock, {
      calculatorId: "beton",
      descriptionHtml: "",
      faq: FAQ,
      ...props,
    } as Props),
  );
}

describe("SeoContentBlock — структура для AEO", () => {
  it("размечает вопрос как h2, а ответ держит в DOM рядом с ним", () => {
    const html = render();
    for (const item of FAQ) {
      expect(html, `вопрос не размечен как h2: ${item.question}`).toContain(
        `<h2 class="text-sm font-medium">${item.question}</h2>`,
      );
      // Ответ должен быть в разметке, даже если аккордеон закрыт.
      expect(html).toContain(item.answer);
    }
  });

  it("держит подпись «Частые вопросы» без заголовка, чтобы вопросы не уезжали на h3", () => {
    const html = render();
    expect(html).toContain("Частые вопросы");
    expect(html).not.toContain('<h2 class="text-sm font-semibold text-slate-500');
  });

  it("размечает разделы справки заголовками второго уровня", () => {
    const html = render({
      howToUse: ["Укажите размеры", "Получите объём"],
      formulaDescription: "Объём = длина × ширина × высота",
    });
    expect(html).toContain('<h2 class="text-sm font-semibold">Как пользоваться</h2>');
    expect(html).toContain('<h2 class="text-sm font-semibold">Формулы и нормы расчёта</h2>');
  });

  it("не рендерит блок, если справочных данных нет", () => {
    expect(render({ faq: [] })).toBe("");
  });
});
