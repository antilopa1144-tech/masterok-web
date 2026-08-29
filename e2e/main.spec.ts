import { readFile } from "node:fs/promises";
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

  test("v3 считает заказ готовой смеси по площади, толщине и шагу поставщика", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");

    await page.getByRole("button", { name: "По площади и толщине", exact: true }).click();
    await expect(page.getByLabel("Объём бетона").first()).not.toBeVisible();
    await page.getByLabel("Площадь заливки").first().fill("10");
    await page.getByLabel("Толщина слоя").first().fill("150");
    await page.getByLabel("Шаг заказа готовой смеси").selectOption("0.5");
    await page.getByRole("button", { name: "Рассчитать", exact: true }).click();

    const resultCard = page.getByRole("heading", { name: "Результат" }).locator("xpath=../../..");
    const orderCard = resultCard.getByText("Заказать", { exact: true }).locator("xpath=../..");
    await expect(resultCard).toContainText("Чистый объём");
    await expect(resultCard).toContainText("1,5 м³");
    await expect(orderCard.locator("p").nth(1)).toHaveText(/2\s*м³/);
    await expect(orderCard.locator("p").nth(2)).toHaveText("Шаг 0.5 м³");
    await expect(resultCard).not.toContainText("Арматура");
    await expect(resultCard).not.toContainText("Опалубка");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  });

  test("v3 в ручном режиме показывает компоненты и границу применимости", async ({ page }) => {
    await page.goto("/kalkulyatory/fundament/beton/");

    await page.getByRole("switch", { name: "Самостоятельный замес" }).click();
    await page.getByRole("button", { name: "Рассчитать", exact: true }).click();

    const resultCard = page.getByRole("heading", { name: "Результат" }).locator("xpath=../../..");
    await expect(page.getByText(/предварительная закупочная оценка, а не рецепт/i).first()).toBeVisible();
    await expect(resultCard).toContainText("Расчётный выход");
    await expect(resultCard).toContainText("Цемент М400");
    await expect(resultCard).toContainText("Песок строительный");
    await expect(resultCard).toContainText("Щебень");
    await expect(resultCard).not.toContainText("Арматура");
    await expect(resultCard).not.toContainText("Опалубка");
    await expect(resultCard).not.toContainText("Вода");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
});

