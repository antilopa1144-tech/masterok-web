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

function mainInsulation<M extends { category?: string; name: string }>(materials: M[]) {
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
      application: 3,
      insulationType: 0,
    });
    expect(r.totals.insulationType).toBe(1);
    expect(r.totals.piecesPerPack).toBe(4);
    expect(r.materials[0].category).toBe("Утеплитель (пеноплекс)");
  });

  it("Пеноплэкс Комфорт 50 мм: актуальная фасовка 7 листов", () => {
    const r = calc({
      area: 40,
      thickness: 50,
      productId: 5,
      materialForm: INSULATION_FORM_SLABS,
      application: 3,
    });
    expect(r.totals.piecesPerPack).toBe(7);
    expect(r.materials[0].packageInfo?.size).toBe(7);
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
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      application: 1,
    });
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
      application: 2,
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
      application: 1,
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

  it("СФТК: ручной ЭППС даёт клей; вентфасад — ветрозащита; внутренняя — пароизоляция", () => {
    const eps = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 0,
      application: 0,
    });
    const woolVentFacade = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 1,
      application: 0,
    });
    const woolInterior = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      application: 1,
    });
    expect(eps.materials.some((m) => m.name.toLowerCase().includes("клей фасадный"))).toBe(true);
    expect(eps.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(false);
    expect(woolVentFacade.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(true);
    expect(woolVentFacade.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(false);
    expect(woolInterior.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(true);
    expect(woolInterior.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(false);
  });
});

describe("insulation formula — плотность утеплителя", () => {
  it("по умолчанию (80 кг/м³, фасад) без warning о низкой плотности", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 0, application: 0 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
  });

  it("45 кг/м³ на мокром штукатурном фасаде → справочный warning без выдачи плотности за допуск", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
      mountSystem: 0,
      density: 45,
      application: 0,
    });
    expect(
      r.warnings.some(
        (w) => w.includes("справочного порога 80 кг/м³") && w.includes("нельзя определять только по плотности"),
      ),
    ).toBe(true);
  });

  it("80 кг/м³ в каркасной системе → граница применимости плотности (но не warning)", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
      mountSystem: 1,
      density: 80,
    });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
    expect(
      r.practicalNotes?.some((n) => n.includes("сама по себе не подтверждает удержание в каркасе")),
    ).toBe(true);
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
      productId: 2,
      materialForm: INSULATION_FORM_SLABS,
      application: 0,
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
      productId: 2,
      materialForm: INSULATION_FORM_SLABS,
      application: 0,
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
      application: 1,
      layerScheme: 1,
    });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].packageInfo?.size).toBe(12);
    expect(plates[1].packageInfo?.size).toBe(6);
  });

  it("дюбели в двухслойной схеме — предварительная длина по полной толщине", () => {
    const r = calc({
      area: 40,
      thickness: 200,
      productId: 2,
      materialForm: INSULATION_FORM_SLABS,
      application: 0,
      mountSystem: 0,
      layerScheme: 1,
    });
    const dowels = r.materials.find((m) => m.name.includes("Дюбели"));
    expect(dowels?.name).toContain("расчётная длина");
    expect(dowels?.name).toContain("250");
    expect(dowels?.subtitle).toContain("проект и документация СФТК");
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
    expect(r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(true);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("брус"))).toBe(true);
  });

  it("пол минвата: пароизоляция, без ветрозащиты и бруса каркаса", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 11,
      application: 3,
      mountSystem: 0,
    });
    expect(r.totals.mountSystem).toBe(1);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(true);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(false);
    expect(r.materials.some((m) => m.name.includes("Брус 50×50"))).toBe(false);
    expect(r.materials.some((m) => m.name.includes("Клей фасадный"))).toBe(false);
    expect(r.materialListBanner).toContain("Пол");
  });

  it("пол: лёгкая минвата с фасада — предупреждение о несовместимости", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      application: 3,
    });
    expect(
      r.warnings.some((w) => w.includes("не входит в справочный список")),
    ).toBe(true);
  });

  it("пол пеноплекс: без мембран и каркаса (типичный пол под стяжку)", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 5,
      application: 3,
    });
    expect(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(false);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(false);
    expect(r.materials.some((m) => m.name.includes("Брус"))).toBe(false);
    expect(r.warnings.some((w) => w.includes("Для пола выбрана минвата"))).toBe(false);
  });

  it("внутренняя стена: пароизоляция без ветрозащиты", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      application: 1,
    });
    expect(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(true);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(false);
    expect(r.materials.some((m) => m.name.includes("Брус"))).toBe(true);
  });

  it("цоколь: без пароизоляции и бруса", () => {
    const r = calc({
      area: 30,
      thickness: 100,
      productId: 5,
      application: 4,
    });
    expect(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц"))).toBe(false);
    expect(r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит"))).toBe(false);
    expect(r.materials.some((m) => m.name.includes("Брус"))).toBe(false);
  });
});

