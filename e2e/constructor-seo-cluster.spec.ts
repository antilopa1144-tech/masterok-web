import { expect, test } from "@playwright/test";

const route = "/konstruktor/plan-komnaty/";

test.describe("constructor search entries without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("plan has crawlable content, canonical and matching questions", async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("План комнаты");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://getmasterok.ru${route}`);
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(text => JSON.parse(text));
    const faq = data.find(item => item["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(5);
    for (const question of faq.mainEntity) {
      const disclosure = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: question.name }) });
      await disclosure.locator("summary").click();
      await expect(disclosure.locator("p")).toHaveText(question.acceptedAnswer.text);
    }
    const links = page.getByRole("navigation", { name: "Планирование ремонта", exact: true });
    await expect(links.getByRole("link", { name: /Планировка ванной/ })).toHaveAttribute("href", "/konstruktor/vannaya/");
  });

  test("discovery feeds include the plan route", async ({ request }) => {
    const index = await request.get("/sitemap.xml");
    expect(index.status()).toBe(200);
    const locations = [...(await index.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    expect(locations).toEqual(["https://getmasterok.ru/sitemap-pages.xml"]);
    for (const path of ["/sitemap-pages.xml", "/llms.txt"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(route);
    }
  });

  for (const path of ["/konstruktor/", "/konstruktor/vannaya/", "/konstruktor/rasstanovka-mebeli/", "/instrumenty/ploshchad-komnaty/", "/instrumenty/raskladka-plitki/", "/instrumenty/raskladka-laminata/"]) {
    test(`plan is discoverable from ${path}`, async ({ page }) => {
      expect((await page.goto(path))?.status()).toBe(200);
      // Next may stream tool content into a hidden segment until its bootstrap runs.
      // Check actual HTML links here; the interactive flow below checks visibility.
      const links = page.locator('nav[aria-label="Планирование ремонта"]');
      await expect(links.locator(`a[href="${route}"]`)).toHaveText(/План комнаты с размерами/);
    });
  }
});

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`plan entry ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme });
    test("starts own room, opens plan and material bill", async ({ page }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Что измерить", exact: true }).tap();
      const start = page.getByRole("navigation", { name: "Создать план комнаты", exact: true });
      const button = start.getByRole("link", { name: "Создать проект", exact: true });
      await expect(button).toBeInViewport();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const top = (await page.locator("#constructor-measurements").boundingBox())!.y;
      const bar = (await start.boundingBox())!;
      expect(top).toBeGreaterThanOrEqual(bar.y + bar.height);
      await button.tap();
      await expect(page).toHaveURL(/new=1&start=room/, { timeout: 30_000 });
      await expect(page.getByRole("textbox", { name: "Название помещения", exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).tap();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 20_000 });
      await page.getByRole("button", { name: "План", exact: true }).tap();
      await expect(page.getByRole("button", { name: "План", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true }).tap();
      await expect(page.getByRole("dialog", { name: "Ведомость проекта" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
