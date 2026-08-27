import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type { FenceCanonicalSpec, CanonicalCalculatorResult, CanonicalMaterialResult } from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, ACCURACY_MODE_LABELS } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import type { FactorTable } from "./factors";

const FENCE_TYPE_LABELS: Record<number, string> = {
  0: "Профнастил",
  1: "Сетка-рабица",
  2: "Деревянный штакетник",
};

interface FenceInputs {
  fenceLength?: number;
  fenceHeight?: number;
  fenceType?: number;
  postStep?: number;
  gatesCount?: number;
  wicketsCount?: number;
  sheetWorkingWidthMm?: number;
  coverReservePercent?: number;
  screwsPerSheet?: number;
  screwReservePercent?: number;
  screwPackCount?: number;
  accuracyMode?: AccuracyMode;
}

const multiplier = (percent: number) => 1 + percent / 100;

export function computeCanonicalFence(
  spec: FenceCanonicalSpec,
  inputs: FenceInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const rules = spec.material_rules;
  const fenceLength = Math.max(5, Math.min(500, inputs.fenceLength ?? getInputDefault(spec, "fenceLength", 50)));
  const fenceHeight = Math.max(1, Math.min(3, inputs.fenceHeight ?? getInputDefault(spec, "fenceHeight", 2)));
  const fenceType = Math.max(0, Math.min(2, Math.round(inputs.fenceType ?? getInputDefault(spec, "fenceType", 0))));
  const postStep = Math.max(2, Math.min(3, inputs.postStep ?? getInputDefault(spec, "postStep", 2.5)));
  const gatesCount = Math.max(0, Math.min(5, Math.round(inputs.gatesCount ?? getInputDefault(spec, "gatesCount", 1))));
  const wicketsCount = Math.max(0, Math.min(5, Math.round(inputs.wicketsCount ?? getInputDefault(spec, "wicketsCount", 1))));
  const sheetWorkingWidthMm = Math.max(500, Math.min(1500, inputs.sheetWorkingWidthMm ?? getInputDefault(spec, "sheetWorkingWidthMm", 1150)));
  const coverReservePercent = Math.max(0, inputs.coverReservePercent ?? getInputDefault(spec, "coverReservePercent", 0));
  const screwsPerSheet = Math.max(0, inputs.screwsPerSheet ?? getInputDefault(spec, "screwsPerSheet", 6));
  const screwReservePercent = Math.max(0, inputs.screwReservePercent ?? getInputDefault(spec, "screwReservePercent", 5));
  const screwPackCount = Math.max(1, Math.round(inputs.screwPackCount ?? getInputDefault(spec, "screwPackCount", 200)));
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const netLength = Math.max(1, fenceLength - gatesCount * rules.gate_width - wicketsCount * rules.wicket_width);
  const postsCount = Math.ceil(netLength / postStep) + 1 + gatesCount * 2 + wicketsCount * 2;
  const lagsPerSpan = fenceHeight > 2 ? 3 : 2;
  const lagSpans = Math.ceil(netLength / postStep);
  const lagsCount = lagSpans * lagsPerSpan;
  const postLength = roundDisplay(fenceHeight + rules.post_burial_m, 2);
  const concrete = roundDisplay(postsCount * rules.post_concrete_m3, 3);
  const caps = Math.ceil(postsCount * rules.caps_reserve);

  const sheetWorkingWidthM = sheetWorkingWidthMm / 1000;
  const sheetExactNeed = netLength / sheetWorkingWidthM;
  const rabicaExactNeed = netLength / rules.rabica_roll_m;
  const slatExactNeed = netLength / (rules.slat_width + rules.slat_gap);
  const baseCoverExact = fenceType === 0 ? sheetExactNeed : fenceType === 1 ? rabicaExactNeed : slatExactNeed;
  const packageUnit = fenceType === 0 ? "шт" : fenceType === 1 ? "рулонов" : "шт";
  const packageLabel = fenceType === 0 ? "profnastil-sheet" : fenceType === 1 ? "rabica-roll" : "wooden-slat";
  const packageOptions = [{ size: 1, label: packageLabel, unit: packageUnit }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? coverReservePercent + rules.max_extra_cover_percent
        : coverReservePercent;
    const exactNeed = roundDisplay(baseCoverExact * multiplier(reservePercent), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: packaging.purchaseQuantity,
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `fence_type:${fenceType}`,
        `working_width_mm:${sheetWorkingWidthMm}`,
        "scenario_policy:explicit_cover_reserve",
      ],
      key_factors: {
        field_multiplier: roundDisplay(multiplier(reservePercent), 6),
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
  const sheets = fenceType === 0 ? recScenario.purchase_quantity : 0;
  const screwsBaseCount = fenceType === 0 ? sheets * screwsPerSheet : 0;
  const screwsWithReserve = screwsBaseCount * multiplier(screwReservePercent);
  const screwPacks = screwsWithReserve > 0 ? Math.ceil(screwsWithReserve / screwPackCount) : 0;
  const screwsPurchase = screwPacks * screwPackCount;
  const primerCans = fenceType === 0 ? Math.ceil(fenceLength / rules.primer_spray_m_per_can) : 0;
  const rolls = fenceType === 1 ? recScenario.purchase_quantity : 0;
  const wireLength = fenceType === 1 ? netLength * lagsPerSpan * rules.tension_wire_reserve : 0;
  const slats = fenceType === 2 ? recScenario.purchase_quantity : 0;
  const antisepticBaseL = fenceType === 2 ? netLength * fenceHeight * 2 * rules.antiseptic_l_per_m2 : 0;
  const antisepticCans = antisepticBaseL > 0 ? Math.ceil(antisepticBaseL / rules.antiseptic_can_l) : 0;

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Столбы выбранной системы (${postLength} м)`,
      subtitle: "Сечение и способ установки определяют по проекту, грунту, высоте и ветровой нагрузке",
      quantity: postsCount,
      unit: "шт",
      withReserve: postsCount,
      purchaseQty: postsCount,
      category: "Каркас",
    },
    {
      name: "Поперечные лаги выбранной системы",
      subtitle: `${lagsPerSpan} ряда; длину хлыста и дополнительные элементы у ворот укажите в смете отдельно`,
      quantity: lagsCount,
      unit: "пролётов",
      withReserve: lagsCount,
      purchaseQty: lagsCount,
      category: "Каркас",
    },
  ];

  if (fenceType === 0) {
    const sheetExactNeedLabel = roundDisplay(sheetExactNeed, 2).toString().replace(".", ",");
    materials.push({
      name: `${FENCE_TYPE_LABELS[0]}, рабочая ширина ${roundDisplay(sheetWorkingWidthMm, 0)} мм (${fenceHeight} м)`,
      subtitle: `Точная потребность ${sheetExactNeedLabel} листа до запаса и округления. Рабочая ширина уже учитывает боковой нахлёст; не используйте вместо неё габаритную ширину листа`,
      quantity: roundDisplay(sheetExactNeed, 6),
      unit: "шт",
      withReserve: recScenario.exact_need,
      purchaseQty: recScenario.purchase_quantity,
      category: "Покрытие",
      packageInfo: { count: recScenario.buy_plan.packages_count, size: 1, packageUnit: "листов" },
    });
    if (screwsBaseCount > 0) {
      materials.push({
        name: "Саморезы для профлиста",
        subtitle: `${roundDisplay(screwsPerSheet, 2)} шт. на купленный лист — значение из монтажной схемы; фасовка ${screwPackCount} шт.`,
        quantity: roundDisplay(screwsBaseCount, 6),
        unit: "шт",
        withReserve: roundDisplay(screwsWithReserve, 6),
        purchaseQty: screwsPurchase,
        category: "Крепёж",
        packageInfo: { count: screwPacks, size: screwPackCount, packageUnit: "упаковок" },
      });
    }
    materials.push({
      name: "Грунт-спрей для срезов",
      quantity: primerCans,
      unit: "баллонов",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Защита",
    });
  } else if (fenceType === 1) {
    materials.push(
      {
        name: `${FENCE_TYPE_LABELS[1]} (${fenceHeight} м, рулон ${rules.rabica_roll_m} м)`,
        quantity: roundDisplay(rabicaExactNeed, 6),
        unit: "рулонов",
        withReserve: recScenario.exact_need,
        purchaseQty: recScenario.purchase_quantity,
        category: "Покрытие",
        packageInfo: { count: recScenario.buy_plan.packages_count, size: 1, packageUnit: "рулонов" },
      },
      {
        name: "Проволока натяжная",
        quantity: roundDisplay(wireLength / rules.tension_wire_reserve, 6),
        unit: "м",
        withReserve: roundDisplay(wireLength, 6),
        purchaseQty: Math.ceil(wireLength),
        category: "Крепёж",
      },
    );
  } else {
    materials.push(
      {
        name: `${FENCE_TYPE_LABELS[2]} (${fenceHeight} м)`,
        quantity: roundDisplay(slatExactNeed, 6),
        unit: "шт",
        withReserve: recScenario.exact_need,
        purchaseQty: recScenario.purchase_quantity,
        category: "Покрытие",
        packageInfo: { count: recScenario.buy_plan.packages_count, size: 1, packageUnit: "штакетин" },
      },
      {
        name: `Антисептик (${rules.antiseptic_can_l} л)`,
        quantity: roundDisplay(antisepticBaseL, 6),
        unit: "л",
        withReserve: roundDisplay(antisepticBaseL, 6),
        purchaseQty: antisepticCans * rules.antiseptic_can_l,
        category: "Защита",
        packageInfo: { count: antisepticCans, size: rules.antiseptic_can_l, packageUnit: "канистр" },
      },
    );
  }

  materials.push(
    {
      name: "Бетон для столбов",
      subtitle: "Объём 0,03 м³ на опору — предварительное допущение текущей модели, не проект фундамента",
      quantity: concrete,
      unit: "м³",
      withReserve: concrete,
      purchaseQty: Math.ceil(concrete * 10) / 10,
      category: "Бетон",
    },
    {
      name: "Заглушки для столбов",
      quantity: postsCount,
      unit: "шт",
      withReserve: caps,
      purchaseQty: caps,
      category: "Каркас",
    },
  );

  const warnings: string[] = [];
  if (gatesCount > 0) warnings.push("При наличии ворот нужны отдельный расчёт усиленных опор, фундамента и закладных");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      fenceLength: roundDisplay(fenceLength, 3),
      fenceHeight: roundDisplay(fenceHeight, 3),
      fenceType,
      postStep: roundDisplay(postStep, 2),
      gatesCount,
      wicketsCount,
      netLength: roundDisplay(netLength, 3),
      postsCount,
      lagsPerSpan,
      lagSpans,
      lagsCount,
      postLength,
      concrete,
      caps,
      sheetWorkingWidthMm: roundDisplay(sheetWorkingWidthMm, 0),
      sheetExactNeed: roundDisplay(sheetExactNeed, 6),
      coverReservePercent: roundDisplay(coverReservePercent, 3),
      sheets,
      screwsPerSheet: roundDisplay(screwsPerSheet, 3),
      screws: roundDisplay(screwsWithReserve, 6),
      screwPacks,
      screwsPurchase,
      primerCans,
      rolls,
      wireLength: roundDisplay(wireLength, 6),
      slats,
      antisepticCans,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: ["Режим точности не добавляет скрытый запас: покрытие считается по рабочей ширине и явному проценту"],
    },
    warnings,
    practicalNotes: [
      "Рабочая ширина профлиста уже учитывает нахлёст и берётся из паспорта конкретного профиля",
      "Запас покрытия применяется один раз до округления до целых листов, рулонов или штакетин",
      "Глубина опор, сечения столбов и лаг, фундамент и ветровую устойчивость определяют отдельным проектом",
    ],
    scenarios,
  };
}
