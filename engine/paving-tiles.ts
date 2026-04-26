import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  PavingTilesCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

/* ─── labels ─── */

const FOUNDATION_LABELS: Record<number, string> = {
  0: "Песчаное (пешеходная зона)",
  1: "Цементно-песчаное (универсальное)",
  2: "Бетонное (под автомобиль)",
};

/* ─── inputs ─── */

interface PavingTilesInputs {
  area?: number;
  perimeter?: number;
  foundationType?: number;
  tileThickness?: number;
  borderEnabled?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: PavingTilesCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalPavingTiles(
  spec: PavingTilesCanonicalSpec,
  inputs: PavingTilesInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = Math.max(5, Math.min(2000, inputs.area ?? getInputDefault(spec, "area", 50)));
  const perimeter = Math.max(4, Math.min(500, inputs.perimeter ?? getInputDefault(spec, "perimeter", 30)));
  const foundationType = Math.max(0, Math.min(2, Math.round(inputs.foundationType ?? getInputDefault(spec, "foundationType", 1))));
  const tileThickness = Math.max(30, Math.min(80, inputs.tileThickness ?? getInputDefault(spec, "tileThickness", 60)));
  const borderEnabled = Math.max(0, Math.min(1, Math.round(inputs.borderEnabled ?? getInputDefault(spec, "borderEnabled", 1))));

  const rules = spec.material_rules;

  /* ─── tile (primary) ─── */
  const tileM2 = Math.ceil(area * rules.tile_reserve);

  /* ─── bedding layer (sand vs cement-sand mix vs concrete) ─── */
  let sandBeddingM3 = 0;
  let cementSandMixM3 = 0;
  let cementBags = 0;
  let concreteM3 = 0;
  let gravelM3 = 0;

  // Щебневая подушка нужна для типов 1 (ЦПС) и 2 (бетон); для 0 — только песок
  if (foundationType === 0) {
    // песчаное основание — увеличенная подсыпка песка вместо щебня + ЦПС
    const sandLayer = rules.sand_bedding_layer_m_auto;
    sandBeddingM3 = roundDisplay(area * sandLayer * rules.compaction_factor_sand, 3);
  } else if (foundationType === 1) {
    // ЦПС — щебневая подушка + слой ЦПС
    gravelM3 = roundDisplay(area * rules.gravel_layer_m * rules.compaction_factor_gravel, 3);
    const mixLayerM3 = area * rules.cement_sand_mix_layer_m * rules.compaction_factor_cement_sand;
    cementSandMixM3 = roundDisplay(mixLayerM3, 3);
    const mixKg = mixLayerM3 * rules.cement_sand_mix_kg_per_m3;
    // ЦПС 1:4 (цемент:песок) — цемент составляет ~20% массы смеси
    cementBags = Math.ceil((mixKg * 0.2) / rules.cement_bag_kg);
    sandBeddingM3 = roundDisplay(area * rules.sand_bedding_layer_m * rules.compaction_factor_sand, 3);
  } else {
    // бетонное основание — щебневая подушка + плита
    gravelM3 = roundDisplay(area * rules.gravel_layer_m * rules.compaction_factor_gravel, 3);
    concreteM3 = roundDisplay(area * rules.concrete_layer_m * rules.concrete_reserve, 3);
    sandBeddingM3 = roundDisplay(area * rules.sand_bedding_layer_m * rules.compaction_factor_sand, 3);
  }

  /* ─── joint sand (quartz) ─── */
  const jointSandKg = area * rules.joint_sand_kg_per_m2 * rules.joint_sand_reserve;
  const jointSandBags = Math.ceil(jointSandKg / rules.joint_sand_bag_kg);

  /* ─── border ─── */
  let borderPcs = 0;
  let borderConcreteM3 = 0;
  if (borderEnabled === 1) {
    borderPcs = Math.ceil((perimeter / rules.border_length_m) * rules.border_reserve);
    borderConcreteM3 = roundDisplay(perimeter * rules.border_concrete_m_per_m, 3);
  }

  /* ─── geotextile ─── */
  const geotextileRolls = Math.ceil((area * rules.geotextile_reserve) / rules.geotextile_roll_m2);

  /* ─── scenarios — primary unit is tile m² ─── */
  const basePrimaryRaw = tileM2;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 6);

