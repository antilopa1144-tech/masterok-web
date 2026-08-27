function sanitizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildAnalyticsPageLocation(origin: string, pathname: string): string {
  return `${origin.replace(/\/$/, "")}${sanitizePath(pathname)}`;
}

/** Убирает query и hash, которые могут содержать значения формы или PII. */
export function sanitizeAnalyticsUrl(url: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return buildAnalyticsPageLocation(parsed.origin, parsed.pathname);
  } catch {
    return undefined;
  }
}
