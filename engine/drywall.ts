import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  DrywallCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface DrywallInputs {
  workType?: number;
  inputMode?: number;
  wallScope?: number;
  length?: number;
  roomLength?: number;
  roomWidth?: number;
  height?: number;
  area?: number;
  openingsArea?: number;
  layers?: number;
  sheetSize?: number;
  profileStep?: number;
  accuracyMode?: AccuracyMode;
}

const SHEET_SIZES: Record<number, { w: number; h: number; area: number }> = {
  0: { w: 1.2, h: 2.5, area: 3.0 },
  1: { w: 1.2, h: 3.0, area: 3.6 },
  2: { w: 0.6, h: 2.5, area: 1.5 },
};

/* ─── defaults (fallback if spec.material_rules is missing a field) ─── */
const DW_DEFAULTS = {
  sheet_reserve: 1.10,
  profile_reserve: 1.05,
  screws_tf_per_m2: 30,
  screws_lb_per_profile: 4,
  dowels_step_m: 0.6,
  putty_start_kg_per_m2: 0.8,
  putty_finish_kg_per_m2: 1.0,
  putty_reserve: 1.15,
  putty_bag_kg: 25,
  serpyanka_m_per_sheet: 2.5,
  serpyanka_reserve: 1.1,
  serpyanka_roll_m: 90,
  primer_l_per_m2: 0.3,
  primer_reserve: 1.15,
  primer_can_l: 10,
  sandpaper_m2_per_sheet: 5,
  sandpaper_pack: 10,
  profile_length_m: 3,
  sealing_tape_roll_m: 30,
  screws_tf_package_pcs: 200,
  screws_lb_package_pcs: 100,
};

function dwMr<T>(spec: DrywallCanonicalSpec, key: string, fallback: T): T {
  const rules = spec.material_rules as unknown as Record<string, unknown> | undefined;
  return (rules?.[key] as T) ?? fallback;
}

function resolveWorkType(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.workType ?? getInputDefault(spec, "workType", 0))));
}

function resolveLength(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0.5, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 5)));
}

function resolveHeight(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(1.5, Math.min(5, inputs.height ?? getInputDefault(spec, "height", 2.7)));
}

function resolveLayers(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  const raw = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1));
  return raw === 2 ? 2 : 1;
}

function resolveSheetSize(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.sheetSize ?? getInputDefault(spec, "sheetSize", 0))));
}

function resolveProfileStep(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  const raw = inputs.profileStep ?? getInputDefault(spec, "profileStep", 0.6);
  return raw <= 0.4 ? 0.4 : 0.6;
}

interface DrywallGeometry {
  inputMode: number;
  wallScope: number;
  area: number;
  grossArea: number;
  openingsArea: number;
  length: number;
  roomLength: number;
  roomWidth: number;
  segments: number[];
}

/**
 * Геометрия хранится в движке, а не в форме. Четыре стены считаются
 * отдельными отрезками: у каждой есть крайние стойки, поэтому сводить весь
 * периметр в одну длинную стену нельзя.
 */
function resolveGeometry(
  spec: DrywallCanonicalSpec,
  inputs: DrywallInputs,
  workType: number,
  height: number,
): DrywallGeometry {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0)) === 1 ? 1 : 0;
  const wallScope = workType === 1
    && Math.round(inputs.wallScope ?? getInputDefault(spec, "wallScope", 0)) === 1
    ? 1
    : 0;
  const length = resolveLength(spec, inputs);
  const roomLength = Math.max(0.5, Math.min(30, inputs.roomLength ?? getInputDefault(spec, "roomLength", 5)));
  const roomWidth = Math.max(0.5, Math.min(30, inputs.roomWidth ?? getInputDefault(spec, "roomWidth", 4)));

  if (inputMode === 1) {
    const area = Math.max(0.1, Math.min(1000, inputs.area ?? getInputDefault(spec, "area", 20)));
    const estimatedRun = area / height;
    return {
      inputMode,
      wallScope: 0,
      area: roundDisplay(area, 3),
      grossArea: roundDisplay(area, 3),
      openingsArea: 0,
      length: roundDisplay(estimatedRun, 3),
      roomLength,
      roomWidth,
      segments: [estimatedRun],
    };
  }

  const segments = wallScope === 1
    ? [roomLength, roomWidth, roomLength, roomWidth]
    : [length];
  const grossArea = segments.reduce((sum, segment) => sum + segment * height, 0);
  const requestedOpenings = Math.max(0, inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 0));
  const openingsArea = Math.min(requestedOpenings, Math.max(0, grossArea - 0.1));

  return {
    inputMode,
    wallScope,
    area: roundDisplay(Math.max(0.1, grossArea - openingsArea), 3),
    grossArea: roundDisplay(grossArea, 3),
    openingsArea: roundDisplay(openingsArea, 3),
    length,
    roomLength,
    roomWidth,
    segments,
  };
}

