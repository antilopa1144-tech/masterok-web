/**
 * Единый стор для пользовательских цен.
 *
 * Хранит цены в одном ключе localStorage, сгруппированные по scope
 * ("materials" — общий для всех калькуляторов, "renovation" — для калькулятора
 * стоимости ремонта, и т.д.). На этапе внедрения Личного кабинета этот модуль
 * станет единой точкой перехода в API.
 */

const STORAGE_KEY = "masterok-user-prices";

type PriceMap = Record<string, number>;
type ScopedPrices = Record<string, PriceMap>;

/** Scope-и, которые активно используются в коде. Строгой типизацией не ограничиваем — калькуляторы могут завести свои. */
export const PRICE_SCOPES = {
  materials: "materials",
  renovation: "renovation",
} as const;

const LEGACY_KEYS: Record<string, string> = {
  "masterok-material-prices": PRICE_SCOPES.materials,
  "masterok-renovation-prices": PRICE_SCOPES.renovation,
};

let memoryCache: ScopedPrices | null = null;
let migratedFromLegacy = false;

function readStore(): ScopedPrices {
  if (typeof window === "undefined") return {};
  if (memoryCache) return memoryCache;

  let store: ScopedPrices = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) store = JSON.parse(raw) as ScopedPrices;
  } catch {
    store = {};
  }

  if (!migratedFromLegacy) {
    migrateLegacyKeys(store);
    migratedFromLegacy = true;
  }

  memoryCache = store;
  return store;
}

function migrateLegacyKeys(store: ScopedPrices) {
  for (const [legacyKey, scope] of Object.entries(LEGACY_KEYS)) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as PriceMap;
      if (!parsed || typeof parsed !== "object") continue;
      store[scope] = { ...parsed, ...(store[scope] ?? {}) };
      // Оставляем legacy-ключ как страховку — очистка после стабилизации
    } catch {
      // ignore
    }
  }
  persist(store);
}

function persist(store: ScopedPrices) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage full or blocked — silently ignore
  }
}

export function getPrices(scope: string): PriceMap {
  const store = readStore();
  return store[scope] ?? {};
}

export function getPrice(scope: string, key: string): number | undefined {
  return readStore()[scope]?.[key];
}

export function setPrice(scope: string, key: string, value: number): void {
  const store = readStore();
  const scopeMap = { ...(store[scope] ?? {}) };
  if (value > 0) {
    scopeMap[key] = value;
  } else {
    delete scopeMap[key];
  }
  store[scope] = scopeMap;
  memoryCache = store;
  persist(store);
}

export function setPrices(scope: string, prices: PriceMap): void {
  const store = readStore();
  store[scope] = { ...prices };
  memoryCache = store;
  persist(store);
}

export function resetPrice(scope: string, key: string): void {
  setPrice(scope, key, 0);
}

export function resetScope(scope: string): void {
  const store = readStore();
  delete store[scope];
  memoryCache = store;
  persist(store);
}

export function hasCustomPrice(scope: string, key: string): boolean {
  const value = getPrice(scope, key);
  return typeof value === "number" && value > 0;
}

/** Для будущей миграции в БД при входе пользователя. */
export function exportAllPrices(): ScopedPrices {
  return readStore();
}
