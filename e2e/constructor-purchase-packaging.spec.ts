import { expect, test } from "@playwright/test";

for (const [width, colorScheme, scenario, source, priceLabel] of [
  [390, "light", "room", "Гостиная · Пол", "Цена упаковки"],
  [320, "dark", "bathroom", "Ванная · Пол", "Цена упаковки напольной плитки"],
  [1440, "light", "bathroom", "Ванная · Стена 3", "Цена упаковки плитки"],
] as const) {
  test.describe(`direct packaging at ${width}px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: width < 980, hasTouch: width < 980, colorScheme });
    test("opens the correct surface packaging, validates price and saves it", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`/konstruktor/redaktor/?new=1&start=${scenario}`);
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      const openBill = width < 980
        ? page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true })
        : page.getByRole("button", { name: "Открыть ведомость", exact: true });
      await openBill.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const row = bill.getByRole("article").filter({ has: page.getByRole("heading", { name: scenario === "room" ? "Ламинат" : source.includes("Стена") ? "Плитка для стен" : "Плитка · Напольная плитка", exact: true }) });
      await row.getByText("Изменить материал, упаковку или цену", { exact: true }).click();
      const shortcut = row.getByRole("button", { name: `Упаковка и цена: ${source}`, exact: true });
      expect((await shortcut.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await shortcut.click();
      await expect(bill).toBeHidden();
      const summary = page.locator('summary[aria-label="Упаковка и стоимость"]');
      await expect(summary).toBeFocused();
      expect(await summary.evaluate(node => (node.parentElement as HTMLDetailsElement).open)).toBe(true);
      const bounds = (await summary.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThan(680);
      if (source.includes("Стена")) await expect(page.getByRole("group", { name: "Выбор стены", exact: true }).getByRole("button", { name: /^Стена 3/ })).toHaveAttribute("aria-pressed", "true");
      const exactPrice = page.getByRole("button", { name: `Точное значение: ${priceLabel}`, exact: true });
      const priceBounds = (await exactPrice.boundingBox())!;
      expect(priceBounds.y).toBeGreaterThanOrEqual(0);
      expect(priceBounds.y + priceBounds.height).toBeLessThan(612);
      await exactPrice.click();
      const price = page.getByRole("textbox", { name: priceLabel, exact: true });
      await price.fill("");
      await expect(openBill).toBeDisabled();
      await price.fill("1250");
      await page.getByRole("button", { name: `Применить: ${priceLabel}`, exact: true }).click();
      await openBill.click();
      await expect(bill.getByRole("article").filter({ hasText: /1\s*250\s*₽\s*\/\s*упак\./ })).toHaveCount(1);
      await bill.getByRole("button", { name: "Закрыть окно", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached();
      await page.reload();
      await openBill.click();
      await expect(bill.getByRole("article").filter({ hasText: /1\s*250\s*₽\s*\/\s*упак\./ })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
