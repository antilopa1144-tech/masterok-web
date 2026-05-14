import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  GreenhouseCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── labels ─── */

const ROOF_TYPE_LABELS: Record<number, string> = {
  0: "Арочная (полуцилиндр)",
  1: "Двускатная (домик)",
};

const FOUNDATION_TYPE_LABELS: Record<number, string> = {
  0: "Без фундамента (анкеры в грунт)",
  1: "Брус 100×100 мм по периметру",
  2: "Винтовые сваи",
  3: "Ленточный мелкозаглублённый",
};

const POLYCARBONATE_LABELS: Record<number, string> = {
  4: "Поликарбонат сотовый 4 мм (летние теплицы)",
  6: "Поликарбонат сотовый 6 мм (универсальный)",
  8: "Поликарбонат сотовый 8 мм (зимний)",
  10: "Поликарбонат сотовый 10 мм (зимний усиленный)",
};

/* ─── inputs ─── */

interface GreenhouseInputs {
  length?: number;
  width?: number;
  height?: number;
  roofType?: number;
  polycarbonateThickness?: number;
  archStep?: number;
  doorCount?: number;
  ventCount?: number;
  foundationType?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function snapPolycarbonate(t: number): 4 | 6 | 8 | 10 {
  if (t >= 9) return 10;
  if (t >= 7) return 8;
  if (t >= 5) return 6;
  return 4;
}

/* ─── main ─── */

export function computeCanonicalGreenhouse(
  spec: GreenhouseCanonicalSpec,
  inputs: GreenhouseInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const length = Math.max(2, Math.min(12, inputs.length ?? getInputDefault(spec, "length", 6)));
  const width = Math.max(2, Math.min(6, inputs.width ?? getInputDefault(spec, "width", 3)));
  const height = Math.max(1.8, Math.min(3.0, inputs.height ?? getInputDefault(spec, "height", 2.1)));
  const roofType = Math.max(0, Math.min(1, Math.round(inputs.roofType ?? getInputDefault(spec, "roofType", 0))));
  const polycarbonateThickness = snapPolycarbonate(
    inputs.polycarbonateThickness ?? getInputDefault(spec, "polycarbonateThickness", 6),
  );
  const archStep = Math.max(0.5, Math.min(1.05, inputs.archStep ?? getInputDefault(spec, "archStep", 0.65)));
  const doorCount = Math.max(1, Math.min(2, Math.round(inputs.doorCount ?? getInputDefault(spec, "doorCount", 2))));
  const ventCount = Math.max(0, Math.min(6, Math.round(inputs.ventCount ?? getInputDefault(spec, "ventCount", 2))));
  const foundationType = Math.max(0, Math.min(3, Math.round(inputs.foundationType ?? getInputDefault(spec, "foundationType", 1))));

  const rules = spec.material_rules;
  const sheetWidth = rules.polycarbonate_sheet_width_m;
  const sheetLength = rules.polycarbonate_sheet_length_m;
  const sheetArea = sheetWidth * sheetLength;

  /* ─── polycarbonate area ─── */
  let polyArea = 0;
  let archLengthM = 0;

  if (roofType === 0) {
    // Арка: полуцилиндр + 2 торца (полукруги)
    // Длина дуги полуарки = π × W / 2
    archLengthM = (Math.PI * width) / 2;
    const lateralArea = archLengthM * length;
    const endArea = (Math.PI * width * width) / 8; // полукруг
    polyArea = lateralArea + 2 * endArea;
  } else {
    // Двускатная: 2 ската + 2 торца
    const wallHeight = 1.5;
    const ridgeHeight = Math.max(0.1, height - wallHeight);
    const slopeLen = Math.sqrt((width / 2) ** 2 + ridgeHeight ** 2);
    archLengthM = 2 * slopeLen + 2 * wallHeight; // периметр стропил с боковинами для торца
    const slopeArea = 2 * slopeLen * length; // оба ската
    const sideArea = 2 * (wallHeight * length); // боковые стены
    const endArea = (width * wallHeight) + (width * ridgeHeight) / 2; // прямоугольник + треугольник на торец
    polyArea = slopeArea + sideArea + 2 * endArea;
  }

  const polyAreaWithReserve = polyArea * rules.polycarbonate_reserve;
  const polySheets = Math.ceil(polyAreaWithReserve / sheetArea);

  /* ─── frame profile ─── */
  // Дуги/стропила: ceil(length / archStep) + 1 шт
  const archCount = Math.ceil(length / archStep) + 1;
  const archProfileLengthEach = roofType === 0 ? archLengthM : archLengthM;
  // Продольные прогоны
  const longitudinalLength = rules.longitudinal_purlins_count * length;
  // Торцевые рамки (двери и форточки уже учтены отдельно)
  const endFrameLength = roofType === 0 ? 2 * (Math.PI * width / 2 + width) : 2 * (width + 2 * 1.5 + 2 * archLengthM / 4);

  const totalFrameLengthM = archCount * archProfileLengthEach + longitudinalLength + endFrameLength;
  const totalFrameWithReserve = totalFrameLengthM * rules.frame_profile_reserve;
  const framePiecesM = rules.frame_profile_pack_m;
  const frameProfilePieces = Math.ceil(totalFrameWithReserve / framePiecesM);

  /* ─── thermal washers ─── */
  const thermalWashersTotal = Math.ceil(polyArea * rules.thermal_washers_per_m2);
  const thermalWasherPacks = Math.ceil(thermalWashersTotal / rules.thermal_washer_pack);

  /* ─── H/UP profiles (polycarbonate junctions) ─── */
  // H-профиль соединительный: между листами по длине теплицы
  // Для арки длина шва ≈ archLengthM × число швов; швов = ceil(length / sheetWidth) - 1
  const hSeamCount = Math.max(0, Math.ceil(length / sheetWidth) - 1);
  const hProfileTotalM = hSeamCount * archLengthM;
  const hProfilePieces = Math.ceil(hProfileTotalM / rules.h_profile_length_m);

  // UP-торцевой: по верху и низу листа (на каждый лист)
  const upProfileTotalM = polySheets * 2 * sheetWidth;
  const upProfilePieces = Math.ceil(upProfileTotalM / rules.up_profile_length_m);

  /* ─── doors ─── */
  const doorAreaTotal = doorCount * (rules.door_width_m * rules.door_height_m);
  // Каркас двери: 2 высоты + 2 ширины + 1 диагональ
  const doorFrameLengthEach = 2 * rules.door_height_m + 2 * rules.door_width_m + Math.sqrt(rules.door_height_m ** 2 + rules.door_width_m ** 2);
  const doorFrameTotalM = doorCount * doorFrameLengthEach;

  /* ─── vents ─── */
  const ventFrameLengthEach = 2 * (rules.vent_height_m + rules.vent_width_m);
  const ventFrameTotalM = ventCount * ventFrameLengthEach;
  const ventHinges = ventCount * 2;
  const ventLatches = ventCount;

  /* ─── foundation ─── */
  const perimeter = 2 * (length + width);
  let woodBeamLengthM = 0;
  let woodBeamPieces = 0;
  let screwPileCount = 0;
  let concreteM3 = 0;
  let anchorCount = 0;

  if (foundationType === 0) {
    anchorCount = Math.max(8, Math.ceil(perimeter / rules.anchor_step_m));
  } else if (foundationType === 1) {
    // Брус по периметру + поперечины каждые 1.5 м
    const crossbeamCount = Math.max(0, Math.ceil(length / rules.wood_beam_crossbeam_step_m) - 1);
    const crossbeamLength = crossbeamCount * width;
    woodBeamLengthM = (perimeter + crossbeamLength) * rules.wood_beam_reserve;
    woodBeamPieces = Math.ceil(woodBeamLengthM / rules.wood_beam_pack_m);
  } else if (foundationType === 2) {
    screwPileCount = Math.max(rules.screw_pile_corners_min, Math.ceil(perimeter / rules.screw_pile_step_m));
  } else {
    concreteM3 = roundDisplay(
      perimeter * rules.concrete_strip_width_m * rules.concrete_strip_depth_m * rules.concrete_reserve,
      3,
    );
  }

  /* ─── consumables ─── */
  const screwsTotal = Math.ceil(polyArea * rules.self_tapping_screws_per_m2);
  // Уплотнительная лента — по периметру всех швов и торцов листов (упрощённо)
  const sealingTapeTotalM = (hProfileTotalM + upProfileTotalM) * rules.sealing_tape_per_seam_factor;
  const sealingTapeRolls = Math.ceil(sealingTapeTotalM / 25); // рулон 25 м

  /* ─── scenarios — primary unit is poly sheets ─── */
  const basePrimaryRaw = polySheets;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 6);

