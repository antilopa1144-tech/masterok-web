const PRODUCTION_ANALYTICS_HOSTS = new Set([
  "getmasterok.ru",
  "www.getmasterok.ru",
]);

function extractHostname(hostOrUrl: string): string {
  const firstForwardedHost = hostOrUrl.split(",", 1)[0]?.trim();
  if (!firstForwardedHost) return "";

  try {
    const url = firstForwardedHost.includes("://")
      ? new URL(firstForwardedHost)
      : new URL(`https://${firstForwardedHost}`);

    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

/**
 * Production-счётчики разрешены только на основном публичном домене.
 * Значение может приходить как Host, X-Forwarded-Host или полный URL.
 */
export function isProductionAnalyticsHost(
  hostOrUrl: string | null | undefined,
): boolean {
  if (!hostOrUrl) return false;
  return PRODUCTION_ANALYTICS_HOSTS.has(extractHostname(hostOrUrl));
}

/** Дополнительная клиентская защита для событий и SPA-навигации. */
export function isProductionAnalyticsBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return isProductionAnalyticsHost(window.location?.hostname);
}
