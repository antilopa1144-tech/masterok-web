import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  HeatingCanonicalSpec,
} from "./canonical";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface HeatingInputs {
  /** Legacy v3 URL/input key; interpreted as an explicit preliminary area. */
  totalArea?: number;
  loadMode?: number;
  designHeatLoadW?: number;
  heatedAreaM2?: number;
  specificHeatLoadWm2?: number;
  deviceKind?: number;
  devicePowerMode?: number;
  deviceOutputAtDesignW?: number;
  nominalDeviceOutputW?: number;
  ratedDeltaTK?: number;
  supplyTempC?: number;
  returnTempC?: number;
  roomTempC?: number;
  temperatureExponent?: number;
  designReservePercent?: number;
  pipeLengthM?: number;
  pipeStockLengthM?: number;
  pipeReservePercent?: number;
  fittingCount?: number;
  bracketCount?: number;
  valveSetCount?: number;
  airVentCount?: number;
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

export function computeCanonicalHeating(
  spec: HeatingCanonicalSpec,
  inputs: HeatingInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const usesLegacyArea = inputs.loadMode === undefined
    && inputs.designHeatLoadW === undefined
    && inputs.totalArea !== undefined;
  const loadMode = whole(
    usesLegacyArea ? 1 : (inputs.loadMode ?? getInputDefault(spec, "loadMode", 0)),
    0,
    1,
  );
  const designHeatLoadW = clamp(
    inputs.designHeatLoadW ?? getInputDefault(spec, "designHeatLoadW", 8000),
    100,
    200000,
  );
  const heatedAreaM2 = clamp(
    inputs.heatedAreaM2 ?? (usesLegacyArea ? inputs.totalArea! : getInputDefault(spec, "heatedAreaM2", 80)),
    1,
    2000,
  );
  const specificHeatLoadWm2 = clamp(
    inputs.specificHeatLoadWm2 ?? getInputDefault(spec, "specificHeatLoadWm2", 100),
    10,
    500,
  );
  const deviceKind = whole(inputs.deviceKind ?? getInputDefault(spec, "deviceKind", 0), 0, 1);
  const devicePowerMode = whole(
    inputs.devicePowerMode ?? getInputDefault(spec, "devicePowerMode", 0),
    0,
    1,
  );
  const deviceOutputAtDesignW = clamp(
    inputs.deviceOutputAtDesignW ?? getInputDefault(spec, "deviceOutputAtDesignW", 180),
    10,
    50000,
  );
  const nominalDeviceOutputW = clamp(
    inputs.nominalDeviceOutputW ?? getInputDefault(spec, "nominalDeviceOutputW", 180),
    10,
    50000,
  );
  const ratedDeltaTK = clamp(
    inputs.ratedDeltaTK ?? getInputDefault(spec, "ratedDeltaTK", 50),
    10,
    100,
  );
  const supplyTempC = clamp(inputs.supplyTempC ?? getInputDefault(spec, "supplyTempC", 75), 20, 120);
  const returnTempC = clamp(inputs.returnTempC ?? getInputDefault(spec, "returnTempC", 65), 10, 110);
  const roomTempC = clamp(inputs.roomTempC ?? getInputDefault(spec, "roomTempC", 20), 5, 35);
  const temperatureExponent = clamp(
    inputs.temperatureExponent ?? getInputDefault(spec, "temperatureExponent", 1.3),
    1,
    2,
  );
  const designReservePercent = clamp(
    inputs.designReservePercent ?? getInputDefault(spec, "designReservePercent", 0),
    0,
    30,
  );
  const pipeLengthM = clamp(inputs.pipeLengthM ?? getInputDefault(spec, "pipeLengthM", 0), 0, 10000);
  const pipeStockLengthM = clamp(
    inputs.pipeStockLengthM ?? getInputDefault(spec, "pipeStockLengthM", 4),
    0.1,
    100,
  );
  const pipeReservePercent = clamp(
    inputs.pipeReservePercent ?? getInputDefault(spec, "pipeReservePercent", 0),
    0,
    30,
  );
  const fittingCount = whole(inputs.fittingCount ?? getInputDefault(spec, "fittingCount", 0), 0, 10000);
  const bracketCount = whole(inputs.bracketCount ?? getInputDefault(spec, "bracketCount", 0), 0, 10000);
  const valveSetCount = whole(inputs.valveSetCount ?? getInputDefault(spec, "valveSetCount", 0), 0, 10000);
  const airVentCount = whole(inputs.airVentCount ?? getInputDefault(spec, "airVentCount", 0), 0, 10000);

  const preliminaryHeatLoadW = heatedAreaM2 * specificHeatLoadWm2;
  const heatLoadW = loadMode === 0 ? designHeatLoadW : preliminaryHeatLoadW;
  const meanWaterTempC = (supplyTempC + returnTempC) / 2;
  const rawDesignDeltaTK = meanWaterTempC - roomTempC;
  const designDeltaTK = Math.max(1, rawDesignDeltaTK);
  const temperatureRatio = designDeltaTK / ratedDeltaTK;
  const correctedDeviceOutputW = nominalDeviceOutputW * temperatureRatio ** temperatureExponent;
  const effectiveDeviceOutputW = devicePowerMode === 0
    ? deviceOutputAtDesignW
    : correctedDeviceOutputW;

  const heatLoadWithReserveW = heatLoadW * (1 + designReservePercent / 100);
  const minExactUnits = heatLoadW / effectiveDeviceOutputW;
  const recExactUnits = heatLoadWithReserveW / effectiveDeviceOutputW;
  const minPurchaseUnits = Math.ceil(minExactUnits);
  const recPurchaseUnits = Math.ceil(recExactUnits);
  const primaryUnit = deviceKind === 0
    ? spec.packaging_rules.section_unit
    : spec.packaging_rules.device_unit;

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const usesReserve = scenario !== "MIN";
    const exactNeed = usesReserve ? recExactUnits : minExactUnits;
    const purchaseQuantity = usesReserve ? recPurchaseUnits : minPurchaseUnits;
    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: purchaseQuantity,
      leftover: roundDisplay(Math.max(0, purchaseQuantity - exactNeed), 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `load_mode:${loadMode}`,
        `device_kind:${deviceKind}`,
        `device_power_mode:${devicePowerMode}`,
        "room_or_independent_zone",
        "no_hidden_reserve",
      ],
      key_factors: {
        explicit_reserve_percent: usesReserve ? roundDisplay(designReservePercent, 3) : 0,
        field_multiplier: 1,
      },
      buy_plan: {
        package_label: deviceKind === 0 ? "radiator-section" : "heating-device",
        package_size: 1,
        packages_count: purchaseQuantity,
        unit: primaryUnit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const materials: CanonicalMaterialResult[] = [
    {
      name: deviceKind === 0 ? "Секции выбранного радиатора" : "Выбранный отопительный прибор",
      subtitle: devicePowerMode === 0
        ? "Теплоотдача одной единицы введена для расчётного температурного режима"
        : "Теплоотдача пересчитана по паспортному температурному напору и показателю n изготовителя",
      quantity: roundDisplay(minExactUnits, 6),
      unit: primaryUnit,
      withReserve: roundDisplay(recExactUnits, 6),
      purchaseQty: recPurchaseUnits,
      category: "Отопительные приборы",
      packageInfo: {
        count: recPurchaseUnits,
        size: 1,
        packageUnit: primaryUnit,
      },
    },
  ];

  const pipeWithReserveM = pipeLengthM * (1 + pipeReservePercent / 100);
  const pipeStockCount = pipeLengthM > 0 ? Math.ceil(pipeWithReserveM / pipeStockLengthM) : 0;
  const pipePurchaseLengthM = pipeStockCount * pipeStockLengthM;
  if (pipeLengthM > 0) {
    materials.push({
      name: "Труба отопления по проектной ведомости",
      subtitle: `Покупные отрезки по ${roundDisplay(pipeStockLengthM, 2)} м; материал и диаметр задаёт проект`,
      quantity: roundDisplay(pipeLengthM, 6),
      unit: "м",
      withReserve: roundDisplay(pipeWithReserveM, 6),
      purchaseQty: roundDisplay(pipePurchaseLengthM, 6),
      category: "Трубопровод",
      packageInfo: {
        count: pipeStockCount,
        size: roundDisplay(pipeStockLengthM, 6),
        packageUnit: spec.packaging_rules.pipe_unit,
      },
    });
  }
  addPieceMaterial(materials, "Фитинги по проектной ведомости", fittingCount, "Трубопровод");
  addPieceMaterial(materials, "Кронштейны по паспорту и ведомости", bracketCount, "Монтаж");
  addPieceMaterial(materials, "Комплекты регулирующей и запорной арматуры", valveSetCount, "Арматура");
  addPieceMaterial(materials, "Воздухоотводчики по ведомости", airVentCount, "Арматура");

  const warnings = [
    "Подбор выполняют для одного помещения или одной независимо рассчитанной зоны: общую мощность здания нельзя равномерно делить между комнатами.",
    "Калькулятор не определяет теплопотери через ограждения, вентиляцию и инфильтрацию, а также не проверяет климатические исходные данные.",
    "Гидравлический расчёт, расход теплоносителя, диаметры труб, потери давления, балансировка, источник тепла, автоматика и схема подключения не рассчитываются.",
  ];
  if (loadMode === 1) {
    warnings.push("Режим Вт/м² — предварительная сметная оценка по явно введённой удельной нагрузке, а не нормативный расчёт теплопотерь.");
  } else {
    warnings.push("Тепловая нагрузка принята как готовое проектное значение и не проверена калькулятором.");
  }
  if (devicePowerMode === 0) {
    warnings.push("Проверьте, что паспортная теплоотдача указана именно для расчётных температур подачи, обратки, помещения, расхода и схемы подключения.");
  } else {
    warnings.push("Показатель степени n и исходный температурный напор берут из протокола испытаний или документации конкретной модели.");
    if (supplyTempC <= returnTempC || rawDesignDeltaTK <= 0) {
      warnings.push("Температуры заданы некорректно: подача должна быть выше обратки, а средняя температура воды — выше температуры помещения.");
    }
    if (temperatureRatio < spec.warnings_rules.low_temperature_ratio) {
      warnings.push("Расчётный температурный напор значительно ниже паспортного; теплоотдача прибора сильно уменьшится.");
    }
    if (temperatureRatio > spec.warnings_rules.high_temperature_ratio) {
      warnings.push("Расчётный температурный напор заметно выше паспортного; проверьте допустимый режим прибора и системы.");
    }
  }
  if (designReservePercent > 0) {
    warnings.push(`Применён только явно заданный запас мощности ${roundDisplay(designReservePercent, 1)}%; дополнительного скрытого запаса нет.`);
  }
  if (pipeLengthM === 0 && fittingCount === 0 && bracketCount === 0 && valveSetCount === 0 && airVentCount === 0) {
    warnings.push("Сопутствующая закупка не рассчитана: внесите длину труб и штучные позиции из проектной ведомости.");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      loadMode,
      designHeatLoadW: roundDisplay(designHeatLoadW, 1),
      heatedAreaM2: roundDisplay(heatedAreaM2, 3),
      specificHeatLoadWm2: roundDisplay(specificHeatLoadWm2, 3),
      preliminaryHeatLoadW: roundDisplay(preliminaryHeatLoadW, 1),
      totalPowerW: roundDisplay(heatLoadW, 1),
      totalPowerKW: roundDisplay(heatLoadW / 1000, 3),
      heatLoadW: roundDisplay(heatLoadW, 1),
      heatLoadWithReserveW: roundDisplay(heatLoadWithReserveW, 1),
      deviceKind,
      devicePowerMode,
      deviceOutputAtDesignW: roundDisplay(deviceOutputAtDesignW, 3),
      nominalDeviceOutputW: roundDisplay(nominalDeviceOutputW, 3),
      ratedDeltaTK: roundDisplay(ratedDeltaTK, 3),
      supplyTempC: roundDisplay(supplyTempC, 3),
      returnTempC: roundDisplay(returnTempC, 3),
      roomTempC: roundDisplay(roomTempC, 3),
      meanWaterTempC: roundDisplay(meanWaterTempC, 3),
      designDeltaTK: roundDisplay(designDeltaTK, 3),
      temperatureRatio: roundDisplay(temperatureRatio, 6),
      temperatureExponent: roundDisplay(temperatureExponent, 3),
      correctedDeviceOutputW: roundDisplay(correctedDeviceOutputW, 3),
      effectiveDeviceOutputW: roundDisplay(effectiveDeviceOutputW, 3),
      wattPerUnit: roundDisplay(effectiveDeviceOutputW, 3),
      designReservePercent: roundDisplay(designReservePercent, 3),
      exactUnits: roundDisplay(recExactUnits, 6),
      totalUnits: recPurchaseUnits,
      radiatorCount: recPurchaseUnits,
      pipeLengthM: roundDisplay(pipeLengthM, 3),
      pipeWithReserveM: roundDisplay(pipeWithReserveM, 3),
      pipeStockLengthM: roundDisplay(pipeStockLengthM, 3),
      pipeSticks: pipeStockCount,
      pipePurchaseLengthM: roundDisplay(pipePurchaseLengthM, 3),
      fittings: fittingCount,
      brackets: bracketCount,
      thermoHeads: valveSetCount,
      mayevskyValves: airVentCount,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      "Считайте каждое помещение отдельно по его проектной тепловой нагрузке, затем подбирайте прибор под окно и доступный монтажный габарит.",
      "MIN показывает нагрузку без дополнительного запаса; REC и MAX используют только введённый проектный запас и совпадают.",
      "Если паспорт даёт мощность только при другом температурном напоре, используйте степенной пересчёт и показатель n именно для выбранной модели.",
      "Трубы, арматуру и крепления покупайте по схеме и ведомости: количество радиаторов само по себе не задаёт трассу и узлы подключения.",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: [
        "Режим точности не меняет тепловую нагрузку и не добавляет скрытых коэффициентов; учитывается только явный проектный запас.",
      ],
    },
  };
}
