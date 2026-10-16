import { expect, test } from "@playwright/test";
import { Workbook } from "exceljs";

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`purchase search at ${width}px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true, colorScheme });
    test("finds tile by format, clears empty results and resets on reopen", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      const open = page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true });
      await open.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const tools = bill.locator("summary").filter({ hasText: "Найти или отправить список" });
      // Both purchase amounts must be readable without scrolling the default mobile bill.
      const second = bill.getByRole("article").nth(1).getByText("К покупке", { exact: true });
      expect((await second.boundingBox())!.y + (await second.boundingBox())!.height).toBeLessThan((await bill.getByRole("button", { name: "Скачать PDF", exact: true }).boundingBox())!.y);
      const first = bill.getByRole("article").first();
      await expect(first.getByText("Нужно с резервом", { exact: true })).not.toBeVisible();
      await first.locator("summary").filter({ hasText: "Расчёт и запас" }).tap();
      await expect(first.getByText("Нужно с резервом", { exact: true })).toBeVisible();
      await first.locator("summary").filter({ hasText: "Расчёт и запас" }).tap();
      await tools.tap();
      const search = bill.getByRole("searchbox", { name: "Найти материал", exact: true });
      const count = await bill.getByRole("article").count();
      expect(count).toBeGreaterThan(1);
      const wallBefore = await bill.getByRole("article").filter({ has: page.getByRole("heading", { name: "Плитка для стен", exact: true }) }).innerText();
      await search.fill("600x300");
      await expect(bill.getByRole("article")).toHaveCount(1);
      expect(await bill.getByRole("article").innerText()).toBe(wallBefore);
      await search.fill("несуществующий товар");
      await expect(bill.getByRole("article")).toHaveCount(0);
      await expect(bill.getByText(/Материалы не найдены/)).toBeVisible();
      const reset = bill.getByRole("button", { name: "Сбросить поиск", exact: true });
      expect((await reset.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await reset.tap();
      await expect(bill.getByRole("article")).toHaveCount(count);
      await search.fill("графит");
      await expect(bill.getByRole("article")).toHaveCount(1);
      await tools.tap();
      await expect(tools).toContainText("Поиск применён: 1 из 2");
      await expect(bill.getByRole("article")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await bill.getByRole("button", { name: "Закрыть окно", exact: true }).click();
      await open.click();
      await expect(tools).not.toContainText("Поиск применён");
      await tools.tap();
      await expect(search).toHaveValue("");
      await expect(bill.getByRole("article")).toHaveCount(count);
      expect(errors).toEqual([]);
    });
  });
}

test("XLSX retains every purchase while the visible list is filtered", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
  await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
  await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
  await page.getByRole("button", { name: "Открыть ведомость", exact: true }).click();
  const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
  await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).click();
  const names = await bill.getByRole("article").getByRole("heading").allTextContents();
  await bill.getByRole("searchbox", { name: "Найти материал", exact: true }).fill("графит");
  await expect(bill.getByRole("article")).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await bill.getByRole("button", { name: "Скачать XLSX", exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const book = new Workbook();
  await book.xlsx.readFile((await download.path())!);
  const sheet = book.getWorksheet("К покупке")!;
  const exported: string[] = [];
  sheet.eachRow((row, index) => { if (index > 1) exported.push(String(row.getCell(1).value)); });
  expect(exported).toEqual(expect.arrayContaining(names));
});
