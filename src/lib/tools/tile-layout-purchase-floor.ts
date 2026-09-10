import type { CalculatorResult, CalculatorScenario } from "@/lib/calculators/types";

/**
 * Раскладка знает реальные подрезки, а площадная модель — нет. При переходе
 * "Раскладка плитки → калькулятор плитки" она задаёт нижнюю границу покупки:
 * нельзя советовать меньше коробок, чем требует уже построенная схема.
 *
 * Это web-адаптер конкретного перехода, а не изменение canonical-формулы
 * калькулятора: без `from=raskladka` и подтверждённой фасовки результат не
 * меняется.
 */
function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isSameNumber(left: number, right: number, tolerance = 0.01): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function stillMatchesTransferredLayout(result: CalculatorResult, searchParams: URLSearchParams): boolean {
  const expectedAreaRaw = searchParams.get("area");
  const expectedTileWidthRaw = searchParams.get("tileWidth");
  const expectedTileHeightRaw = searchParams.get("tileHeight");
  const expectedLayingMethodRaw = searchParams.get("layingMethod");
  const expectedArea = Number(expectedAreaRaw);
  const expectedTileWidth = Number(expectedTileWidthRaw);
  const expectedTileHeight = Number(expectedTileHeightRaw);
  const expectedLayingMethod = Number(expectedLayingMethodRaw);

  if (expectedAreaRaw != null && Number.isFinite(expectedArea) && !isSameNumber(Number(result.totals.area), expectedArea)) return false;
  if (expectedTileWidthRaw != null && Number.isFinite(expectedTileWidth) && !isSameNumber(Number(result.totals.tileWidthCm) * 10, expectedTileWidth)) return false;
  if (expectedTileHeightRaw != null && Number.isFinite(expectedTileHeight) && !isSameNumber(Number(result.totals.tileHeightCm) * 10, expectedTileHeight)) return false;
  if (expectedLayingMethodRaw != null && Number.isFinite(expectedLayingMethod)) {
    const expectedPattern = expectedLayingMethod === 1 ? 2 : expectedLayingMethod === 2 ? 3 : 1;
    if (Number(result.totals.layoutPattern) !== expectedPattern) return false;
  }
  return true;
}

function withPurchaseFloor(
  scenario: CalculatorScenario,
  layoutTiles: number,
  purchaseTiles: number,
  tilesPerBox: number,
): CalculatorScenario {
  if (scenario.purchase_quantity >= purchaseTiles && scenario.exact_need >= layoutTiles) {
    return scenario;
  }

  const exactNeed = Math.max(scenario.exact_need, layoutTiles);
  const purchaseQuantity = Math.max(scenario.purchase_quantity, purchaseTiles);
  return {
    ...scenario,
    exact_need: exactNeed,
    purchase_quantity: purchaseQuantity,
    leftover: purchaseQuantity - exactNeed,
    buy_plan: {
      ...scenario.buy_plan,
      package_size: tilesPerBox,
      packages_count: Math.ceil(purchaseQuantity / tilesPerBox),
      unit: "шт",
    },
  };
}

export function applyTileLayoutPurchaseFloor(
  calculatorSlug: string,
  searchParams: URLSearchParams,
  result: CalculatorResult,
): CalculatorResult {
  if (calculatorSlug !== "plitka" || searchParams.get("from") !== "raskladka") return result;

  const layoutTiles = positiveInteger(searchParams.get("tilesHint"));
  if (!layoutTiles || !stillMatchesTransferredLayout(result, searchParams)) return result;

  const primaryIndex = result.materials.findIndex((material) => material.category === "Основное" && material.unit === "шт");
  if (primaryIndex < 0) return result;

  const primary = result.materials[primaryIndex];
  const tilesPerBox = Number.isInteger(primary.packageInfo?.size) && (primary.packageInfo?.size ?? 0) > 0
    ? primary.packageInfo!.size
    : positiveInteger(searchParams.get("layoutTilesPerBox"));
  if (!tilesPerBox) return result;
  const calculatedPurchase = primary.purchaseQty ?? primary.withReserve ?? primary.quantity;
  const purchaseTiles = Math.ceil(layoutTiles / tilesPerBox) * tilesPerBox;
  if (!Number.isFinite(calculatedPurchase) || purchaseTiles <= calculatedPurchase) return result;

  const materials = [...result.materials];
  materials[primaryIndex] = {
    ...primary,
    quantity: Math.max(primary.quantity, layoutTiles),
    withReserve: purchaseTiles,
    purchaseQty: purchaseTiles,
    packageInfo: {
      count: purchaseTiles / tilesPerBox,
      size: tilesPerBox,
      packageUnit: "упаковок",
    },
    subtitle: `${primary.subtitle ?? ""}; по фактической раскладке нужно ${layoutTiles} шт., поэтому к покупке не меньше ${purchaseTiles} шт.`,
  };

  const scenarios = result.scenarios
    ? {
        MIN: withPurchaseFloor(result.scenarios.MIN, layoutTiles, purchaseTiles, tilesPerBox),
        REC: withPurchaseFloor(result.scenarios.REC, layoutTiles, purchaseTiles, tilesPerBox),
        MAX: withPurchaseFloor(result.scenarios.MAX, layoutTiles, purchaseTiles, tilesPerBox),
      }
    : undefined;
  const totals = {
    ...result.totals,
    minExactNeedTiles: Math.max(Number(result.totals.minExactNeedTiles ?? 0), layoutTiles),
    recExactNeedTiles: Math.max(Number(result.totals.recExactNeedTiles ?? 0), layoutTiles),
    maxExactNeedTiles: Math.max(Number(result.totals.maxExactNeedTiles ?? 0), layoutTiles),
    minPurchaseTiles: Math.max(Number(result.totals.minPurchaseTiles ?? 0), purchaseTiles),
    recPurchaseTiles: Math.max(Number(result.totals.recPurchaseTiles ?? 0), purchaseTiles),
    maxPurchaseTiles: Math.max(Number(result.totals.maxPurchaseTiles ?? 0), purchaseTiles),
  };
  const message = `По фактической раскладке нужно ${layoutTiles} шт. плитки. Итог к покупке поднят до ${purchaseTiles} шт. (${purchaseTiles / tilesPerBox} уп. по ${tilesPerBox} шт.), чтобы площадная оценка не занизила закупку.`;

  return {
    ...result,
    materials,
    totals,
    scenarios,
    warnings: result.warnings.includes(message) ? result.warnings : [message, ...result.warnings],
  };
}
