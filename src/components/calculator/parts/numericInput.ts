const DECIMAL_DRAFT_PATTERN = /^-?\d*(?:\.\d*)?$/;

export function normalizeDecimalDraft(rawValue: string): string {
  return rawValue.replace(/,/g, ".").replace(/\s/g, "");
}

export function isDecimalDraft(rawValue: string): boolean {
  return DECIMAL_DRAFT_PATTERN.test(normalizeDecimalDraft(rawValue));
}

export function parseDecimalDraft(rawValue: string): number | null {
  const normalized = normalizeDecimalDraft(rawValue);
  if (
    normalized === "" ||
    normalized === "-" ||
    normalized.endsWith(".") ||
    !DECIMAL_DRAFT_PATTERN.test(normalized)
  ) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function finalizeDecimalDraft(
  rawValue: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const normalized = normalizeDecimalDraft(rawValue);
  if (
    normalized === "" ||
    normalized === "-" ||
    !DECIMAL_DRAFT_PATTERN.test(normalized)
  ) {
    return fallback;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function formatDecimalValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}
