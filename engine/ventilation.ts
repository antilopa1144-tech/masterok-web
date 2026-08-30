import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  VentilationCanonicalSpec,
} from "./canonical";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface VentilationInputs {
  calculationMode?: number;
  totalArea?: number;
  ceilingHeight?: number;
  peopleCount?: number;
  projectAirflowM3h?: number;
  ductShape?: number;
  roundDiameterMm?: number;
  rectWidthMm?: number;
  rectHeightMm?: number;
  targetVelocityMps?: number;
  selectedFanCapacityM3h?: number;
  ductLengthM?: number;
  stockLengthM?: number;
  ductReservePercent?: number;
  fittingCount?: number;
  airTerminalCount?: number;
  clampCount?: number;
  accuracyMode?: AccuracyMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function whole(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function addPieceMaterial(
  materials: CanonicalMaterialResult[],
  name: string,
  count: number,
  category: string,
): void {
  if (count <= 0) return;
  materials.push({
    name,
    quantity: count,
    unit: "шт",
    withReserve: count,
    purchaseQty: count,
    category,
  });
}

export function computeCanonicalVentilation(
  spec: VentilationCanonicalSpec,
  inputs: VentilationInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const calculationMode = whole(
    inputs.calculationMode ?? getInputDefault(spec, "calculationMode", 0),
    0,
    1,
  );
  const totalArea = clamp(inputs.totalArea ?? getInputDefault(spec, "totalArea", 80), 10, 1000);
  const ceilingHeight = clamp(inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7), 2.2, 5);
  const peopleCount = whole(inputs.peopleCount ?? getInputDefault(spec, "peopleCount", 3), 1, 50);
  const projectAirflowM3h = clamp(
    inputs.projectAirflowM3h ?? getInputDefault(spec, "projectAirflowM3h", 300),
    1,
    100000,
  );
  const ductShape = whole(inputs.ductShape ?? getInputDefault(spec, "ductShape", 0), 0, 1);
  const roundDiameterMm = clamp(
    inputs.roundDiameterMm ?? getInputDefault(spec, "roundDiameterMm", 200),
    80,
    2000,
  );
  const rectWidthMm = clamp(inputs.rectWidthMm ?? getInputDefault(spec, "rectWidthMm", 300), 100, 3000);
  const rectHeightMm = clamp(inputs.rectHeightMm ?? getInputDefault(spec, "rectHeightMm", 200), 50, 3000);
  const targetVelocityMps = clamp(
    inputs.targetVelocityMps ?? getInputDefault(spec, "targetVelocityMps", 3),
    0.5,
    15,
  );
  const selectedFanCapacityM3h = clamp(
    inputs.selectedFanCapacityM3h ?? getInputDefault(spec, "selectedFanCapacityM3h", 0),
    0,
    100000,
  );
  const ductLengthM = clamp(inputs.ductLengthM ?? getInputDefault(spec, "ductLengthM", 0), 0, 10000);
  const stockLengthM = clamp(inputs.stockLengthM ?? getInputDefault(spec, "stockLengthM", 3), 0.1, 50);
  const ductReservePercent = clamp(
    inputs.ductReservePercent ?? getInputDefault(spec, "ductReservePercent", 10),
    0,
    30,
  );
  const fittingCount = whole(inputs.fittingCount ?? getInputDefault(spec, "fittingCount", 0), 0, 10000);
  const airTerminalCount = whole(
    inputs.airTerminalCount ?? getInputDefault(spec, "airTerminalCount", 0),
    0,
    10000,
  );
  const clampCount = whole(inputs.clampCount ?? getInputDefault(spec, "clampCount", 0), 0, 50000);

  const volume = totalArea * ceilingHeight;
  const areaPerPerson = totalArea / peopleCount;
  const airByPeople = peopleCount * spec.material_rules.residential_air_per_person_m3h;
  const airByArea = totalArea * spec.material_rules.residential_air_per_area_m3h_m2;
  const airByVolume = volume * spec.material_rules.residential_min_air_change_per_h;
  const residentialAirflow = areaPerPerson > spec.material_rules.area_per_person_boundary_m2
    ? Math.max(airByPeople, airByVolume)
    : airByArea;
  const requiredAirflow = calculationMode === 0 ? residentialAirflow : projectAirflowM3h;

  const selectedFreeAreaM2 = ductShape === 0
    ? Math.PI * (roundDiameterMm / 1000) ** 2 / 4
    : (rectWidthMm / 1000) * (rectHeightMm / 1000);
  const actualVelocityMps = requiredAirflow / 3600 / selectedFreeAreaM2;
  const requiredFreeAreaM2 = requiredAirflow / 3600 / targetVelocityMps;
  const requiredRoundDiameterMm = Math.sqrt((4 * requiredFreeAreaM2) / Math.PI) * 1000;
  const selectedDuctCapacityM3h = selectedFreeAreaM2 * targetVelocityMps * 3600;
  const selectedFanMarginM3h = selectedFanCapacityM3h > 0
    ? selectedFanCapacityM3h - requiredAirflow
    : 0;

  const ductWithReserveM = ductLengthM * (1 + ductReservePercent / 100);
  const minStockCount = ductLengthM > 0 ? Math.ceil(ductLengthM / stockLengthM) : 0;
  const recStockCount = ductWithReserveM > 0 ? Math.ceil(ductWithReserveM / stockLengthM) : 0;
  const minPurchaseLengthM = minStockCount * stockLengthM;
  const recPurchaseLengthM = recStockCount * stockLengthM;

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const usesReserve = scenario !== "MIN";
    const exactNeed = usesReserve ? ductWithReserveM : ductLengthM;
    const packageCount = usesReserve ? recStockCount : minStockCount;
    const purchaseQuantity = usesReserve ? recPurchaseLengthM : minPurchaseLengthM;
    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: roundDisplay(purchaseQuantity, 6),
      leftover: roundDisplay(Math.max(0, purchaseQuantity - exactNeed), 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `calculation_mode:${calculationMode}`,
        `duct_shape:${ductShape}`,
        "no_hidden_reserve",
      ],
      key_factors: {
        explicit_reserve_percent: usesReserve ? roundDisplay(ductReservePercent, 3) : 0,
        field_multiplier: 1,
      },
      buy_plan: {
        package_label: `duct-stock-${roundDisplay(stockLengthM, 3)}m`,
        package_size: roundDisplay(stockLengthM, 6),
        packages_count: packageCount,
        unit: spec.packaging_rules.duct_unit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const materials: CanonicalMaterialResult[] = [];
  if (ductLengthM > 0) {
    const ductDescription = ductShape === 0
      ? `круглый ø${roundDisplay(roundDiameterMm, 1)} мм`
      : `прямоугольный ${roundDisplay(rectWidthMm, 1)}×${roundDisplay(rectHeightMm, 1)} мм`;
    materials.push({
      name: `Воздуховод ${ductDescription}`,
      subtitle: `Покупные отрезки по ${roundDisplay(stockLengthM, 2)} м; запас задан пользователем`,
      quantity: roundDisplay(ductLengthM, 6),
      unit: "м",
      withReserve: roundDisplay(ductWithReserveM, 6),
      purchaseQty: roundDisplay(recPurchaseLengthM, 6),
      category: "Воздуховоды",
      packageInfo: {
        count: recStockCount,
        size: roundDisplay(stockLengthM, 6),
        packageUnit: spec.packaging_rules.duct_unit,
      },
    });
  }
  addPieceMaterial(materials, "Фасонные элементы по проектной ведомости", fittingCount, "Фасонные элементы");
  addPieceMaterial(materials, "Воздухораспределители по проектной ведомости", airTerminalCount, "Распределение воздуха");
  addPieceMaterial(materials, "Хомуты и крепления по проектной ведомости", clampCount, "Крепёж");

  const warnings = [
    "Это предварительная проверка расхода и средней скорости, а не проект системы вентиляции.",
    "Калькулятор не определяет баланс притока и вытяжки кухни и санузлов, потери давления, местные сопротивления, утечки, шум и рабочую точку вентилятора.",
    "Противопожарные требования, дымоудаление, теплоизоляцию, защиту от конденсата, автоматику и электропитание проверяют отдельно.",
  ];
  if (calculationMode === 0) {
    warnings.push("Жилой режим оценивает минимальный наружный воздух для помещений с естественным проветриванием; вытяжные расходы и перетоки задают по планировке.");
  } else {
    warnings.push("В проектном режиме расход принят как готовое исходное значение и не проверен по назначению помещений.");
  }
  if (actualVelocityMps > targetVelocityMps) {
    warnings.push(`В выбранном сечении скорость ${roundDisplay(actualVelocityMps, 2)} м/с выше заданной цели ${roundDisplay(targetVelocityMps, 2)} м/с.`);
  }
  if (actualVelocityMps > spec.warnings_rules.velocity_attention_mps) {
    warnings.push("Скорость выше контрольного уровня требует отдельной проверки шума и потерь давления.");
  }
  if (requiredAirflow > spec.warnings_rules.professional_airflow_threshold_m3h) {
    warnings.push("Расход выше 2000 м³/ч требует профессионального аэродинамического расчёта системы.");
  }
  if (selectedFanCapacityM3h > 0) {
    warnings.push("Паспортная производительность вентилятора без характеристики сети не подтверждает фактический расход в рабочей точке.");
    if (selectedFanCapacityM3h < requiredAirflow) {
      warnings.push("Указанная паспортная производительность вентилятора ниже расчётного расхода.");
    }
  }
  if (ductLengthM === 0) {
    warnings.push("Закупка воздуховодов не рассчитана: внесите длину трассы из проекта или замера.");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      calculationMode,
      totalArea: roundDisplay(totalArea, 3),
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      peopleCount,
      roomVolume: roundDisplay(volume, 3),
      volume: roundDisplay(volume, 3),
      areaPerPerson: roundDisplay(areaPerPerson, 3),
      airByPeople: roundDisplay(airByPeople, 3),
      airByArea: roundDisplay(airByArea, 3),
      airByVolume: roundDisplay(airByVolume, 3),
      requiredAirflow: roundDisplay(requiredAirflow, 3),
      airflowRequired: roundDisplay(requiredAirflow, 3),
      requiredAirflowRounded: roundDisplay(requiredAirflow, 3),
      ductShape,
      selectedFreeAreaM2: roundDisplay(selectedFreeAreaM2, 6),
      actualVelocityMps: roundDisplay(actualVelocityMps, 3),
      airVelocity: roundDisplay(actualVelocityMps, 3),
      targetVelocityMps: roundDisplay(targetVelocityMps, 3),
      requiredFreeAreaM2: roundDisplay(requiredFreeAreaM2, 6),
      requiredRoundDiameterMm: roundDisplay(requiredRoundDiameterMm, 1),
      selectedDuctCapacityM3h: roundDisplay(selectedDuctCapacityM3h, 3),
      selectedFanCapacityM3h: roundDisplay(selectedFanCapacityM3h, 3),
      fanCapacity: roundDisplay(selectedFanCapacityM3h, 3),
      selectedFanMarginM3h: roundDisplay(selectedFanMarginM3h, 3),
      fanDiameter: ductShape === 0 ? roundDisplay(roundDiameterMm, 1) : 0,
      ductLengthM: roundDisplay(ductLengthM, 3),
      mainDuctLength: roundDisplay(ductLengthM, 3),
      ductWithReserveM: roundDisplay(ductWithReserveM, 3),
      ductReservePercent: roundDisplay(ductReservePercent, 3),
      stockLengthM: roundDisplay(stockLengthM, 3),
      ductSections: recStockCount,
      ductCoils: 0,
      fittings: fittingCount,
      fittingsCount: fittingCount,
      grilles: airTerminalCount,
      grillsCount: airTerminalCount,
      airTerminalCount,
      clamps: clampCount,
      silencer: 0,
      recuperatorCount: 0,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      "Сначала определите расчётный расход, затем проверьте выбранное сечение по скорости и только после этого считайте закупку по проектной трассе.",
      "MIN показывает проектную длину без запаса; REC и MAX используют только введённый запас и совпадают.",
      "Вентилятор, фасонные элементы и воздухораспределители не подбираются по площади: их параметры берут из аэродинамического расчёта и ведомости.",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: [
        "Режим точности не добавляет скрытых коэффициентов: результат определяется нормативным минимумом или проектным расходом, выбранным сечением и явным запасом длины.",
      ],
    },
  };
}
