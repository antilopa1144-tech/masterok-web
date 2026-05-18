import type { StoredProjectEntry, StoredProjectMaterial } from "@/lib/storage/types";

export interface MaterialSource {
  entryId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  quantity: number;
}

export interface ProcurementLine {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  category: string;
  sources: MaterialSource[];
}

const DEFAULT_CATEGORY = "Материалы";

export function normalizeCategory(category?: string): string {
  const c = category?.trim();
  return c && c.length > 0 ? c : DEFAULT_CATEGORY;
}

function materialKey(name: string, unit: string): string {
  return `${name.trim()}__${unit.trim()}`;
}

export function aggregateProcurementLines(projectEntries: StoredProjectEntry[]): ProcurementLine[] {
  const map = new Map<string, ProcurementLine>();

  for (const entry of projectEntries) {
    for (const material of entry.materials) {
      const key = materialKey(material.name, material.unit);
      const qty = Number.isFinite(material.quantity) ? material.quantity : 0;
      const category = normalizeCategory(material.category);

      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
        existing.sources.push({
          entryId: entry.id,
          calcTitle: entry.calcTitle,
          slug: entry.slug,
          categorySlug: entry.categorySlug,
          quantity: qty,
        });
        if (category !== DEFAULT_CATEGORY && existing.category === DEFAULT_CATEGORY) {
          existing.category = category;
        }
      } else {
        map.set(key, {
          key,
          name: material.name,
          unit: material.unit,
          quantity: qty,
          category,
          sources: [
            {
              entryId: entry.id,
              calcTitle: entry.calcTitle,
              slug: entry.slug,
              categorySlug: entry.categorySlug,
              quantity: qty,
            },
          ],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const cat = a.category.localeCompare(b.category, "ru");
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function groupProcurementByCategory(
  lines: ProcurementLine[],
): { category: string; lines: ProcurementLine[] }[] {
  const groups = new Map<string, ProcurementLine[]>();
  for (const line of lines) {
    const list = groups.get(line.category) ?? [];
    list.push(line);
    groups.set(line.category, list);
  }
  return Array.from(groups.entries()).map(([category, categoryLines]) => ({
    category,
    lines: categoryLines,
  }));
}

export type StoredProjectMaterialInput = StoredProjectMaterial;
