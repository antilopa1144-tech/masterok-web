import { computeCanonicalInsulation } from "../../../../engine/insulation";
import type { InsulationCanonicalSpec } from "../../../../engine/canonical";
import type { FactorTable } from "../../../../engine/factors";
import insulationSpec from "../../../../configs/calculators/insulation-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import type { CalculatorResult, MaterialResult, SummaryCard } from "../types";
import { getRecommendedThicknessMm } from "../insulation-smart";
import {
  applyCatalogProductToInputs,
  getInsulationProduct,
  getProductCostPerM2,
  getProductDisplayName,
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
  INSULATION_PRODUCT_MANUAL,
  type InsulationCatalogProduct,
} from "../insulation-catalog";
import {
  checkMineralWoolDensity,
  dowelLengthMm,
  enrichInsulationInputs,
} from "./insulation-inputs";
import {
  buildMaterialListBanner,
  organizeInsulationMaterials,
} from "../insulation-material-list";

const spec = insulationSpec as unknown as InsulationCanonicalSpec;
const factorTable = defaultFactorTables.factors as unknown as FactorTable;

const LAYER_SPLIT: Record<number, [number, number]> = {
  100: [50, 50],
  150: [50, 100],
  200: [100, 100],
  250: [100, 150],
  300: [150, 150],
};

function isMainInsulationCategory(category?: string): boolean {
  if (!category) return false;
  return (
    category.startsWith("Утеплитель") ||
    category === "Основное" ||
    category === "Напыляемая изоляция"
  );
}

function formKeyFromMaterialForm(materialForm: number): InsulationCatalogProduct["form"] {
  if (materialForm === INSULATION_FORM_ROLLS) return "rolls";
  if (materialForm === INSULATION_FORM_SPRAY) return "spray";
  return "slabs";
}

function enrichInsulationMaterials(
  materials: MaterialResult[],
  product: ReturnType<typeof getInsulationProduct>,
  materialForm: number,
  thickness: number,
): MaterialResult[] {
  return materials.map((m) => {
    if (!isMainInsulationCategory(m.category)) return m;
    const parts: string[] = [];
    if (product) {
      if (product.form === "slabs" && product.plateLengthMm && product.plateWidthMm) {
        parts.push(
          `Плита ${product.plateLengthMm}×${product.plateWidthMm} мм · ${product.plateAreaM2} м²`,
        );
      } else if (product.form === "rolls" && product.rollWidthMm && product.rollLengthMm) {
        parts.push(
          `Рулон ${product.rollWidthMm}×${product.rollLengthMm} мм · ${product.rollAreaM2} м²`,
        );
      } else if (product.form === "spray") {
        parts.push(`Напыление · плотность укладки ~${product.ecowoolDensityKgM3 ?? 35} кг/м³`);
      }
      if (product.densityKgM3) parts.push(`${product.densityKgM3} кг/м³`);
    } else if (materialForm === INSULATION_FORM_ROLLS) {
      parts.push("Рулон (ручной подбор размера)");
    }
    parts.push(`Слой ${thickness} мм`);
    if (m.packageInfo && m.packageInfo.count > 0) {
      parts.push(
        `${m.packageInfo.count} ${m.packageInfo.packageUnit} × ${m.packageInfo.size} ${m.unit}`,
      );
    }
    return { ...m, subtitle: parts.join(" · ") };
  });
}

