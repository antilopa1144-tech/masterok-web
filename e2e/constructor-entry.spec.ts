import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test.describe(`constructor own-project entry at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });

    test("creates a separate project when returning through the landing page", async ({ page }) => {
      test.setTimeout(60_000);
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.goto("/konstruktor/");
      const names = ["Первый проект · проверка", "Второй проект · проверка"];
      const ids: string[] = [];

      for (const [index, name] of names.entries()) {
        const createLink = index === 0
          ? page.getByRole("link", { name: /^Создать свой проект/ }).first()
          : page.getByRole("link", { name: "Новый проект", exact: true }).first();
        await createLink.click();
        await page.getByRole("button", { name: /^Гостиная/ }).click();
        await page.getByRole("button", { name: "Далее: размеры", exact: true }).click();
        const roomName = page.getByRole("textbox", { name: "Название помещения", exact: true });
        await roomName.fill(name);
        await roomName.press("Enter");
        await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
        await expect(page.getByText("Сохранено в браузере", { exact: true })).toBeAttached({ timeout: 15_000 });
        await expect(page).toHaveURL(/\?project=/);
        ids.push(new URL(page.url()).searchParams.get("project")!);
        await page.locator('a[href="/konstruktor/"]:visible').first().click();
        await expect(page).toHaveURL(/\/konstruktor\/$/);
      }

      expect(new Set(ids).size).toBe(2);
      await page.getByRole("button", { name: "Мои проекты", exact: true }).first().click();
      const savedProjects = page.getByRole("dialog", { name: "Сохранённые проекты", exact: true });
      for (const name of names) await expect(savedProjects.getByText(name, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Закрыть список проектов", exact: true }).click();

      for (const [index, name] of names.entries()) {
        await page.getByRole("button", { name: "Мои проекты", exact: true }).first().click();
        await savedProjects.getByRole("link").filter({ has: page.getByText(name, { exact: true }) }).click();
        await expect(page).toHaveURL(url => url.searchParams.get("project") === ids[index]);
        await expect(page.getByText("Сохранено в браузере", { exact: true })).toBeAttached({ timeout: 15_000 });
        await expect(page.getByRole("textbox", { name: "Название проекта", exact: true })).toHaveValue(name);
        await expect(page.getByRole("button", { name: "Изменить размеры комнаты", exact: true })).toContainText(name);
        await page.locator('a[href="/konstruktor/"]:visible').first().click();
        await expect(page).toHaveURL(/\/konstruktor\/$/);
      }
      expect(pageErrors, "browser runtime errors").toEqual([]);
    });
  });
}
