import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  ElectricCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { getInputDefault } from "./spec-helpers";

interface ElectricInputs {
  apartmentArea?: number;
  roomsCount?: number;
  ceilingHeight?: number;
  wiringType?: number;
  hasKitchen?: number;
  cablePurchaseMode?: number;
  reserve?: number;
}

/* ─── constants ─── */

const CABLE_CHANNEL_PIECE_M = 2;
const RCD_MODULES = 2;
const PANEL_SPARE_MODULES = 2;
const GYPSUM_BAG_KG = 5;

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalElectric(
  spec: ElectricCanonicalSpec,
  inputs: ElectricInputs,
): CanonicalCalculatorResult {
  const apartmentArea = Math.max(20, Math.min(500, inputs.apartmentArea ?? getInputDefault(spec, "apartmentArea", 60)));
  const roomsCount = Math.max(1, Math.min(10, Math.round(inputs.roomsCount ?? getInputDefault(spec, "roomsCount", 3))));
  const ceilingHeight = Math.max(2.4, Math.min(4.0, inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7)));
  const wiringType = Math.max(0, Math.min(1, Math.round(inputs.wiringType ?? getInputDefault(spec, "wiringType", 0))));
  const hasKitchen = Math.max(0, Math.min(1, Math.round(inputs.hasKitchen ?? getInputDefault(spec, "hasKitchen", 1))));
  const cablePurchaseMode = Math.max(0, Math.min(1, Math.round(inputs.cablePurchaseMode ?? getInputDefault(spec, "cablePurchaseMode", 0))));
  const reserve = Math.max(5, Math.min(30, inputs.reserve ?? getInputDefault(spec, "reserve", 15)));
  const cable15Rate = spec.material_rules.cable_15_rate;
  const cable25Rate = spec.material_rules.cable_25_rate;
  const cable6KitchenFactor = spec.material_rules.cable_6_kitchen_factor;
  const cable6Reserve = spec.material_rules.cable_6_reserve;
  const cableSpoolM = spec.packaging_rules.cable_spool_m;

  /* ─── groups ─── */
  const lightingGroups = roomsCount + 1;
  const outletGroups = roomsCount + 2;
  const acGroups = Math.ceil(roomsCount / spec.material_rules.ac_groups_divisor);
  const breakersCount = lightingGroups + outletGroups + acGroups + (hasKitchen ? 1 : 0);
  const uzoCount = Math.ceil(outletGroups / 2) + (hasKitchen ? 1 : 0) + 1;
  const panelModules = breakersCount + uzoCount * RCD_MODULES + PANEL_SPARE_MODULES;

  /* ─── cable lengths ─── */
  // Множитель типа проводки: открытая требует на ~50% больше кабеля из-за обхода углов и крепления
  const wiringMultiplier = wiringType === 1
    ? (spec.material_rules.cable_open_wiring_multiplier ?? 1.0)
    : (spec.material_rules.cable_hidden_wiring_multiplier ?? 1.0);
  const cable15BaseLength = (apartmentArea * cable15Rate + lightingGroups * ceilingHeight) * wiringMultiplier;
  const cable25BaseLength = (apartmentArea * cable25Rate + outletGroups * ceilingHeight * 1.5) * wiringMultiplier;
  const cable15length = cable15BaseLength * (1 + reserve / 100);
  const cable25length = cable25BaseLength * (1 + reserve / 100);
  const cable6length = hasKitchen
    ? (Math.sqrt(apartmentArea) * cable6KitchenFactor + ceilingHeight) * cable6Reserve * wiringMultiplier
    : 0;
  const conduitLength = Math.ceil(
    (cable15length + cable25length + cable6length) * spec.material_rules.conduit_ratio,
  );

  /* ─── outlets & switches ─── */
  const outletsCount = Math.ceil(apartmentArea * spec.material_rules.outlets_per_m2)
    + roomsCount * spec.material_rules.outlets_per_room;
  const switchesCount = roomsCount + spec.material_rules.switches_base;

  /* ─── packaging ─── */
  const cable15spools = cablePurchaseMode === 1 ? Math.ceil(cable15length / cableSpoolM) : 0;
  const cable25spools = cablePurchaseMode === 1 ? Math.ceil(cable25length / cableSpoolM) : 0;
  const cable15Purchase = cablePurchaseMode === 1 ? cable15spools * cableSpoolM : Math.ceil(cable15length);
  const cable25Purchase = cablePurchaseMode === 1 ? cable25spools * cableSpoolM : Math.ceil(cable25length);
  const conduitPackageSize = wiringType === 1 ? CABLE_CHANNEL_PIECE_M : cableSpoolM;
  const conduitPacks = Math.ceil(conduitLength / conduitPackageSize);
  const socketBoxes = Math.ceil((outletsCount + switchesCount) * spec.material_rules.socket_box_reserve);
  const gypsumKg = Math.ceil((outletsCount + switchesCount) / 5);
  const gypsumBags = Math.ceil(gypsumKg / GYPSUM_BAG_KG);
  const reserveField = spec.input_schema.find((field) => field.key === "reserve");
  const scenarioReserve = {
    MIN: reserveField?.min ?? reserve,
    REC: reserve,
    MAX: reserveField?.max ?? reserve,
  } as const;

  function calculateCableScenario(reservePercent: number) {
    const cable15 = cable15BaseLength * (1 + reservePercent / 100);
    const cable25 = cable25BaseLength * (1 + reservePercent / 100);
    const exactNeed = roundDisplay(cable15 + cable25 + cable6length, 6);
    // Сечения нельзя объединять в условные бухты: каждую линию округляем
    // отдельно и только затем складываем метры для сводного сценария.
    const purchaseQuantity = (cablePurchaseMode === 1 ? Math.ceil(cable15 / cableSpoolM) * cableSpoolM : Math.ceil(cable15))
      + (cablePurchaseMode === 1 ? Math.ceil(cable25 / cableSpoolM) * cableSpoolM : Math.ceil(cable25))
      + (hasKitchen ? Math.ceil(cable6length) : 0);
    return { exactNeed, purchaseQuantity };
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Медный кабель ВВГнг(А)-LS 3×1,5 мм²",
      subtitle: "Для линий освещения; три жилы: фаза, рабочий ноль и защитное заземление",
      quantity: roundDisplay(cable15length, 1),
      unit: "м",
      withReserve: roundDisplay(cable15length, 1),
      purchaseQty: cable15Purchase,
      ...(cablePurchaseMode === 1
        ? { packageInfo: { count: cable15spools, size: cableSpoolM, packageUnit: "бухт" } }
        : {}),
      category: "Кабель",
    },
    {
      name: "Медный кабель ВВГнг(А)-LS 3×2,5 мм²",
      subtitle: "Для розеточных групп; три жилы: фаза, рабочий ноль и защитное заземление",
      quantity: roundDisplay(cable25length, 1),
      unit: "м",
      withReserve: roundDisplay(cable25length, 1),
      purchaseQty: cable25Purchase,
      ...(cablePurchaseMode === 1
        ? { packageInfo: { count: cable25spools, size: cableSpoolM, packageUnit: "бухт" } }
        : {}),
      category: "Кабель",
    },
  ];

  if (hasKitchen && cable6length > 0) {
    materials.push({
      name: "Медный кабель ВВГнг(А)-LS 3×6 мм²",
      subtitle: "Ориентир для отдельной линии однофазной электроплиты; сечение проверяют по мощности и длине линии",
      quantity: roundDisplay(cable6length, 1),
      unit: "м",
      withReserve: roundDisplay(cable6length, 1),
      purchaseQty: Math.ceil(cable6length),
      category: "Кабель",
    });
  }

  materials.push(
    {
      name: `Распределительный щит не менее чем на ${panelModules} модулей`,
      subtitle:
        `Учтено: ${breakersCount} однополюсных автоматов, ${uzoCount} двухмодульных устройств защиты и ${PANEL_SPARE_MODULES} свободных модуля`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Щиток",
    },
    {
      name: "Автоматический выключатель 1P, характеристика C, 10 А — освещение",
      subtitle: "Один автомат на расчётную группу освещения; окончательный номинал проверяют по кабелю и нагрузке",
      quantity: lightingGroups,
      unit: "шт",
      withReserve: lightingGroups,
      purchaseQty: lightingGroups,
      category: "Защита",
    },
    {
      name: "Автоматический выключатель 1P, характеристика C, 16 А — розетки",
      subtitle: "Один автомат на расчётную розеточную группу; номинал должен соответствовать сечению кабеля",
      quantity: outletGroups,
      unit: "шт",
      withReserve: outletGroups,
      purchaseQty: outletGroups,
      category: "Защита",
    },
    {
      name: "Автоматические выключатели для кондиционеров и отдельных потребителей",
      subtitle: "Номинал и характеристику выбирают по паспорту оборудования, мощности и длине линии",
      quantity: acGroups,
      unit: "шт",
      withReserve: acGroups,
      purchaseQty: acGroups,
      category: "Защита",
    },
  );

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenarioReserve[scenario];
    const cableScenario = calculateCableScenario(reservePercent);
    acc[scenario] = {
      exact_need: cableScenario.exactNeed,
      purchase_quantity: cableScenario.purchaseQuantity,
      leftover: roundDisplay(cableScenario.purchaseQuantity - cableScenario.exactNeed, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `wiringType:${wiringType}`,
        `reserve:${reservePercent}`,
        `purchase_mode:${cablePurchaseMode === 1 ? "spool_50m" : "per_meter"}`,
        "coefficients:project_assumptions_not_normative_limits",
        "scenario:separate-rounding-by-cable-section",
      ],
      key_factors: {
        input_reserve_multiplier: roundDisplay(1 + reservePercent / 100, 6),
        stove_line_reserve_multiplier: hasKitchen ? cable6Reserve : 1,
      },
      buy_plan: {
        package_label: cablePurchaseMode === 1
          ? "electric-cable-lines-mixed-packaging"
          : "electric-cable-lines-per-meter",
        package_size: 1,
        packages_count: cableScenario.purchaseQuantity,
        unit: "м",
      },
    };
    return acc;
  }, {} as ScenarioBundle);
  const recScenario = scenarios.REC;

  if (hasKitchen) {
    materials.push({
      name: "Автоматический выключатель 1P, характеристика C, 32 А — электроплита",
      subtitle: "Ориентир для однофазной линии 220 В; для трёхфазной плиты схема и аппарат защиты будут другими",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Защита",
    });
  }

  materials.push(
    {
      name: "Устройство защитного отключения (УЗО), 2P, тип A, 30 мА",
      subtitle:
        "Номинальный ток выбирают не ниже тока вышестоящего автомата; для отдельных влажных зон проектом может предусматриваться 10 мА",
      quantity: uzoCount,
      unit: "шт",
      withReserve: uzoCount,
      purchaseQty: uzoCount,
      category: "Защита",
    },
    {
      name: "Розетки с заземляющим контактом, 16 А",
      subtitle: "Исполнение и степень защиты выбирают по помещению; для влажных зон требуется защищённое исполнение",
      quantity: outletsCount,
      unit: "шт",
      withReserve: outletsCount,
      purchaseQty: outletsCount,
      category: "Установка",
    },
    {
      name: "Выключатели освещения, 10 А",
      subtitle: "Количество клавиш и схема проходного управления выбираются по плану освещения",
      quantity: switchesCount,
      unit: "шт",
      withReserve: switchesCount,
      purchaseQty: switchesCount,
      category: "Установка",
    },
    {
      name: "Подрозетники ∅68 мм, глубина 45–60 мм",
      subtitle: "Выберите исполнение под материал стены: бетон/кирпич или полые перегородки",
      quantity: socketBoxes,
      unit: "шт",
      withReserve: socketBoxes,
      purchaseQty: socketBoxes,
      category: "Установка",
    },
    {
      name:
        wiringType === 1
          ? "Кабель-канал ПВХ с крышкой"
          : "Гофрированная ПВХ-труба для кабеля с протяжкой, ∅16–20 мм",
      subtitle:
        wiringType === 1
          ? "Сечение канала выбирают по числу кабелей и допустимому заполнению; расчёт выполнен отрезками по 2 м"
          : "Для одиночных линий обычно используют 16 мм, для толстого кабеля и нескольких линий — 20 мм; расчёт выполнен бухтами по 50 м",
      quantity: conduitLength,
      unit: "м",
      withReserve: conduitLength,
      purchaseQty: conduitPacks * conduitPackageSize,
      packageInfo: {
        count: conduitPacks,
        size: conduitPackageSize,
        packageUnit: wiringType === 1 ? "отрезков" : "бухт",
      },
      category: "Монтаж",
    },
    {
      name: `Гипс монтажный (алебастр), мешок ${GYPSUM_BAG_KG} кг`,
      subtitle: "Для фиксации подрозетников и локальной заделки штроб; не использовать как основную штукатурную смесь",
      quantity: gypsumKg,
      unit: "кг",
      withReserve: gypsumKg,
      purchaseQty: gypsumBags * GYPSUM_BAG_KG,
      packageInfo: { count: gypsumBags, size: GYPSUM_BAG_KG, packageUnit: "мешков" },
      category: "Монтаж",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (spec.warnings_rules.phase_selection_requires_load_data) {
    warnings.push("Однофазный или трёхфазный ввод выбирают по выделенной мощности, расчётным нагрузкам и техническим условиям — площадь сама по себе этого не определяет");
  }
  if (hasKitchen) {
    warnings.push("Электроплита: кабель 3×6 мм² и автомат 32 А — ориентир для однофазной линии; проверьте мощность по паспорту плиты");
  }
  warnings.push("Тип, количество, номиналы и уставки УЗО/дифавтоматов выбирают по проекту, схеме групп, системе заземления и условиям помещений");
  warnings.push("Это предварительная ведомость. Сечения кабелей, номиналы защиты и схему щита должен проверить электропроектировщик");


  const practicalNotes: string[] = [];
  practicalNotes.push("Количество розеток, групп, автоматов и УЗО — предварительная планировочная оценка по площади и комнатам, а не нормативный проект");
  practicalNotes.push(`MIN/REC/MAX используют запас 5% / выбранное значение / 30% для линий 3×1,5 и 3×2,5 мм²; для ориентировочной линии плиты 3×6 мм² в спецификации задан отдельный коэффициент ${roundDisplay(cable6Reserve, 2)}`);
  practicalNotes.push(cablePurchaseMode === 1
    ? `Линии 3×1,5 и 3×2,5 мм² округлены отдельно до бухт по ${cableSpoolM} м; линия 3×6 мм² — до целого метра`
    : "Каждое сечение кабеля округлено к покупке отдельно до целого метра; если поставщик продаёт только бухтами, переключите режим покупки");
  practicalNotes.push("Коэффициенты метража, групп и точек — явно зафиксированные проектные допущения; точная ведомость требует плана трасс и нагрузок");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      apartmentArea: roundDisplay(apartmentArea, 3),
      roomsCount,
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      wiringType,
      hasKitchen,
      cablePurchaseMode,
      reserve,
      lightingGroups,
      outletGroups,
      acGroups,
      breakersCount,
      uzoCount,
      panelModules,
      cable15length: roundDisplay(cable15length, 1),
      cable25length: roundDisplay(cable25length, 1),
      cable6length: roundDisplay(cable6length, 1),
      conduitLength,
      outletsCount,
      switchesCount,
      cable15spools,
      cable25spools,
      conduitPacks,
      socketBoxes,
      gypsumKg,
      gypsumBags,
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
  };
}
