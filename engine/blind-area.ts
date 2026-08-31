import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BlindAreaCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import {
  type AccuracyMode,
  type MaterialCategory,
  DEFAULT_ACCURACY_MODE,
  applyAccuracyMode,
  getPrimaryMultiplier,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── labels ─── */

const MATERIAL_TYPE_LABELS: Record<number, string> = {
  0: "Бетон",
  1: "Тротуарная плитка",
  2: "Мягкая мембрана",
};

/* ─── inputs ─── */

interface BlindAreaInputs {
  perimeter?: number;
  width?: number;
  thickness?: number;
  materialType?: number;
  withInsulation?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalBlindArea(
  spec: BlindAreaCanonicalSpec,
  inputs: BlindAreaInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const rules = spec.material_rules;

  const perimeter = Math.max(10, Math.min(200, inputs.perimeter ?? getInputDefault(spec, "perimeter", 40)));
  const width = Math.max(0.6, Math.min(1.5, inputs.width ?? getInputDefault(spec, "width", 1.0)));
  const thickness = Math.max(70, Math.min(150, inputs.thickness ?? getInputDefault(spec, "thickness", 100)));
  const materialType = Math.max(0, Math.min(2, Math.round(inputs.materialType ?? getInputDefault(spec, "materialType", 0))));
  const withInsulation = Math.max(0, Math.min(100, inputs.withInsulation ?? getInputDefault(spec, "withInsulation", 0)));

  /* ─── base geometry ───
   * For a closed rectilinear contour, the outer strip consists of straight
   * runs P×W plus the net contribution of four square outside corners 4×W².
   * This remains true for an orthogonal outline with recesses while the offset
   * does not self-intersect: convex and concave corner contributions cancel.
   */
  const straightStripArea = perimeter * width;
  const cornerAllowanceArea = 4 * width * width;
  const area = straightStripArea + cornerAllowanceArea;
  const outerEdgeLength = perimeter + 8 * width;

  /* ─── type-specific ─── */
  let concreteM3 = 0;
  let meshAreaM2 = 0;
  let damperM = 0;
  let tileM2 = 0;
  let borderPcs = 0;
  let membraneM2 = 0;
  let membraneWithOverlapM2 = 0;
  let decorGravelM3 = 0;

  if (materialType === 0) {
    /* concrete */
    concreteM3 = roundDisplay(area * (thickness / 1000), 6);
    meshAreaM2 = thickness >= 100 ? roundDisplay(area, 6) : 0;
    damperM = roundDisplay(perimeter, 6);
  } else if (materialType === 1) {
    /* tile */
    tileM2 = roundDisplay(area, 6);
    borderPcs = Math.ceil(outerEdgeLength / rules.border_piece_length_m);
  } else {
    /* soft membrane */
    membraneM2 = roundDisplay(area, 6);
    membraneWithOverlapM2 = roundDisplay(area * rules.membrane_overlap_factor, 6);
    decorGravelM3 = roundDisplay(area * rules.decorative_gravel_layer_m, 3);
  }

  /* ─── common layers ─── */
  const gravelLayer = rules.gravel_layer_by_type[String(materialType)] ?? 0;
  const sandLayer = rules.sand_layer_by_type[String(materialType)] ?? 0;
  const gravel = roundDisplay(area * gravelLayer, 3);
  const sand = roundDisplay(area * sandLayer, 3);
  const geotextileRolls = materialType === 2
    ? 0
    : Math.ceil(area * rules.geotextile_reserve / rules.geotextile_roll_m2);
  const eppsPlates = withInsulation > 0
    ? Math.ceil(area * rules.epps_reserve / rules.epps_plate_m2)
    : 0;

  /* ─── scenarios ─── */
  const basePrimaryRaw = materialType === 0
    ? concreteM3
    : materialType === 1
      ? tileM2
      : membraneWithOverlapM2;
  const accuracyBaseRaw = materialType === 2 ? membraneM2 : basePrimaryRaw;
  const materialCategory: MaterialCategory = materialType === 0
    ? "concrete"
    : materialType === 1
      ? "tile"
      : "waterproofing";
  const accuracyMult = getPrimaryMultiplier(materialCategory, accuracyMode);
  const basePrimary = roundDisplay(accuracyBaseRaw * accuracyMult, 6);
  const packageUnit = materialType === 0 ? "м³" : "м²";
  const packageLabel = materialType === 0
    ? "concrete-m3"
    : materialType === 1
      ? "tile-m2"
      : "membrane-m2";

  const packageOptions = [{
    size: materialType === 0
      ? spec.packaging_rules.concrete_step_m3
      : spec.packaging_rules.surface_step_m2,
    label: packageLabel,
    unit: packageUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    // A scenario must never recommend less than the deterministic geometry.
    const exactNeed = roundDisplay(Math.max(basePrimaryRaw, basePrimary * multiplier), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `materialType:${materialType}`,
        `thickness:${thickness}`,
        `geometry:closed-orthogonal-contour`,
        ...(materialType === 2 ? [`membrane_overlap_factor:${rules.membrane_overlap_factor}`] : []),
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

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [];

  if (materialType === 0) {
    const meshWithOverlap = roundDisplay(meshAreaM2 * rules.mesh_reserve, 6);
    const damperWithReserve = roundDisplay(damperM * rules.damper_reserve, 6);
    materials.push(
      {
        name: `Бетон В15 (М200), слой ${thickness} мм`,
        subtitle: "Справочная позиция текущей модели: класс прочности, морозостойкость, водонепроницаемость и подвижность смеси назначают проектом; по одному объёму бетон не заказывают",
        quantity: concreteM3,
        unit: "м³",
        withReserve: recScenario.exact_need,
        purchaseQty: recScenario.purchase_quantity,
        packageInfo: {
          count: recScenario.buy_plan.packages_count,
          size: recScenario.buy_plan.package_size,
          packageUnit: "шагов заказа",
        },
        category: "Бетон",
      },
    );
    if (meshAreaM2 > 0) {
      materials.push({
        name: "Арматурная сетка 100×100×4 мм",
        subtitle: "Справочная позиция текущей модели: необходимость, диаметр, шаг, защитный слой, нахлёсты и число карт назначают проектом; площадь не является готовой ведомостью армирования",
        quantity: meshAreaM2,
        unit: "м²",
        withReserve: meshWithOverlap,
        purchaseQty: Math.ceil(meshWithOverlap),
        category: "Армирование",
      });
    }
    materials.push({
      name: "Демпферная разделительная лента для примыкания к цоколю",
      subtitle: "Справочная длина примыкания: материал, ширину и конструкцию разделительного шва выбирают по проектному узлу; это не готовая позиция к покупке",
      quantity: damperM,
      unit: "м",
      withReserve: damperWithReserve,
      purchaseQty: Math.ceil(damperWithReserve),
      category: "Расходные",
    });
  } else if (materialType === 1) {
    materials.push(
      {
        name: "Тротуарная плитка для наружных работ",
        subtitle: "Площадь покрытия; формат, морозостойкость, толщину, раскладку и класс нагрузки выбирают по проекту и фактическим условиям эксплуатации",
        quantity: tileM2,
        unit: "м²",
        withReserve: recScenario.exact_need,
        purchaseQty: recScenario.purchase_quantity,
        category: "Покрытие",
      },
      {
        name: `Бордюр тротуарный, длина ${rules.border_piece_length_m} м`,
        subtitle: "Справочная позиция по всей наружной кромке: бордюр нужен не в каждом узле, а его длину, высоту, сечение и основание задаёт проект",
        quantity: roundDisplay(outerEdgeLength / rules.border_piece_length_m, 6),
        unit: "шт",
        withReserve: borderPcs,
        purchaseQty: borderPcs,
        category: "Покрытие",
      },
    );
  } else {
    materials.push(
      {
        name: "Профилированная дренажная мембрана",
        subtitle: "Предварительная площадь с фиксированным нахлёстом модели; тип мембраны, примыкание к цоколю, выпуски и отвод воды задаёт проект системы",
        quantity: membraneM2,
        unit: "м²",
        withReserve: recScenario.exact_need,
        purchaseQty: recScenario.purchase_quantity,
        category: "Покрытие",
      },
      {
        name: "Декоративный щебень фракции 20–40 мм",
        subtitle: "Предварительный объём фиксированного слоя 100 мм; фракцию, толщину, ограничение кромки и схему обслуживания выбирают по проекту",
        quantity: decorGravelM3,
        unit: "м³",
        withReserve: decorGravelM3,
        purchaseQty: Math.ceil(decorGravelM3 * 10) / 10,
        category: "Покрытие",
      },
    );
  }

  /* ─── common materials ─── */
  if (gravel > 0) {
    materials.push({
      name: "Щебень фракции 20–40 мм для подушки",
      subtitle: "Предварительный геометрический объём фиксированного слоя 150 мм; фракцию, толщину, послойное уплотнение и объём поставки назначают по грунту и проекту",
      quantity: gravel,
      unit: "м³",
      withReserve: gravel,
      purchaseQty: Math.ceil(gravel * 10) / 10,
      category: "Подготовка",
    });
  }
  if (sand > 0) {
    materials.push({
      name: "Песок строительный средней крупности для подушки",
      subtitle: "Предварительный геометрический объём фиксированного слоя 100 мм; тип песка, толщину, уплотнение и коэффициент поставки рыхлого материала уточняют по проекту и у поставщика",
      quantity: sand,
      unit: "м³",
      withReserve: sand,
      purchaseQty: Math.ceil(sand * 10) / 10,
      category: "Подготовка",
    });
  }
  if (geotextileRolls > 0) {
    materials.push({
      name: `Геотекстиль 200 г/м², рулон ${rules.geotextile_roll_m2} м²`,
      subtitle: "Справочная позиция текущей модели: необходимость, класс, прочность, нахлёсты и формат рулона выбирают по функции слоя и проекту основания",
      quantity: geotextileRolls,
      unit: "рулонов",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Подготовка",
    });
  }

  if (eppsPlates > 0) {
    materials.push({
      name: `Экструдированный пенополистирол (ЭППС) ${withInsulation} мм, плита 1200×600 мм`,
      subtitle: "Справочная раскладка по площади плиты 0,72 м²: толщину, прочность, ширину утеплённого контура и узел у фундамента калькулятор не подбирает",
      quantity: eppsPlates,
      unit: "шт",
      withReserve: eppsPlates,
      purchaseQty: eppsPlates,
      category: "Утепление",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (width < 0.8) {
    warnings.push("Ширина менее 0,8 м — узкий вариант: проверьте свес кровли, грунт и схему водоотвода по проекту");
  }
  if (materialType === 0 && thickness < 100) {
    warnings.push("Слой бетона 70 мм требует проверки основания, класса бетона и армирования по проекту; сетка автоматически не добавлена");
  }
  if (materialType === 1) {
    warnings.push("Укладочный слой и швы плитки не рассчитаны: их расход зависит от выбранной системы, толщины слоя и паспорта смеси");
  }
  if (materialType === 2) {
    warnings.push("Для мягкой системы рассчитана профилированная мембрана с прикреплённым геотекстилем; отдельный рулон геотекстиля не добавлен");
  }

  const practicalNotes: string[] = [];
  if (width < 0.8) {
    practicalNotes.push(`Отмостка ${roundDisplay(width, 1)} м — узкая для большинства частных домов; это не универсальный нормативный минимум`);
  }
  practicalNotes.push("СП 82.13330.2016 требует уклон от здания от 1% до 10%; конкретное значение выбирают по покрытию и схеме водоотвода");
  practicalNotes.push("Песок, щебень, геотекстиль, бордюр, сетка и разделение у цоколя — предварительные позиции фиксированной модели, а не проект конструкции и не готовая ведомость закупки");
  if (materialType === 0) {
    practicalNotes.push("В15 (М200) — допущение текущей модели; проект должен задать класс бетона, морозостойкость, водонепроницаемость, подвижность, армирование и деформационные швы");
  }
  if (withInsulation > 0) {
    practicalNotes.push("Выбранная толщина ЭППС используется только для подсчёта плит и не подтверждает теплотехнический расчёт или защиту от морозного пучения");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      perimeter: roundDisplay(perimeter, 3),
      width: roundDisplay(width, 3),
      area: roundDisplay(area, 3),
      straightStripArea: roundDisplay(straightStripArea, 3),
      cornerAllowanceArea: roundDisplay(cornerAllowanceArea, 3),
      outerEdgeLength: roundDisplay(outerEdgeLength, 3),
      thickness,
      materialType,
      withInsulation,
      concreteM3,
      meshPcs: meshAreaM2,
      meshAreaM2,
      damperM,
      tileM2,
      mixBags: 0,
      borderPcs,
      membraneM2,
      membraneWithOverlapM2,
      decorGravelM3,
      gravel,
      sand,
      geotextileRolls,
      eppsPlates,
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
    accuracyExplanation: applyAccuracyMode(accuracyBaseRaw, materialCategory, accuracyMode).explanation,
  };
}