export function runInsulationCalculate(
  inputs: Record<string, number>,
): CalculatorResult {
  const brandWarnings: string[] = [];
  const productId = Math.round(inputs.productId ?? INSULATION_PRODUCT_MANUAL);
  const userMaterialForm = Math.round(inputs.materialForm ?? INSULATION_FORM_SLABS);
  let product = getInsulationProduct(productId);
  if (product && product.form !== formKeyFromMaterialForm(userMaterialForm)) {
    brandWarnings.push(
      `Линейка «${product.manufacturer} ${product.lineName}» не подходит к форме «${userMaterialForm === INSULATION_FORM_ROLLS ? "рулоны" : userMaterialForm === INSULATION_FORM_SPRAY ? "напыление" : "плиты"}». Выберите линейку из списка для этой формы.`,
    );
    product = null;
  }
  const hasCatalogProduct = product != null;

  const { enriched: enrichedFromApp, warnings: applicationWarnings } = enrichInsulationInputs(
    inputs as Record<string, unknown>,
    hasCatalogProduct,
  );
  const enrichedInputs: Record<string, unknown> = {
    ...enrichedFromApp,
    accuracyMode: inputs.accuracyMode,
  };
  brandWarnings.push(...applicationWarnings);

  if (product) {
    const thickness = Number(enrichedInputs.thickness ?? inputs.thickness ?? 100);
    applyCatalogProductToInputs(product, enrichedInputs, thickness);
    enrichedInputs.productLineName = getProductDisplayName(product);
    if (!product.thicknessMm.includes(thickness)) {
      brandWarnings.push(
        `Для «${product.manufacturer} ${product.lineName}» доступны толщины: ` +
          `${product.thicknessMm.join(", ")} мм. Выбрано ${thickness} мм — проверьте упаковку на этикетке.`,
      );
    }
    if (product.note) {
      enrichedInputs._productNote = product.note;
    }
  } else {
    enrichedInputs.productForm = Math.round(
      inputs.materialForm ?? INSULATION_FORM_SLABS,
    );
  }

  const materialForm = Number(
    enrichedInputs.productForm ?? inputs.materialForm ?? INSULATION_FORM_SLABS,
  );
  const baseThickness = Number(enrichedInputs.thickness ?? inputs.thickness ?? 100);
  const userScheme = Math.round(Number(inputs.layerScheme ?? 0));
  const canUseTwoLayers =
    materialForm === INSULATION_FORM_SLABS &&
    product?.insulationTypeId !== 3;
  const split = userScheme === 1 && canUseTwoLayers ? LAYER_SPLIT[baseThickness] : undefined;
  const isTwoLayer = userScheme === 1 && !!split;

  let canonical = computeCanonicalInsulation(
    spec as Parameters<typeof computeCanonicalInsulation>[0],
    enrichedInputs as Parameters<typeof computeCanonicalInsulation>[1],
    factorTable as Parameters<typeof computeCanonicalInsulation>[2],
  );

  if (isTwoLayer && split && product) {
    const [t1, t2] = split;
    const calcLayer = (layerThickness: number) => {
      const layerInputs: Record<string, unknown> = { ...enrichedInputs, thickness: layerThickness };
      applyCatalogProductToInputs(product, layerInputs, layerThickness);
      return computeCanonicalInsulation(
        spec as Parameters<typeof computeCanonicalInsulation>[0],
        layerInputs as Parameters<typeof computeCanonicalInsulation>[1],
        factorTable as Parameters<typeof computeCanonicalInsulation>[2],
      );
    };
    const layerA = calcLayer(t1);
    const layerB = calcLayer(t2);
    const layerAMain = layerA.materials.find((m) => isMainInsulationCategory(m.category));
    const layerBMain = layerB.materials.find((m) => isMainInsulationCategory(m.category));
    const layerADowels = layerA.materials.find((m) => m.name.includes("Дюбели"));
    const otherCompanions = layerA.materials.filter(
      (m) => !isMainInsulationCategory(m.category) && !m.name.includes("Дюбели"),
    );
    const merged = [];
    if (layerAMain) merged.push({ ...layerAMain, name: `Слой 1 — ${layerAMain.name}` });
    if (layerBMain) merged.push({ ...layerBMain, name: `Слой 2 — ${layerBMain.name}` });
    if (layerADowels) {
      const totalThickness = t1 + t2;
      merged.push({
        ...layerADowels,
        name: `Дюбели тарельчатые 10×${dowelLengthMm(totalThickness)} мм (сквозные, ${totalThickness} мм)`,
      });
    }
    merged.push(...otherCompanions);
    canonical = {
      ...canonical,
      materials: merged,
      practicalNotes: [
        ...(canonical.practicalNotes ?? []),
        `Двухслойная укладка: ${t1}+${t2} мм (СП 23-101-2004).`,
      ],
    };
  }

  const thickness = Number(inputs.thickness ?? 100);
  const climateZone = Math.round(inputs.climateZone ?? 1);
  const recThickness = getRecommendedThicknessMm(climateZone);
  if (thickness < recThickness - 1) {
    brandWarnings.push(
      `Толщина ${thickness} мм меньше рекомендуемой для выбранного региона (${recThickness} мм по СП 50.13330).`,
    );
  }

  const insulationType = Number(enrichedInputs.insulationType ?? inputs.insulationType ?? 0);
  const mountSystem = Number(enrichedInputs.mountSystem ?? inputs.mountSystem ?? 0);
  const application = Math.round(
    Number(enrichedInputs.application ?? inputs.application ?? 0),
  );
  const area = Number(inputs.area ?? 0);

  const materialsCtx = {
    materialForm,
    mountSystem,
    application,
    area,
    thickness,
    product,
  };
  let materials = organizeInsulationMaterials(
    enrichInsulationMaterials(canonical.materials, product, materialForm, thickness),
    materialsCtx,
  );
  const materialListBanner = buildMaterialListBanner(materialsCtx);
  const totals: Record<string, number> = {
    ...canonical.totals,
    productId,
    materialForm,
    application,
  };
  let effectiveDensity = 0;
  if (product?.densityKgM3) {
    effectiveDensity = product.densityKgM3;
  } else if (insulationType === 0) {
    effectiveDensity = Number(enrichedInputs.density ?? inputs.density ?? 80);
  }

  if (insulationType === 0 && effectiveDensity > 0) {
    totals.effectiveDensity = effectiveDensity;
    const densityCheck = checkMineralWoolDensity(effectiveDensity, mountSystem, application);
    brandWarnings.push(...densityCheck.warnings);
    if (densityCheck.practicalNotes.length > 0) {
      canonical.practicalNotes = [...(canonical.practicalNotes ?? []), ...densityCheck.practicalNotes];
    }
  }

  if (product?.note) {
    canonical.practicalNotes = [`${product.manufacturer} ${product.lineName}: ${product.note}`, ...(canonical.practicalNotes ?? [])];
  }

  if (area > 0 && thickness > 0 && !product) {
    const types = spec.normative_formula.insulation_types;
    const densityPresets = spec.normative_formula.density_presets ?? [];
    const densityCostMult = (() => {
      if (effectiveDensity <= 0 || densityPresets.length === 0) return 1;
      const closest = densityPresets.reduce<typeof densityPresets[number] | null>((best, p) => {
        if (!best) return p;
        return Math.abs(p.value - effectiveDensity) < Math.abs(best.value - effectiveDensity) ? p : best;
      }, null);
      return closest?.cost_multiplier ?? 1;
    })();
    const lines: string[] = [];
    lines.push(`Примерная стоимость для ${area} м² × ${thickness} мм (справочно, 2026):`);
    for (const t of types ?? []) {
      const base = Number(t.cost_estimate_per_m2_at_100mm_rub ?? 0);
      if (!(base > 0)) continue;
      const tId = Number(t.id ?? -1);
      const mult = tId === 0 ? densityCostMult : 1;
      const totalRub = Math.round((area * base * mult * (thickness / 100)) / 100) * 100;
      lines.push(`• ${t.label}: ~${totalRub.toLocaleString("ru-RU")} ₽`);
    }
    canonical.practicalNotes = [...(canonical.practicalNotes ?? []), lines.join("\n")];
  }

  const summaryCards = buildSummaryCards({
    materials,
    product,
    materialForm,
    area,
    thickness,
    effectiveDensity,
    inputs,
    enrichedInputs,
    totals,
    isTwoLayer: !!isTwoLayer,
  });

  return {
    materials,
    totals,
    warnings: [...brandWarnings, ...canonical.warnings],
    scenarios: canonical.scenarios,
    formulaVersion: canonical.formulaVersion,
    canonicalSpecId: canonical.canonicalSpecId,
    practicalNotes: canonical.practicalNotes ?? [],
    summaryCards,
    materialListBanner,
  };
}

