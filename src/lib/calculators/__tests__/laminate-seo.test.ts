import { describe, expect, it } from "vitest";
import { laminateDef } from "../formulas/laminate";

describe("Ламинат: закупочный поисковый интент", () => {
  const html = laminateDef.seoContent!.descriptionHtml;
  const faq = laminateDef.seoContent!.faq!;

  it("объясняет существующие способы ввода без смены дефолта", () => {
    const field = laminateDef.fields.find((item) => item.key === "inputMode")!;
    expect(field.defaultValue).toBe(0);
    expect(field.options?.map((option) => option.label)).toEqual([
      "По размерам комнаты", "По площади",
    ]);
    expect(html).toContain("«По площади»");
    expect(html).toContain("площадь всей пачки, а не одной доски");
  });

  it("не обещает периметр и схему только по площади", () => {
    expect(html).toContain("Фактический периметр");
    expect(html).toContain("предварительная оценка, а не обмер стен");
    expect(html).toContain("Одна площадь не определяет форму помещения");
  });

  it("связывает закупку с существующими инструментами без UTM", () => {
    expect(html).toContain('href="/instrumenty/ploshchad-komnaty/"');
    expect(html).toContain('href="/instrumenty/raskladka-laminata/"');
    expect(html).not.toContain("utm_");
  });

  it("отвечает на два разных интента и не оставляет HTML-сущности в FAQ", () => {
    expect(faq.some((item) => item.question.includes("только площадь"))).toBe(true);
    expect(faq.some((item) => item.question.includes("схему укладки"))).toBe(true);
    expect(faq.every((item) => !/&(?:\w+|#\d+);/.test(item.answer))).toBe(true);
  });
});
