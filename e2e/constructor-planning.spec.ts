import { expect, test } from "@playwright/test";

for (const [width, colorScheme] of [[390, "light"], [320, "dark"]] as const) {
  test.describe(`room and kitchen planning at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme });
    test("creates a kitchen from the mobile guide and opens the bill", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/konstruktor/");
      await page.getByRole("navigation", { name: "На этой странице", exact: true }).getByRole("link", { name: "Кухня", exact: true }).tap();
      const start = page.getByRole("navigation", { name: "Создать проект помещения", exact: true });
      await expect.poll(async () => Math.round((await start.boundingBox())!.y)).toBe(65);
      const kitchen = page.locator("#kitchen-planning");
      await expect(kitchen.getByRole("heading")).toBeInViewport();
      const bar = (await start.boundingBox())!;
      expect((await kitchen.boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const create = start.getByRole("link", { name: "Создать проект", exact: true });
      expect((await create.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await create.tap();
      await page.getByRole("button", { name: /^Кухня/ }).tap();
      await page.getByRole("button", { name: "Далее: размеры", exact: true }).tap();
      await expect(page.getByRole("textbox", { name: "Название помещения", exact: true })).toHaveValue("Кухня");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).tap();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      await expect(page).toHaveURL(/project=/);
      await expect(page.getByRole("button", { name: "Изменить размеры комнаты", exact: true })).toContainText("Кухня");
      await page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true }).tap();
      await expect(page.getByRole("dialog", { name: "Ведомость проекта" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test("room guide opens dimensions directly on desktop", async ({ page }) => {
  await page.goto("/konstruktor/");
  await expect(page.getByRole("navigation", { name: "Создать проект помещения", exact: true })).toBeHidden();
  await page.getByRole("link", { name: "Создать свою комнату", exact: true }).click();
  await expect(page).toHaveURL(/new=1&start=room/);
  await expect(page.getByRole("textbox", { name: "Название помещения", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Открыть 3D-проект", exact: true })).toBeVisible();
});

test.describe("crawlable planning advice", () => {
  test.use({ javaScriptEnabled: false });
  test("renders room and kitchen advice with matching FAQ structured data", async ({ page }) => {
    const response = await page.goto("/konstruktor/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://getmasterok.ru/konstruktor/");
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    await expect(page.locator("#room-planning")).toContainText("не вычитается из площади пола");
    await expect(page.locator("#kitchen-planning")).toContainText("столешница и подключения здесь не проектируются");
    const structured = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(text => JSON.parse(text));
    const faq = structured.find(item => item["@type"] === "FAQPage");
    const kitchen = faq.mainEntity.find((item: { name: string }) => item.name === "Можно ли спланировать кухню в 3D?");
    const disclosure = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: kitchen.name }) });
    await disclosure.locator("summary").click();
    await expect(disclosure.locator("p")).toHaveText(kitchen.acceptedAnswer.text);
  });
});

for (const [width, manual] of [[390, false], [320, true], [1280, false]] as const) {
  test.describe(`room dimensions message at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600, colorScheme: manual ? "dark" : "light" });
    test("copies current dimensions, supports denied clipboard and clears stale feedback after editing", async ({ page, context }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      if (manual) await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } }));
      else await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      await page.getByRole("button", { name: "Изменить размеры комнаты", exact: true }).click();
      const panel = page.getByRole("complementary", { name: "Параметры выбранной комнаты" });
      const copy = panel.getByRole("button", { name: "Скопировать размеры", exact: true });
      const field = panel.getByRole("textbox", { name: "Размеры выбранной комнаты", exact: true });
      const success = panel.getByRole("status").filter({ hasText: "Размеры комнаты скопированы" });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await copy.click();
      if (manual) {
        await expect(field).toBeVisible();
        await panel.getByRole("button", { name: "Выделить весь текст", exact: true }).click();
        expect(await field.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe((await field.inputValue()).length);
      } else await expect(success).toBeVisible();
      await panel.getByRole("button", { name: "Точное значение: Ширина", exact: true }).click();
      await panel.getByRole("textbox", { name: "Ширина", exact: true }).fill("0");
      await expect(copy).toBeDisabled();
      await panel.getByRole("textbox", { name: "Ширина", exact: true }).fill("2450");
      await panel.getByRole("button", { name: "Применить: Ширина", exact: true }).click();
      await expect(success).toHaveCount(0);
      await expect(field).toHaveCount(0);
      await copy.click();
      if (manual) await expect(field).toBeVisible();
      else await expect(success).toBeVisible();
      const text = (manual ? await field.inputValue() : await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\u00a0", " ");
      expect(text).toContain("ширина 2 450 мм");
      expect(text).toContain("Только выбранная комната");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await copy.scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`room-dimensions-${width}.png`) });
    });
  });
}
