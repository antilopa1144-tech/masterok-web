import { getDbOrNull } from "./db";
import {
  LEGACY_KEYS,
  readLegacyAccuracyMode,
  readLegacyFeedback,
  readLegacyHistory,
  readLegacyPrices,
  readLegacyProjects,
  readLegacyRecent,
  removeLocalStorageKeys,
} from "./legacy";
import type { StoredMaterialPrice, StoredProject, StoredProjectEntry } from "./types";

let migrationPromise: Promise<boolean> | null = null;

const MIGRATED_KEYS = [
  LEGACY_KEYS.projects,
  LEGACY_KEYS.calculationHistory,
  LEGACY_KEYS.recentCalculators,
  LEGACY_KEYS.userPrices,
  LEGACY_KEYS.materialPrices,
  LEGACY_KEYS.renovationPrices,
  LEGACY_KEYS.feedback,
  LEGACY_KEYS.accuracyMode,
];

export function migrateLegacyStorage(): Promise<boolean> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = runMigration();
  return migrationPromise;
}

async function runMigration(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (localStorage.getItem(LEGACY_KEYS.migrationFlag) === "done") return true;
  } catch {
    // If localStorage is blocked, there is nothing safe to migrate.
    return false;
  }

  const database = await getDbOrNull();
  if (!database) return false;

  const legacyProjects = readLegacyProjects();
  const legacyPrices = readLegacyPrices();
  const legacyHistory = readLegacyHistory();
  const legacyRecent = readLegacyRecent();
  const legacyFeedback = readLegacyFeedback();
  const legacyAccuracyMode = readLegacyAccuracyMode();

  try {
    await database.transaction(
      "rw",
      [
        database.projects,
        database.projectEntries,
        database.materialPrices,
        database.calculationHistory,
        database.recentCalculators,
        database.feedback,
        database.settings,
      ],
      async () => {
        if (legacyProjects.length > 0) {
          const projects: StoredProject[] = legacyProjects.map((project) => ({
            id: project.id,
            name: project.name,
            created: project.created,
            updatedAt: project.updatedAt ?? project.created ?? Date.now(),
          }));
          const entries: StoredProjectEntry[] = legacyProjects.flatMap((project) =>
            (project.entries ?? []).map((entry) => ({
              ...entry,
              id: `${project.id}:${entry.calcId}`,
              projectId: project.id,
            }))
          );
          await database.projects.bulkPut(projects);
          if (entries.length > 0) await database.projectEntries.bulkPut(entries);
        }

        const priceRows: StoredMaterialPrice[] = Object.entries(legacyPrices).flatMap(([scope, prices]) =>
          Object.entries(prices).map(([key, value]) => ({
            id: `${scope}:${key}`,
            scope,
            key,
            value,
            updatedAt: Date.now(),
          }))
        );
        if (priceRows.length > 0) await database.materialPrices.bulkPut(priceRows);

        if (legacyHistory.length > 0) {
          await database.calculationHistory.bulkPut(
            legacyHistory.map((entry) => ({
              ...entry,
              id: entry.id ?? `${entry.calcId}:${JSON.stringify(entry.values)}`,
            }))
          );
        }

        if (legacyRecent.length > 0) {
          await database.recentCalculators.bulkPut(
            legacyRecent.map((entry) => ({ ...entry, ts: entry.ts ?? Date.now() }))
          );
        }

        if (legacyFeedback.length > 0) {
          await database.feedback.bulkPut(
            legacyFeedback.map((entry) => ({
              ...entry,
              id: entry.id ?? `${entry.calculator}:${entry.material}:${entry.ts ?? Date.now()}`,
            }))
          );
        }

        if (legacyAccuracyMode === "basic" || legacyAccuracyMode === "realistic" || legacyAccuracyMode === "professional") {
          await database.settings.put({
            key: LEGACY_KEYS.accuracyMode,
            value: legacyAccuracyMode,
            updatedAt: Date.now(),
          });
        }
      }
    );

    removeLocalStorageKeys(MIGRATED_KEYS);
    localStorage.setItem(LEGACY_KEYS.migrationFlag, "done");
    return true;
  } catch {
    // Keep legacy localStorage untouched if any write fails.
    return false;
  }
}
