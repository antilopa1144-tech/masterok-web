const PREFIX = "masterok:mikhalych-review:";

export interface CachedCalcReview {
  text: string;
  at: number;
}

export function loadCachedCalcReview(hash: string): CachedCalcReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${hash}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCalcReview;
    if (typeof parsed.text !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedCalcReview(hash: string, text: string): void {
  if (typeof window === "undefined") return;
  const entry: CachedCalcReview = { text, at: Date.now() };
  localStorage.setItem(`${PREFIX}${hash}`, JSON.stringify(entry));
}

const DISABLE_KEY = "masterok:mikhalych-review-disabled";

export function isCalcReviewDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISABLE_KEY) === "1";
}

export function setCalcReviewDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  if (disabled) localStorage.setItem(DISABLE_KEY, "1");
  else localStorage.removeItem(DISABLE_KEY);
}
