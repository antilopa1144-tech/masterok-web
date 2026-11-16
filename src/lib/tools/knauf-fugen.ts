import { calculateDryMixPurchase } from "@/lib/calculators/dry-mix-purchase";
import { getConsumptionNorm } from "./consumption-norms";

export const FUGEN_PATH = "/raskhod/knauf-fugen/";
export const FUGEN_TECH_SHEET =
  "https://www.knauf.ru/upload/iblock/d54/s3vq1z4wsuh4e3a81gtzl5pp15z2gv2a/07-IL-KNAUF_Fugen-_02_09_2025_-v04-Preview.pdf";
export const FUGEN_PRODUCT_CARD = getConsumptionNorm("putty-start").sourceUrl;
export const FUGEN_THICKNESS_MM = { min: 1, max: 5 };
export const FUGEN_BAG_WEIGHTS_KG = [5, 10, 25] as const;

export const FUGEN_WORK = {
  surface: { label: "Сплошной слой (Q3)", rate: [0.8, 1] },
  gkl: { label: "Заделка стыков ГКЛ (Q1)", rate: [0.25, 0.25] },
  gvl: { label: "Заделка стыков ГВЛ (Q1)", rate: [0.3, 0.6] },
  gklWide: { label: "Стыки ГКЛ (Q2)", rate: [0.6, 0.6] },
} as const;

export type FugenWork = keyof typeof FUGEN_WORK;
export type FugenBagWeight = (typeof FUGEN_BAG_WEIGHTS_KG)[number];

type FugenInputs = { areaM2: number; bagWeightKg: FugenBagWeight } & (
  | { work: "surface"; thicknessMm: number }
  | { work: Exclude<FugenWork, "surface"> }
);

const formatQuantity = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format;

export function formatFugenRange(lower: number, upper = lower): string {
  return lower === upper ? formatQuantity(lower) : `${formatQuantity(lower)}–${formatQuantity(upper)}`;
}

export function calculateFugenPurchase(inputs: FugenInputs) {
  const [lowerRate, upperRate] = FUGEN_WORK[inputs.work].rate;
  const calculateAtRate = (consumptionRate: number) => calculateDryMixPurchase({
    areaM2: inputs.areaM2,
    consumptionRate,
    rateFactor: inputs.work === "surface" ? inputs.thicknessMm : 1,
    allowancePercent: 0,
    packageWeightKg: inputs.bagWeightKg,
  });
  const lower = calculateAtRate(lowerRate);
  const upper = lowerRate === upperRate ? lower : calculateAtRate(upperRate);

  return { lower, upper };
}
