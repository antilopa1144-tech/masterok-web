import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  FoundationSlabCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface FoundationSlabInputs {
  area?: number;
  /** Длина прямоугольной плиты, м. Если задана вместе с width > 0 — используется
   *  для точного расчёта арматуры/периметра/опалубки. Иначе fallback на sqrt(area). */
  length?: number;
  /** Ширина прямоугольной плиты, м. См. length. */
  width?: number;
  thickness?: number;
  rebarDiam?: number;
  rebarStep?: number;
  insulationThickness?: number;
  accuracyMode?: AccuracyMode;
}

function buildMaterials(
  concreteM3: number,
  rebarKg: number,
  wireKg: number,
  formworkArea: number,
  geotextile: number,
  gravel: number,
  sand: number,
  eppsPlates: number,
  rebarDiam: number,
  totalBarLen: number,
  insulationThickness: number,
): CanonicalMaterialResult[] {
  const concretePurchaseM3 = roundDisplay(Math.ceil(concreteM3 * 10) / 10, 1);
  const rebarBars117 = Math.ceil(totalBarLen / 11.7);

  const materials: CanonicalMaterialResult[] = [
    {
      name: "Бетон М300 (товарный, класс В22,5)",
      subtitle:
        "Заказывайте с шагом 0,1 м³; подвижность, морозостойкость и водонепроницаемость уточняются по проекту и способу подачи",
      quantity: roundDisplay(concreteM3, 3),
      unit: "м³",
      withReserve: roundDisplay(concreteM3, 3),
      purchaseQty: concretePurchaseM3,
      category: "Основное",
    },
    {
      name: `Арматура рифлёная ∅${rebarDiam} мм для двух сеток`,
      subtitle:
        `Нужно ${roundDisplay(totalBarLen, 1)} пог. м — примерно ${rebarBars117} прутков по 11,7 м; класс стали выбирают по проекту, обычно А500С`,
      quantity: roundDisplay(rebarKg, 3),
      unit: "кг",
      withReserve: Math.ceil(rebarKg),
      purchaseQty: Math.ceil(rebarKg),
      category: "Армирование",
    },
    {
      name: "Проволока вязальная отожжённая ∅1,2 мм",
      subtitle: "Для вязки пересечений верхней и нижней арматурных сеток",
      quantity: roundDisplay(wireKg, 3),
      unit: "кг",
      withReserve: Math.ceil(wireKg),
      purchaseQty: Math.ceil(wireKg),
      category: "Армирование",
    },
    {
      name: "Опалубка — материал для щитов",
      subtitle:
        "Указана площадь щитов; толщину доски или ламинированной фанеры и шаг стоек рассчитывают по высоте плиты",
      quantity: roundDisplay(formworkArea, 3),
      unit: "м²",
      withReserve: Math.ceil(formworkArea),
      purchaseQty: Math.ceil(formworkArea),
      category: "Опалубка",
    },
    {
      name: "Геотекстиль нетканый иглопробивной, 200–300 г/м²",
      subtitle: "Для разделения грунта и песчано-щебёночной подушки; плотность уточняют по грунту и проекту",
      quantity: roundDisplay(geotextile, 3),
      unit: "м²",
      withReserve: Math.ceil(geotextile),
      purchaseQty: Math.ceil(geotextile),
      category: "Подготовка",
    },
    {
      name: "Щебень для подушки, фракция 20–40 мм",
      subtitle: "Гранитный или гравийный; объём указан после уплотнения слоя",
      quantity: roundDisplay(gravel, 3),
      unit: "м³",
      withReserve: roundDisplay(gravel, 3),
      purchaseQty: Math.ceil(gravel),
      category: "Подготовка",
    },
    {
      name: "Песок для подушки, средней или крупной фракции",
      subtitle: "Без глины и органических примесей; объём указан после уплотнения слоя",
      quantity: roundDisplay(sand, 3),
      unit: "м³",
      withReserve: roundDisplay(sand, 3),
      purchaseQty: Math.ceil(sand),
      category: "Подготовка",
    },
  ];

  if (insulationThickness > 0) {
    materials.push({
      name: `Экструдированный пенополистирол (ЭППС) для фундамента 1200×600×${insulationThickness} мм`,
      subtitle:
        "Плиты с подходящей прочностью на сжатие; требуемую марку по нагрузке определяет проектировщик",
      quantity: eppsPlates,
      unit: "шт",
      withReserve: eppsPlates,
      purchaseQty: eppsPlates,
      category: "Утепление",
    });
  }

  return materials;
}