  const packageOptions = [{
    size: 1,
    label: `polycarbonate-${polycarbonateThickness}mm-sheet`,
    unit: "лист",
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
        `length:${length}`,
        `width:${width}`,
        `roofType:${roofType}`,
        `polycarbonateThickness:${polycarbonateThickness}`,
        `foundationType:${foundationType}`,
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
  const polyLabel = POLYCARBONATE_LABELS[polycarbonateThickness] ?? POLYCARBONATE_LABELS[6];
  const roofLabel = ROOF_TYPE_LABELS[roofType] ?? ROOF_TYPE_LABELS[0];
  const foundationLabel = FOUNDATION_TYPE_LABELS[foundationType] ?? FOUNDATION_TYPE_LABELS[1];

  const materials: CanonicalMaterialResult[] = [
    {
      name: `${polyLabel}, лист ${sheetWidth} × ${sheetLength} м`,
      quantity: polySheets,
      unit: "лист",
      withReserve: polySheets,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Покрытие",
    },
    {
      name: `Профиль каркаса ${rules.frame_profile_section_label} (${framePiecesM} м)`,
      quantity: frameProfilePieces,
      unit: "шт",
      withReserve: frameProfilePieces,
      purchaseQty: frameProfilePieces,
      category: "Каркас",
    },
    {
      name: "Термошайбы для поликарбоната",
      quantity: thermalWashersTotal,
      unit: "шт",
      withReserve: thermalWashersTotal,
      purchaseQty: thermalWasherPacks * rules.thermal_washer_pack,
      packageInfo: { count: thermalWasherPacks, size: rules.thermal_washer_pack, packageUnit: "упаковок" },
      category: "Крепёж",
    },
    {
      name: "Саморезы для оцинковки",
      quantity: screwsTotal,
      unit: "шт",
      withReserve: screwsTotal,
      purchaseQty: screwsTotal,
      category: "Крепёж",
    },
  ];

  if (hProfilePieces > 0) {
    materials.push({
      name: `H-профиль соединительный (${rules.h_profile_length_m} м)`,
      quantity: hProfilePieces,
      unit: "шт",
      withReserve: hProfilePieces,
      purchaseQty: hProfilePieces,
      category: "Поликарбонатные профили",
    });
  }

  materials.push({
    name: `UP-профиль торцевой (${rules.up_profile_length_m} м)`,
    quantity: upProfilePieces,
    unit: "шт",
    withReserve: upProfilePieces,
    purchaseQty: upProfilePieces,
    category: "Поликарбонатные профили",
  });

  materials.push({
    name: "Уплотнительная лента (25 м рулон)",
    quantity: sealingTapeRolls,
    unit: "рулонов",
    withReserve: sealingTapeRolls,
    purchaseQty: sealingTapeRolls,
    category: "Уплотнение",
  });

  materials.push({
    name: `Дверь распашная ${rules.door_width_m * 100}×${rules.door_height_m * 100} см (комплект петли + ручка)`,
    quantity: doorCount,
    unit: "комплект",
    withReserve: doorCount,
    purchaseQty: doorCount,
    category: "Двери и форточки",
  });

  if (ventCount > 0) {
    materials.push(
      {
        name: `Форточка ${rules.vent_width_m * 100}×${rules.vent_height_m * 100} см (рамка)`,
        quantity: ventCount,
        unit: "шт",
        withReserve: ventCount,
        purchaseQty: ventCount,
        category: "Двери и форточки",
      },
      {
        name: "Петли для форточек",
        quantity: ventHinges,
        unit: "шт",
        withReserve: ventHinges,
        purchaseQty: ventHinges,
        category: "Двери и форточки",
      },
      {
        name: "Шпингалет / автомат для форточки",
        quantity: ventLatches,
        unit: "шт",
        withReserve: ventLatches,
        purchaseQty: ventLatches,
        category: "Двери и форточки",
      },
    );
  }

  if (foundationType === 0 && anchorCount > 0) {
    materials.push({
      name: "Анкеры грунтовые (Т-образные)",
      quantity: anchorCount,
      unit: "шт",
      withReserve: anchorCount,
      purchaseQty: anchorCount,
      category: "Фундамент",
    });
  } else if (foundationType === 1) {
    materials.push({
      name: `${rules.wood_beam_section_label} антисептированный (${rules.wood_beam_pack_m} м)`,
      quantity: woodBeamPieces,
      unit: "шт",
      withReserve: woodBeamPieces,
      purchaseQty: woodBeamPieces,
      category: "Фундамент",
    });
  } else if (foundationType === 2) {
    materials.push({
      name: "Винтовая свая Ø108 мм, 1.5-2.5 м",
      quantity: screwPileCount,
      unit: "шт",
      withReserve: screwPileCount,
      purchaseQty: screwPileCount,
      category: "Фундамент",
    });
  } else if (foundationType === 3) {
    materials.push({
      name: "Бетон М200 (лента 0.30 × 0.40 м)",
      quantity: concreteM3,
      unit: "м³",
      withReserve: concreteM3,
      purchaseQty: Math.ceil(concreteM3 * 10) / 10,
      category: "Фундамент",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (polycarbonateThickness < spec.warnings_rules.thin_polycarbonate_for_winter_mm && archStep > 0.65) {
    warnings.push(
      `Поликарбонат ${polycarbonateThickness} мм с шагом каркаса ${archStep} м не выдержит снеговую нагрузку III и тяжелее снегового района РФ. Берите ≥ 6 мм с шагом 0.65 м (СП 20.13330.2016).`,
    );
  }
  if (archStep > spec.warnings_rules.wide_step_for_winter_m && polycarbonateThickness < 8) {
    warnings.push(
      `Шаг каркаса ${archStep} м допустим только для летних теплиц или южных регионов. Для зимней эксплуатации в средней полосе и севернее — шаг ≤ 0.65 м.`,
    );
  }
  if (height < spec.warnings_rules.low_height_threshold_m) {
    warnings.push(
      `Высота в коньке ${height} м — низкая. Для удобства работы и циркуляции воздуха рекомендуется ≥ 2.0 м.`,
    );
  }
  if (foundationType === 0 && length > spec.warnings_rules.no_foundation_max_length_m) {
    warnings.push(
      `Без фундамента теплицу длиной > ${spec.warnings_rules.no_foundation_max_length_m} м ставить рискованно — каркас перекосится при пучении грунта. Рекомендуется минимум брус 100×100 мм.`,
    );
  }
  if (ventCount === 0 && length > 4) {
    warnings.push(
      "Без форточек теплица перегревается летом — обязательны минимум 1 шт на 4 м длины + автомат проветривания.",
    );
  }

  const practicalNotes: string[] = [];
  practicalNotes.push(`Тип крыши: ${roofLabel}`);
  practicalNotes.push(`Покрытие: ${polyLabel}`);
  practicalNotes.push(`Фундамент: ${foundationLabel}`);
  practicalNotes.push(
    `Поликарбонат укладывать защитной плёнкой UV наружу — стрелки и маркировка на плёнке. Без правильной ориентации листы выгорают за 1-2 сезона.`,
  );
  practicalNotes.push("Соты поликарбоната должны быть направлены вертикально (для арки — параллельно дуге) для отвода конденсата");
  if (foundationType === 1) {
    practicalNotes.push("Брус обязательно обработать антисептиком (Сенеж Ультра или Неомид-440) перед монтажом");
  }
  if (archStep <= 0.65) {
    practicalNotes.push("Шаг 0.65 м — каркас рассчитан на снеговую нагрузку до III снегового района (160 кг/м²)");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      height: roundDisplay(height, 3),
      roofType,
      polycarbonateThickness,
      archStep: roundDisplay(archStep, 3),
      doorCount,
      ventCount,
      foundationType,
      polyArea: roundDisplay(polyArea, 3),
      polyAreaWithReserve: roundDisplay(polyAreaWithReserve, 3),
      polySheets,
      archCount,
      archLengthM: roundDisplay(archLengthM, 3),
      totalFrameLengthM: roundDisplay(totalFrameLengthM, 3),
      frameProfilePieces,
      thermalWashersTotal,
      thermalWasherPacks,
      hSeamCount,
      hProfilePieces,
      upProfilePieces,
      doorAreaTotal: roundDisplay(doorAreaTotal, 3),
      doorFrameTotalM: roundDisplay(doorFrameTotalM, 3),
      ventFrameTotalM: roundDisplay(ventFrameTotalM, 3),
      ventHinges,
      ventLatches,
      perimeter: roundDisplay(perimeter, 3),
      woodBeamLengthM: roundDisplay(woodBeamLengthM, 3),
      woodBeamPieces,
      screwPileCount,
      concreteM3,
      anchorCount,
      screwsTotal,
      sealingTapeRolls,
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
