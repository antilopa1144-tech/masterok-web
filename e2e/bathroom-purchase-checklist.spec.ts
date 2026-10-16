import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const route = "/instrumenty/chek-listy/zakupka-materialov-vannoy/";

test("bathroom checklist has server-rendered content, canonical and linked guide", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto((process.env.E2E_BASE_URL ?? "http://localhost:3456") + route);
  await expect(page.locator("h1")).toHaveText("Закупка материалов для ванной");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://getmasterok.ru${route}`);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
  const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s));
  const steps = schemas.find(s => s["@type"] === "HowTo").step;
  expect(steps.flatMap((s: { itemListElement: unknown[] }) => s.itemListElement)).toHaveLength(12);
  for (const step of steps) for (const item of step.itemListElement) {
    await expect(page.locator("label").filter({ hasText: item.text })).toBeAttached();
  }
  await expect(page.locator('a[href="/konstruktor/vannaya/materialy/"]')).toBeAttached();
  await context.close();
});

for (const width of [320, 390]) {
  test.describe(`bathroom purchase checklist ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme: width === 320 ? "dark" : "light" });
    test("remaining checks span all stages while print keeps all items and marks", async ({ page }, testInfo) => {
      await page.goto(route);
      const checks = page.getByRole("checkbox");
      await expect(checks.first()).toBeEnabled();
      await checks.first().check();
      const remaining = page.getByRole("button", { name: /^Только оставшиеся/ });
      expect((await remaining.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await remaining.click();
      await expect(checks).toHaveCount(11);
      await checks.first().focus();
      await page.keyboard.press("Space");
      await expect(checks).toHaveCount(10);
      await expect(checks.first()).toBeFocused();
      await page.emulateMedia({ media: "print" });
      await expect(checks).toHaveCount(12);
      await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(2);
      await expect(remaining).not.toBeVisible();
      if (width === 390) await page.pdf({ path: testInfo.outputPath("marked-checklist.pdf"), format: "A4" });
      await page.emulateMedia({ media: "screen" });
      await expect(checks).toHaveCount(10);
      for (let index = 0; index < 10; index++) await checks.first().check();
      await expect(page.getByRole("status")).toContainText("Все пункты проверены");
      await page.getByRole("button", { name: /^Все пункты/ }).click();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
      await page.reload();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
      await checks.first().uncheck();
      await remaining.click();
      await expect(checks).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`remaining-${width}.png`), fullPage: true });
      page.once("dialog", dialog => dialog.accept());
      await page.getByRole("button", { name: "Сбросить отметки" }).click();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
      await page.emulateMedia({ media: "print" });
      await expect(checks).toHaveCount(12);
      await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
    });
    test("retains progress, resets it and exports readable Russian PDF", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/vannaya/materialy/");
      await page.getByRole("link", { name: /чек-лист закупки материалов ванной — 12/ }).click();
      await expect(page).toHaveURL(new RegExp(route));
      const checks = page.getByRole("checkbox");
      await expect(checks.first()).toBeEnabled();
      await checks.first().check();
      await page.reload();
      await expect(checks.first()).toBeChecked();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      page.once("dialog", dialog => dialog.accept());
      await page.getByRole("button", { name: "Сбросить отметки" }).click();
      await expect(checks.first()).not.toBeChecked();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
      const pdf = page.getByRole("button", { name: "📄 Скачать PDF", exact: true });
      if (width === 390) {
        await page.route("**/fonts/Roboto-Regular.ttf", r => r.fulfill({ status: 503, body: "unavailable" }));
        await pdf.click();
        await expect(page.locator('p[role="alert"]')).toContainText("Не загрузился шрифт");
        await expect(pdf).toBeEnabled();
        await page.unroute("**/fonts/Roboto-Regular.ttf");
      }
      const pending = page.waitForEvent("download");
      await pdf.click();
      const download = await pending;
      const output = testInfo.outputPath("bathroom-checklist.pdf");
      await download.saveAs(output);
      const bytes = await readFile(output);
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.toString("latin1")).toContain("/BaseFont /Roboto");
      expect(bytes.toString("latin1")).toContain("/ToUnicode");
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}
