import type { AccuracyMode } from "./accuracy";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE } from "./accuracy";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  DecorStoneCanonicalSpec,
} from "./canonical";
import type { FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface DecorStoneInputs {
  inputMode?: number;
  area?: number;
  wallWidth?: number;
  wallHeight?: number;
  openingsArea?: number;
  stoneType?: number;
  reservePercent?: number;
  packArea?: number;
  glueRate?: number;
  glueBag?: number;
  needGrout?: number;
  groutRate?: number;
  groutBag?: number;
  needPrimer?: number;
  primerRate?: number;
  primerLayers?: number;
  primerCan?: number;
  accuracyMode?: AccuracyMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeCanonicalDecorStone(
  spec: DecorStoneCanonicalSpec,
  inputs: DecorStoneInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const inputMode = Math.round(clamp(inputs.inputMode ?? getInputDefault(spec, "inputMode", 1), 0, 1));
  const areaInput = clamp(inputs.area ?? getInputDefault(spec, "area", 15), 1, 500);
  const wallWidth = clamp(inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 4), 0.5, 30);
  const wallHeight = clamp(inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7), 0.5, 10);
  const openingsAreaInput = clamp(inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 0), 0, 200);
  const stoneType = Math.round(clamp(inputs.stoneType ?? getInputDefault(spec, "stoneType", 0), 0, 2));
  const reservePercent = clamp(
    inputs.reservePercent ?? getInputDefault(spec, "reservePercent", spec.material_rules.default_reserve_percent),
    0,
    30,
  );
  const packArea = clamp(
    inputs.packArea ?? getInputDefault(spec, "packArea", spec.material_rules.default_pack_area_m2),
    0.1,
    20,
  );
  const glueRate = clamp(
    inputs.glueRate ?? getInputDefault(spec, "glueRate", spec.material_rules.default_glue_rate_kg_m2),
    0.1,
    20,
  );
  const glueBag = clamp(
    inputs.glueBag ?? getInputDefault(spec, "glueBag", spec.material_rules.default_glue_bag_kg),
    1,
    50,
  );
  const needGrout = Math.round(inputs.needGrout ?? getInputDefault(spec, "needGrout", 1)) === 1 ? 1 : 0;
  const groutRate = clamp(
    inputs.groutRate ?? getInputDefault(spec, "groutRate", spec.material_rules.default_grout_rate_kg_m2),
    0.01,
    5,
  );
  const groutBag = clamp(
    inputs.groutBag ?? getInputDefault(spec, "groutBag", spec.material_rules.default_grout_bag_kg),
    0.5,
    25,
  );
  const needPrimer = Math.round(inputs.needPrimer ?? getInputDefault(spec, "needPrimer", 1)) === 1 ? 1 : 0;
  const primerRate = clamp(
    inputs.primerRate ?? getInputDefault(spec, "primerRate", spec.material_rules.default_primer_rate_l_m2),
    0.01,
    1,
  );
  const primerLayers = Math.round(clamp(
    inputs.primerLayers ?? getInputDefault(spec, "primerLayers", spec.material_rules.default_primer_layers),
    1,
    3,
  ));
  const primerCan = clamp(
    inputs.primerCan ?? getInputDefault(spec, "primerCan", spec.material_rules.default_primer_can_l),
    0.5,
    20,
  );

  const grossArea = inputMode === 0 ? wallWidth * wallHeight : areaInput;
  const openingsArea = inputMode === 0 ? Math.min(openingsAreaInput, grossArea) : 0;
  const area = roundDisplay(Math.max(0, grossArea - openingsArea), 3);
  const recommendedMaxReserve = Math.max(
    reservePercent,
    spec.scenario_policy.recommended_max_reserve_percent ?? 15,
  );
  const packageOptions = [{ size: packArea, label: "decor-stone-pack", unit: spec.packaging_rules.unit }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const scenarioReservePercent = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? recommendedMaxReserve
        : reservePercent;
    const reserveMultiplier = 1 + scenarioReservePercent / 100;
    const exactNeed = roundDisplay(area * reserveMultiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `inputMode:${inputMode}`,
        `reserve_percent:${scenarioReservePercent}`,
        "scenario_policy:single_explicit_stone_reserve",
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        reserve_percent: roundDisplay(scenarioReservePercent, 3),
        field_multiplier: roundDisplay(reserveMultiplier, 6),
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
  const glueKg = roundDisplay(area * glueRate, 6);
  const glueBags = glueKg > 0 ? Math.ceil(glueKg / glueBag) : 0;
  const groutKg = needGrout ? roundDisplay(area * groutRate, 6) : 0;
  const groutBags = groutKg > 0 ? Math.ceil(groutKg / groutBag) : 0;
  const primerL = needPrimer ? roundDisplay(area * primerRate * primerLayers, 6) : 0;
  const primerCans = primerL > 0 ? Math.ceil(primerL / primerCan) : 0;

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Декоративный камень (${roundDisplay(packArea, 3)} м²/уп.)`,
      quantity: roundDisplay(recScenario.exact_need, 3),
      unit: "м²",
      withReserve: roundDisplay(recScenario.purchase_quantity, 3),
      purchaseQty: roundDisplay(recScenario.purchase_quantity, 3),
      packageInfo: {
        count: recScenario.buy_plan.packages_count,
        size: packArea,
        packageUnit: "упаковок",
      },
      category: "Облицовка",
    },
    {
      name: `Клей (${roundDisplay(glueBag, 3)} кг)`,
      quantity: roundDisplay(glueKg, 3),
      unit: "кг",
      withReserve: roundDisplay(glueBags * glueBag, 3),
      purchaseQty: roundDisplay(glueBags * glueBag, 3),
      packageInfo: { count: glueBags, size: glueBag, packageUnit: "мешков" },
      category: "Монтаж",
    },
  ];

  if (needGrout && groutBags > 0) {
    materials.push({
      name: `Затирка (${roundDisplay(groutBag, 3)} кг)`,
      quantity: roundDisplay(groutKg, 3),
      unit: "кг",
      withReserve: roundDisplay(groutBags * groutBag, 3),
      purchaseQty: roundDisplay(groutBags * groutBag, 3),
      packageInfo: { count: groutBags, size: groutBag, packageUnit: "мешков" },
      category: "Отделка",
    });
  }

  if (needPrimer && primerCans > 0) {
    materials.push({
      name: `Грунтовка (${roundDisplay(primerCan, 3)} л)`,
      quantity: roundDisplay(primerL, 3),
      unit: "л",
      withReserve: roundDisplay(primerCans * primerCan, 3),
      purchaseQty: roundDisplay(primerCans * primerCan, 3),
      packageInfo: { count: primerCans, size: primerCan, packageUnit: "канистр" },
      category: "Подготовка",
    });
  }

  const warnings: string[] = [];
  if (inputMode === 0 && openingsAreaInput >= grossArea) {
    warnings.push("Площадь проёмов должна быть меньше общей площади стены");
  }
  if (stoneType === 2) {
    warnings.push("Для тяжёлого натурального камня проверьте несущую способность основания и монтажную систему");
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — сверьте фасовку и предусмотрите материал из одной партии");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      grossArea: roundDisplay(grossArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      inputMode,
      wallWidth: roundDisplay(wallWidth, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      stoneType,
      reservePercent: roundDisplay(reservePercent, 3),
      packArea: roundDisplay(packArea, 3),
      stoneM2: roundDisplay(recScenario.exact_need, 3),
      stoneArea: roundDisplay(recScenario.exact_need, 3),
      stonePackages: recScenario.buy_plan.packages_count,
      glueRate: roundDisplay(glueRate, 3),
      glueBag: roundDisplay(glueBag, 3),
      glueKg: roundDisplay(glueKg, 3),
      glueBags,
      needGrout,
      groutRate: roundDisplay(groutRate, 3),
      groutBag: roundDisplay(groutBag, 3),
      groutKg: roundDisplay(groutKg, 3),
      groutBags,
      needPrimer,
      primerRate: roundDisplay(primerRate, 3),
      primerLayers,
      primerCan: roundDisplay(primerCan, 3),
      primerL: roundDisplay(primerL, 3),
      primerLiters: roundDisplay(primerL, 3),
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
      "Возьмите площадь коробки, нормы расхода и фасовки с этикеток выбранных материалов",
      "Если коллекция требует угловых элементов, посчитайте их отдельно в погонных метрах или штуках по паспорту коллекции",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: roundDisplay(1 + reservePercent / 100, 6),
      appliedModifiers: reservePercent > 0
        ? [{
            key: "waste",
            label: "Запас камня",
            value: roundDisplay(1 + reservePercent / 100, 6),
            reason: "пользовательский запас применяется один раз перед округлением до упаковки",
          }]
        : [],
      notes: [
        reservePercent > 0
          ? `К чистой площади один раз добавлен запас ${reservePercent}%`
          : "Камень рассчитан по чистой площади без скрытого запаса",
      ],
    },
  };
}
