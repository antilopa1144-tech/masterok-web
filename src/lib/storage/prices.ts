import { getDbOrNull } from "./db";
import { readLegacyPrices, writeLegacyPrices } from "./legacy";
import type { PriceMap, ScopedPrices, StoredMaterialPrice } from "./types";

export const PRICE_SCOPES = {
  materials: "materials",
  renovation: "renovation",
} as const;

const priceId = (scope: string, key: string) => `${scope}:${key}`;

export async function getPrices(scope: string): Promise<PriceMap> {
  const database = await getDbOrNull();
  if (!database) return readLegacyPrices()[scope] ?? {};

  const rows = await database.materialPrices.where("scope").equals(scope).toArray();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getPrice(scope: string, key: string): Promise<number | undefined> {
  const database = await getDbOrNull();
  if (!database) return readLegacyPrices()[scope]?.[key];

  return (await database.materialPrices.get(priceId(scope, key)))?.value;
}

export async function setPrice(scope: string, key: string, value: number): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    const store = readLegacyPrices();
    const scopeMap = { ...(store[scope] ?? {}) };
    if (value > 0) scopeMap[key] = value;
    else delete scopeMap[key];
    store[scope] = scopeMap;
    writeLegacyPrices(store);
    return;
  }

  if (value > 0) {
    const row: StoredMaterialPrice = {
      id: priceId(scope, key),
      scope,
      key,
      value,
      updatedAt: Date.now(),
    };
    await database.materialPrices.put(row);
  } else {
    await database.materialPrices.delete(priceId(scope, key));
  }
}

export async function setPrices(scope: string, prices: PriceMap): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    const store: ScopedPrices = readLegacyPrices();
    store[scope] = { ...prices };
    writeLegacyPrices(store);
    return;
  }

  await database.transaction("rw", database.materialPrices, async () => {
    await database.materialPrices.where("scope").equals(scope).delete();
    await database.materialPrices.bulkPut(
      Object.entries(prices)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({
          id: priceId(scope, key),
          scope,
          key,
          value,
          updatedAt: Date.now(),
        }))
    );
  });
}

export async function resetPrice(scope: string, key: string): Promise<void> {
  await setPrice(scope, key, 0);
}

export async function resetScope(scope: string): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    const store = readLegacyPrices();
    delete store[scope];
    writeLegacyPrices(store);
    return;
  }

  await database.materialPrices.where("scope").equals(scope).delete();
}

export async function hasCustomPrice(scope: string, key: string): Promise<boolean> {
  const value = await getPrice(scope, key);
  return typeof value === "number" && value > 0;
}

export async function exportAllPrices(): Promise<ScopedPrices> {
  const database = await getDbOrNull();
  if (!database) return readLegacyPrices();

  const rows = await database.materialPrices.toArray();
  return rows.reduce<ScopedPrices>((acc, row) => {
    if (!acc[row.scope]) acc[row.scope] = {};
    acc[row.scope][row.key] = row.value;
    return acc;
  }, {});
}
