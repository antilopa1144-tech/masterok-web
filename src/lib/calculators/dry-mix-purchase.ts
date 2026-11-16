export function roundDryMixValue(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateDryMixPurchase({
  areaM2,
  consumptionRate,
  rateFactor,
  allowancePercent,
  packageWeightKg,
}: {
  areaM2: number;
  consumptionRate: number;
  rateFactor: number;
  allowancePercent: number;
  packageWeightKg: number;
}) {
  const baseNeedKg = roundDryMixValue(areaM2 * consumptionRate * rateFactor, 6);
  const requiredNeedKg = roundDryMixValue(baseNeedKg * (1 + allowancePercent / 100), 6);
  const packageRatio = requiredNeedKg / packageWeightKg;
  const packages = packageRatio > 0 ? Math.ceil(packageRatio - 1e-9) : 0;
  const purchaseKg = roundDryMixValue(packages * packageWeightKg, 6);
  const leftoverKg = roundDryMixValue(Math.max(0, purchaseKg - requiredNeedKg), 6);

  return { baseNeedKg, requiredNeedKg, packages, purchaseKg, leftoverKg };
}
