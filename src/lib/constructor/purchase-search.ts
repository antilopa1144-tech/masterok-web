import type { ConstructorRoom, PurchaseLine } from "./core";

export type PurchaseScope = "all" | "unpriced" | "mixed-price";

/** The engine adds a note to a positive price only when grouped source prices differ. */
export function hasMixedPurchasePrices(line: PurchaseLine): boolean {
  return line.unitPriceRub > 0 && Boolean(line.priceNote);
}

function normalize(text: string): string {
  return text.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/(\d)\s*[×xх*]\s*(?=\d)/g, "$1 ");
}

/** Search only chooses visible rows; totals and exports use the complete calculation. */
export function searchPurchases(lines: readonly PurchaseLine[], rooms: readonly ConstructorRoom[], query: string, scope: PurchaseScope = "all"): readonly PurchaseLine[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length && scope === "all") return lines;
  const names = new Map(rooms.map(room => [room.id, room.name]));
  return lines.filter(line => {
    if (scope === "unpriced" && line.unitPriceRub > 0) return false;
    if (scope === "mixed-price" && !hasMixedPurchasePrices(line)) return false;
    const text = normalize([line.name, line.detail, ...line.roomIds.map(id => names.get(id) ?? "")].join(" "));
    return words.every(word => text.includes(word));
  });
}
