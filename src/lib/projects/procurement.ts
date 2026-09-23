import type { StoredProjectEntry, StoredProjectMaterial } from "@/lib/storage/types";

export interface MaterialSource {
  entryId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  quantity: number;
  subtitle?: string;
}

export interface ProcurementLine {
  key: string;
  name: string;
  unit: string;
  /** Quantity actually to buy. An aggregated package is rounded only once. */
  quantity: number;
  category: string;
  subtitles?: string[];
  sources: MaterialSource[];
  exactQuantity?: number;
  reservedQuantity?: number;
  baseUnit?: string;
  packageSize?: number;
  packageCount?: number;
  packageUnit?: string;
  remainder?: number;
  procurementKey?: string;
  /** Ready-to-display explanation of one-time packaging rounding. */
  purchaseHint?: string;
}

const DEFAULT_CATEGORY = "Материалы";

export function normalizeCategory(category?: string): string {
  const value = category?.trim();
  return value && value.length > 0 ? value : DEFAULT_CATEGORY;
}

function finite(value: number | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function finitePositive(value: number | undefined): value is number {
  return finite(value) && value > 0;
}

function packageCountFor(need: number, packageSize: number): number {
  const ratio = need / packageSize;
  return Math.ceil(ratio - Number.EPSILON * 4 * Math.max(1, Math.abs(ratio)));
}

function quantityText(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function packagingHint(packageCount: number, packageSize: number, baseUnit: string, reservedQuantity?: number, remainder?: number): string {
  const details = [
    `Упаковок: ${quantityText(packageCount)} × ${quantityText(packageSize)} ${baseUnit}`,
    reservedQuantity != null ? `с запасом нужно ${quantityText(reservedQuantity)} ${baseUnit}` : undefined,
    remainder != null ? `остаток ${quantityText(remainder)} ${baseUnit}` : undefined,
  ].filter(Boolean);
  return `${details.join("; ")}.`;
}

function source(entry: StoredProjectEntry, material: StoredProjectMaterial): MaterialSource {
  return {
    entryId: entry.id,
    calcTitle: entry.label?.trim() || entry.calcTitle,
    slug: entry.slug,
    categorySlug: entry.categorySlug,
    quantity: finite(material.quantity) ? material.quantity : 0,
    subtitle: material.subtitle?.trim() || undefined,
  };
}

/** Name and unit are not identity: only an explicit specification can merge. */
function canAggregate(material: StoredProjectMaterial): boolean {
  return Boolean(
    material.procurementKey?.trim()
    && material.baseUnit?.trim()
    && finite(material.exactQuantity)
    && finite(material.reservedQuantity)
    && finitePositive(material.packageSize)
    && finitePositive(material.packageCount)
    && material.packageUnit?.trim(),
  );
}

function aggregateKey(material: StoredProjectMaterial): string {
  return [
    material.procurementKey!.trim(), material.unit.trim(), material.baseUnit!.trim(),
    material.packageSize, material.packageUnit!.trim(),
  ].join("__");
}

function standaloneLine(entry: StoredProjectEntry, material: StoredProjectMaterial, index: number): ProcurementLine {
  const materialId = material.id ?? `${entry.id}:legacy-material:${index}`;
  const packageCount = finitePositive(material.packageCount) ? material.packageCount : undefined;
  const packageSize = finitePositive(material.packageSize) ? material.packageSize : undefined;
  const baseUnit = material.baseUnit?.trim() || undefined;
  const packageUnit = material.packageUnit?.trim() || undefined;
  const reservedQuantity = finite(material.reservedQuantity) ? material.reservedQuantity : undefined;
  const remainder = finite(material.remainder) ? material.remainder : undefined;
  const purchaseHint = packageCount != null && packageSize != null && packageUnit && baseUnit
    ? packagingHint(packageCount, packageSize, baseUnit, reservedQuantity, remainder)
    : undefined;
  return {
    key: `entry:${entry.id}:material:${materialId}`,
    name: material.name,
    unit: material.unit,
    quantity: finite(material.quantity) ? material.quantity : 0,
    category: normalizeCategory(material.category),
    subtitles: material.subtitle?.trim() ? [material.subtitle.trim()] : [],
    sources: [source(entry, material)],
    ...(finite(material.exactQuantity) ? { exactQuantity: material.exactQuantity } : {}),
    ...(reservedQuantity != null ? { reservedQuantity } : {}),
    ...(baseUnit ? { baseUnit } : {}),
    ...(packageSize != null ? { packageSize } : {}),
    ...(packageCount != null ? { packageCount } : {}),
    ...(packageUnit ? { packageUnit } : {}),
    ...(remainder != null ? { remainder } : {}),
    ...(material.procurementKey ? { procurementKey: material.procurementKey } : {}),
    ...(purchaseHint ? { purchaseHint } : {}),
  };
}

export function aggregateProcurementLines(projectEntries: StoredProjectEntry[]): ProcurementLine[] {
  const compatible = new Map<string, ProcurementLine>();
  const lines: ProcurementLine[] = [];

  for (const entry of projectEntries) {
    entry.materials.forEach((material, index) => {
      if (material.excluded) return;
      if (!canAggregate(material)) {
        lines.push(standaloneLine(entry, material, index));
        return;
      }
      const key = aggregateKey(material);
      const existing = compatible.get(key);
      if (!existing) {
        const line: ProcurementLine = {
          ...standaloneLine(entry, material, index),
          key: `spec:${key}`,
          exactQuantity: material.exactQuantity,
          reservedQuantity: material.reservedQuantity,
          baseUnit: material.baseUnit,
          packageSize: material.packageSize,
          packageUnit: material.packageUnit,
          procurementKey: material.procurementKey,
        };
        compatible.set(key, line);
        lines.push(line);
        return;
      }
      existing.exactQuantity = (existing.exactQuantity ?? 0) + material.exactQuantity!;
      existing.reservedQuantity = (existing.reservedQuantity ?? 0) + material.reservedQuantity!;
      existing.sources.push(source(entry, material));
      const subtitle = material.subtitle?.trim();
      if (subtitle && !existing.subtitles?.includes(subtitle)) existing.subtitles = [...(existing.subtitles ?? []), subtitle];
      if (existing.category === DEFAULT_CATEGORY && material.category) existing.category = normalizeCategory(material.category);
    });
  }

  for (const line of compatible.values()) {
    if (finitePositive(line.packageSize) && finite(line.reservedQuantity)) {
      line.packageCount = packageCountFor(line.reservedQuantity, line.packageSize);
      line.quantity = line.unit === line.baseUnit ? line.packageCount * line.packageSize : line.packageCount;
      line.remainder = Math.max(0, line.packageCount * line.packageSize - line.reservedQuantity);
      line.purchaseHint = packagingHint(line.packageCount, line.packageSize, line.baseUnit ?? "", line.reservedQuantity, line.remainder);
    }
  }

  return lines.sort((a, b) => {
    const category = a.category.localeCompare(b.category, "ru");
    return category !== 0 ? category : a.name.localeCompare(b.name, "ru");
  });
}

export function groupProcurementByCategory(lines: ProcurementLine[]): { category: string; lines: ProcurementLine[] }[] {
  const groups = new Map<string, ProcurementLine[]>();
  for (const line of lines) {
    const list = groups.get(line.category) ?? [];
    list.push(line);
    groups.set(line.category, list);
  }
  return Array.from(groups.entries()).map(([category, categoryLines]) => ({ category, lines: categoryLines }));
}

export type StoredProjectMaterialInput = StoredProjectMaterial;
