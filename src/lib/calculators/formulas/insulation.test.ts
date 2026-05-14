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