  const packageOptions = [{
    size: 1,
    label: "paving-tile-m2",
    unit: "м²",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(basePrimary * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `foundationType:${foundationType}`,
        `tileThickness:${tileThickness}`,
        `borderEnabled:${borderEnabled}`,
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

  /* ─── materials ─── */
  const foundationLabel = FOUNDATION_LABELS[foundationType] ?? FOUNDATION_LABELS[1];
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Тротуарная плитка ${tileThickness} мм`,
      quantity: roundDisplay(area, 3),
      unit: "м²",
      withReserve: tileM2,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Покрытие",
    },
  ];

  if (gravelM3 > 0) {
    materials.push({
      name: "Щебень фр. 20-40 мм (подушка)",
      quantity: gravelM3,
      unit: "м³",
      withReserve: gravelM3,
      purchaseQty: Math.ceil(gravelM3 * 10) / 10,
      category: "Подготовка",
    });
  }

  materials.push({
    name: "Песок строительный (подушка)",
    quantity: sandBeddingM3,
    unit: "м³",
    withReserve: sandBeddingM3,
    purchaseQty: Math.ceil(sandBeddingM3 * 10) / 10,
    category: "Подготовка",
  });

  if (foundationType === 1 && cementSandMixM3 > 0) {
    materials.push(
      {
        name: "ЦПС (цементно-песчаная смесь)",
        quantity: cementSandMixM3,
        unit: "м³",
        withReserve: cementSandMixM3,
        purchaseQty: Math.ceil(cementSandMixM3 * 10) / 10,
        category: "Основание",
      },
      {
        name: `Цемент М400 (${rules.cement_bag_kg} кг)`,
        quantity: cementBags,
        unit: "мешков",
        withReserve: cementBags,
        purchaseQty: cementBags,
        category: "Основание",
      },
    );
  }

  if (foundationType === 2 && concreteM3 > 0) {
    materials.push({
      name: "Бетон М200 (плита основания)",
      quantity: concreteM3,
      unit: "м³",
      withReserve: concreteM3,
      purchaseQty: Math.ceil(concreteM3 * 10) / 10,
      category: "Основание",
    });
  }

  materials.push({
    name: `Кварцевый песок для швов (${rules.joint_sand_bag_kg} кг)`,
    quantity: jointSandBags,
    unit: "мешков",
    withReserve: jointSandBags,
    purchaseQty: jointSandBags,
    category: "Швы",
  });

  if (borderEnabled === 1 && borderPcs > 0) {
    materials.push(
      {
        name: "Бордюрный камень БР100.30.18 (1.0 м)",
        quantity: borderPcs,
        unit: "шт",
        withReserve: borderPcs,
        purchaseQty: borderPcs,
        category: "Бордюр",
      },
      {
        name: "Бетон М200 для бордюра",
        quantity: borderConcreteM3,
        unit: "м³",
        withReserve: borderConcreteM3,
        purchaseQty: Math.ceil(borderConcreteM3 * 100) / 100,
        category: "Бордюр",
      },
    );
  }

  materials.push({
    name: `Геотекстиль (${rules.geotextile_roll_m2} м²)`,
    quantity: geotextileRolls,
    unit: "рулонов",
    withReserve: geotextileRolls,
    purchaseQty: geotextileRolls,
    category: "Подготовка",
  });

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (foundationType === 2 && tileThickness < spec.warnings_rules.min_tile_for_vehicle_mm) {
    warnings.push(
      `Для автомобильной нагрузки толщина плитки должна быть ≥ ${spec.warnings_rules.min_tile_for_vehicle_mm} мм (СП 78.13330.2012). ` +
        `Текущая ${tileThickness} мм — высокий риск разрушения.`,
    );
  }
  if (foundationType === 0 && tileThickness > 40) {
    warnings.push(
      "Плитка ≥ 60 мм обычно укладывается на ЦПС или бетонное основание — песчаная подушка не выдержит точечную нагрузку.",
    );
  }
  if (perimeter / area < spec.warnings_rules.min_perimeter_to_area_ratio) {
    warnings.push(
      "Соотношение периметра к площади подозрительно мало — проверьте ввод (для прямоугольной зоны 50 м² типичный периметр 28-32 м).",
    );
  }
  if (borderEnabled === 0) {
    warnings.push("Без бордюра плитка по краям расползается через 1-2 сезона — рекомендуется ограничивающий элемент.");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push(`Тип основания: ${foundationLabel}`);
  practicalNotes.push("Поперечный уклон покрытия 1.5-2% обязателен для отвода воды (СП 82.13330.2016)");
  if (foundationType === 1) {
    practicalNotes.push("ЦПС после укладки плитки проливать водой не нужно — затвердеет от естественной влаги");
  }
  if (foundationType === 2) {
    practicalNotes.push("Между бетонной плитой основания и плиткой — слой ЦПС 30 мм для нивелировки");
  }
  practicalNotes.push("Швы между плиткой 3-5 мм заполнять только сухим кварцевым песком (не цементом)");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      perimeter: roundDisplay(perimeter, 3),
      foundationType,
      tileThickness,
      borderEnabled,
      tileM2,
      sandBeddingM3,
      gravelM3,
      cementSandMixM3,
      cementBags,
      concreteM3,
      jointSandBags,
      borderPcs,
      borderConcreteM3,
      geotextileRolls,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "generic", accuracyMode).explanation,
  };
}

