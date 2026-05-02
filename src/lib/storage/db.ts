import Dexie, { type Table } from "dexie";
import type {
  StoredCalculationHistoryEntry,
  StoredFeedback,
  StoredMaterialPrice,
  StoredProject,
  StoredProjectEntry,
  StoredRecentCalculator,
  StoredSetting,
} from "./types";

class MasterokDatabase extends Dexie {
  projects!: Table<StoredProject, string>;
  projectEntries!: Table<StoredProjectEntry, string>;
  materialPrices!: Table<StoredMaterialPrice, string>;
  calculationHistory!: Table<StoredCalculationHistoryEntry, string>;
  recentCalculators!: Table<StoredRecentCalculator, string>;
  feedback!: Table<StoredFeedback, string>;
  settings!: Table<StoredSetting, string>;

  constructor() {
    super("masterok");

    this.version(1).stores({
      projects: "id, created, updatedAt",
      projectEntries: "id, projectId, calcId, ts",
      materialPrices: "id, scope, key, updatedAt",
      calculationHistory: "id, calcId, ts",
      recentCalculators: "id, categorySlug, ts",
      feedback: "id, calculator, ts",
      settings: "key, updatedAt",
    });
  }
}

export const db = new MasterokDatabase();

let dbAvailable: boolean | null = null;

export async function getDbOrNull(): Promise<MasterokDatabase | null> {
  if (typeof window === "undefined") return null;
  if (dbAvailable === false) return null;

  try {
    if (!db.isOpen()) {
      await db.open();
    }
    dbAvailable = true;
    return db;
  } catch {
    dbAvailable = false;
    return null;
  }
}

export function markIndexedDbUnavailable() {
  dbAvailable = false;
}
