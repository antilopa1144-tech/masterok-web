export function roundPuttyValue(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculatePuttyPurchase({
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
  const baseNeedKg = roundPuttyValue(areaM2 * consumptionRate * rateFactor, 6);
  const requiredNeedKg = roundPuttyValue(baseNeedKg * (1 + allowancePercent / 100), 6);
  const packageRatio = requiredNeedKg / packageWeightKg;
  const packages = packageRatio > 0 ? Math.ceil(packageRatio - 1e-9) : 0;
  const purchaseKg = roundPuttyValue(packages * packageWeightKg, 6);
  const leftoverKg = roundPuttyValue(Math.max(0, purchaseKg - requiredNeedKg), 6);

  return { baseNeedKg, requiredNeedKg, packages, purchaseKg, leftoverKg };
}
