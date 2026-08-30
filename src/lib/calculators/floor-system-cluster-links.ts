export const SCREED_CALCULATOR_PATH = "/kalkulyatory/poly/styazhka/";
export const ELECTRIC_FLOOR_CALCULATOR_PATH = "/kalkulyatory/inzhenernye/teplyy-pol/";
export const SCREED_TRANSFER_FROM = "teplyy-pol";
export const ELECTRIC_FLOOR_TRANSFER_FROM = "styazhka";

function roundArea(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** Передаёт только общую площадь помещения, не подменяя ею площадь нагрева. */
export function buildElectricFloorHrefFromScreedResult(
  totals: Record<string, number> | undefined,
): string | null {
  if (!totals) return null;
  const area = Number(totals.area);
  if (!Number.isFinite(area) || area < 1 || area > 500) {
    return ELECTRIC_FLOOR_CALCULATOR_PATH;
  }

  const params = new URLSearchParams();
  params.set("from", ELECTRIC_FLOOR_TRANSFER_FROM);
  params.set("roomAreaM2", String(roundArea(area)));
  return `${ELECTRIC_FLOOR_CALCULATOR_PATH}?${params.toString()}`;
}

/** Для стяжки используется площадь комнаты, а не меньшая площадь раскладки нагрева. */
export function buildScreedHrefFromElectricFloorResult(
  totals: Record<string, number> | undefined,
): string | null {
  if (!totals) return null;
  const roomArea = Number(totals.roomArea);
  if (!Number.isFinite(roomArea) || roomArea < 1 || roomArea > 1000) {
    return SCREED_CALCULATOR_PATH;
  }

  const params = new URLSearchParams();
  params.set("from", SCREED_TRANSFER_FROM);
  params.set("inputMode", "1");
  params.set("area", String(roundArea(roomArea)));
  return `${SCREED_CALCULATOR_PATH}?${params.toString()}`;
}
