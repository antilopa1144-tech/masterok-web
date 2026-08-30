import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WarmFloorCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { getInputDefault } from "./spec-helpers";

interface WarmFloorInputs {
  roomAreaM2?: number;
  excludedAreaM2?: number;
  layoutAreaM2?: number;
  systemType?: number;
  kitCount?: number;
  kitCoverageAreaM2?: number;
  kitRatedPowerW?: number;
  cableLengthPerKitM?: number;
  designHeatLoadW?: number;
  supplyVoltageV?: number;
  thermostatRatedCurrentA?: number;
  thermostatCount?: number;
  floorSensorCount?: number;
  sensorConduitLengthM?: number;
  sensorConduitStockLengthM?: number;
  // Legacy web query aliases from canonical v2.
  roomArea?: number;
  furnitureArea?: number;
  heatingType?: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const whole = (value: number, min: number, max: number) => Math.round(clamp(value, min, max));

function addPieceMaterial(
  materials: CanonicalMaterialResult[],
  name: string,
  count: number,
  category: string,
) {
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

function movedWaterResult(spec: WarmFloorCanonicalSpec, roomArea: number): CanonicalCalculatorResult {
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    acc[scenario] = {
      exact_need: 0,
      purchase_quantity: 0,
      leftover: 0,
      assumptions: [
        `formula_version:${spec.formula_version}`,
        "legacy_water_mode:moved_to_warm-floor-pipes",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: "water-floor-moved",
        package_size: 1,
        packages_count: 0,
        unit: "шт",
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: [],
    totals: {
      roomArea: roundDisplay(roomArea, 3),
      heatingArea: 0,
      systemType: 2,
      kitCount: 0,
      totalPowerW: 0,
      totalPowerKW: 0,
      circuitCurrentA: 0,
      legacyWaterMode: 1,
    },
    warnings: [
      "Водяной тёплый пол перенесён в отдельный калькулятор: здесь рассчитываются только электрические заводские комплекты.",
    ],
    practicalNotes: [
      "Откройте калькулятор «Водяной тёплый пол» — он отдельно считает трубы и контуры и не смешивает их с электрической нагрузкой.",
    ],
    scenarios,
  };
}

export function computeCanonicalWarmFloor(
  spec: WarmFloorCanonicalSpec,
  inputs: WarmFloorInputs,
): CanonicalCalculatorResult {
  const rawRoomArea = inputs.roomAreaM2 ?? inputs.roomArea ?? getInputDefault(spec, "roomAreaM2", 10);
  const roomArea = clamp(rawRoomArea, 1, 500);
  if (Math.round(inputs.heatingType ?? -1) === 2 && inputs.systemType == null) {
    return movedWaterResult(spec, roomArea);
  }

  const rawExcludedArea = inputs.excludedAreaM2
    ?? inputs.furnitureArea
    ?? getInputDefault(spec, "excludedAreaM2", 2);
  const excludedArea = clamp(rawExcludedArea, 0, roomArea);
  const availableArea = Math.max(0, roomArea - excludedArea);
  const rawLayoutArea = inputs.layoutAreaM2 ?? getInputDefault(spec, "layoutAreaM2", 8);
  const layoutArea = Math.min(clamp(rawLayoutArea, 0.1, 500), availableArea);
  const legacySystemType = Math.round(inputs.heatingType ?? 0) === 1 ? 1 : 0;
  const systemType = whole(
    inputs.systemType ?? legacySystemType ?? getInputDefault(spec, "systemType", 0),
    0,
    1,
  );
  const kitCount = whole(inputs.kitCount ?? getInputDefault(spec, "kitCount", 1), 1, 100);
  const kitCoverageAreaM2 = clamp(
    inputs.kitCoverageAreaM2 ?? getInputDefault(spec, "kitCoverageAreaM2", 8),
    0.1,
    500,
  );
  const kitRatedPowerW = clamp(
    inputs.kitRatedPowerW ?? getInputDefault(spec, "kitRatedPowerW", 1200),
    10,
    50000,
  );
  const cableLengthPerKitM = clamp(
    inputs.cableLengthPerKitM ?? getInputDefault(spec, "cableLengthPerKitM", 60),
    0.1,
    5000,
  );
  const designHeatLoadW = clamp(
    inputs.designHeatLoadW ?? getInputDefault(spec, "designHeatLoadW", 0),
    0,
    500000,
  );
  const supplyVoltageV = clamp(
    inputs.supplyVoltageV ?? getInputDefault(spec, "supplyVoltageV", 230),
    100,
    500,
  );
  const thermostatRatedCurrentA = clamp(
    inputs.thermostatRatedCurrentA ?? getInputDefault(spec, "thermostatRatedCurrentA", 0),
    0,
    100,
  );
  const thermostatCount = whole(
    inputs.thermostatCount ?? getInputDefault(spec, "thermostatCount", 0),
    0,
    100,
  );
  const floorSensorCount = whole(
    inputs.floorSensorCount ?? getInputDefault(spec, "floorSensorCount", 0),
    0,
    100,
  );
  const sensorConduitLengthM = clamp(
    inputs.sensorConduitLengthM ?? getInputDefault(spec, "sensorConduitLengthM", 0),
    0,
    1000,
  );
  const sensorConduitStockLengthM = clamp(
    inputs.sensorConduitStockLengthM ?? getInputDefault(spec, "sensorConduitStockLengthM", 1),
    0.1,
    100,
  );

  const selectedCoverageAreaM2 = kitCount * kitCoverageAreaM2;
  const totalPowerW = kitCount * kitRatedPowerW;
  const totalCableLengthM = systemType === 1 ? kitCount * cableLengthPerKitM : 0;
  const installedPowerDensityWm2 = layoutArea > 0 ? totalPowerW / layoutArea : 0;
  const circuitCurrentA = totalPowerW / supplyVoltageV;
  const thermostatLoadPercent = thermostatRatedCurrentA > 0
    ? circuitCurrentA / thermostatRatedCurrentA * 100
    : 0;
  const cableStepMm = totalCableLengthM > 0 ? layoutArea / totalCableLengthM * 1000 : 0;
  const designPowerMarginW = designHeatLoadW > 0 ? totalPowerW - designHeatLoadW : 0;

  const materials: CanonicalMaterialResult[] = [
    {
      name: systemType === 0
        ? "Выбранный заводской комплект нагревательного мата"
        : "Выбранный заводской комплект нагревательного кабеля",
      subtitle: systemType === 0
        ? "Сверьте площадь и мощность каждого комплекта с паспортом; мат нельзя накладывать сам на себя, а греющий кабель — резать"
        : "Длина и мощность взяты из паспорта выбранного комплекта; нагревательный кабель нельзя укорачивать или наращивать",
      quantity: kitCount,
      unit: spec.packaging_rules.kit_unit,
      withReserve: kitCount,
      purchaseQty: kitCount,
      packageInfo: { count: kitCount, size: 1, packageUnit: spec.packaging_rules.kit_unit },
      category: "Основное",
    },
  ];
  addPieceMaterial(materials, "Терморегулятор по проектной ведомости", thermostatCount, "Управление");
  addPieceMaterial(materials, "Датчик температуры пола по проектной ведомости", floorSensorCount, "Управление");

  const conduitStockCount = sensorConduitLengthM > 0
    ? Math.ceil(sensorConduitLengthM / sensorConduitStockLengthM)
    : 0;
  const conduitPurchaseLengthM = conduitStockCount * sensorConduitStockLengthM;
  if (sensorConduitLengthM > 0) {
    materials.push({
      name: "Защитная трубка датчика по проектной ведомости",
      subtitle: "Диаметр, материал, радиус изгиба и расположение сверяют с инструкцией выбранной системы",
      quantity: roundDisplay(sensorConduitLengthM, 6),
      unit: "м",
      withReserve: roundDisplay(sensorConduitLengthM, 6),
      purchaseQty: roundDisplay(conduitPurchaseLengthM, 6),
      packageInfo: {
        count: conduitStockCount,
        size: roundDisplay(sensorConduitStockLengthM, 6),
        packageUnit: spec.packaging_rules.conduit_unit,
      },
      category: "Монтаж",
    });
  }

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    acc[scenario] = {
      exact_need: kitCount,
      purchase_quantity: kitCount,
      leftover: 0,
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `systemType:${systemType}`,
        "factory_kit_passport",
        "no_hidden_reserve",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: systemType === 0 ? "electric-floor-mat-kit" : "electric-floor-cable-kit",
        package_size: 1,
        packages_count: kitCount,
        unit: spec.packaging_rules.kit_unit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const warnings: string[] = [
    "Калькулятор проверяет выбранные заводские комплекты и раскладку, но не назначает мощность, кабель питания, автомат, коммутацию или способ управления.",
    "Для цепи электрообогрева требуется защита УДТ с номинальным током срабатывания не более 30 мА; схему, заземление и уравнивание потенциалов проверяет проектировщик или электрик.",
    "Сохраните план зон нагрева, свободных зон, соединений и номинальных мощностей рядом с документацией электроустановки.",
  ];
  if (rawExcludedArea > roomArea) {
    warnings.push("Площадь зон без нагрева больше площади помещения: проверьте планировку и исходные размеры.");
  }
  if (rawLayoutArea > availableArea) {
    warnings.push("Площадь раскладки ограничена доступной площадью без мебели и оборудования; пересмотрите план зон нагрева.");
  }
  const coverageTolerance = spec.warnings_rules.coverage_tolerance_m2;
  if (selectedCoverageAreaM2 > layoutArea + coverageTolerance) {
    warnings.push("Паспортная площадь выбранных комплектов больше площади раскладки: нельзя перекрывать маты или произвольно уменьшать длину нагревательного кабеля.");
  } else if (selectedCoverageAreaM2 < layoutArea - coverageTolerance) {
    warnings.push("Выбранные комплекты покрывают не всю площадь раскладки; оставшуюся зону и требуемую мощность проверьте по плану и каталогу производителя.");
  }
  if (designHeatLoadW <= 0) {
    warnings.push("Проектная тепловая нагрузка не введена: калькулятор не подтверждает, что система может быть основным отоплением.");
  } else if (totalPowerW < designHeatLoadW * spec.warnings_rules.design_power_low_ratio) {
    warnings.push("Паспортная мощность выбранных комплектов ниже введённой проектной тепловой нагрузки.");
  } else if (totalPowerW > designHeatLoadW * spec.warnings_rules.design_power_high_ratio) {
    warnings.push("Паспортная мощность заметно выше введённой проектной нагрузки: проверьте допустимую удельную мощность, покрытие и управление.");
  }
  if (thermostatRatedCurrentA <= 0) {
    warnings.push("Допустимый ток терморегулятора не введён — прямое подключение нагрузки не проверено.");
  } else if (circuitCurrentA > thermostatRatedCurrentA) {
    warnings.push("Расчётный ток выбранных комплектов выше паспортного тока терморегулятора: нужна проектная схема коммутации, например через подходящий контактор.");
  }

  const practicalNotes = [
    "Зоны под встроенной мебелью, оборудованием и другими предметами, полностью закрывающими пол, оставляйте без нагрева согласно плану и инструкции системы.",
    "Проверьте совместимость нагревательной системы, основания, клея или стяжки и финишного покрытия по документации всех производителей.",
    "Перед закрытием конструкции измерьте сопротивление нагревательного элемента и изоляции по инструкции, зафиксируйте результаты и фактическую раскладку.",
    "Для водяной системы используйте отдельный калькулятор «Водяной тёплый пол».",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roomArea: roundDisplay(roomArea, 3),
      excludedAreaM2: roundDisplay(excludedArea, 3),
      availableAreaM2: roundDisplay(availableArea, 3),
      heatingArea: roundDisplay(layoutArea, 3),
      systemType,
      kitCount,
      kitCoverageAreaM2: roundDisplay(kitCoverageAreaM2, 3),
      selectedCoverageAreaM2: roundDisplay(selectedCoverageAreaM2, 3),
      kitRatedPowerW: roundDisplay(kitRatedPowerW, 3),
      totalPowerW: roundDisplay(totalPowerW, 3),
      totalPowerKW: roundDisplay(totalPowerW / 1000, 3),
      installedPowerDensityWm2: roundDisplay(installedPowerDensityWm2, 3),
      supplyVoltageV: roundDisplay(supplyVoltageV, 3),
      circuitCurrentA: roundDisplay(circuitCurrentA, 3),
      thermostatRatedCurrentA: roundDisplay(thermostatRatedCurrentA, 3),
      thermostatLoadPercent: roundDisplay(thermostatLoadPercent, 3),
      thermostatCount,
      floorSensorCount,
      cableLengthPerKitM: systemType === 1 ? roundDisplay(cableLengthPerKitM, 3) : 0,
      cableLength: roundDisplay(totalCableLengthM, 3),
      cableStepMm: roundDisplay(cableStepMm, 3),
      designHeatLoadW: roundDisplay(designHeatLoadW, 3),
      designPowerMarginW: roundDisplay(designPowerMarginW, 3),
      sensorConduitLengthM: roundDisplay(sensorConduitLengthM, 3),
      sensorConduitStockLengthM: roundDisplay(sensorConduitStockLengthM, 3),
      conduitStockCount,
      conduitPurchaseLengthM: roundDisplay(conduitPurchaseLengthM, 3),
      minExactNeed: kitCount,
      recExactNeed: kitCount,
      maxExactNeed: kitCount,
      minPurchase: kitCount,
      recPurchase: kitCount,
      maxPurchase: kitCount,
    },
    warnings,
    practicalNotes,
    scenarios,
  };
}
