import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getYandexMetrikaDeferredInitScript } from "@/lib/analytics/yandex-metrika-deferred";
import { getGoogleAnalyticsInitScript } from "@/lib/analytics/google-analytics";
import { isProductionAnalyticsBrowser, isProductionAnalyticsRequest } from "@/lib/analytics/runtime";

afterEach(() => vi.unstubAllGlobals());

describe("automation must not send production analytics", () => {
  it.each([
    ["getmasterok.ru", "Mozilla/5.0 Chrome/144.0", null, true],
    ["getmasterok.ru", "Mozilla/5.0 Chrome/144.0", "1", false],
    ["getmasterok.ru", "Mozilla/5.0 HeadlessChrome/144.0", null, false],
    ["localhost:3456", "Mozilla/5.0 Chrome/144.0", null, false],
    ["www.getmasterok.ru", null, null, true],
  ])("request host=%s UA=%s marker=%s: %s", (host, ua, marker, expected) => {
    expect(isProductionAnalyticsRequest(host, ua, marker)).toBe(expected);
  });

  it("keeps GA initialization and its global queue for a normal visitor", () => {
    const w: { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void } = {};
    runInNewContext(getGoogleAnalyticsInitScript("G-TEST123"), { window: w, navigator: { webdriver: false } });
    expect(w.gtag).toBeTypeOf("function");
    expect(Array.from(w.dataLayer![1])).toEqual(["config", "G-TEST123", { send_page_view: false }]);
  });
  it("blocks page views, goals and vitals at their shared browser gate", () => {
    vi.stubGlobal("window", { location: { hostname: "getmasterok.ru" } });
    vi.stubGlobal("navigator", { webdriver: true });
    expect(isProductionAnalyticsBrowser()).toBe(false);
  });

  it.each([false, undefined])("retains analytics for normal browsers (webdriver=%s)", webdriver => {
    vi.stubGlobal("window", { location: { hostname: "getmasterok.ru" } });
    vi.stubGlobal("navigator", { webdriver });
    expect(isProductionAnalyticsBrowser()).toBe(true);
  });

  it.each([
    ["Metrika", getYandexMetrikaDeferredInitScript("108155444")],
    ["GA4", getGoogleAnalyticsInitScript("G-TEST123")],
  ])("does not initialize %s or schedule loading in webdriver", (_, script) => {
    const w = {};
    // Missing document intentionally catches even attempts to schedule or load a tag.
    runInNewContext(script, { window: w, navigator: { webdriver: true } });
    expect(w).toEqual({});
  });
});
