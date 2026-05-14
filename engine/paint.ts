import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  PaintCanonicalSpec,
  PaintColorSpec,
  PaintPreparationSpec,
  PaintScopeSpec,
  PaintSurfaceSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { evaluateCompanionMaterials } from "./companion-materials";

interface PaintInputs {
  inputMode?: number;
  area?: number;
  wallArea?: number;
  ceilingArea?: number;
  roomWidth?: number;
  roomLength?: number;
  roomHeight?: number;
  length?: number;
  width?: number;
  height?: number;
  openingsArea?: number;
  doorsWindows?: number;
  paintType?: number;
  surfaceType?: number;
  surfacePrep?: number;
  colorIntensity?: number;
  coats?: number;
  coverage?: number;
  canSize?: number;
  accuracyMode?: AccuracyMode;
}

interface WorkAreaResolution {
  area: number;
  wallArea: number;
  ceilingArea: number;
  openingsArea: number;
  openingsPerimeter: number;
  inputMode: number;
  estimatedPerimeter: number;
}

function estimatePerimeter(area: number): number {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveWorkArea(spec: PaintCanonicalSpec, rawInputs: PaintInputs): WorkAreaResolution {
  const inputMode = Math.round(rawInputs.inputMode ?? getInputDefault(spec, "inputMode", 1));
  const openingsArea = Math.max(0, rawInputs.openingsArea ?? rawInputs.doorsWindows ?? getInputDefault(spec, "openingsArea", 0));
  // Источник истины для типовых размеров проёма: spec.material_rules.
  // Дверь 0.8×2=1.6 м², окно 1.2×1.5=1.8 м² → среднее ~2 м², периметр ~6 м.
  // Лента клеится с двух сторон проёма (внутри и снаружи) → tape_sides_per_opening=2.
  const avgOpeningArea = spec.material_rules.avg_opening_area_m2;
  const estimatedOpeningsCount = openingsArea > 0 ? Math.max(1, Math.round(openingsArea / avgOpeningArea)) : 0;
  const openingsPerimeter = estimatedOpeningsCount * spec.material_rules.avg_opening_perimeter_m * spec.material_rules.tape_sides_per_opening;
  const hasSplitAreas = rawInputs.wallArea !== undefined || rawInputs.ceilingArea !== undefined;
  const hasCanonicalRoomDimensions = rawInputs.roomWidth !== undefined && rawInputs.roomLength !== undefined && rawInputs.roomHeight !== undefined;
  const hasLegacyRoomDimensions = rawInputs.length !== undefined && rawInputs.width !== undefined && rawInputs.height !== undefined;

  if (hasSplitAreas) {
    const grossWallArea = Math.max(0, rawInputs.wallArea ?? 0);
    const ceilingArea = Math.max(0, rawInputs.ceilingArea ?? 0);
    const wallArea = Math.max(0, grossWallArea - openingsArea);
    const defaultRoomHeight = Math.max(2, getInputDefault(spec, "roomHeight", 2.7));
    const estimatedPerimeter = ceilingArea > 0 ? estimatePerimeter(ceilingArea) : wallArea > 0 ? wallArea / defaultRoomHeight : 0;

    return {
      area: roundDisplay(wallArea + ceilingArea, 3),
      wallArea: roundDisplay(wallArea, 3),
      ceilingArea: roundDisplay(ceilingArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      openingsPerimeter: roundDisplay(openingsPerimeter, 3),
      inputMode: 1,
      estimatedPerimeter: roundDisplay(estimatedPerimeter, 3),
    };
  }

  if ((inputMode === 0 || (rawInputs.inputMode === undefined && hasCanonicalRoomDimensions)) && hasCanonicalRoomDimensions) {
    const roomWidth = Math.max(0.5, rawInputs.roomWidth ?? getInputDefault(spec, "roomWidth", 4));
    const roomLength = Math.max(0.5, rawInputs.roomLength ?? getInputDefault(spec, "roomLength", 5));
    const roomHeight = Math.max(2, rawInputs.roomHeight ?? getInputDefault(spec, "roomHeight", 2.7));
    const perimeter = 2 * (roomWidth + roomLength);
    const wallArea = Math.max(0, perimeter * roomHeight - openingsArea);
    const ceilingArea = Math.max(0, roomWidth * roomLength);

    return {
      area: roundDisplay(wallArea + ceilingArea, 3),
      wallArea: roundDisplay(wallArea, 3),
      ceilingArea: roundDisplay(ceilingArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      openingsPerimeter: roundDisplay(openingsPerimeter, 3),
      inputMode: 0,
      estimatedPerimeter: roundDisplay(perimeter, 3),
    };
  }

  if (hasLegacyRoomDimensions) {
    const length = Math.max(1, rawInputs.length ?? getInputDefault(spec, "length", 5));
    const width = Math.max(1, rawInputs.width ?? getInputDefault(spec, "width", 4));
    const height = Math.max(2, rawInputs.height ?? getInputDefault(spec, "height", 2.7));
    const perimeter = 2 * (length + width);
    const wallArea = Math.max(0, perimeter * height - openingsArea);
    const ceilingArea = Math.max(0, length * width);

    return {
      area: roundDisplay(wallArea + ceilingArea, 3),
      wallArea: roundDisplay(wallArea, 3),
      ceilingArea: roundDisplay(ceilingArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      openingsPerimeter: roundDisplay(openingsPerimeter, 3),
      inputMode: 0,
      estimatedPerimeter: roundDisplay(perimeter, 3),
    };
  }

  const area = Math.max(0, rawInputs.area ?? getInputDefault(spec, "area", 40));
  const estimatedPerimeter = area > 0 ? estimatePerimeter(area) : 0;

  return {
    area: roundDisplay(area, 3),
    wallArea: roundDisplay(area, 3),
    ceilingArea: 0,
    openingsArea: roundDisplay(openingsArea, 3),
    openingsPerimeter: roundDisplay(openingsPerimeter, 3),
    inputMode: 1,
    estimatedPerimeter: roundDisplay(estimatedPerimeter, 3),
  };
}

function resolvePaintType(spec: PaintCanonicalSpec, rawPaintType: number | undefined): PaintScopeSpec {
  const paintType = Math.max(0, Math.min(1, Math.round(rawPaintType ?? getInputDefault(spec, "paintType", 0))));
  return spec.normative_formula.paint_types.find((type) => type.id === paintType) ?? spec.normative_formula.paint_types[0];
}

function resolveSurface(spec: PaintCanonicalSpec, rawSurfaceType: number | undefined, paintType: PaintScopeSpec): PaintSurfaceSpec {
  const requestedSurfaceType = Math.max(0, Math.min(8, Math.round(rawSurfaceType ?? getInputDefault(spec, "surfaceType", 0))));
  const requestedSurface = spec.normative_formula.surface_types.find((surface) => surface.id === requestedSurfaceType);
  if (requestedSurface && requestedSurface.scope_ids.includes(paintType.id)) {
    return requestedSurface;
  }
  return spec.normative_formula.surface_types.find((surface) => surface.scope_ids.includes(paintType.id)) ?? spec.normative_formula.surface_types[0];
}

function resolvePreparation(spec: PaintCanonicalSpec, rawSurfacePrep: number | undefined): PaintPreparationSpec {
  const prepId = Math.max(0, Math.min(2, Math.round(rawSurfacePrep ?? getInputDefault(spec, "surfacePrep", 0))));
  return spec.normative_formula.surface_preparations.find((prep) => prep.id === prepId) ?? spec.normative_formula.surface_preparations[0];
}

function resolveColorIntensity(spec: PaintCanonicalSpec, rawColorIntensity: number | undefined): PaintColorSpec {
  const colorId = Math.max(0, Math.min(2, Math.round(rawColorIntensity ?? getInputDefault(spec, "colorIntensity", 0))));
  return spec.normative_formula.color_intensities.find((color) => color.id === colorId) ?? spec.normative_formula.color_intensities[0];
}

function resolveCoverage(spec: PaintCanonicalSpec, rawCoverage: number | undefined, paintType: PaintScopeSpec): number {
  const fallback = paintType.id === 1 ? 7 : 10;
  return Math.max(4, Math.min(15, rawCoverage ?? getInputDefault(spec, "coverage", fallback)));
}

function resolveCoats(spec: PaintCanonicalSpec, rawCoats: number | undefined): number {
  return Math.max(1, Math.min(5, Math.round(rawCoats ?? getInputDefault(spec, "coats", 2))));
}

function resolvePackagingOptions(spec: PaintCanonicalSpec, rawCanSize: number | undefined) {
  const requested = Math.max(0, rawCanSize ?? getInputDefault(spec, "canSize", 0));
  const packageSizes = requested > 0 && spec.packaging_rules.allowed_package_sizes.includes(requested)
    ? [requested]
    : spec.packaging_rules.optimal_package_sizes;

  return packageSizes.map((size) => ({
    size,
    label: `paint-can-${size}${spec.packaging_rules.unit}`,
  }));
}

/**
 * Базовый материал: только краска. Грунтовка, инструмент, лента, плёнка,
 * перчатки, шкурка — все через spec.companion_materials в конфиге.
 */
function buildMaterials(
  paintType: PaintScopeSpec,
  recExactNeed: number,
  recPurchaseQuantity: number,
  recPackageSize: number,
  recPackageCount: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: `${paintType.label} (${recPackageSize} л)`,
      quantity: roundDisplay(recExactNeed, 3),
      unit: "л",
      withReserve: roundDisplay(recPurchaseQuantity, 3),
      purchaseQty: roundDisplay(recPurchaseQuantity, 3),
      packageInfo: { count: recPackageCount, size: recPackageSize, packageUnit: "банок" },
      category: "Основное",
    },
  ];
}

export function computeCanonicalPaint(
  spec: PaintCanonicalSpec,
  inputs: PaintInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const work = resolveWorkArea(spec, inputs);
  const paintType = resolvePaintType(spec, inputs.paintType);
  const effectiveWallArea = work.wallArea;
  const effectiveCeilingArea = paintType.id === 1 ? 0 : work.ceilingArea;
  const effectiveArea = effectiveWallArea + effectiveCeilingArea;
  const surface = resolveSurface(spec, inputs.surfaceType, paintType);
  const preparation = resolvePreparation(spec, inputs.surfacePrep);
  const color = resolveColorIntensity(spec, inputs.colorIntensity);
  const coverage = resolveCoverage(spec, inputs.coverage, paintType);
  const coats = resolveCoats(spec, inputs.coats);
  const lPerSqm = (coats * surface.multiplier * preparation.multiplier * color.multiplier) / coverage;
  const wallBaseExactNeed = effectiveWallArea * lPerSqm;
  const ceilingBaseExactNeed = effectiveCeilingArea * lPerSqm * spec.material_rules.ceiling_premium_factor;
  const baseExactNeedRaw = wallBaseExactNeed + ceilingBaseExactNeed;
  const accuracyMult = getPrimaryMultiplier("paint", accuracyMode);
  const baseExactNeed = baseExactNeedRaw * accuracyMult;
  const packageOptions = resolvePackagingOptions(spec, inputs.canSize).map((option) => ({
    size: option.size,
    label: option.label,
    unit: spec.packaging_rules.unit,
  }));

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseExactNeed * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `paint:${paintType.key}`,
        `surface:${surface.key}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const warnings: string[] = [];
  if (effectiveArea <= 0) {
    warnings.push("Площадь окраски должна быть больше нуля");
  }
  if (spec.warnings_rules.primer_required_surface_ids.includes(surface.id)) {
    warnings.push("Для выбранной поверхности рекомендуется предварительное грунтование");
  }
  if (coats <= spec.warnings_rules.one_coat_warning_threshold) {
    warnings.push("Один слой редко даёт равномерное укрытие. Обычно рекомендуют 2 слоя");
  }
  if (spec.warnings_rules.rough_surface_warning_ids.includes(surface.id)) {
    warnings.push("Для рельефных поверхностей и фасадной фактуры расход краски может быть заметно выше среднего");
  }

  const recScenario = scenarios.REC;
  const paintPackageSize = recScenario.buy_plan.package_size;
  const paintPackageCount = recScenario.buy_plan.packages_count;
  const primerLiters = roundDisplay(effectiveArea * spec.material_rules.primer_l_per_m2, 3);
  const tapeMeters = roundDisplay(work.estimatedPerimeter * spec.material_rules.tape_runs_per_room * spec.material_rules.tape_reserve_factor, 3);
  const tapeRolls = tapeMeters > 0 ? Math.max(1, Math.ceil(tapeMeters / spec.material_rules.tape_roll_length_m)) : 0;


  const practicalNotes: string[] = [];
  if (coats === 1) {
    practicalNotes.push("Один слой — только если предыдущий цвет совпадает. Для перекраски — минимум 2 слоя");
  }
  practicalNotes.push("Красьте стену целиком за один приём — стыки подсохшей и свежей краски будут видны");

  const baseMaterials = buildMaterials(
    paintType,
    recScenario.exact_need,
    recScenario.purchase_quantity,
    paintPackageSize,
    paintPackageCount,
  );

  const companionTotals = {
    area: effectiveArea,
    wallArea: effectiveWallArea,
    ceilingArea: effectiveCeilingArea,
    estimatedPerimeter: work.estimatedPerimeter,
  };
  const companionInputs = {
    paintType: paintType.id,
    surfaceType: surface.id,
    surfacePrep: preparation.id,
    coats,
  };
  const companions = spec.companion_materials
    ? evaluateCompanionMaterials(spec.companion_materials, {
        inputs: companionInputs,
        totals: companionTotals,
      })
    : [];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: [...baseMaterials, ...companions],
    totals: {
      area: roundDisplay(effectiveArea, 3),
      wallArea: roundDisplay(effectiveWallArea, 3),
      ceilingArea: roundDisplay(effectiveCeilingArea, 3),
      openingsArea: roundDisplay(work.openingsArea, 3),
      openingsPerimeter: roundDisplay(work.openingsPerimeter, 3),
      inputMode: work.inputMode,
      paintType: paintType.id,
      surfaceType: surface.id,
      surfacePrep: preparation.id,
      colorIntensity: color.id,
      coats,
      coverage: roundDisplay(coverage, 3),
      canSize: paintPackageSize,
      lPerSqm: roundDisplay(lPerSqm, 6),
      estimatedPerimeter: roundDisplay(work.estimatedPerimeter, 3),
      wallBaseExactNeedL: roundDisplay(wallBaseExactNeed, 6),
      ceilingBaseExactNeedL: roundDisplay(ceilingBaseExactNeed, 6),
      baseExactNeedL: roundDisplay(baseExactNeed, 6),
      ceilingPremiumFactor: roundDisplay(spec.material_rules.ceiling_premium_factor, 3),
      primerLiters,
      tapeMeters,
      tapeRolls,
      minExactNeedL: scenarios.MIN.exact_need,
      recExactNeedL: recScenario.exact_need,
      maxExactNeedL: scenarios.MAX.exact_need,
      minPurchaseL: scenarios.MIN.purchase_quantity,
      recPurchaseL: recScenario.purchase_quantity,
      maxPurchaseL: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseExactNeedRaw, "paint", accuracyMode).explanation,
  };
}
