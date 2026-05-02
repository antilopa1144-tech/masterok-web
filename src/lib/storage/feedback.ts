import { getDbOrNull } from "./db";
import { readLegacyFeedback, writeLegacyFeedback } from "./legacy";
import type { StoredFeedback } from "./types";

const MAX_FEEDBACK = 50;

export async function addFeedback(entry: Omit<StoredFeedback, "id" | "ts"> & { ts?: number }): Promise<void> {
  const item: StoredFeedback = {
    ...entry,
    id: `${entry.calculator}:${entry.material}:${Date.now()}`,
    ts: entry.ts ?? Date.now(),
  };

  const database = await getDbOrNull();
  if (!database) {
    writeLegacyFeedback([item, ...readLegacyFeedback()].slice(0, MAX_FEEDBACK));
    return;
  }

  await database.transaction("rw", database.feedback, async () => {
    await database.feedback.put(item);
    const all = await database.feedback.orderBy("ts").reverse().toArray();
    await database.feedback.bulkDelete(all.slice(MAX_FEEDBACK).map((feedback) => feedback.id));
  });
}