function buildSummaryCards(ctx: {
  materials: CalculatorResult["materials"];
  product: ReturnType<typeof getInsulationProduct>;
  materialForm: number;
  area: number;
  thickness: number;
  effectiveDensity: number;
  inputs: Record<string, number>;
  enrichedInputs: Record<string, unknown>;
  totals: Record<string, number>;
  isTwoLayer: boolean;
}): SummaryCard[] {
  const { materials, product, materialForm, area, thickness, effectiveDensity, totals, isTwoLayer } =
    ctx;
  const mainMats = materials.filter((m) => isMainInsulationCategory(m.category));
  const formLabel =
    materialForm === INSULATION_FORM_ROLLS
      ? "рулонов"
      : materialForm === INSULATION_FORM_SPRAY
        ? "мешков"
        : "упаковок";

  let card1Value = "0";
  let card1Unit = formLabel;
  let card1Hint = product ? getProductDisplayName(product) : "основной материал";

  if (materialForm === INSULATION_FORM_ROLLS) {
    const rolls = totals.rollsNeeded ?? mainMats[0]?.purchaseQty ?? 0;
    card1Value = String(rolls);
    card1Unit = "рулонов";
    const rollArea = totals.rollArea;
    card1Hint = product
      ? `${getProductDisplayName(product)} · ${rollArea} м²/рулон`
      : `${rollArea} м² на рулон`;
  } else if (materialForm === INSULATION_FORM_SPRAY) {
    const bags = totals.ecowoolBags ?? 0;
    card1Value = String(bags);
    card1Unit = "мешков";
    card1Hint = product ? getProductDisplayName(product) : `≈ ${totals.ecowoolKg ?? 0} кг`;
  } else {
    const totalPacks = mainMats.reduce((s, m) => s + (m.packageInfo?.count ?? 0), 0);
    const totalPieces = mainMats.reduce((s, m) => s + (m.purchaseQty ?? 0), 0);
    if (totalPacks > 0) {
      card1Value = String(totalPacks);
      card1Unit = "упаковок";
      const perPack = mainMats[0]?.packageInfo?.size ?? 0;
      card1Hint = `${totalPieces} плит · по ${perPack} шт/уп`;
    } else {
      card1Value = String(totalPieces);
      card1Unit = "шт";
    }
  }

  let costStr = "—";
  let costHint = "справочно, 2026";
  if (area > 0 && thickness > 0) {
    let totalRub = 0;
    if (product) {
      const base = getProductCostPerM2(product);
      totalRub = Math.round((area * base * (thickness / 100)) / 100) * 100;
    } else {
      const insType = Number(ctx.enrichedInputs.insulationType ?? 0);
      const t = spec.normative_formula.insulation_types.find((x) => x.id === insType);
      const base = t?.cost_estimate_per_m2_at_100mm_rub ?? 0;
      if (base > 0) totalRub = Math.round((area * base * (thickness / 100)) / 100) * 100;
    }
    if (totalRub > 0) {
      costStr = `~${totalRub.toLocaleString("ru-RU")}`;
      const buyN = Number(card1Value);
      if (buyN > 0) costHint = `~${Math.round(totalRub / buyN).toLocaleString("ru-RU")} ₽ за ${card1Unit.replace(/ов$/, "")}`;
    }
  }

  const layerHint = isTwoLayer ? " · в 2 слоя" : "";
  const formHint =
    materialForm === INSULATION_FORM_ROLLS
      ? "рулон"
      : materialForm === INSULATION_FORM_SPRAY
        ? "напыление"
        : "плиты";
  const densityHint = effectiveDensity > 0 ? ` · ${effectiveDensity} кг/м³` : "";

  return [
    { icon: "📦", label: "К покупке", value: card1Value, unit: card1Unit, hint: card1Hint, tone: "violet" },
    { icon: "💰", label: "Примерная стоимость", value: costStr, unit: "₽", hint: costHint, tone: "emerald" },
    {
      icon: "📐",
      label: "На задачу",
      value: `${area} м² × ${thickness}`,
      unit: "мм",
      hint: `${formHint}${densityHint}${layerHint}`,
      tone: "slate",
    },
  ];
}
