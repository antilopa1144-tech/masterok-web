import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  FacadePanelsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

/* ─── labels ─── */

const PANEL_TYPE_LABELS: Record<number, string> = {
  0: "Фиброцементные панели 1200×3000 мм (3,6 м²)",
  1: "Металлокассеты 600×1200 мм (0,72 м²)",
  2: "Фасадные панели из слоистого пластика (HPL) 1200×2440 мм (2,928 м²)",
  3: "Металлический сайдинг 230×3000 мм (0,69 м²)",
};

const SUBSTRUCTURE_LABELS: Record<number, string> = {
  0: "Алюминиевая",
  1: "Оцинкованная",
  2: "Деревянная",
};

/* ─── inputs ─── */

interface FacadePanelsInputs {
  area?: number;
  panelType?: number;
  substructure?: number;
  insulationThickness?: number;
  /** Использовать горизонтальные направляющие в дополнение к вертикальным.
   *  По умолчанию 0 — backward-compat с прежней формулой (только вертикали). */
  withHorizontalRails?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalFacadePanels(
  spec: FacadePanelsCanonicalSpec,
  inputs: FacadePanelsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = Math.max(10, Math.min(2000, Math.round(inputs.area ?? getInputDefault(spec, "area", 100))));
  const panelType = Math.max(0, Math.min(3, Math.round(inputs.panelType ?? getInputDefault(spec, "panelType", 0))));
  const substructure = Math.max(0, Math.min(2, Math.round(inputs.substructure ?? getInputDefault(spec, "substructure", 0))));
  const insulationThickness = Math.max(0, Math.min(100, Math.round(inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 0))));
  const withHorizontalRails = Math.max(0, Math.min(1, Math.round(inputs.withHorizontalRails ?? getInputDefault(spec, "withHorizontalRails", 0))));
  const rules = spec.material_rules;

  /* ─── panel area ─── */
  const panelArea = rules.panel_areas[String(panelType)] ?? rules.panel_areas["0"];

