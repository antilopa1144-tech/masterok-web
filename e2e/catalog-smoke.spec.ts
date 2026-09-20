import { expect, test } from "@playwright/test";
import { ALL_CHECKLISTS } from "../src/lib/checklists";
import { ALL_CALCULATORS_META } from "../src/lib/calculators/meta.generated";
import { TOOL_CONFIGS } from "../src/lib/tools/config";

const routes = [
  ...ALL_CALCULATORS_META.map((calculator) => ({
    label: `калькулятор ${calculator.slug}`,
    path: `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/`,
  })),
  ...TOOL_CONFIGS.map((tool) => ({
    label: `инструмент ${tool.slug}`,
    path: `/instrumenty/${tool.slug}/`,
  })),
  ...ALL_CHECKLISTS.map((checklist) => ({
    label: `чек-лист ${checklist.slug}`,
    path: `/instrumenty/chek-listy/${checklist.slug}/`,
  })),
];

test.describe("catalog browser smoke", () => {
  test.describe.configure({ mode: "serial" });

  for (const route of routes) {
    test(`${route.label} открывается без runtime-ошибки`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });

      expect(response, `${route.path}: no navigation response`).not.toBeNull();
      expect(response!.status(), `${route.path}: HTTP status`).toBeLessThan(400);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error");
      expect(pageErrors, `${route.path}: browser runtime errors`).toEqual([]);
    });
  }
});