export function computeCanonicalFoundationSlab(
  spec: FoundationSlabCanonicalSpec,
  inputs: FoundationSlabInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const areaInput = Math.max(10, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 60)));
  const thickness = Math.max(150, Math.min(300, inputs.thickness ?? getInputDefault(spec, "thickness", 200)));
  const rebarDiam = Math.max(10, Math.min(16, inputs.rebarDiam ?? getInputDefault(spec, "rebarDiam", 12)));
  const rebarStep = Math.max(150, Math.min(250, inputs.rebarStep ?? getInputDefault(spec, "rebarStep", 200)));
  const insulationThickness = Math.max(0, Math.min(150, inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 0)));

  // Геометрия: если пользователь ввёл length и width — считаем точный прямоугольник.
  // Иначе fallback на квадратную аппроксимацию через sqrt(area). Это устраняет
  // переоценку арматуры/опалубки на вытянутых плитах (3×20 и т.п.).
  const lengthInput = inputs.length ?? 0;
  const widthInput = inputs.width ?? 0;
  const useRect = lengthInput > 0 && widthInput > 0;

  const length = useRect ? lengthInput : Math.sqrt(areaInput);
  const width = useRect ? widthInput : Math.sqrt(areaInput);
  const area = useRect ? roundDisplay(length * width, 6) : areaInput;
  const side = useRect ? Math.sqrt(area) : Math.sqrt(areaInput); // back-compat для totals
  const perimeter = useRect ? 2 * (length + width) : side * 4;

  const stepM = rebarStep / 1000;
  // Прутки в обоих направлениях считаются раздельно: количество прутков длиной L
  // определяется по перпендикулярной стороне делённой на шаг + 1 крайний.
  const barsAlongLength = Math.ceil(width / stepM) + 1;
  const barsAlongWidth = Math.ceil(length / stepM) + 1;
  // back-compat: для квадрата эти значения совпадают, totals.barsPerDir = barsAlongLength.
  const barsPerDir = barsAlongLength;

  const weightPerMeter = spec.material_rules.weight_per_meter[String(rebarDiam)] ?? 0.888;
  const concreteM3Raw = roundDisplay(area * (thickness / 1000) * spec.material_rules.concrete_reserve, 6);
  const concreteM3 = roundDisplay(concreteM3Raw * accuracyMult, 6);
  // Длина одной сетки = (прутки вдоль длины × длина) + (прутки вдоль ширины × ширина).
  // Двух сеток (верх + низ) — × 2.
  const totalBarLen = (barsAlongLength * length + barsAlongWidth * width) * 2;
  const rebarKg = roundDisplay(totalBarLen * weightPerMeter, 6);
  const wireKg = roundDisplay(barsAlongLength * barsAlongWidth * 2 * spec.material_rules.wire_per_joint, 6);
  const formworkArea = roundDisplay(perimeter * (thickness / 1000) * spec.material_rules.formwork_reserve, 6);
  const geotextile = roundDisplay(area * spec.material_rules.geotextile_reserve, 6);
  const gravel = roundDisplay(area * spec.material_rules.gravel_layer, 6);
  const sand = roundDisplay(area * spec.material_rules.sand_layer, 6);
  const eppsPlates = insulationThickness > 0
    ? Math.ceil(area * spec.material_rules.insulation_reserve / spec.material_rules.epps_plate_m2)
    : 0;

  const packageOptions = [{
    size: spec.packaging_rules.volume_step_m3,
    label: `foundation-slab-${spec.packaging_rules.volume_step_m3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(concreteM3 * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `rebarDiam:${rebarDiam}`,
        `rebarStep:${rebarStep}`,
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

  const warnings: string[] = [];
  if (thickness <= spec.warnings_rules.thin_slab_threshold_mm) {
    warnings.push("Тонкая плита — убедитесь, что расчёт соответствует нагрузкам");
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь плиты — рекомендуется профессиональный расчёт нагрузок");
  }

  const practicalNotes: string[] = [];
  if (thickness <= 150) {
    practicalNotes.push(`Плита ${roundDisplay(thickness, 0)} мм — только для лёгких каркасных конструкций, для кирпичного дома минимум 250 мм`);
  }
  if (area > 100) {
    practicalNotes.push(`Плита ${roundDisplay(area, 0)} м² — обязательно непрерывная заливка, иначе холодный шов ослабит конструкцию`);
  }
  if (rebarStep > 200) {
    practicalNotes.push(`Шаг арматуры ${roundDisplay(rebarStep, 0)} мм — для плиты под жилой дом рекомендую не более 200 мм`);
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      concreteM3,
      rebarKg,
      wireKg,
      formworkArea,
      geotextile,
      gravel,
      sand,
      eppsPlates,
      rebarDiam,
      totalBarLen,
      insulationThickness,
    ),
    totals: {
      area: roundDisplay(area, 3),
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      thickness: roundDisplay(thickness, 3),
      rebarDiam: roundDisplay(rebarDiam, 3),
      rebarStep: roundDisplay(rebarStep, 3),
      insulationThickness: roundDisplay(insulationThickness, 3),
      side: roundDisplay(side, 3),
      perimeter: roundDisplay(perimeter, 3),
      concreteM3: roundDisplay(concreteM3, 3),
      barsPerDir: barsPerDir,
      barsAlongLength: barsAlongLength,
      barsAlongWidth: barsAlongWidth,
      totalBarLen: roundDisplay(totalBarLen, 3),
      rebarKg: roundDisplay(rebarKg, 3),
      wireKg: roundDisplay(wireKg, 3),
      formworkArea: roundDisplay(formworkArea, 3),
      geotextile: roundDisplay(geotextile, 3),
      gravel: roundDisplay(gravel, 3),
      sand: roundDisplay(sand, 3),
      eppsPlates: eppsPlates,
      minExactNeedM3: scenarios.MIN.exact_need,
      recExactNeedM3: recScenario.exact_need,
      maxExactNeedM3: scenarios.MAX.exact_need,
      minPurchaseM3: scenarios.MIN.purchase_quantity,
      recPurchaseM3: recScenario.purchase_quantity,
      maxPurchaseM3: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(concreteM3Raw, "generic", accuracyMode).explanation,
  };
}
