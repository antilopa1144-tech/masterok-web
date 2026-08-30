import { type AccuracyMode, ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE } from "./accuracy";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  DrywallCeilingCanonicalSpec,
} from "./canonical";
import type { FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface DrywallCeilingInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  perimeterM?: number;
  layers?: number;
  sheetWidthMm?: number;
  sheetLengthMm?: number;
  sheetReservePercent?: number;
  profileLengthM?: number;
  profileReservePercent?: number;
  fastenerReservePercent?: number;
  tnScrewPackCount?: number;
  lnScrewPackCount?: number;
  jointTapeRollM?: number;
  sealingTapeRollM?: number;
  separatingTapeRollM?: number;
  puttyBagKg?: number;
  primerCanL?: number;
  finishReservePercent?: number;
  accuracyMode?: AccuracyMode;
}

function percentMultiplier(percent: number): number {
  return 1 + percent / 100;
}

function pieceMaterial(
  name: string,
  category: string,
  exactNeed: number,
  reservePercent: number,
  subtitle: string,
): CanonicalMaterialResult {
  const withReserve = exactNeed * percentMultiplier(reservePercent);
  return {
    name,
    subtitle,
    quantity: roundDisplay(exactNeed, 6),
    unit: "шт",
    withReserve: roundDisplay(withReserve, 6),
    purchaseQty: Math.ceil(withReserve),
    category,
  };
}

function packagedMaterial(
  name: string,
  category: string,
  exactNeed: number,
  reservePercent: number,
  packageSize: number,
  unit: string,
  packageUnit: string,
  subtitle: string,
): CanonicalMaterialResult {
  const withReserve = exactNeed * percentMultiplier(reservePercent);
  const packageCount = Math.ceil(withReserve / packageSize);
  return {
    name,
    subtitle,
    quantity: roundDisplay(exactNeed, 6),
    unit,
    withReserve: roundDisplay(withReserve, 6),
    purchaseQty: roundDisplay(packageCount * packageSize, 6),
    category,
    packageInfo: { count: packageCount, size: packageSize, packageUnit },
  };
}

function profileMaterial(
  name: string,
  exactLengthM: number,
  reservePercent: number,
  stockLengthM: number,
  subtitle: string,
): CanonicalMaterialResult {
  const exactPieces = exactLengthM / stockLengthM;
  const withReservePieces = exactPieces * percentMultiplier(reservePercent);
  const purchasePieces = Math.ceil(withReservePieces);
  return {
    name,
    subtitle,
    quantity: roundDisplay(exactPieces, 6),
    unit: "шт",
    withReserve: roundDisplay(withReservePieces, 6),
    purchaseQty: purchasePieces,
    category: "Каркас П 113",
    packageInfo: { count: purchasePieces, size: 1, packageUnit: "профилей" },
  };
}

