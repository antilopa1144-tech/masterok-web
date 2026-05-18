import type { ProcurementLine } from "./procurement";

export type PurchaseFilter = "all" | "pending" | "purchased";

export interface ProcurementPurchaseStats {
  /** Сумма по позициям с ценой */
  pricedSubtotal: number;
  /** Сумма отмеченных «куплено» */
  purchasedSubtotal: number;
  /** Сумма ещё не отмеченных */
  remainingSubtotal: number;
  totalLines: number;
  purchasedCount: number;
  pendingCount: number;
  unpricedCount: number;
}

export function computePurchaseStats(
  lines: ProcurementLine[],
  prices: Record<string, number>,
  checked: Set<string>,
): ProcurementPurchaseStats {
  let pricedSubtotal = 0;
  let purchasedSubtotal = 0;
  let purchasedCount = 0;
  let pendingCount = 0;
  let unpricedCount = 0;

  for (const line of lines) {
    const price = prices[line.name] ?? 0;
    const sum = line.quantity * price;
    if (price > 0) pricedSubtotal += sum;
    else unpricedCount++;

    if (checked.has(line.key)) {
      purchasedCount++;
      if (sum > 0) purchasedSubtotal += sum;
    } else {
      pendingCount++;
    }
  }

  const remainingSubtotal = Math.max(0, pricedSubtotal - purchasedSubtotal);

  return {
    pricedSubtotal: Math.round(pricedSubtotal),
    purchasedSubtotal: Math.round(purchasedSubtotal),
    remainingSubtotal: Math.round(remainingSubtotal),
    totalLines: lines.length,
    purchasedCount,
    pendingCount,
    unpricedCount,
  };
}

export function filterProcurementLines(
  lines: ProcurementLine[],
  checked: Set<string>,
  filter: PurchaseFilter,
  query: string,
): ProcurementLine[] {
  const q = query.trim().toLowerCase();
  return lines.filter((line) => {
    if (filter === "pending" && checked.has(line.key)) return false;
    if (filter === "purchased" && !checked.has(line.key)) return false;
    if (q && !line.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function groupMaterialsForEntry(
  materials: { name: string; unit: string; quantity: number; category?: string; unitPrice: number; lineTotal: number }[],
): { category: string; items: typeof materials }[] {
  const map = new Map<string, typeof materials>();
  for (const m of materials) {
    const cat = m.category?.trim() || "Материалы";
    const list = map.get(cat) ?? [];
    list.push(m);
    map.set(cat, list);
  }
  return Array.from(map.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category, "ru"));
}
