import type { ProjectDocumentInput } from "./document-types";
import { getProjectLayouts } from "./project-layouts";
import { getPrices, PRICE_SCOPES } from "@/lib/userPrices";
import { computeTotals } from "@/lib/projects/build-estimate";
import { materialPriceScopeForCalculator, resolveMaterialUnitPrice } from "@/lib/projects/material-prices";
import { loadProjectMeta } from "@/lib/projects/project-meta";
import { aggregateProcurementLines, type ProcurementLine } from "@/lib/projects/procurement";
import type { ProjectWithEntries } from "@/lib/storage/types";

const PRICE_PROVENANCE = "Ранее введённая цена из калькулятора; проверьте перед закупкой";

function finitePositive(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

async function resolvedLinePrice(line: ProcurementLine, globalPrices: Record<string, number>): Promise<number | undefined> {
  const prices = await Promise.all(line.sources.map(async (source) => {
    const scoped = await getPrices(materialPriceScopeForCalculator(source.slug));
    return resolveMaterialUnitPrice(line.name, scoped, globalPrices);
  }));
  if (prices.length === 0 || prices.some((price) => !finitePositive(price))) return undefined;
  return prices.every((price) => price === prices[0]) ? prices[0] : undefined;
}

function documentMaterial(line: ProcurementLine, unitPrice?: number): ProjectDocumentInput["materials"][number] {
  return {
    key: line.key,
    name: line.name,
    ...(line.subtitles?.length ? { subtitle: line.subtitles.join(" · ") } : {}),
    unit: line.unit,
    quantity: line.quantity,
    ...(line.baseUnit === line.unit && Number.isFinite(line.exactQuantity) ? { exactQuantity: line.exactQuantity } : {}),
    ...(line.purchaseHint ? { packaging: line.purchaseHint } : {}),
    ...(unitPrice ? { unitPrice: { amount: unitPrice, currency: "RUB", provenance: PRICE_PROVENANCE } } : {}),
  };
}

/** Builds a document draft from local project data without filling in unknown prices. */
export async function buildProjectDocumentDraft(project: ProjectWithEntries): Promise<ProjectDocumentInput> {
  const [meta, globalPrices] = [loadProjectMeta(project.id), await getPrices(PRICE_SCOPES.materials)];
  const procurement = aggregateProcurementLines(project.entries);
  const prices = await Promise.all(procurement.map((line) => resolvedLinePrice(line, globalPrices)));
  const materials = procurement.map((line, index) => documentMaterial(line, prices[index]));

  // The existing monetary calculation is reused with unique row identities,
  // so a price for one identically named row cannot leak into another.
  const resolvedPrices: Record<string, number> = {};
  procurement.forEach((line, index) => { if (prices[index] !== undefined) resolvedPrices[line.key] = prices[index]!; });
  const totals = computeTotals(procurement.map((line) => ({ ...line, name: line.key })), [], resolvedPrices, meta);
  const knownMaterialsSubtotal = totals.materialsSubtotal;
  const reserveAmount = totals.reserveAmount;

  return {
    project: { id: project.id, name: project.name, documentDate: new Date().toISOString().slice(0, 10) },
    parties: {
      ...(meta.customerName?.trim() ? { customer: { name: meta.customerName.trim() } } : {}),
      ...(meta.objectName?.trim() ? { object: meta.objectName.trim() } : {}),
    },
    materials,
    ...(finitePositive(meta.deliveryRub) ? { delivery: { amount: { amount: Math.round(meta.deliveryRub), currency: "RUB", provenance: "Ранее введённая доставка" } } } : {}),
    ...(finitePositive(meta.reservePercent) && knownMaterialsSubtotal > 0 && reserveAmount > 0
      ? { monetaryReserve: { amount: { amount: reserveAmount, currency: "RUB", provenance: "Резерв от позиций с известной ценой" }, percent: meta.reservePercent, note: `Рассчитан от известной части материалов: ${knownMaterialsSubtotal} ₽.` } }
      : {}),
    ...(getProjectLayouts(project.id).length ? { layouts: getProjectLayouts(project.id) } : {}),
  };
}
