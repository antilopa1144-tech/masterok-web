import type { AccuracyMode } from "../../../engine/accuracy";
import { getDbOrNull } from "./db";
import {
  readLegacyAccuracyMode,
  readLegacyHistory,
  writeLegacyAccuracyMode,
  writeLegacyHistory,
} from "./legacy";
import type { StoredCalculationHistoryEntry } from "./types";

const HISTORY_LIMIT = 10;
const ACCURACY_MODE_KEY = "masterok-accuracy-mode";

function historyId(entry: Pick<StoredCalculationHistoryEntry, "calcId" | "values">) {
  return `${entry.calcId}:${JSON.stringify(entry.values)}`;
}

export async function getCalculationHistory(): Promise<StoredCalculationHistoryEntry[]> {
  const database = await getDbOrNull();
  if (!database) return readLegacyHistory();

  return database.calculationHistory.orderBy("ts").reverse().limit(HISTORY_LIMIT).toArray();
}

export async function addCalculationHistory(entry: Omit<StoredCalculationHistoryEntry, "id">): Promise<StoredCalculationHistoryEntry[]> {
  const normalized: StoredCalculationHistoryEntry = {
    ...entry,
    id: historyId(entry),
  };

  const database = await getDbOrNull();
  if (!database) {
    const next = [
      normalized,
      ...readLegacyHistory().filter((item) => item.id !== normalized.id && historyId(item) !== normalized.id),
    ].slice(0, HISTORY_LIMIT);
    writeLegacyHistory(next);
    return next;
  }

  await database.transaction("rw", database.calculationHistory, async () => {
    await database.calculationHistory.put(normalized);
    const all = await database.calculationHistory.orderBy("ts").reverse().toArray();
    const stale = all.slice(HISTORY_LIMIT);
    await database.calculationHistory.bulkDelete(stale.map((item) => item.id));
  });

  return getCalculationHistory();
}

export async function getAccuracyModeSetting(): Promise<AccuracyMode | null> {
  const database = await getDbOrNull();
  if (!database) {
    const saved = readLegacyAccuracyMode();
    return saved === "basic" || saved === "realistic" || saved === "professional" ? saved : null;
  }

  const saved = (await database.settings.get(ACCURACY_MODE_KEY))?.value;
  return saved === "basic" || saved === "realistic" || saved === "professional" ? saved : null;
}

export async function setAccuracyModeSetting(mode: AccuracyMode): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    writeLegacyAccuracyMode(mode);
    return;
  }

  await database.settings.put({
    key: ACCURACY_MODE_KEY,
    value: mode,
    updatedAt: Date.now(),
  });
}
