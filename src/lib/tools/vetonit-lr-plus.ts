import { calculateDryMixPurchase } from "@/lib/calculators/dry-mix-purchase";
import { getConsumptionNorm, getConsumptionPerAdjustment } from "./consumption-norms";

export const VETONIT_LR_PLUS_PATH = "/raskhod/vetonit-lr-plus/";
export const VETONIT_LR_PLUS_TECH_SHEET =
  "https://vetonit.com/upload/iblock/f70/hhwr403nfh91lfktgw6b47uaivg2vsq3.pdf";
export const VETONIT_LR_PLUS_RATE = getConsumptionPerAdjustment(getConsumptionNorm("putty-finish"));
export const VETONIT_LR_PLUS_LAYER = { min: 1, max: 5 };
export const VETONIT_LR_PLUS_BAGS = [5, 20] as const;

export type VetonitBagWeight = (typeof VETONIT_LR_PLUS_BAGS)[number];

export const formatVetonitNumber = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 6,
}).format;

export function calculateVetonitLrPlus(
  areaM2: number,
  thicknessMm: number,
  packageWeightKg: VetonitBagWeight,
) {
  return calculateDryMixPurchase({
    areaM2,
    consumptionRate: VETONIT_LR_PLUS_RATE,
    rateFactor: thicknessMm,
    allowancePercent: 0,
    packageWeightKg,
  });
}