describe("insulation formula — прозрачный результат без неподтверждённой цены", () => {
  it("не выводит встроенное сравнение цен и показывает потребность до упаковки", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
    });
    expect(r.practicalNotes?.some((n) => n.includes("Примерная стоимость"))).toBe(false);
    expect(r.summaryCards?.[1].label).toBe("Расчётная потребность");
    expect(r.summaryCards?.[1].hint).toContain("до округления");
  });

  it("материалы с подзаголовком размера плиты из каталога", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      application: 1,
    });
    const main = r.materials.find((m) => m.category === "Утеплитель (плиты)");
    expect(main?.subtitle).toContain("1200×600");
    expect(main?.subtitle).toContain("37 кг/м³");
  });

  it("с выбранной линейкой показывает проверку этикетки и не дублирует сравнение цен", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 5,
      materialForm: INSULATION_FORM_SLABS,
      application: 3,
    });
    const multi = r.practicalNotes?.filter((n) => n.includes("Минеральная вата") && n.includes("ЭППС"));
    expect(multi?.length ?? 0).toBe(0);
    expect(r.practicalNotes?.some((n) => n.includes("Пеноплэкс"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("сверьте их с этикеткой конкретной партии"))).toBe(true);
  });
});

describe("insulation formula — пользовательские границы", () => {
  it("не выдаёт встроенную региональную шкалу за норму СП", () => {
    const r = calc({
      area: 40,
      thickness: 50,
      productId: INSULATION_PRODUCT_MANUAL,
      insulationType: 0,
      climateZone: 3,
    });
    expect(r.warnings.some((w) => w.includes("ниже встроенного ориентира"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("меньше нормы СП"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("не определяет требуемое сопротивление"))).toBe(true);
    expect(r.practicalNotes?.some((n) => n.includes("соответствует рекомендации СП"))).toBe(false);
  });

  it("поля и контент используют действующий СП 50 и первичные ссылки", () => {
    const climate = insulationDef.fields.find((field) => field.key === "climateZone");
    const thickness = insulationDef.fields.find((field) => field.key === "thickness");
    const content = `${insulationDef.formulaDescription} ${insulationDef.seoContent?.descriptionHtml ?? ""} ${JSON.stringify(insulationDef.seoContent?.faq ?? [])}`;

    expect(climate?.label).toContain("не расчёт по СП");
    expect(thickness?.label).toContain("Проектная толщина");
    expect(content).toContain("СП 50.13330.2024");
    expect(content).toContain("protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c");
    expect(content).toContain("СП 293.1325800.2017 с изменениями № 1 и № 2");
    expect(content).not.toContain("СП 50.13330.2012");
    expect(content).not.toContain("стены дышат");
    expect(content).not.toContain("8–10 шт/м²");
  });

  it("раскрывает фиксированные допущения сопутствующих материалов", () => {
    const r = calc({
      area: 40,
      thickness: 100,
      productId: 2,
      materialForm: INSULATION_FORM_SLABS,
      application: 0,
      mountSystem: 0,
    });
    expect(r.materials.find((m) => m.name.includes("Клей фасадный"))?.subtitle).toContain("5 кг/м²");
    expect(r.materials.find((m) => m.name.includes("Стеклосетка"))?.subtitle).toContain("×1,10");
    expect(r.materials[0].subtitle).toContain("сверьте этикетку партии");
  });
});
