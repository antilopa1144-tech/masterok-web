import { calculateDryMixPurchase } from "@/lib/calculators/dry-mix-purchase";
import { getConsumptionNorm } from "./consumption-norms";

export const UNTERPUTTS_PATH = "/raskhod/knauf-unterputts/";
export const UNTERPUTTS_TECH_SHEET =
  "https://www.knauf.ru/upload/iblock/149/ra949id1hdxjdskg1ss6pesozo7pe4yj/19_IL_KNAUF_Unterputts_25_03_2025_v01_Preview.pdf";
export const UNTERPUTTS_REFERENCE_THICKNESS_MM = 10;
export const UNTERPUTTS_RATE_KG_M2 = getConsumptionNorm("plaster-cement").recommended;
export const UNTERPUTTS_LAYER_MM = { min: 10, max: 35 };
export const UNTERPUTTS_BAG_KG = 25;

export const formatUnterputtsNumber = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 6,
}).format;

export function calculateUnterputtsPurchase(areaM2: number, thicknessMm: number) {
  return calculateDryMixPurchase({
    areaM2,
    consumptionRate: UNTERPUTTS_RATE_KG_M2,
    rateFactor: thicknessMm / UNTERPUTTS_REFERENCE_THICKNESS_MM,
    allowancePercent: 0,
    packageWeightKg: UNTERPUTTS_BAG_KG,
  });
}
