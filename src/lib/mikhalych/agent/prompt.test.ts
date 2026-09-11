import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "./prompt";
import { MIKHALYCH_CHAT_SYSTEM_PROMPT } from "../prompts/chat";

/**
 * Регрессия на правила, без которых агент уже ошибался:
 * подставил меньший класс плитки и занизил закупку клея вдвое.
 */
describe("buildAgentSystemPrompt", () => {
  const prompt = buildAgentSystemPrompt();

  it("содержит требование назвать класс и расход", () => {
    expect(prompt).toContain("какую полосу/класс применил и какой расход");
  });

  it("запрещает расширять границы класса и молча выбирать на границе", () => {
    expect(prompt).toMatch(/Не расширяй границы в свою пользу/);
    expect(prompt).toMatch(/попадает на границу двух вариантов подписи — НЕ выбирай молча/);
  });

  it("требует разделять точную потребность и закупку", () => {
    expect(prompt).toMatch(/точная потребность \(количество\) и К ПОКУПКЕ/);
  });

  it("требует голос отдельно от таблиц с цифрами", () => {
    expect(prompt).toMatch(/ГОЛОС ОТДЕЛЬНО, ЦИФРЫ ОТДЕЛЬНО/);
    expect(prompt).toMatch(/внутри них подколок нет/);
  });

  it("требует подколку по поводу, а не в каждом ответе", () => {
    expect(prompt).toMatch(/Подколка — по поводу/);
    expect(prompt).toMatch(/Одна подколка на ответ/);
  });

  it("запрещает выдумывать нормы, плотности и коэффициенты", () => {
    expect(prompt).toMatch(/Нормы расхода, плотности, коэффициенты и пропорции НЕ ВЫДУМЫВАЙ/);
  });

  it("запрещает поправлять результат калькулятора на глазок", () => {
    expect(prompt).toMatch(/не уменьшай закупку, потому что «слой тонкий»/);
  });

  it("запрещает показывать внутреннюю кухню", () => {
    expect(prompt).toMatch(/Пользователь видит ТОЛЬКО готовый результат/);
    expect(prompt).not.toContain("⛔ САМОЕ ВАЖНОЕ");
  });

  it("не содержит жёсткой привязки к году", () => {
    expect(prompt).not.toContain("год 2026");
  });

  it("добавляет контекст расчёта, когда он передан", () => {
    const withContext = buildAgentSystemPrompt("[Контекст расчёта] area=12");
    expect(withContext).toContain("[Контекст расчёта] area=12");
    expect(withContext.length).toBeGreaterThan(prompt.length);
  });
});

describe("MIKHALYCH_CHAT_SYSTEM_PROMPT", () => {
  it("требует называть класс, от которого зависит расход", () => {
    expect(MIKHALYCH_CHAT_SYSTEM_PROMPT).toMatch(/назови, какой класс или тип берёшь/);
  });

  it("не содержит жёсткой привязки к году", () => {
    expect(MIKHALYCH_CHAT_SYSTEM_PROMPT).not.toContain("год 2026");
  });

  it("требует подколку по поводу и запрещает вежливого консультанта", () => {
    expect(MIKHALYCH_CHAT_SYSTEM_PROMPT).toMatch(/Подколка — обязательная часть речи/);
    expect(MIKHALYCH_CHAT_SYSTEM_PROMPT).toMatch(/Это не Михалыч/);
  });

  it("запрещает шутить про несущие, газ, электрику и гидроизоляцию", () => {
    expect(MIKHALYCH_CHAT_SYSTEM_PROMPT).toMatch(/без шуток вообще, там серьёзно/);
  });
});
