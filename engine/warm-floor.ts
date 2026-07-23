import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WarmFloorCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface WarmFloorInputs {
  roomArea?: number;
  furnitureArea?: number;
  heatingType?: number;
  powerDensity?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── factor defaults ─── */

const WARM_FLOOR_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.98, rec: 1, max: 1.08 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

/* ─── type 0: Mats ─── */

function buildMaterialsMats(
  heatingArea: number,
  powerDensity: number,
  matArea: number,
  mats: number,
  corrugatedTube: number,
  substrateRolls: number,
  adhesiveBags: number,
  tileAdhesiveKgPerM2: number,
  tileAdhesiveBagKg: number,
  substrateRollM2: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: `Нагревательный мат ${powerDensity} Вт/м², комплект на ${matArea} м²`,
      subtitle: "Греющий кабель мата нельзя укорачивать; фактический набор комплектов подбирают по каталогу производителя",
      quantity: mats,
      unit: "шт",
      withReserve: mats,
      purchaseQty: mats,
      category: "Основное",
    },
    {
      name: "Терморегулятор с выносным датчиком температуры пола",
      subtitle: "Допустимый ток регулятора должен быть не ниже расчётной нагрузки системы",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Гофротрубка Ø16 мм с заглушкой для датчика пола",
      subtitle: "Датчик устанавливают в трубке между соседними витками нагревательного кабеля",
      quantity: corrugatedTube,
      unit: "м",
      withReserve: corrugatedTube,
      purchaseQty: corrugatedTube,
      category: "Монтаж",
    },
    {
      name: `Теплоизоляционная подложка, рулон ${substrateRollM2} м²`,
      subtitle: "Применять только если такая подложка разрешена конструкцией пола и производителем нагревательной системы",
      quantity: substrateRolls,
      unit: "рулонов",
      withReserve: substrateRolls,
      purchaseQty: substrateRolls,
      category: "Подготовка",
    },
    {
      name: `Эластичный плиточный клей для тёплого пола, мешок ${tileAdhesiveBagKg} кг`,
      subtitle: "Клей должен быть разрешён производителем для полов с подогревом",
      quantity: roundDisplay(heatingArea * tileAdhesiveKgPerM2, 3),
      unit: "кг",
      withReserve: adhesiveBags * tileAdhesiveBagKg,
      purchaseQty: adhesiveBags * tileAdhesiveBagKg,
      packageInfo: { count: adhesiveBags, size: tileAdhesiveBagKg, packageUnit: "мешков" },
      category: "Основное",
    },
  ];
}

/* ─── type 1: Cable in screed ─── */

function buildMaterialsCable(
  heatingArea: number,
  cableLinearPower: number,
  cableLength: number,
  mountingTapeRolls: number,
  epsSheets: number,
  screedBags: number,
  screedThicknessM: number,
  screedDensity: number,
  screedBagKg: number,
  epsSheetM2: number,
  mountingTapeRollM: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: `Двухжильный нагревательный кабель ${cableLinearPower} Вт/м`,
      subtitle: "Кабель нельзя укорачивать: выбирайте ближайший заводской комплект по длине и мощности",
      quantity: cableLength,
      unit: "м",
      withReserve: cableLength,
      purchaseQty: cableLength,
      category: "Основное",
    },
    {
      name: "Терморегулятор с выносным датчиком температуры пола",
      subtitle: "Допустимый ток регулятора должен быть не ниже расчётной нагрузки системы",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: `Металлическая монтажная лента для греющего кабеля, рулон ${mountingTapeRollM} м`,
      quantity: mountingTapeRolls,
      unit: "рулонов",
      withReserve: mountingTapeRolls,
      purchaseQty: mountingTapeRolls,
      category: "Монтаж",
    },
    {
      name: `Теплоизоляционные плиты для пола 1200×600 мм (${epsSheetM2} м²)`,
      subtitle: "Толщину и прочность на сжатие выбирают по конструкции перекрытия и теплотехническому расчёту",
      quantity: epsSheets,
      unit: "листов",
      withReserve: epsSheets,
      purchaseQty: epsSheets,
      category: "Утепление",
    },
    {
      name: `Сухая смесь для стяжки тёплого пола, мешок ${screedBagKg} кг`,
      subtitle: `Расчёт выполнен для слоя ${Math.round(screedThicknessM * 1000)} мм; допустимую толщину над кабелем сверяют с системой`,
      quantity: roundDisplay(heatingArea * screedThicknessM * screedDensity, 3),
      unit: "кг",
      withReserve: screedBags * screedBagKg,
      purchaseQty: screedBags * screedBagKg,
      packageInfo: { count: screedBags, size: screedBagKg, packageUnit: "мешков" },
      category: "Основное",
    },
  ];
}

