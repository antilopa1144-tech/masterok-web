import { describe, expect, it } from "vitest";
import {
  ACCURACY_MODES,
  type AccuracyMode,
  type MaterialCategory,
  getAccuracyModifiers,
  computeAccuracyMultiplier,
  applyAccuracyMode,
  getPrimaryMultiplier,
  getAccessoriesMultiplier,
  checkAccuracyInvariants,
  ACCURACY_MODE_LABELS,
  ACCURACY_MODE_DESCRIPTIONS,
} from "../../engine/accuracy";

// ── Core modifier logic ─────────────────────────────────────────────────────

describe("Accuracy mode — core logic", () => {
  it("basic mode multiplier is 1.0 for all categories", () => {
    const categories: MaterialCategory[] = [
      "tile", "tile_adhesive", "grout", "primer", "wallpaper",
      "putty", "paint", "plaster", "decorative_stone", "drywall",
      "fasteners", "insulation", "flooring", "concrete", "waterproofing", "generic",
    ];

    for (const cat of categories) {
      const m = getAccuracyModifiers(cat, "basic");
      const multiplier = computeAccuracyMultiplier(m);
      expect(multiplier, `basic multiplier for ${cat} must be 1.0`).toBe(1);
    }
  });

  it("realistic multiplier is > 1.0 for all material categories", () => {
    const categories: MaterialCategory[] = [
      "tile", "tile_adhesive", "grout", "primer", "wallpaper",
      "putty", "paint", "plaster", "decorative_stone", "drywall",
      "fasteners", "insulation", "flooring", "concrete", "waterproofing", "generic",
    ];

    for (const cat of categories) {
      const mult = computeAccuracyMultiplier(getAccuracyModifiers(cat, "realistic"));
      expect(mult, `realistic > 1 for ${cat}`).toBeGreaterThan(1);
    }
  });

  it("professional multiplier > realistic multiplier for all categories", () => {
    const categories: MaterialCategory[] = [
      "tile", "tile_adhesive", "grout", "primer", "wallpaper",
      "putty", "paint", "plaster", "decorative_stone", "drywall",
      "fasteners", "insulation", "flooring", "concrete", "waterproofing", "generic",
    ];

    for (const cat of categories) {
      const realisticMult = computeAccuracyMultiplier(getAccuracyModifiers(cat, "realistic"));
      const professionalMult = computeAccuracyMultiplier(getAccuracyModifiers(cat, "professional"));
      expect(professionalMult, `professional > realistic for ${cat}`).toBeGreaterThan(realisticMult);
    }
  });

  it("basic ≤ realistic ≤ professional (ordering invariant)", () => {
    for (const mode of ACCURACY_MODES) {
      const mult = computeAccuracyMultiplier(getAccuracyModifiers("generic", mode));
      expect(mult).toBeGreaterThanOrEqual(1);
    }

    const b = computeAccuracyMultiplier(getAccuracyModifiers("generic", "basic"));
    const r = computeAccuracyMultiplier(getAccuracyModifiers("generic", "realistic"));
    const p = computeAccuracyMultiplier(getAccuracyModifiers("generic", "professional"));
    expect(r).toBeGreaterThanOrEqual(b);
    expect(p).toBeGreaterThanOrEqual(r);
  });
});

// ── applyAccuracyMode ───────────────────────────────────────────────────────

describe("applyAccuracyMode", () => {
  it("basic mode returns original value unchanged", () => {
    const { adjustedValue, explanation } = applyAccuracyMode(100, "tile", "basic");
    expect(adjustedValue).toBe(100);
    expect(explanation.mode).toBe("basic");
    expect(explanation.appliedModifiers).toHaveLength(0);
    expect(explanation.combinedMultiplier).toBe(1);
  });

  it("realistic mode applies modifiers to the value", () => {
    const { adjustedValue, explanation } = applyAccuracyMode(100, "tile", "realistic");
    expect(adjustedValue).toBeGreaterThan(100);
    expect(explanation.mode).toBe("realistic");
    expect(explanation.appliedModifiers.length).toBeGreaterThan(0);
  });

  it("professional mode produces higher value than realistic", () => {
    const realistic = applyAccuracyMode(100, "primer", "realistic").adjustedValue;
    const professional = applyAccuracyMode(100, "primer", "professional").adjustedValue;
    expect(professional).toBeGreaterThan(realistic);
  });

  it("explanation contains notes and labels in Russian", () => {
    const { explanation } = applyAccuracyMode(50, "putty", "professional");
    expect(explanation.modeLabel).toBe("Профессиональный");
    expect(explanation.notes.length).toBeGreaterThan(0);
    for (const mod of explanation.appliedModifiers) {
      expect(mod.label).toBeTruthy();
      expect(mod.reason).toBeTruthy();
      expect(mod.value).toBeGreaterThan(1);
    }
  });
});

// ── getPrimaryMultiplier / getAccessoriesMultiplier ──────────────────────────

describe("getPrimaryMultiplier / getAccessoriesMultiplier", () => {
  it("primary basic = 1.0", () => {
    expect(getPrimaryMultiplier("tile", "basic")).toBe(1);
    expect(getPrimaryMultiplier("putty", "basic")).toBe(1);
    expect(getPrimaryMultiplier("generic", "basic")).toBe(1);
  });

  it("accessories realistic > 1 for relevant categories", () => {
    expect(getAccessoriesMultiplier("tile", "realistic")).toBeGreaterThan(1);
    expect(getAccessoriesMultiplier("wallpaper", "realistic")).toBeGreaterThan(1);
    expect(getAccessoriesMultiplier("fasteners", "realistic")).toBeGreaterThan(1);
  });

  it("accessories professional > accessories realistic", () => {
    for (const cat of ["tile", "wallpaper", "fasteners", "putty"] as MaterialCategory[]) {
      const r = getAccessoriesMultiplier(cat, "realistic");
      const p = getAccessoriesMultiplier(cat, "professional");
      expect(p, `accessories prof > real for ${cat}`).toBeGreaterThanOrEqual(r);
    }
  });
});

// ── Invariant checks ─────────────────────────────────────────────────────────

describe("checkAccuracyInvariants", () => {
  it("passes for correctly ordered values", () => {
    expect(checkAccuracyInvariants(100, 110, 125)).toEqual([]);
  });

  it("warns when realistic < basic", () => {
    const warnings = checkAccuracyInvariants(100, 90, 125);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Реальный");
  });

  it("warns when professional < realistic", () => {
    const warnings = checkAccuracyInvariants(100, 110, 100);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Профессиональный");
  });

  it("warns on negative values", () => {
    const warnings = checkAccuracyInvariants(-5, 10, 20);
    expect(warnings.some((w) => w.includes("Отрицательное"))).toBe(true);
  });
});

// ── Labels ───────────────────────────────────────────────────────────────────

describe("Accuracy mode labels", () => {
  it("all modes have labels and descriptions", () => {
    for (const mode of ACCURACY_MODES) {
      expect(ACCURACY_MODE_LABELS[mode]).toBeTruthy();
      expect(ACCURACY_MODE_DESCRIPTIONS[mode]).toBeTruthy();
    }
  });
});
