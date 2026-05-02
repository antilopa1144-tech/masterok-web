import type { CalculatorResult } from "@/lib/calculators/types";
import type { AccuracyMode } from "../../../engine/accuracy";

export interface StoredProject {
  id: string;
  name: string;
  created: number;
  updatedAt: number;
}

export interface StoredProjectEntry {
  id: string;
  projectId: string;
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: { name: string; quantity: number; unit: string }[];
  ts: number;
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
