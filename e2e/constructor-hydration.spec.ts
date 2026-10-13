import { expect, test } from "@playwright/test";

const hydrationSignature = /hydration|react error #418|throwOnHydrationMismatch|parentNode/i;

test.describe("constructor editor hydration", () => {
  for (const width of [1440, 390]) {
  test(`keeps a dark themed project usable after a throttled warm-cache reload at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const hydrationErrors: string[] = [];
    const capture = (message: string) => {
      if (hydrationSignature.test(message)) hydrationErrors.push(message);
    };
    page.on("pageerror", error => hydrationErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" || message.type() === "warning") capture(message.text());
    });
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 20,
      downloadThroughput: Math.floor(1_500 * 1024 / 8),
      uploadThroughput: Math.floor(750 * 1024 / 8),
    });

    // A scenario link preselects the room type and opens the dimensions step.
    const scenario = width === 1440 ? "room" : "bathroom";
    await page.goto(`/konstruktor/redaktor/?new=1&start=${scenario}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Название помещения", exact: true }).fill("Гидратация · тёмная тема");
    await page.getByRole("textbox", { name: "Название помещения", exact: true }).press("Enter");
    await page.getByRole("button", { name: "Открыть 3D-проект", exact: true }).click();
    await expect(page.getByText("Сохранено в браузере", { exact: true })).toBeAttached({ timeout: 20_000 });
    const projectId = new URL(page.url()).searchParams.get("project");
    expect(projectId).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(url => url.searchParams.get("project") === projectId);
    await expect(page.getByRole("textbox", { name: "Название проекта", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Сохранено в браузере", { exact: true })).toBeAttached({ timeout: 20_000 });
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(hydrationErrors, "hydration-related browser errors").toEqual([]);
  });
  }
});