function buildMaterials(
  workType: number,
  sheet: { w: number; h: number },
  sheetsNeeded: number,
  pnPieces: number,
  ppPieces: number,
  screws25Pcs: number,
  screws35Pcs: number,
  screwsLbPcs: number,
  screwsTfPackagePcs: number,
  screwsLbPackagePcs: number,
  dowels: number,
  sealingTapeRolls: number,
  puttyStartBags: number,
  puttyFinishBags: number,
  serpyankaRolls: number,
  primerMat: CanonicalMaterialResult,
  sandpaperPacks: number,
): CanonicalMaterialResult[] {
  const isPartition = workType === 0;
  const isCeiling = workType === 2;
  const mainProfileName = isPartition
    ? "Стоечный профиль ПС 50×50 мм, длина 3 м"
    : "Потолочный профиль ПП 60×27 мм, длина 3 м";
  const guideProfileName = isPartition
    ? "Направляющий профиль ПН 50×40 мм, длина 3 м"
    : "Направляющий профиль ПН 27×28 мм, длина 3 м";
  const sheetName = `Гипсокартонный лист (ГКЛ) 12,5×${Math.round(sheet.w * 1000)}×${Math.round(sheet.h * 1000)} мм`;
  const screwMaterial = (
    name: string,
    quantity: number,
    packageSize: number,
    subtitle: string,
  ): CanonicalMaterialResult => {
    const packages = Math.ceil(quantity / packageSize);
    return {
      name,
      subtitle,
      quantity,
      unit: "шт",
      withReserve: quantity,
      purchaseQty: packages * packageSize,
      packageInfo: { count: packages, size: packageSize, packageUnit: "упаковок" },
      category: "Крепёж",
    };
  };

  return [
    {
      name: sheetName,
      subtitle: isCeiling
        ? "Тип листа и допустимое число слоёв сверяйте с выбранной потолочной системой"
        : "Для влажных помещений выбирайте влагостойкое исполнение",
      quantity: sheetsNeeded,
      unit: "шт",
      withReserve: sheetsNeeded,
      purchaseQty: sheetsNeeded,
      category: "Основное",
    },
    {
      name: guideProfileName,
      subtitle: isPartition
        ? "Для перегородки шириной 50 мм; требуемую ширину каркаса проверяют по высоте и нагрузкам"
        : "Для каркаса облицовки стены или потолка",
      quantity: pnPieces,
      unit: "шт",
      withReserve: pnPieces,
      purchaseQty: pnPieces,
      category: "Каркас",
    },
    {
      name: mainProfileName,
      subtitle: isPartition
        ? "Стоечный профиль выбран в паре с направляющим ПН 50×40 мм"
        : "Для облицовки стены потребуются прямые подвесы; их число зависит от основания и схемы крепления",
      quantity: ppPieces,
      unit: "шт",
      withReserve: ppPieces,
      purchaseQty: ppPieces,
      category: "Каркас",
    },
    screwMaterial(
      "Саморезы по металлу для гипсокартона 3,5×25 мм",
      screws25Pcs,
      screwsTfPackagePcs,
      screws35Pcs > 0 ? "Для крепления первого слоя листов к металлическому каркасу" : "Для крепления листов к металлическому каркасу",
    ),
    ...(screws35Pcs > 0
      ? [screwMaterial(
          "Саморезы по металлу для гипсокартона 3,5×35 мм",
          screws35Pcs,
          screwsTfPackagePcs,
          "Для крепления второго слоя листов через первый слой",
        )]
      : []),
    screwMaterial(
      "Саморезы с прессшайбой 3,5×9,5 мм для сборки каркаса",
      screwsLbPcs,
      screwsLbPackagePcs,
      "Для соединения металлических профилей между собой",
    ),
    {
      name: "Дюбель-гвозди 6×40 мм",
      subtitle: "Для плотного бетонного или полнотелого основания; крепёж к пустотелым стенам подбирают отдельно",
      quantity: dowels,
      unit: "шт",
      withReserve: dowels,
      purchaseQty: dowels,
      category: "Крепёж",
    },
    {
      name: "Лента уплотнительная (рулон 30м)",
      quantity: sealingTapeRolls,
      unit: "рулон",
      withReserve: sealingTapeRolls,
      purchaseQty: sealingTapeRolls,
      category: "Изоляция",
    },
    {
      name: "Шпаклёвка стартовая 25кг",
      quantity: puttyStartBags,
      unit: "мешков",
      withReserve: puttyStartBags,
      purchaseQty: puttyStartBags,
      category: "Отделка",
    },
    {
      name: "Шпаклёвка финишная 25кг",
      quantity: puttyFinishBags,
      unit: "мешков",
      withReserve: puttyFinishBags,
      purchaseQty: puttyFinishBags,
      category: "Отделка",
    },
    {
      name: "Серпянка 90м",
      quantity: serpyankaRolls,
      unit: "рулонов",
      withReserve: serpyankaRolls,
      purchaseQty: serpyankaRolls,
      category: "Отделка",
    },
    { ...primerMat, category: "Отделка" },
    {
      name: "Наждачная бумага P180",
      quantity: sandpaperPacks,
      unit: "упаковок",
      withReserve: sandpaperPacks,
      purchaseQty: sandpaperPacks,
      category: "Отделка",
    },
  ];
}

