import { expect, test } from "@playwright/test";

for (const [width, manual] of [[390, false], [320, true]] as const) {
  test.describe(`copy purchases at ${width}px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true, colorScheme: manual ? "dark" : "light" });
    test("copies the whole project or offers selectable text if clipboard is denied", async ({ page, context }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      if (manual) {
        await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } }));
      } else await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      const open = page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true });
      await open.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      const names = await bill.getByRole("article").getByRole("heading").allTextContents();
      await bill.getByRole("searchbox", { name: "Найти материал", exact: true }).fill("графит");
      await expect(bill.getByRole("article")).toHaveCount(1);
      const copy = bill.getByRole("button", { name: "Скопировать список", exact: true });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await copy.tap();
      let text: string;
      if (manual) {
        await expect(bill.getByRole("alert")).toContainText("Браузер не разрешил копирование");
        const field = bill.getByRole("textbox", { name: "Список материалов всего проекта", exact: true });
        text = await field.inputValue();
        await bill.getByRole("button", { name: "Выделить весь текст", exact: true }).tap();
        expect(await field.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe(text.length);
      } else {
        await expect(bill.getByRole("status").filter({ hasText: "Список всего проекта скопирован" })).toBeVisible();
        text = await page.evaluate(() => navigator.clipboard.readText());
      }
      for (const name of names) expect(text).toContain(name);
      expect(text).toContain("Цены не заданы");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await bill.getByRole("button", { name: "Закрыть окно", exact: true }).click();
      await open.click();
      await expect(bill.getByText("Список всего проекта скопирован. Вставьте его в сообщение.", { exact: true })).toHaveCount(0);
      await expect(bill.getByRole("textbox", { name: "Список материалов всего проекта", exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}
