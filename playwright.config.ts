import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E-тесты для Masterok Web.
 *
 * Запуск:
 *   npm run test:e2e          — все тесты (chromium)
 *   npm run test:e2e:ui       — интерактивный режим
 *   npm run test:e2e:headed    — с открытым браузером
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3456",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npx next dev -p 3456",
        url: "http://localhost:3456",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