export function computeCanonicalDrywall(
  spec: DrywallCanonicalSpec,
  inputs: DrywallInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  // Read constants from spec, fallback to defaults
  const SHEET_RESERVE = dwMr(spec, "sheet_reserve", DW_DEFAULTS.sheet_reserve);
  const PROFILE_RESERVE = dwMr(spec, "profile_reserve", DW_DEFAULTS.profile_reserve);
  const SCREWS_TF_PER_M2 = dwMr(spec, "screws_tf_per_m2", DW_DEFAULTS.screws_tf_per_m2);
  const SCREWS_LB_PER_PROFILE = dwMr(spec, "screws_lb_per_profile", DW_DEFAULTS.screws_lb_per_profile);
  const DOWELS_STEP_M = dwMr(spec, "dowels_step_m", DW_DEFAULTS.dowels_step_m);
  const PUTTY_START_KG_PER_M2 = dwMr(spec, "putty_start_kg_per_m2", DW_DEFAULTS.putty_start_kg_per_m2);
  const PUTTY_FINISH_KG_PER_M2 = dwMr(spec, "putty_finish_kg_per_m2", DW_DEFAULTS.putty_finish_kg_per_m2);
  const PUTTY_RESERVE = dwMr(spec, "putty_reserve", DW_DEFAULTS.putty_reserve);
  const PUTTY_BAG_KG = dwMr(spec, "putty_bag_kg", DW_DEFAULTS.putty_bag_kg);
  const SERPYANKA_M_PER_SHEET = dwMr(spec, "serpyanka_m_per_sheet", DW_DEFAULTS.serpyanka_m_per_sheet);
  const SERPYANKA_RESERVE = dwMr(spec, "serpyanka_reserve", DW_DEFAULTS.serpyanka_reserve);
  const SERPYANKA_ROLL_M = dwMr(spec, "serpyanka_roll_m", DW_DEFAULTS.serpyanka_roll_m);
  const PRIMER_L_PER_M2 = dwMr(spec, "primer_l_per_m2", DW_DEFAULTS.primer_l_per_m2);
  const PRIMER_RESERVE = dwMr(spec, "primer_reserve", DW_DEFAULTS.primer_reserve);
  const PRIMER_CAN_L = dwMr(spec, "primer_can_l", DW_DEFAULTS.primer_can_l);
  const SANDPAPER_M2_PER_SHEET = dwMr(spec, "sandpaper_m2_per_sheet", DW_DEFAULTS.sandpaper_m2_per_sheet);
  const SANDPAPER_PACK = dwMr(spec, "sandpaper_pack", DW_DEFAULTS.sandpaper_pack);
  const PROFILE_LENGTH_M = dwMr(spec, "profile_length_m", DW_DEFAULTS.profile_length_m);
  const SEALING_TAPE_ROLL_M = dwMr(spec, "sealing_tape_roll_m", DW_DEFAULTS.sealing_tape_roll_m);
  const SCREWS_TF_PACKAGE_PCS = dwMr(spec, "screws_tf_package_pcs", DW_DEFAULTS.screws_tf_package_pcs);
  const SCREWS_LB_PACKAGE_PCS = dwMr(spec, "screws_lb_package_pcs", DW_DEFAULTS.screws_lb_package_pcs);

  const workType = resolveWorkType(spec, inputs);
  const height = resolveHeight(spec, inputs);
  const layers = resolveLayers(spec, inputs);
  const sheetSize = resolveSheetSize(spec, inputs);
  const profileStep = resolveProfileStep(spec, inputs);
  const geometry = resolveGeometry(spec, inputs, workType, height);
  const length = geometry.length;

  const area = geometry.area;
  const sides = workType === 0 ? 2 : 1;
  const totalSheetArea = area * sides * layers;

  const sheet = SHEET_SIZES[sheetSize] ?? SHEET_SIZES[0];
  const gklArea = sheet.area;
  const accuracyMult = getPrimaryMultiplier("drywall", accuracyMode);
  const baseSheetsNeededRaw = Math.ceil(totalSheetArea / gklArea * SHEET_RESERVE);
  const baseSheetsNeeded = Math.ceil(baseSheetsNeededRaw * accuracyMult);

  // Для перегородки направляющий профиль идёт по полу и потолку.
  // У облицовки каждая выбранная стена считается отдельной рамой.
  const wallRun = geometry.segments.reduce((sum, segment) => sum + segment, 0);
  const pnPerimeter = workType === 0
    ? 2 * wallRun
    : geometry.segments.reduce((sum, segment) => sum + 2 * (segment + height), 0);
  const pnLength = Math.ceil(pnPerimeter * PROFILE_RESERVE / PROFILE_LENGTH_M) * PROFILE_LENGTH_M;
  const pnPieces = pnLength / PROFILE_LENGTH_M;

  // На каждом отрезке есть начальная и конечная стойка.
  const ppCount = geometry.segments.reduce(
    (sum, segment) => sum + Math.ceil(segment / profileStep) + 1,
    0,
  );
  const ppLength = ppCount * height * PROFILE_RESERVE;
  const ppPieces = Math.ceil(ppLength / PROFILE_LENGTH_M);

  // Саморезы считаются поштучно: для второго слоя нужен более длинный крепёж.
  const layerSheetArea = area * sides;
  const screws25Pcs = Math.ceil(layerSheetArea * SCREWS_TF_PER_M2 * PROFILE_RESERVE);
  const screws35Pcs = layers === 2
    ? Math.ceil(layerSheetArea * SCREWS_TF_PER_M2 * PROFILE_RESERVE)
    : 0;
  const screwsTFpcs = screws25Pcs + screws35Pcs;
  const screwsLBpcs = Math.ceil(ppCount * SCREWS_LB_PER_PROFILE * PROFILE_RESERVE);

  // Dowels
  const dowels = Math.ceil(pnPerimeter / DOWELS_STEP_M);

  // Sealing tape
  const sealingTapeRolls = Math.ceil(pnPerimeter / SEALING_TAPE_ROLL_M);

  // Putty
  const puttyStartBags = Math.ceil(totalSheetArea * PUTTY_START_KG_PER_M2 * PUTTY_RESERVE / PUTTY_BAG_KG);
  const puttyFinishBags = Math.ceil(totalSheetArea * PUTTY_FINISH_KG_PER_M2 * PUTTY_RESERVE / PUTTY_BAG_KG);

  // Serpyanka
  const serpyankaRolls = Math.ceil(baseSheetsNeeded * SERPYANKA_M_PER_SHEET * SERPYANKA_RESERVE / SERPYANKA_ROLL_M);

  // Primer
  const primerCans = Math.ceil(totalSheetArea * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN_L);

  // Sandpaper
  const sandpaperPacks = Math.ceil(Math.ceil(totalSheetArea / SANDPAPER_M2_PER_SHEET) / SANDPAPER_PACK);

  // Packaging for scenarios (sheet count is the main material)
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `gkl-sheet-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseSheetsNeeded * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `workType:${workType}`,
        `inputMode:${geometry.inputMode}`,
        `wallScope:${geometry.wallScope}`,
        `sheetSize:${sheetSize}`,
        `layers:${layers}`,
        `profileStep:${profileStep}`,
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

  const warnings: string[] = [];
  if (height > spec.warnings_rules.wide_profile_height_threshold) {
    warnings.push("Высота более 3.5 м — требуются профили шириной 100 мм");
  }
  if (layers === 2) {
    warnings.push("Второй слой гипсокартона монтируется со смещением 600 мм");
  }
  if (geometry.inputMode === 1) {
    warnings.push("По готовой площади листы рассчитаны точно, а профили — ориентировочно: для точного каркаса выберите ввод по размерам");
  }
  if ((inputs.openingsArea ?? 0) > geometry.openingsArea) {
    warnings.push("Площадь проёмов не может быть равна площади стен или превышать её — значение ограничено");
  }

  const practicalNotes: string[] = [];
  if (layers === 2) {
    practicalNotes.push("Два слоя гипсокартона — смещайте стыки минимум на 400 мм, иначе по шву появится трещина");
  }
  if (height > 3.5) {
    practicalNotes.push(`Высота ${roundDisplay(height, 1)} м выходит за типовой диапазон — ширину и шаг стоечных профилей должен проверить конструктор`);
  }
  practicalNotes.push("Между гипсокартоном и полом оставляйте зазор 10 мм — при усадке дома лист не лопнет");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      workType,
      sheet,
      recScenario.exact_need,
      pnPieces,
      ppPieces,
      screws25Pcs,
      screws35Pcs,
      screwsLBpcs,
      SCREWS_TF_PACKAGE_PCS,
      SCREWS_LB_PACKAGE_PCS,
      dowels,
      sealingTapeRolls,
      puttyStartBags,
      puttyFinishBags,
      serpyankaRolls,
      buildPrimerMaterial(totalSheetArea * PRIMER_L_PER_M2, { reserveFactor: PRIMER_RESERVE }),
      sandpaperPacks,
    ),
    totals: {
      area: area,
      grossArea: geometry.grossArea,
      openingsArea: geometry.openingsArea,
      inputMode: geometry.inputMode,
      wallScope: geometry.wallScope,
      workType: workType,
      length: roundDisplay(length, 3),
      roomLength: roundDisplay(geometry.roomLength, 3),
      roomWidth: roundDisplay(geometry.roomWidth, 3),
      wallRun: roundDisplay(wallRun, 3),
      height: roundDisplay(height, 3),
      layers: layers,
      sheetSize: sheetSize,
      profileStep: profileStep,
      sides: sides,
      totalSheetArea: roundDisplay(totalSheetArea, 3),
      gklArea: gklArea,
      sheetsNeeded: roundDisplay(recScenario.exact_need, 3),
      pnPerimeter: roundDisplay(pnPerimeter, 3),
      pnPieces: pnPieces,
      ppCount: ppCount,
      ppPieces: ppPieces,
      screwsTF: screwsTFpcs,
      screwsLB: screwsLBpcs,
      screws25Pcs,
      screws35Pcs,
      dowels: dowels,
      sealingTapeRolls: sealingTapeRolls,
      puttyStartBags: puttyStartBags,
      puttyFinishBags: puttyFinishBags,
      serpyankaRolls: serpyankaRolls,
      primerCans: primerCans,
      sandpaperPacks: sandpaperPacks,
      minExactNeedSheets: scenarios.MIN.exact_need,
      recExactNeedSheets: recScenario.exact_need,
      maxExactNeedSheets: scenarios.MAX.exact_need,
      minPurchaseSheets: scenarios.MIN.purchase_quantity,
      recPurchaseSheets: recScenario.purchase_quantity,
      maxPurchaseSheets: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseSheetsNeededRaw, "drywall", accuracyMode).explanation,
  };
}
