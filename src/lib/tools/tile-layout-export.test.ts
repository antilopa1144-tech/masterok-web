import { describe, expect, it } from "vitest";
import { buildTileLayoutExportPlan } from "./tile-layout-export";
import { calculateTilePackaging } from "./tile-layout-purchase";

describe("tile-layout export plan", () => {
  it("одинаково объясняет потребность, коробки и остаток в PDF и share-тексте", () => {
    const plan = buildTileLayoutExportPlan({
      projectName: "Ванная — стена у двери",
      surfaceLabel: "Стена",
      surfaceW: 2500,
      surfaceH: 2600,
      tileW: 600,
      tileH: 300,
      groutMm: 2,
      layoutModeLabel: "Прямая",
      startModeLabel: "По центру",
      edgeCuts: { left: 346, right: 346, top: 91, bottom: 91 },
      surfaceAreaM2: 4.61,
      basePurchaseTiles: 45,
      reserveTiles: 5,
      reservePercent: 10,
      purchaseTiles: 50,
      opening: { widthMm: 900, heightMm: 2100 },
      packaging: calculateTilePackaging(50, 600, 300, {
        tilesPerBox: 10,
        packAreaM2: 1.8,
        source: "label",
      }),
    });

    expect(plan.materials[0]).toMatchObject({
      name: "Плитка 600×300 мм",
      quantity: 5,
      unit: "кор.",
      waste: 0.1,
    });
    expect(plan.materials[0].subtitle).toBe("10 шт./кор. (по этикетке) · купить 50 шт. · остаток 0 шт.");
    expect(plan.shareTitle).toContain("Ванная — стена у двери");
    expect(plan.totals).toEqual({ area: 4.61, tilesNeeded: 50, packsNeeded: 5, packArea: 1.8 });
    expect(plan.shareText).toContain("Потребность: 45 шт. + запас 5 шт. (10%) = 50 шт.");
    expect(plan.shareText).toContain("К покупке (по этикетке): 5 кор. × 10 шт. = 50 шт.");
    expect(plan.shareText).toContain("Старт: по центру");
    expect(plan.shareText).toContain("проём 900×2 100 мм");
    expect(plan.warnings.join(" ")).toContain("указана пользователем по этикетке");
    expect(plan.passport).toMatchObject({
      title: "Ванная — стена у двери",
      surface: "Стена 2 500×2 600 мм",
      tile: "600×300 мм",
      areaM2: 4.61,
      requiredTiles: 50,
      boxesToBuy: 5,
      tilesPerBox: 10,
      purchasedTiles: 50,
      leftoverTiles: 0,
      packagingSource: "label",
    });
    expect(plan.passport.adhesiveHint).toContain("4,61 м²");
    expect(plan.passport.groutHint).toContain("шов 2 мм");
  });

  it("не добавляет проём для пола", () => {
    const plan = buildTileLayoutExportPlan({
      surfaceLabel: "Пол",
      surfaceW: 3000,
      surfaceH: 2000,
      tileW: 300,
      tileH: 300,
      groutMm: 3,
      layoutModeLabel: "Диагональная",
      startModeLabel: "Автоматически по центру",
      edgeCuts: { left: 0, right: 0, top: 0, bottom: 0 },
      surfaceAreaM2: 6,
      basePurchaseTiles: 70,
      reserveTiles: 11,
      reservePercent: 15,
      purchaseTiles: 81,
      packaging: calculateTilePackaging(81, 300, 300, {
        tilesPerBox: 16,
        packAreaM2: 1.44,
        source: "estimated",
      }),
    });

    expect(plan.shareTitle).toContain("пол 3 000×2 000 мм");
    expect(plan.shareText).not.toContain("проём");
    expect(plan.shareText).toContain("диагональная");
    expect(plan.shareText).toContain("К покупке (оценка)");
    expect(plan.warnings.join(" ")).toContain("является оценкой");
    expect(plan.passport.packagingLabel).toBe("Предварительная оценка");
    expect(plan.passport.opening).toBeNull();
  });
});
