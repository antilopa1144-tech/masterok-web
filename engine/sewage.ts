import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SewageCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface SewageInputs {
  residents?: number;
  septikType?: number;
  chambersCount?: number;
  pipeLength?: number;
  groundType?: number;
}

/* ─── constants ─── */

const LITERS_PER_PERSON_PER_DAY = 200;    // SP 30.13330
const RESERVE_DAYS = 3;                    // SP 32.13330
const RING_VOLUME_M3 = 0.71;              // KS 10-9
const EUROCUBE_USABLE_M3 = 0.8;
const PIPE_SECTION_M = 3;                 // PVC ø110
const PIPE_RESERVE = 1.05;
const DEFAULT_ELBOWS = 3;
const DEFAULT_TEES = 2;
const GRAVEL_BY_GROUND: Record<number, number> = { 0: 0, 1: 2, 2: 4 };  // m³
const GEOTEXTILE_FACTOR = 2;              // m² per m³ total volume
const SAND_BACKFILL_FACTOR = 0.5;         // m³ per m³ volume, for plastic

/* ─── factor defaults ─── */

const SEWAGE_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.95, rec: 1, max: 1.1 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.97, rec: 1, max: 1.05 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

function getInputDefault(spec: SewageCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalSewage(
  spec: SewageCanonicalSpec,
  inputs: SewageInputs,
  factorTable: FactorTable = SEWAGE_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const residents = Math.max(1, Math.min(20, Math.round(inputs.residents ?? getInputDefault(spec, "residents", 4))));
  const septikType = Math.max(0, Math.min(2, Math.round(inputs.septikType ?? getInputDefault(spec, "septikType", 0))));
  const chambersCount = Math.max(1, Math.min(3, Math.round(inputs.chambersCount ?? getInputDefault(spec, "chambersCount", 2))));
  const pipeLength = Math.max(1, Math.min(50, inputs.pipeLength ?? getInputDefault(spec, "pipeLength", 10)));
  const groundType = Math.max(0, Math.min(2, Math.round(inputs.groundType ?? getInputDefault(spec, "groundType", 0))));

  /* ─── volume calculation ─── */
  const dailyVolumeLiters = residents * LITERS_PER_PERSON_PER_DAY;
  const totalVolumeLiters = dailyVolumeLiters * RESERVE_DAYS;
  const totalVolume = totalVolumeLiters / 1000;
  const volumePerChamber = totalVolume / chambersCount;

  /* ─── type-specific ─── */
  const materials: CanonicalMaterialResult[] = [];
  let basePrimary: number;

  let totalRings = 0;
  let ringsPerChamber = 0;
  let bottomPlates = 0;
  let topPlates = 0;
  let covers = 0;
  let sealingRings = 0;
  let septicCount = 0;
  let sandBackfill = 0;
  let eurocubes = 0;

  if (septikType === 0) {
    // Concrete rings KS 10-9
    ringsPerChamber = Math.ceil(volumePerChamber / RING_VOLUME_M3);
    totalRings = ringsPerChamber * chambersCount;
    bottomPlates = chambersCount;
    topPlates = chambersCount;
    covers = chambersCount;
    sealingRings = totalRings;
    basePrimary = totalRings;

    materials.push(
      {
        name: "Кольца ЖБ КС 10-9",
        quantity: totalRings,
        unit: "шт",
        withReserve: totalRings,
        purchaseQty: totalRings,
        category: "Ёмкость",
      },
      {
        name: "Днища ПН-10",
        quantity: bottomPlates,
        unit: "шт",
        withReserve: bottomPlates,
        purchaseQty: bottomPlates,
        category: "Ёмкость",
      },
      {
        name: "Плиты перекрытия ПП-10",
        quantity: topPlates,
        unit: "шт",
        withReserve: topPlates,
        purchaseQty: topPlates,
        category: "Ёмкость",
      },
      {
        name: "Люки чугунные",
        quantity: covers,
        unit: "шт",
        withReserve: covers,
        purchaseQty: covers,
        category: "Ёмкость",
      },
      {
        name: "Кольца уплотнительные",
        quantity: sealingRings,
        unit: "шт",
        withReserve: sealingRings,
        purchaseQty: sealingRings,
        category: "Герметизация",
      },
    );
  } else if (septikType === 1) {
    // Plastic septic
    septicCount = 1;
    sandBackfill = Math.ceil(totalVolume * SAND_BACKFILL_FACTOR);
    basePrimary = septicCount;

    materials.push(
      {
        name: "Септик пластиковый",
        quantity: septicCount,
        unit: "шт",
        withReserve: septicCount,
        purchaseQty: septicCount,
        category: "Ёмкость",
      },
      {
        name: "Песок для обсыпки",
        quantity: sandBackfill,
        unit: "м³",
        withReserve: sandBackfill,
        purchaseQty: sandBackfill,
        category: "Обсыпка",
      },
    );
  } else {
    // Eurocubes
    eurocubes = Math.ceil(totalVolume / EUROCUBE_USABLE_M3);
    basePrimary = eurocubes;

    materials.push({
      name: "Еврокубы",
      quantity: eurocubes,
      unit: "шт",
      withReserve: eurocubes,
      purchaseQty: eurocubes,
      category: "Ёмкость",
    });
  }

  /* ─── common materials ─── */
  const pipeSections = Math.ceil(pipeLength * PIPE_RESERVE / PIPE_SECTION_M);
  const elbows = DEFAULT_ELBOWS;
  const tees = DEFAULT_TEES;
  const gravel = GRAVEL_BY_GROUND[groundType] ?? 0;
  const geotextile = groundType >= 1 ? Math.ceil(totalVolume * GEOTEXTILE_FACTOR) : 0;

  materials.push(
    {
      name: "Труба ПВХ ø110 (секции 3 м)",
      quantity: pipeSections,
      unit: "шт",
      withReserve: pipeSections,
      purchaseQty: pipeSections,
      category: "Трубопровод",
    },
    {
      name: "Отводы (колена)",
      quantity: elbows,
      unit: "шт",
      withReserve: elbows,
      purchaseQty: elbows,
      category: "Фасонные",
    },
    {
      name: "Тройники",
      quantity: tees,
      unit: "шт",
      withReserve: tees,
      purchaseQty: tees,
      category: "Фасонные",
    },
  );

  if (gravel > 0) {
    materials.push({
      name: "Щебень фракция 20-40",
      quantity: gravel,
      unit: "м³",
      withReserve: gravel,
      purchaseQty: gravel,
      category: "Дренаж",
    });
  }

  if (geotextile > 0) {
    materials.push({
      name: "Геотекстиль",
      quantity: geotextile,
      unit: "м²",
      withReserve: geotextile,
      purchaseQty: geotextile,
      category: "Дренаж",
    });
  }

  /* ─── scenarios ─── */
  const packageOptions = [{ size: 1, label: "sewage-unit", unit: "шт" }];

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
        `septikType:${septikType}`,
        `chambersCount:${chambersCount}`,
        `groundType:${groundType}`,
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

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (groundType === 2) {
    warnings.push("Глинистый грунт — рекомендуется дренажный тоннель");
  }
  if (residents > spec.warnings_rules.bio_treatment_residents_threshold) {
    warnings.push("Более 10 жителей — рекомендуется станция биологической очистки");
  }
  if (chambersCount === 1) {
    warnings.push("Одна камера — минимум, рекомендуется 2-3 камеры");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      residents,
      septikType,
      chambersCount,
      pipeLength: roundDisplay(pipeLength, 3),
      groundType,
      dailyVolumeLiters,
      totalVolumeLiters,
      totalVolume: roundDisplay(totalVolume, 3),
      volumePerChamber: roundDisplay(volumePerChamber, 3),
      totalRings,
      ringsPerChamber,
      bottomPlates,
      topPlates,
      covers,
      sealingRings,
      septicCount,
      sandBackfill,
      eurocubes,
      pipeSections,
      elbows,
      tees,
      gravel,
      geotextile,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
