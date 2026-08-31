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
  getProductDisplayName,
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
  INSULATION_PRODUCT_MANUAL,
  productMatchesApplication,
  type InsulationCatalogProduct,
} from "../insulation-catalog";
import {
  applicationAllowsLayerScheme,
  INSULATION_APPLICATION,
} from "../insulation-application";
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

const THERMAL_BOUNDARY_NOTE =
  "Региональная шкала — только встроенный ориентир. Калькулятор не определяет требуемое сопротивление теплопередаче, влажностный режим и проектную толщину по СП 50.13330.2024: для этого нужны город, назначение здания и полный состав ограждения.";

function isLegacyThermalClaim(message: string): boolean {
  return (
    message.includes("нормы СП 50.13330") ||
    message.includes("минимуму СП 50.13330") ||
    message.includes("рекомендации СП 50.13330") ||
    message.includes("для средней полосы России минимум")
  );
}

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
  const application = Math.round(inputs.application ?? INSULATION_APPLICATION.FACADE);
  const productId = Math.round(inputs.productId ?? INSULATION_PRODUCT_MANUAL);
  const userMaterialForm = Math.round(inputs.materialForm ?? INSULATION_FORM_SLABS);
  let product = getInsulationProduct(productId);
  if (product && !productMatchesApplication(product, application)) {
    brandWarnings.push(
      `Линейка «${product.manufacturer} ${product.lineName}» не входит в справочный список для выбранного назначения. ` +
        "Верните подходящую позицию из списка или ручной ввод и проверьте область применения по документации производителя.",
    );
    product = null;
  }
  if (product && product.form !== formKeyFromMaterialForm(userMaterialForm)) {
    brandWarnings.push(
      `Линейка «${product.manufacturer} ${product.lineName}» не подходит к форме «${userMaterialForm === INSULATION_FORM_ROLLS ? "рулоны" : userMaterialForm === INSULATION_FORM_SPRAY ? "напыление" : "плиты"}». Выберите линейку из списка для этой формы.`,
    );
    product = null;
  }
  const hasCatalogProduct = product != null;

  const inputsForEnrichment: Record<string, unknown> = product
    ? { ...inputs, insulationType: product.insulationTypeId }
    : inputs;
  const { enriched: enrichedFromApp, warnings: applicationWarnings } = enrichInsulationInputs(
    inputsForEnrichment,
    hasCatalogProduct,
    product?.densityKgM3,
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
    brandWarnings.push(
      `Размер, толщина, плотность и фасовка «${product.manufacturer} ${product.lineName}» взяты из справочного каталога. ` +
        "Перед заказом сверьте их с этикеткой конкретной партии; при расхождении используйте ручной ввод.",
    );
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
    applicationAllowsLayerScheme(application) &&
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
        name: `Дюбели тарельчатые, расчётная длина ${dowelLengthMm(totalThickness)} мм`,
        subtitle:
          `Предварительная длина: слой ${totalThickness} мм + 50 мм. Фактические тип, распорную зону, длину и схему крепления определяют по основанию, проекту и документации СФТК`,
      });
    }
    merged.push(...otherCompanions);
    canonical = {
      ...canonical,
      materials: merged,
      practicalNotes: [
        ...(canonical.practicalNotes ?? []),
        `Выбранная двухслойная раскладка: ${t1}+${t2} мм. Смещение стыков, крепёж и допустимость сочетания толщин проверьте по проекту и документации выбранной системы.`,
      ],
    };
  }

  const thickness = Number(inputs.thickness ?? 100);
  const climateZone = Math.round(inputs.climateZone ?? 1);
  const applicationResolved = Math.round(
    Number(enrichedInputs.application ?? inputs.application ?? application),
  );
  const recThickness = getRecommendedThicknessMm(climateZone, applicationResolved);
  const thicknessContext =
    applicationResolved === INSULATION_APPLICATION.FLOOR
      ? "пола/перекрытия"
      : applicationResolved === INSULATION_APPLICATION.FOUNDATION
        ? "цоколя"
        : "стен";
  if (thickness < recThickness - 1) {
    brandWarnings.push(
      `Толщина ${thickness} мм ниже встроенного ориентира для ${thicknessContext} и выбранной зоны (${recThickness} мм). ` +
        "Это справочный флаг, а не проверка нормы или проектной достаточности.",
    );
  }

  const insulationType = Number(enrichedInputs.insulationType ?? inputs.insulationType ?? 0);
  const mountSystem = Number(enrichedInputs.mountSystem ?? inputs.mountSystem ?? 0);
  const area = Number(inputs.area ?? 0);

  const materialsCtx = {
    materialForm,
    mountSystem,
    application: applicationResolved,
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
    application: applicationResolved,
  };
  let effectiveDensity = 0;
  if (product?.densityKgM3) {
    effectiveDensity = product.densityKgM3;
  } else if (insulationType === 0) {
    effectiveDensity = Number(enrichedInputs.density ?? inputs.density ?? 80);
  }

  if (insulationType === 0 && effectiveDensity > 0) {
    totals.effectiveDensity = effectiveDensity;
    const densityCheck = checkMineralWoolDensity(
      effectiveDensity,
      mountSystem,
      applicationResolved,
    );
    brandWarnings.push(...densityCheck.warnings);
    if (densityCheck.practicalNotes.length > 0) {
      canonical.practicalNotes = [...(canonical.practicalNotes ?? []), ...densityCheck.practicalNotes];
    }
  }

  if (product?.note) {
    canonical.practicalNotes = [`${product.manufacturer} ${product.lineName}: ${product.note}`, ...(canonical.practicalNotes ?? [])];
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

  const practicalNotes = [
    THERMAL_BOUNDARY_NOTE,
    ...(canonical.practicalNotes ?? []).filter((note) => !isLegacyThermalClaim(note)),
  ];

  return {
    materials,
    totals,
    warnings: [
      ...brandWarnings,
      ...canonical.warnings.filter((warning) => !isLegacyThermalClaim(warning)),
    ],
    scenarios: canonical.scenarios,
    formulaVersion: canonical.formulaVersion,
    canonicalSpecId: canonical.canonicalSpecId,
    practicalNotes,
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

  const exactNeed = mainMats.reduce((sum, material) => sum + material.quantity, 0);
  const exactUnit = mainMats[0]?.unit ?? "";
  const exactHint =
    materialForm === INSULATION_FORM_SPRAY
      ? "до округления массы к полным мешкам"
      : materialForm === INSULATION_FORM_ROLLS
        ? "до округления к целым рулонам"
        : "до округления к полным упаковкам";

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
    {
      icon: "📋",
      label: "Расчётная потребность",
      value: Number.isInteger(exactNeed) ? String(exactNeed) : exactNeed.toLocaleString("ru-RU", { maximumFractionDigits: 2 }),
      unit: exactUnit,
      hint: exactHint,
      tone: "emerald",
    },
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
