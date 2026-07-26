export interface CoverageMaterial {
  id: string;
  name: string;
  icon: string;
  unit: "л" | "кг";
  consumptionPerM2: number;
  description: string;
  layers: number;
  density?: number;
}

export interface ReverseCoverageResult {
  area: number;
  roomSide: number;
  consumptionPerM2: number;
  amountInKilograms?: number;
  amountInLiters?: number;
}

export const COVERAGE_MATERIALS: CoverageMaterial[] = [
  { id: "paint-acrylic", name: "Краска акриловая", icon: "🎨", unit: "л", consumptionPerM2: 0.15, description: "0.12-0.18 л/м² на слой", layers: 2, density: 1.3 },
  { id: "paint-latex", name: "Краска латексная", icon: "🎨", unit: "л", consumptionPerM2: 0.12, description: "0.10-0.14 л/м² на слой", layers: 2, density: 1.35 },
  { id: "paint-facade", name: "Краска фасадная", icon: "🎨", unit: "л", consumptionPerM2: 0.2, description: "0.15-0.25 л/м² на слой", layers: 2, density: 1.4 },
  { id: "primer-deep", name: "Грунтовка глубокого проникновения", icon: "💧", unit: "л", consumptionPerM2: 0.15, description: "0.10-0.20 л/м²", layers: 1, density: 1.05 },
  { id: "primer-contact", name: "Бетоноконтакт", icon: "💧", unit: "кг", consumptionPerM2: 0.3, description: "0.25-0.35 кг/м²", layers: 1 },
  { id: "primer-wood", name: "Грунтовка для дерева", icon: "💧", unit: "л", consumptionPerM2: 0.1, description: "0.08-0.12 л/м²", layers: 1, density: 1 },
  { id: "putty-start", name: "Шпаклёвка стартовая", icon: "🪣", unit: "кг", consumptionPerM2: 1.5, description: "1.0-2.0 кг/м² слой 1мм", layers: 1 },
  { id: "putty-finish", name: "Шпаклёвка финишная", icon: "🪣", unit: "кг", consumptionPerM2: 0.8, description: "0.5-1.0 кг/м² слой 0.5мм", layers: 1 },
  { id: "plaster-gypsum", name: "Штукатурка гипсовая (Ротбанд)", icon: "🧱", unit: "кг", consumptionPerM2: 8.5, description: "8-9 кг/м² слой 10мм", layers: 1 },
  { id: "plaster-cement", name: "Штукатурка цементная", icon: "🧱", unit: "кг", consumptionPerM2: 16, description: "14-18 кг/м² слой 10мм", layers: 1 },
  { id: "decor-plaster", name: "Декоративная штукатурка (короед)", icon: "🧱", unit: "кг", consumptionPerM2: 3, description: "2.5-4.0 кг/м², зерно 2мм", layers: 1 },
  { id: "tile-adhesive-cm11", name: "Плиточный клей Ceresit CM 11", icon: "⬜", unit: "кг", consumptionPerM2: 3.5, description: "3-4 кг/м² шпатель 8мм", layers: 1 },
  { id: "tile-adhesive-cm14", name: "Плиточный клей Ceresit CM 14", icon: "⬜", unit: "кг", consumptionPerM2: 4.5, description: "3.5-5 кг/м² шпатель 10мм", layers: 1 },
  { id: "gasblock-glue", name: "Клей для газоблоков", icon: "🧱", unit: "кг", consumptionPerM2: 1.8, description: "1.5-2.0 кг/м² кладки, шов 2-3мм", layers: 1 },
  { id: "grout", name: "Затирка для плитки", icon: "🔲", unit: "кг", consumptionPerM2: 0.4, description: "0.3-0.5 кг/м²", layers: 1 },
  { id: "wallpaper-glue", name: "Клей обойный (разведённый)", icon: "📜", unit: "л", consumptionPerM2: 0.2, description: "0.15-0.25 л/м²", layers: 1, density: 1 },
  { id: "self-leveling", name: "Наливной пол", icon: "🏗️", unit: "кг", consumptionPerM2: 16, description: "1.5-1.8 кг/м² на 1мм (слой 10мм)", layers: 1 },
  { id: "screed-m300", name: "Пескобетон М300 (стяжка)", icon: "🏗️", unit: "кг", consumptionPerM2: 20, description: "~20 кг/м² на 10мм толщины", layers: 1 },
  { id: "waterproof", name: "Гидроизоляция обмазочная", icon: "🛡️", unit: "кг", consumptionPerM2: 1.5, description: "1.0-2.0 кг/м² за 2 слоя", layers: 2 },
  { id: "cement", name: "Цемент М500", icon: "🏗️", unit: "кг", consumptionPerM2: 5, description: "~5 кг/м² при замесе раствора слоем 10мм", layers: 1 },
  { id: "sand", name: "Песок строительный", icon: "🏗️", unit: "кг", consumptionPerM2: 15, description: "~15 кг/м² при замесе раствора слоем 10мм", layers: 1 },
];

export function getCoverageMaterial(id: string): CoverageMaterial {
  return COVERAGE_MATERIALS.find((material) => material.id === id) ?? COVERAGE_MATERIALS[0];
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateReverseCoverage({
  material,
  amount,
  layers,
}: {
  material: CoverageMaterial;
  amount: number;
  layers: number;
}): ReverseCoverageResult {
  const normalizedAmount = positive(amount);
  const normalizedLayers = Math.max(1, Math.round(positive(layers)));
  const consumptionPerM2 = positive(material.consumptionPerM2) * normalizedLayers;
  const area = consumptionPerM2 > 0 ? normalizedAmount / consumptionPerM2 : 0;

  return {
    area,
    roomSide: Math.sqrt(area),
    consumptionPerM2,
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
