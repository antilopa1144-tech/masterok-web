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
  return isProductionAnalyticsHost(window.location?.hostname) &&
    (typeof navigator === "undefined" || navigator.webdriver !== true);
}

/** Explicit test marker also excludes the noscript pixel in JavaScript-free checks. */
export function isProductionAnalyticsRequest(
  host: string | null | undefined,
  userAgent: string | null | undefined,
  automation: string | null | undefined,
): boolean {
  return isProductionAnalyticsHost(host) && automation !== "1" &&
    !/\bHeadlessChrome\//i.test(userAgent ?? "");
}

/** Runs before creating queues or scheduling third-party scripts. */
export function getAnalyticsAutomationGuardScript(): string {
  return 'if (typeof navigator !== "undefined" && navigator.webdriver === true) return;';
}
