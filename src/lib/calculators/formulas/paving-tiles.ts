import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import pavingTilesSpec from "../../../../configs/calculators/paving-tiles-canonical.v1.json";

const WEB_FORMULA_VERSION = "paving-tiles-web-purchase-v1";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const round = (value: number, digits = 6): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundUpToStep = (value: number, step: number): number =>
  value > 0 ? round(Math.ceil((value - Number.EPSILON) / step) * step, 6) : 0;

const formatRuNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

export const pavingTilesDef: CalculatorDefinition = {
  id: "facade_paving_tiles",
  slug: "trotuarnaya-plitka",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор тротуарной плитки",
  h1: "Калькулятор тротуарной плитки — закупка покрытия и заданных слоёв",
  description: "Рассчитайте площадь плитки к покупке, бордюр и дополнительные материалы только по фактической фасовке, явному запасу и заданным проектным параметрам.",
  metaTitle: withSiteMetaTitle("Калькулятор тротуарной плитки: закупка материалов"),
  metaDescription: "Бесплатный калькулятор тротуарной плитки: рассчитайте покрытие, бордюр и заданные слои по площади, фактической фасовке и явному запасу.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["тротуарная плитка", "плитка для двора", "брусчатка", "укладка тротуарной плитки", "расчёт тротуарной плитки"],
  popularity: 58,
  complexity: 3,
  fields: [
    {
      key: "area",
      label: "Площадь покрытия",
      type: "slider",
      unit: "м²",
      min: 5,
      max: 2000,
      step: 1,
      defaultValue: 50,
      hint: "Площадь в плане без автоматического запаса. Для сложной формы сначала разбейте участок на измеримые части или используйте визуальную раскладку.",
    },
    {
      key: "tileReservePercent",
      label: "Ваш запас плитки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0% — чистая площадь" },
        { value: 5, label: "5%" },
        { value: 7, label: "7%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
      ],
      hint: "Выберите запас после раскладки рисунка, проверки подрезки, пригодности остатков и возможности докупить ту же партию. Скрытый процент не добавляется.",
    },
    {
      key: "tileSaleStepM2",
      label: "Шаг продажи или площадь неделимой упаковки",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100,
      step: 0.01,
      defaultValue: 0.1,
      hint: "Введите фактический минимальный шаг отгрузки: например 0,1 м² при продаже по площади или полную площадь палеты, если она неделима.",
      fullWidth: true,
    },
    {
      key: "borderEnabled",
      label: "Считать бордюр",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Да, по введённой длине" },
        { value: 0, label: "Нет, ограничение края считается отдельно" },
      ],
      hint: "Калькулятор считает только количество изделий по длине. Тип, сечение, основание, углы и узлы примыкания выбирают по проекту.",
      fullWidth: true,
    },
    {
      key: "perimeter",
      label: "Длина участков с бордюром",
      type: "number",
      unit: "м",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 30,
      hideIf: { key: "borderEnabled", op: "eq", value: 0 },
      hint: "Суммируйте только те стороны, где действительно будет выбранный бордюр; не используйте автоматически весь периметр площадки.",
    },
    {
      key: "borderPieceLengthM",
      label: "Фактическая длина одного бордюра",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "borderEnabled", op: "eq", value: 0 },
      hint: "Возьмите длину конкретного изделия из карточки или паспорта. Размер и марка бордюра автоматически не назначаются.",
    },
    {
      key: "borderReservePercent",
      label: "Запас бордюра",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
      ],
      hideIf: { key: "borderEnabled", op: "eq", value: 0 },
      hint: "Отдельный явный запас на резку и повреждения. Плиточный запас к бордюру не применяется.",
      fullWidth: true,
    },
    {
      key: "layersEnabled",
      label: "Добавить объёмы песчаного и щебёночного слоёв",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — конструкция основания ещё не задана" },
        { value: 1, label: "Да — введу проектные толщины и коэффициенты" },
      ],
      hint: "Калькулятор не выбирает основание по типу нагрузки. Включайте блок только при наличии принятых проектных толщин.",
      fullWidth: true,
    },
    {
      key: "sandLayerThicknessMm",
      label: "Проектная толщина песчаного слоя",
      type: "number",
      unit: "мм",
      min: 0,
      max: 1000,
      step: 1,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Введите толщину из проекта. Ноль означает, что песчаный слой не включается в ведомость.",
    },
    {
      key: "sandPurchaseFactor",
      label: "Коэффициент закупочного объёма песка",
      type: "number",
      min: 1,
      max: 2,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "1,00 — только геометрический объём. Коэффициент больше 1 вводите по проекту, поставщику и принятому способу уплотнения; универсальное значение не подставляется.",
    },
    {
      key: "gravelLayerThicknessMm",
      label: "Проектная толщина щебёночного слоя",
      type: "number",
      unit: "мм",
      min: 0,
      max: 1000,
      step: 1,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Введите толщину из проекта. Ноль означает, что щебёночный слой не включается в ведомость.",
    },
    {
      key: "gravelPurchaseFactor",
      label: "Коэффициент закупочного объёма щебня",
      type: "number",
      min: 1,
      max: 2,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Задаётся явно по проекту и условиям поставки. Калькулятор не выдаёт коэффициент за универсальную норму уплотнения.",
    },
    {
      key: "bulkSaleStepM3",
      label: "Шаг заказа сыпучих материалов",
      type: "number",
      unit: "м³",
      min: 0.01,
      max: 20,
      step: 0.01,
      defaultValue: 0.1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Минимальный шаг отгрузки вашего поставщика. Каждый рассчитанный объём округляется вверх до этого шага.",
      fullWidth: true,
    },
    {
      key: "jointSandEnabled",
      label: "Добавить материал для заполнения швов",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — расход продукта не выбран" },
        { value: 1, label: "Да — введу паспортный расход и фасовку" },
      ],
      hint: "Расход зависит от формата и толщины плитки, ширины и глубины шва, а также продукта. Поэтому фиксированная норма автоматически не применяется.",
      fullWidth: true,
    },
    {
      key: "jointSandRateKgM2",
      label: "Паспортный расход материала для швов",
      type: "number",
      unit: "кг/м²",
      min: 0.01,
      max: 100,
      step: 0.01,
      defaultValue: 5,
      hideIf: { key: "jointSandEnabled", op: "eq", value: 0 },
      hint: "Перенесите расход из техкарты выбранного продукта для вашей плитки и шва.",
    },
    {
      key: "jointSandBagKg",
      label: "Масса одного мешка",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 1000,
      step: 0.1,
      defaultValue: 25,
      hideIf: { key: "jointSandEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранного материала.",
    },
    {
      key: "geotextileEnabled",
      label: "Добавить геотекстиль",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — материал проектом не задан" },
        { value: 1, label: "Да — введу запас и площадь рулона" },
      ],
      hint: "Наличие, класс и место геотекстиля определяются проектом основания и грунтами; калькулятор считает только площадь и упаковки.",
      fullWidth: true,
    },
    {
      key: "geotextileReservePercent",
      label: "Запас геотекстиля на нахлёсты и края",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
      ],
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Выберите по фактической схеме полос, ширине рулона, нахлёстам и заворотам; универсальный процент не добавляется.",
    },
    {
      key: "geotextileRollM2",
      label: "Площадь геотекстиля в рулоне",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 50,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Фактическая площадь выбранного рулона. При продаже отрезом задачу закупки нужно проверить отдельно.",
    },
  ],
  calculate(inputs) {
    const area = clamp(Number(inputs.area ?? 50), 5, 2000);
    const tileReservePercent = clamp(Number(inputs.tileReservePercent ?? 0), 0, 20);
    const tileSaleStepM2 = clamp(Number(inputs.tileSaleStepM2 ?? 0.1), 0.01, 100);
    const tileCleanM2 = area;
    const tileReservedM2 = round(tileCleanM2 * (1 + tileReservePercent / 100), 6);
    const tilePurchaseLots = tileReservedM2 > 0
      ? Math.ceil((tileReservedM2 - Number.EPSILON) / tileSaleStepM2)
      : 0;
    const tilePurchaseM2 = round(tilePurchaseLots * tileSaleStepM2, 6);
    const tileLeftoverM2 = round(Math.max(0, tilePurchaseM2 - tileReservedM2), 6);

    const borderEnabled = clampInteger(Number(inputs.borderEnabled ?? 1), 0, 1);
    const perimeter = clamp(Number(inputs.perimeter ?? 30), 0, 1000);
    const borderPieceLengthM = clamp(Number(inputs.borderPieceLengthM ?? 1), 0.1, 5);
    const borderReservePercent = clamp(Number(inputs.borderReservePercent ?? 0), 0, 15);
    const borderCleanPcs = borderEnabled === 1 ? perimeter / borderPieceLengthM : 0;
    const borderReservedPcs = borderCleanPcs * (1 + borderReservePercent / 100);
    const borderPurchasePcs = borderReservedPcs > 0 ? Math.ceil(borderReservedPcs - Number.EPSILON) : 0;

    const layersEnabled = clampInteger(Number(inputs.layersEnabled ?? 0), 0, 1);
    const sandLayerThicknessMm = clamp(Number(inputs.sandLayerThicknessMm ?? 0), 0, 1000);
    const sandPurchaseFactor = clamp(Number(inputs.sandPurchaseFactor ?? 1), 1, 2);
    const gravelLayerThicknessMm = clamp(Number(inputs.gravelLayerThicknessMm ?? 0), 0, 1000);
    const gravelPurchaseFactor = clamp(Number(inputs.gravelPurchaseFactor ?? 1), 1, 2);
    const bulkSaleStepM3 = clamp(Number(inputs.bulkSaleStepM3 ?? 0.1), 0.01, 20);
    const sandGeometricM3 = layersEnabled === 1 ? area * sandLayerThicknessMm / 1000 : 0;
    const sandPurchaseNeedM3 = sandGeometricM3 * sandPurchaseFactor;
    const sandPurchaseM3 = roundUpToStep(sandPurchaseNeedM3, bulkSaleStepM3);
    const gravelGeometricM3 = layersEnabled === 1 ? area * gravelLayerThicknessMm / 1000 : 0;
    const gravelPurchaseNeedM3 = gravelGeometricM3 * gravelPurchaseFactor;
    const gravelPurchaseM3 = roundUpToStep(gravelPurchaseNeedM3, bulkSaleStepM3);

    const jointSandEnabled = clampInteger(Number(inputs.jointSandEnabled ?? 0), 0, 1);
    const jointSandRateKgM2 = clamp(Number(inputs.jointSandRateKgM2 ?? 5), 0.01, 100);
    const jointSandBagKg = clamp(Number(inputs.jointSandBagKg ?? 25), 0.1, 1000);
    const jointSandKg = jointSandEnabled === 1 ? area * jointSandRateKgM2 : 0;
    const jointSandBags = jointSandKg > 0 ? Math.ceil((jointSandKg - Number.EPSILON) / jointSandBagKg) : 0;

    const geotextileEnabled = clampInteger(Number(inputs.geotextileEnabled ?? 0), 0, 1);
    const geotextileReservePercent = clamp(Number(inputs.geotextileReservePercent ?? 0), 0, 20);
    const geotextileRollM2 = clamp(Number(inputs.geotextileRollM2 ?? 50), 0.1, 10000);
    const geotextileReservedM2 = geotextileEnabled === 1
      ? area * (1 + geotextileReservePercent / 100)
      : 0;
    const geotextileRolls = geotextileReservedM2 > 0
      ? Math.ceil((geotextileReservedM2 - Number.EPSILON) / geotextileRollM2)
      : 0;

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const materials: MaterialResult[] = [
      {
        name: "Тротуарная плитка — площадь покрытия",
        quantity: round(tileCleanM2, 6),
        unit: "м²",
        withReserve: round(tileReservedM2, 6),
        purchaseQty: tilePurchaseM2,
        category: "Покрытие",
        subtitle: tileSaleStepM2 > 1
          ? `${tilePurchaseLots} неделимых партий × ${formatRuNumber(tileSaleStepM2)} м²; остаток относительно потребности ${formatRuNumber(tileLeftoverM2)} м².`
          : `Потребность ${formatRuNumber(tileReservedM2)} м² округлена вверх с шагом продажи ${formatRuNumber(tileSaleStepM2)} м².`,
        highlight: true,
      },
    ];

    if (borderPurchasePcs > 0) {
      materials.push({
        name: `Бордюр — изделие длиной ${formatRuNumber(borderPieceLengthM)} м`,
        quantity: round(borderCleanPcs, 6),
        unit: "шт",
        withReserve: round(borderReservedPcs, 6),
        purchaseQty: borderPurchasePcs,
        category: "Бордюр",
        packageInfo: { count: borderPurchasePcs, size: 1, packageUnit: "шт" },
        subtitle: `${formatRuNumber(perimeter)} м / ${formatRuNumber(borderPieceLengthM)} м; запас ${formatRuNumber(borderReservePercent)}%, округление вверх.`,
      });
    }

    if (sandPurchaseM3 > 0) {
      materials.push({
        name: "Песок — заданный слой",
        quantity: round(sandGeometricM3, 6),
        unit: "м³",
        withReserve: round(sandPurchaseNeedM3, 6),
        purchaseQty: sandPurchaseM3,
        category: "Заданные слои",
        subtitle: `${formatRuNumber(area)} м² × ${formatRuNumber(sandLayerThicknessMm)} мм = ${formatRuNumber(sandGeometricM3)} м³; коэффициент ${formatRuNumber(sandPurchaseFactor)}, шаг заказа ${formatRuNumber(bulkSaleStepM3)} м³.`,
      });
    }

    if (gravelPurchaseM3 > 0) {
      materials.push({
        name: "Щебень — заданный слой",
        quantity: round(gravelGeometricM3, 6),
        unit: "м³",
        withReserve: round(gravelPurchaseNeedM3, 6),
        purchaseQty: gravelPurchaseM3,
        category: "Заданные слои",
        subtitle: `${formatRuNumber(area)} м² × ${formatRuNumber(gravelLayerThicknessMm)} мм = ${formatRuNumber(gravelGeometricM3)} м³; коэффициент ${formatRuNumber(gravelPurchaseFactor)}, шаг заказа ${formatRuNumber(bulkSaleStepM3)} м³.`,
      });
    }

    if (jointSandBags > 0) {
      materials.push({
        name: `Материал для заполнения швов — мешок ${formatRuNumber(jointSandBagKg)} кг`,
        quantity: round(jointSandKg / jointSandBagKg, 6),
        unit: "мешков",
        withReserve: round(jointSandKg / jointSandBagKg, 6),
        purchaseQty: jointSandBags,
        category: "Швы",
        subtitle: `${formatRuNumber(area)} м² × паспортные ${formatRuNumber(jointSandRateKgM2)} кг/м² = ${formatRuNumber(jointSandKg)} кг; к покупке ${jointSandBags} ${pluralRu(jointSandBags, "мешок", "мешка", "мешков")}.`,
      });
    }

    if (geotextileRolls > 0) {
      materials.push({
        name: `Геотекстиль — рулон ${formatRuNumber(geotextileRollM2)} м²`,
        quantity: round(geotextileReservedM2 / geotextileRollM2, 6),
        unit: "рулонов",
        withReserve: round(geotextileReservedM2 / geotextileRollM2, 6),
        purchaseQty: geotextileRolls,
        category: "Заданные слои",
        subtitle: `${formatRuNumber(geotextileReservedM2)} м² с явным запасом ${formatRuNumber(geotextileReservePercent)}%; к покупке ${geotextileRolls} ${pluralRu(geotextileRolls, "рулон", "рулона", "рулонов")}.`,
      });
    }

    const scenario: CalculatorScenario = {
      exact_need: round(tileReservedM2, 6),
      purchase_quantity: tilePurchaseM2,
      leftover: tileLeftoverM2,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `tile_area_m2:${round(tileCleanM2, 6)}`,
        `tile_sale_step_m2:${round(tileSaleStepM2, 6)}`,
        `tile_reserve_percent:${round(tileReservePercent, 3)}`,
        "foundation_design_not_inferred:true",
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: round(tileReservePercent, 3),
      },
      buy_plan: {
        package_label: "tile-sale-lot",
        package_size: round(tileSaleStepM2, 6),
        packages_count: tilePurchaseLots,
        unit: "м²",
      },
    };

    const warnings = [
      "Это предварительная закупочная ведомость, а не проект дорожной одежды. Нагрузка, грунт, морозное пучение, водоотвод, уклоны, отметки, дренаж и последовательность слоёв автоматически не определяются.",
      `Запас плитки ${formatRuNumber(tileReservePercent)}% задан пользователем и применяется один раз. MIN/REC/MAX и режим точности не добавляют поверх него скрытые множители.`,
      "Класс, толщина, формат, цвет и пригодность плитки для конкретной зоны проверяются по проекту и паспорту изделия; площадь сама по себе их не определяет.",
      "Площадь не является раскладкой: рисунок, швы, диагонали, края, люки, радиусы, ступени и пригодность обрезков нужно проверить отдельно до заказа одной партии.",
    ];

    if (borderEnabled === 0) {
      warnings.push("Бордюр выключен. Способ ограничения края, его основание и примыкания должны быть предусмотрены отдельно.");
    } else {
      warnings.push("Для бордюра рассчитано только число изделий по введённой длине. Тип, сечение, углы, основание и бетон не назначаются автоматически.");
    }

    if (layersEnabled === 1 && sandLayerThicknessMm === 0 && gravelLayerThicknessMm === 0) {
      warnings.push("Блок слоёв включён, но проектные толщины не заданы: песок и щебень не добавлены в ведомость.");
    }
    if (layersEnabled === 1 && (sandLayerThicknessMm > 0 || gravelLayerThicknessMm > 0)) {
      warnings.push("Объёмы песка и щебня получены только из введённых толщин и коэффициентов. Они не подтверждают пригодность состава основания и не учитывают неодинаковую глубину выемки по участку.");
    }
    if (jointSandEnabled === 1) {
      warnings.push(`Материал швов посчитан по введённому паспортному расходу ${formatRuNumber(jointSandRateKgM2)} кг/м². Совместимость с плиткой, шириной шва и условиями эксплуатации проверяйте по техкарте.`);
    }
    if (geotextileEnabled === 1) {
      warnings.push("Количество рулонов геотекстиля — площадная оценка. Реальный раскрой полос, нахлёсты, завороты, класс материала и место в конструкции требуют отдельной схемы.");
    }

    return {
      materials,
      totals: {
        area: round(area, 6),
        tileCleanM2: round(tileCleanM2, 6),
        tileReservePercent: round(tileReservePercent, 3),
        tileSaleStepM2: round(tileSaleStepM2, 6),
        tileReservedM2: round(tileReservedM2, 6),
        tilePurchaseLots,
        tilePurchaseM2,
        tileLeftoverM2,
        borderEnabled,
        perimeter: round(perimeter, 6),
        borderPieceLengthM: round(borderPieceLengthM, 6),
        borderReservePercent: round(borderReservePercent, 3),
        borderCleanPcs: round(borderCleanPcs, 6),
        borderReservedPcs: round(borderReservedPcs, 6),
        borderPurchasePcs,
        layersEnabled,
        sandLayerThicknessMm: round(sandLayerThicknessMm, 3),
        sandPurchaseFactor: round(sandPurchaseFactor, 3),
        sandGeometricM3: round(sandGeometricM3, 6),
        sandPurchaseNeedM3: round(sandPurchaseNeedM3, 6),
        sandPurchaseM3,
        gravelLayerThicknessMm: round(gravelLayerThicknessMm, 3),
        gravelPurchaseFactor: round(gravelPurchaseFactor, 3),
        gravelGeometricM3: round(gravelGeometricM3, 6),
        gravelPurchaseNeedM3: round(gravelPurchaseNeedM3, 6),
        gravelPurchaseM3,
        bulkSaleStepM3: round(bulkSaleStepM3, 6),
        jointSandEnabled,
        jointSandRateKgM2: round(jointSandRateKgM2, 6),
        jointSandBagKg: round(jointSandBagKg, 6),
        jointSandKg: round(jointSandKg, 6),
        jointSandBags,
        geotextileEnabled,
        geotextileReservePercent: round(geotextileReservePercent, 3),
        geotextileRollM2: round(geotextileRollM2, 6),
        geotextileReservedM2: round(geotextileReservedM2, 6),
        geotextileRolls,
        minExactNeed: round(tileReservedM2, 6),
        recExactNeed: round(tileReservedM2, 6),
        maxExactNeed: round(tileReservedM2, 6),
        minPurchase: tilePurchaseM2,
        recPurchase: tilePurchaseM2,
        maxPurchase: tilePurchaseM2,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: pavingTilesSpec.calculator_id,
      practicalNotes: [
        `Чистая площадь покрытия: ${formatRuNumber(tileCleanM2)} м².`,
        `С явным запасом ${formatRuNumber(tileReservePercent)}% требуется ${formatRuNumber(tileReservedM2)} м² плитки.`,
        `При шаге продажи ${formatRuNumber(tileSaleStepM2)} м² к покупке ${formatRuNumber(tilePurchaseM2)} м²; остаток относительно расчётной потребности ${formatRuNumber(tileLeftoverM2)} м².`,
        "До заказа сверьте раскладку, партию, калибр и тон фактической плитки, а конструкцию основания — с проектом участка.",
      ],
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет закупку: применяются только введённые пользователем запас, фасовка, толщины и коэффициенты."],
      },
      summaryCards: [
        {
          icon: "▱",
          label: "Чистая площадь",
          value: formatRuNumber(tileCleanM2),
          unit: "м²",
          hint: "до запаса и округления",
          tone: "violet",
        },
        {
          icon: "+",
          label: "С вашим запасом",
          value: formatRuNumber(tileReservedM2),
          unit: "м²",
          hint: `${formatRuNumber(tileReservePercent)}%, применяется один раз`,
          tone: "slate",
        },
        {
          icon: "▣",
          label: "Плитка к покупке",
          value: formatRuNumber(tilePurchaseM2),
          unit: "м²",
          hint: `${tilePurchaseLots} × ${formatRuNumber(tileSaleStepM2)} м²`,
          tone: "amber",
        },
      ],
      materialListBanner: "Ведомость включает плитку, выбранный бордюр и только те дополнительные материалы, параметры которых вы явно включили и задали. Конструкция основания автоматически не назначается.",
    };
  },
  formulaDescription: `
**Закупочный расчёт тротуарной плитки:**
- Плитка с запасом = площадь покрытия × (1 + выбранный запас / 100).
- К покупке = округление вверх до фактического шага продажи или площади неделимой упаковки.
- Бордюр = длина участков с бордюром / фактическая длина изделия; отдельный запас применяется один раз, затем результат округляется вверх до целой штуки.
- Песок или щебень = площадь × введённая проектная толщина / 1000 × введённый коэффициент закупочного объёма; результат округляется до шага поставщика.
- Материал для швов = площадь × паспортный расход; мешки округляются вверх по введённой фасовке.
- Геотекстиль = площадь × явный запас; рулоны округляются вверх по фактической площади рулона.
- MIN/REC/MAX совпадают: скрытых запасов и универсального пресета основания нет.
  `,
  howToUse: [
    "Введите площадь покрытия без автоматического запаса",
    "Выберите запас после проверки фактической раскладки и подрезки",
    "Укажите минимальный шаг продажи или площадь неделимой упаковки плитки",
    "Для бордюра введите только реальную длину его участков и длину выбранного изделия",
    "Дополнительные слои включайте только при наличии проектных толщин и коэффициентов",
    "Расход материала для швов и площадь рулона геотекстиля перенесите из документов выбранного товара",
    "Используйте итог как закупочную оценку, а не как проект основания и водоотвода",
  ],
  expertTips: [
    {
      title: "Сначала раскладка, потом запас",
      content: "Один процент не видит рисунок, радиусы, люки, ступени и пригодность обрезков. Для сложного участка сделайте раскладку, после неё задайте запас явно.",
      author: "Мастерок",
    },
    {
      title: "Основание не выбирают одной кнопкой",
      content: "Толщины и состав слоёв зависят от нагрузки, грунта, воды, климата и отметок. Калькулятор умножает только уже принятые проектные значения.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Какой запас тротуарной плитки выбрать?",
      answer: "Универсального процента для любого участка нет. Запас зависит от рисунка, направления, количества краёв и препятствий, пригодности обрезков, риска боя и возможности докупить ту же партию. В калькуляторе запас выбирается явно и применяется один раз.",
    },
    {
      question: "Почему калькулятор не выбирает песчаное, цементно-песчаное или бетонное основание?",
      answer: "Одной площади и вида нагрузки недостаточно: нужны грунты, вода, морозное пучение, отметки, уклоны, дренаж и расчётная нагрузка. Поэтому состав основания принимают проектом, а сюда переносят только уже заданные толщины песка и щебня.",
    },
    {
      question: "Как учесть продажу плитки целыми палетами?",
      answer: "Введите полную площадь плитки в неделимой палете как шаг продажи. Калькулятор округлит потребность вверх до целого числа таких партий и покажет купленную площадь и остаток.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как рассчитать плитку к покупке</h2>
<p>Чистую площадь покрытия умножают на один явно выбранный запас. Полученную потребность округляют вверх не до условного целого квадратного метра, а до фактического шага продажи: это может быть 0,1 м², ряд, пакет или неделимая палета с известной площадью.</p>
<p><strong>S<sub>покупки</sub> = ceil((S × (1 + r / 100)) / p) × p</strong>, где <strong>S</strong> — чистая площадь, <strong>r</strong> — выбранный запас, <strong>p</strong> — шаг продажи или площадь неделимой партии.</p>

<h2>Бордюр по фактической длине изделия</h2>
<p>Калькулятор делит суммарную длину только тех сторон, где действительно предусмотрен бордюр, на длину выбранного изделия. Отдельный запас применяется один раз, затем количество округляется вверх. Марка, сечение, основание и узлы бордюра по одному периметру не определяются.</p>

<h2>Дополнительные материалы без универсального пресета</h2>
<p>Песок и щебень появляются только после включения блока и ввода проектной толщины. Геометрический объём слоя равен площади, умноженной на толщину в метрах. Коэффициент закупочного объёма и шаг поставки задаёт пользователь. Материал для швов считается только по введённому паспортному расходу и фасовке, а геотекстиль — по явному запасу и фактической площади рулона.</p>
<p>Такой расчёт не подменяет проект дорожной одежды. Он не выбирает состав слоёв, не проверяет грунт, воду, морозное пучение, уклоны, водоотвод, дренаж и допустимую нагрузку.</p>

<h2>Нормативная граница расчёта</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/acb7d009-5d1c-45bd-8ab4-d3591ad19972" rel="noopener noreferrer">ГОСТ 17608-2017 «Плиты бетонные тротуарные»</a> распространяется на бетонные тротуарные плиты для разных областей применения; соответствие конкретного изделия подтверждают его документами.</li>
  <li><a href="https://protect.gost.ru/sp/details/8d5a8ef5-f450-4356-ac88-72cd17c416cf" rel="noopener noreferrer">СП 82.13330.2016 «Благоустройство территорий»</a> устанавливает требования к проектным решениям и сочетаниям элементов благоустройства. Площадной калькулятор не заменяет такие решения.</li>
  <li><a href="https://protect.gost.ru/gost/details/683a4426-dd5d-431d-a83f-6208cf3667aa" rel="noopener noreferrer">ГОСТ 6665-91 «Камни бетонные и железобетонные бортовые»</a> относится к бортовым камням; фактический типоразмер выбранного изделия переносится в расчёт вручную.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько тротуарной плитки нужно на 50 м²?",
        answer: "<p>Без запаса чистая потребность равна <strong>50 м²</strong>. При явно выбранном запасе 7% получится <strong>53,5 м²</strong>. Если поставщик отпускает плитку шагом 0,1 м², к покупке будет 53,5 м²; если только неделимыми палетами по 12,96 м², потребуется 5 палет, то есть <strong>64,8 м²</strong>. Перед заказом проверьте фактическую раскладку и возможность отпуска неполной палеты.</p>",
      },
      {
        question: "Как рассчитать песок и щебень под плитку?",
        answer: "<p>Сначала конструкция должна задать толщину каждого слоя. Геометрический объём равен площади, умноженной на толщину в метрах. Затем можно применить явно принятый коэффициент закупочного объёма и округлить до шага поставщика. Сам калькулятор не выбирает толщины и коэффициенты по одному назначению площадки.</p>",
      },
      {
        question: "Почему расход материала для швов не подставляется автоматически?",
        answer: "<p>Масса зависит от формата и толщины плитки, ширины и глубины шва, плотности и требований конкретного продукта. Перенесите паспортный расход в кг/м² и массу мешка — тогда калькулятор округлит результат до целых упаковок.</p>",
      },
    ],
  },
};