  /* ─── formulas ─── */
  const panelsRaw = Math.ceil(area * rules.panel_reserve / panelArea);
  const panels = Math.ceil(panelsRaw * accuracyMult);
  const brackets = Math.ceil(area / rules.bracket_spacing_m2 * rules.bracket_reserve);
  const guides = Math.ceil(area / rules.guide_spacing * rules.guide_reserve / rules.guide_length);
  // Горизонтальные направляющие: при withHorizontalRails=1 формула симметрична вертикальным
  // (площадь / шаг_горизонтального / длина_секции × запас). Шаг по умолчанию 0.6 м (СП 70.13330).
  const horizontalRailStepM = spec.material_rules.horizontal_rail_step_m ?? 0.6;
  const horizontalGuides = withHorizontalRails === 1
    ? Math.ceil((area / horizontalRailStepM) * rules.guide_reserve / rules.guide_length)
    : 0;
  const fasteners = Math.ceil(panels * rules.fasteners_per_panel * rules.fastener_reserve);
  const anchors = Math.ceil(brackets * rules.anchor_per_bracket * rules.anchor_reserve);
  const insPlates = insulationThickness > 0 ? Math.ceil(area * rules.insulation_reserve / rules.insulation_plate) : 0;
  const insDowels = insPlates > 0 ? Math.ceil(area * rules.insulation_dowels_per_m2 * rules.insulation_reserve) : 0;
  const membrane = insPlates > 0 ? Math.ceil(area * rules.membrane_reserve / rules.wind_membrane_roll) : 0;
  const primer = Math.ceil(area * rules.primer_l_per_m2 * rules.primer_reserve / rules.primer_can);
  const sealant = Math.ceil(Math.sqrt(area) * 4 / rules.sealant_per_perim);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "facade-panel",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(panels * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `panelType:${panelType}`,
        `substructure:${substructure}`,
        `insulationThickness:${insulationThickness}`,
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

  const panelFastenerSpecs: Record<number, { name: string; subtitle: string }> = {
    0: substructure === 2
      ? {
          name: "Саморезы для фиброцементных панелей",
          subtitle: "С антикоррозионным покрытием; длину подбирают по толщине панели и деревянной обрешётки",
        }
      : {
          name: "Фасадные заклёпки для фиброцементных панелей",
          subtitle: "Диаметр, длина и цвет должны соответствовать выбранной фасадной системе",
        },
    1: {
      name: "Заклёпки или саморезы для металлокассет",
      subtitle: "Типоразмер зависит от замка кассеты и материала направляющей подсистемы",
    },
    2: {
      name: "Фасадные заклёпки 4,8–5,0 мм для панелей из слоистого пластика (HPL)",
      subtitle: "Длину и цвет выбирают по толщине панели и каталогу фасадной системы",
    },
    3: substructure === 2
      ? {
          name: "Саморезы по дереву для металлического сайдинга",
          subtitle: "С уплотнительной шайбой из EPDM-резины; длину подбирают по толщине обрешётки",
        }
      : {
          name: "Саморезы 4,2×19 мм с прессшайбой",
          subtitle: "Для крепления металлического сайдинга к металлической подсистеме",
        },
  };
  const panelFastenerSpec = panelFastenerSpecs[panelType];

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: PANEL_TYPE_LABELS[panelType],
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: `Кронштейны (${SUBSTRUCTURE_LABELS[substructure]})`,
      quantity: brackets,
      unit: "шт",
      withReserve: brackets,
      purchaseQty: brackets,
      category: "Подсистема",
    },
    {
      name: `Направляющие вертикальные (${rules.guide_length} м)`,
      quantity: guides,
      unit: "шт",
      withReserve: guides,
      purchaseQty: guides,
      category: "Подсистема",
    },
    ...(horizontalGuides > 0 ? [{
      name: `Направляющие горизонтальные (${rules.guide_length} м, шаг ${horizontalRailStepM} м)`,
      quantity: horizontalGuides,
      unit: "шт",
      withReserve: horizontalGuides,
      purchaseQty: horizontalGuides,
      category: "Подсистема",
    } satisfies CanonicalMaterialResult] : []),
    {
      name: panelFastenerSpec.name,
      subtitle: panelFastenerSpec.subtitle,
      quantity: fasteners,
      unit: "шт",
      withReserve: fasteners,
      purchaseQty: fasteners,
      category: "Крепёж",
    },
    {
      name: "Фасадные анкеры для кронштейнов",
      subtitle: "Диаметр, длину и глубину анкеровки выбирают по материалу стены и расчётной нагрузке",
      quantity: anchors,
      unit: "шт",
      withReserve: anchors,
      purchaseQty: anchors,
      category: "Крепёж",
    },
  ];

  if (insPlates > 0) {
    materials.push(
      {
        name: `Минераловатные плиты для вентфасада ${insulationThickness} мм`,
        subtitle: "Негорючие фасадные плиты; плотность выбирают по проекту и требованиям системы",
        quantity: insPlates,
        unit: "шт",
        withReserve: insPlates,
        purchaseQty: insPlates,
        category: "Утепление",
      },
      {
        name: `Дюбели тарельчатые 10×${insulationThickness + 50} мм`,
        subtitle: "Длина включает 50 мм анкеровки; для рыхлого основания требуется отдельная проверка",
        quantity: insDowels,
        unit: "шт",
        withReserve: insDowels,
        purchaseQty: insDowels,
        category: "Крепёж",
      },
      {
        name: `Ветрозащитная диффузионная мембрана (${rules.wind_membrane_roll} м²)`,
        subtitle: "Паропроницаемость и класс пожарной опасности сверяют с техническим свидетельством фасадной системы",
        quantity: membrane,
        unit: "рулонов",
        withReserve: membrane,
        purchaseQty: membrane,
        category: "Утепление",
      },
    );
  }

  materials.push(
    buildPrimerMaterial(area * rules.primer_l_per_m2, { reserveFactor: rules.primer_reserve, category: "Грунтовка" }),
    {
      name: "Герметик фасадный атмосферостойкий",
      subtitle: "Совместимый с материалом панелей и защитным покрытием подсистемы",
      quantity: sealant,
      unit: "шт",
      withReserve: sealant,
      purchaseQty: sealant,
      category: "Монтаж",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь фасада — рассмотрите оптовую закупку");
  }
  if (insulationThickness >= spec.warnings_rules.thick_insulation_threshold_mm) {
    warnings.push("Толстый утеплитель — проверьте длину кронштейнов");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Шаг кронштейнов, направляющих, анкеры и зазоры уточняют по ветровому и статическому расчёту выбранной фасадной системы");
  practicalNotes.push("Монтажные зазоры между панелями берут из альбома технических решений производителя, а не назначают одинаковыми для всех материалов");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      panelType,
      substructure,
      insulationThickness,
      panelArea,
      panels,
      brackets,
      guides,
      horizontalGuides,
      withHorizontalRails,
      fasteners,
      anchors,
      insPlates,
      insDowels,
      membrane,
      primer,
      sealant,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(panelsRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
