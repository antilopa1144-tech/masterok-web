import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  InsulationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { evaluateCompanionMaterials } from "./companion-materials";

/** Длина тарельчатого дюбеля: толщина утеплителя + 50 мм анкеровки в основание (СП 293.1325800). */
export function insulationDowelLengthMm(insulationThicknessMm: number): number {
  return Math.round(insulationThicknessMm + 50);
}

interface InsulationInputs {
  area?: number;
  insulationType?: number;
  thickness?: number;
  plateSize?: number;
  reserve?: number;
  mountSystem?: number;
  application?: number;
  /** 0 = плиты, 1 = рулоны, 2 = напыляемая */
  productForm?: number;
  /** Переопределение площади плиты (м²), напр. 1185×585 = 0,693 для Пеноплэкс */
  plateAreaM2?: number;
  /** Площадь одного рулона (м²) */
  rollAreaM2?: number;
  rollsPerPack?: number;
  rollWidthMm?: number;
  rollLengthMm?: number;
  packHeightMmOverride?: number;
  ecowoolDensityKgM3?: number;
  ecowoolBagKg?: number;
  /** Отображаемое имя линейки из каталога */
  productLineName?: string;
  /**
   * Сколько плит в упаковке. 0 = авто-расчёт от толщины:
   *   piecesPerPack = floor(insulation_type.pack_height_mm / thickness).
   * Реальные данные производителей (Rockwool, Knauf, Технониколь, Изовер,
   * Пеноплекс) показывают, что число плит обратно пропорционально толщине,
   * а высота упаковки стабильна для каждого типа материала.
   */
  piecesPerPack?: number;
  /**
   * Климатическая зона для рекомендации толщины (СП 50.13330).
   * 0=Юг, 1=Центр (default), 2=Урал, 3=Сибирь, 4=Крайний Север.
   * Если толщина пользователя меньше min для зоны — выдаём warning.
   */
  climateZone?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getPlateSpec(spec: InsulationCanonicalSpec, plateSize: number) {
  return (
    spec.normative_formula.plate_sizes.find((p) => p.id === plateSize) ??
    spec.normative_formula.plate_sizes[0]
  );
}

function getInsulationTypeSpec(spec: InsulationCanonicalSpec, insulationType: number) {
  return (
    spec.normative_formula.insulation_types.find((t) => t.id === insulationType) ??
    spec.normative_formula.insulation_types[0]
  );
}

function resolveInsulationType(spec: InsulationCanonicalSpec, inputs: InsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
}

function resolvePlateSize(spec: InsulationCanonicalSpec, inputs: InsulationInputs): number {
  const maxId = Math.max(0, spec.normative_formula.plate_sizes.length - 1);
  return Math.max(0, Math.min(maxId, Math.round(inputs.plateSize ?? getInputDefault(spec, "plateSize", 0))));
}

/* ─── main ─── */

export function computeCanonicalInsulation(
  spec: InsulationCanonicalSpec,
  inputs: InsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const {
    dowel_reserve: DOWEL_RESERVE,
    ecowool_density: ECOWOOL_DENSITY,
    ecowool_waste: ECOWOOL_WASTE,
    ecowool_bag_kg: ECOWOOL_BAG_KG,
  } = spec.material_rules;

  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 40)));
  const insulationType = resolveInsulationType(spec, inputs);
  const thickness = Math.max(50, Math.min(300, inputs.thickness ?? getInputDefault(spec, "thickness", 100)));
  const plateSize = resolvePlateSize(spec, inputs);
  const reserve = Math.max(0, Math.min(15, inputs.reserve ?? getInputDefault(spec, "reserve", 5)));
  const mountSystem = Math.max(0, Math.min(1, Math.round(inputs.mountSystem ?? getInputDefault(spec, "mountSystem", 0))));
  const application = Math.max(0, Math.min(4, Math.round(inputs.application ?? getInputDefault(spec, "application", 0))));
  const rawPiecesPerPack = Math.max(0, Math.min(24, Math.round(inputs.piecesPerPack ?? getInputDefault(spec, "piecesPerPack", 0))));
  const climateZone = Math.max(0, Math.min(4, Math.round(inputs.climateZone ?? getInputDefault(spec, "climateZone", 1))));

  const plateSpec = getPlateSpec(spec, plateSize);
  const insulationTypeSpec = getInsulationTypeSpec(spec, insulationType);
  const areaWithReserve = area * (1 + reserve / 100);
  const plateArea =
    inputs.plateAreaM2 != null && inputs.plateAreaM2 > 0
      ? inputs.plateAreaM2
      : plateSpec.area_m2;

  /* ── Число плит в упаковке ──
   *
   * Авто-режим (piecesPerPack=0): floor(pack_height_mm / thickness).
   * Это соответствует физике упаковки производителей (Rockwool, Knauf,
   * Технониколь, Изовер, Пеноплекс): высота пачки стабильна, число плит
   * обратно пропорционально толщине.
   *
   * Минвата:   pack_height = 600 мм → 50мм=12шт, 100мм=6шт, 150мм=4шт
   * ЭППС:      pack_height = 400 мм → 50мм=8шт, 100мм=4шт, 150мм=2-3шт
   * ППС:       pack_height = 500 мм → 50мм=10шт, 100мм=5шт, 150мм=3шт
   *
   * Пользователь может переопределить вручную (выбрать из пресетов в UI),
   * если знает упаковку конкретного производителя.
   */
  const productForm = Math.max(
    0,
    Math.min(2, Math.round(inputs.productForm ?? (insulationType === 3 ? 2 : 0))),
  );
  const isRollForm = productForm === 1;
  const isSprayForm = productForm === 2 || insulationType === 3;

  const piecesPerPack = (() => {
    if (isSprayForm) return 1;
    if (isRollForm) return Math.max(1, Math.round(inputs.rollsPerPack ?? 1));
    if (rawPiecesPerPack > 0) return rawPiecesPerPack;
    const packHeight = inputs.packHeightMmOverride ?? insulationTypeSpec.pack_height_mm;
    if (packHeight <= 0 || thickness <= 0) return 1;
    return Math.max(1, Math.floor(packHeight / thickness));
  })();

  /* ── основной материал и крепёж (зависят от insulationType и системы монтажа) ──
   *
   * Изменение vs предыдущей версии (formula_version v1, было до 2026-05):
   *   Раньше платы и мешки эковаты округлялись Math.ceil() ДО умножения на
   *   accuracyMode и сценарные коэффициенты. Это давало двойное округление и
   *   завышало результат (CLAUDE.md: «округляй только на последнем этапе»).
   *
   *   Теперь физическая потребность держится дробной до самого финального ceil
   *   внутри optimizePackaging. Цифры могут уменьшиться на 1–2 шт. в граничных
   *   случаях — это корректное поведение, см. золотые тесты в insulation.test.ts.
   */
  let platesPhysical = 0;
  let rollsPhysical = 0;
  let dowelsNeeded = 0;
  const rollArea =
    inputs.rollAreaM2 != null && inputs.rollAreaM2 > 0 ? inputs.rollAreaM2 : 0;

  if (isRollForm && rollArea > 0) {
    rollsPhysical = areaWithReserve / rollArea;
    // Рулонная минвата — в каркас/кровлю; тарельчатые дюбели СФТК не применяются.
  } else if (!isSprayForm && insulationType <= 2) {
    platesPhysical = areaWithReserve / plateArea;
    if (mountSystem === 0) {
      dowelsNeeded = Math.ceil(area * insulationTypeSpec.dowels_per_sqm * DOWEL_RESERVE);
    }
  }

  /* ── эковата ── */
  let ecowoolVolume = 0;
  let ecowoolKgPhysical = 0;
  let ecowoolBagsPhysical = 0;
  const ecowoolDensity = inputs.ecowoolDensityKgM3 ?? ECOWOOL_DENSITY;
  const ecowoolBagKg = inputs.ecowoolBagKg ?? ECOWOOL_BAG_KG;

  if (isSprayForm) {
    ecowoolVolume = area * (thickness / 1000);
    ecowoolKgPhysical = ecowoolVolume * ecowoolDensity * ECOWOOL_WASTE;
    ecowoolBagsPhysical = ecowoolKgPhysical / ecowoolBagKg;
  }

  /* ── scenarios ──
   *
   * Размер упаковки для плит = piecesPerPack (например 6 для 100мм минваты).
   * optimizePackaging сразу даст:
   *   - purchase_quantity = округлённое до упаковки число штук
   *   - packageCount = число упаковок
   * Эковата (insulationType=3) — единица «мешок», size=1.
   */
  const basePrimaryRaw = isSprayForm
    ? ecowoolBagsPhysical
    : isRollForm
      ? rollsPhysical
      : platesPhysical;
  const accuracyMult = getPrimaryMultiplier("insulation", accuracyMode);
  const basePrimary = basePrimaryRaw * accuracyMult;
  const packageSize = isSprayForm ? 1 : piecesPerPack;
  const packageUnit = isSprayForm ? "мешков" : isRollForm ? "рулонов" : "шт";
  const packageLabel = isSprayForm
    ? `ecowool-bag-${ecowoolBagKg}kg`
    : isRollForm
      ? `insulation-roll-${piecesPerPack}`
      : `insulation-pack-${piecesPerPack}`;

  const packageOptions = [{
    size: packageSize,
    label: packageLabel,
    unit: packageUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(basePrimary * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `insulationType:${insulationType}`,
        `plateSize:${plateSize}`,
        `reserve:${reserve}`,
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

  // Финальные целочисленные значения для отображения и для totals.
  // Берём из REC purchase_quantity — единственное место, где остаётся ceil.
  const platesNeeded = !isSprayForm && !isRollForm && insulationType <= 2
    ? Math.ceil(recScenario.purchase_quantity)
    : 0;
  const rollsNeeded = isRollForm ? Math.ceil(recScenario.purchase_quantity) : 0;
  const ecowoolBags = isSprayForm ? Math.ceil(recScenario.purchase_quantity) : 0;
  const ecowoolKg = ecowoolBags * ecowoolBagKg;

  /* ── основной материал (плита/эковата) + крепёж: в коде, т.к. они связаны
     со сценариями MIN/REC/MAX. Всё остальное (мембраны, клей, грунт,
     стеклосетка, штукатурка, брус каркаса, саморезы) — декларативно через
     spec.companion_materials. ── */
  const materials: CanonicalMaterialResult[] = [];

  const productTitle = inputs.productLineName?.trim();

  if (isRollForm && rollArea > 0) {
    const rollW = inputs.rollWidthMm ?? 0;
    const rollL = inputs.rollLengthMm ?? 0;
    const sizeLabel =
      rollW > 0 && rollL > 0 ? ` ${rollW}×${rollL} мм` : ` ${rollArea} м²/рулон`;
    const baseName = productTitle
      ? `${productTitle} × ${thickness} мм`
      : `${insulationTypeSpec.label} (рулон)${sizeLabel} × ${thickness} мм`;
    materials.push({
      name: baseName,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "рулонов",
      withReserve: rollsNeeded,
      purchaseQty: rollsNeeded,
      packageInfo:
        piecesPerPack > 1
          ? {
              count: recScenario.buy_plan.packages_count,
              size: piecesPerPack,
              packageUnit: "упаковок",
            }
          : undefined,
      category: "Утеплитель (рулоны)",
    });
  } else if (!isSprayForm && insulationType <= 2) {
    const packsNeeded = recScenario.buy_plan.packages_count;
    const plateLabel =
      inputs.plateAreaM2 != null && inputs.plateAreaM2 > 0
        ? `${roundDisplay(inputs.plateAreaM2, 3)} м²/плита`
        : plateSpec.label;
    const baseName = productTitle
      ? `${productTitle} × ${thickness} мм`
      : `${insulationTypeSpec.label} ${plateLabel} × ${thickness} мм`;
    materials.push({
      name: baseName,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: platesNeeded,
      purchaseQty: platesNeeded,
      packageInfo:
        piecesPerPack > 1 && !isRollForm
          ? { count: packsNeeded, size: piecesPerPack, packageUnit: "упаковок" }
          : undefined,
      category:
        insulationType === 1
          ? "Утеплитель (пеноплекс)"
          : insulationType === 2
            ? "Утеплитель (пенопласт)"
            : "Утеплитель (плиты)",
    });

    if (dowelsNeeded > 0) {
      const dowelLen = insulationDowelLengthMm(thickness);
      materials.push({
        name: `Дюбели тарельчатые 10×${dowelLen} мм`,
        quantity: dowelsNeeded,
        unit: "шт",
        withReserve: dowelsNeeded,
        purchaseQty: dowelsNeeded,
        category: "Крепёж (СФТК)",
      });
    }
  }

  if (isSprayForm) {
    const baseName = productTitle
      ? `${productTitle} × ${thickness} мм`
      : `Эковата (${ecowoolBagKg} кг)`;
    materials.push({
      name: baseName,
      quantity: roundDisplay(ecowoolKgPhysical, 3),
      unit: "кг",
      withReserve: ecowoolKg,
      purchaseQty: ecowoolKg,
      packageInfo: { count: ecowoolBags, size: ecowoolBagKg, packageUnit: "мешков" },
      category: "Напыляемая изоляция",
    });
  }

  // Сопутствующие материалы — декларативно из конфига.
  if (spec.companion_materials && spec.companion_materials.length > 0) {
    const companionTotals = {
      area,
      areaWithReserve,
      thickness,
      ecowoolVolume,
    };
    const companionInputs = {
      insulationType,
      plateSize,
      reserve,
      mountSystem,
      application,
      thickness,
    };
    const companions = evaluateCompanionMaterials(spec.companion_materials, {
      inputs: companionInputs,
      totals: companionTotals,
    });
    materials.push(...companions);
  }

  /* ── warnings ── */
  const warnings: string[] = [];
  if (thickness < spec.warnings_rules.thin_thickness_threshold_mm) {
    warnings.push("Толщина менее 50 мм — недостаточно для наружных стен");
  }
  if (insulationType === 3 && thickness > spec.warnings_rules.ecowool_settle_threshold_mm) {
    warnings.push("Эковата при толщине более 150 мм оседает — рекомендуется укладка в 2 слоя");
  }
  if (area > spec.warnings_rules.professional_area_threshold_m2) {
    warnings.push("При площади более 100 м² рекомендуется профессиональный монтаж");
  }

  /* ── Климатическая рекомендация (СП 50.13330) ──
   * Сравниваем выбранную толщину с минимумом и рекомендацией для региона.
   * Если толщина меньше нормы — warning, если в рекомендуемом диапазоне — note. */
  const zones = spec.normative_formula.climate_zones;
  const zone = zones?.find((z) => z.id === climateZone);

  const practicalNotes: string[] = [];
  if (zone && thickness < zone.min_thickness_walls_mm) {
    warnings.push(
      `Для региона «${zone.label}» толщина ${thickness} мм меньше нормы СП 50.13330 ` +
      `(минимум ${zone.min_thickness_walls_mm} мм). Стены не достигнут нормы тепловой защиты.`,
    );
  } else if (zone && thickness < zone.rec_thickness_walls_mm) {
    practicalNotes.push(
      `Регион «${zone.label}»: толщина ${thickness} мм соответствует минимуму СП 50.13330, ` +
      `но для комфорта рекомендуется ${zone.rec_thickness_walls_mm} мм.`,
    );
  } else if (zone && thickness >= zone.rec_thickness_walls_mm) {
    practicalNotes.push(
      `Регион «${zone.label}»: толщина ${thickness} мм соответствует рекомендации СП 50.13330 ` +
      `(норма ≥ ${zone.min_thickness_walls_mm} мм, оптимум ${zone.rec_thickness_walls_mm} мм).`,
    );
  }

  if (thickness < 100 && climateZone >= 1) {
    practicalNotes.push(`Утеплитель ${thickness} мм — для средней полосы России минимум 100–150 мм.`);
  }
  if (isRollForm && rollArea > 0) {
    practicalNotes.push(
      `Рулон покрывает ${rollArea} м². Укладывайте внахлёст полос 5–10 см на стыках — запас ${reserve}% уже учтён.`,
    );
  } else if (!isSprayForm) {
    practicalNotes.push(
      "Стыки плит утеплителя не должны совпадать с стыками предыдущего слоя — укладывайте вразбежку.",
    );
  }
  if (isRollForm && mountSystem === 0) {
    warnings.push(
      "Рулонная минвата не монтируется в систему мокрого штукатурного фасада. Выберите плиты (Фасад Баттс, Технофас) или каркасную систему.",
    );
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      insulationType,
      thickness: roundDisplay(thickness, 3),
      plateSize,
      reserve,
      mountSystem,
      application,
      climateZone,
      areaWithReserve: roundDisplay(areaWithReserve, 3),
      plateArea,
      productForm,
      rollArea: isRollForm ? roundDisplay(rollArea, 4) : 0,
      rollsNeeded,
      platesNeeded: !isSprayForm && !isRollForm ? platesNeeded : 0,
      piecesPerPack: !isSprayForm ? piecesPerPack : 0,
      packsNeeded: !isSprayForm ? recScenario.buy_plan.packages_count : 0,
      dowelsNeeded,
      ecowoolVolume: insulationType === 3 ? roundDisplay(ecowoolVolume, 6) : 0,
      ecowoolKg: insulationType === 3 ? ecowoolKg : 0,
      ecowoolBags: insulationType === 3 ? ecowoolBags : 0,
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
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "insulation", accuracyMode).explanation,
  };
}
