import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  TileCanonicalSpec,
  TileLayoutSpec,
  TileRoomComplexitySpec,
} from "./canonical";
import { roundDisplay } from "./units";

interface TileInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  tileWidthCm?: number;
  tileHeightCm?: number;
  jointWidth?: number;
  groutDepth?: number;
  layoutPattern?: number;
  roomComplexity?: number;
}

function getInputDefault(spec: TileCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(spec: TileCanonicalSpec, inputs: TileInputs): { inputMode: number; area: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 1));
  if (inputMode === 0) {
    const length = Math.max(0.5, inputs.length ?? getInputDefault(spec, "length", 4));
    const width = Math.max(0.5, inputs.width ?? getInputDefault(spec, "width", 3));
    return { inputMode: 0, area: roundDisplay(length * width, 3) };
  }
  return { inputMode: 1, area: roundDisplay(Math.max(1, inputs.area ?? getInputDefault(spec, "area", 12)), 3) };
}

function resolveLayout(spec: TileCanonicalSpec, inputs: TileInputs): TileLayoutSpec {
  const layoutId = Math.max(1, Math.min(4, Math.round(inputs.layoutPattern ?? getInputDefault(spec, "layoutPattern", 1))));
  return spec.normative_formula.layouts.find((layout) => layout.id === layoutId) ?? spec.normative_formula.layouts[0];
}

function resolveRoomComplexity(spec: TileCanonicalSpec, inputs: TileInputs): TileRoomComplexitySpec {
  const complexityId = Math.max(1, Math.min(3, Math.round(inputs.roomComplexity ?? getInputDefault(spec, "roomComplexity", 1))));
  return spec.normative_formula.room_complexities.find((item) => item.id === complexityId) ?? spec.normative_formula.room_complexities[0];
}

function resolveTileSizeAdjustment(spec: TileCanonicalSpec, averageTileSizeCm: number): number {
  if (averageTileSizeCm > spec.warnings_rules.large_tile_warning_threshold_cm) {
    return spec.material_rules.large_tile_extra_waste_percent;
  }
  if (averageTileSizeCm < 10) {
    return spec.material_rules.mosaic_waste_discount_percent;
  }
  return 0;
}

function resolveGlueRate(spec: TileCanonicalSpec, averageTileSizeCm: number): number {
  if (averageTileSizeCm < 20) return spec.material_rules.glue_kg_per_m2_small;
  if (averageTileSizeCm < 40) return spec.material_rules.glue_kg_per_m2_medium;
  if (averageTileSizeCm <= 60) return spec.material_rules.glue_kg_per_m2_large;
  return spec.material_rules.glue_kg_per_m2_xl;
}

function resolveGroutDepth(autoAverageTileSizeCm: number, requestedGroutDepth: number | undefined): number {
  const explicitDepth = Math.max(0, requestedGroutDepth ?? 0);
  if (explicitDepth > 0) return explicitDepth;
  if (autoAverageTileSizeCm < 15) return 4;
  if (autoAverageTileSizeCm < 40) return 6;
  if (autoAverageTileSizeCm <= 60) return 8;
  return 10;
}

