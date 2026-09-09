import { expect, test } from "@playwright/test";

for (const width of [360, 1440]) {
  for (const theme of ["Светлая", "Тёмная"]) {
    test(`D2: laminate purchase explanation, ${width}px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/kalkulyatory/poly/laminat/");
      await page.getByRole("button", { name: "Выбрать тему оформления", exact: true }).click();
      await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
      await page.getByRole("button", { name: "Рассчитать", exact: true }).click();
      const explanation = page.getByRole("region", { name: "Потребность и покупка" });
      await expect(explanation).toBeVisible();
      await expect(explanation.getByText(/Нужно: 24,28 м²/)).toBeVisible();
      await expect(explanation.getByText(/Остаток: 2,09 м²/)).toBeVisible();
      await expect(explanation.getByText(/11 шт\. × 2,397 м²/)).toBeVisible();
      expect(await explanation.evaluate(el => el.closest("details") === null)).toBe(true);
      const materialHeading = page.getByRole("heading", { name: "Список материалов", exact: true });
      expect((await explanation.boundingBox())!.y).toBeLessThan((await materialHeading.boundingBox())!.y);
      await page.getByText("Почему получился такой результат", { exact: false }).click();
      await expect(page.getByText("Явный запас: 10%", { exact: true })).toBeVisible();
      await expect(page.getByText(/reserve_percent/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Recalculation must replace, not duplicate, the visible explanation.
      await page.getByRole("button", { name: "Рассчитать", exact: true }).click();
      await expect(explanation).toHaveCount(1);
      await expect(explanation.getByText(/Нужно: 24,28 м²/)).toBeVisible();
    });
  }
}

test("D2: mobile saving preserves the visible purchase explanation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/kalkulyatory/poly/laminat/");
  await page.getByRole("button", { name: "Рассчитать", exact: true }).click();
  await page.getByRole("button", { name: "В проект", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Сохранить расчёт в проект" });
  await dialog.getByPlaceholder("Название проекта...").fill("Проверка D2 — напольное покрытие комнаты");
  await dialog.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(dialog.getByText("Расчёт добавлен", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Остаться здесь", exact: true }).click();
  await expect(page.getByRole("region", { name: "Потребность и покупка" })).toBeVisible();
  await page.getByRole("button", { name: "В проект", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Проверка D2 — напольное покрытие комнаты/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
