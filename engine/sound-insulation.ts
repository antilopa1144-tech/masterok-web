import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SoundInsulationCanonicalSpec,
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
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const ROCKWOOL_PLATE = 0.6;
const ROCKWOOL_RESERVE = 1.1;
const GKL_SHEET = 3;
const GKL_RESERVE_2LAYERS = 2;
const PP_SPACING = 0.6;
const PP_LENGTH = 3;
const VIBRO_PER_M2 = 2;
const VIBRO_RESERVE = 1.05;
const VIBRO_TAPE_ROLL = 30;
const ZIPS_PLATE = 0.72;
const ZIPS_RESERVE = 1.1;
const ZIPS_DUBELS_PER_PANEL = 6;
const ZIPS_DUBEL_RESERVE = 1.05;
const FLOAT_MAT_ROLL = 20;
const FLOAT_RESERVE = 1.1;
const DAMP_TAPE_ROLL = 25;
const SCREED_THICKNESS = 0.05;
const SCREED_DENSITY = 1800;
const SCREED_BAG = 50;
const SEALANT_PER_PERIM = 20;
const SEAL_TAPE_ROLL = 30;
const SEAL_TAPE_RESERVE = 1.1;

/* ─── helpers ─── */

function resolveArea(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 30)));
}

function resolveSurfaceType(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.surfaceType ?? getInputDefault(spec, "surfaceType", 0))));
}

function resolveSystem(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.system ?? getInputDefault(spec, "system", 0))));
}

/* ─── main ─── */

