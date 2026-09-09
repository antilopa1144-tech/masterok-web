import { expect, test } from "@playwright/test";

// Exercise the real theme picker and result flow, not synthetic class changes.
for (const width of [360, 390, 768, 1440]) {
  for (const theme of ["Светлая", "Тёмная", "Тёплая", "Океан"]) {
    test(`D1: ${theme}, ${width}px — result contrast and navigation`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/kalkulyatory/poly/laminat/");
      await page.getByRole("button", { name: "Выбрать тему оформления", exact: true }).click();
      await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
      await expect(page.getByText(/Заполните параметры слева/)).toHaveCount(0);
      await page.getByRole("button", { name: "Рассчитать", exact: true }).click();
      const region = page.getByRole("region", { name: "Результат расчёта" });
      await expect(region.getByRole("heading", { name: "Результат", exact: true })).toBeVisible();

      const contrast = await region.getByText("К покупке", { exact: true }).first().evaluate((label) => {
        const card = label.parentElement!.parentElement!;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const chain: Element[] = [];
        for (let el: Element | null = card; el; el = el.parentElement) chain.unshift(el);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 1, 1);
        for (const el of chain) {
          ctx.fillStyle = getComputedStyle(el).backgroundColor;
          ctx.fillRect(0, 0, 1, 1);
        }
        const luminance = (rgb: Uint8ClampedArray) => {
          const channels = Array.from(rgb).slice(0, 3).map((n) => {
            const c = n / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const bg = luminance(ctx.getImageData(0, 0, 1, 1).data);
        return Array.from(card.querySelectorAll("p")).map((p) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = getComputedStyle(p).color;
          ctx.fillRect(0, 0, 1, 1);
          const fg = luminance(ctx.getImageData(0, 0, 1, 1).data);
          return { text: p.textContent, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
        });
      });
      // All card text, including small descriptions and inline units.
      expect(contrast).toHaveLength(3);
      for (const item of contrast) expect(item.ratio, `${theme}: ${item.text}`).toBeGreaterThanOrEqual(4.5);
      await testInfo.attach("contrast", { body: JSON.stringify(contrast), contentType: "application/json" });

      if (width < 640) {
        const nav = page.getByRole("navigation", { name: "Навигация по расчёту" });
        const title = region.getByRole("heading", { name: "Результат", exact: true });
        const clearOfNav = async () => {
          const n = await nav.boundingBox();
          const h = await title.boundingBox();
          return h!.y - (n!.y + n!.height) >= 8 && h!.y < 540;
        };
        await expect.poll(clearOfNav).toBe(true);
        await nav.getByRole("button", { name: "Параметры", exact: true }).click();
        await expect.poll(async () => {
          const n = await nav.boundingBox();
          const h = await page.getByRole("heading", { name: "Параметры расчёта", exact: true }).boundingBox();
          return h!.y - (n!.y + n!.height) >= 8 && h!.y < 540;
        }).toBe(true);
        await nav.getByRole("button", { name: "Результат ↓", exact: true }).click();
        await expect.poll(clearOfNav).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 640) await region.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("result.png"), fullPage: false, animations: "disabled" });
    });
  }
}