/* ─── type 2: Water pipes ─── */

function buildMaterialsWaterPipes(
  pipeLength: number,
  circuits: number,
  meshArea: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Труба PE-Xa или PE-RT 16×2 мм для тёплого пола",
      subtitle: "Каждый контур укладывают одним отрезком без соединений в стяжке; тип трубы выбирают по проекту",
      quantity: pipeLength,
      unit: "м",
      withReserve: pipeLength,
      purchaseQty: pipeLength,
      category: "Основное",
    },
    {
      name: `Коллекторная группа для тёплого пола на ${circuits} ${circuits === 1 ? "контур" : "контура"}`,
      subtitle: "С расходомерами, регулирующими клапанами, воздухоотводчиком и сливными кранами",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Евроконусы 3/4″×16 мм для подключения трубы к коллектору",
      subtitle: "По два соединения на каждый контур: подача и обратная линия",
      quantity: circuits * 2,
      unit: "шт",
      withReserve: circuits * 2,
      purchaseQty: circuits * 2,
      category: "Подключение",
    },
    {
      name: "Стальная армирующая сетка для стяжки",
      subtitle: "Размер ячейки и диаметр проволоки назначают по конструкции пола, а не только по площади",
      quantity: roundDisplay(meshArea, 3),
      unit: "м²",
      withReserve: Math.ceil(meshArea),
      purchaseQty: Math.ceil(meshArea),
      category: "Армирование",
    },
  ];
}

/* ─── main ─── */