export function computeCanonicalDrywallCeiling(
  spec: DrywallCeilingCanonicalSpec,
  inputs: DrywallCeilingInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const inputMode = Math.max(
    0,
    Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))),
  );
  const length = Math.max(1, Math.min(20, inputs.length ?? getInputDefault(spec, "length", 5)));
  const width = Math.max(1, Math.min(20, inputs.width ?? getInputDefault(spec, "width", 4)));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const perimeterInput = Math.max(
    1,
    Math.min(500, inputs.perimeterM ?? getInputDefault(spec, "perimeterM", 18)),
  );
  const layers = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1)) === 2 ? 2 : 1;
  const area = inputMode === 0 ? roundDisplay(length * width, 3) : areaInput;
  const perimeter = inputMode === 0 ? 2 * (length + width) : perimeterInput;

  const sheetWidthM = Math.max(
    0.6,
    (inputs.sheetWidthMm ?? getInputDefault(spec, "sheetWidthMm", 1200)) / 1000,
  );
  const sheetLengthM = Math.max(
    1.2,
    (inputs.sheetLengthMm ?? getInputDefault(spec, "sheetLengthMm", 2500)) / 1000,
  );
  const sheetArea = sheetWidthM * sheetLengthM;
  const sheetReservePercent = Math.max(
    0,
    inputs.sheetReservePercent ?? getInputDefault(spec, "sheetReservePercent", 10),
  );
  const profileLengthM = Math.max(
    2,
    inputs.profileLengthM ?? getInputDefault(spec, "profileLengthM", 3),
  );
  const profileReservePercent = Math.max(
    0,
    inputs.profileReservePercent ?? getInputDefault(spec, "profileReservePercent", 5),
  );
  const fastenerReservePercent = Math.max(
    0,
    inputs.fastenerReservePercent ?? getInputDefault(spec, "fastenerReservePercent", 5),
  );
  const finishReservePercent = Math.max(
    0,
    inputs.finishReservePercent ?? getInputDefault(spec, "finishReservePercent", 10),
  );
  const tnScrewPackCount = Math.max(
    1,
    Math.round(inputs.tnScrewPackCount ?? getInputDefault(spec, "tnScrewPackCount", 1000)),
  );
  const lnScrewPackCount = Math.max(
    1,
    Math.round(inputs.lnScrewPackCount ?? getInputDefault(spec, "lnScrewPackCount", 100)),
  );
  const jointTapeRollM = Math.max(
    1,
    inputs.jointTapeRollM ?? getInputDefault(spec, "jointTapeRollM", 50),
  );
  const sealingTapeRollM = Math.max(
    1,
    inputs.sealingTapeRollM ?? getInputDefault(spec, "sealingTapeRollM", 30),
  );
  const separatingTapeRollM = Math.max(
    1,
    inputs.separatingTapeRollM ?? getInputDefault(spec, "separatingTapeRollM", 50),
  );
  const puttyBagKg = Math.max(
    1,
    inputs.puttyBagKg ?? getInputDefault(spec, "puttyBagKg", 25),
  );
  const primerCanL = Math.max(
    0.5,
    inputs.primerCanL ?? getInputDefault(spec, "primerCanL", 5),
  );

  const baseSheets = (area * layers) / sheetArea;
  const recSheets = baseSheets * percentMultiplier(sheetReservePercent);
  const packageOptions = [
    { size: 1, label: "gkl-sheet", unit: spec.packaging_rules.sheet_unit },
  ];
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenario === "MIN" ? 0 : sheetReservePercent;
    const exactNeed = roundDisplay(baseSheets * percentMultiplier(reservePercent), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: packaging.purchaseQuantity,
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `system:${spec.material_rules.system_code}.${layers}`,
        `input_mode:${inputMode}`,
        `layers:${layers}`,
        `sheet:${roundDisplay(sheetWidthM * 1000, 0)}x${roundDisplay(sheetLengthM * 1000, 0)}`,
        scenario === "MAX" ? "no_hidden_max_reserve" : "explicit_sheet_reserve",
      ],
      key_factors: {
        field_multiplier: roundDisplay(percentMultiplier(reservePercent), 6),
        reserve_percent: roundDisplay(reservePercent, 3),
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
  const rules = spec.material_rules;
  const profileBaseM = area * rules.pp_m_per_m2;
  const profileWithReserveM = profileBaseM * percentMultiplier(profileReservePercent);
  const ppPcs = Math.ceil(profileWithReserveM / profileLengthM);
  const pnBaseM = perimeter;
  const pnWithReserveM = pnBaseM * percentMultiplier(profileReservePercent);
  const pnPcs = Math.ceil(pnWithReserveM / profileLengthM);
  const connectorsBase = area * rules.connector_per_m2;
  const extensionsBase = area * rules.extension_per_m2;
  const suspensionsBase = area * rules.suspension_per_m2;
  const lnScrewsBase = area * rules.ln_screws_per_m2;
  const anchorsBase = area * rules.anchors_per_m2;
  const perimeterDowelsBase = perimeter * rules.perimeter_dowels_per_m;
  const tn25Rate = layers === 2 ? rules.tn25_per_m2_double : rules.tn25_per_m2_single;
  const tn35Rate = layers === 2 ? rules.tn35_per_m2_double : 0;
  const tn25Base = area * tn25Rate;
  const tn35Base = area * tn35Rate;
  const jointTapeBaseM = area * rules.joint_tape_m_per_m2;
  const puttyRate = layers === 2
    ? rules.putty_kg_per_m2_double
    : rules.putty_kg_per_m2_single;
  const puttyBaseKg = area * puttyRate;
  const primerBaseL = area * rules.primer_l_per_m2;

  const connectors = pieceMaterial(
    "Одноуровневый соединитель для ПП 60×27",
    "Каркас П 113",
    connectorsBase,
    fastenerReservePercent,
    `Официальный ориентир П 113: ${rules.connector_per_m2} шт./м²`,
  );
  const extensions = pieceMaterial(
    "Удлинитель профилей ПП 60×27",
    "Каркас П 113",
    extensionsBase,
    fastenerReservePercent,
    `Официальный ориентир П 113: ${rules.extension_per_m2} шт./м²`,
  );
  const suspensions = pieceMaterial(
    "Подвес для профиля ПП 60×27",
    "Каркас П 113",
    suspensionsBase,
    fastenerReservePercent,
    `Официальный ориентир П 113: ${rules.suspension_per_m2} шт./м²; тип и шаг проверяют по нагрузке`,
  );
  const anchors = pieceMaterial(
    "Анкерный элемент подвеса к базовому потолку",
    "Крепёж П 113",
    anchorsBase,
    fastenerReservePercent,
    `Официальный ориентир П 113: ${rules.anchors_per_m2} шт./м²; тип выбирают по основанию`,
  );
  const perimeterDowels = pieceMaterial(
    "Крепёж профиля ПН 28×27 к стенам",
    "Крепёж П 113",
    perimeterDowelsBase,
    fastenerReservePercent,
    `${rules.perimeter_dowels_per_m} крепления на 1 пог. м ПН; тип выбирают по основанию`,
  );

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Гипсовые плиты ${roundDisplay(sheetWidthM * 1000, 0)}×${roundDisplay(sheetLengthM * 1000, 0)} мм, ${layers} ${layers === 1 ? "слой" : "слоя"}`,
      subtitle: `Чистая потребность ${roundDisplay(baseSheets, 2)} листа; запас ${roundDisplay(sheetReservePercent, 1)}% применён один раз перед округлением`,
      quantity: roundDisplay(baseSheets, 6),
      unit: "шт",
      withReserve: roundDisplay(recSheets, 6),
      purchaseQty: recScenario.purchase_quantity,
      category: "Обшивка П 113",
      packageInfo: {
        count: recScenario.buy_plan.packages_count,
        size: 1,
        packageUnit: spec.packaging_rules.sheet_unit,
      },
    },
    profileMaterial(
      `Профиль ПП 60×27×${roundDisplay(profileLengthM * 1000, 0)} мм`,
      profileBaseM,
      profileReservePercent,
      profileLengthM,
      `Официальный ориентир П 113: ${rules.pp_m_per_m2} пог. м/м²; точную раскладку проверяют по рабочим чертежам`,
    ),
    profileMaterial(
      `Профиль ПН 28×27×${roundDisplay(profileLengthM * 1000, 0)} мм`,
      pnBaseM,
      profileReservePercent,
      profileLengthM,
      `По фактическому периметру ${roundDisplay(perimeter, 2)} м`,
    ),
    packagedMaterial(
      `Уплотнительная лента (${roundDisplay(sealingTapeRollM, 1)} м)`,
      "Примыкания П 113",
      perimeter,
      finishReservePercent,
      sealingTapeRollM,
      "м",
      spec.packaging_rules.roll_unit,
      "По фактическому периметру помещения",
    ),
    connectors,
    extensions,
    suspensions,
    packagedMaterial(
      `Шуруп LN для крепления ПП к подвесу (${lnScrewPackCount} шт.)`,
      "Крепёж П 113",
      lnScrewsBase,
      fastenerReservePercent,
      lnScrewPackCount,
      "шт",
      spec.packaging_rules.package_unit,
      `Официальный ориентир П 113: ${rules.ln_screws_per_m2} шт./м²`,
    ),
    anchors,
    perimeterDowels,
    packagedMaterial(
      `Шуруп TN 25 (${tnScrewPackCount} шт.)`,
      "Крепёж обшивки П 113",
      tn25Base,
      fastenerReservePercent,
      tnScrewPackCount,
      "шт",
      spec.packaging_rules.package_unit,
      `Норма П 113.${layers}: ${tn25Rate} шт./м²`,
    ),
    ...(layers === 2
      ? [
          packagedMaterial(
            `Шуруп TN 35 (${tnScrewPackCount} шт.)`,
            "Крепёж обшивки П 113",
            tn35Base,
            fastenerReservePercent,
            tnScrewPackCount,
            "шт",
            spec.packaging_rules.package_unit,
            `Норма П 113.2: ${rules.tn35_per_m2_double} шт./м² для второго слоя`,
          ),
        ]
      : []),
    packagedMaterial(
      `Бумажная армирующая лента (${roundDisplay(jointTapeRollM, 1)} м)`,
      "Заделка швов П 113",
      jointTapeBaseM,
      finishReservePercent,
      jointTapeRollM,
      "м",
      spec.packaging_rules.roll_unit,
      `Официальный ориентир П 113: ${rules.joint_tape_m_per_m2} м/м²`,
    ),
    packagedMaterial(
      `Разделительная лента (${roundDisplay(separatingTapeRollM, 1)} м)`,
      "Примыкания П 113",
      perimeter,
      finishReservePercent,
      separatingTapeRollM,
      "м",
      spec.packaging_rules.roll_unit,
      "По фактическому периметру помещения",
    ),
    packagedMaterial(
      `Гипсовая шпаклёвка для стыков (${roundDisplay(puttyBagKg, 1)} кг)`,
      "Заделка швов П 113",
      puttyBaseKg,
      finishReservePercent,
      puttyBagKg,
      "кг",
      spec.packaging_rules.bag_unit,
      `Норма П 113.${layers}: ${puttyRate} кг/м²; сплошное шпаклевание не включено`,
    ),
    packagedMaterial(
      `Грунтовка (${roundDisplay(primerCanL, 1)} л)`,
      "Заделка швов П 113",
      primerBaseL,
      finishReservePercent,
      primerCanL,
      "л",
      spec.packaging_rules.can_unit,
      `Официальный ориентир П 113: ${rules.primer_l_per_m2} л/м²`,
    ),
  ];

  const warnings = [
    `Расчёт относится только к комплектной системе КНАУФ П 113.${layers} на одноуровневом металлическом каркасе`,
    `Расходы производителя рассчитаны для потолка ${rules.reference_area_m2} м² без потерь на раскрой и требуют уточнения по рабочим чертежам и проекту`,
    "Светильники, люки, ниши, перепады уровня, криволинейные участки, усиления, изоляция и специальные швы не включены",
  ];
  if (inputMode === 1) {
    warnings.push("В режиме площади периметр не вычисляется из условного квадрата — используйте фактическую сумму примыканий");
  }
  if (layers === 2) {
    warnings.push(
      `Для П 113.2 рабочие чертежи требуют подвесы несущей способностью ${spec.warnings_rules.double_layer_suspension_capacity_kn} кН; шаг зависит от нагрузки`,
    );
  }

  const lnScrewPacks = Math.ceil(
    (lnScrewsBase * percentMultiplier(fastenerReservePercent)) / lnScrewPackCount,
  );
  const tn25Packs = Math.ceil(
    (tn25Base * percentMultiplier(fastenerReservePercent)) / tnScrewPackCount,
  );
  const tn35Packs = layers === 2
    ? Math.ceil((tn35Base * percentMultiplier(fastenerReservePercent)) / tnScrewPackCount)
    : 0;

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      perimeter: roundDisplay(perimeter, 3),
      perimeterM: roundDisplay(perimeter, 3),
      inputMode,
      length: inputMode === 0 ? roundDisplay(length, 3) : 0,
      width: inputMode === 0 ? roundDisplay(width, 3) : 0,
      layers,
      systemVariant: layers,
      sheetWidthMm: roundDisplay(sheetWidthM * 1000, 0),
      sheetLengthMm: roundDisplay(sheetLengthM * 1000, 0),
      sheetArea: roundDisplay(sheetArea, 6),
      sheetReservePercent: roundDisplay(sheetReservePercent, 3),
      baseSheets: roundDisplay(baseSheets, 6),
      sheets: recScenario.purchase_quantity,
      profileLengthM: roundDisplay(profileLengthM, 3),
      profileReservePercent: roundDisplay(profileReservePercent, 3),
      profileBaseM: roundDisplay(profileBaseM, 6),
      totalProfileM: roundDisplay(profileWithReserveM, 6),
      ppPcs,
      pnM: roundDisplay(pnWithReserveM, 6),
      pnPcs,
      suspCount: suspensions.purchaseQty ?? 0,
      crabCount: connectors.purchaseQty ?? 0,
      connectorCount: connectors.purchaseQty ?? 0,
      extensionCount: extensions.purchaseQty ?? 0,
      lnScrews: roundDisplay(lnScrewsBase, 6),
      lnScrewPacks,
      tn25Screws: roundDisplay(tn25Base, 6),
      tn25Packs,
      tn35Screws: roundDisplay(tn35Base, 6),
      tn35Packs,
      screwsGKL: roundDisplay(tn25Base + tn35Base, 6),
      screwsWithReserve: roundDisplay(
        (tn25Base + tn35Base) * percentMultiplier(fastenerReservePercent),
        6,
      ),
      screwPacks: tn25Packs + tn35Packs,
      screwPackCount: tnScrewPackCount,
      anchors: anchors.purchaseQty ?? 0,
      perimeterDowels: perimeterDowels.purchaseQty ?? 0,
      dowelCount: (anchors.purchaseQty ?? 0) + (perimeterDowels.purchaseQty ?? 0),
      jointTapeM: roundDisplay(jointTapeBaseM * percentMultiplier(finishReservePercent), 6),
      sealingTapeM: roundDisplay(perimeter * percentMultiplier(finishReservePercent), 6),
      separatingTapeM: roundDisplay(perimeter * percentMultiplier(finishReservePercent), 6),
      puttyKg: roundDisplay(puttyBaseKg * percentMultiplier(finishReservePercent), 6),
      primerL: roundDisplay(primerBaseL * percentMultiplier(finishReservePercent), 6),
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      `Профиль, подвесы, соединители и крепёж рассчитаны по официальной ведомости П 113.${layers}, а не по универсальной схеме потолка`,
      "В режиме площади периметр вводится отдельно: квадратная аппроксимация удалена",
      "MIN показывает листы без запаса; REC и MAX используют только введённый запас и совпадают между собой",
      "Разные типы саморезов, лент и крепежа показаны отдельными закупочными позициями",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: [
        "Режим точности не добавляет скрытых коэффициентов: итог определяется официальной ведомостью П 113, явными запасами и фасовками",
      ],
    },
  };
}
