import {
  formatConsumptionNormSummary,
  getConsumptionNorm,
  getConsumptionPerAdjustment,
  type ConsumptionNormId,
} from "@/lib/tools/consumption-norms";

export type CoverageAdjustment =
  | {
      kind: "layers";
      label: "Количество слоёв";
      resultLabel: "Слоёв";
      defaultValue: number;
      min: number;
      max: number;
      step: 1;
      quickValues: readonly number[];
    }
  | {
      kind: "thickness";
      label: "Толщина слоя";
      resultLabel: "Толщина";
      defaultValue: number;
      min: number;
      max: number;
      step: number;
      unit: "мм";
      referenceValue: number;
      quickValues: readonly number[];
    }
  | {
      kind: "fixed";
      defaultValue: 1;
    };

export interface CoverageMaterial {
  id: string;
  normId?: ConsumptionNormId;
  name: string;
  icon: string;
  unit: "л" | "кг";
  consumptionPerM2: number;
  description: string;
  adjustment: CoverageAdjustment;
  density?: number;
}

export interface ReverseCoverageResult {
  area: number;
  roomSide: number;
  consumptionPerM2: number;
  adjustmentValue: number;
  amountInKilograms?: number;
  amountInLiters?: number;
}

const FIXED = { kind: "fixed", defaultValue: 1 } as const;

function layers(defaultValue: number): CoverageAdjustment {
  return {
    kind: "layers",
    label: "Количество слоёв",
    resultLabel: "Слоёв",
    defaultValue,
    min: 1,
    max: 5,
    step: 1,
    quickValues: [1, 2, 3],
  };
}

function thickness(
  defaultValue: number,
  referenceValue: number,
  quickValues: readonly number[],
  max: number,
): CoverageAdjustment {
  return {
    kind: "thickness",
    label: "Толщина слоя",
    resultLabel: "Толщина",
    defaultValue,
    min: 0.5,
    max,
    step: 0.5,
    unit: "мм",
    referenceValue,
    quickValues,
  };
}

function materialFromNorm({
  normId,
  name,
  icon,
  defaultAdjustment,
  quickValues,
  max,
  density,
}: {
  normId: ConsumptionNormId;
  name: string;
  icon: string;
  defaultAdjustment?: number;
  quickValues?: readonly number[];
  max?: number;
  density?: number;
}): CoverageMaterial {
  const norm = getConsumptionNorm(normId);
  const adjustment = norm.basis.kind === "layers"
    ? layers(defaultAdjustment ?? norm.basis.referenceLayers)
    : norm.basis.kind === "thickness"
      ? thickness(
          defaultAdjustment ?? norm.basis.referenceThicknessMm,
          norm.basis.referenceThicknessMm,
          quickValues ?? [norm.basis.referenceThicknessMm],
          max ?? 100,
        )
      : FIXED;

  return {
    id: normId,
    normId,
    name,
    icon,
    unit: norm.unit.startsWith("л") ? "л" : "кг",
    consumptionPerM2: getConsumptionPerAdjustment(norm),
    description: formatConsumptionNormSummary(norm),
    adjustment,
    density,
  };
}

