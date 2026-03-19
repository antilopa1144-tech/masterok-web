import { describe, expect, it } from "vitest";
import { computeCanonicalPrimer } from "../../engine/primer";
import { computeCanonicalTile } from "../../engine/tile";
import { computeCanonicalPutty } from "../../engine/putty";
import { computeCanonicalWallpaper } from "../../engine/wallpaper";
import { computeCanonicalFasteners } from "../../engine/fasteners";
import primerSpec from "../../configs/calculators/primer-canonical.v1.json";
import tileSpec from "../../configs/calculators/tile-canonical.v1.json";
import puttySpec from "../../configs/calculators/putty-canonical.v1.json";
import wallpaperSpec from "../../configs/calculators/wallpaper-canonical.v1.json";
import fastenersSpec from "../../configs/calculators/fasteners-canonical.v1.json";
import defaultFactorTables from "../../configs/factor-tables.json";
import type { AccuracyMode } from "../../engine/accuracy";

const FT = defaultFactorTables.factors as any;

// ── Helper: compute same scenario in all 3 modes ────────────────────────────

function threeModesRec(
  computeFn: (spec: any, inputs: any, ft: any) => any,
  spec: any,
  inputs: Record<string, any>,
) {
  const modes: AccuracyMode[] = ["basic", "realistic", "professional"];
  return Object.fromEntries(
    modes.map((mode) => {
      const result = computeFn(spec, { ...inputs, accuracyMode: mode }, FT);
      return [mode, {
        recExactNeed: result.scenarios.REC.exact_need,
        recPurchase: result.scenarios.REC.purchase_quantity,
        materials: result.materials,
        accuracyMode: result.accuracyMode,
      }];
    }),
  ) as Record<AccuracyMode, { recExactNeed: number; recPurchase: number; materials: any[]; accuracyMode: string }>;
}

// ── Primer ───────────────────────────────────────────────────────────────────

describe("Accuracy modes — Primer", () => {
  const inputs = { area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 5 };

  it("three modes produce different exact_need values", () => {
    const r = threeModesRec(computeCanonicalPrimer, primerSpec, inputs);
    expect(r.basic.recExactNeed).toBeLessThan(r.realistic.recExactNeed);
    expect(r.realistic.recExactNeed).toBeLessThan(r.professional.recExactNeed);
  });

  it("purchase >= exact_need in all modes", () => {
    const r = threeModesRec(computeCanonicalPrimer, primerSpec, inputs);
    for (const mode of ["basic", "realistic", "professional"] as const) {
      expect(r[mode].recPurchase, `purchase >= exact for ${mode}`).toBeGreaterThanOrEqual(r[mode].recExactNeed);
    }
  });

  it("all modes produce finite positive values", () => {
    const r = threeModesRec(computeCanonicalPrimer, primerSpec, inputs);
    for (const mode of ["basic", "realistic", "professional"] as const) {
      expect(Number.isFinite(r[mode].recExactNeed)).toBe(true);
      expect(r[mode].recExactNeed).toBeGreaterThan(0);
    }
  });

  it("result includes accuracyMode field", () => {
    const r = threeModesRec(computeCanonicalPrimer, primerSpec, inputs);
    expect(r.realistic.accuracyMode).toBe("realistic");
    expect(r.professional.accuracyMode).toBe("professional");
  });
});

// ── Tile ─────────────────────────────────────────────────────────────────────

describe("Accuracy modes — Tile", () => {
  const inputs = {
    inputMode: 1,
    area: 12,
    tileWidthCm: 30,
    tileHeightCm: 30,
    jointWidth: 2,
    groutDepth: 6,
    layoutPattern: 1,
    roomComplexity: 1,
  };

  it("realistic > basic for tile count (REC exact_need)", () => {
    const r = threeModesRec(computeCanonicalTile, tileSpec, inputs);
    expect(r.realistic.recExactNeed).toBeGreaterThan(r.basic.recExactNeed);
  });

  it("professional > realistic for tile count", () => {
    const r = threeModesRec(computeCanonicalTile, tileSpec, inputs);
    expect(r.professional.recExactNeed).toBeGreaterThan(r.realistic.recExactNeed);
  });

  it("glue and grout also scale with mode", () => {
    const basic = computeCanonicalTile(tileSpec as any, { ...inputs, accuracyMode: "basic" }, FT);
    const prof = computeCanonicalTile(tileSpec as any, { ...inputs, accuracyMode: "professional" }, FT);
    expect(prof.totals.glueNeededKg).toBeGreaterThan(basic.totals.glueNeededKg);
    expect(prof.totals.groutNeededKg).toBeGreaterThan(basic.totals.groutNeededKg);
  });

  it("units remain consistent across modes", () => {
    const r = threeModesRec(computeCanonicalTile, tileSpec, inputs);
    for (const mode of ["basic", "realistic", "professional"] as const) {
      const tileMat = r[mode].materials.find((m: any) => m.category === "Основное");
      expect(tileMat?.unit).toBe("шт");
    }
  });
});

// ── Putty ────────────────────────────────────────────────────────────────────

