import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  WallpaperCanonicalSpec,
  WallpaperTypeSpec,
} from "./canonical";
import { roundDisplay } from "./units";

interface WallpaperInputs {
  inputMode?: number;
  perimeter?: number;
  area?: number;
  roomWidth?: number;
  roomLength?: number;
  roomHeight?: number;
  length?: number;
  width?: number;
  height?: number;
  wallHeight?: number;
  openingsArea?: number;
  doorsCount?: number;
  windowsCount?: number;
  doors?: number;
  windows?: number;
  rollLength?: number;
  rollWidth?: number;
  rapport?: number;
  wallpaperType?: number;
  reservePercent?: number;
  reserveRolls?: number;
}

interface WallpaperGeometry {
  inputMode: number;
  perimeter: number;
  wallHeight: number;
  wallArea: number;
  openingsArea: number;
  netArea: number;
}

function getInputDefault(spec: WallpaperCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveWallHeight(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): number {
  return Math.max(2, inputs.wallHeight ?? inputs.height ?? inputs.roomHeight ?? getInputDefault(spec, "wallHeight", 2.7));
}

function resolveGeometry(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): WallpaperGeometry {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  const wallHeight = resolveWallHeight(spec, inputs);
  const exactOpeningsArea = Math.max(0, inputs.openingsArea ?? 0);
  const doorsCount = Math.max(0, Math.round(inputs.doorsCount ?? inputs.doors ?? 0));
  const windowsCount = Math.max(0, Math.round(inputs.windowsCount ?? inputs.windows ?? 0));
  const defaultOpeningsArea =
    doorsCount * spec.normative_formula.opening_defaults.door_area_m2 +
    windowsCount * spec.normative_formula.opening_defaults.window_area_m2;
  const openingsArea = exactOpeningsArea > 0 ? exactOpeningsArea : defaultOpeningsArea;

  if ((inputMode === 0 || (inputs.inputMode === undefined && inputs.perimeter !== undefined)) && inputs.perimeter !== undefined) {
    const perimeter = Math.max(1, inputs.perimeter);
    const wallArea = perimeter * wallHeight;
    return {
      inputMode: 0,
      perimeter: roundDisplay(perimeter, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
    };
  }

  if ((inputMode === 0 || (inputs.inputMode === undefined && inputs.roomWidth !== undefined && inputs.roomLength !== undefined)) && inputs.roomWidth !== undefined && inputs.roomLength !== undefined) {
    const roomWidth = Math.max(1, inputs.roomWidth);
    const roomLength = Math.max(1, inputs.roomLength);
    const perimeter = 2 * (roomWidth + roomLength);
    const wallArea = perimeter * wallHeight;
    return {
      inputMode: 0,
      perimeter: roundDisplay(perimeter, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
    };
  }

  if (inputs.length !== undefined && inputs.width !== undefined) {
    const length = Math.max(1, inputs.length);
    const width = Math.max(1, inputs.width);
    const perimeter = 2 * (length + width);
    const wallArea = perimeter * wallHeight;
    return {
      inputMode: 0,
      perimeter: roundDisplay(perimeter, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
    };
  }

  const wallArea = Math.max(0, inputs.area ?? getInputDefault(spec, "area", 40));
  const perimeter = wallHeight > 0 ? wallArea / wallHeight : 0;

  return {
    inputMode: 1,
    perimeter: roundDisplay(perimeter, 3),
    wallHeight: roundDisplay(wallHeight, 3),
    wallArea: roundDisplay(wallArea, 3),
    openingsArea: roundDisplay(openingsArea, 3),
    netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
  };
}

function resolveWallpaperType(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): WallpaperTypeSpec {
  const wallpaperType = Math.max(1, Math.min(3, Math.round(inputs.wallpaperType ?? getInputDefault(spec, "wallpaperType", 1))));
  return spec.normative_formula.wallpaper_types.find((type) => type.id === wallpaperType) ?? spec.normative_formula.wallpaper_types[0];
}

function resolveRollWidth(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): number {
  return Math.max(0.5, Math.min(1.2, inputs.rollWidth ?? getInputDefault(spec, "rollWidth", 0.53)));
}

function resolveRollLength(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): number {
  return Math.max(5, Math.min(50, inputs.rollLength ?? getInputDefault(spec, "rollLength", 10.05)));
}

function resolveRapportMeters(spec: WallpaperCanonicalSpec, inputs: WallpaperInputs): number {
  return Math.max(0, inputs.rapport ?? getInputDefault(spec, "rapport", 0)) / 100;
}

function buildMaterials(
  spec: WallpaperCanonicalSpec,
  wallpaperType: WallpaperTypeSpec,
  netArea: number,
  recExactNeed: number,
  recPurchaseQuantity: number,
  recPackageCount: number,
  pasteNeeded: number,
  pastePacks: number,
  primerNeeded: number,
  primerCans: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Обои",
      quantity: roundDisplay(recExactNeed, 6),
      unit: spec.packaging_rules.roll_unit,
      withReserve: roundDisplay(recPurchaseQuantity, 6),
      purchaseQty: recPackageCount,
      category: "Основное",
    },
    {
      name: `Клей обойный (${wallpaperType.label.toLowerCase()}, ${spec.packaging_rules.paste_pack_kg} кг)`,
      quantity: roundDisplay(pasteNeeded, 6),
      unit: "кг",
      withReserve: roundDisplay(pastePacks * spec.packaging_rules.paste_pack_kg, 6),
      purchaseQty: roundDisplay(pastePacks * spec.packaging_rules.paste_pack_kg, 6),
      packageInfo: { count: pastePacks, size: spec.packaging_rules.paste_pack_kg, packageUnit: "уп" },
      category: "Клей",
    },
    {
      name: `Грунтовка глубокого проникновения (${spec.packaging_rules.primer_can_l} л)`,
      quantity: roundDisplay(primerNeeded, 6),
      unit: "л",
      withReserve: roundDisplay(primerCans * spec.packaging_rules.primer_can_l, 6),
      purchaseQty: roundDisplay(primerCans * spec.packaging_rules.primer_can_l, 6),
      packageInfo: { count: primerCans, size: spec.packaging_rules.primer_can_l, packageUnit: "канистр" },
      category: "Грунтовка",
    },
    {
      name: "Валик для клея",
      quantity: spec.material_rules.glue_roller_count,
      unit: "шт",
      withReserve: spec.material_rules.glue_roller_count,
      purchaseQty: spec.material_rules.glue_roller_count,
      category: "Инструмент",
    },
    {
      name: "Пластиковый шпатель для обоев",
      quantity: spec.material_rules.wallpaper_spatula_count,
      unit: "шт",
      withReserve: spec.material_rules.wallpaper_spatula_count,
      purchaseQty: spec.material_rules.wallpaper_spatula_count,
      category: "Инструмент",
    },
    {
      name: "Нож малярный",
      quantity: spec.material_rules.knife_count,
      unit: "шт",
      withReserve: spec.material_rules.knife_count,
      purchaseQty: spec.material_rules.knife_count,
      category: "Инструмент",
    },
    {
      name: "Лезвия для ножа (упаковка)",
      quantity: spec.material_rules.blades_pack_count,
      unit: "уп",
      withReserve: spec.material_rules.blades_pack_count,
      purchaseQty: spec.material_rules.blades_pack_count,
      category: "Расходники",
    },
    {
      name: "Ведро для клея",
      quantity: spec.material_rules.bucket_count,
      unit: "шт",
      withReserve: spec.material_rules.bucket_count,
      purchaseQty: spec.material_rules.bucket_count,
      category: "Инструмент",
    },
    {
      name: "Губка для удаления клея",
      quantity: spec.material_rules.sponge_count,
      unit: "шт",
      withReserve: spec.material_rules.sponge_count,
      purchaseQty: spec.material_rules.sponge_count,
      category: "Расходники",
    },
  ];
}

export function computeCanonicalWallpaper(
  spec: WallpaperCanonicalSpec,
  inputs: WallpaperInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const geometry = resolveGeometry(spec, inputs);
  const wallpaperType = resolveWallpaperType(spec, inputs);
  const rollWidth = resolveRollWidth(spec, inputs);
  const rollLength = resolveRollLength(spec, inputs);
  const rapport = resolveRapportMeters(spec, inputs);
  const reservePercent = Math.max(0, inputs.reservePercent ?? getInputDefault(spec, "reservePercent", 0));
  const reserveRolls = Math.max(0, Math.round(inputs.reserveRolls ?? getInputDefault(spec, "reserveRolls", 0)));
  const stripLength = rapport > 0
    ? Math.ceil(geometry.wallHeight / rapport) * rapport + spec.material_rules.trim_allowance_m
    : geometry.wallHeight;
  const stripsPerRoll = stripLength > 0 ? Math.max(0, Math.floor(rollLength / stripLength)) : 0;
  const stripsNeeded = geometry.wallHeight > 0 && rollWidth > 0
    ? Math.ceil(geometry.netArea / (rollWidth * geometry.wallHeight))
    : 0;
  const baseExactRolls = stripsPerRoll > 0 ? stripsNeeded / stripsPerRoll : 0;
  const reserveMultiplier = 1 + reservePercent / 100;
  const packageOptions = [{
    size: spec.packaging_rules.roll_package_size,
    label: `wallpaper-roll-${spec.packaging_rules.roll_package_size}`,
    unit: spec.packaging_rules.roll_unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseExactRolls * multiplier * reserveMultiplier + reserveRolls, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `wallpaper:${wallpaperType.key}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
        reserve_percent: roundDisplay(reservePercent, 3),
        reserve_rolls: reserveRolls,
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
  const pasteNeeded = geometry.netArea * wallpaperType.paste_kg_per_m2 * spec.material_rules.paste_reserve_factor;
  const pastePacks = pasteNeeded > 0 ? Math.max(1, Math.ceil(pasteNeeded / spec.packaging_rules.paste_pack_kg)) : 0;
  const primerNeeded = geometry.netArea * spec.material_rules.primer_l_per_m2 * spec.material_rules.primer_reserve_factor;
  const primerCans = primerNeeded > 0 ? Math.max(1, Math.ceil(primerNeeded / spec.packaging_rules.primer_can_l)) : 0;

  const warnings: string[] = [];
  if (geometry.netArea <= 0) {
    warnings.push("Полезная площадь оклейки должна быть больше нуля");
  }
  if (rapport > spec.warnings_rules.large_rapport_threshold_m) {
    warnings.push("Большой раппорт узора увеличивает отходы. Проверьте запас по рулонам перед покупкой");
  }
  if (rollWidth > spec.warnings_rules.wide_roll_threshold_m) {
    warnings.push("Широкие обои сложнее клеить одному. Для метровых рулонов лучше работать вдвоём");
  }
  if (stripsPerRoll <= spec.warnings_rules.low_strips_per_roll_threshold && geometry.netArea > 0) {
    warnings.push("Из одного рулона получается мало полос. Проверьте высоту стены, длину рулона и раппорт");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Начинайте от окна и идите в глубину комнаты — стыки будут менее заметны при боковом свете");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      spec,
      wallpaperType,
      geometry.netArea,
      recScenario.exact_need,
      recScenario.purchase_quantity,
      recScenario.buy_plan.packages_count,
      pasteNeeded,
      pastePacks,
      primerNeeded,
      primerCans,
    ),
    totals: {
      wallArea: roundDisplay(geometry.wallArea, 3),
      netArea: roundDisplay(geometry.netArea, 3),
      openingsArea: roundDisplay(geometry.openingsArea, 3),
      perimeter: roundDisplay(geometry.perimeter, 3),
      wallHeight: roundDisplay(geometry.wallHeight, 3),
      inputMode: geometry.inputMode,
      rollWidth: roundDisplay(rollWidth, 3),
      rollLength: roundDisplay(rollLength, 3),
      rapport: roundDisplay(rapport * 100, 3),
      wallpaperType: wallpaperType.id,
      reservePercent: roundDisplay(reservePercent, 3),
      reserveRolls,
      stripLength: roundDisplay(stripLength, 3),
      stripsPerRoll,
      stripsNeeded,
      baseExactRolls: roundDisplay(baseExactRolls, 6),
      rollsNeeded: recScenario.purchase_quantity,
      pasteNeededKg: roundDisplay(pasteNeeded, 6),
      pastePacks,
      primerNeededL: roundDisplay(primerNeeded, 6),
      primerCans,
      minExactNeedRolls: scenarios.MIN.exact_need,
      recExactNeedRolls: recScenario.exact_need,
      maxExactNeedRolls: scenarios.MAX.exact_need,
      minPurchaseRolls: scenarios.MIN.purchase_quantity,
      recPurchaseRolls: recScenario.purchase_quantity,
      maxPurchaseRolls: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
  };
}
