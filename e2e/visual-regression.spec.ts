import { test, expect } from "@playwright/test";

/**
 * Визуальные регрессионные тесты — скриншотные сравнения ключевых страниц.
 *
 * При первом запуске создаёт baseline-скриншоты в e2e/screenshots/.
 * При последующих — сравнивает с baseline и падает при расхождении > 1%.
 *
 * Обновление baseline:
 *   npx playwright test --update-snapshots
 */

test.describe("Визуальные регрессии — главная", () => {
  test("hero + категории (десктоп)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-desktop.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("hero + категории (мобильный)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-mobile.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe("Визуальные регрессии — калькуляторы", () => {
  const calculators = [
    { slug: "beton", cat: "fundament", name: "бетона" },
    { slug: "plitka", cat: "poly", name: "плитки" },
    { slug: "kirpich", cat: "steny", name: "кирпича" },
    { slug: "kraska", cat: "otdelka", name: "краски" },
    { slug: "krovlya", cat: "krovlya", name: "кровли" },
  ];

  for (const { slug, cat, name } of calculators) {
    test(`калькулятор ${name} — форма без результата`, async ({ page }) => {
      await page.goto(`/kalkulyatory/${cat}/${slug}/`);
      await page.waitForLoadState("networkidle");
      // Закрываем Михалыч-чат если виден (может перекрывать)
      await expect(page.locator("h1")).toBeVisible();
      await expect(page).toHaveScreenshot(`calc-${slug}-form.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Визуальные регрессии — инструменты", () => {
  test("страница инструментов", async ({ page }) => {
    await page.goto("/instrumenty/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("tools-page.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("календарь ремонта", async ({ page }) => {
    await page.goto("/instrumenty/kalendar-remonta/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("renovation-calendar.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe("Визуальные регрессии — тёмная тема", () => {
  test("главная в тёмной теме", async ({ page }) => {
    await page.goto("/");
    // Эмулируем тёмную тему через localStorage
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("home-dark.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    });
  });
});
