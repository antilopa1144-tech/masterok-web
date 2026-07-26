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

const LAYERS_1 = { kind: "layers", label: "Количество слоёв", resultLabel: "Слоёв", defaultValue: 1, min: 1, max: 5, step: 1, quickValues: [1, 2, 3] } as const;
const LAYERS_2 = { ...LAYERS_1, defaultValue: 2 } as const;
const FIXED = { kind: "fixed", defaultValue: 1 } as const;

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

export const COVERAGE_MATERIALS: CoverageMaterial[] = [
  { id: "paint-acrylic", name: "Краска акриловая", icon: "🎨", unit: "л", consumptionPerM2: 0.15, description: "0.12–0.18 л/м² на слой", adjustment: LAYERS_2, density: 1.3 },
  { id: "paint-latex", name: "Краска латексная", icon: "🎨", unit: "л", consumptionPerM2: 0.12, description: "0.10–0.14 л/м² на слой", adjustment: LAYERS_2, density: 1.35 },
  { id: "paint-facade", name: "Краска фасадная", icon: "🎨", unit: "л", consumptionPerM2: 0.2, description: "0.15–0.25 л/м² на слой", adjustment: LAYERS_2, density: 1.4 },
  { id: "primer-deep", name: "Грунтовка глубокого проникновения", icon: "💧", unit: "л", consumptionPerM2: 0.15, description: "0.10–0.20 л/м² на слой", adjustment: LAYERS_1, density: 1.05 },
  { id: "primer-contact", name: "Бетоноконтакт", icon: "💧", unit: "кг", consumptionPerM2: 0.3, description: "0.25–0.35 кг/м² на слой", adjustment: LAYERS_1 },
  { id: "primer-wood", name: "Грунтовка для дерева", icon: "💧", unit: "л", consumptionPerM2: 0.1, description: "0.08–0.12 л/м² на слой", adjustment: LAYERS_1, density: 1 },
  { id: "putty-start", name: "Шпаклёвка стартовая", icon: "🪣", unit: "кг", consumptionPerM2: 1.5, description: "1.0–2.0 кг/м² при толщине 1 мм", adjustment: thickness(1, 1, [0.5, 1, 2, 3], 10) },
  { id: "putty-finish", name: "Шпаклёвка финишная", icon: "🪣", unit: "кг", consumptionPerM2: 0.8, description: "0.5–1.0 кг/м² при толщине 0.5 мм", adjustment: thickness(0.5, 0.5, [0.5, 1, 1.5, 2], 5) },
  { id: "plaster-gypsum", name: "Штукатурка гипсовая (Ротбанд)", icon: "🧱", unit: "кг", consumptionPerM2: 8.5, description: "8–9 кг/м² при толщине 10 мм", adjustment: thickness(10, 10, [5, 10, 15, 20], 50) },
  { id: "plaster-cement", name: "Штукатурка цементная", icon: "🧱", unit: "кг", consumptionPerM2: 16, description: "14–18 кг/м² при толщине 10 мм", adjustment: thickness(10, 10, [5, 10, 15, 20], 50) },
  { id: "decor-plaster", name: "Декоративная штукатурка (короед)", icon: "🧱", unit: "кг", consumptionPerM2: 3, description: "2.5–4.0 кг/м², зерно 2 мм", adjustment: FIXED },
  { id: "tile-adhesive-cm11", name: "Плиточный клей Ceresit CM 11", icon: "⬜", unit: "кг", consumptionPerM2: 3.5, description: "3–4 кг/м², шпатель 8 мм", adjustment: FIXED },
  { id: "tile-adhesive-cm14", name: "Плиточный клей Ceresit CM 14", icon: "⬜", unit: "кг", consumptionPerM2: 4.5, description: "3.5–5 кг/м², шпатель 10 мм", adjustment: FIXED },
  { id: "gasblock-glue", name: "Клей для газоблоков", icon: "🧱", unit: "кг", consumptionPerM2: 1.8, description: "1.5–2.0 кг/м² кладки, шов 2–3 мм", adjustment: FIXED },
  { id: "grout", name: "Затирка для плитки", icon: "🔲", unit: "кг", consumptionPerM2: 0.4, description: "0.3–0.5 кг/м² для типовой плитки и шва", adjustment: FIXED },
  { id: "wallpaper-glue", name: "Клей обойный (разведённый)", icon: "📜", unit: "л", consumptionPerM2: 0.2, description: "0.15–0.25 л/м² при нанесении на стену", adjustment: FIXED, density: 1 },
  { id: "self-leveling", name: "Наливной пол", icon: "🏗️", unit: "кг", consumptionPerM2: 1.6, description: "1.5–1.8 кг/м² на 1 мм толщины", adjustment: thickness(10, 1, [3, 5, 10, 20], 100) },
  { id: "screed-m300", name: "Пескобетон М300 (стяжка)", icon: "🏗️", unit: "кг", consumptionPerM2: 20, description: "Около 20 кг/м² при толщине 10 мм", adjustment: thickness(10, 10, [10, 30, 50, 70], 150) },
  { id: "waterproof", name: "Гидроизоляция обмазочная", icon: "🛡️", unit: "кг", consumptionPerM2: 1.5, description: "Около 1.5 кг/м² на слой; обычно наносят 2 слоя", adjustment: LAYERS_2 },
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
