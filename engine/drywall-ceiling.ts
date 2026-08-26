import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DrywallCeilingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, ACCURACY_MODE_LABELS } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import type { FactorTable } from "./factors";

interface DrywallCeilingInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  layers?: number;
  sheetWidthMm?: number;
  sheetLengthMm?: number;
  sheetReservePercent?: number;
  profileLengthM?: number;
  profileReservePercent?: number;
  fastenerReservePercent?: number;
  screwPackCount?: number;
  tapeRollM?: number;
  puttyBagKg?: number;
  primerRateLPerM2?: number;
  primerCanL?: number;
  finishReservePercent?: number;
  accuracyMode?: AccuracyMode;
}

function percentMultiplier(percent: number): number {
  return 1 + percent / 100;
}

export function computeCanonicalDrywallCeiling(
  spec: DrywallCeilingCanonicalSpec,
  inputs: DrywallCeilingInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const length = Math.max(1, Math.min(20, inputs.length ?? getInputDefault(spec, "length", 5)));
  const width = Math.max(1, Math.min(20, inputs.width ?? getInputDefault(spec, "width", 4)));
  const areaInput = Math.max(1, Math.min(200, inputs.area ?? getInputDefault(spec, "area", 20)));
  const layers = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1)) === 2 ? 2 : 1;
  const area = inputMode === 0 ? roundDisplay(length * width, 3) : areaInput;
  const effectiveLength = inputMode === 0 ? length : Math.sqrt(area);
  const effectiveWidth = inputMode === 0 ? width : Math.sqrt(area);
  const perimeter = 2 * (effectiveLength + effectiveWidth);

  const sheetWidthM = Math.max(0.6, (inputs.sheetWidthMm ?? getInputDefault(spec, "sheetWidthMm", 1200)) / 1000);
  const sheetLengthM = Math.max(1.2, (inputs.sheetLengthMm ?? getInputDefault(spec, "sheetLengthMm", 2500)) / 1000);
  const sheetArea = sheetWidthM * sheetLengthM;
  const sheetReservePercent = Math.max(0, inputs.sheetReservePercent ?? getInputDefault(spec, "sheetReservePercent", 10));
  const profileLengthM = Math.max(2, inputs.profileLengthM ?? getInputDefault(spec, "profileLengthM", 3));
  const profileReservePercent = Math.max(0, inputs.profileReservePercent ?? getInputDefault(spec, "profileReservePercent", 5));
  const fastenerReservePercent = Math.max(0, inputs.fastenerReservePercent ?? getInputDefault(spec, "fastenerReservePercent", 5));
  const finishReservePercent = Math.max(0, inputs.finishReservePercent ?? getInputDefault(spec, "finishReservePercent", 10));
  const screwPackCount = Math.max(100, Math.round(inputs.screwPackCount ?? getInputDefault(spec, "screwPackCount", 1000)));
  const tapeRollM = Math.max(10, inputs.tapeRollM ?? getInputDefault(spec, "tapeRollM", 45));
  const puttyBagKg = Math.max(1, inputs.puttyBagKg ?? getInputDefault(spec, "puttyBagKg", 25));
  const primerRateLPerM2 = Math.max(0.05, inputs.primerRateLPerM2 ?? getInputDefault(spec, "primerRateLPerM2", 0.15));
  const primerCanL = Math.max(0.5, inputs.primerCanL ?? getInputDefault(spec, "primerCanL", 5));

  const baseSheets = area * layers / sheetArea;
  const recSheets = baseSheets * percentMultiplier(sheetReservePercent);
  const maxSheetReservePercent = sheetReservePercent + spec.material_rules.max_extra_sheet_percent;
  const packageOptions = [{ size: 1, label: "gkl-sheet", unit: spec.packaging_rules.unit }];
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? maxSheetReservePercent
        : sheetReservePercent;
    const exactNeed = roundDisplay(baseSheets * percentMultiplier(reservePercent), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: packaging.purchaseQuantity,
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `input_mode:${inputMode}`,
        `layers:${layers}`,
        `sheet:${roundDisplay(sheetWidthM * 1000, 0)}x${roundDisplay(sheetLengthM * 1000, 0)}`,
        "scenario_policy:explicit_sheet_reserve",
      ],
      key_factors: {
        field_multiplier: roundDisplay(percentMultiplier(reservePercent), 6),
        reserve_percent: roundDisplay(reservePercent, 3),
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
  const profileBaseM = area * spec.material_rules.pp_m_per_m2;
  const profileWithReserveM = profileBaseM * percentMultiplier(profileReservePercent);
  const ppPcs = Math.ceil(profileWithReserveM / profileLengthM);
  const pnBaseM = perimeter;
  const pnWithReserveM = pnBaseM * percentMultiplier(profileReservePercent);
  const pnPcs = Math.ceil(pnWithReserveM / profileLengthM);
  const suspensionsBase = area * spec.material_rules.suspension_per_m2;
  const suspCount = Math.ceil(suspensionsBase * percentMultiplier(fastenerReservePercent));
  const connectorsBase = area * spec.material_rules.connector_per_m2;
  const crabCount = Math.ceil(connectorsBase * percentMultiplier(fastenerReservePercent));
  const screwsBase = area * layers * spec.material_rules.screws_per_m2_per_layer;
  const screwsWithReserve = screwsBase * percentMultiplier(fastenerReservePercent);
  const screwPacks = Math.ceil(screwsWithReserve / screwPackCount);
  const perimeterDowelsBase = perimeter / spec.material_rules.perimeter_dowel_step_m;
  const perimeterDowels = Math.ceil(perimeterDowelsBase * percentMultiplier(fastenerReservePercent));
  const ceilingAnchors = suspCount;
  const dowelCount = ceilingAnchors + perimeterDowels;

  const tapeBaseM = area * spec.material_rules.tape_m_per_m2;
  const tapeWithReserveM = tapeBaseM * percentMultiplier(finishReservePercent);
  const tapeRolls = Math.ceil(tapeWithReserveM / tapeRollM);
  const puttyBaseKg = area * spec.material_rules.putty_kg_per_m2;
  const puttyWithReserveKg = puttyBaseKg * percentMultiplier(finishReservePercent);
  const puttyBags = Math.ceil(puttyWithReserveKg / puttyBagKg);
  const primerBaseL = area * primerRateLPerM2;
  const primerWithReserveL = primerBaseL * percentMultiplier(finishReservePercent);
  const primerCans = Math.ceil(primerWithReserveL / primerCanL);

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Гипсокартонные листы (ГКЛ) ${roundDisplay(sheetWidthM * 1000, 0)}×${roundDisplay(sheetLengthM * 1000, 0)} мм для потолка`,
      subtitle: `Чистая потребность ${roundDisplay(baseSheets, 2)} листа; запас ${roundDisplay(sheetReservePercent, 1)}% применён один раз перед округлением`,
      quantity: roundDisplay(baseSheets, 6),
      unit: "шт",
      withReserve: roundDisplay(recSheets, 6),
      purchaseQty: recScenario.purchase_quantity,
      category: "Основное",
      packageInfo: { count: recScenario.buy_plan.packages_count, size: 1, packageUnit: "листов" },
    },
    {
      name: `Потолочный профиль ПП 60×27×${roundDisplay(profileLengthM * 1000, 0)} мм`,
      subtitle: `Ориентир ${spec.material_rules.pp_m_per_m2} пог. м/м² для одноуровневого каркаса; точную раскладку сверяйте с системой`,
      quantity: roundDisplay(profileBaseM / profileLengthM, 6),
      unit: "шт",
      withReserve: roundDisplay(profileWithReserveM / profileLengthM, 6),
      purchaseQty: ppPcs,
      category: "Каркас",
    },
    {
      name: `Направляющий профиль ПН 27×28×${roundDisplay(profileLengthM * 1000, 0)} мм`,
      subtitle: `По расчётному периметру ${roundDisplay(perimeter, 2)} м; в режиме площади принята квадратная форма помещения`,
      quantity: roundDisplay(pnBaseM / profileLengthM, 6),
      unit: "шт",
      withReserve: roundDisplay(pnWithReserveM / profileLengthM, 6),
      purchaseQty: pnPcs,
      category: "Каркас",
    },
    {
      name: "Подвес для профиля 60×27 мм",
      subtitle: `Ориентир ${spec.material_rules.suspension_per_m2} шт./м²; тип подвеса зависит от опуска и выбранной системы`,
      quantity: roundDisplay(suspensionsBase, 6),
      unit: "шт",
      withReserve: suspCount,
      purchaseQty: suspCount,
      category: "Каркас",
    },
    {
      name: "Одноуровневый соединитель («краб») для ПП 60×27 мм",
      subtitle: `Ориентир ${spec.material_rules.connector_per_m2} шт./м² без потерь на раскрой`,
      quantity: roundDisplay(connectorsBase, 6),
      unit: "шт",
      withReserve: crabCount,
      purchaseQty: crabCount,
      category: "Каркас",
    },
    {
      name: layers === 2
        ? "Саморезы для ГКЛ по металлу: первый и второй слой"
        : "Саморезы для ГКЛ по металлу 3,5×25 мм",
      subtitle: `${roundDisplay(spec.material_rules.screws_per_m2_per_layer, 0)} шт./м² на слой; длину самореза для второго слоя сверяйте с системой`,
      quantity: roundDisplay(screwsBase, 6),
      unit: "шт",
      withReserve: roundDisplay(screwsWithReserve, 6),
      purchaseQty: screwPacks * screwPackCount,
      category: "Крепёж",
      packageInfo: { count: screwPacks, size: screwPackCount, packageUnit: "упаковок" },
    },
    {
      name: "Крепёж к основанию: металлические анкеры подвесов и дюбели направляющего профиля",
      subtitle: `${ceilingAnchors} анкеров для подвесов и ${perimeterDowels} креплений ПН; тип крепежа выбирают по основанию`,
      quantity: roundDisplay(suspensionsBase + perimeterDowelsBase, 6),
      unit: "шт",
      withReserve: dowelCount,
      purchaseQty: dowelCount,
      category: "Крепёж",
    },
    {
      name: `Армирующая лента для швов (${roundDisplay(tapeRollM, 1)} м)`,
      subtitle: `Расчёт ${spec.material_rules.tape_m_per_m2} м/м²; тип ленты должен соответствовать шпаклёвочной системе`,
      quantity: roundDisplay(tapeBaseM, 6),
      unit: "м",
      withReserve: roundDisplay(tapeWithReserveM, 6),
      purchaseQty: tapeRolls * tapeRollM,
      category: "Отделка",
      packageInfo: { count: tapeRolls, size: tapeRollM, packageUnit: "рулонов" },
    },
    {
      name: `Шпаклёвка для стыков ГКЛ (${roundDisplay(puttyBagKg, 1)} кг)`,
      subtitle: `Расчёт ${spec.material_rules.putty_kg_per_m2} кг/м² для заделки стыков; сплошное шпаклевание не включено`,
      quantity: roundDisplay(puttyBaseKg, 6),
      unit: "кг",
      withReserve: roundDisplay(puttyWithReserveKg, 6),
      purchaseQty: puttyBags * puttyBagKg,
      category: "Отделка",
      packageInfo: { count: puttyBags, size: puttyBagKg, packageUnit: "мешков" },
    },
    {
      name: `Грунтовка (${roundDisplay(primerCanL, 1)} л)`,
      subtitle: `Расход ${roundDisplay(primerRateLPerM2, 3)} л/м² перенесите с этикетки выбранного состава`,
      quantity: roundDisplay(primerBaseL, 6),
      unit: "л",
      withReserve: roundDisplay(primerWithReserveL, 6),
      purchaseQty: primerCans * primerCanL,
      category: "Отделка",
      packageInfo: { count: primerCans, size: primerCanL, packageUnit: "канистр" },
    },
  ];

  const warnings: string[] = [];
  if (layers === 2) {
    warnings.push("Для двух слоёв нужна разбежка стыков; допустимость каркаса и нагрузки проверьте по выбранной системе");
  }
  if (area > spec.warnings_rules.deformation_joint_area_threshold_m2) {
    warnings.push("Площадь более 50 м² — расположение деформационных швов должен определить проект");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      perimeter: roundDisplay(perimeter, 3),
      inputMode,
      length: inputMode === 0 ? roundDisplay(length, 3) : 0,
      width: inputMode === 0 ? roundDisplay(width, 3) : 0,
      layers,
      sheetWidthMm: roundDisplay(sheetWidthM * 1000, 0),
      sheetLengthMm: roundDisplay(sheetLengthM * 1000, 0),
      sheetArea: roundDisplay(sheetArea, 6),
      sheetReservePercent: roundDisplay(sheetReservePercent, 3),
      baseSheets: roundDisplay(baseSheets, 6),
      sheets: recScenario.purchase_quantity,
      profileLengthM: roundDisplay(profileLengthM, 3),
      profileReservePercent: roundDisplay(profileReservePercent, 3),
      profileBaseM: roundDisplay(profileBaseM, 6),
      totalProfileM: roundDisplay(profileWithReserveM, 6),
      ppPcs,
      pnM: roundDisplay(pnWithReserveM, 6),
      pnPcs,
      suspCount,
      crabCount,
      screwsGKL: roundDisplay(screwsBase, 6),
      screwsWithReserve: roundDisplay(screwsWithReserve, 6),
      screwPacks,
      screwPackCount,
      dowelCount,
      ceilingAnchors,
      perimeterDowels,
      tapeM: roundDisplay(tapeWithReserveM, 6),
      tapeRolls,
      puttyKg: roundDisplay(puttyWithReserveKg, 6),
      puttyBags,
      primerL: roundDisplay(primerWithReserveL, 6),
      primerCans,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      `Профиль, подвесы и соединители оценены по ориентировочному расходу одноуровневой системы: ${spec.material_rules.pp_m_per_m2} пог. м, ${spec.material_rules.suspension_per_m2} подвеса и ${spec.material_rules.connector_per_m2} соединителя на 1 м²`,
      "Результат — закупочная оценка. Шаги профилей, точки крепления, нагрузки светильников и тип подвеса сверяйте с альбомом выбранной комплектной системы",
      "Запасы листов, профиля, крепежа и отделки показаны отдельно и применяются по одному разу",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: ["Режим точности не добавляет скрытых коэффициентов: итог определяется геометрией, явными запасами и фасовками"],
    },
  };
}
