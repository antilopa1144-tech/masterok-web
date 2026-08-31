import { describe, it, expect } from "vitest";
import { softRoofingDef } from "../formulas/soft-roofing";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(softRoofingDef.calculate.bind(softRoofingDef));

describe("Калькулятор мягкой кровли", () => {
  describe("80 м², уклон 30°, конёк 8 м, карниз 20 м, без ендов", () => {
    // packs = ceil(80/3.0 * 1.05) = ceil(28.000...) = 29 (floating point: 80/3 * 1.05 > 28)
    // underlaymentRolls = ceil(80*1.15/15) = 7 по всей площади
    // valleyRolls = 0 (нет ендов)
    // nails: 80*0.10 = 8 кг точно; 8*1.05 = 8.4 кг с запасом; к покупке 2 коробки = 10 кг
    // eaveStrips = ceil(20/2 * 1.05) = ceil(10.5) = 11
    // ridgeShingles = ceil(8/0.5 * 1.05) = ceil(16.8) = 17
    // OSB is opt-in; mastic, wind strips and aerators require missing project inputs
    const result = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("гибкая черепица = 29 упаковок (packs)", () => {
      // Engine: "Гибкая черепица (3 м²/уп)" — quantity is recScenario.exact_need
      // totals.packs = 29 (base before scenario)
      expect(result.totals.packs).toBe(29);
    });

    it("гибкая черепица показывает выбранный режим без скрытого REC поверх", () => {
      const shingles = findMaterial(result, "Гибкая черепица");
      expect(shingles).toBeDefined();
      expect(shingles!.purchaseQty).toBe(29);
      expect(shingles!.subtitle).toContain("ceil(80 м² / 3 м²/уп × 1,05)");
      expect(shingles!.subtitle).toContain("режим точности = 29 уп.");
    });

    it("не добавляет скрытое новое основание ОСП", () => {
      expect(findMaterial(result, "ОСП")).toBeUndefined();
      expect(result.totals.osbSheets).toBeUndefined();
    });

    it("гвозди ершёные 3,2×30 мм в коробках по 5 кг", () => {
      const nails = findMaterial(result, "Гвозди ершёные оцинкованные 3,2×30 мм");
      expect(nails).toBeDefined();
      expect(nails!.unit).toBe("кг");
      expect(nails!.quantity).toBe(8);
      expect(nails!.withReserve).toBe(8.4);
      expect(nails!.purchaseQty).toBe(10);
      expect(nails!.packageInfo).toEqual({ count: 2, size: 5, packageUnit: "коробок" });
    });

    it("карнизные планки = 11 шт", () => {
      // Engine: "Карнизные планки (2 м)"
      const eave = findMaterial(result, "Карнизные планки");
      expect(eave?.purchaseQty).toBe(11);
    });

    it("не выдумывает ветровые планки из 40% длины карнизов", () => {
      expect(findMaterial(result, "Ветровые планки")).toBeUndefined();
      expect(result.totals.windStrips).toBeUndefined();
    });

    it("коньково-карнизная черепица = 17 шт", () => {
      // Engine: "Коньково-карнизная черепица"
      const ridge = findMaterial(result, "Коньково-карнизная черепица");
      expect(ridge?.purchaseQty).toBe(17);
    });

    it("не выдаёт универсальную мастику без продукта и зон приклейки", () => {
      expect(findMaterial(result, "Мастика")).toBeUndefined();
      expect(result.totals.masticKg).toBeUndefined();
      expect(result.totals.masticBuckets).toBeUndefined();
    });

    it("подкладочный ковёр = 7 рулонов по всей площади", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
      expect(underlayment?.subtitle).toContain("80 м² × 1,15 / 15 м²");
      expect(underlayment?.subtitle).toContain("по всей площади");
    });

    it("ендовного ковра нет (valleyLength = 0)", () => {
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeUndefined();
    });

    it("не назначает точечные аэраторы только по площади", () => {
      expect(findMaterial(result, "Вентиляционные выходы")).toBeUndefined();
      expect(result.totals.ventOutputs).toBeUndefined();
    });

    it("totals содержат только показанные основные итоги", () => {
      expect(result.totals.roofArea).toBe(80);
      expect(result.totals.packs).toBe(29);
      expect(result.totals.underlaymentRolls).toBe(7);
      expect(result.totals.osbSheets).toBeUndefined();
    });

    it("показывает постоянные границы системной ведомости", () => {
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("Подкладочный ковёр посчитан по всей площади"),
        expect.stringContaining("Мастика исключена"),
        expect.stringContaining("Ветровые планки не рассчитаны"),
        expect.stringContaining("Точечные аэраторы не рассчитаны"),
        expect.stringContaining("MIN/REC/MAX ниже меняют только упаковки черепицы"),
        expect.stringContaining("Новое основание ОСП не включено"),
      ]));
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  it("default realistic mode показывает 34 упаковки, а basic — 29", () => {
    const inputs = { roofArea: 80, slope: 30, ridgeLength: 8, eaveLength: 20, valleyLength: 0 };
    const realResult = softRoofingDef.calculate(inputs);
    const basicResult = calc(inputs);

    expect(realResult.accuracyMode).toBe("realistic");
    expect(realResult.totals.packs).toBe(34);
    expect(findMaterial(realResult, "Гибкая черепица")?.purchaseQty).toBe(34);
    expect(basicResult.totals.packs).toBe(29);
  });

  describe("Расход гвоздей зависит от уклона", () => {
    it("при уклоне 45° использует 0,10 кг/м²", () => {
      const result = calc({ roofArea: 80, slope: 45, ridgeLength: 8, eaveLength: 20, valleyLength: 0 });
      const nails = findMaterial(result, "Гвозди ершёные оцинкованные 3,2×30 мм");

      expect(nails?.quantity).toBe(8);
      expect(nails?.withReserve).toBe(8.4);
      expect(nails?.purchaseQty).toBe(10);
    });

    it("выше 45° использует 0,15 кг/м²", () => {
      const result = calc({ roofArea: 80, slope: 50, ridgeLength: 8, eaveLength: 20, valleyLength: 0 });
      const nails = findMaterial(result, "Гвозди ершёные оцинкованные 3,2×30 мм");

      expect(nails?.quantity).toBe(12);
      expect(nails?.withReserve).toBe(12.6);
      expect(nails?.purchaseQty).toBe(15);
      expect(nails?.packageInfo).toEqual({ count: 3, size: 5, packageUnit: "коробок" });
    });
  });

  describe("Уклон 15° → сплошной подкладочный ковёр + предупреждение", () => {
    // slope < 18 → underlaymentRolls = ceil(80*1.15/15) = ceil(6.133) = 7
    const result = calc({
      roofArea: 80,
      slope: 15,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("подкладочный ковёр = 7 рулонов (сплошной)", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("предупреждение объясняет сплошной расчёт без пороговой лазейки", () => {
      expect(result.warnings.some((w) => w.includes("Подкладочный ковёр посчитан по всей площади"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С ендовами 5 м → ендовный ковёр", () => {
    // valleyRolls = ceil(5 * 1.15 / 10) = ceil(0.575) = 1
    const result = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 5,
    });

    it("ендовный ковёр = 1 рулон", () => {
      // Engine: "Ендовный ковёр (10 м)"
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeDefined();
      expect(valley!.purchaseQty).toBe(1);
    });

    it("общий подкладочный ковёр остаётся сплошным, а ендовный считается отдельно", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("не возвращает старую мастику даже при наличии ендовы", () => {
      expect(findMaterial(result, "Мастика")).toBeUndefined();
    });

    it("предупреждение об ендовах", () => {
      // Engine: "Ендовы — наиболее уязвимые места, рекомендуется усиленная гидроизоляция"
      expect(result.warnings.some((w) => w.includes("Ендовы"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Сплошной ковёр не выключается при смене уклона", () => {
    const result = calc({
      roofArea: 80,
      slope: 15,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("при 15° остаётся 7 рулонов", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Сплошной подкладочный ковёр зависит от площади, а не скрытой суммы зон", () => {
    const noValleys = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("двускатная без ендов: 7 рулонов", () => {
      const underlayment = findMaterial(noValleys, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    const withSmallValley = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 6,
    });

    it("ендова не уменьшает и не дублирует сплошной ковёр", () => {
      const underlayment = findMaterial(withSmallValley, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    const largerRoof = calc({
      roofArea: 160,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("160 м² дают 13 рулонов по полной площади", () => {
      const underlayment = findMaterial(largerRoof, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(13);
    });

    it("больше площадь → больше подкладки", () => {
      const small = findMaterial(noValleys, "Подкладочный ковёр")!.purchaseQty as number;
      const big = findMaterial(largerRoof, "Подкладочный ковёр")!.purchaseQty as number;
      expect(big).toBeGreaterThan(small);
    });
  });

  it("добавляет ОСП только по явному выбору", () => {
    const result = calc({ roofArea: 80, slope: 30, ridgeLength: 8, eaveLength: 20, valleyLength: 0, includeOsb: 1 });
    const osb = findMaterial(result, "ОСП-3");

    expect(osb?.purchaseQty).toBe(27);
    expect(osb?.subtitle).toContain("Толщина, раскрой, швы по опорам и крепёж не рассчитаны");
    expect(result.totals.osbSheets).toBe(27);
    expect(result.warnings.some((warning) => warning.includes("ОСП включена только как предварительный лист"))).toBe(true);
  });

  it("объясняет проектные границы в полях", () => {
    expect(softRoofingDef.fields.find((field) => field.key === "ridgeLength")?.label).toContain("коньков и рёбер");
    expect(softRoofingDef.fields.find((field) => field.key === "eaveLength")?.hint).toContain("фронтонных свесов отдельно не вводится");
    expect(softRoofingDef.fields.find((field) => field.key === "includeOsb")?.defaultValue).toBe(0);
  });

  it("не обещает в лиде и сниппете исключённую мастику", () => {
    expect(softRoofingDef.title).toBe("Калькулятор мягкой кровли");
    expect(softRoofingDef.h1).toBe("Калькулятор мягкой кровли онлайн — расчёт гибкой черепицы");
    expect(softRoofingDef.description).toContain("ОСП — только по явному выбору");
    expect(softRoofingDef.description).not.toContain("мастику");
    expect(softRoofingDef.metaDescription).toMatch(/^Бесплатный калькулятор мягкой кровли: рассчитайте/);
    expect(softRoofingDef.metaDescription).not.toContain("мастику");
  });

  it("ссылается на действующий СП и первичные инструкции системы", () => {
    const html = softRoofingDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain("https://protect.gost.ru/sp/details/844352c5-dda6-4006-acd8-b6875d1ed6a8");
    expect(html).toContain("shinglas_instructions_Web_Russian_ru_RU");
    expect(html).toContain("ast_anderep_install_instr");
    expect(html).toContain("mozhno-li-ne-montirovat-podkladochnye-kovry-na-vsyu-ploshchad-krovli");
  });

  it("SEO-пояснение фиксирует web-границы без старых скрытых формул", () => {
    const html = softRoofingDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain("7 рулонов");
    expect(html).toContain("MIN/REC/MAX");
    expect(html).toContain("прежняя формула ставила один точечный элемент на 25 м&sup2;");
    expect(html).toContain("прежняя формула принимала длину фронтонов равной 40% длины карнизов");
    expect(html).not.toContain("ОСП-3 (сплошное основание)");
    expect(html).not.toContain("Сплошь при уклоне &lt;18&deg;; по критическим зонам");
  });
});
