/** Web-адаптер честной закупочной ведомости стяжки. */
import type { CalculatorResult, MaterialResult, SummaryCard } from "../types";

export const READY_MIX_PESKOBETON_M300 = 0;
export const READY_MIX_UNIVERSAL_M200 = 1;

const CEMENT_BAG_WEIGHTS = [25, 40, 50] as const;
const READY_MIX_BAG_WEIGHTS = [20, 25, 30, 40, 50] as const;
const READY_MIX_NAMES: Record<number, string> = {
  [READY_MIX_PESKOBETON_M300]: "Пескобетон М300 для стяжки",
  [READY_MIX_UNIVERSAL_M200]: "Готовая цементно-песчаная смесь М200 для стяжки",
};

function resolvePackageWeight(value: number | undefined, allowed: readonly number[], fallback: number): number {
  const rounded = Math.round(value ?? fallback);
  return allowed.includes(rounded) ? rounded : fallback;
}

function positiveOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Number(value) : fallback;
}

export function applyScreedMix(
  result: CalculatorResult,
  inputs: {
    screedType?: number;
    cementKgPerM3?: number;
    sandKgPerM3?: number;
    readyMix?: number;
    readyConsumptionPer10mm?: number;
    cementBagWeight?: number;
    readyBagWeight?: number;
  },
): CalculatorResult {
  const common = withoutUnsupportedPurchases(result);
  const screedType = Math.round(inputs.screedType ?? 0);
  if (screedType === 0) return applyManualMix(common, inputs);
  if (screedType === 1) return applyReadyMix(common, inputs);
  return applySemiDry(common);
}

function withoutUnsupportedPurchases(result: CalculatorResult): CalculatorResult {
  const excluded = ["Полиэтиленовая плёнка", "Сетка армирующая", "Маячковый профиль", "Демпферная лента", "Фиброволокно"];
  const materials = result.materials.filter((material) => !excluded.some((prefix) => material.name.startsWith(prefix)));
  const staleNotePrefixes = ["Сетка автоматически", "Плёнка автоматически", "Демпферная лента рассчитана", "При вводе только площади", "Маяки оценены"];
  const practicalNotes = (result.practicalNotes ?? []).filter((note) => !staleNotePrefixes.some((prefix) => note.startsWith(prefix)));
  practicalNotes.push("Плёнка, армирование, фибра, демпферная лента и маяки не включены в закупочную ведомость: их необходимость и количество зависят от принятой конструкции пола, фактического периметра и технологии работ.");

  return {
    ...result,
    materials,
    practicalNotes,
    scenarios: undefined,
    accuracyMode: undefined,
    accuracyExplanation: undefined,
    skipScenarioContract: true,
  };
}

function applyManualMix(
  result: CalculatorResult,
  inputs: { cementKgPerM3?: number; sandKgPerM3?: number; cementBagWeight?: number },
): CalculatorResult {
  const volume = result.totals.volume ?? 0;
  const cementKgPerM3 = positiveOr(inputs.cementKgPerM3, 325);
  const sandKgPerM3 = positiveOr(inputs.sandKgPerM3, 1200);
  const bagWeight = resolvePackageWeight(inputs.cementBagWeight, CEMENT_BAG_WEIGHTS, 50);
  const cementKg = round3(volume * cementKgPerM3);
  const cementBags = Math.ceil(cementKg / bagWeight);
  const sandTons = round3(volume * sandKgPerM3 / 1000);
  const materials: MaterialResult[] = [
    {
      name: `Цемент по рабочей рецептуре (мешки ${bagWeight} кг)`,
      subtitle: `Задано ${cementKgPerM3} кг цемента на 1 м³; поле должно совпадать с рабочей рецептурой, а не только с маркой цемента`,
      quantity: cementKg,
      unit: "кг",
      withReserve: cementBags * bagWeight,
      purchaseQty: cementBags * bagWeight,
      packageInfo: { count: cementBags, size: bagWeight, packageUnit: "мешков" },
      category: "Основное",
    },
    {
      name: "Песок по рабочей рецептуре",
      subtitle: `Задано ${sandKgPerM3} кг сухого песка на 1 м³; поставщик может отпускать его по массе или объёму`,
      quantity: sandTons,
      unit: "т",
      withReserve: sandTons,
      purchaseQty: sandTons,
      category: "Основное",
    },
  ];

  return {
    ...result,
    materials,
    totals: { ...result.totals, cementKg, sandTons, cementKgPerM3, sandKgPerM3, cementBagWeight: bagWeight },
    summaryCards: purchaseSummary(cementBags, cementKg, volume),
  };
}

