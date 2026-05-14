import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SepticRingsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── labels ─── */

const GROUND_TYPE_LABELS: Record<number, string> = {
  0: "Песчаные/супесчаные грунты — отличная фильтрация",
  1: "Суглинки — средняя фильтрация",
  2: "Глины — плохая фильтрация (нужна биостанция или поле фильтрации)",
};

const RING_DIAMETER_LABELS: Record<number, string> = {
  1000: "КС-10-9 (Ø1000 мм, h=900)",
  1500: "КС-15-9 (Ø1500 мм, h=900)",
  2000: "КС-20-9 (Ø2000 мм, h=900)",
};

/* ─── inputs ─── */

interface SepticRingsInputs {
  residents?: number;
  chambersCount?: number;
  ringDiameter?: number;
  groundType?: number;
  withFilterWell?: number;
  pipeLengthFromHouse?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function snapDiameter(d: number): 1000 | 1500 | 2000 {
  if (d >= 1750) return 2000;
  if (d >= 1250) return 1500;
  return 1000;
}

/* ─── main ─── */

export function computeCanonicalSepticRings(
  spec: SepticRingsCanonicalSpec,
  inputs: SepticRingsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const residents = Math.max(1, Math.min(20, Math.round(inputs.residents ?? getInputDefault(spec, "residents", 4))));
  const chambersCount = Math.max(1, Math.min(3, Math.round(inputs.chambersCount ?? getInputDefault(spec, "chambersCount", 3))));
  const ringDiameter = snapDiameter(inputs.ringDiameter ?? getInputDefault(spec, "ringDiameter", 1000));
  const groundType = Math.max(0, Math.min(2, Math.round(inputs.groundType ?? getInputDefault(spec, "groundType", 1))));
  const withFilterWell = Math.max(0, Math.min(1, Math.round(inputs.withFilterWell ?? getInputDefault(spec, "withFilterWell", 1))));
  const pipeLengthFromHouse = Math.max(2, Math.min(50, inputs.pipeLengthFromHouse ?? getInputDefault(spec, "pipeLengthFromHouse", 8)));

  const rules = spec.material_rules;

  /* ─── volume calculation ─── */
  const dailyVolumeLiters = residents * rules.liters_per_person_per_day;
  const reserveDays = residents > rules.large_family_threshold
    ? rules.reserve_days_large_family
    : rules.reserve_days_small_family;
  const totalVolumeLiters = dailyVolumeLiters * reserveDays;
  const totalVolume = totalVolumeLiters / 1000;
  const volumePerChamber = totalVolume / chambersCount;

  /* ─── rings ─── */
  const ringVolumeM3 = rules.ring_volumes_m3[String(ringDiameter)] ?? rules.ring_volumes_m3["1000"];
  const ringsPerChamber = Math.max(2, Math.ceil(volumePerChamber / ringVolumeM3));
  const totalRings = ringsPerChamber * chambersCount;

  /* ─── plates and covers ─── */
  // Фильтрационный колодец (последняя камера) — без днища
  const sealedChambers = withFilterWell === 1 ? chambersCount - 1 : chambersCount;
  const bottomPlates = Math.max(0, sealedChambers);
  const topPlates = chambersCount;
  const covers = chambersCount;
  const neckRings = chambersCount * rules.neck_rings_per_chamber;

  /* ─── seal rings (резиновые манжеты на каждый стык) ─── */
  // Стыков на камеру = ringsPerChamber - 1 (между кольцами) + 1 (между нижним кольцом и днищем) + 1 (под плиту)
  const jointsPerSealedChamber = ringsPerChamber + 1;
  const jointsPerFilterChamber = ringsPerChamber; // без днища, минус один стык
  const totalJoints = sealedChambers * jointsPerSealedChamber + (chambersCount - sealedChambers) * jointsPerFilterChamber;
  const sealRings = Math.ceil(totalJoints * rules.seal_rings_factor);

  /* ─── waterproofing ─── */
  // Внешняя поверхность герметичных камер: π × D × h × ringsPerChamber × sealedChambers
  const ringDiameterM = ringDiameter / 1000;
  const sealedSurfaceM2 = Math.PI * ringDiameterM * rules.ring_height_m * ringsPerChamber * sealedChambers;
  const masticKg = sealedSurfaceM2 * rules.mastic_kg_per_m2 * rules.mastic_layers;
  const masticCans = Math.ceil(masticKg / rules.mastic_can_kg);

  // Битумные ленты на стыки колец герметичных камер: периметр × 0.3 м × число стыков
  const ringPerimeterM = Math.PI * ringDiameterM;
  const bitumenSheetTotalM = sealedChambers * jointsPerSealedChamber * ringPerimeterM * rules.bitumen_sheet_m_per_joint;
  const bitumenSheetRolls = Math.ceil(bitumenSheetTotalM / rules.bitumen_sheet_roll_m);

  /* ─── filter well bedding (gravel + sand) ─── */
  let filterGravelM3 = 0;
  let filterSandM3 = 0;
  if (withFilterWell === 1) {
    const wellFloorAreaM2 = Math.PI * (ringDiameterM / 2) ** 2;
    filterGravelM3 = roundDisplay(
      wellFloorAreaM2 * rules.filter_gravel_layer_m * rules.filter_gravel_compaction,
      3,
    );
    filterSandM3 = roundDisplay(
      wellFloorAreaM2 * rules.filter_sand_layer_m * rules.filter_sand_compaction,
      3,
    );
  }

  /* ─── pipe from house ─── */
  const pipeWithReserveM = pipeLengthFromHouse * rules.pipe_reserve;
  const pipeSections = Math.ceil(pipeWithReserveM / rules.pipe_section_m);
  const pipeElbows = rules.pipe_elbow_count;

  /* ─── scenarios — primary unit is total rings ─── */
  const basePrimaryRaw = totalRings;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 6);

