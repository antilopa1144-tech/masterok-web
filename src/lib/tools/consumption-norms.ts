export type ConsumptionNormBasis =
  | { kind: "layers"; referenceLayers: number }
  | { kind: "thickness"; referenceThicknessMm: number }
  | { kind: "fixed" };

export interface ConsumptionNorm {
  material: string;
  range: string;
  recommended: number;
  unit: "л/м²" | "кг/м²" | "кг/м² кладки";
  conditions: string;
  source: string;
  basis: ConsumptionNormBasis;
}

export const CONSUMPTION_NORM_CATALOG = {
  "primer-deep": {
    material: "Грунтовка глубокого проникновения (Ceresit CT 17)",
    range: "0.10–0.20",
    recommended: 0.15,
    unit: "л/м²",
    conditions: "1 слой, впитывающее основание",
    source: "Паспорт Ceresit",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "primer-contact": {
    material: "Бетоноконтакт (Ceresit CT 19)",
    range: "0.25–0.35",
    recommended: 0.3,
    unit: "кг/м²",
    conditions: "1 слой, гладкий бетон",
    source: "Паспорт Ceresit",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "plaster-gypsum": {
    material: "Ротбанд (Knauf) гипсовая",
    range: "8.5",
    recommended: 8.5,
    unit: "кг/м²",
    conditions: "Толщина слоя 10 мм",
    source: "Паспорт Knauf",
    basis: { kind: "thickness", referenceThicknessMm: 10 },
  },
  "plaster-cement": {
    material: "Штукатурка цементная",
    range: "14–18",
    recommended: 16,
    unit: "кг/м²",
    conditions: "Толщина слоя 10 мм",
    source: "СП 71.13330.2017",
    basis: { kind: "thickness", referenceThicknessMm: 10 },
  },
  "decor-plaster": {
    material: "Декоративная штукатурка (короед)",
    range: "2.5–4.0",
    recommended: 3,
    unit: "кг/м²",
    conditions: "Зерно 2–3 мм",
    source: "Паспорт производителя",
    basis: { kind: "fixed" },
  },
  "putty-start": {
    material: "Шпаклёвка стартовая",
    range: "1.0–2.0",
    recommended: 1.5,
    unit: "кг/м²",
    conditions: "Слой 1 мм, гипсовое основание",
    source: "Паспорт Knauf Fugen",
    basis: { kind: "thickness", referenceThicknessMm: 1 },
  },
  "putty-finish": {
    material: "Шпаклёвка финишная",
    range: "0.5–1.0",
    recommended: 0.8,
    unit: "кг/м²",
    conditions: "Слой 0.5 мм, подготовленная поверхность",
    source: "Паспорт Vetonit LR+",
    basis: { kind: "thickness", referenceThicknessMm: 0.5 },
  },
  "paint-acrylic": {
    material: "Краска акриловая интерьерная",
    range: "0.12–0.18",
    recommended: 0.15,
    unit: "л/м²",
    conditions: "1 слой, шпаклёванная стена",
    source: "ГОСТ 28196-89",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "paint-latex": {
    material: "Краска латексная",
    range: "0.10–0.14",
    recommended: 0.12,
    unit: "л/м²",
    conditions: "1 слой, гладкое основание",
    source: "Паспорт производителя",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "paint-facade": {
    material: "Краска фасадная",
    range: "0.15–0.25",
    recommended: 0.2,
    unit: "л/м²",
    conditions: "1 слой, штукатурка",
    source: "ГОСТ 28196-89",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "tile-adhesive-cm11": {
    material: "Ceresit CM 11 (стандартный)",
    range: "3.0–4.0",
    recommended: 3.5,
    unit: "кг/м²",
    conditions: "Зубчатый шпатель 8 мм, плитка до 30×30",
    source: "Паспорт Ceresit",
    basis: { kind: "fixed" },
  },
  "tile-adhesive-cm14": {
    material: "Ceresit CM 14 (эластичный)",
    range: "3.5–5.0",
    recommended: 4.5,
    unit: "кг/м²",
    conditions: "Зубчатый шпатель 10 мм, плитка 30×60",
    source: "Паспорт Ceresit",
    basis: { kind: "fixed" },
  },
  grout: {
    material: "Затирка цементная (шов 2 мм)",
    range: "0.3–0.5",
    recommended: 0.4,
    unit: "кг/м²",
    conditions: "Плитка 30×30, шов 2 мм",
    source: "Паспорт Ceresit CE 33",
    basis: { kind: "fixed" },
  },
  "self-leveling": {
    material: "Наливной пол тонкослойный",
    range: "1.5–1.8",
    recommended: 1.6,
    unit: "кг/м²",
    conditions: "Толщина 1 мм",
    source: "Паспорт Vetonit 3000",
    basis: { kind: "thickness", referenceThicknessMm: 1 },
  },
  "gasblock-glue": {
    material: "Клей для газобетона",
    range: "1.5–2.0",
    recommended: 1.8,
    unit: "кг/м² кладки",
    conditions: "Шов 2–3 мм, зубчатый шпатель",
    source: "Паспорт Ceresit CT 21",
    basis: { kind: "fixed" },
  },
  waterproof: {
    material: "Обмазочная мастика (Ceresit CR 65)",
    range: "2.5–3.5",
    recommended: 3,
    unit: "кг/м²",
    conditions: "2 слоя по 1.5 кг/м²",
    source: "Паспорт Ceresit",
    basis: { kind: "layers", referenceLayers: 2 },
  },
} as const satisfies Record<string, ConsumptionNorm>;

export type ConsumptionNormId = keyof typeof CONSUMPTION_NORM_CATALOG;

export const CONSUMPTION_NORM_IDS = Object.keys(
  CONSUMPTION_NORM_CATALOG,
) as ConsumptionNormId[];

export function getConsumptionNorm(id: ConsumptionNormId): ConsumptionNorm {
  return CONSUMPTION_NORM_CATALOG[id];
}

export function getConsumptionPerAdjustment(norm: ConsumptionNorm): number {
  return norm.basis.kind === "layers"
    ? norm.recommended / norm.basis.referenceLayers
    : norm.recommended;
}

export function formatConsumptionNormSummary(norm: ConsumptionNorm): string {
  return `${norm.range} ${norm.unit}; ${norm.conditions}`;
}

export function consumptionNormRow(id: ConsumptionNormId) {
  const norm = getConsumptionNorm(id);
  return {
    normId: id,
    material: norm.material,
    consumption: norm.range,
    unit: norm.unit,
    conditions: norm.conditions,
    source: norm.source,
  };
}
