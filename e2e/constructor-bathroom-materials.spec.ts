import { expect, test } from "@playwright/test";
import { Workbook } from "exceljs";

const route = "/konstruktor/vannaya/materialy/";

test.describe("bathroom procurement SEO", () => {
  test.use({ javaScriptEnabled: false });
  test("guide exposes canonical, matching FAQ and honest scope", async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://getmasterok.ru${route}`);
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    await expect(page.locator("#separate-materials")).toContainText("не добавляются в ведомость конструктора автоматически");
    await expect(page.locator("#mixture-settings")).toContainText("Настройки относятся ко всей её плиточной отделке");
    await expect(page.locator("#purchase-check")).toContainText("расход, фасовка и цена здесь общие");
    await expect(page.locator("#material-prices")).toContainText("1 440 ₽");
    await expect(page.locator("#material-prices")).toContainText("максимальную введённую цену");
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(text => JSON.parse(text));
    const faq = data.find(item => item["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(8);
    for (const item of faq.mainEntity) {
      const detail = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: item.name }) });
      await detail.locator("summary").click();
      await expect(detail.locator("p")).toHaveText(item.acceptedAnswer.text);
    }
  });
  for (const path of ["/konstruktor/vannaya/", "/instrumenty/raskladka-plitki/", "/kalkulyatory/poly/klej-dlya-plitki/"]) {
    test(`procurement guide linked from ${path}`, async ({ page }) => {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.locator(`a[href="${route}"]`).first()).toBeAttached();
      if (path === "/konstruktor/vannaya/") await expect(page.locator('a[href="/instrumenty/chek-listy/zakupka-materialov-vannoy/"]')).toBeAttached();
    });
  }
  test("discovery feeds include procurement guide", async ({ request }) => {
    for (const path of ["/sitemap-pages.xml", "/llms.txt"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(route);
    }
  });
});

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`bathroom purchase prices at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme });
    test("finds unpriced items without filtering totals or export and resets on reopen", async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Проверить стоимость", exact: true }).tap();
      await expect(page.getByRole("heading", { name: "Как проверить стоимость материалов для ванной", exact: true })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath("price-guide.png") });
      await page.getByRole("link", { name: "Перед покупкой", exact: true }).tap();
      const start = page.getByRole("navigation", { name: "Создать ванную для закупки", exact: true });
      const bounds = (await start.boundingBox())!;
      expect((await page.locator("#purchase-check").boundingBox())!.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
      await start.getByRole("link", { name: "Создать проект", exact: true }).tap();
      await expect(page.getByRole("button", { name: "Открыть 3D-проект", exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).tap();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 20_000 });
      const openBill = page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true });
      await openBill.tap();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const priceFilter = bill.getByRole("group", { name: "Фильтр по цене", exact: true });
      await expect(priceFilter).toBeVisible();
      await expect(bill.getByRole("searchbox", { name: "Найти материал", exact: true })).toBeHidden();
      await expect(priceFilter.getByRole("button", { name: "Без цены · 2", exact: true })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath("price-filter.png") });
      const checklist = bill.getByRole("link", { name: /Чек-лист закупки ванной/ });
      await expect(checklist).toHaveAttribute("href", "/instrumenty/chek-listy/zakupka-materialov-vannoy/");
      await expect(checklist).toHaveAttribute("target", "_blank");
      if (width === 390) {
        const opened = page.waitForEvent("popup");
        await checklist.tap();
        const popup = await opened;
        await expect(popup.getByRole("heading", { level: 1 })).toHaveText("Закупка материалов для ванной");
        await popup.close();
        await expect(bill).toBeVisible();
      }
      const floor = bill.getByRole("article").filter({ has: page.getByRole("heading", { name: "Плитка · Напольная плитка", exact: true }) });
      await floor.getByText("Изменить материал, упаковку или цену", { exact: true }).tap();
      await floor.getByRole("button", { name: "Упаковка и цена: Ванная · Пол", exact: true }).tap();
      await page.getByRole("button", { name: "Точное значение: Цена упаковки напольной плитки", exact: true }).tap();
      await page.getByRole("textbox", { name: "Цена упаковки напольной плитки", exact: true }).fill("1250");
      await page.getByRole("button", { name: "Применить: Цена упаковки напольной плитки", exact: true }).tap();
      await openBill.tap();
      const names = await bill.getByRole("article").getByRole("heading").allTextContents();
      const rows = await bill.getByRole("article").allTextContents();
      const total = (await bill.locator('[class*="purchaseTotal"]').textContent())!;
      await expect(bill.getByRole("searchbox", { name: "Найти материал", exact: true })).toBeHidden();
      const unpriced = bill.getByRole("button", { name: /^Без цены ·/ });
      expect((await unpriced.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await unpriced.tap();
      await expect(unpriced).toHaveAttribute("aria-pressed", "true");
      await expect(bill.getByRole("article")).toHaveCount(names.length - 1);
      await expect(floor).toHaveCount(0);
      await expect(bill.locator('[class*="purchaseTotal"]')).toHaveText(total);
      await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).tap();
      const search = bill.getByRole("searchbox", { name: "Найти материал", exact: true });
      await search.fill("несуществующий материал");
      await expect(bill.getByText(/Позиций без цены по этим условиям не найдено/)).toBeVisible();
      await bill.getByRole("button", { name: "Сбросить поиск", exact: true }).tap();
      await expect(unpriced).toHaveAttribute("aria-pressed", "true");
      if (width === 390) {
        const pending = page.waitForEvent("download");
        await bill.getByRole("button", { name: "Скачать XLSX", exact: true }).tap();
        const download = await pending;
        expect(await download.failure()).toBeNull();
        const book = new Workbook();
        await book.xlsx.readFile((await download.path())!);
        const exported: string[] = [];
        book.getWorksheet("К покупке")!.eachRow((row, index) => { if (index > 1) exported.push(String(row.getCell(1).value)); });
        expect(exported).toEqual(expect.arrayContaining(names));
      }
      await bill.getByRole("button", { name: /^Все позиции ·/ }).tap();
      expect(await bill.getByRole("article").allTextContents()).toEqual(rows);
      await unpriced.tap();
      await search.fill("несуществующий материал");
      await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).tap();
      const showAll = bill.getByRole("button", { name: "Показать все материалы", exact: true });
      await expect(showAll).toBeVisible();
      expect((await showAll.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await showAll.tap();
      await expect(bill.getByRole("article")).toHaveCount(names.length);
      await expect(showAll).toHaveCount(0);
      await bill.getByRole("button", { name: "Закрыть окно", exact: true }).tap();
      await openBill.tap();
      await expect(bill.getByRole("article")).toHaveCount(names.length);
      const walls = bill.getByRole("article").filter({ has: page.getByRole("heading", { name: "Плитка для стен", exact: true }) });
      await walls.getByText("Изменить материал, упаковку или цену", { exact: true }).tap();
      await walls.getByRole("button", { name: "Упаковка и цена: Ванная · Стена 1", exact: true }).tap();
      await page.getByRole("button", { name: "Точное значение: Цена упаковки плитки", exact: true }).tap();
      await page.getByRole("textbox", { name: "Цена упаковки плитки", exact: true }).fill("1440");
      await page.getByRole("button", { name: "Применить: Цена упаковки плитки", exact: true }).tap();
      await openBill.tap();
      await bill.getByRole("button", { name: "Без цены · 0", exact: true }).tap();
      await expect(bill.getByRole("article")).toHaveCount(0);
      await expect(bill.getByText(/Позиций без цены по этим условиям не найдено/)).toBeVisible();
      await bill.getByRole("button", { name: "Показать все материалы", exact: true }).tap();
      await expect(bill.getByRole("article")).toHaveCount(names.length);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
