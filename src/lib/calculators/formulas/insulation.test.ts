import { describe, it, expect } from "vitest";
import { insulationDef } from "./insulation";

function calc(inputs: Record<string, unknown>) {
  // accuracyMode=basic чтобы числа не «плавали» от accuracy
  return insulationDef.calculate({ accuracyMode: "basic", ...inputs } as any);
}

describe("insulation formula — подстановка specs производителя", () => {
  it("без бренда: упаковка по толщине авто-расчёт", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 0 });
    expect(r.totals.piecesPerPack).toBe(6); // минвата 100 = 6 шт
    expect(r.materials[0].name).not.toContain("Роклайт");
  });

  it("Технониколь Роклайт: 6 плит/пачка для 100 мм", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 1 });
    expect(r.totals.piecesPerPack).toBe(6);
    expect(r.materials[0].name).toContain("Технониколь Роклайт");
  });

  it("Технониколь Техновент Стандарт: 3 плиты/пачка для 100 мм (плотная)", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 3 });
    expect(r.totals.piecesPerPack).toBe(3);
    expect(r.totals.brandDensity).toBe(80);
  });

  it("Пеноплэкс Комфорт автоматически переключает на ЭППС (insulationType=1)", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 10, insulationType: 0 });
    // Даже если юзер выбрал «минвата», бренд переопределяет тип
    expect(r.totals.insulationType).toBe(1);
    expect(r.totals.piecesPerPack).toBe(4);
  });

  it("Knauf Therm Wall (ППС) переключает на ППС и плиту 1000×500", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 13 });
    expect(r.totals.insulationType).toBe(2);
    expect(r.totals.plateSize).toBe(1);
    expect(r.totals.piecesPerPack).toBe(5);
  });

  it("warning при толщине вне линейки бренда", () => {
    // Роклайт выпускается в 50/100/150 мм. Толщина 80 мм не из линейки.
    const r = calc({ area: 40, thickness: 80, manufacturer: 1 });
    expect(r.warnings.some((w) => w.includes("Роклайт") && w.includes("не выпускается"))).toBe(true);
  });

  it("явный piecesPerPack от пользователя побеждает бренд", () => {
    // Роклайт = 6/пачка для 100 мм, но юзер указал 8
    const r = calc({ area: 40, thickness: 100, manufacturer: 1, piecesPerPack: 8 });
    expect(r.totals.piecesPerPack).toBe(8);
  });

  it("плотность бренда сохраняется в totals.brandDensity", () => {
    const r = calc({ area: 40, thickness: 100, manufacturer: 4 }); // Rockwool Лайт Баттс Скандик
    expect(r.totals.brandDensity).toBe(37);
  });
});

