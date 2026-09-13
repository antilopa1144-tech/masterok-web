import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve("src/app/mikhalych/page.tsx"), "utf8");
const chatSource = readFileSync(resolve("src/components/mikhalych/MikhalychChat.tsx"), "utf8");

describe("Mikhalych public page contract", () => {
  it("does not invent professional experience or promise an automatic apartment estimate", () => {
    expect(source).not.toContain("30-летним стажем");
    expect(source).not.toContain("собирает смету всей квартиры");
    expect(source).not.toContain("Отвечает как настоящий прораб");
    expect(chatSource).not.toContain("собираю смету, сравниваю материалы, подбираю под бюджет");
    expect(chatSource).toContain("расчёты, которые можно добавить в смету проекта");
  });

  it("separates deterministic calculations from AI explanations", () => {
    expect(source).toContain("Количество материалов считает движок Мастерок");
    expect(source).toContain("Что считает движок, а что делает ИИ");
    expect(source).toContain("округление до покупки выполняет выбранный калькулятор");
  });

  it("renders visible limitations and matching FAQ structured data", () => {
    expect(source).toContain('"@type": "FAQPage"');
    expect(source).toContain("Заменяет ли ответ Михалыча строительный проект?");
    expect(source).toContain("не заменяет обследование, рабочий проект");
    expect(source).toContain("FAQ_ITEMS.map");
  });
});
