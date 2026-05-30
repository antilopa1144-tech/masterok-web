import type { CalculatorDefinition } from "@/lib/calculators/types";
import type { CalculatorResult } from "@/lib/calculators/types";
import type { AgentProjectEntryPayload } from "./types";

export function calculatorResultToProjectEntry(
  def: CalculatorDefinition,
  result: CalculatorResult,
): AgentProjectEntryPayload {
  return {
    calcId: def.id,
    calcTitle: def.title,
    slug: def.slug,
    categorySlug: def.categorySlug,
    materials: result.materials.map((m) => ({
      name: m.name,
      quantity: materialQty(m),
      unit: m.unit,
      category: m.category,
    })),
    ts: Date.now(),
  };
}

function materialQty(m: CalculatorResult["materials"][number]): number {
  const q = m.purchaseQty ?? m.withReserve ?? m.quantity;
  return Number.isFinite(q) ? q : 0;
}