describe("insulation formula — плотность утеплителя", () => {
  it("по умолчанию (45 кг/м³) без warning о несовместимости", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 0 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
  });

  it("35 кг/м³ на мокром штукатурном фасаде → warning", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 0, density: 35 });
    expect(r.warnings.some((w) => w.includes("слишком низкая") && w.includes("80 кг/м³"))).toBe(true);
  });

  it("80 кг/м³ в каркасной системе → совет про экономию (но не warning)", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 1, density: 80 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("избыточна для каркасной"))).toBe(true);
  });

  it("35 кг/м³ в каркасе → ОК, без советов о переплате", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 1, density: 35 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("избыточна"))).toBe(false);
  });

  it("totals.effectiveDensity сохраняется", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0, density: 80 });
    expect(r.totals.effectiveDensity).toBe(80);
  });

  it("ЭППС — плотность не проверяется (это минвата-специфика)", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 1, mountSystem: 0, density: 35 });
    expect(r.warnings.some((w) => w.includes("слишком низкая"))).toBe(false);
  });

  it("цена минваты масштабируется по плотности (80 кг/м³ ≈ ×1.35 от 45 кг/м³)", () => {
    const r45 = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 1, density: 45 });
    const r80 = calc({ area: 40, thickness: 100, insulationType: 0, mountSystem: 0, density: 80 });
    const note45 = r45.practicalNotes?.find((n) => n.includes("Минеральная вата"))!;
    const note80 = r80.practicalNotes?.find((n) => n.includes("Минеральная вата"))!;
    // ru-RU локаль использует разные виды узких пробелов в разных версиях Node —
    // нормализуем все non-ASCII пробелы (U+00A0, U+202F и т.д.) к ASCII пробелу.
    const norm = (s: string) => s.replace(/\s/g, " ");
    expect(norm(note45)).toContain("16 000");
    expect(norm(note80)).toContain("21 600");
  });

  it("если бренд выбран, его плотность побеждает input.density", () => {
    // Rockwool Венти Баттс (manufacturer=6) = density 90
    const r = calc({ area: 40, thickness: 100, insulationType: 0, manufacturer: 6, density: 35 });
    expect(r.totals.brandDensity).toBe(90);
    // Цена должна быть по бренд-плотности 90 ≈ ближайший пресет 100 (×1.5)
    const note = r.practicalNotes?.find((n) => n.includes("Минеральная вата"))!;
    expect(note).toContain("(плотность 90 кг/м³)");
  });
});

describe("insulation formula — двухслойная укладка", () => {
  it("layerScheme=0 (один слой): одна позиция плит в материалах", () => {
    const r = calc({ area: 40, thickness: 200, insulationType: 0, layerScheme: 0 });
    const plates = r.materials.filter((m) => m.category === "Основное");
    expect(plates).toHaveLength(1);
    expect(plates[0].name).not.toContain("Слой");
  });

  it("layerScheme=1 при толщине 200 мм: два слоя по 100 мм", () => {
    const r = calc({ area: 40, thickness: 200, insulationType: 0, layerScheme: 1 });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].name).toContain("Слой 1");
    expect(plates[0].name).toContain("100 мм");
    expect(plates[1].name).toContain("Слой 2");
    expect(plates[1].name).toContain("100 мм");
  });

  it("layerScheme=1 при толщине 150 мм: слои 50+100", () => {
    const r = calc({ area: 40, thickness: 150, insulationType: 0, layerScheme: 1 });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].name).toContain("50 мм");
    expect(plates[1].name).toContain("100 мм");
    // У слоя 50 мм 12 плит в упаковке, у 100 мм — 6
    expect(plates[0].packageInfo?.size).toBe(12);
    expect(plates[1].packageInfo?.size).toBe(6);
  });

  it("layerScheme=1 при толщине 300 мм: слои 150+150", () => {
    const r = calc({ area: 40, thickness: 300, insulationType: 0, layerScheme: 1 });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates).toHaveLength(2);
    expect(plates[0].name).toContain("150 мм");
    expect(plates[1].name).toContain("150 мм");
  });

  it("layerScheme=1 при толщине вне карты (80 мм): fallback к одному слою", () => {
    const r = calc({ area: 40, thickness: 80, insulationType: 0, layerScheme: 1 });
    const layered = r.materials.filter((m) => m.name.includes("Слой"));
    expect(layered).toHaveLength(0);
  });

  it("дюбели в двухслойной схеме переименованы (удлинённые, с указанием полной толщины)", () => {
    const r = calc({ area: 40, thickness: 200, insulationType: 0, layerScheme: 1 });
    const dowels = r.materials.find((m) => m.name.includes("Дюбели"));
    expect(dowels).toBeDefined();
    expect(dowels!.name).toContain("удлинённые");
    expect(dowels!.name).toContain("200 мм");
  });

  it("companion-материалы не дублируются между слоями (каждый ровно по 1 шт)", () => {
    // Каркасная система с минватой даёт две *разные* мембраны (пароизол + ветрозащита)
    // + брус, скотч, саморезы. При двух слоях ни один companion не должен
    // дублироваться — берётся только из первого расчёта.
    const r = calc({ area: 40, thickness: 200, insulationType: 0, layerScheme: 1, mountSystem: 1 });
    const vapor = r.materials.filter((m) => m.name.startsWith("Пароизоляц"));
    const wind = r.materials.filter((m) => m.name.toLowerCase().includes("ветрозащит"));
    const lumber = r.materials.filter((m) => m.name.toLowerCase().includes("брус"));
    const screws = r.materials.filter((m) => m.name.toLowerCase().includes("саморез"));
    expect(vapor).toHaveLength(1);
    expect(wind).toHaveLength(1);
    expect(lumber).toHaveLength(1);
    expect(screws).toHaveLength(1);
  });

  it("practicalNotes содержит инструкцию про смещение стыков (СП 23-101-2004)", () => {
    const r = calc({ area: 40, thickness: 200, insulationType: 0, layerScheme: 1 });
    expect(r.practicalNotes?.some((n) => n.includes("Двухслойная") && n.includes("СП 23-101-2004"))).toBe(true);
  });

  it("с брендом: разные упаковки для каждого слоя из brand.packPieces", () => {
    // Rockwool Лайт Баттс Скандик (manufacturer=4): 50мм=12, 100мм=6, 150мм=4
    const r = calc({ area: 40, thickness: 150, insulationType: 0, layerScheme: 1, manufacturer: 4 });
    const plates = r.materials.filter((m) => m.name.includes("Слой"));
    expect(plates[0].packageInfo?.size).toBe(12); // 50 мм
    expect(plates[1].packageInfo?.size).toBe(6);  // 100 мм
    expect(plates[0].name).toContain("Rockwool");
    expect(plates[1].name).toContain("Rockwool");
  });
});

