import type { CalculatorResult } from "@/lib/calculators/types";

export function compactCalculatorResult(
  slug: string,
  title: string,
  url: string,
  result: CalculatorResult,
) {
  return {
    slug,
    title,
    url,
    source: "masterok-calculator",
    formulaVersion: result.formulaVersion,
    materials: result.materials.map((m) => ({
      name: m.name,
      category: m.category,
      quantity: m.quantity,
      withReserve: m.withReserve,
      purchaseQty: m.purchaseQty,
      unit: m.unit,
      subtitle: m.subtitle,
    })),
    totals: result.totals,
    warnings: result.warnings.slice(0, 8),
    practicalNotes: result.practicalNotes?.slice(0, 5),
    accuracyExplanation: result.accuracyExplanation
      ? {
          modeLabel: result.accuracyExplanation.modeLabel,
          combinedMultiplier: result.accuracyExplanation.combinedMultiplier,
        }
      : undefined,
  };
}
