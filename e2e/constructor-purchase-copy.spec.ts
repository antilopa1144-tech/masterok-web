import { expect, test } from "@playwright/test";

for (const [width, manual] of [[390, false], [320, true]] as const) {
  test.describe(`copy purchases at ${width}px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true, colorScheme: manual ? "dark" : "light" });
    test("copies the whole project or offers selectable text if clipboard is denied", async ({ page, context }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
      if (manual) {
        await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } }));
      } else await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/konstruktor/redaktor/?new=1&start=bathroom");
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      const open = page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true });
      await open.click();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).tap();
      const names = await bill.getByRole("article").getByRole("heading").allTextContents();
      await bill.getByRole("searchbox", { name: "Найти материал", exact: true }).fill("графит");
      await expect(bill.getByRole("article")).toHaveCount(1);
      const copy = bill.getByRole("button", { name: "Скопировать список", exact: true });
      await expect(bill.getByRole("button", { name: "Поделиться списком", exact: true })).toHaveCount(0);
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
      await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).tap();
      await expect(bill.getByText("Список всего проекта скопирован. Вставьте его в сообщение.", { exact: true })).toHaveCount(0);
      await expect(bill.getByRole("textbox", { name: "Список материалов всего проекта", exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}

for (const [width, outcome] of [[390, "success"], [320, "AbortError"], [320, "NotAllowedError"]] as const) {
  test.describe(`share purchases ${width}px ${outcome}`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme: width === 320 ? "dark" : "light" });
    test("passes the full list to the device and handles cancellation or failure without sending a project URL", async ({ page }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      // Browser boundary only: no external recipient or messaging app is opened.
      await page.addInitScript((outcome) => {
        const state = window as typeof window & { capturedShare?: ShareData; clipboardWrites?: number };
        state.clipboardWrites = 0;
        Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { state.clipboardWrites!++; } }, configurable: true });
        Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => {
          state.capturedShare = data;
          if (outcome !== "success") throw new DOMException("test", outcome);
        } });
      }, outcome);
      await page.goto("/konstruktor/vannaya/materialy/#purchase-files");
      await page.getByRole("navigation", { name: "Создать ванную для закупки", exact: true }).getByRole("link", { name: "Создать проект", exact: true }).tap();
      await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
      await expect(page.getByRole("status", { name: "Сохранено в браузере", exact: true })).toBeAttached({ timeout: 15_000 });
      await page.getByRole("navigation", { name: "Разделы конструктора" }).getByRole("button", { name: "Ведомость", exact: true }).tap();
      const bill = page.getByRole("dialog", { name: "Ведомость проекта", exact: true });
      await expect(bill.getByRole("article").first()).toBeVisible();
      const names = await bill.getByRole("article").getByRole("heading").allTextContents();
      expect(names.length).toBeGreaterThan(1);
      await bill.locator("summary").filter({ hasText: "Найти или отправить список" }).tap();
      await bill.getByRole("searchbox", { name: "Найти материал", exact: true }).fill("графит");
      await expect(bill.getByRole("article")).toHaveCount(1);
      const share = bill.getByRole("button", { name: "Поделиться списком", exact: true });
      expect((await share.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await share.tap();
      const captured = await page.evaluate(() => {
        const state = window as typeof window & { capturedShare?: ShareData; clipboardWrites?: number };
        return { data: state.capturedShare, clipboardWrites: state.clipboardWrites };
      });
      for (const name of names) expect(captured.data?.text).toContain(name);
      expect(captured.data?.text).toContain("Цены не заданы");
      expect(captured.data?.url).toBeUndefined();
      expect(captured.data?.files).toBeUndefined();
      expect(captured.clipboardWrites).toBe(0);
      await expect(share).toBeEnabled();
      if (outcome === "success") {
        await expect(bill.getByRole("status").filter({ hasText: "Проверьте отправку в выбранном приложении" })).toBeVisible();
      } else if (outcome === "AbortError") {
        await expect(bill.getByRole("status").filter({ hasText: "Отправка отменена" })).toBeVisible();
        await expect(bill.getByRole("alert")).toHaveCount(0);
      } else {
        await expect(bill.getByRole("alert")).toContainText("Не удалось открыть меню");
        const field = bill.getByRole("textbox", { name: "Список материалов всего проекта", exact: true });
        expect(await field.inputValue()).toBe(captured.data?.text);
        await bill.getByRole("button", { name: "Выделить весь текст", exact: true }).tap();
        expect(await field.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe(captured.data?.text?.length);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`purchase-share-${width}-${outcome}.png`) });
      expect(errors).toEqual([]);
    });
  });
}