describe("insulation formula — сравнение типов по стоимости", () => {
  it("в practicalNotes есть блок сравнения с 4 типами", () => {
    const r = calc({ area: 40, thickness: 100, insulationType: 0 });
    const compNote = r.practicalNotes?.find((n) => n.includes("Примерная стоимость"));
    expect(compNote).toBeDefined();
    expect(compNote).toContain("Минеральная вата");
    expect(compNote).toContain("ЭППС");
    expect(compNote).toContain("ЕПС");
    expect(compNote).toContain("Эковата");
  });

  // ru-RU локаль использует узкий неразрывный пробел (U+202F) как разделитель тысяч.
  // Нормализуем к обычному пробелу для проверок.
  const norm = (s: string) => s.replace(/ | /g, " ");

  it("цена линейно зависит от толщины (50 мм = половина 100 мм)", () => {
    const r100 = calc({ area: 40, thickness: 100, insulationType: 0 });
    const r50 = calc({ area: 40, thickness: 50, insulationType: 0 });
    const note100 = norm(r100.practicalNotes?.find((n) => n.includes("Примерная"))!);
    const note50 = norm(r50.practicalNotes?.find((n) => n.includes("Примерная"))!);
    // Минвата: 400 ₽/м² × 40 м² × 1.0 = 16 000 ₽
    // При 50 мм: 16 000 × 0.5 = 8 000 ₽
    expect(note100).toContain("16 000");
    expect(note50).toContain("8 000");
  });

  it("сравнение масштабируется на площадь", () => {
    const r1 = calc({ area: 100, thickness: 100, insulationType: 0 });
    const note = norm(r1.practicalNotes?.find((n) => n.includes("Примерная"))!);
    // 400 × 100 = 40 000 ₽ за минвату
    expect(note).toContain("40 000");
  });

  it("заголовок содержит площадь и толщину пользователя", () => {
    const r = calc({ area: 75, thickness: 150, insulationType: 0 });
    const note = r.practicalNotes?.find((n) => n.includes("Примерная"))!;
    expect(note).toContain("75 м² × 150 мм");
  });
});
