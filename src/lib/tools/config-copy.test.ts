import { describe, expect, it } from "vitest";
import { getToolConfig } from "./config";

describe("tool copy matches shipped behavior", () => {
  it("describes checklist progress, PDF and browser-local storage honestly", () => {
    const checklist = getToolConfig("chek-listy");
    const copy = [
      checklist?.description,
      checklist?.cardDescription,
      ...(checklist?.faq.map((item) => `${item.question} ${item.answer}`) ?? []),
    ].join(" ");

    expect(copy).toContain("сохраня");
    expect(copy).toContain("браузер");
    expect(copy).toContain("PDF");
    expect(copy).not.toContain("Сохранение прогресса в аккаунте пока не предусмотрено");
  });

  it("states that comparison prices are entered by the user", () => {
    const comparison = getToolConfig("sravnenie-materialov");
    const copy = [
      comparison?.seoIntro,
      ...(comparison?.faq.map((item) => `${item.question} ${item.answer}`) ?? []),
    ].join(" ");

    expect(copy).toContain("ввод");
    expect(copy).toContain("не подставляет рыночный прайс");
    expect(copy).not.toContain("Цены в таблице — ориентир по рынку РФ");
  });
});
