import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateSheetLayout, type SheetLayoutInput } from "../src/lib/tools/sheet-layout";

const article = readFileSync("content/blog-drafts/raskladka-osp-na-polu/article.md", "utf8");
const toolPage = readFileSync("src/app/instrumenty/raskladka-listov/page.tsx", "utf8");

const input: SheetLayoutInput = {
  surfaceWidthMm: 3000,
  surfaceHeightMm: 4000,
  sheetWidthMm: 1250,
  sheetLengthMm: 2500,
  material: "osb",
  surface: "floor",
  orientation: "auto",
  stagger: "half",
  layers: 1,
  jointGapMm: 3,
  reservePercent: 5,
};

describe("проверяемый пример статьи о раскладке ОСП", () => {
  it("соответствует шести деталям, пяти листам в раскрое и отдельному резерву", () => {
    const result = calculateSheetLayout(input);
    const placements = result.layers[0].placements;

    expect(result.surfaceAreaM2).toBe(12);
    expect(placements.map((part) => [part.widthMm, part.heightMm])).toEqual([
      [1250, 2500], [1250, 2500], [494, 2500],
      [625, 1497], [1250, 1497], [1119, 1497],
    ]);
    expect(result.baseSheets).toBe(5);
    expect(result.reserveSheets).toBe(1);
    expect(result.purchaseSheets).toBe(6);
    expect(result.stock.map((sheet) => sheet.cuts.length)).toEqual([1, 1, 1, 1, 2]);
    expect(result.netMaterialAreaM2).toBe(11.97);
    expect(result.offcutAreaM2).toBe(3.66);
    expect(result.wastePercent).toBe(23.4);

    expect(article).toContain("1 250 + 3 + 1 250 + 3 + 494");
    expect(article).toContain("625 + 3 + 1 250 + 3 + 1 119");
    expect(article).toContain("2 500 + 3 + 1 497 = 4 000 мм");
  });

  it("отделяет выбранную ориентацию от несущей схемы и резерв от базы", () => {
    const result = calculateSheetLayout(input);
    const withoutReserve = calculateSheetLayout({ ...input, reservePercent: 0 });

    expect(result.comparisons.map(({ baseSheets, cutPieces }) => [baseSheets, cutPieces]))
      .toEqual([[5, 4], [5, 6]]);
    expect(withoutReserve.baseSheets).toBe(5);
    expect(withoutReserve.purchaseSheets).toBe(5);
    expect(article).toContain("не проверяет несущую способность");
    expect(article).toContain("не доказанный математический минимум");
    expect(article).toContain("при неизменной схеме к покупке останутся пять");
  });

  it("связывает статью и инструмент в обе стороны", () => {
    expect(article).toContain("/instrumenty/raskladka-listov/");
    expect(toolPage).toContain('<Link href="/blog/raskladka-osp-na-polu/"');
  });
});
