import type {
  CalculatorDefinition,
  CalculatorScenario,
  MaterialResult,
} from "../types";
import { withSiteMetaTitle } from "../meta";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "../../../../engine/accuracy";
import ceilingRailSpec from "../../../../configs/calculators/ceiling-rail-canonical.v1.json";

const WEB_FORMULA_VERSION = "ceiling-rail-web-layout-v1";

const RESERVE_OPTIONS = [
  { value: 0, label: "0% — без запаса" },
  { value: 3, label: "3%" },
  { value: 5, label: "5%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
  { value: 25, label: "25%" },
  { value: 30, label: "30%" },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const readNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const ceilPositive = (value: number): number =>
  value > 0 ? Math.ceil(value - 1e-9) : 0;

const applyReserve = (value: number, reservePercent: number): number =>
  round(value * (1 + reservePercent / 100), 6);

const formatRuNumber = (value: number): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);

const plural = (
  value: number,
  one: string,
  few: string,
  many: string,
): string => {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

interface LinearPurchase {
  requiredLengthM: number;
  pieces: number;
  purchaseLengthM: number;
  leftoverLengthM: number;
}

const calculateLinearPurchase = (
  projectLengthM: number,
  reservePercent: number,
  pieceLengthM: number,
): LinearPurchase => {
  const requiredLengthM = applyReserve(projectLengthM, reservePercent);
  const pieces = ceilPositive(requiredLengthM / pieceLengthM);
  const purchaseLengthM = round(pieces * pieceLengthM, 6);
  return {
    requiredLengthM,
    pieces,
    purchaseLengthM,
    leftoverLengthM: round(
      Math.max(0, purchaseLengthM - requiredLengthM),
      6,
    ),
  };
};

export const ceilingRailDef: CalculatorDefinition = {
  id: "ceilings_rail",
  slug: "reechnyj-potolok",
  title: "Калькулятор реечного потолка",
  h1: "Калькулятор реечного потолка — рейки и проектные материалы",
  description:
    "Рассчитайте рейки для простой прямоугольной раскладки или перенесите готовую ведомость, затем добавьте только подтверждённые системой профили и крепёж.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор реечного потолка: рейки и профили",
  ),
  metaDescription:
    "Бесплатный калькулятор реечного потолка: рассчитайте ряды и рейки по модулю системы или проверьте проектную ведомость, упаковки и остаток.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: [
    "реечный потолок",
    "расчёт реек",
    "модуль рейки",
    "несущая направляющая",
    "проект потолка",
  ],
  popularity: 60,
  complexity: 3,
  fields: [
    {
      key: "inputMode",
      label: "Источник количества реек",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простой прямоугольник — рассчитать ряды" },
        { value: 1, label: "Готовая ведомость — ввести число реек" },
      ],
      hint:
        "Прямой расчёт подходит для одного прямоугольного поля с параллельными рядами. Для диагонали, ниш, колонн, комбинации модулей и сложного контура перенесите готовое число изделий из раскладки.",
      fullWidth: true,
    },
    {
      key: "railRunLengthM",
      label: "Длина поля вдоль реек",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 3,
      hint:
        "Чистая длина одного ряда между противоположными примыканиями. Ниши, короба и неодинаковые ряды считайте по раскладке.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "railFieldWidthM",
      label: "Ширина поля поперёк реек",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 2,
      hint:
        "Размер, который делится на монтажный модуль. Направление реек меняет число рядов и раскрой.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "railModuleWidthMm",
      label: "Монтажный модуль одного ряда",
      type: "number",
      unit: "мм",
      min: 10,
      max: 1000,
      step: 1,
      defaultValue: 100,
      hint:
        "Берите повторяющийся шаг из документации выбранной системы: сама рейка плюс предусмотренный руст, зазор или раскладка. Номинальная лицевая ширина может отличаться от модуля.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "projectCeilingAreaM2",
      label: "Площадь потолка по проекту",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.01,
      defaultValue: 6,
      hint:
        "Справочная площадь для результата. Она не пересчитывает готовое количество реек и проектных элементов.",
      group: "Готовая ведомость",
      hideIf: { key: "inputMode", op: "eq", value: 0 },
    },
    {
      key: "projectRailPieceCount",
      label: "Реек по готовой ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 20,
      hint:
        "Введите целые закупочные изделия одной длины и артикула после раскладки сложного, диагонального или комбинированного потолка.",
      group: "Готовая ведомость",
      hideIf: { key: "inputMode", op: "eq", value: 0 },
    },
    {
      key: "railPieceLengthM",
      label: "Длина одной покупной рейки",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3,
      hint:
        "Фактическая длина выбранного артикула или заказной резки. При длине меньше ряда калькулятор считает отдельные куски на каждый ряд и предупреждает о стыках.",
      group: "Закупка реек",
    },
    {
      key: "railReservePercent",
      label: "Ваш запас реек",
      type: "select",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Запас применяется один раз к числу изделий после раскладки. Для сложного контура определите его по карте реза и возможности докупить тот же цвет и партию.",
      group: "Закупка реек",
    },
    {
      key: "railPiecesPerPack",
      label: "Реек в неделимой упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hint: "Если рейки продаются поштучно, оставьте 1.",
      group: "Закупка реек",
    },
    {
      key: "carrierEnabled",
      label: "Добавить несущие направляющие по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема каркаса не подтверждена" },
        { value: 1, label: "Да — введу проектную длину" },
      ],
      hint:
        "Тип, направление, шаг, крайние отступы и несущая способность задаются документацией конкретной системы и проектом, а не общей площадью.",
      group: "Несущая система",
      fullWidth: true,
    },
    {
      key: "projectCarrierLengthM",
      label: "Длина несущих направляющих по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Несущая система",
      hideIf: { key: "carrierEnabled", op: "eq", value: 0 },
    },
    {
      key: "carrierReservePercent",
      label: "Ваш запас направляющих",
      type: "select",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Несущая система",
      hideIf: { key: "carrierEnabled", op: "eq", value: 0 },
    },
    {
      key: "carrierPieceLengthM",
      label: "Длина одной направляющей",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3,
      group: "Несущая система",
      hideIf: { key: "carrierEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterEnabled",
      label: "Добавить периметральный профиль по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — примыкание не выбрано" },
        { value: 1, label: "Да — введу измеренную длину" },
      ],
      hint:
        "Не восстанавливайте периметр из площади. Введите длину принятого L-, П- или другого профиля с учётом ниш, колонн и разрывов.",
      group: "Периметр",
      fullWidth: true,
    },
    {
      key: "projectPerimeterLengthM",
      label: "Длина периметрального профиля",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterReservePercent",
      label: "Ваш запас периметрального профиля",
      type: "select",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterPieceLengthM",
      label: "Длина одного периметрального профиля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "insertEnabled",
      label: "Добавить раскладку или вставку по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — система не требует или не выбрана" },
        { value: 1, label: "Да — введу проектную длину" },
      ],
      hint:
        "Раскладка, межреечная вставка или руст зависят от артикула и выбранной комбинации модулей. Они не равны площади и не назначаются автоматически.",
      group: "Заполнение",
      fullWidth: true,
    },
    {
      key: "projectInsertLengthM",
      label: "Длина раскладки или вставки по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Заполнение",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "insertReservePercent",
      label: "Ваш запас раскладки или вставки",
      type: "select",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Заполнение",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "insertPieceLengthM",
      label: "Длина одного элемента раскладки",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3,
      group: "Заполнение",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "mountingEnabled",
      label: "Добавить монтажные элементы по ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — крепёжная схема не готова" },
        { value: 1, label: "Да — введу готовое количество" },
      ],
      hint:
        "Используйте отдельный расчёт для одной однородной позиции: подвесов, анкеров, крепёжных пластин или комплектов. Тип основания, нагрузку и совместимость проверяют проектом.",
      group: "Монтаж",
      fullWidth: true,
    },
    {
      key: "projectMountingItemCount",
      label: "Монтажных элементов по ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      group: "Монтаж",
      hideIf: { key: "mountingEnabled", op: "eq", value: 0 },
    },
    {
      key: "mountingItemsPerPack",
      label: "Монтажных элементов в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      group: "Монтаж",
      hideIf: { key: "mountingEnabled", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const railRunLengthM = inputMode === 0
      ? clamp(readNumber(inputs.railRunLengthM, 3), 0.1, 100)
      : 0;
    const railFieldWidthM = inputMode === 0
      ? clamp(readNumber(inputs.railFieldWidthM, 2), 0.1, 100)
      : 0;
    const railModuleWidthMm = inputMode === 0
      ? clamp(readNumber(inputs.railModuleWidthMm, 100), 10, 1000)
      : 0;
    const projectCeilingAreaM2 = inputMode === 1
      ? clamp(readNumber(inputs.projectCeilingAreaM2, 6), 0.1, 10000)
      : 0;
    const projectRailPieceCount = inputMode === 1
      ? clampInteger(readNumber(inputs.projectRailPieceCount, 20), 0, 100000)
      : 0;
    const railPieceLengthM = clamp(
      readNumber(inputs.railPieceLengthM, 3),
      0.1,
      30,
    );
    const railReservePercent = clamp(
      readNumber(inputs.railReservePercent, 0),
      0,
      30,
    );
    const railPiecesPerPack = clampInteger(
      readNumber(inputs.railPiecesPerPack, 1),
      1,
      10000,
    );

    const area = round(
      inputMode === 0
        ? railRunLengthM * railFieldWidthM
        : projectCeilingAreaM2,
      6,
    );
    const railRows = inputMode === 0
      ? ceilPositive((railFieldWidthM * 1000) / railModuleWidthMm)
      : 0;
    const railPiecesPerRow = inputMode === 0
      ? ceilPositive(railRunLengthM / railPieceLengthM)
      : 0;
    const layoutRailPieces = inputMode === 0
      ? railRows * railPiecesPerRow
      : projectRailPieceCount;
    const exactRailLengthM = round(
      inputMode === 0
        ? railRows * railRunLengthM
        : layoutRailPieces * railPieceLengthM,
      6,
    );
    const layoutStockLengthM = round(
      layoutRailPieces * railPieceLengthM,
      6,
    );
    const layoutOffcutLengthM = round(
      Math.max(0, layoutStockLengthM - exactRailLengthM),
      6,
    );
    const requiredRailPieces = ceilPositive(
      layoutRailPieces * (1 + railReservePercent / 100),
    );
    const railPacks = ceilPositive(requiredRailPieces / railPiecesPerPack);
    const purchaseRailPieces = railPacks * railPiecesPerPack;
    const purchaseRailLengthM = round(
      purchaseRailPieces * railPieceLengthM,
      6,
    );
    const railPurchasedSurplusLengthM = round(
      Math.max(0, purchaseRailLengthM - exactRailLengthM),
      6,
    );

    const carrierEnabled = readNumber(inputs.carrierEnabled, 0) > 0;
    const projectCarrierLengthM = carrierEnabled
      ? clamp(readNumber(inputs.projectCarrierLengthM, 0), 0, 100000)
      : 0;
    const carrierReservePercent = carrierEnabled
      ? clamp(readNumber(inputs.carrierReservePercent, 0), 0, 30)
      : 0;
    const carrierPieceLengthM = clamp(
      readNumber(inputs.carrierPieceLengthM, 3),
      0.1,
      30,
    );
    const carrier = calculateLinearPurchase(
      projectCarrierLengthM,
      carrierReservePercent,
      carrierPieceLengthM,
    );

    const perimeterEnabled = readNumber(inputs.perimeterEnabled, 0) > 0;
    const projectPerimeterLengthM = perimeterEnabled
      ? clamp(readNumber(inputs.projectPerimeterLengthM, 0), 0, 100000)
      : 0;
    const perimeterReservePercent = perimeterEnabled
      ? clamp(readNumber(inputs.perimeterReservePercent, 0), 0, 30)
      : 0;
    const perimeterPieceLengthM = clamp(
      readNumber(inputs.perimeterPieceLengthM, 3),
      0.1,
      30,
    );
    const perimeter = calculateLinearPurchase(
      projectPerimeterLengthM,
      perimeterReservePercent,
      perimeterPieceLengthM,
    );

    const insertEnabled = readNumber(inputs.insertEnabled, 0) > 0;
    const projectInsertLengthM = insertEnabled
      ? clamp(readNumber(inputs.projectInsertLengthM, 0), 0, 100000)
      : 0;
    const insertReservePercent = insertEnabled
      ? clamp(readNumber(inputs.insertReservePercent, 0), 0, 30)
      : 0;
    const insertPieceLengthM = clamp(
      readNumber(inputs.insertPieceLengthM, 3),
      0.1,
      30,
    );
    const insert = calculateLinearPurchase(
      projectInsertLengthM,
      insertReservePercent,
      insertPieceLengthM,
    );

    const mountingEnabled = readNumber(inputs.mountingEnabled, 0) > 0;
    const projectMountingItemCount = mountingEnabled
      ? clampInteger(readNumber(inputs.projectMountingItemCount, 0), 0, 100000)
      : 0;
    const mountingItemsPerPack = clampInteger(
      readNumber(inputs.mountingItemsPerPack, 1),
      1,
      10000,
    );
    const mountingPacks = ceilPositive(
      projectMountingItemCount / mountingItemsPerPack,
    );
    const purchaseMountingItemCount = mountingPacks * mountingItemsPerPack;

    const materials: MaterialResult[] = [
      {
        name: inputMode === 0
          ? "Потолочные рейки по простой раскладке"
          : "Потолочные рейки по проектной ведомости",
        subtitle: inputMode === 0
          ? `Модуль ${formatRuNumber(railModuleWidthMm)} мм; ${railRows} ${plural(railRows, "ряд", "ряда", "рядов")} × ${railPiecesPerRow} ${plural(railPiecesPerRow, "рейка", "рейки", "реек")} длиной ${formatRuNumber(railPieceLengthM)} м`
          : `${layoutRailPieces} ${plural(layoutRailPieces, "рейка", "рейки", "реек")} длиной ${formatRuNumber(railPieceLengthM)} м из готовой раскладки`,
        quantity: layoutRailPieces,
        unit: "шт",
        withReserve: requiredRailPieces,
        purchaseQty: purchaseRailPieces,
        category: "Рейки",
        highlight: true,
        packageInfo: {
          count: railPiecesPerPack === 1 ? purchaseRailPieces : railPacks,
          size: railPiecesPerPack,
          packageUnit: railPiecesPerPack === 1 ? "реек" : "упаковок",
        },
      },
    ];

    if (carrierEnabled && projectCarrierLengthM > 0) {
      materials.push({
        name: "Несущие направляющие по проекту",
        subtitle: `Элемент ${formatRuNumber(carrierPieceLengthM)} м; запас ${formatRuNumber(carrierReservePercent)}%`,
        quantity: round(projectCarrierLengthM, 6),
        unit: "м",
        withReserve: carrier.requiredLengthM,
        purchaseQty: carrier.purchaseLengthM,
        category: "Несущая система",
        packageInfo: {
          count: carrier.pieces,
          size: carrierPieceLengthM,
          packageUnit: "направляющих",
        },
      });
    }

    if (perimeterEnabled && projectPerimeterLengthM > 0) {
      materials.push({
        name: "Периметральный профиль по проекту",
        subtitle: `Элемент ${formatRuNumber(perimeterPieceLengthM)} м; запас ${formatRuNumber(perimeterReservePercent)}%`,
        quantity: round(projectPerimeterLengthM, 6),
        unit: "м",
        withReserve: perimeter.requiredLengthM,
        purchaseQty: perimeter.purchaseLengthM,
        category: "Периметр",
        packageInfo: {
          count: perimeter.pieces,
          size: perimeterPieceLengthM,
          packageUnit: "профилей",
        },
      });
    }

    if (insertEnabled && projectInsertLengthM > 0) {
      materials.push({
        name: "Раскладка или вставка по проекту",
        subtitle: `Элемент ${formatRuNumber(insertPieceLengthM)} м; запас ${formatRuNumber(insertReservePercent)}%`,
        quantity: round(projectInsertLengthM, 6),
        unit: "м",
        withReserve: insert.requiredLengthM,
        purchaseQty: insert.purchaseLengthM,
        category: "Заполнение",
        packageInfo: {
          count: insert.pieces,
          size: insertPieceLengthM,
          packageUnit: "элементов",
        },
      });
    }

    if (mountingEnabled && projectMountingItemCount > 0) {
      materials.push({
        name: "Монтажные элементы по проектной ведомости",
        subtitle: mountingItemsPerPack === 1
          ? "Поштучная закупка одной однородной позиции"
          : `${mountingItemsPerPack} шт в неделимой упаковке одной однородной позиции`,
        quantity: projectMountingItemCount,
        unit: "шт",
        withReserve: projectMountingItemCount,
        purchaseQty: purchaseMountingItemCount,
        category: "Монтаж",
        packageInfo: {
          count: mountingItemsPerPack === 1
            ? purchaseMountingItemCount
            : mountingPacks,
          size: mountingItemsPerPack,
          packageUnit: mountingItemsPerPack === 1 ? "штук" : "упаковок",
        },
      });
    }

    const requestedAccuracyMode = inputs.accuracyMode as unknown as
      | AccuracyMode
      | undefined;
    const accuracyMode =
      requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: layoutRailPieces,
      purchase_quantity: purchaseRailPieces,
      leftover: Math.max(0, purchaseRailPieces - requiredRailPieces),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `input_mode:${inputMode}`,
        `layout_rail_pieces:${layoutRailPieces}`,
        `rail_piece_length_m:${round(railPieceLengthM, 6)}`,
        `rail_reserve_percent:${round(railReservePercent, 6)}`,
        `rail_pieces_per_pack:${railPiecesPerPack}`,
      ],
      key_factors: {
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: railPiecesPerPack === 1
          ? "rail-piece"
          : `rail-pack-${railPiecesPerPack}`,
        package_size: railPiecesPerPack,
        packages_count: railPacks,
        unit: "шт",
      },
    };

    const warnings: string[] = [
      "Прямой расчёт описывает одно прямоугольное поле с параллельными рядами. Диагональ, ниши, колонны, кривые, разные длины рядов и комбинации модулей требуют карты раскладки.",
      "Монтажный модуль берите из документации выбранной системы: он может включать рейку, руст, зазор или раскладку и не всегда равен лицевой ширине панели.",
      "Несущие направляющие, периметр, вставки, подвесы и крепёж не выводятся из площади: их тип, шаг, отступы и количество задаются системой, основанием, нагрузкой и проектом.",
      "Светильники, вентиляция, люки, датчики, пожарные устройства, акустика, усиления и доступ к коммуникациям рассчитываются отдельными проектными узлами.",
      "Пожарные, коррозионные, санитарные и эксплуатационные характеристики проверяйте по документам конкретной системы и помещения.",
    ];

    if (inputMode === 0 && railPieceLengthM < railRunLengthM) {
      warnings.push(
        `Одна рейка ${formatRuNumber(railPieceLengthM)} м короче ряда ${formatRuNumber(railRunLengthM)} м: расчёт заложил по ${railPiecesPerRow} ${plural(railPiecesPerRow, "элементу", "элемента", "элементов")} на ряд. Такой стык, соединитель, опору и допустимость схемы подтвердите у производителя.`,
      );
    }
    if (inputMode === 1 && projectRailPieceCount <= 0) {
      warnings.push(
        "Готовая ведомость выбрана, но число реек равно 0 — проверьте раскладку до заказа.",
      );
    }
    if (carrierEnabled && projectCarrierLengthM <= 0) {
      warnings.push(
        "Несущие направляющие включены, но проектная длина равна 0 — позиция не добавлена.",
      );
    }
    if (perimeterEnabled && projectPerimeterLengthM <= 0) {
      warnings.push(
        "Периметральный профиль включён, но измеренная длина равна 0 — позиция не добавлена.",
      );
    }
    if (insertEnabled && projectInsertLengthM <= 0) {
      warnings.push(
        "Раскладка или вставка включена, но проектная длина равна 0 — позиция не добавлена.",
      );
    }
    if (mountingEnabled && projectMountingItemCount <= 0) {
      warnings.push(
        "Монтажные элементы включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }

    const projectPositionCount = materials.length - 1;
    const practicalNotes = [
      inputMode === 0
        ? `Поле ${formatRuNumber(railRunLengthM)} × ${formatRuNumber(railFieldWidthM)} м содержит ${railRows} ${plural(railRows, "ряд", "ряда", "рядов")} по модулю ${formatRuNumber(railModuleWidthMm)} мм.`
        : `Из готовой раскладки принято ${layoutRailPieces} ${plural(layoutRailPieces, "рейка", "рейки", "реек")} для площади ${formatRuNumber(area)} м².`,
      `Для закупки принято ${purchaseRailPieces} ${plural(purchaseRailPieces, "рейка", "рейки", "реек")} длиной ${formatRuNumber(railPieceLengthM)} м; явный запас — ${formatRuNumber(railReservePercent)}%.`,
      "До заказа согласуйте направление, симметрию крайних рядов, цвет и партию, размещение швов, тип несущей системы, высоту опуска и все инженерные узлы.",
      "Не смешивайте рейки, направляющие и вставки разных систем без письменного подтверждения совместимости замков и несущей способности.",
    ];

    return {
      canonicalSpecId: ceilingRailSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        area,
        railRunLengthM: round(railRunLengthM, 6),
        railFieldWidthM: round(railFieldWidthM, 6),
        railModuleWidthMm: round(railModuleWidthMm, 6),
        railPieceLengthM: round(railPieceLengthM, 6),
        railRows,
        railPiecesPerRow,
        layoutRailPieces,
        exactRailLengthM,
        layoutStockLengthM,
        layoutOffcutLengthM,
        railReservePercent: round(railReservePercent, 6),
        requiredRailPieces,
        railPacks,
        purchaseRailPieces,
        purchaseRailLengthM,
        railPurchasedSurplusLengthM,
        projectCarrierLengthM: round(projectCarrierLengthM, 6),
        requiredCarrierLengthM: carrier.requiredLengthM,
        carrierPieces: carrier.pieces,
        purchaseCarrierLengthM: carrier.purchaseLengthM,
        leftoverCarrierLengthM: carrier.leftoverLengthM,
        projectPerimeterLengthM: round(projectPerimeterLengthM, 6),
        requiredPerimeterLengthM: perimeter.requiredLengthM,
        perimeterPieces: perimeter.pieces,
        purchasePerimeterLengthM: perimeter.purchaseLengthM,
        leftoverPerimeterLengthM: perimeter.leftoverLengthM,
        projectInsertLengthM: round(projectInsertLengthM, 6),
        requiredInsertLengthM: insert.requiredLengthM,
        insertPieces: insert.pieces,
        purchaseInsertLengthM: insert.purchaseLengthM,
        leftoverInsertLengthM: insert.leftoverLengthM,
        projectMountingItemCount,
        mountingPacks,
        purchaseMountingItemCount,
        projectPositionCount,
        minExactNeed: layoutRailPieces,
        recExactNeed: layoutRailPieces,
        maxExactNeed: layoutRailPieces,
        minPurchase: purchaseRailPieces,
        recPurchase: purchaseRailPieces,
        maxPurchase: purchaseRailPieces,
      },
      warnings,
      practicalNotes,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет раскладку и закупку: учитываются только введённые размеры, модуль, явный запас, фасовка и проектные позиции.",
        ],
      },
      summaryCards: [
        {
          icon: "□",
          label: "Площадь потолка",
          value: formatRuNumber(area),
          unit: "м²",
          hint: inputMode === 0 ? "по простой геометрии" : "по проекту",
          tone: "violet",
        },
        {
          icon: "≡",
          label: inputMode === 0 ? "Рядов реек" : "Реек по ведомости",
          value: String(inputMode === 0 ? railRows : layoutRailPieces),
          unit: "шт",
          hint: inputMode === 0
            ? `модуль ${formatRuNumber(railModuleWidthMm)} мм`
            : "до явного запаса",
          tone: "slate",
        },
        {
          icon: "▤",
          label: "Реек к покупке",
          value: String(purchaseRailPieces),
          unit: "шт",
          hint: railPiecesPerPack === 1
            ? `${projectPositionCount} ${plural(projectPositionCount, "проектная позиция", "проектные позиции", "проектных позиций")}`
            : `${railPacks} ${plural(railPacks, "упаковка", "упаковки", "упаковок")}`,
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Простое прямоугольное поле:**
- Ряды = ⌈ширина поперёк реек / монтажный модуль системы⌉
- Реек в ряду = ⌈длина вдоль реек / длина покупной рейки⌉
- Базовое число реек = ряды × рейки в ряду
- С явным запасом = ⌈базовое число × (1 + запас / 100)⌉
- К покупке = целые упаковки по фактической фасовке

**Сложная или диагональная раскладка:** готовое число реек переносится из проектной ведомости. Обрезки разных рядов не объединяются автоматически.

**Каркас и комплектующие:** направляющие, периметр, раскладка и монтажные элементы по умолчанию выключены и считаются только по проектным длинам или количеству.
  `,
  howToUse: [
    "Выберите простой прямоугольник или готовую проектную ведомость",
    "Для прямоугольника задайте размер вдоль реек, ширину поперёк и фактический модуль системы",
    "Введите длину покупной рейки, собственный запас и число реек в неделимой упаковке",
    "Для сложного, диагонального или комбинированного потолка перенесите готовое число реек из раскладки",
    "Добавляйте направляющие, периметр, вставку и монтажные элементы только по проектной ведомости",
    "Нажмите «Рассчитать» и проверьте ряды, стыки, упаковки и остаток",
  ],
  expertTips: [
    {
      title: "Считайте модуль, а не только лицевую ширину",
      content:
        "В открытой, закрытой, кубообразной и комбинированной системе повторяющийся шаг может включать зазор, руст или отдельную раскладку. Возьмите модуль из чертежа конкретного артикула.",
      author: "Проектировщик потолочных систем",
    },
    {
      title: "Разложите крайние ряды до заказа",
      content:
        "Симметричная раскладка и смещение оси могут изменить число реек, ширину добора и количество вставок. Светильники, люки и вентиляция также должны попасть в готовую карту потолка.",
      author: "Монтажник подвесных потолков",
    },
  ],
  faq: [
    {
      question: "Что вводить: ширину рейки или монтажный модуль?",
      answer:
        "Монтажный модуль — повторяющийся шаг рядов по документации системы. Он может совпадать с шириной панели либо включать руст, зазор или вставку. Для расчёта числа рядов нужен именно модуль.",
    },
    {
      question: "Почему калькулятор не считает стрингеры и подвесы по площади?",
      answer:
        "Их марка, направление, шаг, крайние отступы, длина и крепление зависят от конкретной системы, основания, высоты опуска, нагрузок и инженерных узлов. Перенесите готовые длины и количества из проекта.",
    },
    {
      question: "Можно ли сложить все погонные метры и разделить на длину рейки?",
      answer:
        "Не всегда. Если один ряд длиннее покупной рейки, каждому ряду нужны отдельные куски, а обрезок одного ряда может не подходить другому. Поэтому простой режим округляет число элементов внутри каждого ряда, а сложную карту лучше ввести готовой ведомостью.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор реечного потолка</h2>
<p>Калькулятор разделяет простую раскладку декоративных реек и проектную комплектацию подвесной системы. Для одного прямоугольного поля число рядов равно ширине поперёк реек, делённой на фактический монтажный модуль с округлением вверх. Число покупных реек считается отдельно внутри каждого ряда, поэтому короткие товарные элементы не объединяются в фиктивную общую длину.</p>
<p>Для диагонали, ниш, колонн, трапеции, кривых, комбинации разных модулей и неодинаковых рядов используйте готовое число реек из карты раскладки. Явный запас применяется один раз, затем результат округляется до фактической упаковки.</p>

<h2>Почему монтажный модуль важнее общего названия рейки</h2>
<p>Реечные системы различаются формой панели, замком, несущей направляющей, рустом, вставкой и повторяющимся шагом. На официальной странице <a href="https://www.cesal.ru/products/diy/" target="_blank" rel="noopener noreferrer">CESAL DIY</a> показано, что панель 85 мм с раскладкой 15 мм образует модуль 100 мм, а в других системах применяется иной состав ряда. В актуальном <a href="https://albes.ru/upload/iblock/64e/up9uwbrp6ux7quz0k491p0uax20qae0a/Albes_Celling_block_2025_sayt.pdf" target="_blank" rel="noopener noreferrer">каталоге потолочных решений ALBES</a> представлены разные формы, модули, длины и способы крепления. Поэтому калькулятор не подставляет универсальные 100, 150 или 200 мм по названию типа потолка.</p>

<h2>Формула простой раскладки</h2>
<ul>
  <li><strong>Площадь</strong> = длина поля вдоль реек × ширина поля поперёк;</li>
  <li><strong>ряды</strong> = ⌈ширина поперёк × 1000 / монтажный модуль в мм⌉;</li>
  <li><strong>реек в одном ряду</strong> = ⌈длина ряда / длина покупной рейки⌉;</li>
  <li><strong>базовое число реек</strong> = ряды × рейки в ряду;</li>
  <li><strong>с запасом</strong> = ⌈базовое число × (1 + ваш запас / 100)⌉;</li>
  <li><strong>к покупке</strong> = целые неделимые упаковки.</li>
</ul>
<p>Расчёт показывает чистую длину поля, длину закупочных элементов по раскладке и суммарный излишек после округления. Он не обещает повторное использование каждого обрезка: это проверяется картой реза.</p>

<h2>Каркас, периметр и крепёж</h2>
<p>Несущие направляющие, L-/П-профиль, раскладка или вставка и монтажные элементы по умолчанию выключены. Для них вводятся готовая проектная длина или количество, явный запас и товарный размер. Калькулятор не назначает универсальный шаг стрингеров, подвесов или крепежа и не переводит саморезы в килограммы по условной массе.</p>
<p>Отдельно проектируют светильники, люки, вентиляцию, датчики, пожарные устройства, усиления и доступ к коммуникациям. Совместимость замков, несущую способность, тип подвеса и крепление к основанию проверяют по документации принятой системы.</p>

<h2>Нормативная граница</h2>
<p>Действующий <a href="https://protect.gost.ru/gost/details/346d371b-7eb7-4be0-a7da-d18a7758931b" target="_blank" rel="noopener noreferrer">ГОСТ Р 70939-2023</a> распространяется на подвесные потолки и их элементы, устанавливает классификацию, технические требования, правила приёмки и методы испытаний. Он не задаёт одну раскладку, шаг каркаса или упаковку для всех реечных систем. Общие правила отделочных работ содержит действующий <a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017</a>. Конкретные размеры, нагрузки, крепления, область применения и монтаж берутся из технической документации производителя выбранной системы.</p>

<h2>Что подготовить для точной ведомости</h2>
<ul>
  <li>план потолка, направление реек и ось симметрии крайних рядов;</li>
  <li>артикул панели, фактический модуль, длину и допустимые стыки;</li>
  <li>ниши, колонны, перепады, люки и неодинаковые длины рядов;</li>
  <li>тип и раскладку несущих направляющих, периметра и подвесов;</li>
  <li>светильники, вентиляцию, датчики, пожарные устройства и усиления;</li>
  <li>цвет, партию, перфорацию, вставки и требования к доступу.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько реек нужно на потолок 3 × 2 м при модуле 100 мм?",
        answer:
          "<p>Если рейки идут вдоль стороны 3 м и покупная длина тоже 3 м, поперечная ширина 2 м даёт 20 рядов: 2000 / 100 = 20. На каждый ряд нужна одна рейка, поэтому базовый итог — 20 шт. Запас и упаковка применяются после этой раскладки.</p>",
      },
      {
        question: "Что будет, если рейка 3 м, а длина ряда 5 м?",
        answer:
          "<p>Простой режим округлит каждый ряд отдельно и заложит по две рейки на ряд. Он покажет излишек длины и предупредит о стыке. Допустимость стыка, соединитель, дополнительную опору и расположение швов нужно подтвердить документацией системы.</p>",
      },
      {
        question: "Как считать открытый потолок со вставкой?",
        answer:
          "<p>Для рядов введите полный повторяющийся монтажный модуль. Если проект предусматривает отдельную раскладку или вставку, включите соответствующий блок и перенесите её проектную длину и товарный размер. Не приравнивайте длину вставки к площади помещения.</p>",
      },
    ],
  },
};
