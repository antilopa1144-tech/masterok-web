import { describe, expect, it } from "vitest";
import { screedDef } from "../formulas/screed";

describe("Стяжка: поисковый сценарий готовой смеси", () => {
  const html = screedDef.seoContent!.descriptionHtml;
  const faq = screedDef.seoContent!.faq!;
  const mixFor = (area: number, readyBagWeight: number) => {
    const result = screedDef.calculate({
      inputMode: 1, area, thickness: 50, screedType: 1, readyMix: 0, readyBagWeight,
    });
    return result.materials.find((material) => material.name.startsWith("Пескобетон М300"))!;
  };

  it("направляет к существующему режиму, не меняя дефолт", () => {
    const field = screedDef.fields.find((item) => item.key === "screedType")!;
    expect(field.defaultValue).toBe(0);
    expect(html).toContain("По умолчанию открыт ручной замес");
    expect(html).toContain("Готовая смесь в мешках (пескобетон)");
  });

  it.each([[25, 80], [40, 50], [50, 40]])("подтверждает пример фасовки %s кг", (size, count) => {
    const mix = mixFor(20, size);
    expect(mix.quantity).toBe(2000);
    expect(mix.packageInfo?.count).toBe(count);
    expect(mix.purchaseQty).toBe(2000);
    expect(html).toContain(`по ${size} кг — <strong>${count}`);
  });

  it("отличает округление отдельного м² от закупки на всю площадь", () => {
    expect(mixFor(1, 40).quantity).toBe(100);
    expect(mixFor(1, 40).packageInfo?.count).toBe(3);
    expect(mixFor(20, 40).packageInfo?.count).toBe(50);
    expect(html).toContain("60 мешков вместо 50");
    expect(html).toContain("а не универсальная норма");
  });

  it("сохраняет границы модели и связывает расчёт со статьёй о толщине", () => {
    expect(screedDef.fields.find((item) => item.key === "readyConsumptionPer10mm")).toBeDefined();
    expect(html).toContain("Перепишите в поле калькулятора расход с мешка");
    expect(html).toContain('href="/blog/tolshchina-styazhki-pod-teplyy-pol/"');
    expect(html).not.toContain("utm_");
    expect(faq.every((item) => !/&(?:\w+|#\d+);/.test(item.answer))).toBe(true);
  });
});
