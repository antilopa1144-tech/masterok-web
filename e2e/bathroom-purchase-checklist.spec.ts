import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const route = "/instrumenty/chek-listy/zakupka-materialov-vannoy/";
const deliveryRoute = "/instrumenty/chek-listy/priemka-plitki/";

test("checklist FAQs match visible content and use their own page URLs", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const [path, question] of [
    [route, "Какие материалы для ванной не входят в ведомость конструктора?"],
    [deliveryRoute, "Что записать, если количество или маркировка не совпали?"],
    ["/instrumenty/chek-listy/pokraska-sten/", "Можно ли отмечать выполненные пункты?"],
  ]) {
    expect((await page.goto((process.env.E2E_BASE_URL ?? "http://localhost:3456") + path))?.status()).toBe(200);
    const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s));
    const faqs = schemas.filter(s => s["@type"] === "FAQPage");
    expect(faqs).toHaveLength(1);
    expect(faqs[0].url).toBe(`https://getmasterok.ru${path}`);
    expect(faqs[0].mainEntity.some((item: { name: string }) => item.name === question)).toBe(true);
    for (const item of faqs[0].mainEntity) {
      await expect(page.locator("h3").filter({ hasText: item.name })).toBeAttached();
      await expect(page.locator("p").filter({ hasText: item.acceptedAnswer.text })).toBeAttached();
    }
  }
  await context.close();
});

test("tile delivery checklist exposes its own SEO intent and inbound links", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3456";
  expect((await page.goto(base + deliveryRoute))?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Приёмка плитки после доставки");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://getmasterok.ru${deliveryRoute}`);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
  const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s));
  const steps = schemas.find(s => s["@type"] === "HowTo").step;
  expect(steps.flatMap((s: { itemListElement: unknown[] }) => s.itemListElement)).toHaveLength(12);
  for (const step of steps) for (const item of step.itemListElement) await expect(page.locator("label").filter({ hasText: item.text })).toBeAttached();
  await expect(page.locator('a[href="https://kerama-marazzi.com/razdel-voprosy-i-otvety-faq/"]')).toBeAttached();
  for (const source of [route, "/konstruktor/vannaya/materialy/", "/konstruktor/vannaya/", "/instrumenty/chek-listy/"]) {
    expect((await page.goto(base + source))?.status()).toBe(200);
    await expect(page.locator(`a[href="${deliveryRoute}"]`).first()).toBeAttached();
  }
  await context.close();
});

test("discovery feeds include tile delivery checklist", async ({ request }) => {
  for (const path of ["/sitemap-pages.xml", "/llms.txt"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(deliveryRoute);
  }
});

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
  await expect(page.locator('a[href="/konstruktor/vannaya/materialy/#compare-source-prices"]')).toBeAttached();
  await context.close();
});

for (const width of [320, 390]) {
  test.describe(`bathroom purchase checklist ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme: width === 320 ? "dark" : "light" });
    test("copies remaining checks across stages with a manual fallback and empty state", async ({ page, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      if (width === 320) {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
          Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
        });
      } else await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(width === 320 ? deliveryRoute : route);
      const labels = await page.locator('ol[aria-label="Этапы проверки"] label').allTextContents();
      await page.getByRole("checkbox").first().check();
      const copy = page.getByRole("button", { name: "Скопировать оставшиеся проверки", exact: true });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await copy.tap();
      let text: string;
      if (width === 320) {
        await expect(page.locator('p[role="alert"]')).toContainText("Браузер не разрешил копирование");
        const field = page.getByRole("textbox", { name: "Оставшиеся проверки для копирования", exact: true });
        text = await field.inputValue();
        await field.focus();
        expect(await field.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe(text.length);
      } else {
        await expect(page.getByRole("status", { name: "Результат копирования" })).toContainText("Скопировано");
        text = await page.evaluate(() => navigator.clipboard.readText());
      }
      expect(text).not.toContain(labels[0].trim());
      for (const label of labels.slice(1)) expect(text).toContain(label.trim());
      expect(text.match(/☐ /g)).toHaveLength(11);
      expect(text).toContain("не результат осмотра");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`copy-remaining-${width}.png`), fullPage: true });
      await page.getByRole("checkbox").first().uncheck();
      await expect(page.getByRole("status", { name: "Результат копирования" })).toHaveCount(0);
      await expect(page.getByRole("textbox", { name: "Оставшиеся проверки для копирования" })).toHaveCount(0);
      await page.getByRole("button", { name: /^Только оставшиеся/ }).tap();
      for (let index = 0; index < 12; index++) await page.getByRole("checkbox").first().check();
      await expect(copy).toBeDisabled();
      await expect(page.getByRole("status")).toContainText("Все пункты проверены");
      await page.emulateMedia({ media: "print" });
      await expect(copy).not.toBeVisible();
      await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(12);
      expect(errors).toEqual([]);
    });
    test("opens delivery checks from the bill without losing the project or purchase checks", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(route);
      await page.getByRole("checkbox").first().check();
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).tap();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 20_000 });
      const projectUrl = page.url();
      await page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true }).tap();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const before = await bill.getByRole("article").allTextContents();
      const link = bill.getByRole("link", { name: /Приёмка плитки после доставки/ });
      await expect(link).toHaveAttribute("target", "_blank");
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const opened = page.waitForEvent("popup");
      await link.tap();
      const popup = await opened;
      popup.on("pageerror", error => errors.push(error.message));
      await expect(popup.getByRole("heading", { level: 1 })).toHaveText("Приёмка плитки после доставки");
      await expect(popup.getByRole("checkbox", { checked: true })).toHaveCount(0);
      await popup.getByRole("checkbox").first().check();
      await popup.getByRole("button", { name: /^Только оставшиеся/ }).tap();
      await expect(popup.getByRole("checkbox")).toHaveCount(11);
      await popup.reload();
      await expect(popup.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
      await popup.getByRole("button", { name: /^Все пункты/ }).tap();
      await expect(popup.getByRole("checkbox").first()).toBeChecked();
      expect(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await popup.screenshot({ path: testInfo.outputPath("delivery-mobile.png"), fullPage: true });
      if (width === 390) {
        const pending = popup.waitForEvent("download");
        await popup.getByRole("button", { name: "📄 Скачать PDF", exact: true }).tap();
        const download = await pending;
        const output = testInfo.outputPath("tile-delivery.pdf");
        await download.saveAs(output);
        expect((await readFile(output)).subarray(0, 5).toString()).toBe("%PDF-");
      }
      await popup.getByRole("link", { name: "Чек-лист закупки материалов для ванной", exact: true }).tap();
      await expect(popup.getByRole("checkbox").first()).toBeChecked();
      await popup.close();
      await expect(page).toHaveURL(projectUrl);
      await expect(bill).toBeVisible();
      expect(await bill.getByRole("article").allTextContents()).toEqual(before);
      expect(errors).toEqual([]);
    });
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
      await page.getByRole("link", { name: "Сверить цены одного товара на разных стенах", exact: true }).tap();
      await expect(page).toHaveURL(/#compare-source-prices$/);
      await expect(page.getByRole("heading", { name: "Как сравнить цены плитки на разных стенах", exact: true })).toBeInViewport();
      expect(errors).toEqual([]);
    });
  });
}