  const packageOptions = [{
    size: 1,
    label: `septic-ring-${ringDiameter}`,
    unit: "шт",
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
        `residents:${residents}`,
        `chambersCount:${chambersCount}`,
        `ringDiameter:${ringDiameter}`,
        `withFilterWell:${withFilterWell}`,
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
  const ringLabel = RING_DIAMETER_LABELS[ringDiameter] ?? RING_DIAMETER_LABELS[1000];
  const groundLabel = GROUND_TYPE_LABELS[groundType] ?? GROUND_TYPE_LABELS[1];
  const bottomPlateLabel = rules.well_floor_plates[String(ringDiameter)] ?? "ПН";
  const topPlateLabel = rules.well_top_plates[String(ringDiameter)] ?? "ПП";

  const materials: CanonicalMaterialResult[] = [
    {
      name: ringLabel,
      quantity: totalRings,
      unit: "шт",
      withReserve: totalRings,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Камеры",
    },
  ];

  if (bottomPlates > 0) {
    materials.push({
      name: `Днище ${bottomPlateLabel} (Ø${ringDiameter} мм)`,
      quantity: bottomPlates,
      unit: "шт",
      withReserve: bottomPlates,
      purchaseQty: bottomPlates,
      category: "Камеры",
    });
  }

  materials.push(
    {
      name: `Плита перекрытия ${topPlateLabel} (Ø${ringDiameter} мм)`,
      quantity: topPlates,
      unit: "шт",
      withReserve: topPlates,
      purchaseQty: topPlates,
      category: "Камеры",
    },
    {
      name: rules.neck_ring_label,
      quantity: neckRings,
      unit: "шт",
      withReserve: neckRings,
      purchaseQty: neckRings,
      category: "Горловина",
    },
    {
      name: rules.manhole_label,
      quantity: covers,
      unit: "шт",
      withReserve: covers,
      purchaseQty: covers,
      category: "Горловина",
    },
    {
      name: "Уплотнительные кольца / резиновые манжеты",
      quantity: sealRings,
      unit: "шт",
      withReserve: sealRings,
      purchaseQty: sealRings,
      category: "Герметизация",
    },
  );

  if (sealedChambers > 0) {
    materials.push(
      {
        name: `Битумная мастика (${rules.mastic_can_kg} кг)`,
        quantity: masticCans,
        unit: "ведро",
        withReserve: masticCans,
        purchaseQty: masticCans,
        category: "Гидроизоляция",
      },
      {
        name: `Гидростеклоизол (полоса 300 мм, ${rules.bitumen_sheet_roll_m} м рулон)`,
        quantity: bitumenSheetRolls,
        unit: "рулонов",
        withReserve: bitumenSheetRolls,
        purchaseQty: bitumenSheetRolls,
        category: "Гидроизоляция",
      },
    );
  }

  if (withFilterWell === 1) {
    materials.push(
      {
        name: "Щебень фр. 20-40 мм (фильтрующий слой)",
        quantity: filterGravelM3,
        unit: "м³",
        withReserve: filterGravelM3,
        purchaseQty: Math.ceil(filterGravelM3 * 10) / 10,
        category: "Фильтрующий колодец",
      },
      {
        name: "Песок (подложка фильтра)",
        quantity: filterSandM3,
        unit: "м³",
        withReserve: filterSandM3,
        purchaseQty: Math.ceil(filterSandM3 * 100) / 100,
        category: "Фильтрующий колодец",
      },
    );
  }

  materials.push(
    {
      name: `Труба ПВХ Ø${rules.pipe_diameter_mm} (секции ${rules.pipe_section_m} м)`,
      quantity: pipeSections,
      unit: "шт",
      withReserve: pipeSections,
      purchaseQty: pipeSections,
      category: "Трубопровод",
    },
    {
      name: `Отводы Ø${rules.pipe_diameter_mm}`,
      quantity: pipeElbows,
      unit: "шт",
      withReserve: pipeElbows,
      purchaseQty: pipeElbows,
      category: "Трубопровод",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (residents > spec.warnings_rules.biotreatment_recommended_residents) {
    warnings.push(
      `На ${residents} проживающих рекомендуется станция биологической очистки — септик ЖБИ требует частой откачки и большой площадки фильтрации (СНиП 2.04.03-85).`,
    );
  }
  if (chambersCount === 1 && residents > spec.warnings_rules.single_chamber_max_residents) {
    warnings.push(
      `Однокамерный септик допустим только до ${spec.warnings_rules.single_chamber_max_residents} человек — для семьи из ${residents} нужны минимум 2-3 камеры с переливом.`,
    );
  }
  if (groundType >= spec.warnings_rules.clay_ground_filter_well_problematic && withFilterWell === 1) {
    warnings.push(
      "Глинистый грунт плохо фильтрует стоки — фильтрационный колодец быстро заиливается. Рассмотрите поле фильтрации с дренажными трубами или станцию биоочистки.",
    );
  }
  if (pipeLengthFromHouse > spec.warnings_rules.max_pipe_length_without_intermediate_well) {
    warnings.push(
      `Труба от дома ${pipeLengthFromHouse} м — на расстоянии > ${spec.warnings_rules.max_pipe_length_without_intermediate_well} м рекомендуется промежуточный смотровой колодец для прочистки.`,
    );
  }
  if (residents > 5 && chambersCount < 3) {
    warnings.push("Для семьи > 5 человек оптимально 3 камеры (приёмная / промежуточная / фильтрующая).");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push(`Кольца: ${ringLabel}`);
  practicalNotes.push(`Грунт: ${groundLabel}`);
  practicalNotes.push(
    `Объём септика: ${roundDisplay(totalVolume, 2)} м³ (${reserveDays}-кратный суточный сток ${roundDisplay(dailyVolumeLiters, 0)} л)`,
  );
  practicalNotes.push("Уклон трубы от дома: 0.02 м/м (СП 32.13330.2018), глубина закладки ниже промерзания + 0.30 м");
  if (withFilterWell === 1 && groundType < 2) {
    practicalNotes.push("Между кольцами фильтрационного колодца оставить технологические зазоры 30-50 мм для впитывания через стенки");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      residents,
      chambersCount,
      ringDiameter,
      groundType,
      withFilterWell,
      pipeLengthFromHouse: roundDisplay(pipeLengthFromHouse, 3),
      dailyVolumeLiters,
      totalVolumeLiters,
      totalVolume: roundDisplay(totalVolume, 3),
      volumePerChamber: roundDisplay(volumePerChamber, 3),
      ringsPerChamber,
      totalRings,
      bottomPlates,
      topPlates,
      covers,
      neckRings,
      sealRings,
      sealedChambers,
      sealedSurfaceM2: roundDisplay(sealedSurfaceM2, 3),
      masticKg: roundDisplay(masticKg, 2),
      masticCans,
      bitumenSheetRolls,
      filterGravelM3,
      filterSandM3,
      pipeWithReserveM: roundDisplay(pipeWithReserveM, 3),
      pipeSections,
      pipeElbows,
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
