import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  GuttersCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── inputs ─── */

interface GuttersInputs {
  roofPerimeter?: number;
  roofArea?: number;
  roofHeight?: number;
  funnels?: number;
  systemType?: number;
  gutterDia?: number;
  gutterLength?: number;
  gutterSections?: number;
  gutterCornerCount?: number;
  endCapCount?: number;
  hasEaveOffset?: number;
  /** Дополнительные колена/отводы 45° на изгибах трассы трубы. */
  bendCount45?: number;
  /** Дополнительные колена/отводы 90° на изгибах трассы трубы. */
  bendCount90?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalGutters(
  spec: GuttersCanonicalSpec,
  inputs: GuttersInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const roofPerimeter = Math.max(5, Math.min(200, inputs.roofPerimeter ?? getInputDefault(spec, "roofPerimeter", 20)));
  const roofArea = Math.max(10, Math.min(1000, inputs.roofArea ?? getInputDefault(spec, "roofArea", 100)));
  const roofHeight = Math.max(2, Math.min(15, inputs.roofHeight ?? getInputDefault(spec, "roofHeight", 5)));
  const funnels = Math.max(1, Math.min(20, Math.round(inputs.funnels ?? getInputDefault(spec, "funnels", 2))));
  const systemType = Math.max(0, Math.min(3, Math.round(inputs.systemType ?? getInputDefault(spec, "systemType", 1))));
  const system = spec.material_rules.systems[String(systemType)] ?? spec.material_rules.systems["1"];
  const gutterLength = Math.max(1.5, Math.min(3, inputs.gutterLength ?? getInputDefault(spec, "gutterLength", 3)));
  const gutterSections = Math.max(1, Math.min(20, Math.round(inputs.gutterSections ?? getInputDefault(spec, "gutterSections", 2))));
  const gutterCornerCount = Math.max(0, Math.min(20, Math.round(inputs.gutterCornerCount ?? getInputDefault(spec, "gutterCornerCount", 0))));
  const endCapCount = Math.max(0, Math.min(40, Math.round(inputs.endCapCount ?? getInputDefault(spec, "endCapCount", 4))));
  const hasEaveOffset = Math.round(inputs.hasEaveOffset ?? getInputDefault(spec, "hasEaveOffset", 1)) === 1;
  const bendCount45 = Math.max(0, Math.min(20, Math.round(inputs.bendCount45 ?? getInputDefault(spec, "bendCount45", 0))));
  const bendCount90 = Math.max(0, Math.min(20, Math.round(inputs.bendCount90 ?? getInputDefault(spec, "bendCount90", 0))));

  /* ─── gutters ─── */
  const gutterSectionLength = roofPerimeter / gutterSections;
  const gutterPcsPerSection = Math.ceil(gutterSectionLength / gutterLength);
  const gutterExactPcs = roofPerimeter / gutterLength;
  const gutterPcs = gutterPcsPerSection * gutterSections;

  /* ─── pipes ─── */
  const pipeExactPcs = roofHeight * funnels / gutterLength;
  const pipePerFunnel = Math.ceil(roofHeight / gutterLength);
  const pipePcs = pipePerFunnel * funnels;
  const pipeCouplings = Math.max(0, (pipePerFunnel - 1) * funnels);

  /* ─── gutter joints ─── */
  const gutterJoints = Math.max(0, (gutterPcsPerSection - 1) * gutterSections);

  /* ─── hooks ─── */
  const specialElementBrackets = gutterCornerCount + funnels * 2 + gutterJoints * 2;
  const regularBracketLength = Math.max(
    0,
    roofPerimeter - specialElementBrackets * spec.material_rules.special_element_offset_m,
  );
  const gutterHooks = Math.ceil(
    specialElementBrackets + regularBracketLength / system.hook_step_m,
  );

  /* ─── pipe clamps ─── */
  const pipeClamps = Math.ceil(
    (roofHeight / spec.material_rules.pipe_clamp_step_m + 1) * funnels,
  );

  /* ─── corners и явные дополнительные колена 45/90 ─── */
  const corners = gutterCornerCount;
  const elbows45 = bendCount45;
  const elbows90 = bendCount90;

  /* ─── два колена для обхода карнизного вылета ─── */
  const kneeElbows = hasEaveOffset ? funnels * 2 : 0;
  const drainOutlets = funnels;

  /* ─── end caps ─── */
  const endCaps = endCapCount;

  /* ─── connectors ─── */
  const connectors = gutterJoints;

  /* ─── primary quantity for scenarios ─── */
  const primaryQuantityRaw = gutterExactPcs;
  const primaryQuantity = Math.ceil(primaryQuantityRaw * accuracyMult);
  const primaryUnit = "шт";
  const primaryLabel = `gutter-${system.gutter_diameter_mm}mm-${gutterLength}m`;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQuantity * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `systemType:${systemType}`,
        `gutterLength:${gutterLength}`,
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

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Желоб водосточный (ø${system.gutter_diameter_mm} мм, ${gutterLength} м)`,
      subtitle: `${system.label}; ${gutterSections} прямых участка по ${roundDisplay(gutterSectionLength, 2)} м`,
      quantity: roundDisplay(gutterExactPcs, 3),
      unit: "шт",
      withReserve: roundDisplay(gutterExactPcs, 3),
      purchaseQty: gutterPcs,
      category: "Желоба",
    },
    {
      name: `Труба водосточная (ø${system.pipe_diameter_mm} мм, ${gutterLength} м)`,
      subtitle: "Вертикальная часть стояков; отрезок для обхода карниза проверяется по фактическому вылету",
      quantity: roundDisplay(pipeExactPcs, 3),
      unit: "шт",
      withReserve: roundDisplay(pipeExactPcs, 3),
      purchaseQty: pipePcs,
      category: "Трубы",
    },
    {
      name: "Воронки водосборные",
      quantity: funnels,
      unit: "шт",
      withReserve: funnels,
      purchaseQty: funnels,
      category: "Воронки",
    },
    ...(connectors > 0 ? [{
      name: "Соединители желобов",
      quantity: connectors,
      unit: "шт",
      withReserve: connectors,
      purchaseQty: connectors,
      category: "Соединители",
    } satisfies CanonicalMaterialResult] : []),
    ...(pipeCouplings > 0 ? [{
      name: "Муфты соединительные для труб",
      quantity: pipeCouplings,
      unit: "шт",
      withReserve: pipeCouplings,
      purchaseQty: pipeCouplings,
      category: "Соединители",
    } satisfies CanonicalMaterialResult] : []),
    ...(kneeElbows > 0 ? [{
      name: "Колена универсальные для обхода карниза",
      quantity: kneeElbows,
      unit: "шт",
      withReserve: kneeElbows,
      purchaseQty: kneeElbows,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    {
      name: "Водосточные сливы (наконечники)",
      quantity: drainOutlets,
      unit: "шт",
      withReserve: drainOutlets,
      purchaseQty: drainOutlets,
      category: "Фасонные",
    },
    ...(endCaps > 0 ? [{
      name: "Заглушки желоба",
      quantity: endCaps,
      unit: "шт",
      withReserve: endCaps,
      purchaseQty: endCaps,
      category: "Заглушки",
    } satisfies CanonicalMaterialResult] : []),
    {
      name: "Кронштейны желоба",
      quantity: gutterHooks,
      unit: "шт",
      withReserve: gutterHooks,
      purchaseQty: gutterHooks,
      category: "Крепёж",
    },
    {
      name: "Хомуты трубы",
      quantity: pipeClamps,
      unit: "шт",
      withReserve: pipeClamps,
      purchaseQty: pipeClamps,
      category: "Крепёж",
    },
    ...(corners > 0 ? [{
      name: "Угловые элементы",
      quantity: corners,
      unit: "шт",
      withReserve: corners,
      purchaseQty: corners,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    ...(elbows45 > 0 ? [{
      name: "Колена/отводы 45°",
      quantity: elbows45,
      unit: "шт",
      withReserve: elbows45,
      purchaseQty: elbows45,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    ...(elbows90 > 0 ? [{
      name: "Колена/отводы 90°",
      quantity: elbows90,
      unit: "шт",
      withReserve: elbows90,
      purchaseQty: elbows90,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  const recommendedFunnelsByArea = Math.ceil(roofArea / system.capacity_edge_m2);
  const recommendedFunnelsByLength = gutterSections * Math.ceil(
    gutterSectionLength / spec.warnings_rules.max_gutter_run_per_funnel_m,
  );
  const recommendedFunnels = Math.max(
    gutterSections,
    recommendedFunnelsByArea,
    recommendedFunnelsByLength,
  );
  if (funnels < recommendedFunnels) {
    warnings.push(
      `Недостаточно воронок: рекомендуется минимум ${recommendedFunnels} шт. для ${roundDisplay(roofArea, 0)} м² и ${gutterSections} участков желоба`,
    );
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Расчёт относится к наружному водостоку скатной крыши; внутренние воронки плоской кровли рассчитываются отдельно");
  practicalNotes.push("Уклон желоба 3–3,5 мм на метр — иначе вода будет стоять и переливаться");
  practicalNotes.push("Штатные ПВХ-соединения не заполняйте герметиком: температурные зазоры должны работать по инструкции системы");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofPerimeter: roundDisplay(roofPerimeter, 3),
      roofArea: roundDisplay(roofArea, 3),
      roofHeight: roundDisplay(roofHeight, 3),
      funnels,
      systemType,
      gutterDia: system.gutter_diameter_mm,
      pipeDia: system.pipe_diameter_mm,
      gutterLength,
      gutterSections,
      gutterSectionLength: roundDisplay(gutterSectionLength, 3),
      gutterCornerCount,
      endCapCount,
      hasEaveOffset: hasEaveOffset ? 1 : 0,
      gutterExactPcs: roundDisplay(gutterExactPcs, 3),
      gutterPcs,
      pipeExactPcs: roundDisplay(pipeExactPcs, 3),
      pipePcs,
      pipePerFunnel,
      pipeCouplings,
      gutterJoints,
      gutterHooks,
      pipeClamps,
      corners,
      elbows45,
      elbows90,
      bendCount45,
      bendCount90,
      kneeElbows,
      drainOutlets,
      endCaps,
      connectors,
      recommendedFunnelsByArea,
      recommendedFunnelsByLength,
      recommendedFunnels,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(primaryQuantityRaw, "generic", accuracyMode).explanation,
  };
}
