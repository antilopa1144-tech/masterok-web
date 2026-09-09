import { expect, test } from "@playwright/test";

for (const width of [360, 390, 768, 1440]) {
  test(`D3: tools grouped by task, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/instrumenty/");
    const nav = page.getByRole("navigation", { name: "Группы инструментов" });
    await expect(nav).toBeVisible();
    for (const group of ["Раскладки", "Раскрой", "Планирование", "Справочники"]) {
      await nav.getByRole("link", { name: group, exact: false }).click();
      const heading = page.getByRole("heading", { name: group, exact: true });
      await expect(heading).toBeVisible();
      await expect.poll(async () => {
        const box = await heading.boundingBox();
        return box != null && box.y >= 64 && box.y < 800;
      }).toBe(true);
    }
    await expect(page.getByRole("link", { name: "Проекты — сохранённые расчёты и списки закупок", exact: true })).toHaveAttribute("href", "/proekty/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Выбрать тему оформления", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Тёмная", exact: true }).click();
    await page.getByRole("heading", { name: "Раскладки", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("tools.png"), animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('a[href="/instrumenty/lineynyy-raskroy/"]').click();
    await expect(page).toHaveURL(/\/instrumenty\/lineynyy-raskroy\//);
  });
}
