import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WaterproofingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

/* ─── fallback constants (used if spec.material_rules is missing a field) ─── */

const DEFAULTS = {
  consumption_per_layer: { 0: 1.0, 1: 1.2, 2: 0.8 } as Record<number, number>,
  bucket_kg: { 0: 15, 1: 20, 2: 15 } as Record<number, number>,
  tape_reserve: 1.10,
  silicone_m_per_tube: 6,
  primer_kg_per_m2: 0.15,
  primer_can_kg: 2,
  bitumen_l_per_m2: 0.3,
  bitumen_can_l: 20,
  joint_sealant_m_per_tube: 10,
};

function getMaterialRule<T>(spec: WaterproofingCanonicalSpec, key: string, fallback: T): T {
  const rules = spec.material_rules as unknown as Record<string, unknown> | undefined;
  return (rules?.[key] as T) ?? fallback;
}

/* ─── labels ─── */

const MASTIC_TYPE_LABELS: Record<number, string> = {
  0: "Ceresit CL 51",
  1: "Жидкая резина",
  2: "Полимерная мастика",
};

/* ─── inputs ─── */

interface WaterproofingInputs {
  floorArea?: number;
  wallHeight?: number;
  roomPerimeter?: number;
  masticType?: number;
  layers?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: WaterproofingCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalWaterproofing(
  spec: WaterproofingCanonicalSpec,
  inputs: WaterproofingInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  // Read material rules from spec, fallback to defaults
  const CONSUMPTION_PER_LAYER = getMaterialRule(spec, "consumption_per_layer", DEFAULTS.consumption_per_layer);
  const BUCKET_KG = getMaterialRule(spec, "bucket_kg", DEFAULTS.bucket_kg);
  const TAPE_RESERVE = getMaterialRule(spec, "tape_reserve", DEFAULTS.tape_reserve);
  const SILICONE_M_PER_TUBE = getMaterialRule(spec, "silicone_m_per_tube", DEFAULTS.silicone_m_per_tube);
  const PRIMER_KG_PER_M2 = getMaterialRule(spec, "primer_kg_per_m2", DEFAULTS.primer_kg_per_m2);
  const PRIMER_CAN_KG = getMaterialRule(spec, "primer_can_kg", DEFAULTS.primer_can_kg);
  const BITUMEN_L_PER_M2 = getMaterialRule(spec, "bitumen_l_per_m2", DEFAULTS.bitumen_l_per_m2);
  const BITUMEN_CAN_L = getMaterialRule(spec, "bitumen_can_l", DEFAULTS.bitumen_can_l);
  const JOINT_SEALANT_M_PER_TUBE = getMaterialRule(spec, "joint_sealant_m_per_tube", DEFAULTS.joint_sealant_m_per_tube);

  const floorArea = Math.max(1, Math.min(50, inputs.floorArea ?? getInputDefault(spec, "floorArea", 6)));
  const wallHeightMm = Math.max(0, Math.min(2000, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 200)));
  const roomPerimeter = Math.max(4, Math.min(40, inputs.roomPerimeter ?? getInputDefault(spec, "roomPerimeter", 10)));
  const masticType = Math.max(0, Math.min(2, Math.round(inputs.masticType ?? getInputDefault(spec, "masticType", 0))));
  const layers = Math.max(1, Math.min(3, Math.round(inputs.layers ?? getInputDefault(spec, "layers", 2))));

  /* ─── areas ─── */
  const wallArea = roundDisplay(roomPerimeter * (wallHeightMm / 1000), 3);
  const totalArea = roundDisplay(floorArea + wallArea, 3);

  /* ─── mastic ─── */
  const consumption = CONSUMPTION_PER_LAYER[masticType] ?? 1.0;
  const bucketKg = BUCKET_KG[masticType] ?? 15;
  const accuracyMult = getPrimaryMultiplier("waterproofing", accuracyMode);
  const masticKgRaw = roundDisplay(totalArea * consumption * layers, 3);
  const masticKg = roundDisplay(masticKgRaw * accuracyMult, 3);
  const masticBucketsRaw = Math.ceil(masticKgRaw / bucketKg);
  const masticBuckets = Math.ceil(masticKg / bucketKg);

  /* ─── tape ─── */
  const tapeM = roundDisplay((roomPerimeter + (wallHeightMm > 0 ? roomPerimeter * 1.2 : 0)) * TAPE_RESERVE, 3);
  const tapeRolls = Math.ceil(tapeM / 10);

