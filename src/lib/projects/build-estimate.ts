import type { ProjectWithEntries, StoredProjectEntry } from "@/lib/storage/types";
import { getPrices, PRICE_SCOPES } from "@/lib/userPrices";
import {
  loadResolvedPriceMap,
  materialPriceScopeForCalculator,
  resolveMaterialUnitPrice,
} from "./material-prices";
import { aggregateProcurementLines, type ProcurementLine } from "./procurement";
import type { ProjectEstimateMeta } from "@/lib/storage/types";

export interface ProjectEstimateLine {
  entryId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  estimatedCost: number;
  pricedItems: number;
  missingPriceItems: number;
  materials: {
    name: string;
    subtitle?: string;
    unit: string;
    quantity: number;
    category?: string;
    unitPrice: number;
    lineTotal: number;
  }[];
}

export interface ProjectEstimateTotals {
  materialsSubtotal: number;
  reservePercent: number;
  reserveAmount: number;
  deliveryRub: number;
  grandTotal: number;
  pricedLines: number;
  totalLines: number;
  pricedCalculations: number;
  calculationsCount: number;
}

export interface ProjectEstimateViewModel {
  projectId: string;
  procurement: ProcurementLine[];
  lines: ProjectEstimateLine[];
  totals: ProjectEstimateTotals;
  resolvedPrices: Record<string, number>;
}

function qty(m: { quantity: number }): number {
  return Number.isFinite(m.quantity) ? m.quantity : 0;
}

async function estimateEntry(
  entry: StoredProjectEntry,
  globalPrices: Record<string, number>,
): Promise<ProjectEstimateLine> {
  const scopedPrices = await getPrices(materialPriceScopeForCalculator(entry.slug));
  let estimatedCost = 0;
  let pricedItems = 0;
  let missingPriceItems = 0;

  const materials = entry.materials.map((material) => {
    const unitPrice = resolveMaterialUnitPrice(material.name, scopedPrices, globalPrices);
    const quantity = qty(material);
    const lineTotal = quantity * unitPrice;
    if (unitPrice > 0) {
      estimatedCost += lineTotal;
      pricedItems++;
    } else {
      missingPriceItems++;
    }
    return {
      name: material.name,
      subtitle: material.subtitle,
      unit: material.unit,
      quantity,
      category: material.category,
      unitPrice,
      lineTotal,
    };
  });

  return {
    entryId: entry.id,
    calcTitle: entry.calcTitle,
    slug: entry.slug,
    categorySlug: entry.categorySlug,
    estimatedCost: Math.round(estimatedCost),
    pricedItems,
    missingPriceItems,
    materials,
  };
}

export function computeTotals(
  procurement: ProcurementLine[],
  lines: ProjectEstimateLine[],
  resolvedPrices: Record<string, number>,
  meta: ProjectEstimateMeta,
): ProjectEstimateTotals {
  const materialsSubtotal = procurement.reduce((sum, line) => {
    const price = resolvedPrices[line.name] ?? 0;
    return sum + line.quantity * price;
  }, 0);

  const reservePercent = meta.reservePercent;
  const reserveAmount = Math.round(materialsSubtotal * (reservePercent / 100));
  const deliveryRub = Math.round(meta.deliveryRub);
  const grandTotal = Math.round(materialsSubtotal + reserveAmount + deliveryRub);

  const totalLines = procurement.length;
  const pricedLines = procurement.filter((l) => (resolvedPrices[l.name] ?? 0) > 0).length;
  const calculationsCount = lines.length;
  const pricedCalculations = lines.filter((l) => l.estimatedCost > 0).length;

  return {
    materialsSubtotal: Math.round(materialsSubtotal),
    reservePercent,
    reserveAmount,
    deliveryRub,
    grandTotal,
    pricedLines,
    totalLines,
    pricedCalculations,
    calculationsCount,
  };
}

export async function buildProjectEstimateView(
  project: ProjectWithEntries,
  meta: ProjectEstimateMeta,
): Promise<ProjectEstimateViewModel> {
  const resolvedPrices = await loadResolvedPriceMap(project);
  const globalPrices = await getPrices(PRICE_SCOPES.materials);
  const lines = await Promise.all(project.entries.map((e) => estimateEntry(e, globalPrices)));
  const procurement = aggregateProcurementLines(project.entries);
  const totals = computeTotals(procurement, lines, resolvedPrices, meta);

  return {
    projectId: project.id,
    procurement,
    lines,
    totals,
    resolvedPrices,
  };
}

/** @deprecated Используйте buildProjectEstimateView — оставлено для списка проектов. */
export interface ProjectEstimate {
  projectId: string;
  totalCost: number;
  pricedItems: number;
  missingPriceItems: number;
  calculationsCount: number;
  lines: Pick<ProjectEstimateLine, "entryId" | "calcTitle" | "slug" | "estimatedCost" | "pricedItems" | "missingPriceItems">[];
}

export async function buildProjectEstimate(project: ProjectWithEntries): Promise<ProjectEstimate> {
  const view = await buildProjectEstimateView(project, { reservePercent: 0, deliveryRub: 0 });
  const pricedItems = project.entries.reduce((s, e) => s + e.materials.length, 0) - view.lines.reduce((s, l) => s + l.missingPriceItems, 0);
  const missingPriceItems = view.lines.reduce((s, l) => s + l.missingPriceItems, 0);

  return {
    projectId: project.id,
    totalCost: view.totals.grandTotal,
    pricedItems,
    missingPriceItems,
    calculationsCount: project.entries.length,
    lines: view.lines.map((l) => ({
      entryId: l.entryId,
      calcTitle: l.calcTitle,
      slug: l.slug,
      estimatedCost: l.estimatedCost,
      pricedItems: l.pricedItems,
      missingPriceItems: l.missingPriceItems,
    })),
  };
}

export async function buildProjectEstimates(projects: ProjectWithEntries[]) {
  const estimates = await Promise.all(projects.map(buildProjectEstimate));
  return Object.fromEntries(estimates.map((e) => [e.projectId, e]));
}
