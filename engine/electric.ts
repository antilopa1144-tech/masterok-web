import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  ElectricCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface ElectricInputs {
  apartmentArea?: number;
  roomsCount?: number;
  ceilingHeight?: number;
  wiringType?: number;
  hasKitchen?: number;
  reserve?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const CABLE_15_RATE = 1.1;             // m per m² for lighting 3×1.5
const CABLE_25_RATE = 1.6;             // m per m² for outlets 3×2.5
const CABLE_6_KITCHEN_FACTOR = 1.5;    // base multiplier for stove cable
const CABLE_6_RESERVE = 1.2;
const CONDUIT_RATIO = 0.8;            // ratio of conduit to total cable
const OUTLETS_PER_M2 = 0.6;
const OUTLETS_PER_ROOM = 2;           // additional
const SWITCHES_BASE = 2;              // additional beyond rooms
const CABLE_SPOOL_M = 50;
const CABLE_CHANNEL_PIECE_M = 2;
const SOCKET_BOX_RESERVE = 1.1;
const AC_GROUPS_DIVISOR = 2;
const RCD_MODULES = 2;
const PANEL_SPARE_MODULES = 2;
const GYPSUM_BAG_KG = 5;

/* ─── factor defaults ─── */

const ELECTRIC_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.95, rec: 1, max: 1.1 },
  installation_method: { min: 0.95, rec: 1, max: 1.05 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.97, rec: 1, max: 1.05 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalElectric(
  spec: ElectricCanonicalSpec,
  inputs: ElectricInputs,
  factorTable: FactorTable = ELECTRIC_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const apartmentArea = Math.max(20, Math.min(500, inputs.apartmentArea ?? getInputDefault(spec, "apartmentArea", 60)));
  const roomsCount = Math.max(1, Math.min(10, Math.round(inputs.roomsCount ?? getInputDefault(spec, "roomsCount", 3))));
  const ceilingHeight = Math.max(2.4, Math.min(4.0, inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7)));
  const wiringType = Math.max(0, Math.min(1, Math.round(inputs.wiringType ?? getInputDefault(spec, "wiringType", 0))));
  const hasKitchen = Math.max(0, Math.min(1, Math.round(inputs.hasKitchen ?? getInputDefault(spec, "hasKitchen", 1))));
  const reserve = Math.max(5, Math.min(30, inputs.reserve ?? getInputDefault(spec, "reserve", 15)));

  /* ─── groups ─── */
  const lightingGroups = roomsCount + 1;
  const outletGroups = roomsCount + 2;
  const acGroups = Math.ceil(roomsCount / AC_GROUPS_DIVISOR);
  const breakersCount = lightingGroups + outletGroups + acGroups + (hasKitchen ? 1 : 0);
  const uzoCount = Math.ceil(outletGroups / 2) + (hasKitchen ? 1 : 0) + 1;
  const panelModules = breakersCount + uzoCount * RCD_MODULES + PANEL_SPARE_MODULES;

  /* ─── cable lengths ─── */
  // Множитель типа проводки: открытая требует на ~50% больше кабеля из-за обхода углов и крепления
  const wiringMultiplier = wiringType === 1
    ? (spec.material_rules.cable_open_wiring_multiplier ?? 1.0)
    : (spec.material_rules.cable_hidden_wiring_multiplier ?? 1.0);
  const cable15length = (apartmentArea * CABLE_15_RATE + lightingGroups * ceilingHeight) * (1 + reserve / 100) * wiringMultiplier;
  const cable25length = (apartmentArea * CABLE_25_RATE + outletGroups * ceilingHeight * 1.5) * (1 + reserve / 100) * wiringMultiplier;
  const cable6length = hasKitchen ? (Math.sqrt(apartmentArea) * CABLE_6_KITCHEN_FACTOR + ceilingHeight) * CABLE_6_RESERVE * wiringMultiplier : 0;
  const conduitLength = Math.ceil((cable15length + cable25length + cable6length) * CONDUIT_RATIO);

  /* ─── outlets & switches ─── */
  const outletsCount = Math.ceil(apartmentArea * OUTLETS_PER_M2) + roomsCount * OUTLETS_PER_ROOM;
  const switchesCount = roomsCount + SWITCHES_BASE;

  /* ─── packaging ─── */
  const cable15spools = Math.ceil(cable15length / CABLE_SPOOL_M);
  const cable25spools = Math.ceil(cable25length / CABLE_SPOOL_M);
  const conduitPackageSize = wiringType === 1 ? CABLE_CHANNEL_PIECE_M : CABLE_SPOOL_M;
  const conduitPacks = Math.ceil(conduitLength / conduitPackageSize);
  const socketBoxes = Math.ceil((outletsCount + switchesCount) * SOCKET_BOX_RESERVE);
  const gypsumKg = Math.ceil((outletsCount + switchesCount) / 5);
  const gypsumBags = Math.ceil(gypsumKg / GYPSUM_BAG_KG);

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Медный кабель ВВГнг(А)-LS 3×1,5 мм²",
      subtitle: "Для линий освещения; три жилы: фаза, рабочий ноль и защитное заземление",
      quantity: roundDisplay(cable15length, 1),
      unit: "м",
      withReserve: roundDisplay(cable15length, 1),
      purchaseQty: cable15spools * CABLE_SPOOL_M,
      packageInfo: { count: cable15spools, size: CABLE_SPOOL_M, packageUnit: "бухт" },
      category: "Кабель",
    },
    {
      name: "Медный кабель ВВГнг(А)-LS 3×2,5 мм²",
      subtitle: "Для розеточных групп; три жилы: фаза, рабочий ноль и защитное заземление",
      quantity: roundDisplay(cable25length, 1),
      unit: "м",
      withReserve: roundDisplay(cable25length, 1),
      purchaseQty: cable25spools * CABLE_SPOOL_M,
      packageInfo: { count: cable25spools, size: CABLE_SPOOL_M, packageUnit: "бухт" },
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

  /* ─── scenarios ─── */
  const basePrimaryRaw = cable15spools + cable25spools;
  const basePrimary = Math.ceil(basePrimaryRaw * accuracyMult);
  const packageOptions = [{ size: 1, label: "electric-cable-spool", unit: "бухт" }];

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
        `wiringType:${wiringType}`,
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

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (apartmentArea > spec.warnings_rules.three_phase_area_threshold) {
    warnings.push("Площадь более 100 м² — рассмотрите трёхфазный ввод 380 В; решение принимает проектировщик по выделенной мощности");
  }
  if (hasKitchen) {
    warnings.push("Электроплита: кабель 3×6 мм² и автомат 32 А — ориентир для однофазной линии; проверьте мощность по паспорту плиты");
  }
  warnings.push("Все розетки в ванной и кухне — через устройство защитного отключения (УЗО) на 10–30 мА");
  warnings.push("Это предварительная ведомость. Сечения кабелей, номиналы защиты и схему щита должен проверить электропроектировщик");


  const practicalNotes: string[] = [];
  if (apartmentArea > 100) {
    practicalNotes.push(`Квартира ${roundDisplay(apartmentArea, 0)} м² — рассмотрите трёхфазный ввод 380 В, если выделенной однофазной мощности недостаточно`);
  }
  practicalNotes.push("Каждая розеточная группа — через своё устройство защитного отключения (УЗО) на 30 мА. Ванная — отдельное УЗО на 10 мА");

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
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "generic", accuracyMode).explanation,
  };
}