  /* ─── silicone ─── */
  const siliconeTubes = Math.ceil(roomPerimeter / SILICONE_M_PER_TUBE) + 1;

  /* ─── primer / bitumen ─── */
  let primerKg = 0;
  let primerCans = 0;
  let bitumenL = 0;
  let bitumenCans = 0;

  if (masticType === 0) {
    primerKg = roundDisplay(totalArea * PRIMER_KG_PER_M2 * 1.1, 3);
    primerCans = Math.ceil(primerKg / PRIMER_CAN_KG);
  } else {
    bitumenL = roundDisplay(totalArea * BITUMEN_L_PER_M2 * 1.1, 3);
    bitumenCans = Math.ceil(bitumenL / BITUMEN_CAN_L);
  }

  /* ─── joint sealant ─── */
  const jointTubes = Math.ceil(roomPerimeter * 0.5 / JOINT_SEALANT_M_PER_TUBE);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: `mastic-bucket-${bucketKg}kg`,
    unit: "вёдер",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(masticBuckets * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `masticType:${masticType}`,
        `layers:${layers}`,
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
  const materials: CanonicalMaterialResult[] = [
    {
      name: `${MASTIC_TYPE_LABELS[masticType] ?? "Мастика"} (${bucketKg} кг)`,
      quantity: roundDisplay(masticKg, 3),
      unit: "кг",
      withReserve: masticBuckets * bucketKg,
      purchaseQty: masticBuckets * bucketKg,
      category: "Основное",
      packageInfo: { count: masticBuckets, size: bucketKg, packageUnit: "вёдер" },
    },
    {
      name: "Лента гидроизоляционная (10 м)",
      quantity: roundDisplay(tapeM, 3),
      unit: "м",
      withReserve: tapeRolls * 10,
      purchaseQty: tapeRolls * 10,
      category: "Лента",
      packageInfo: { count: tapeRolls, size: 10, packageUnit: "рулонов" },
    },
    {
      name: "Силиконовый герметик",
      quantity: siliconeTubes,
      unit: "туб",
      withReserve: siliconeTubes,
      purchaseQty: siliconeTubes,
      category: "Герметик",
    },
  ];

  if (masticType === 0) {
    materials.push({
      name: `Грунтовка Ceresit (${PRIMER_CAN_KG} кг)`,
      quantity: roundDisplay(primerKg, 3),
      unit: "кг",
      withReserve: primerCans * PRIMER_CAN_KG,
      purchaseQty: primerCans * PRIMER_CAN_KG,
      category: "Подготовка",
      packageInfo: { count: primerCans, size: PRIMER_CAN_KG, packageUnit: "банок" },
    });
  } else {
    materials.push({
      name: `Битумный праймер (${BITUMEN_CAN_L} л)`,
      quantity: roundDisplay(bitumenL, 3),
      unit: "л",
      withReserve: bitumenCans * BITUMEN_CAN_L,
      purchaseQty: bitumenCans * BITUMEN_CAN_L,
      category: "Подготовка",
      packageInfo: { count: bitumenCans, size: BITUMEN_CAN_L, packageUnit: "канистр" },
    });
  }

  materials.push({
    name: "Герметик для стыков",
    quantity: jointTubes,
    unit: "туб",
    withReserve: jointTubes,
    purchaseQty: jointTubes,
    category: "Герметик",
  });

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (layers < 2) {
    warnings.push("Один слой допускается только для нежилых помещений");
  }
  if (wallHeightMm === 0) {
    warnings.push("Обработка стен обязательна минимум на 200 мм от пола");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Гидроизоляцию заводите на стены минимум на 200 мм — мокрые зоны защищайте полностью");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      floorArea: roundDisplay(floorArea, 3),
      wallHeightMm,
      roomPerimeter: roundDisplay(roomPerimeter, 3),
      masticType,
      layers,
      wallArea,
      totalArea,
      masticKg,
      masticBuckets,
      tapeM,
      tapeRolls,
      siliconeTubes,
      primerKg,
      primerCans,
      bitumenL,
      bitumenCans,
      jointTubes,
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
    accuracyExplanation: applyAccuracyMode(masticBucketsRaw, "waterproofing", accuracyMode).explanation,
  };
}
