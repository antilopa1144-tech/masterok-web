import { describe, it, expect } from "vitest";
import { insulationDef } from "./insulation";
import {
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
  INSULATION_PRODUCT_MANUAL,
} from "../insulation-catalog";

function calc(inputs: Record<string, unknown>) {
  return insulationDef.calculate({ accuracyMode: "basic", ...inputs } as any);
}

function mainInsulation(materials: { category?: string; name: string }[]) {
  return materials.filter(
    (m) =>
      m.category?.startsWith("Утеплитель") ||
      m.category === "Напыляемая изоляция" ||
      m.category === "Основное",
  );
}

describe("insulation formula — каталог линеек (productId)", () => {
  it("ручной режим: упаковка по толщине авто-расчёт, без названия линейки", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      materialForm: INSULATION_FORM_SLABS,
    });
    expect(r.totals.piecesPerPack).toBe(6);
    expect(r.materials[0].name).not.toContain("Роклайт");
    expect(r.materials[0].category).toBe("Утеплитель (плиты)");
  });

  it("Технониколь Роклайт: 6 плит/пачка для 100 мм", () => {
    const r = calc({ area: 40, thickness: 100, productId: 3, materialForm: INSULATION_FORM_SLABS });
    expect(r.totals.piecesPerPack).toBe(6);
    expect(r.materials[0].name).toContain("Технониколь Роклайт");
  });

  it("Технониколь Технофас 80: 3 плиты/пачка для 100 мм (плотная)", () => {
    const r = calc({ area: 40, thickness: 100, productId: 4, materialForm: INSULATION_FORM_SLABS });
    expect(r.totals.piecesPerPack).toBe(3);
    expect(r.totals.effectiveDensity).toBe(80);
  });

  it("Пеноплэкс Комфорт: ЭППС и 4 плиты в упаковке на 100 мм", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 5,
      materialForm: INSULATION_FORM_SLABS,
      insulationType: 0,
    });
    expect(r.totals.insulationType).toBe(1);
    expect(r.totals.piecesPerPack).toBe(4);
    expect(r.materials[0].category).toBe("Утеплитель (пеноплекс)");
  });

  it("ПСБ-С 25Ф: ППС и площадь плиты 0,5 м²", () => {
    const r = calc({ area: 40, thickness: 100, productId: 7, materialForm: INSULATION_FORM_SLABS });
    expect(r.totals.insulationType).toBe(2);
    expect(r.totals.piecesPerPack).toBe(5);
    expect(r.materials[0].name).toContain("ПСБ-С");
    expect(r.materials[0].category).toBe("Утеплитель (пенопласт)");
  });

  it("warning при толщине вне линейки", () => {
    const r = calc({ area: 40, thickness: 80, productId: 3, materialForm: INSULATION_FORM_SLABS });
    expect(r.warnings.some((w) => w.includes("Роклайт") && w.includes("50, 100, 150"))).toBe(true);
  });

  it("явный piecesPerPack от пользователя побеждает каталог (только ручной режим)", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      piecesPerPack: 8,
    });
    expect(r.totals.piecesPerPack).toBe(8);
  });

  it("плотность линейки → totals.effectiveDensity", () => {
    const r = calc({ area: 40, thickness: 100, productId: 1, materialForm: INSULATION_FORM_SLABS });
    expect(r.totals.effectiveDensity).toBe(37);
  });
});

describe("insulation formula — рулоны и напыление", () => {
  it("рулон Техно 37: категория и единица «рулонов»", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 8,
      materialForm: INSULATION_FORM_ROLLS,
    });
    expect(r.totals.materialForm).toBe(INSULATION_FORM_ROLLS);
    expect(r.totals.rollArea).toBe(6);
    const main = mainInsulation(r.materials)[0];
    expect(main.category).toBe("Утеплитель (рулоны)");
    expect(main.unit).toBe("рулонов");
    expect(main.name).toContain("Техно 37");
  });

  it("эковата из каталога: мешки, без дюбелей", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 10,
      materialForm: INSULATION_FORM_SPRAY,
    });
    expect(r.totals.insulationType).toBe(3);
    expect(r.materials.some((m) => m.name.includes("Эковата"))).toBe(true);
    expect(r.materials.some((m) => m.name.includes("Дюбели"))).toBe(false);
    expect(r.summaryCards?.[0].unit).toBe("мешков");
  });
});