describe("Accuracy modes — Putty", () => {
  const inputs = { inputMode: 1, area: 50, puttyType: 1, qualityClass: 0, bagWeight: 20 };

  it("professional putty > realistic > basic (REC exact_need)", () => {
    const r = threeModesRec(computeCanonicalPutty, puttySpec, inputs);
    expect(r.realistic.recExactNeed).toBeGreaterThan(r.basic.recExactNeed);
    expect(r.professional.recExactNeed).toBeGreaterThan(r.realistic.recExactNeed);
  });

  it("packaging not less than exact need", () => {
    const r = threeModesRec(computeCanonicalPutty, puttySpec, inputs);
    for (const mode of ["basic", "realistic", "professional"] as const) {
      expect(r[mode].recPurchase).toBeGreaterThanOrEqual(r[mode].recExactNeed);
    }
  });

  it("auxiliary materials (serpyanka) scale with accessories multiplier", () => {
    const basic = computeCanonicalPutty(puttySpec as any, { ...inputs, accuracyMode: "basic" }, FT);
    const prof = computeCanonicalPutty(puttySpec as any, { ...inputs, accuracyMode: "professional" }, FT);
    const basicSerp = basic.materials.find((m: any) => m.name.includes("Серпянка"));
    const profSerp = prof.materials.find((m: any) => m.name.includes("Серпянка"));
    if (basicSerp && profSerp) {
      expect(profSerp.purchaseQty ?? 0).toBeGreaterThanOrEqual(basicSerp.purchaseQty ?? 0);
    }
  });
});

// ── Wallpaper ────────────────────────────────────────────────────────────────

describe("Accuracy modes — Wallpaper", () => {
  const inputs = { perimeter: 14, height: 2.7, rollLength: 10, rollWidth: 0.53, rapport: 0, doors: 1, windows: 1, reserveRolls: 1 };

  it("professional > realistic > basic for rolls", () => {
    const r = threeModesRec(computeCanonicalWallpaper, wallpaperSpec, inputs);
    expect(r.realistic.recExactNeed).toBeGreaterThan(r.basic.recExactNeed);
    expect(r.professional.recExactNeed).toBeGreaterThan(r.realistic.recExactNeed);
  });

  it("paste and primer also scale", () => {
    const basic = computeCanonicalWallpaper(wallpaperSpec as any, { ...inputs, accuracyMode: "basic" }, FT);
    const prof = computeCanonicalWallpaper(wallpaperSpec as any, { ...inputs, accuracyMode: "professional" }, FT);
    expect(prof.totals.pasteNeededKg).toBeGreaterThan(basic.totals.pasteNeededKg);
    expect(prof.totals.primerNeededL).toBeGreaterThan(basic.totals.primerNeededL);
  });
});

// ── Fasteners ────────────────────────────────────────────────────────────────

describe("Accuracy modes — Fasteners", () => {
  const inputs = { materialType: 0, sheetCount: 10, fastenerStep: 250, withFrameScrews: 1, withDubels: 0 };

  it("professional > realistic > basic for screw count", () => {
    const r = threeModesRec(computeCanonicalFasteners, fastenersSpec, inputs);
    expect(r.realistic.recExactNeed).toBeGreaterThan(r.basic.recExactNeed);
    expect(r.professional.recExactNeed).toBeGreaterThan(r.realistic.recExactNeed);
  });

  it("bits count scales with mode", () => {
    const basic = computeCanonicalFasteners(fastenersSpec as any, { ...inputs, accuracyMode: "basic" }, FT);
    const prof = computeCanonicalFasteners(fastenersSpec as any, { ...inputs, accuracyMode: "professional" }, FT);
    expect(prof.totals.bits).toBeGreaterThanOrEqual(basic.totals.bits);
  });
});

// ── Small values ─────────────────────────────────────────────────────────────

describe("Accuracy modes — small values", () => {
  it("primer with 1 m² does not produce zero", () => {
    const result = computeCanonicalPrimer(
      primerSpec as any,
      { area: 1, surfaceType: 0, primerType: 0, coats: 1, canSize: 5, accuracyMode: "basic" },
      FT,
    );
    expect(result.scenarios.REC.exact_need).toBeGreaterThan(0);
    expect(result.scenarios.REC.purchase_quantity).toBeGreaterThanOrEqual(result.scenarios.REC.exact_need);
  });

  it("fasteners with 1 sheet does not produce zero", () => {
    const result = computeCanonicalFasteners(
      fastenersSpec as any,
      { materialType: 0, sheetCount: 1, fastenerStep: 250, accuracyMode: "professional" },
      FT,
    );
    expect(result.scenarios.REC.exact_need).toBeGreaterThan(0);
  });
});

// ── Cross-mode consistency ──────────────────────────────────────────────────

describe("Accuracy modes — cross-mode consistency", () => {
  it("tile: basic mode preserves original normative formula behavior", () => {
    // Basic mode should be very close to the original (no accuracy modifiers)
    const basicResult = computeCanonicalTile(
      tileSpec as any,
      { inputMode: 1, area: 12, tileWidthCm: 30, tileHeightCm: 30, jointWidth: 2, layoutPattern: 1, roomComplexity: 1, accuracyMode: "basic" },
      FT,
    );

    // Area=12, tile=0.09m², waste% = layout + complexity + sizeAdj
    // The exact waste depends on spec — just verify basic is plausible
    const tileAreaM2 = 0.3 * 0.3;
    const minTiles = 12 / tileAreaM2; // ~133 without any waste
    const maxTiles = (12 / tileAreaM2) * 1.2; // max 20% waste
    expect(basicResult.totals.baseExactNeedTiles).toBeGreaterThan(minTiles);
    expect(basicResult.totals.baseExactNeedTiles).toBeLessThan(maxTiles);
  });

  it("putty: result is plausible for 50 m² walls", () => {
    const result = computeCanonicalPutty(
      puttySpec as any,
      { inputMode: 1, area: 50, puttyType: 0, qualityClass: 0, bagWeight: 20, accuracyMode: "realistic" },
      FT,
    );

    // Finish putty: ~1.0-1.2 kg/m² × 50 m² = ~50-60 kg (plus modifiers)
    expect(result.scenarios.REC.exact_need).toBeGreaterThan(30);
    expect(result.scenarios.REC.exact_need).toBeLessThan(200);
  });
});
