import { test, expect } from "@playwright/test";

test.describe("Главная страница", () => {
  test("загружается и содержит заголовок", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Мастерок/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("hero-секция видна сразу (стриминг)", async ({ page }) => {
    await page.goto("/");
    // Hero должен быть виден мгновенно
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
    // Скелетон для категорий (пока стримится)
    await expect(page.locator(".animate-pulse").first()).toBeVisible({ timeout: 3000 });
    // Категории должны загрузиться
    await expect(page.locator("text=Фундамент и основание")).toBeVisible({ timeout: 15000 });
  });

  test("навигация работает", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("Калькуляторы")');
    await expect(page).toHaveURL(/\/kalkulyatory\//);
  });
});

test.describe("Калькулятор бетона", () => {
  test("открывается и содержит форму", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");
    await expect(page.locator("h1")).toContainText("бетона");
  });

  test("рассчитывает материалы при нажатии кнопки", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");

    // Меняем значение слайдера объёма
    const volumeInput = page.locator('input[aria-label="Объём бетона"]').first();
    await volumeInput.fill("5");

    // Нажимаем «Рассчитать»
    await page.click('button:has-text("Рассчитать")');

    // Ждём появления результатов
    await expect(page.locator("text=Бетон М200")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Арматура")).toBeVisible({ timeout: 5000 });
  });

  test("меняет сопутку при смене применения", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");

    // Выбираем «Стяжка пола»
    await page.click('[aria-label="Применение бетона"]');
    await page.click('text=Стяжка пола');

    // Нажимаем «Рассчитать»
    await page.click('button:has-text("Рассчитать")');

    // Сетка кладочная вместо арматуры
    await expect(page.locator("text=Сетка кладочная")).toBeVisible({ timeout: 10000 });
    // Мастики быть не должно (она только для фундамента)
    await expect(page.locator("text=Мастика")).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe("Мобильная адаптация", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("главная не ломается на мобильном", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // Проверяем что нет горизонтального скролла
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("калькулятор работает на мобильном", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");
    await expect(page.locator("h1")).toBeVisible();
    await page.click('button:has-text("Рассчитать")');
    await expect(page.locator("text=Бетон М200")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("SEO", () => {
  test("страницы имеют правильные мета-теги", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");
    await expect(page).toHaveTitle(/Мастерок/);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /./);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /beton/);
  });

  test("404 страница работает", async ({ page }) => {
    await page.goto("/nonexistent-page/");
    await expect(page.locator("text=Страница не найдена")).toBeVisible();
  });
});
