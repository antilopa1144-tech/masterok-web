import { getPrices, PRICE_SCOPES } from "@/lib/userPrices";
import type { ProjectWithEntries, StoredProjectEntry } from "@/lib/storage/types";

export interface ProjectEstimateLine {
  entryId: string;
  calcTitle: string;
  slug: string;
  estimatedCost: number;
  pricedItems: number;
  missingPriceItems: number;
}

export interface ProjectEstimate {
  projectId: string;
  totalCost: number;
  pricedItems: number;
  missingPriceItems: number;
  calculationsCount: number;
  lines: ProjectEstimateLine[];
}

function qtyForMaterial(material: StoredProjectEntry["materials"][number]) {
  return Number.isFinite(material.quantity) ? material.quantity : 0;
}

async function estimateEntry(entry: StoredProjectEntry): Promise<ProjectEstimateLine> {
  const scopedPrices = await getPrices(`${PRICE_SCOPES.materials}:${entry.slug}`);
  const commonPrices = await getPrices(PRICE_SCOPES.materials);
  let estimatedCost = 0;
  let pricedItems = 0;
  let missingPriceItems = 0;

  for (const material of entry.materials) {
    const price = scopedPrices[material.name] ?? commonPrices[material.name] ?? 0;
    if (price > 0) {
      estimatedCost += qtyForMaterial(material) * price;
      pricedItems++;
    } else {
      missingPriceItems++;
    }
  }

  return {
    entryId: entry.id,
    calcTitle: entry.calcTitle,
    slug: entry.slug,
    estimatedCost: Math.round(estimatedCost),
    pricedItems,
    missingPriceItems,
  };
}

export async function buildProjectEstimate(project: ProjectWithEntries): Promise<ProjectEstimate> {
  const lines = await Promise.all(project.entries.map(estimateEntry));

  return {
    projectId: project.id,
    totalCost: lines.reduce((sum, line) => sum + line.estimatedCost, 0),
    pricedItems: lines.reduce((sum, line) => sum + line.pricedItems, 0),
    missingPriceItems: lines.reduce((sum, line) => sum + line.missingPriceItems, 0),
    calculationsCount: project.entries.length,
    lines,
  };
}

export async function buildProjectEstimates(projects: ProjectWithEntries[]) {
  const estimates = await Promise.all(projects.map(buildProjectEstimate));
  return Object.fromEntries(estimates.map((estimate) => [estimate.projectId, estimate]));
}
