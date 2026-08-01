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
  sourceUrl: string;
  verifiedAt: "2026-08-01";
  basis: ConsumptionNormBasis;
}

export const CONSUMPTION_NORM_CATALOG = {
  "primer-deep": {
    material: "Грунтовка глубокого проникновения (Ceresit CT 17)",
    range: "0.10–0.20",
    recommended: 0.15,
    unit: "л/м²",
    conditions: "1 слой, впитывающее основание",
    source: "Техкарта Ceresit CT 17",
    sourceUrl: "https://www.ceresit.ru/ru/products/vnutrennyay-otdelka/primers-for-interior/ct_17_transparent/",
    verifiedAt: "2026-08-01",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "primer-contact": {
    material: "Бетоноконтакт (Ceresit CT 19)",
    range: "0.20",
    recommended: 0.2,
    unit: "кг/м²",
    conditions: "1 слой, гладкий бетон",
    source: "Техкарта Ceresit CT 19",
    sourceUrl: "https://www.ceresit.ru/ru/products/tiling/supplementary-materials/ct-19-contact-primer-supercontact/",
    verifiedAt: "2026-08-01",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "plaster-gypsum": {
    material: "Ротбанд (Knauf) гипсовая",
    range: "8.5",
    recommended: 8.5,
    unit: "кг/м²",
    conditions: "Толщина слоя 10 мм",
    source: "Техкарта КНАУФ-Ротбанд",
    sourceUrl: "https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/shtukaturki/knauf-rotband/",
    verifiedAt: "2026-08-01",
    basis: { kind: "thickness", referenceThicknessMm: 10 },
  },
  "plaster-cement": {
    material: "Штукатурка цементная КНАУФ-Унтерпутц",
    range: "17",
    recommended: 17,
    unit: "кг/м²",
    conditions: "Толщина слоя 10 мм",
    source: "Техкарта КНАУФ-Унтерпутц",
    sourceUrl: "https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/knauf-unterputts/",
    verifiedAt: "2026-08-01",
    basis: { kind: "thickness", referenceThicknessMm: 10 },
  },
  "decor-plaster": {
    material: "Декоративная штукатурка Ceresit CT 75 «короед»",
    range: "2.5–2.7",
    recommended: 2.6,
    unit: "кг/м²",
    conditions: "Зерно 2 мм",
    source: "Техкарта Ceresit CT 75",
    sourceUrl: "https://www.ceresit.ru/ru/products/etics/facade-plasters/ct-74-ct-75/",
    verifiedAt: "2026-08-01",
    basis: { kind: "fixed" },
  },
  "putty-start": {
    material: "Шпаклёвка гипсовая КНАУФ-Фуген",
    range: "0.8–1.0",
    recommended: 0.9,
    unit: "кг/м²",
    conditions: "Сплошное шпаклевание, слой 1 мм",
    source: "Техкарта КНАУФ-Фуген",
    sourceUrl: "https://www.knauf.ru/catalog/shpaklyevki/shpaklyevki-gipsovye/knauf-fugen/",
    verifiedAt: "2026-08-01",
    basis: { kind: "thickness", referenceThicknessMm: 1 },
  },
  "putty-finish": {
    material: "Шпаклёвка финишная Vetonit LR+",
    range: "1.2",
    recommended: 1.2,
    unit: "кг/м²",
    conditions: "Слой 1 мм, сухое помещение",
    source: "Техкарта Vetonit LR+",
    sourceUrl: "https://vetonit.com/shtukaturki-i-shpaklevki/shtukaturki-i-shpaklevki/webervetonit-lr",
    verifiedAt: "2026-08-01",
    basis: { kind: "thickness", referenceThicknessMm: 1 },
  },
  "paint-acrylic": {
    material: "Краска интерьерная КНАУФ-Вайсванд",
    range: "0.08–0.10",
    recommended: 0.09,
    unit: "л/м²",
    conditions: "1 слой, шпаклёванная стена",
    source: "Техкарта КНАУФ-Вайсванд",
    sourceUrl: "https://www.knauf.ru/upload/iblock/b1d/rwocjmdq9v2fdvl2wrjgfaaxtpvvlimy/IL-KNAUF_Vaysvand-_02_09_2025_-v03-Preview.pdf",
    verifiedAt: "2026-08-01",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "paint-latex": {
    material: "Краска для потолков КНАУФ-Вайсдэкке",
    range: "0.08–0.09",
    recommended: 0.085,
    unit: "л/м²",
    conditions: "1 слой, гладкое основание",
    source: "Техкарта КНАУФ-Вайсдэкке",
    sourceUrl: "https://www.knauf.ru/catalog/kraski/knauf-vaysdekke/",
    verifiedAt: "2026-08-01",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "paint-facade": {
    material: "Краска фасадная КНАУФ-Фассаденфарбе Акриловая",
    range: "0.10–0.12",
    recommended: 0.11,
    unit: "л/м²",
    conditions: "1 слой, штукатурка",
    source: "Техкарта КНАУФ-Фассаденфарбе",
    sourceUrl: "https://www.knauf.ru/catalog/kraski/knauf-fassadenfarbe-akrilovaya/",
    verifiedAt: "2026-08-01",
    basis: { kind: "layers", referenceLayers: 1 },
  },
  "tile-adhesive-cm11": {
    material: "Ceresit CM 11 (стандартный)",
    range: "3.6",
    recommended: 3.6,
    unit: "кг/м²",
    conditions: "Зубчатый шпатель 8 мм, плитка до 30×30",
    source: "Техкарта Ceresit CM 11",
    sourceUrl: "https://www.ceresit.ru/ru/products/tiling/tile-adhesives/cm_11_pro/",
    verifiedAt: "2026-08-01",
    basis: { kind: "fixed" },
  },
  "tile-adhesive-cm14": {
    material: "Ceresit CM 14 (эластичный)",
    range: "4.4",
    recommended: 4.4,
    unit: "кг/м²",
    conditions: "Плитка до 40 см: шпатель 6×6 мм + слой 1 мм",
    source: "Техкарта Ceresit CM 14",
    sourceUrl: "https://www.ceresit.ru/ru/products/tiling/tile-adhesives/cm_14_extra/",
    verifiedAt: "2026-08-01",
    basis: { kind: "fixed" },
  },
  grout: {
    material: "Затирка цементная Ceresit CE 33",
    range: "0.5",
    recommended: 0.5,
    unit: "кг/м²",
    conditions: "Плитка 30×30 см, шов 6 мм",
    source: "Техкарта Ceresit CE 33",
    sourceUrl: "https://www.ceresit.ru/ru/products/tiling/grouts-and-sealants/ce_33_comfort/",
    verifiedAt: "2026-08-01",
    basis: { kind: "fixed" },
  },
  "self-leveling": {
    material: "Наливной пол тонкослойный",
    range: "1.5",
    recommended: 1.5,
    unit: "кг/м²",
    conditions: "Толщина 1 мм",
    source: "Техкарта Vetonit 3000",
    sourceUrl: "https://vetonit.com/product/vetonit_3000_20kg/",
    verifiedAt: "2026-08-01",
    basis: { kind: "thickness", referenceThicknessMm: 1 },
  },
  "gasblock-glue": {
    material: "Клей для газобетона",
    range: "2.0",
    recommended: 2,
    unit: "кг/м² кладки",
    conditions: "Перегородка 100 мм, блок 600×200 мм, шов 2 мм",
    source: "Техкарта Ceresit CT 21",
    sourceUrl: "https://www.ceresit.ru/ru/products/vnutrennyay-otdelka/plasters-and-putties/ct_21/",
    verifiedAt: "2026-08-01",
    basis: { kind: "fixed" },
  },
  waterproof: {
    material: "Полимерная гидроизоляция Ceresit CL 51",
    range: "1.4",
    recommended: 1.4,
    unit: "кг/м²",
    conditions: "2 слоя, общая толщина около 1 мм",
    source: "Техкарта Ceresit CL 51",
    sourceUrl: "https://www.ceresit.ru/ru/products/waterproofing/waterproofing-materials/cl_51_combo/",
    verifiedAt: "2026-08-01",
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
    sourceUrl: norm.sourceUrl,
    verifiedAt: norm.verifiedAt,
  };
}
