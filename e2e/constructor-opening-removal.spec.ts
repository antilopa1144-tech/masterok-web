import { expect, test } from "@playwright/test";

async function addDoorFromBathroom(page: import("@playwright/test").Page) {
  await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
  await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
  await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
  await page.getByRole("button", { name: "Изменить размеры комнаты", exact: true }).click();

  const roomPanel = page.getByRole("complementary", { name: "Параметры выбранной комнаты" });
  await roomPanel.getByRole("button", { name: "Дверь", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Добавить дверь", exact: true });
  const next = dialog.getByRole("button", { name: "Далее: размеры", exact: true });
  if (await next.isVisible()) await next.click();
  await dialog.getByRole("button", { name: "Добавить дверь", exact: true }).click();
  await expect(roomPanel.getByText("Дверь 1", { exact: true })).toBeVisible();
  return roomPanel;
}

for (const [width, colorScheme] of [[1280, "light"], [390, "light"], [320, "dark"]] as const) {
  test.describe(`opening removal at ${width}px ${colorScheme}`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600, colorScheme });

    test("keeps a door after cancelling, removes it after confirmation, and restores it with Undo", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const roomPanel = await addDoorFromBathroom(page);
      const remove = roomPanel.getByRole("button", { name: "Удалить проём 1", exact: true });

      expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await remove.click();
      const confirmation = roomPanel.getByRole("group", { name: "Удалить дверь 1?", exact: true });
      await expect(confirmation).toContainText("План и ведомость материалов пересчитаются.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const confirmButton = confirmation.getByRole("button", { name: "Удалить дверь 1", exact: true });
      expect((await confirmButton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: test.info().outputPath(`opening-removal-confirmation-${width}-${colorScheme}.png`) });
      await confirmation.getByRole("button", { name: "Отмена", exact: true }).click();
      await expect(roomPanel.getByText("Дверь 1", { exact: true })).toBeVisible();
      await expect(remove).toBeFocused();

      await remove.click();
      await confirmButton.click();
      await expect(roomPanel.getByText("Дверь 1", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Отменить действие", exact: true }).click();
      await expect(roomPanel.getByText("Дверь 1", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`opening-removal-restored-${width}-${colorScheme}.png`) });
    });
  });
}