export const COVERAGE_MATERIALS: CoverageMaterial[] = [
  materialFromNorm({ normId: "paint-acrylic", name: "Краска акриловая", icon: "🎨", defaultAdjustment: 2, density: 1.3 }),
  materialFromNorm({ normId: "paint-latex", name: "Краска латексная", icon: "🎨", defaultAdjustment: 2, density: 1.35 }),
  materialFromNorm({ normId: "paint-facade", name: "Краска фасадная", icon: "🎨", defaultAdjustment: 2, density: 1.4 }),
  materialFromNorm({ normId: "primer-deep", name: "Грунтовка глубокого проникновения", icon: "💧", density: 1.05 }),
  materialFromNorm({ normId: "primer-contact", name: "Бетоноконтакт", icon: "💧" }),
  { id: "primer-wood", name: "Грунтовка для дерева", icon: "💧", unit: "л", consumptionPerM2: 0.1, description: "0.08–0.12 л/м² на слой", adjustment: layers(1), density: 1 },
  materialFromNorm({ normId: "putty-start", name: "Шпаклёвка стартовая", icon: "🪣", defaultAdjustment: 1, quickValues: [0.5, 1, 2, 3], max: 10 }),
  materialFromNorm({ normId: "putty-finish", name: "Шпаклёвка финишная", icon: "🪣", defaultAdjustment: 0.5, quickValues: [0.5, 1, 1.5, 2], max: 5 }),
  materialFromNorm({ normId: "plaster-gypsum", name: "Штукатурка гипсовая (Ротбанд)", icon: "🧱", defaultAdjustment: 10, quickValues: [5, 10, 15, 20], max: 50 }),
  materialFromNorm({ normId: "plaster-cement", name: "Штукатурка цементная", icon: "🧱", defaultAdjustment: 10, quickValues: [5, 10, 15, 20], max: 50 }),
  materialFromNorm({ normId: "decor-plaster", name: "Декоративная штукатурка (короед)", icon: "🧱" }),
  materialFromNorm({ normId: "tile-adhesive-cm11", name: "Плиточный клей Ceresit CM 11", icon: "⬜" }),
  materialFromNorm({ normId: "tile-adhesive-cm14", name: "Плиточный клей Ceresit CM 14", icon: "⬜" }),
  materialFromNorm({ normId: "gasblock-glue", name: "Клей для газоблоков", icon: "🧱" }),
  materialFromNorm({ normId: "grout", name: "Затирка для плитки", icon: "🔲" }),
  { id: "wallpaper-glue", name: "Клей обойный (разведённый)", icon: "📜", unit: "л", consumptionPerM2: 0.2, description: "0.15–0.25 л/м² при нанесении на стену", adjustment: FIXED, density: 1 },
  materialFromNorm({ normId: "self-leveling", name: "Наливной пол", icon: "🏗️", defaultAdjustment: 10, quickValues: [3, 5, 10, 20], max: 100 }),
  { id: "screed-m300", name: "Пескобетон М300 (стяжка)", icon: "🏗️", unit: "кг", consumptionPerM2: 20, description: "Около 20 кг/м² при толщине 10 мм", adjustment: thickness(10, 10, [10, 30, 50, 70], 150) },
  materialFromNorm({ normId: "waterproof", name: "Гидроизоляция обмазочная", icon: "🛡️", defaultAdjustment: 2 }),
  { id: "cement", name: "Цемент М500", icon: "🏗️", unit: "кг", consumptionPerM2: 5, description: "Около 5 кг/м² в составе раствора толщиной 10 мм", adjustment: thickness(10, 10, [10, 20, 30, 50], 100) },
  { id: "sand", name: "Песок строительный", icon: "🏗️", unit: "кг", consumptionPerM2: 15, description: "Около 15 кг/м² в составе раствора толщиной 10 мм", adjustment: thickness(10, 10, [10, 20, 30, 50], 100) },
];

export function getCoverageMaterial(id: string): CoverageMaterial {
  return COVERAGE_MATERIALS.find((material) => material.id === id) ?? COVERAGE_MATERIALS[0];
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function normalizeCoverageAdjustment(
  material: CoverageMaterial,
  value: number | undefined,
): number {
  const adjustment = material.adjustment;
  if (adjustment.kind === "fixed") return adjustment.defaultValue;

  const finiteValue = Number.isFinite(value) ? value! : adjustment.defaultValue;
  const normalizedValue = adjustment.kind === "layers"
    ? Math.round(finiteValue)
    : finiteValue;

  return Math.min(adjustment.max, Math.max(adjustment.min, normalizedValue));
}

export function calculateReverseCoverage({
  material,
  amount,
  adjustmentValue,
}: {
  material: CoverageMaterial;
  amount: number;
  adjustmentValue?: number;
}): ReverseCoverageResult {
  const normalizedAmount = positive(amount);
  const normalizedAdjustment = normalizeCoverageAdjustment(material, adjustmentValue);
  const adjustmentFactor = material.adjustment.kind === "fixed"
    ? 1
    : material.adjustment.kind === "layers"
      ? normalizedAdjustment
      : normalizedAdjustment / material.adjustment.referenceValue;
  const consumptionPerM2 = positive(material.consumptionPerM2) * adjustmentFactor;
  const area = consumptionPerM2 > 0 ? normalizedAmount / consumptionPerM2 : 0;

  return {
    area,
    roomSide: Math.sqrt(area),
    consumptionPerM2,
    adjustmentValue: normalizedAdjustment,
    amountInKilograms:
      material.density && material.unit === "л"
        ? normalizedAmount * material.density
        : undefined,
    amountInLiters:
      material.density && material.unit === "кг"
        ? normalizedAmount / material.density
        : undefined,
  };
}

export function formatCoverageArea(area: number): string {
  if (area < 1) return `${(Math.max(0, area) * 10_000).toFixed(0)} см²`;
  return `${area.toFixed(1)} м²`;
}