test.describe("Валидация числового ввода", () => {
  test("не подменяет отрицательную площадь минимальным значением", async ({ page }) => {
    await page.goto("/kalkulyatory/otdelka/kraska/");

    const areaInput = page.getByLabel("Площадь поверхности").first();
    await areaInput.fill("-1");

    await expect(page.getByText("Допустимые значения: 1 — 1000 м²")).toBeVisible();
    await expect(page.getByRole("button", { name: "Исправьте параметры" })).toBeVisible();
    await expect(page.getByText("К покупке", { exact: true }).first()).not.toBeVisible();

    await page.getByRole("button", { name: "Исправьте параметры" }).click();
    await expect(areaInput).toBeFocused();

    await areaInput.fill("12.5");
    await page.getByRole("button", { name: "Рассчитать" }).click();
    await expect(page.getByText("К покупке", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Рабочее место раскладки плитки", () => {
  test("на desktop держит параметры, схему и результат в одной строке", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => localStorage.removeItem("masterok:tile-layout-projects:v1"));
    await page.goto("/instrumenty/raskladka-plitki/");

    await expect(page.getByTestId("tile-workspace-steps")).toBeVisible();
    await expect(page.locator("#tile-parameters-content")).toBeVisible();

    const parameters = page.locator('[data-tool-panel="parameters"]');
    const layout = page.locator('[data-tool-panel="layout"]');
    const result = page.locator('[data-tool-panel="result"]');
    const [parametersBox, layoutBox, resultBox] = await Promise.all([
      parameters.boundingBox(),
      layout.boundingBox(),
      result.boundingBox(),
    ]);

    expect(parametersBox).not.toBeNull();
    expect(layoutBox).not.toBeNull();
    expect(resultBox).not.toBeNull();
    expect(parametersBox!.x).toBeLessThan(layoutBox!.x);
    expect(layoutBox!.x).toBeLessThan(resultBox!.x);
    expect(Math.abs(parametersBox!.y - layoutBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(layoutBox!.y - resultBox!.y)).toBeLessThanOrEqual(2);

    await expect(layout.getByTestId("tile-room-preview")).toBeVisible();
    await expect(page.getByTestId("tile-pdf-visual-source")).toHaveCount(0);
    await expect(layout.getByTestId("tile-opening")).toHaveCount(1);
    await expect(layout.getByTestId("tile-layout-advice")).toContainText("Совет Михалыча");
    await expect(parameters.getByRole("switch", { name: "Учитывать дверной проём" })).toHaveAttribute("aria-checked", "true");
    await expect(parameters.getByLabel("Быстрый размер поверхности")).toHaveValue("0");
    await expect(parameters.getByLabel("Быстрый формат плитки")).toHaveValue("0");
    await expect(parameters.getByLabel("Способ укладки")).toHaveValue("straight");
    await expect(parameters.getByLabel("Запас материала")).toHaveValue("10");
    await expect(result.getByTestId("tile-purchase-total")).toHaveText("50 шт");
    await expect(result.getByTestId("tile-box-plan")).toContainText("7 кор.");
    await expect(result.getByTestId("tile-box-plan")).toContainText("8 шт./кор.");
    await expect(result.getByTestId("tile-box-plan")).toContainText("Купите 56 плиток");
    await expect(page.getByTestId("tile-procurement-plan")).toContainText("Плитка → клей → затирка");
    await expect(result.getByRole("link", { name: "Рассчитать клей →" })).toHaveAttribute("href", /klej-dlya-plitki.*area=4.61.*tileSize=1.*layingType=1/);
    await expect(result.getByRole("link", { name: "Рассчитать затирку →" })).toHaveAttribute("href", /zatirka.*area=4.61.*tileWidth=600.*tileHeight=300.*jointWidth=2/);

    const startControls = parameters.getByTestId("tile-start-controls");
    await expect(startControls.getByRole("button", { name: "От края", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(layout.getByTestId("tile-start-comparison")).toBeVisible();
    await expect(layout.getByTestId("tile-start-variant-center")).toContainText("Лучший");
    await startControls.getByRole("button", { name: "По центру", exact: true }).click();
    await expect(result.getByTestId("tile-edge-cuts")).toContainText("346 мм");
    await expect(result.getByTestId("tile-edge-cuts")).toContainText("91 мм");
    await startControls.getByRole("button", { name: "Свой сдвиг", exact: true }).click();
    await startControls.getByLabel("Стартовый сдвиг по горизонтали").fill("120");
    await startControls.getByLabel("Стартовый сдвиг по вертикали").fill("80");
    await expect(result.getByTestId("tile-edge-cuts")).toContainText("120 мм");
    await expect(result.getByTestId("tile-edge-cuts")).toContainText("80 мм");
    await startControls.getByRole("button", { name: "От края", exact: true }).click();
    await expect(result.getByTestId("tile-purchase-total")).toHaveText("50 шт");

    const openingPosition = layout.getByTestId("tile-opening-position-control");
    await expect(openingPosition).toBeVisible();
    await expect(layout.getByTestId("tile-alignment-guides")).toHaveCount(0);
    const openingDrag = layout.getByTestId("tile-opening-drag");
    const openingDragBox = await openingDrag.boundingBox();
    expect(openingDragBox).not.toBeNull();
    await page.mouse.move(
      openingDragBox!.x + openingDragBox!.width / 2,
      openingDragBox!.y + openingDragBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      openingDragBox!.x + openingDragBox!.width / 2 - 60,
      openingDragBox!.y + openingDragBox!.height / 2,
      { steps: 4 },
    );
    await page.mouse.up();
    await expect(parameters.getByLabel("Отступ дверного проёма слева в миллиметрах")).not.toHaveValue("1300");
    await expect(layout.getByTestId("tile-alignment-guides")).toHaveCount(1);
    const openingSlider = layout.getByRole("slider", { name: "Переместить дверной проём на стене" });
    const offsetBeforeKeyboard = Number(await openingSlider.getAttribute("aria-valuenow"));
    await openingSlider.focus();
    await openingSlider.press("ArrowRight");
    await expect(openingSlider).toHaveAttribute("aria-valuenow", String(offsetBeforeKeyboard + 10));
    await openingPosition.getByRole("button", { name: "Оси разметки" }).click();
    await expect(layout.getByTestId("tile-alignment-guides")).toHaveCount(0);
    await openingPosition.getByRole("button", { name: "Оси разметки" }).click();
    await expect(layout.getByTestId("tile-alignment-guides")).toHaveCount(1);
    await openingPosition.getByRole("button", { name: "По центру", exact: true }).click();
    await expect(parameters.getByLabel("Отступ дверного проёма слева в миллиметрах")).toHaveValue("800");
    await openingPosition.getByTestId("tile-align-layout-to-opening").click();
    await expect(startControls.getByRole("button", { name: "Свой сдвиг", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(startControls.getByLabel("Стартовый сдвиг по горизонтали")).toHaveValue("346");
    await expect(openingPosition.getByTestId("tile-align-layout-to-opening")).toContainText("Привязано: центр плитки");
    await expect(layout.getByTestId("tile-layout-advice")).toContainText("отметке 1250 мм");
    await openingPosition.getByTestId("tile-opening-position-range").fill("1300");
    await expect(parameters.getByLabel("Отступ дверного проёма слева в миллиметрах")).toHaveValue("1300");
    await expect(startControls.getByLabel("Стартовый сдвиг по горизонтали")).toHaveValue("244");
    await startControls.getByRole("button", { name: "От края", exact: true }).click();
    await openingPosition.getByRole("button", { name: "Оси разметки" }).click();
    await expect(layout.getByTestId("tile-alignment-guides")).toHaveCount(0);

    const projectWorkspace = page.getByTestId("tile-project-workspace");
    await expect(projectWorkspace).toBeVisible();
    await projectWorkspace.getByTestId("tile-project-name").fill("Ванная — стена у двери");
    await projectWorkspace.getByTestId("tile-save-layout-project").click();
    await expect(projectWorkspace.getByRole("status")).toContainText("Проект сохранён");
    await expect(projectWorkspace.getByLabel("Сохранённые проекты раскладки")).not.toHaveValue("");
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem("masterok:tile-layout-projects:v1");
      return raw ? JSON.parse(raw).length : 0;
    })).toBe(1);
    await parameters.getByLabel("Ширина поверхности в миллиметрах").fill("3100");
    await expect(parameters.getByLabel("Ширина поверхности в миллиметрах")).toHaveValue("3100");
    await projectWorkspace.getByTestId("tile-open-layout-project").click();
    await expect(parameters.getByLabel("Ширина поверхности в миллиметрах")).toHaveValue("2500");
    await expect(projectWorkspace.getByRole("status")).toContainText("Проект восстановлен");

    await parameters.getByTestId("tile-packaging-settings").locator("summary").click();
    const tilesPerBoxInput = parameters.getByLabel("Штук плитки в коробке");
    const packAreaInput = parameters.getByLabel("Площадь плитки в коробке");
    await expect(tilesPerBoxInput).toHaveValue("8");
    await expect(parameters.getByTestId("tile-packaging-source")).toHaveText("Оценка");
    await expect(packAreaInput).toHaveValue("1.44");
    await tilesPerBoxInput.fill("10");
    await expect(tilesPerBoxInput).toHaveAttribute("aria-invalid", "false");
    await expect(parameters.getByTestId("tile-packaging-source")).toHaveText("По этикетке");
    await expect(result.getByTestId("tile-box-plan")).toContainText("5 кор.");
    await expect(result.getByTestId("tile-box-plan")).toContainText("10 шт./кор. · этикетка");
    await expect(result.getByTestId("tile-box-plan")).toContainText("Купите 50 плиток");
    await tilesPerBoxInput.fill("0");
    await expect(tilesPerBoxInput).toHaveAttribute("aria-invalid", "true");
    await expect(result.getByTestId("tile-box-plan")).toHaveCount(0);
    await expect(result.getByText("Исправьте фасовку коробки — количество упаковок временно не рассчитывается.")).toBeVisible();
    await tilesPerBoxInput.fill("10");
    await packAreaInput.fill("0.01");
    await expect(packAreaInput).toHaveAttribute("aria-invalid", "true");
    await expect(result.getByTestId("tile-box-plan")).toHaveCount(0);
    await expect(result.getByTestId("tile-export-pdf")).toBeDisabled();
    await expect(result.getByTestId("tile-share-result")).toBeDisabled();
    await expect(result.getByText("Исправьте фасовку коробки — количество упаковок временно не рассчитывается.")).toBeVisible();
    await expect(result.getByTestId("tile-purchase-total")).toHaveText("50 шт");
    await packAreaInput.fill("1,44");
    await expect(packAreaInput).toHaveAttribute("aria-invalid", "false");
    await parameters.getByTestId("tile-estimate-pack-pieces").click();
    await expect(tilesPerBoxInput).toHaveValue("8");
    await expect(parameters.getByTestId("tile-packaging-source")).toHaveText("Оценка");
    await expect(result.getByTestId("tile-box-plan")).toContainText("7 кор.");
    await expect(result.getByTestId("tile-export-pdf")).toBeEnabled();
    await expect(result.getByTestId("tile-share-result")).toBeEnabled();
    await parameters.getByLabel("Запас материала").selectOption("0");
    await expect(result.getByTestId("tile-purchase-total")).toHaveText("45 шт");
    await parameters.getByLabel("Запас материала").selectOption("10");
    await expect(result.getByTestId("tile-purchase-total")).toHaveText("50 шт");
    await parameters.getByLabel("Способ укладки").selectOption("offset-half");
    await expect(layout.getByTestId("tile-room-preview")).toHaveAttribute("aria-label", /со смещением 1\/2/i);
    await parameters.getByLabel("Способ укладки").selectOption("diagonal");
    await expect(parameters.getByLabel("Запас материала")).toHaveValue("15");
    await expect(parameters.getByText("Для диагональной укладки сетка центрируется автоматически")).toBeVisible();
    await expect(layout.getByTestId("tile-start-comparison")).toHaveCount(0);
    await parameters.getByLabel("Способ укладки").selectOption("straight");
    await expect(parameters.getByLabel("Запас материала")).toHaveValue("10");
    await expect(layout.getByRole("button", { name: "Объёмный вид", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await layout.getByTestId("tile-material-detail").count()).toBeGreaterThan(0);
    await layout.getByRole("button", { name: "Чертёж", exact: true }).click();
    await expect(layout.getByText("Динамическая модель стены")).toBeVisible();
    await expect(layout.getByTestId("tile-room-scene")).toHaveCount(1);
    await expect(layout.getByTestId("tile-opening")).toHaveCount(1);
    await layout.getByRole("button", { name: "Пол", exact: true }).click();
    await expect(layout.getByText("Вид пола сверху")).toBeVisible();
    await expect(layout.getByTestId("tile-room-scene")).toHaveCount(0);
    await layout.getByRole("button", { name: "Стена", exact: true }).click();
    await layout.getByRole("button", { name: "Объёмный вид", exact: true }).click();
    await expect(layout.getByTestId("tile-room-preview")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await layout.getByRole("button", { name: "Скачать PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("tile-layout.png");

    const pdfDownloadPromise = page.waitForEvent("download");
    await result.getByTestId("tile-export-pdf").click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/^smeta-.*раскладка-плитки.*\.pdf$/);
    const pdfPath = await pdfDownload.path();
    if (!pdfPath) throw new Error("Playwright не сохранил скачанный PDF");
    const pdfSource = (await readFile(pdfPath)).toString("latin1");
    expect((pdfSource.match(/\/Subtype\s*\/Image/g) ?? []).length).toBeGreaterThanOrEqual(2);
    await expect(result.getByTestId("tile-export-pdf")).toContainText("Скачать PDF");
    await expect(page.getByTestId("tile-pdf-visual-source")).toHaveCount(0);

    await page.evaluate(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          (window as typeof window & { __tileShareData?: ShareData }).__tileShareData = data;
        },
      });
    });
    await result.getByTestId("tile-share-result").click();
    await expect(result.getByTestId("tile-share-result")).toContainText("Отправлено");
    const sharedData = await page.evaluate(
      () => (window as typeof window & { __tileShareData?: ShareData }).__tileShareData,
    );
    expect(sharedData?.text).toContain("Потребность: 45 шт. + запас 5 шт. (10%) = 50 шт.");
    expect(sharedData?.text).toContain("К покупке (оценка): 7 кор. × 8 шт. = 56 шт.");
    const sharedUrl = new URL(sharedData?.url ?? "http://invalid/");
    expect(sharedUrl.pathname).toBe("/instrumenty/raskladka-plitki/");
    expect(sharedUrl.searchParams.get("tileProject")).toBe("1");
    expect(sharedUrl.searchParams.get("name")).toBe("Ванная — стена у двери");
    expect(sharedUrl.searchParams.get("hasOpening")).toBe("1");
    expect(sharedUrl.searchParams.get("openingOffsetLeft")).toBe("1300");
    expect(sharedUrl.searchParams.get("startMode")).toBe("edge");
    expect(sharedUrl.searchParams.get("tilesPerBox")).toBe("8");
    expect(sharedUrl.searchParams.get("packagingSource")).toBe("estimated");

    await parameters.getByRole("switch", { name: "Учитывать дверной проём" }).click();
    await expect(layout.getByTestId("tile-opening")).toHaveCount(0);
    await expect(result.getByText("Площадь поверхности", { exact: true })).toBeVisible();
    await expect(result.getByText("6.5 м²", { exact: true })).toBeVisible();
    await expect(result.getByText("Потребность с запасом", { exact: true })).toBeVisible();
    await expect(result.getByRole("link", { name: "Рассчитать клей →" })).toBeVisible();
    await expect(result.getByRole("link", { name: "Рассчитать затирку →" })).toBeVisible();

    await page.goto(sharedUrl.toString());
    await expect(page.getByTestId("tile-project-name")).toHaveValue("Ванная — стена у двери");
    await expect(page.getByRole("switch", { name: "Учитывать дверной проём" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Ширина поверхности в миллиметрах")).toHaveValue("2500");
    await expect(page.getByTestId("tile-opening").first()).toBeVisible();
  });

  test("на mobile складывает панели без горизонтального переполнения", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.removeItem("masterok:tile-layout-projects:v1"));
    await page.goto("/instrumenty/raskladka-plitki/");

    await expect(page.getByTestId("tile-workspace-steps")).toBeVisible();
    await expect(page.getByTestId("tile-project-workspace")).toBeVisible();
    await expect(page.getByTestId("tile-project-name")).toBeVisible();
    await expect(page.locator("#tile-parameters-content")).not.toBeVisible();

    const [parametersBox, layoutBox, resultBox] = await Promise.all([
      page.locator('[data-tool-panel="parameters"]').boundingBox(),
      page.locator('[data-tool-panel="layout"]').boundingBox(),
      page.locator('[data-tool-panel="result"]').boundingBox(),
    ]);

    expect(parametersBox).not.toBeNull();
    expect(layoutBox).not.toBeNull();
    expect(resultBox).not.toBeNull();
    expect(parametersBox!.y).toBeLessThan(layoutBox!.y);
    expect(layoutBox!.y).toBeLessThan(resultBox!.y);
    await expect(page.locator('[data-tool-panel="layout"]').getByTestId("tile-room-preview")).toBeVisible();

    const viewport = await page.locator("html").evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

    await page.getByTestId("tile-workspace-steps").getByRole("button", { name: "1 Параметры" }).click();
    await expect(page.locator("#tile-parameters-content")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Учитывать дверной проём" })).toBeVisible();
    await expect(page.getByLabel("Ширина дверного проёма в миллиметрах")).toBeVisible();
    await expect(page.getByLabel("Быстрый размер поверхности")).toHaveCount(1);
    await expect(page.getByLabel("Быстрый формат плитки")).toBeVisible();
    await expect(page.getByLabel("Способ укладки")).toBeVisible();
    await expect(page.getByLabel("Запас материала")).toHaveValue("10");
    await page.getByTestId("tile-packaging-settings").locator("summary").click();
    await expect(page.getByLabel("Штук плитки в коробке")).toHaveValue("8");
    await expect(page.getByTestId("tile-packaging-source")).toHaveText("Оценка");
    await expect(page.getByRole("slider", { name: "Переместить дверной проём на стене" })).toBeVisible();
    await expect(page.getByTestId("tile-box-plan")).toContainText("7 кор.");
    await expect(page.getByTestId("tile-export-pdf")).toBeVisible();
    await expect(page.getByTestId("tile-share-result")).toBeVisible();
    await expect(page.getByTestId("tile-procurement-plan")).toContainText("Плитка → клей → затирка");
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
