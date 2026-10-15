import { expect, test } from "@playwright/test";

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`purchase editing at ${width}px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true, colorScheme });
    test("returns from a purchase item to its floor and updates the price", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/redaktor/?new=1&start=room");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      const billButton = page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true });
      await billButton.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const row = bill.getByRole("article").filter({ has: page.getByRole("heading", { name: "Ламинат", exact: true }) });
      await row.getByText("Изменить материал, упаковку или цену", { exact: true }).click();
      const source = row.getByRole("button", { name: "Гостиная · Пол", exact: true });
      expect((await source.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await source.tap();
      await expect(bill).toBeHidden();
      await expect(page.getByRole("combobox", { name: "Напольное покрытие", exact: true })).toBeVisible();
      await page.locator('summary[aria-label="Упаковка и стоимость"]').click();
      await page.getByRole("button", { name: "Точное значение: Цена упаковки", exact: true }).click();
      await page.getByRole("textbox", { name: "Цена упаковки", exact: true }).fill("1250");
      await page.getByRole("button", { name: "Применить: Цена упаковки", exact: true }).click();
      await billButton.click();
      await expect(row).not.toContainText("Цена не задана");
      await expect(row).toContainText(/1\s*250\s*₽\s*\/\s*упак\./);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}

test("opens the selected wall from a grouped tile purchase", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
  await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
  await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
  await page.getByRole("button", { name: "Открыть ведомость", exact: true }).click();
  const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
  const row = bill.getByRole("article").filter({ hasText: "Плитка для стен" });
  await row.getByText("Изменить материал, упаковку или цену", { exact: true }).click();
  await row.getByRole("button", { name: "Ванная · Стена 3", exact: true }).click();
  await expect(bill).toBeHidden();
  await expect(page.getByRole("group", { name: "Выбор стены", exact: true }).getByRole("button", { name: /^Стена 3/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox", { name: "Формат плитки", exact: true })).toBeVisible();
});