export function computeCanonicalWarmFloor(
  spec: WarmFloorCanonicalSpec,
  inputs: WarmFloorInputs,
  factorTable: FactorTable = WARM_FLOOR_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);
  const rules = spec.material_rules;

  const roomArea = Math.max(1, Math.min(100, inputs.roomArea ?? getInputDefault(spec, "roomArea", 10)));
  const furnitureArea = Math.max(0, Math.min(roomArea, inputs.furnitureArea ?? getInputDefault(spec, "furnitureArea", 2)));
  const heatingType = Math.max(0, Math.min(2, Math.round(inputs.heatingType ?? getInputDefault(spec, "heatingType", 0))));
  const powerDensity = Math.max(100, Math.min(200, inputs.powerDensity ?? getInputDefault(spec, "powerDensity", 150)));

  const heatingArea = Math.max(0, roomArea - furnitureArea);
  const totalPowerW = heatingArea * powerDensity;
  const totalPowerKW = roundDisplay(totalPowerW / 1000, 3);

  /* ─── per-type calculations ─── */
  let basePrimary: number;
  let materials: CanonicalMaterialResult[];
  let mats = 0, cableLength = 0, mountingTapeRolls = 0, epsSheets = 0, screedBags = 0;
  let pipeLength = 0, circuits = 0, meshArea = 0;
  let substrateRolls = 0, adhesiveBags = 0;
  let cableStepMm = 0;

  if (heatingType === 0) {
    // Mats
    mats = Math.ceil(heatingArea / rules.mat_area);
    const corrugatedTube = rules.corrugated_tube_m;
    substrateRolls = Math.ceil(heatingArea * rules.substrate_reserve / rules.substrate_roll_m2);
    adhesiveBags = Math.ceil(heatingArea * rules.tile_adhesive_kg_per_m2 / rules.tile_adhesive_bag_kg);

    basePrimary = mats;
    materials = buildMaterialsMats(
      heatingArea,
      powerDensity,
      rules.mat_area,
      mats,
      corrugatedTube,
      substrateRolls,
      adhesiveBags,
      rules.tile_adhesive_kg_per_m2,
      rules.tile_adhesive_bag_kg,
      rules.substrate_roll_m2,
    );
  } else if (heatingType === 1) {
    // Cable in screed
    cableLength = Math.ceil(totalPowerW / rules.cable_linear_power_w_per_m * rules.cable_reserve);
    cableStepMm = cableLength > 0 ? roundDisplay(heatingArea / cableLength * 1000, 1) : 0;
    mountingTapeRolls = Math.ceil(cableLength / rules.mounting_tape_roll_m);
    epsSheets = Math.ceil(heatingArea * rules.eps_reserve / rules.eps_sheet_m2);
    screedBags = Math.ceil(heatingArea * rules.screed_thickness_m * rules.screed_density / rules.screed_bag_kg);

    basePrimary = cableLength;
    materials = buildMaterialsCable(
      heatingArea,
      rules.cable_linear_power_w_per_m,
      cableLength,
      mountingTapeRolls,
      epsSheets,
      screedBags,
      rules.screed_thickness_m,
      rules.screed_density,
      rules.screed_bag_kg,
      rules.eps_sheet_m2,
      rules.mounting_tape_roll_m,
    );
  } else {
    // Water pipes
    pipeLength = Math.ceil(heatingArea / rules.pipe_step_m * rules.pipe_reserve);
    circuits = pipeLength > 0 ? Math.ceil(pipeLength / rules.max_circuit_m) : 0;
    meshArea = heatingArea * rules.mesh_reserve;

    basePrimary = pipeLength;
    materials = buildMaterialsWaterPipes(pipeLength, circuits, meshArea);
  }

  /* ─── scenarios ─── */
  const basePrimaryRaw = basePrimary;
  basePrimary = Math.ceil(basePrimary * accuracyMult);
  const packageSize = 1;
  const packageUnit = heatingType === 0 ? "шт" : "м";
  const packageLabel = heatingType === 0 ? "warm-floor-mat" : heatingType === 1 ? "warm-floor-cable-m" : "warm-floor-pipe-m";

  const packageOptions = [{ size: packageSize, label: packageLabel, unit: packageUnit }];

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
        `heatingType:${heatingType}`,
        `powerDensity:${powerDensity}`,
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

  /* ─── totals ─── */
  const recScenario = scenarios.REC;

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (heatingType !== 2 && totalPowerKW > spec.warnings_rules.separate_breaker_kw_threshold) {
    warnings.push("Электрическая мощность выше допустимой для типового терморегулятора — нужна отдельная линия и проверка схемы электриком");
  }
  if (roomArea > 0 && heatingArea / roomArea < spec.warnings_rules.ineffective_coverage_ratio) {
    warnings.push("Обогреваемая площадь менее 50% — неэффективное покрытие");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Тёплый пол может быть основным отоплением только после расчёта теплопотерь и проверки, что установленной мощности достаточно");
  if (heatingType !== 2) {
    practicalNotes.push("Электрическую систему подключают через устройство защитного отключения и автоматический выключатель по проекту электроснабжения");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roomArea: roundDisplay(roomArea, 3),
      furnitureArea: roundDisplay(furnitureArea, 3),
      heatingArea: roundDisplay(heatingArea, 3),
      heatingType,
      powerDensity,
      totalPowerW: roundDisplay(totalPowerW, 3),
      totalPowerKW,
      thermostat: heatingType === 2 ? 0 : 1,
      mats,
      cableLength,
      mountingTapeRolls,
      epsSheets,
      screedBags,
      pipeLength,
      circuits,
      cableStepMm,
      meshArea: roundDisplay(meshArea, 3),
      substrateRolls,
      adhesiveBags,
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
