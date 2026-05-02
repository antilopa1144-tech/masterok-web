import { getDbOrNull } from "./db";
import { readLegacyRecent, writeLegacyRecent } from "./legacy";
import type { StoredRecentCalculator } from "./types";

const MAX_RECENT = 6;

export async function trackRecentCalculator(calc: Omit<StoredRecentCalculator, "ts">): Promise<void> {
  const item: StoredRecentCalculator = { ...calc, ts: Date.now() };
  const database = await getDbOrNull();
  if (!database) {
    const next = [item, ...readLegacyRecent().filter((recent) => recent.id !== item.id)].slice(0, MAX_RECENT);
    writeLegacyRecent(next);
    return;
  }

  await database.transaction("rw", database.recentCalculators, async () => {
    await database.recentCalculators.put(item);
    const all = await database.recentCalculators.orderBy("ts").reverse().toArray();
    await database.recentCalculators.bulkDelete(all.slice(MAX_RECENT).map((recent) => recent.id));
  });
}

export async function getRecentCalculators(): Promise<StoredRecentCalculator[]> {
  const database = await getDbOrNull();
  if (!database) return readLegacyRecent();

  return database.recentCalculators.orderBy("ts").reverse().limit(MAX_RECENT).toArray();
}
