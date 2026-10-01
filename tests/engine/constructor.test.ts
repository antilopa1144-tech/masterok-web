import { describe, expect, it } from "vitest";
import { calculateProject, calculateRoom, createDefaultProject, createRoom, validateProject } from "../../engine/constructor/calculate";
import type { ConstructorProject, ConstructorRoom } from "../../engine/constructor/model";

function room(overrides: Partial<ConstructorRoom> = {}): ConstructorRoom {
  const value = createRoom("Тестовая");
  return { ...value, id: "room-a", widthMm: 3000, lengthMm: 4000, ...overrides, floor: { ...value.floor, boardsPerPack: 4, packPriceRub: 1000, ...overrides.floor } };
}

function project(rooms: ConstructorRoom[]): ConstructorProject {
  return { ...createDefaultProject(), id: "project-a", rooms };
}

describe("constructor floor core", () => {
  it("связывает каждую деталь с исходной доской и сохраняет баланс материала", () => {
    const result = calculateRoom(room());
    expect(result.pieces.length).toBeGreaterThan(0);
    expect(result.pieces.every((piece) => result.sourceBoards.some((board) => board.id === piece.sourceBoardId))).toBe(true);
    expect(result.pieces.every((piece) => piece.sourceLengthMm > 0 && piece.sourceWidthMm > 0)).toBe(true);
    const supplied = result.sourceBoards.length * 1285 * 192 / 1_000_000;
    const placed = result.pieces.reduce((sum, piece) => sum + piece.widthMm * piece.heightMm / 1_000_000, 0);
    expect(supplied).toBeCloseTo(placed + result.offcutAreaM2 + result.kerfAreaM2, 8);
  });

  it("поворот меняет ориентацию длинной стороны на карте комнаты", () => {
    const alongWidth = calculateRoom(room({ floor: { ...createRoom().floor, direction: "width" } }));
    const alongLength = calculateRoom(room({ floor: { ...createRoom().floor, direction: "length" } }));
    expect(alongWidth.pieces[0].widthMm).toBeGreaterThan(alongWidth.pieces[0].heightMm);
    expect(alongLength.pieces[0].heightMm).toBeGreaterThan(alongLength.pieces[0].widthMm);
  });

  it("вычитает зазор из покрываемой площади", () => {
    const result = calculateRoom(room({ floor: { ...createRoom().floor, expansionGapMm: 10 } }));
    expect(result.areaM2).toBe(12);
    expect(result.coveredAreaM2).toBeCloseTo(2.98 * 3.98, 8);
  });

  it("держит дробный резерв до общего округления упаковок", () => {
    const a = room({ id: "a", floor: { ...createRoom().floor, boardsPerPack: 10, packPriceRub: 500, reservePercent: 5 } });
    const b = room({ id: "b", floor: { ...a.floor } });
    const calculated = calculateProject(project([a, b]));
    const laminate = calculated.purchases.find((line) => line.name.startsWith("Ламинат"))!;
    const bases = calculated.rooms.reduce((sum, item) => sum + item.baseBoards, 0);
    expect(laminate.quantity).toBe(Math.ceil(Math.ceil(bases * 1.05) / 10));
    expect(laminate.roomIds).toEqual(["a", "b"]);
    expect(laminate.roundedBoards).toBe(Math.ceil(bases * 1.05));
    expect(laminate.purchasedBoards).toBe(laminate.quantity * 10);
    expect(laminate.packSurplusBoards).toBe(laminate.purchasedBoards! - laminate.roundedBoards!);
    expect(Number.isFinite(laminate.purchasedAreaM2)).toBe(true);
  });

  it("учитывает пропил и объединяет только противоположные торцевые детали", () => {
    const result = calculateRoom(room({ widthMm: 2000, lengthMm: 1000, floor: { ...createRoom().floor, direction: "width", pattern: "half", kerfMm: 10, expansionGapMm: 0 } }));
    const paired = result.sourceBoards.find((board) => board.pieceIds.length === 2);
    expect(paired).toBeDefined();
    expect(paired!.kerfAreaM2).toBeGreaterThan(0);
    const pairedPieces = result.pieces.filter((piece) => piece.sourceBoardId === paired!.id);
    expect(new Set(pairedPieces.map((piece) => piece.end))).toEqual(new Set(["start", "end"]));
    expect(pairedPieces.reduce((sum, piece) => sum + piece.sourceLengthMm, 0) + 20).toBeLessThanOrEqual(1285);
  });

  it("не записывает пропил больше фактически оставшейся длины или ширины", () => {
    const almostFullEnd = calculateRoom(room({ widthMm: 1284, lengthMm: 384, floor: { ...createRoom().floor, direction: "width", expansionGapMm: 0, kerfMm: 3 } }));
    const endPiece = almostFullEnd.pieces.find((piece) => piece.sourceLengthMm === 1284 && piece.sourceWidthMm === 192)!;
    const endSource = almostFullEnd.sourceBoards.find((board) => board.id === endPiece.sourceBoardId)!;
    expect(endSource.kerfAreaM2).toBeCloseTo(192 / 1_000_000, 10);
    const narrowRow = calculateRoom(room({ widthMm: 1285, lengthMm: 767, floor: { ...createRoom().floor, direction: "width", expansionGapMm: 0, kerfMm: 3 } }));
    const narrowPiece = narrowRow.pieces.find((piece) => piece.sourceLengthMm === 1285 && piece.sourceWidthMm === 191)!;
    const narrowSource = narrowRow.sourceBoards.find((board) => board.id === narrowPiece.sourceBoardId)!;
    expect(narrowSource.kerfAreaM2).toBeCloseTo(1285 / 1_000_000, 10);
    for (const result of [almostFullEnd, narrowRow]) {
      const supplied = result.sourceBoards.length * 1285 * 192 / 1_000_000;
      const placed = result.pieces.reduce((sum, piece) => sum + piece.widthMm * piece.heightMm / 1_000_000, 0);
      expect(supplied).toBeCloseTo(placed + result.offcutAreaM2 + result.kerfAreaM2, 9);
    }
  });

  it("вычитает из плинтуса только двери и собирает его целыми планками", () => {
    const r = room({ openings: [
      { id: "door", type: "door", wall: 0, offsetMm: 0, widthMm: 800, heightMm: 2000, sillMm: 0 },
      { id: "window", type: "window", wall: 1, offsetMm: 0, widthMm: 1200, heightMm: 1500, sillMm: 900 },
    ], floor: { ...createRoom().floor, includePlinth: true, plinthLengthMm: 2500, plinthPiecePriceRub: 100 } });
    const result = calculateProject(project([r]));
    expect(result.rooms[0].plinthNeededMm).toBe(13200);
    expect(result.purchases.find((line) => line.name === "Плинтус")?.quantity).toBe(6);
  });

  it("объединяет одинаковый товар до упаковок даже при разных ценах по комнатам", () => {
    const first = room({ id: "first" }); const second = room({ id: "second" });
    Object.assign(first.floor, { boardsPerPack: 8, packPriceRub: 2000, includeUnderlay: true, underlayRollPriceRub: 900, includePlinth: true, plinthPiecePriceRub: 350 });
    Object.assign(second.floor, { boardsPerPack: 8, packPriceRub: 1500, includeUnderlay: true, underlayRollPriceRub: 700, includePlinth: true, plinthPiecePriceRub: 300 });
    const result = calculateProject(project([first, second]));
    expect(result.purchases).toHaveLength(3);
    const laminate = result.purchases.find((line) => line.unit === "упак.")!;
    expect(laminate.quantity).toBe(15); expect(laminate.unitPriceRub).toBe(2000);
    expect(laminate.basis).toContain("максимальная");
    expect(result.purchases.find((line) => line.name === "Подложка")?.quantity).toBe(3);
    expect(result.purchases.find((line) => line.name === "Плинтус")?.quantity).toBe(12);
    second.floor.packPriceRub = 0;
    const knownPrice = calculateProject(project([first, second])).purchases.find((line) => line.unit === "упак.")!;
    expect(knownPrice.quantity).toBe(15); expect(knownPrice.unitPriceRub).toBe(2000);
    expect(knownPrice.basis).toContain("не задана");
    second.floor.materialKey = "Другой товар";
    expect(calculateProject(project([first, second])).purchases.filter((line) => line.unit === "упак.")).toHaveLength(2);
  });

  it("объединяет товар без цены и явно исключает его стоимость из суммы", () => {
    const first = room({ id: "first" }); const second = room({ id: "second" });
    Object.assign(first.floor, { boardsPerPack: 8, packPriceRub: 0, includeUnderlay: true, underlayRollPriceRub: 0, includePlinth: true, plinthPiecePriceRub: 0 });
    Object.assign(second.floor, { ...first.floor });
    const result = calculateProject(project([first, second]));
    expect(result.purchases).toHaveLength(3);
    expect(result.purchases.find((line) => line.unit === "упак.")?.quantity).toBe(15);
    for (const line of result.purchases) {
      expect(line.unitPriceRub).toBe(0); expect(line.totalPriceRub).toBe(0);
      expect(line.priceNote).toContain("Цена не задана");
      expect(line.basis).toContain("не включена в сумму");
    }
    expect(result.totalCostRub).toBe(0);
  });

  it("отклоняет NaN, слишком большую геометрию и слишком тяжёлую раскладку", () => {
    const invalid = project([room({ widthMm: Number.NaN })]);
    expect(validateProject(invalid).join(" ")).toContain("widthMm");
    expect(() => calculateProject(invalid)).toThrow("widthMm");
    const tooLarge = project([room({ widthMm: 30_000, lengthMm: 30_000, floor: { ...createRoom().floor, boardLengthMm: 100, boardWidthMm: 100 } })]);
    expect(validateProject(tooLarge).join(" ")).toContain("лимит");
  });

  it("проверяет упаковку, границы UI, уникальные комнаты и пересечения проёмов", () => {
    const first = room({ id: "same", floor: { ...createRoom().floor, boardsPerPack: 1.5, reservePercent: 101, underlayRollAreaM2: Number.MIN_VALUE, plinthLengthMm: Number.MIN_VALUE } });
    const second = room({ id: "same", openings: [
      { id: "door", type: "door", wall: 0, offsetMm: 100, widthMm: 900, heightMm: 2000, sillMm: 0 },
      { id: "window", type: "window", wall: 0, offsetMm: 500, widthMm: 900, heightMm: 1000, sillMm: 900 },
    ] });
    const errors = validateProject(project([first, second])).join(" ");
    expect(errors).toContain("boardsPerPack");
    expect(errors).toContain("reservePercent");
    expect(errors).toContain("underlayRollAreaM2");
    expect(errors).toContain("plinthLengthMm");
    expect(errors).toContain("id комнаты");
    expect(errors).toContain("пересекаются");
    expect(calculateProject(project([]))).toEqual({ rooms: [], purchases: [], totalCostRub: 0 });
  });
});