function applyReadyMix(
  result: CalculatorResult,
  inputs: { readyMix?: number; readyConsumptionPer10mm?: number; readyBagWeight?: number },
): CalculatorResult {
  const choice = Math.round(inputs.readyMix ?? READY_MIX_PESKOBETON_M300);
  const name = READY_MIX_NAMES[choice] ?? READY_MIX_NAMES[READY_MIX_PESKOBETON_M300];
  const bagWeight = resolvePackageWeight(inputs.readyBagWeight, READY_MIX_BAG_WEIGHTS, 40);
  const consumption = positiveOr(inputs.readyConsumptionPer10mm, 20);
  const area = result.totals.area ?? 0;
  const thickness = result.totals.thickness ?? 0;
  const exactKg = round3(area * (thickness / 10) * consumption);
  const bags = Math.ceil(exactKg / bagWeight);
  const volume = result.totals.volume ?? 0;
  const materials: MaterialResult[] = [{
    name: `${name} (мешки ${bagWeight} кг)`,
    subtitle: `Расход из поля: ${consumption} кг/м² при слое 10 мм. Сверьте его и допустимую толщину с упаковкой конкретного продукта`,
    quantity: exactKg,
    unit: "кг",
    withReserve: bags * bagWeight,
    purchaseQty: bags * bagWeight,
    packageInfo: { count: bags, size: bagWeight, packageUnit: "мешков" },
    category: "Основное",
  }];

  return {
    ...result,
    materials,
    totals: { ...result.totals, cpsKg: exactKg, readyMix: choice, readyConsumptionPer10mm: consumption, readyBagWeight: bagWeight },
    summaryCards: purchaseSummary(bags, exactKg, volume),
  };
}

function applySemiDry(result: CalculatorResult): CalculatorResult {
  const volume = round3(result.totals.volume ?? 0);
  const material: MaterialResult = {
    name: "Расчётный объём полусухой стяжки",
    subtitle: "Передайте площадь, полную толщину и объём исполнителю; массу компонентов, фибру и схему поставки определяет его рабочая рецептура",
    quantity: volume,
    unit: "м³",
    withReserve: volume,
    purchaseQty: volume,
    category: "Основное",
  };
  return {
    ...result,
    materials: [material],
    totals: { ...result.totals, semidryEstimatedKg: 0 },
    summaryCards: [
      { icon: "📐", label: "Площадь", value: formatRu(result.totals.area ?? 0), unit: "м²", tone: "slate" },
      { icon: "↕️", label: "Полная толщина", value: formatRu(result.totals.thickness ?? 0), unit: "мм", tone: "amber" },
      { icon: "🧱", label: "Расчётный объём", value: formatRu(volume), unit: "м³", hint: "для согласования с бригадой", tone: "emerald" },
    ],
  };
}

function purchaseSummary(packages: number, exactKg: number, volume: number): SummaryCard[] {
  return [
    { icon: "🛒", label: "К покупке", value: String(packages), unit: "мешков", tone: "emerald" },
    { icon: "⚖️", label: "Расчётная масса", value: formatRu(exactKg), unit: "кг", tone: "amber" },
    { icon: "🧱", label: "Плановый объём", value: formatRu(volume), unit: "м³", tone: "slate" },
  ];
}

function formatRu(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