function buildMaterials(
  spec: TileCanonicalSpec,
  tileWidthCm: number,
  tileHeightCm: number,
  recExactNeed: number,
  recPurchaseQuantity: number,
  glueKg: number,
  glueBags: number,
  groutKg: number,
  groutBags: number,
  primerLiters: number,
  primerCans: number,
  averageTileSizeCm: number,
  crossesNeeded: number,
  svpPackages: number,
  siliconeTubes: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Плитка ${Math.round(tileWidthCm * 10)}×${Math.round(tileHeightCm * 10)} мм`,
      quantity: roundDisplay(recExactNeed, 6),
      unit: spec.packaging_rules.tile_unit,
      withReserve: roundDisplay(recPurchaseQuantity, 6),
      purchaseQty: Math.ceil(recPurchaseQuantity),
      category: "Основное",
    },
    {
      name: `Плиточный клей (${spec.packaging_rules.glue_bag_kg} кг)`,
      quantity: roundDisplay(glueKg, 6),
      unit: "кг",
      withReserve: glueBags * spec.packaging_rules.glue_bag_kg,
      purchaseQty: glueBags,
      category: "Клей",
    },
    {
      name: `Затирка цементная (${spec.packaging_rules.grout_bag_kg} кг)`,
      quantity: roundDisplay(groutKg, 6),
      unit: "кг",
      withReserve: groutBags * spec.packaging_rules.grout_bag_kg,
      purchaseQty: groutBags,
      category: "Затирка",
    },
    {
      name: `Грунтовка глубокого проникновения (${spec.packaging_rules.primer_can_l} л)`,
      quantity: roundDisplay(primerLiters, 6),
      unit: "л",
      withReserve: primerCans * spec.packaging_rules.primer_can_l,
      purchaseQty: primerCans,
      category: "Подготовка",
    },
  ];

  if (averageTileSizeCm >= spec.material_rules.svp_threshold_cm) {
    materials.push({
      name: `СВП (${spec.packaging_rules.svp_pack_size} шт)`,
      quantity: roundDisplay(crossesNeeded / spec.packaging_rules.svp_pack_size, 6),
      unit: "уп",
      withReserve: svpPackages,
      purchaseQty: svpPackages,
      category: "Крепёж",
    });
  } else {
    materials.push({
      name: "Крестики для плитки",
      quantity: crossesNeeded,
      unit: "шт",
      withReserve: crossesNeeded,
      purchaseQty: crossesNeeded,
      category: "Крепёж",
    });
  }

  materials.push({
    name: "Герметик силиконовый",
    quantity: siliconeTubes,
    unit: "шт",
    withReserve: siliconeTubes,
    purchaseQty: siliconeTubes,
    category: "Затирка",
  });

  return materials;
}

export function computeCanonicalTile(
  spec: TileCanonicalSpec,
  inputs: TileInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = resolveArea(spec, inputs);
  const tileWidthCm = Math.max(5, Math.min(200, inputs.tileWidthCm ?? getInputDefault(spec, "tileWidthCm", 30)));
  const tileHeightCm = Math.max(5, Math.min(200, inputs.tileHeightCm ?? getInputDefault(spec, "tileHeightCm", 30)));
  const layout = resolveLayout(spec, inputs);
  const roomComplexity = resolveRoomComplexity(spec, inputs);
  const jointWidthMm = Math.max(1, Math.min(10, inputs.jointWidth ?? getInputDefault(spec, "jointWidth", 3)));
  const averageTileSizeCm = roundDisplay((tileWidthCm + tileHeightCm) / 2, 3);
  const sizeAdjustment = resolveTileSizeAdjustment(spec, averageTileSizeCm);
  const wastePercent = roundDisplay(layout.waste_percent + roomComplexity.waste_bonus_percent + sizeAdjustment, 3);
  const tileAreaM2 = roundDisplay((tileWidthCm / 100) * (tileHeightCm / 100), 6);
  const baseExactNeed = tileAreaM2 > 0 ? roundDisplay((area.area / tileAreaM2) * (1 + wastePercent / 100), 6) : 0;
  const groutDepthMm = resolveGroutDepth(averageTileSizeCm, inputs.groutDepth);
  const tileWidthM = tileWidthCm / 100;
  const tileHeightM = tileHeightCm / 100;
  const jointsLength = (1 / tileWidthM) + (1 / tileHeightM);
  const groutKg = roundDisplay(area.area * jointsLength * (jointWidthMm / 1000) * (groutDepthMm / 1000) * spec.material_rules.grout_density_kg_per_m3 * spec.material_rules.grout_loss_factor, 6);
  const glueRate = resolveGlueRate(spec, averageTileSizeCm);
  const glueKg = roundDisplay(area.area * glueRate, 6);
  const primerLiters = roundDisplay(area.area * spec.material_rules.primer_l_per_m2, 6);
  const packageOptions = [{
    size: spec.packaging_rules.tile_package_size,
    label: `tile-piece-${spec.packaging_rules.tile_package_size}`,
    unit: spec.packaging_rules.tile_unit,
  }];

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
        `layout:${layout.key}`,
        `room:${roomComplexity.key}`,
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

  const recScenario = scenarios.REC;
  const glueBags = glueKg > 0 ? Math.max(1, Math.ceil(glueKg / spec.packaging_rules.glue_bag_kg)) : 0;
  const groutBags = groutKg > 0 ? Math.max(1, Math.ceil(groutKg / spec.packaging_rules.grout_bag_kg)) : 0;
  const primerCans = primerLiters > 0 ? Math.max(1, Math.ceil(primerLiters / spec.packaging_rules.primer_can_l)) : 0;
  const crossesNeeded = Math.ceil(recScenario.purchase_quantity * spec.material_rules.crosses_reserve_factor);
  const svpPackages = averageTileSizeCm >= spec.material_rules.svp_threshold_cm
    ? Math.max(1, Math.ceil(crossesNeeded / spec.packaging_rules.svp_pack_size))
    : 0;
  const siliconeTubes = Math.max(1, Math.ceil(area.area / spec.material_rules.silicone_tube_area_m2));

  const warnings: string[] = [];
  if (baseExactNeed < spec.warnings_rules.low_tile_count_threshold) {
    warnings.push("При укладке меньше 5 плиток процент отходов может быть выше расчётного");
  }
  if (layout.id === 2) {
    warnings.push("Диагональная укладка требует большего запаса и аккуратной подрезки");
  }
  if (averageTileSizeCm > spec.warnings_rules.large_tile_warning_threshold_cm) {
    warnings.push("Крупный формат требует двойного нанесения клея и более ровного основания");
  }
  if (layout.id === 4 && area.area > spec.warnings_rules.herringbone_large_area_m2) {
    warnings.push("Укладка ёлочкой на большой площади сильно увеличивает отходы и требования к раскладке");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      spec,
      tileWidthCm,
      tileHeightCm,
      recScenario.exact_need,
      recScenario.purchase_quantity,
      glueKg,
      glueBags,
      groutKg,
      groutBags,
      primerLiters,
      primerCans,
      averageTileSizeCm,
      crossesNeeded,
      svpPackages,
      siliconeTubes,
    ),
    totals: {
      area: area.area,
      inputMode: area.inputMode,
      tileWidthCm: roundDisplay(tileWidthCm, 3),
      tileHeightCm: roundDisplay(tileHeightCm, 3),
      averageTileSizeCm: averageTileSizeCm,
      jointWidth: roundDisplay(jointWidthMm, 3),
      groutDepth: roundDisplay(groutDepthMm, 3),
      layoutPattern: layout.id,
      roomComplexity: roomComplexity.id,
      tileArea: tileAreaM2,
      wastePercent: wastePercent,
      sizeAdjustment: roundDisplay(sizeAdjustment, 3),
      baseExactNeedTiles: baseExactNeed,
      tilesNeeded: recScenario.purchase_quantity,
      glueRateKgPerM2: roundDisplay(glueRate, 3),
      glueNeededKg: glueKg,
      groutNeededKg: groutKg,
      primerNeededL: primerLiters,
      crossesNeeded: crossesNeeded,
      svpPackages: svpPackages,
      siliconeTubes: siliconeTubes,
      minExactNeedTiles: scenarios.MIN.exact_need,
      recExactNeedTiles: recScenario.exact_need,
      maxExactNeedTiles: scenarios.MAX.exact_need,
      minPurchaseTiles: scenarios.MIN.purchase_quantity,
      recPurchaseTiles: recScenario.purchase_quantity,
      maxPurchaseTiles: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