export function computeCanonicalSoundInsulation(
  spec: SoundInsulationCanonicalSpec,
  inputs: SoundInsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = resolveArea(spec, inputs);
  const surfaceType = resolveSurfaceType(spec, inputs);
  const system = resolveSystem(spec, inputs);

  const perim = Math.sqrt(area) * 4;
  const materials: CanonicalMaterialResult[] = [];
  let primaryQty = 0;
  let primaryUnit = "шт";
  let primaryLabel = "sound-insulation";

  /* ── System 0: Basic GKL + Rockwool ── */
  if (system === 0) {
    const rockwoolPlates = Math.ceil(area * ROCKWOOL_RESERVE / ROCKWOOL_PLATE);
    const gklSheets = Math.ceil(area * ROCKWOOL_RESERVE * GKL_RESERVE_2LAYERS / GKL_SHEET);
    const ppPcs = Math.ceil((area / PP_SPACING) * PP_LENGTH * ROCKWOOL_RESERVE / PP_LENGTH);
    const vibro = Math.ceil(area * VIBRO_PER_M2 * VIBRO_RESERVE);
    const vibroTape = Math.ceil((area / PP_SPACING) * PP_LENGTH * ROCKWOOL_RESERVE / VIBRO_TAPE_ROLL);
    const firstLayerSheets = Math.ceil(area * ROCKWOOL_RESERVE / GKL_SHEET);
    const secondLayerSheets = Math.max(0, gklSheets - firstLayerSheets);
    const firstLayerScrewPacks = Math.ceil(firstLayerSheets * 25 / 200);
    const secondLayerScrewPacks = Math.ceil(secondLayerSheets * 25 / 200);

    primaryQty = rockwoolPlates;
    primaryUnit = "шт";
    primaryLabel = "rockwool-plate";

    materials.push(
      { name: "Акустическая минеральная плита 600×1000×50 мм", subtitle: "Выбирайте специализированную акустическую плиту; плотность и допустимую нагрузку сверяйте с системой облицовки", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм, два слоя", subtitle: "Для влажного помещения замените на влагостойкий гипсокартон (ГКЛВ); листы разных слоёв монтируют со смещением стыков", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Потолочный профиль ПП 60×27×3000 мм", subtitle: "Для звукоизоляционной облицовки применяйте совместимую каркасную систему с виброразвязкой", quantity: ppPcs, unit: "шт", withReserve: ppPcs, purchaseQty: ppPcs, category: "Каркас" },
      { name: "Виброподвес для профиля 60×27 мм", subtitle: "Рабочая нагрузка и число точек крепления должны соответствовать паспорту выбранного виброподвеса", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
      { name: `Вибролента 50 мм (${VIBRO_TAPE_ROLL} м)`, subtitle: "Для отделения направляющих профилей от пола, стен и потолка", quantity: vibroTape, unit: "рулонов", withReserve: vibroTape, purchaseQty: vibroTape, category: "Изоляция" },
      { name: "Чёрные саморезы для гипсокартона по металлу 3,5×25 и 3,5×35 мм (по 200 шт)", subtitle: `Купить отдельно: ${firstLayerScrewPacks} уп. 3,5×25 мм — около ${firstLayerSheets * 25} шт. для первого слоя; ${secondLayerScrewPacks} уп. 3,5×35 мм — около ${secondLayerSheets * 25} шт. для второго`, quantity: firstLayerScrewPacks + secondLayerScrewPacks, unit: "упаковок", withReserve: firstLayerScrewPacks + secondLayerScrewPacks, purchaseQty: firstLayerScrewPacks + secondLayerScrewPacks, category: "Крепёж" },
    );
  }

  /* ── System 1: ZIPS panels ── */
  if (system === 1) {
    const zipsPanels = Math.ceil(area * ZIPS_RESERVE / ZIPS_PLATE);
    const dubels = Math.ceil(zipsPanels * ZIPS_DUBELS_PER_PANEL * ZIPS_DUBEL_RESERVE);
    const gklOverlay = Math.ceil(area * ZIPS_RESERVE / GKL_SHEET);

    primaryQty = zipsPanels;
    primaryUnit = "шт";
    primaryLabel = "zips-panel";

    materials.push(
      { name: "Звукоизоляционные сэндвич-панели (ЗИПС) 1200×600 мм", subtitle: "Толщину и модель выбирайте по требуемой прибавке звукоизоляции и допустимой потере площади помещения", quantity: zipsPanels, unit: "шт", withReserve: zipsPanels, purchaseQty: zipsPanels, category: "Основное" },
      { name: "Фирменный крепёжный комплект для звукоизоляционных панелей ЗИПС", subtitle: "Не заменяйте штатные виброузлы обычными дюбелями; длина крепежа зависит от модели панели и основания", quantity: dubels, unit: "шт", withReserve: dubels, purchaseQty: dubels, category: "Крепёж" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм для облицовки", subtitle: "Финишный лист должен соответствовать выбранной системе звукоизоляционных панелей", quantity: gklOverlay, unit: "шт", withReserve: gklOverlay, purchaseQty: gklOverlay, category: "Основное" },
    );
  }

  /* ── System 2: Floating floor ── */
  if (system === 2) {
    const mats = Math.ceil(area * FLOAT_RESERVE / FLOAT_MAT_ROLL);
    const dampTape = Math.ceil(perim / DAMP_TAPE_ROLL);
    const screedBags = Math.ceil(area * SCREED_THICKNESS * SCREED_DENSITY / SCREED_BAG);

    primaryQty = mats;
    primaryUnit = "рулонов";
    primaryLabel = "float-mat";

    materials.push(
      { name: `Рулонный звукоизоляционный материал под плавающую стяжку (${FLOAT_MAT_ROLL} м²)`, subtitle: "Материал должен быть рассчитан на нагрузку от цементной стяжки; стыки выполняйте по паспорту системы", quantity: mats, unit: "рулонов", withReserve: mats, purchaseQty: mats, category: "Основное" },
      { name: `Кромочная демпферная лента (${DAMP_TAPE_ROLL} м)`, subtitle: "Ширина ленты должна быть не меньше полной высоты плавающей стяжки и финишного покрытия", quantity: dampTape, unit: "рулонов", withReserve: dampTape, purchaseQty: dampTape, category: "Изоляция" },
      { name: `Сухая смесь для стяжки М150 (${SCREED_BAG} кг)`, subtitle: `Расчёт выполнен для слоя ${SCREED_THICKNESS * 1000} мм; допустимую толщину и армирование проверьте по выбранной системе пола`, quantity: screedBags, unit: "мешков", withReserve: screedBags, purchaseQty: screedBags, category: "Основное" },
    );
  }

  /* ── System 3: Acoustic ceiling ── */
  if (system === 3) {
    const rockwoolPlates = Math.ceil(area * ROCKWOOL_RESERVE / ROCKWOOL_PLATE);
    const gklSheets = Math.ceil(area * ROCKWOOL_RESERVE * GKL_RESERVE_2LAYERS / GKL_SHEET);
    const vibro = Math.ceil(area * VIBRO_PER_M2 * VIBRO_RESERVE);
    const firstLayerSheets = Math.ceil(area * ROCKWOOL_RESERVE / GKL_SHEET);
    const secondLayerSheets = Math.max(0, gklSheets - firstLayerSheets);
    const firstLayerScrewPacks = Math.ceil(firstLayerSheets * 25 / 200);
    const secondLayerScrewPacks = Math.ceil(secondLayerSheets * 25 / 200);

    primaryQty = rockwoolPlates;
    primaryUnit = "шт";
    primaryLabel = "acoustic-ceiling";

    materials.push(
      { name: "Акустическая минеральная плита 600×1000×50 мм", subtitle: "Плиты укладывают без зазоров и без сжатия; характеристики выбирают по комплектной потолочной системе", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "Гипсокартонные листы (ГКЛ) 1200×2500×12,5 мм, два слоя", subtitle: "Для потолка применяйте листы и схему крепления, допускаемые выбранной подвесной системой", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Виброподвес для акустического потолка", subtitle: "Рабочую нагрузку, крепёж к перекрытию и шаг подвесов выбирают по паспорту системы", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
      { name: "Чёрные саморезы для гипсокартона по металлу 3,5×25 и 3,5×35 мм (по 200 шт)", subtitle: `Купить отдельно: ${firstLayerScrewPacks} уп. 3,5×25 мм — около ${firstLayerSheets * 25} шт.; ${secondLayerScrewPacks} уп. 3,5×35 мм — около ${secondLayerSheets * 25} шт.`, quantity: firstLayerScrewPacks + secondLayerScrewPacks, unit: "упаковок", withReserve: firstLayerScrewPacks + secondLayerScrewPacks, purchaseQty: firstLayerScrewPacks + secondLayerScrewPacks, category: "Крепёж" },
    );
  }

  /* ── Common: sealant + sealing tape (all systems) ── */
  const sealant = Math.ceil(perim * 2 / SEALANT_PER_PERIM);
  const sealTape = Math.ceil(perim * 2 * SEAL_TAPE_RESERVE / SEAL_TAPE_ROLL);

  materials.push(
    { name: "Невысыхающий акустический герметик, 280–310 мл", subtitle: "Для герметизации периметра и швов; обычный санитарный силикон не является равноценной заменой", quantity: sealant, unit: "тюбиков", withReserve: sealant, purchaseQty: sealant, category: "Герметизация" },
    { name: `Уплотнительная виброизоляционная лента (${SEAL_TAPE_ROLL} м)`, subtitle: "Ширину подберите под направляющий профиль или примыкание без жёстких мостиков", quantity: sealTape, unit: "рулонов", withReserve: sealTape, purchaseQty: sealTape, category: "Герметизация" },
  );

  /* ─── scenarios ─── */
  const primaryQtyRaw = primaryQty;
  primaryQty = Math.ceil(primaryQty * accuracyMult);

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
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

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }
  if (system === 1) {
    warnings.push("Система звукоизоляционных панелей ЗИПС требует ровного основания");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Звукоизоляция работает только когда нет щелей — даже маленькая щель убивает эффект");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      surfaceType,
      system,
      perim: roundDisplay(perim, 3),
      primaryQty,
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
    accuracyExplanation: applyAccuracyMode(primaryQtyRaw, "generic", accuracyMode).explanation,
  };
}
