import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SoundInsulationCanonicalSpec,
  SoundInsulationMaterialRules,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface SoundInsulationInputs {
  area?: number;
  surfaceType?: number;
  system?: number;
  perimeter?: number;
  screedThicknessMm?: number;
  acousticPlatesPerPack?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function resolveArea(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 30)));
}

function resolveSystem(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.system ?? getInputDefault(spec, "system", 0))));
}

function surfaceTypeForSystem(system: number): number {
  if (system === 2) return 1;
  if (system === 3) return 2;
  return 0;
}

function materialRule(
  spec: SoundInsulationCanonicalSpec,
  key: keyof SoundInsulationMaterialRules,
): number {
  const value = spec.material_rules[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`sound-insulation: invalid material rule ${key}`);
  }
  return value;
}

/* ─── main ─── */

export function computeCanonicalSoundInsulation(
  spec: SoundInsulationCanonicalSpec,
  inputs: SoundInsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("insulation", accuracyMode);

  const area = resolveArea(spec, inputs);
  const system = resolveSystem(spec, inputs);
  const surfaceType = surfaceTypeForSystem(system);
  const enteredPerimeter = Math.max(
    0,
    Math.min(2000, inputs.perimeter ?? getInputDefault(spec, "perimeter", 0)),
  );
  const perimeterEstimated = enteredPerimeter <= 0;
  const perim = perimeterEstimated ? Math.sqrt(area) * 4 : enteredPerimeter;
  const screedThicknessMm = Math.max(
    30,
    Math.min(
      100,
      inputs.screedThicknessMm
        ?? getInputDefault(spec, "screedThicknessMm", 50),
    ),
  );
  const acousticPlatesPerPack = Math.max(
    1,
    Math.min(
      50,
      Math.round(
        inputs.acousticPlatesPerPack
          ?? getInputDefault(
            spec,
            "acousticPlatesPerPack",
            spec.packaging_rules.package_size,
          ),
      ),
    ),
  );

  const materials: CanonicalMaterialResult[] = [];
  let primaryQtyRaw = 0;
  let primaryUnit = "шт";
  let primaryLabel = "sound-insulation";
  let primaryMaterialPrefix = "";

  /* ── System 0: Basic GKL + Rockwool ── */
  if (system === 0) {
    const plateArea = materialRule(spec, "rockwool_plate");
    const reserve = materialRule(spec, "rockwool_reserve");
    const sheetArea = materialRule(spec, "gkl_sheet");
    const layers = materialRule(spec, "gkl_reserve_2layers");
    const profileSpacing = materialRule(spec, "pp_spacing");
    const vibroTapeRoll = materialRule(spec, "vibro_tape_roll");
    const rockwoolPlates = Math.ceil(area * reserve / plateArea);
    const gklSheets = Math.ceil(area * reserve * layers / sheetArea);
    const ppPcs = Math.ceil(area * reserve / profileSpacing);
    const vibro = Math.ceil(
      area
        * materialRule(spec, "vibro_per_m2")
        * materialRule(spec, "vibro_reserve"),
    );
    const vibroTape = Math.ceil(area * reserve / profileSpacing / vibroTapeRoll);
    const firstLayerSheets = Math.ceil(area * reserve / sheetArea);
    const secondLayerSheets = Math.max(0, gklSheets - firstLayerSheets);
    const firstLayerScrewPacks = Math.ceil(firstLayerSheets * 25 / 200);
    const secondLayerScrewPacks = Math.ceil(secondLayerSheets * 25 / 200);

    primaryQtyRaw = area / plateArea;
    primaryUnit = "шт";
    primaryLabel = "rockwool-plate";
    primaryMaterialPrefix = "Акустическая минеральная плита";

    materials.push(
      { name: "Акустическая минеральная плита 600×1000×50 мм", subtitle: "Выбирайте специализированную акустическую плиту; плотность и допустимую нагрузку сверяйте с системой облицовки", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм, два слоя", subtitle: "Для влажного помещения замените на влагостойкий гипсокартон (ГКЛВ); листы разных слоёв монтируют со смещением стыков", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Потолочный профиль ПП 60×27×3000 мм", subtitle: "Для звукоизоляционной облицовки применяйте совместимую каркасную систему с виброразвязкой", quantity: ppPcs, unit: "шт", withReserve: ppPcs, purchaseQty: ppPcs, category: "Каркас" },
      { name: "Виброподвес для профиля 60×27 мм", subtitle: "Рабочая нагрузка и число точек крепления должны соответствовать паспорту выбранного виброподвеса", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
      { name: `Вибролента 50 мм (${vibroTapeRoll} м)`, subtitle: "Для отделения направляющих профилей от пола, стен и потолка", quantity: vibroTape, unit: "рулонов", withReserve: vibroTape, purchaseQty: vibroTape, category: "Изоляция" },
      { name: "Чёрные саморезы для гипсокартона по металлу 3,5×25 и 3,5×35 мм (по 200 шт)", subtitle: `Купить отдельно: ${firstLayerScrewPacks} уп. 3,5×25 мм — около ${firstLayerSheets * 25} шт. для первого слоя; ${secondLayerScrewPacks} уп. 3,5×35 мм — около ${secondLayerSheets * 25} шт. для второго`, quantity: firstLayerScrewPacks + secondLayerScrewPacks, unit: "упаковок", withReserve: firstLayerScrewPacks + secondLayerScrewPacks, purchaseQty: firstLayerScrewPacks + secondLayerScrewPacks, category: "Крепёж" },
    );
  }

  /* ── System 1: ZIPS panels ── */
  if (system === 1) {
    const panelArea = materialRule(spec, "zips_plate");
    const reserve = materialRule(spec, "zips_reserve");
    const sheetArea = materialRule(spec, "gkl_sheet");
    const zipsPanels = Math.ceil(area * reserve / panelArea);
    const gklOverlay = Math.ceil(area * reserve / sheetArea);

    primaryQtyRaw = area / panelArea;
    primaryUnit = "шт";
    primaryLabel = "zips-panel";
    primaryMaterialPrefix = "Звукоизоляционные сэндвич-панели";

    materials.push(
      { name: "Звукоизоляционные сэндвич-панели (ЗИПС) 1200×600 мм", subtitle: "Толщину и модель выбирайте по требуемой прибавке звукоизоляции и допустимой потере площади помещения", quantity: zipsPanels, unit: "шт", withReserve: zipsPanels, purchaseQty: zipsPanels, category: "Основное" },
      { name: "Комплект крепежа, поставляемый с панелью ЗИПС", subtitle: "Отдельно не прибавляется: состав штатного комплекта зависит от модели панели и основания", quantity: zipsPanels, unit: "комплектов", withReserve: zipsPanels, purchaseQty: zipsPanels, category: "Крепёж" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм для облицовки", subtitle: "Финишный лист должен соответствовать выбранной системе звукоизоляционных панелей", quantity: gklOverlay, unit: "шт", withReserve: gklOverlay, purchaseQty: gklOverlay, category: "Основное" },
    );
  }

  /* ── System 2: Floating floor ── */
  if (system === 2) {
    const matRollArea = materialRule(spec, "float_mat_roll");
    const reserve = materialRule(spec, "float_reserve");
    const dampTapeRoll = materialRule(spec, "damp_tape_roll");
    const screedBagKg = materialRule(spec, "screed_bag");
    const mats = Math.ceil(area * reserve / matRollArea);
    const dampTape = Math.ceil(perim / dampTapeRoll);
    const screedBags = Math.ceil(
      area
        * (screedThicknessMm / 1000)
        * materialRule(spec, "screed_density")
        / screedBagKg,
    );

    primaryQtyRaw = area / matRollArea;
    primaryUnit = "рулонов";
    primaryLabel = "float-mat";
    primaryMaterialPrefix = "Рулонный звукоизоляционный материал";

    materials.push(
      { name: `Рулонный звукоизоляционный материал под плавающую стяжку (${matRollArea} м²)`, subtitle: "Материал должен быть рассчитан на нагрузку от цементной стяжки; стыки выполняйте по паспорту системы", quantity: mats, unit: "рулонов", withReserve: mats, purchaseQty: mats, category: "Основное" },
      { name: `Кромочная демпферная лента (${dampTapeRoll} м)`, subtitle: "Ширина ленты должна быть не меньше полной высоты плавающей стяжки и финишного покрытия", quantity: dampTape, unit: "рулонов", withReserve: dampTape, purchaseQty: dampTape, category: "Изоляция" },
      { name: `Сухая смесь для стяжки (${screedBagKg} кг)`, subtitle: `Предварительный расчёт для слоя ${screedThicknessMm} мм; марку смеси, допустимую толщину и армирование проверьте по проекту пола`, quantity: screedBags, unit: "мешков", withReserve: screedBags, purchaseQty: screedBags, category: "Основное" },
    );
  }

  /* ── System 3: Acoustic ceiling ── */
  if (system === 3) {
    const plateArea = materialRule(spec, "rockwool_plate");
    const reserve = materialRule(spec, "rockwool_reserve");
    const sheetArea = materialRule(spec, "gkl_sheet");
    const layers = materialRule(spec, "gkl_reserve_2layers");
    const rockwoolPlates = Math.ceil(area * reserve / plateArea);
    const gklSheets = Math.ceil(area * reserve * layers / sheetArea);
    const vibro = Math.ceil(
      area
        * materialRule(spec, "vibro_per_m2")
        * materialRule(spec, "vibro_reserve"),
    );
    const firstLayerSheets = Math.ceil(area * reserve / sheetArea);
    const secondLayerSheets = Math.max(0, gklSheets - firstLayerSheets);
    const firstLayerScrewPacks = Math.ceil(firstLayerSheets * 25 / 200);
    const secondLayerScrewPacks = Math.ceil(secondLayerSheets * 25 / 200);

    primaryQtyRaw = area / plateArea;
    primaryUnit = "шт";
    primaryLabel = "acoustic-ceiling";
    primaryMaterialPrefix = "Акустическая минеральная плита";

    materials.push(
      { name: "Акустическая минеральная плита 600×1000×50 мм", subtitle: "Плиты укладывают без зазоров и без сжатия; характеристики выбирают по комплектной потолочной системе", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм, два слоя", subtitle: "Для потолка применяйте листы и схему крепления, допускаемые выбранной подвесной системой", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Виброподвес для акустического потолка", subtitle: "Рабочую нагрузку, крепёж к перекрытию и шаг подвесов выбирают по паспорту системы", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
      { name: "Чёрные саморезы для гипсокартона по металлу 3,5×25 и 3,5×35 мм (по 200 шт)", subtitle: `Купить отдельно: ${firstLayerScrewPacks} уп. 3,5×25 мм — около ${firstLayerSheets * 25} шт.; ${secondLayerScrewPacks} уп. 3,5×35 мм — около ${secondLayerSheets * 25} шт.`, quantity: firstLayerScrewPacks + secondLayerScrewPacks, unit: "упаковок", withReserve: firstLayerScrewPacks + secondLayerScrewPacks, purchaseQty: firstLayerScrewPacks + secondLayerScrewPacks, category: "Крепёж" },
    );
  }

  /* ── Common: sealant + sealing tape (all systems) ── */
  const sealTapeRoll = materialRule(spec, "seal_tape_roll");
  const sealant = Math.ceil(
    perim * 2 / materialRule(spec, "sealant_per_perim"),
  );
  const sealTape = Math.ceil(
    perim
      * 2
      * materialRule(spec, "seal_tape_reserve")
      / sealTapeRoll,
  );

  materials.push(
    { name: "Невысыхающий акустический герметик, 280–310 мл", subtitle: "Для герметизации периметра и швов; обычный санитарный силикон не является равноценной заменой", quantity: sealant, unit: "тюбиков", withReserve: sealant, purchaseQty: sealant, category: "Герметизация" },
    { name: `Уплотнительная виброизоляционная лента (${sealTapeRoll} м)`, subtitle: "Ширину подберите под направляющий профиль или примыкание без жёстких мостиков", quantity: sealTape, unit: "рулонов", withReserve: sealTape, purchaseQty: sealTape, category: "Герметизация" },
  );

  /* ─── scenarios ─── */
  const primaryQty = primaryQtyRaw * accuracyMult;

  const isAcousticPlateSystem = system === 0 || system === 3;
  const packageSize = isAcousticPlateSystem ? acousticPlatesPerPack : 1;
  const packageOptions = [{
    size: packageSize,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQty * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `surfaceType:${surfaceType}`,
        `system:${system}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const recScenario = scenarios.REC;

  const primaryMaterial = materials.find((material) =>
    material.name.startsWith(primaryMaterialPrefix),
  );
  if (primaryMaterial) {
    if (isAcousticPlateSystem) {
      primaryMaterial.subtitle = `${primaryMaterial.subtitle}. ${acousticPlatesPerPack} шт. в упаковке — сверьте фасовку выбранного продукта`;
    }
    primaryMaterial.quantity = roundDisplay(recScenario.exact_need, 6);
    primaryMaterial.withReserve = roundDisplay(recScenario.purchase_quantity, 6);
    primaryMaterial.purchaseQty = roundDisplay(recScenario.purchase_quantity, 6);
    if (packageSize > 1) {
      primaryMaterial.packageInfo = {
        count: recScenario.buy_plan.packages_count,
        size: packageSize,
        packageUnit: "упаковок",
      };
    }
  }
  if (system === 1) {
    const includedFastenerKit = materials.find((material) =>
      material.name.startsWith("Комплект крепежа, поставляемый"),
    );
    if (includedFastenerKit) {
      includedFastenerKit.quantity = recScenario.purchase_quantity;
      includedFastenerKit.withReserve = recScenario.purchase_quantity;
      includedFastenerKit.purchaseQty = recScenario.purchase_quantity;
    }
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }
  if (system === 1) {
    warnings.push("Требования к основанию, крепежу и допустимому монтажу ЗИПС проверьте по инструкции выбранной модели");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Герметичность швов и отсутствие жёстких мостиков существенно влияют на результат всей системы");
  if (perimeterEstimated) {
    practicalNotes.push("Периметр не задан: ленты и герметик оценены как для квадратной поверхности той же площади");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      surfaceType,
      system,
      perim: roundDisplay(perim, 3),
      perimeterEstimated: perimeterEstimated ? 1 : 0,
      screedThicknessMm: system === 2 ? roundDisplay(screedThicknessMm, 1) : 0,
      primaryQty: roundDisplay(primaryQty, 6),
      acousticPlatesPerPack: isAcousticPlateSystem ? acousticPlatesPerPack : 0,
      packagesNeeded: isAcousticPlateSystem ? recScenario.buy_plan.packages_count : 0,
      sealant,
      sealTape,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(primaryQtyRaw, "insulation", accuracyMode).explanation,
  };
}
