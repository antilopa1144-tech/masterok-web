import type {
  ProjectWithEntries,
  ScopedPrices,
  StoredCalculationHistoryEntry,
  StoredFeedback,
  StoredRecentCalculator,
} from "./types";

export const LEGACY_KEYS = {
  projects: "masterok-projects",
  calculationHistory: "masterok-calc-history",
  recentCalculators: "masterok-recent-calcs",
  userPrices: "masterok-user-prices",
  materialPrices: "masterok-material-prices",
  renovationPrices: "masterok-renovation-prices",
  feedback: "masterok-feedback",
  accuracyMode: "masterok-accuracy-mode",
  migrationFlag: "masterok-indexeddb-migrated-v1",
} as const;

export function readJsonFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonToLocalStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can be full or blocked.
  }
}

export function removeLocalStorageKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function readLegacyProjects() {
  return readJsonFromLocalStorage<ProjectWithEntries[]>(LEGACY_KEYS.projects, []);
}

export function writeLegacyProjects(projects: ProjectWithEntries[]) {
  writeJsonToLocalStorage(LEGACY_KEYS.projects, projects);
}

export function readLegacyHistory() {
  return readJsonFromLocalStorage<StoredCalculationHistoryEntry[]>(LEGACY_KEYS.calculationHistory, []);
}

export function writeLegacyHistory(history: StoredCalculationHistoryEntry[]) {
  writeJsonToLocalStorage(LEGACY_KEYS.calculationHistory, history);
}

export function readLegacyRecent() {
  return readJsonFromLocalStorage<StoredRecentCalculator[]>(LEGACY_KEYS.recentCalculators, []);
}

export function writeLegacyRecent(recent: StoredRecentCalculator[]) {
  writeJsonToLocalStorage(LEGACY_KEYS.recentCalculators, recent);
}

export function readLegacyPrices(): ScopedPrices {
  const scoped = readJsonFromLocalStorage<ScopedPrices>(LEGACY_KEYS.userPrices, {});
  const material = readJsonFromLocalStorage<Record<string, number>>(LEGACY_KEYS.materialPrices, {});
  const renovation = readJsonFromLocalStorage<Record<string, number>>(LEGACY_KEYS.renovationPrices, {});

  return {
    ...scoped,
    ...(Object.keys(material).length > 0 ? { materials: { ...material, ...(scoped.materials ?? {}) } } : {}),
    ...(Object.keys(renovation).length > 0 ? { renovation: { ...renovation, ...(scoped.renovation ?? {}) } } : {}),
  };
}

export function writeLegacyPrices(prices: ScopedPrices) {
  writeJsonToLocalStorage(LEGACY_KEYS.userPrices, prices);
}

export function readLegacyFeedback() {
  return readJsonFromLocalStorage<StoredFeedback[]>(LEGACY_KEYS.feedback, []);
}

export function writeLegacyFeedback(feedback: StoredFeedback[]) {
  writeJsonToLocalStorage(LEGACY_KEYS.feedback, feedback);
}

export function readLegacyAccuracyMode() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_KEYS.accuracyMode);
  } catch {
    return null;
  }
}

export function writeLegacyAccuracyMode(mode: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEGACY_KEYS.accuracyMode, mode);
  } catch {
    // ignore
  }
}
