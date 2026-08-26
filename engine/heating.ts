import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  HeatingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { ACCURACY_MODE_LABELS, type AccuracyMode, DEFAULT_ACCURACY_MODE } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface HeatingInputs {
  totalArea?: number;
  ceilingHeight?: number;
  climateZone?: number;
  buildingType?: number;
  radiatorType?: number;
  roomCount?: number;
  accuracyMode?: AccuracyMode;
}

const RADIATOR_NAMES: Record<number, string> = {
  0: "Биметаллический радиатор, секция 180 Вт",
  1: "Алюминиевый радиатор, секция 200 Вт",
  2: "Чугунный радиатор, 7 секций, 700 Вт",
  3: "Стальной панельный радиатор тип 22, 700 Вт",
};

/* ─── main ─── */

export function computeCanonicalHeating(
  spec: HeatingCanonicalSpec,
  inputs: HeatingInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const totalArea = Math.max(10, Math.min(500, inputs.totalArea ?? getInputDefault(spec, "totalArea", 80)));
  const ceilingHeightInput = inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7);
  // Старые URL и форма до v2 передавали высоту в сантиметрах (270), хотя
  // canonical-спека всегда описывала метры (2.7). Поддерживаем оба формата.
  const ceilingHeightM = ceilingHeightInput > 10 ? ceilingHeightInput / 100 : ceilingHeightInput;
  const ceilingHeight = Math.max(2.5, Math.min(3.5, ceilingHeightM));
  const climateZone = Math.max(0, Math.min(3, Math.round(inputs.climateZone ?? getInputDefault(spec, "climateZone", 1))));
  const buildingType = Math.max(0, Math.min(3, Math.round(inputs.buildingType ?? getInputDefault(spec, "buildingType", 1))));
  const radiatorType = Math.max(0, Math.min(3, Math.round(inputs.radiatorType ?? getInputDefault(spec, "radiatorType", 0))));
  const roomCount = Math.max(1, Math.min(20, Math.round(inputs.roomCount ?? getInputDefault(spec, "roomCount", 4))));

  /* ─── power calculation ─── */
  const heightM = ceilingHeight;
  const heightCoeff = heightM / 2.7;
  const totalPowerW = totalArea
    * spec.material_rules.power_per_m2_base[climateZone]
    * spec.material_rules.building_coeff[buildingType]
    * heightCoeff;
  const totalPowerKW = Math.round(totalPowerW / 100) / 10;

  /* ─── radiator calculation ─── */
  const wattPerUnit = spec.material_rules.radiator_power[radiatorType];
  const exactUnits = totalPowerW / wattPerUnit;
  const totalUnits = Math.ceil(exactUnits);
  const radiatorCount = radiatorType <= 1 ? roomCount : totalUnits;

  /* ─── piping ─── */
  const pipeSticks = Math.ceil(
    roomCount
      * spec.material_rules.pipe_rate
      * spec.material_rules.pipe_reserve
      / spec.material_rules.pp_pipe_stick_m,
  );
  const fittings = Math.ceil(
    radiatorCount * spec.material_rules.fittings_per_room * spec.material_rules.fittings_reserve,
  );
  const brackets = Math.ceil(
    radiatorCount * spec.material_rules.brackets_per_room * spec.material_rules.brackets_reserve,
  );
  const thermoHeads = radiatorCount;
  const mayevskyValves = radiatorCount;

  /* ─── materials ─── */
  const radiatorLabel = RADIATOR_NAMES[radiatorType] ?? "Отопительный прибор";
  const materials: CanonicalMaterialResult[] = [
    {
      name: radiatorLabel,
      subtitle: "Точная потребность рассчитана по номинальной мощности, к покупке округлена вверх до целой секции или прибора. Перед покупкой подставьте паспортную теплоотдачу выбранной модели при температурном режиме вашей системы.",
      quantity: roundDisplay(exactUnits, 6),
      unit: radiatorType <= 1 ? "секций" : "шт",
      withReserve: roundDisplay(exactUnits, 6),
      purchaseQty: totalUnits,
      category: "Отопление",
    },
    {
      name: `Армированная труба PP-R Ø25 мм, отрезок ${spec.material_rules.pp_pipe_stick_m} м`,
      subtitle: `Предварительно по ${spec.material_rules.pipe_rate} м на помещение с запасом ${Math.round((spec.material_rules.pipe_reserve - 1) * 100)}%. Диаметр и фактическую длину уточняют по схеме разводки и гидравлическому расчёту.`,
      quantity: pipeSticks,
      unit: "шт",
      withReserve: pipeSticks,
      purchaseQty: pipeSticks,
      category: "Трубопровод",
    },
    {
      name: "Фитинги PP-R Ø25 мм для обвязки радиаторов",
      subtitle: "Предварительный комплект: муфты, углы и переходы. Точный состав зависит от трассы и типа подключения.",
      quantity: fittings,
      unit: "шт",
      withReserve: fittings,
      purchaseQty: fittings,
      category: "Трубопровод",
    },
    {
      name: radiatorType <= 1 ? "Кронштейны для секционного радиатора" : "Кронштейны для выбранного отопительного прибора",
      subtitle: "Проверьте комплектацию радиатора: у некоторых моделей крепления уже входят в поставку.",
      quantity: brackets,
      unit: "шт",
      withReserve: brackets,
      purchaseQty: brackets,
      category: "Монтаж",
    },
    {
      name: "Термостатический радиаторный клапан с термоголовкой",
      subtitle: "По одному комплекту на каждый рассчитанный отопительный прибор.",
      quantity: thermoHeads,
      unit: "шт",
      withReserve: thermoHeads,
      purchaseQty: thermoHeads,
      category: "Регулировка",
    },
    {
      name: "Ручной воздухоотводчик (кран Маевского) 1/2″",
      subtitle: "Резьбу и наличие в комплекте сверяйте с паспортом радиатора.",
      quantity: mayevskyValves,
      unit: "шт",
      withReserve: mayevskyValves,
      purchaseQty: mayevskyValves,
      category: "Арматура",
    },
  ];

  /* ─── scenarios ─── */
  const primaryUnit = radiatorType <= 1 ? "секций" : "шт";
  const packageOptions = [{ size: 1, label: "отопительный прибор", unit: primaryUnit }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const exactNeed = roundDisplay(exactUnits, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `climateZone:${climateZone}`,
        `buildingType:${buildingType}`,
        `radiatorType:${radiatorType}`,
        "scenario_policy:deterministic_heat_load",
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        field_multiplier: 1,
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

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (totalPowerKW > spec.warnings_rules.gas_boiler_power_threshold_kw) {
    warnings.push(`Расчётная мощность выше ${spec.warnings_rules.gas_boiler_power_threshold_kw} кВт. Тип и мощность источника тепла подбирают по расчёту теплопотерь и нагрузке горячего водоснабжения`);
  }
  if (buildingType === 3 && climateZone >= 2) {
    warnings.push("Слабая изоляция + холодная зона — рекомендуется профессиональный теплотехнический расчёт");
  }


  const practicalNotes: string[] = [];
  if (totalPowerKW > 20) {
    practicalNotes.push(`Мощность ${totalPowerKW} кВт — предварительная оценка. Не выбирайте котёл только по этой цифре без расчёта теплопотерь`);
  }
  practicalNotes.push("Распределите мощность по комнатам и окнам: общий итог калькулятора не заменяет подбор каждого радиатора по помещению");
  practicalNotes.push("MIN, REC и MAX совпадают: отходы, подрезка и навык монтажа не меняют требуемую тепловую мощность");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      totalArea: roundDisplay(totalArea, 3),
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      climateZone,
      buildingType,
      radiatorType,
      roomCount,
      heightCoeff: roundDisplay(heightCoeff, 4),
      totalPowerW: roundDisplay(totalPowerW, 1),
      totalPowerKW,
      wattPerUnit,
      exactUnits: roundDisplay(exactUnits, 6),
      totalUnits,
      radiatorCount,
      pipeSticks,
      fittings,
      brackets,
      thermoHeads,
      mayevskyValves,
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
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: ["Режим точности не добавляет скрытый запас к тепловой мощности; условия здания задаются отдельными параметрами"],
    },
  };
}
