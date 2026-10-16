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

for (const width of [320, 390, 1280]) {
  test.describe(`missing mixture navigation at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 640 : 844 }, isMobile: width < 980, hasTouch: width < 980, colorScheme: width === 320 ? "dark" : "light" });
    test("fixes missing rates from the bill, persists them and reopens mixture settings", async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 20_000 });
      const nav = page.getByRole("navigation", { name: "Разделы конструктора" });
      const openBill = width < 980 ? nav.getByRole("button", { name: "Ведомость", exact: true }) : page.getByRole("button", { name: "Открыть ведомость", exact: true });
      if (width < 980) await nav.getByRole("button", { name: "Отделка", exact: true }).click();
      const settings = page.locator('summary[aria-label="Клей и затирка"]');
      await settings.click();
      await page.getByRole("checkbox", { name: "Добавить клей", exact: true }).check();
      await page.getByRole("checkbox", { name: "Добавить затирку", exact: true }).check();
      await openBill.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const warning = bill.getByRole("region", { name: "Смеси без расхода", exact: true });
      await expect(warning).toContainText("Смесей без заданного расхода: 2");
      await expect(warning).toContainText("Ванная: клей и затирка");
      const fix = warning.getByRole("button", { name: "Указать расход · Ванная", exact: true });
      expect((await fix.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: testInfo.outputPath("missing-mixtures.png") });
      await fix.click();
      await expect(bill).toBeHidden();
      await expect(settings).toBeFocused();
      await expect(settings).toBeInViewport();
      await expect(settings.locator("..")).toHaveAttribute("open", "");
      if (width < 980) await expect(page.getByRole("button", { name: "Свернуть параметры", exact: true })).toHaveAttribute("aria-expanded", "true");
      await page.screenshot({ path: testInfo.outputPath("mixture-settings.png") });
      // A synthetic input for interaction testing, not a recommended construction rate.
      await page.getByRole("button", { name: "Точное значение: Расход клея", exact: true }).click();
      await page.getByRole("textbox", { name: "Расход клея", exact: true }).fill("1.25");
      await page.getByRole("button", { name: "Применить: Расход клея", exact: true }).click();
      await openBill.click();
      await expect(warning).toContainText("Смесей без заданного расхода: 1");
      await expect(warning).toContainText("Ванная: затирка");
      const adhesive = bill.getByRole("article").filter({ has: page.getByRole("heading", { name: /Плиточный клей/ }) });
      await expect(adhesive).toHaveCount(1);
      await fix.click();
      await page.getByRole("checkbox", { name: "Добавить затирку", exact: true }).uncheck();
      await openBill.click();
      await expect(warning).toHaveCount(0);
      await bill.getByRole("button", { name: "Закрыть окно", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached();
      await page.reload();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 20_000 });
      await openBill.click();
      await expect(warning).toHaveCount(0);
      await adhesive.getByText("Изменить материал, упаковку или цену", { exact: true }).click();
      await adhesive.getByRole("button", { name: "Ванная · Пол", exact: true }).click();
      await expect(settings).toBeFocused();
      await expect(settings).toBeInViewport();
      await expect(page.getByRole("checkbox", { name: "Добавить затирку", exact: true })).not.toBeChecked();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
