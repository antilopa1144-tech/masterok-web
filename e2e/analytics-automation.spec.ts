import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3456";
const isLocal = ["localhost", "127.0.0.1"].includes(new URL(base).hostname);
const origin = isLocal ? `http://getmasterok.ru:${new URL(base).port}` : base;
test.use({ launchOptions: { args: isLocal ? [
  "--host-resolver-rules=MAP getmasterok.ru 127.0.0.1",
  `--unsafely-treat-insecure-origin-as-secure=${origin}`,
] : [] } });
const humanUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const start = "/konstruktor/vannaya/";
const next = "/konstruktor/vannaya/materialy/";

// A local DNS alias exercises both production host gates, including dev HMR.
// All third-party requests are intercepted, even in the normal-visitor control.
async function routeSite(context: BrowserContext) {
  const vendors: string[] = [];
  if (isLocal) await context.grantPermissions(["local-network-access"], { origin });
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "getmasterok.ru") {
      if (/yandex|google-analytics|googletagmanager/.test(url.hostname)) vendors.push(url.href);
      return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
    }
    if (isLocal) {
      const response = await route.fetch({ url: base + url.pathname + url.search,
        headers: { ...route.request().headers(), "x-forwarded-host": "getmasterok.ru" } });
      const headers = response.headers();
      // Only this HTTP test alias lacks TLS. Keep all nonce/script restrictions.
      if (headers["content-security-policy"]) headers["content-security-policy"] =
        headers["content-security-policy"].replace(/upgrade-insecure-requests;?/g, "");
      return route.fulfill({ response, headers });
    }
    return route.continue();
  });
  return vendors;
}

async function readQueues(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as {
      ym?: { a?: ArrayLike<unknown[]> }; dataLayer?: ArrayLike<unknown[]>;
    };
    return {
      ym: Array.from(w.ym?.a ?? []).map(a => Array.from(a)),
      ga: Array.from(w.dataLayer ?? []).map(a => Array.from(a)),
    };
  });
}

test("explicit automation marker excludes scripts and noscript pixel", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, userAgent: humanUA,
    extraHTTPHeaders: { "x-masterok-automation": "1" } });
  try {
    const vendors = await routeSite(context);
    const page = await context.newPage();
    expect((await page.goto(origin + start))?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#ym-init, #ga-init, img[src*='mc.yandex.ru/watch']")).toHaveCount(0);
    expect(vendors).toEqual([]);
  } finally { await context.close(); }
});

for (const automated of [true, false]) {
  test(`${automated ? "webdriver is excluded" : "normal visitor keeps pageviews and goals"} across SPA navigation`, async ({ browser }) => {
    test.setTimeout(90_000);
    // Override the suite's automation header to exercise the client guard alone.
    const context = await browser.newContext({ userAgent: humanUA, extraHTTPHeaders: {} });
    try {
      const vendors = await routeSite(context);
      if (!automated) await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(origin + start, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();
      if (!automated) await expect.poll(async () => (await readQueues(page)).ym.filter(a => a[1] === "hit").length).toBe(1);
      await page.locator(`a[href="${next}"]`).first().click();
      await expect(page).toHaveURL(origin + next);
      if (!automated) await expect.poll(async () => (await readQueues(page)).ym.filter(a => a[1] === "hit").length).toBe(2);
      await page.goto(origin + "/instrumenty/chek-listy/zakupka-materialov-vannoy/", { waitUntil: "domcontentloaded" });
      await page.getByRole("checkbox").first().check();
      if (automated) {
        // Cover idle loading as well as interaction-triggered scripts.
        await page.waitForTimeout(13_000);
        expect(await readQueues(page)).toEqual({ ym: [], ga: [] });
        expect(vendors).toEqual([]);
      } else {
        await expect.poll(async () => (await readQueues(page)).ym.some(a => a[1] === "reachGoal")).toBe(true);
        const queues = await readQueues(page);
        expect(queues.ga.some(a => a[0] === "event" && a[1] === "page_view")).toBe(true);
        expect(vendors.some(url => url.includes("mc.yandex.ru/metrika/tag.js"))).toBe(true);
        expect(vendors.some(url => url.includes("googletagmanager.com/gtag/js"))).toBe(true);
      }
      expect(errors).toEqual([]);
    } finally {
      await context.unrouteAll({ behavior: "ignoreErrors" });
      await context.close();
    }
  });
}