describe("insulation formula — различие результатов по типу", () => {
  it("summaryCards: плиты vs рулоны vs напыление", () => {
    const slab = calc({ area: 40, thickness: 100, productId: 1, materialForm: INSULATION_FORM_SLABS });
    const roll = calc({ area: 40, thickness: 100, productId: 8, materialForm: INSULATION_FORM_ROLLS });
    const spray = calc({ area: 40, thickness: 100, productId: 10, materialForm: INSULATION_FORM_SPRAY });

    expect(slab.summaryCards?.[0].unit).toMatch(/упаковок|шт/);
    expect(roll.summaryCards?.[0].unit).toBe("рулонов");
    expect(spray.summaryCards?.[0].unit).toBe("мешков");
    expect(slab.summaryCards?.[2].hint).toContain("плиты");
    expect(roll.summaryCards?.[2].hint).toContain("рулон");
    expect(spray.summaryCards?.[2].hint).toContain("напыление");
  });

  it("СФТК: пеноплекс даёт клей, минвата в каркасе — мембраны", () => {
    const eps = calc({
      area: 40,
      thickness: 100,
      productId: 5,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 0,
    });
    const woolFrame = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 1,
    });
    expect(eps.materials.some((m) => m.name.toLowerCase().includes("клей фасадный"))).toBe(true);
    expect(woolFrame.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(true);
    expect(woolFrame.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(true);
    expect(eps.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(false);
  });
});

describe("insulation formula — плотность утеплителя", () => {
  it("по умолчанию (80 кг/м³, фасад) без warning о низкой плотности", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 0, application: 0 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
  });

  it("45 кг/м³ на мокром штукатурном фасаде → warning", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
      mountSystem: 0,
      density: 45,
      application: 0,
    });
    expect(r.warnings.some((w) => w.includes("слишком низкая") && w.includes("80 кг/м³"))).toBe(true);
  });

  it("80 кг/м³ в каркасной системе → совет про экономию (но не warning)", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
      mountSystem: 1,
      density: 80,
    });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("избыточна для каркасной"))).toBe(true);
  });

  it("ЭППС — плотность не проверяется (это минвата-специфика)", () => {
    const r = calc({ area: 40, thickness: 100, productId: 5, materialForm: INSULATION_FORM_SLABS, mountSystem: 0 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
  });

  it("если линейка выбрана, её плотность побеждает input.density", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 2,
      materialForm: INSULATION_FORM_SLABS,
      density: 35,
    });
    expect(r.totals.effectiveDensity).toBe(80);
  });
});

describe("insulation formula — двухслойная укладка", () => {
  it("layerScheme=0: одна позиция утеплителя", () => {
    const r = calc({
      area: 40,
      thickness: 200,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      layerScheme: 0,
    });
    const plates = mainInsulation(r.materials);
    expect(plates).toHaveLength(1);
    expect(plates[0].name).not.toContain("Слой");
  });

  it("layerScheme=1 при толщине 200 мм: два слоя по 100 мм", () => {
    const r = calc({
      area: 40,
      thickness: 200,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      layerScheme: 1,
    });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].name).toContain("Слой 1");
    expect(plates[0].name).toContain("100 мм");
    expect(plates[1].name).toContain("Слой 2");
  });

  it("layerScheme=1 при толщине 150 мм: слои 50+100 с разной упаковкой", () => {
    const r = calc({
      area: 40,
      thickness: 150,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      layerScheme: 1,
    });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].packageInfo?.size).toBe(12);
    expect(plates[1].packageInfo?.size).toBe(6);
  });

  it("дюбели в двухслойной схеме — сквозные на полную толщину", () => {
    const r = calc({
      area: 40,
      thickness: 200,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      layerScheme: 1,
    });
    const dowels = r.materials.find((m) => m.name.includes("Дюбели"));
    expect(dowels?.name).toContain("сквозные");
    expect(dowels?.name).toContain("250");
  });
});

describe("insulation formula — назначение (application)", () => {
  it("внутренняя стена: каркас, пароизоляция, без фасадного клея", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      application: 1,
      mountSystem: 0,
    });
    expect(r.totals.mountSystem).toBe(1);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("клей фасадный"))).toBe(false);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(true);
  });

  it("кровля: каркас без дюбелей и СФТК-материалов", () => {
    const r = calc({ area: 30, thickness: 150, productId: 1, application: 2 });
    expect(r.totals.mountSystem).toBe(1);
    expect(r.materials.some((m) => m.name.includes("Дюбели"))).toBe(false);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("стеклосетка"))).toBe(false);
  });
});

describe("insulation formula — сравнение типов по стоимости", () => {
  it("в ручном режиме — блок сравнения 4 типов", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
    });
    const compNote = r.practicalNotes?.find((n) => n.includes("Примерная стоимость"));
    expect(compNote).toBeDefined();
    expect(compNote).toContain("Минеральная вата");
    expect(compNote).toContain("ЭППС");
  });

  it("с выбранной линейкой — сравнение типов не дублируется", () => {
    const r = calc({ area: 40, thickness: 100, productId: 5, materialForm: INSULATION_FORM_SLABS });
    const multi = r.practicalNotes?.filter((n) => n.includes("Минеральная вата") && n.includes("ЭППС"));
    expect(multi?.length ?? 0).toBe(0);
    expect(r.practicalNotes?.some((n) => n.includes("Пеноплэкс"))).toBe(true);
  });
});
