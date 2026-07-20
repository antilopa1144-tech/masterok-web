/** План линейного раскроя плинтуса, профиля, трубы, бруса и доски. */

export interface LinearCutPartInput { id: string; label: string; lengthMm: number; quantity: number }
export interface LinearCutLayoutInput { stockLengthMm: number; sawKerfMm: number; reusableOffcutMm: number; parts: LinearCutPartInput[] }
export interface LinearCutPlacement { id: string; partId: string; label: string; xMm: number; lengthMm: number; kerfBeforeMm: number }
export interface LinearStockPlan { index: number; placements: LinearCutPlacement[]; usedMm: number; offcutMm: number; reusable: boolean }
export interface LinearCutLayoutResult {
  input: LinearCutLayoutInput;
  stock: LinearStockPlan[];
  stockCount: number;
  partCount: number;
  exactLengthM: number;
  purchasedLengthM: number;
  offcutLengthM: number;
  reusableOffcuts: number;
  wastePercent: number;
  errors: string[];
  notes: string[];
}

function clamp(value: number, min: number, max: number): number { if (!Number.isFinite(value)) return min; return Math.max(min, Math.min(max, value)); }
function round(value: number, digits = 1): number { const f = 10 ** digits; return Math.round((value + Number.EPSILON) * f) / f; }

export function calculateLinearCutLayout(raw: LinearCutLayoutInput): LinearCutLayoutResult {
  const stockLengthMm = round(clamp(raw.stockLengthMm, 100, 20_000), 0);
  const sawKerfMm = round(clamp(raw.sawKerfMm, 0, 20), 1);
  const reusableOffcutMm = round(clamp(raw.reusableOffcutMm, 0, stockLengthMm), 0);
  const parts = raw.parts.slice(0, 30).map((part, index) => ({
    id: part.id || `part-${index + 1}`,
    label: part.label.trim().slice(0, 40) || `Деталь ${index + 1}`,
    lengthMm: round(clamp(part.lengthMm, 1, 50_000), 0),
    quantity: Math.round(clamp(part.quantity, 0, 200)),
  })).filter((part) => part.quantity > 0);
  const errors: string[] = [];
  const invalid = parts.filter((part) => part.lengthMm > stockLengthMm);
  if (invalid.length > 0) errors.push(`Не помещаются в заготовку: ${invalid.map((part) => part.label).join(", ")}.`);
  const expanded = parts
    .filter((part) => part.lengthMm <= stockLengthMm)
    .flatMap((part) => Array.from({ length: part.quantity }, (_, index) => ({ ...part, instanceId: `${part.id}-${index + 1}` })))
    .slice(0, 500)
    .sort((a, b) => b.lengthMm - a.lengthMm || a.label.localeCompare(b.label, "ru"));
  const bins: Array<{ cursor: number; placements: LinearCutPlacement[] }> = [];

  for (const part of expanded) {
    let best = -1;
    let bestRemain = Number.POSITIVE_INFINITY;
    bins.forEach((bin, index) => {
      const kerfBefore = bin.placements.length > 0 ? sawKerfMm : 0;
      const remain = stockLengthMm - bin.cursor - kerfBefore - part.lengthMm;
      if (remain >= -0.01 && remain < bestRemain) { best = index; bestRemain = remain; }
    });
    if (best < 0) { bins.push({ cursor: 0, placements: [] }); best = bins.length - 1; }
    const bin = bins[best];
    const kerfBeforeMm = bin.placements.length > 0 ? sawKerfMm : 0;
    const xMm = bin.cursor + kerfBeforeMm;
    bin.placements.push({ id: part.instanceId, partId: part.id, label: part.label, xMm: round(xMm, 1), lengthMm: part.lengthMm, kerfBeforeMm });
    bin.cursor = xMm + part.lengthMm;
  }
  const stock = bins.map((bin, index) => {
    const rawOffcut = Math.max(0, stockLengthMm - bin.cursor);
    const offcutMm = round(Math.max(0, rawOffcut - (rawOffcut > 0 ? sawKerfMm : 0)), 1);
    return { index: index + 1, placements: bin.placements, usedMm: round(bin.cursor, 1), offcutMm, reusable: offcutMm >= reusableOffcutMm && reusableOffcutMm > 0 };
  });
  const exactMm = expanded.reduce((sum, part) => sum + part.lengthMm, 0);
  const purchasedMm = stock.length * stockLengthMm;
  const offcutMm = stock.reduce((sum, item) => sum + item.offcutMm, 0);

  return {
    input: { stockLengthMm, sawKerfMm, reusableOffcutMm, parts },
    stock,
    stockCount: stock.length,
    partCount: expanded.length,
    exactLengthM: round(exactMm / 1000, 2),
    purchasedLengthM: round(purchasedMm / 1000, 2),
    offcutLengthM: round(offcutMm / 1000, 2),
    reusableOffcuts: stock.filter((item) => item.reusable).length,
    wastePercent: purchasedMm > 0 ? round((purchasedMm - exactMm) / purchasedMm * 100, 1) : 0,
    errors,
    notes: [
      "Детали сортируются по длине и укладываются в наиболее подходящий остаток; ширина пропила учитывается между соседними деталями.",
      "План не учитывает дефекты, торцовку заводских краёв, направление текстуры и обязательное совпадение рисунка — добавьте такие припуски к длине детали заранее.",
      "Перед резом промаркируйте заготовки и повторно сверьте все размеры на объекте.",
    ],
  };
}
