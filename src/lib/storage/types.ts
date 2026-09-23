import type { CalculatorResult } from "@/lib/calculators/types";
import type { AccuracyMode } from "../../../engine/accuracy";

export interface StoredProject {
  id: string;
  name: string;
  created: number;
  updatedAt: number;
}

export interface StoredProjectMaterial {
  /** Stable within a saved calculation; used for an explicit user edit. */
  id?: string;
  name: string;
  /** Что именно выбрать в магазине: тип, назначение и ограничения совместимости. */
  subtitle?: string;
  quantity: number;
  unit: string;
  /** Группа в смете (как в калькуляторе): «Арматура», «Бетон»… */
  category?: string;
  /** Explicit product/SKU/specification identity. Without it materials stay separate in the purchase list. */
  procurementKey?: string;
  /** Calculator's unmodified `MaterialResult.quantity`; may itself be a purchase-unit count. */
  baseQuantity?: number;
  /** Calculator's unmodified `MaterialResult.purchaseQty`, when present. */
  purchaseQty?: number;
  /** Need before reserve/packaging, when the calculator supplied it. */
  exactQuantity?: number;
  /** Need with the calculator's reserve, before packaging, when supplied. */
  reservedQuantity?: number;
  /** Unit for exactQuantity/reservedQuantity when it differs from the purchase unit. */
  baseUnit?: string;
  /** Size of one package in baseUnit, only from the original result or an explicit edit. */
  packageSize?: number;
  packageCount?: number;
  packageUnit?: string;
  /** Known unused quantity after packaging; never reconstructed for legacy rows. */
  remainder?: number;
  excluded?: boolean;
}

export interface StoredProjectEntry {
  id: string;
  projectId: string;
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  /** User-visible room or calculation label, e.g. «Кухня». */
  label?: string;
  materials: StoredProjectMaterial[];
  ts: number;
}

export interface ProjectEstimateMeta {
  reservePercent: number;
  deliveryRub: number;
  // Реквизиты шапки документа сметы. Опциональны — старые сохранённые
  // проекты без этих полей продолжают работать (показываются как пустые).
  objectName?: string;
  customerName?: string;
}

export interface ProjectWithEntries extends StoredProject {
  entries: StoredProjectEntry[];
}

export interface StoredMaterialPrice {
  id: string;
  scope: string;
  key: string;
  value: number;
  updatedAt: number;
}

export type PriceMap = Record<string, number>;
export type ScopedPrices = Record<string, PriceMap>;

export interface StoredCalculationHistoryEntry {
  id: string;
  calcId: string;
  calcTitle: string;
  values: Record<string, number>;
  result: CalculatorResult;
  ts: number;
}

export interface StoredRecentCalculator {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryIcon: string;
  categoryColor: string;
  categoryBg: string;
  ts: number;
}

export interface StoredFeedback {
  id: string;
  calculator: string;
  material: string;
  calculated?: number;
  actual: number;
  unit: string;
  mode?: AccuracyMode;
  ts: number;
}

export interface StoredSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export type StorageStatus = "indexeddb" | "fallback";
