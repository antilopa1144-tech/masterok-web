import { expect, test } from "@playwright/test";

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`bathroom landing at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme });
    test("keeps project creation reachable from the measurement guide", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/vannaya/");
      await page.locator('a[href="#constructor-measurements"]').click();
      const start = page.getByRole("navigation", { name: "Создать проект ванной", exact: true });
      await expect(start).toBeInViewport();
      await expect.poll(async () => Math.round((await start.boundingBox())!.y)).toBe(65);
      await expect(page.getByRole("heading", { name: "Какие размеры подготовить" })).toBeInViewport();
      const button = start.getByRole("link", { name: "Создать проект", exact: true });
      const bounds = await button.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      const heading = await page.getByRole("heading", { name: "Какие размеры подготовить" }).boundingBox();
      expect(heading!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await button.tap();
      await expect(page).toHaveURL(/new=1&start=bathroom/);
      await expect(page.getByRole("textbox", { name: "Название помещения", exact: true })).toHaveValue("Ванная");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page).toHaveURL(/project=/);
      await page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Ведомость проекта" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test.describe("bathroom crawlable content", () => {
  test.use({ javaScriptEnabled: false });
  test("serves guidance, canonical and material links without the editor", async ({ page }) => {
    const response = await page.goto("/konstruktor/vannaya/");
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://getmasterok.ru/konstruktor/vannaya/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('#bathroom-tile-quantity')).toContainText("Обрезки повторно не используются");
    await expect(page.locator('a[href="/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/"]')).toHaveCount(1);
    await expect(page.locator('a[href="/kalkulyatory/poly/klej-dlya-plitki/"]')).toHaveCount(1);
    await expect(page.locator('a[href="/kalkulyatory/poly/zatirka/"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
  });
});
