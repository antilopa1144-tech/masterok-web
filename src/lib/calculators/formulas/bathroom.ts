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

const WEB_FORMULA_VERSION = "bathroom-web-tile-purchase-v1";

const ALLOWANCE_OPTIONS = [
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

interface TilePosition {
  areaM2: number;
  tileWidthMm: number;
  tileHeightMm: number;
  tileAreaM2: number;
  theoreticalPieces: number;
  basePieces: number;
  allowancePercent: number;
  requiredPieces: number;
  packagingMode: number;
  tilesPerBox: number;
  boxes: number;
  purchasePieces: number;
  purchasedSurplusPieces: number;
}

const calculateTilePosition = ({
  areaM2,
  tileWidthMm,
  tileHeightMm,
  allowancePercent,
  packagingMode,
  tilesPerBox,
}: {
  areaM2: number;
  tileWidthMm: number;
  tileHeightMm: number;
  allowancePercent: number;
  packagingMode: number;
  tilesPerBox: number;
}): TilePosition => {
  const tileAreaM2 = (tileWidthMm / 1000) * (tileHeightMm / 1000);
  const theoreticalPieces = tileAreaM2 > 0 ? areaM2 / tileAreaM2 : 0;
  const basePieces = ceilPositive(theoreticalPieces);
  const requiredPieces = ceilPositive(
    theoreticalPieces * (1 + allowancePercent / 100),
  );
  const boxes = packagingMode === 1
    ? ceilPositive(requiredPieces / tilesPerBox)
    : 0;
  const purchasePieces = packagingMode === 1
    ? boxes * tilesPerBox
    : requiredPieces;

  return {
    areaM2: round(areaM2, 6),
    tileWidthMm,
    tileHeightMm,
    tileAreaM2: round(tileAreaM2, 6),
    theoreticalPieces: round(theoreticalPieces, 6),
    basePieces,
    allowancePercent,
    requiredPieces,
    packagingMode,
    tilesPerBox,
    boxes,
    purchasePieces,
    purchasedSurplusPieces: Math.max(0, purchasePieces - requiredPieces),
  };
};

const buildTileMaterial = (
  label: string,
  position: TilePosition,
): MaterialResult => ({
  name: `${label} ${position.tileWidthMm}×${position.tileHeightMm} мм`,
  subtitle: position.packagingMode === 1
    ? `${formatRuNumber(position.areaM2)} м²; явный запас ${formatRuNumber(position.allowancePercent)}%; ${position.boxes} ${plural(position.boxes, "коробка", "коробки", "коробок")} × ${position.tilesPerBox} шт`
    : `${formatRuNumber(position.areaM2)} м²; явный запас ${formatRuNumber(position.allowancePercent)}%; фасовка не задана — показана поштучная потребность`,
  quantity: position.basePieces,
  unit: "шт",
  withReserve: position.requiredPieces,
  purchaseQty: position.purchasePieces,
  category: "Плитка",
  ...(position.packagingMode === 1
    ? {
        packageInfo: {
          count: position.boxes,
          size: position.tilesPerBox,
          packageUnit: "коробок",
        },
      }
    : {}),
});

export const bathroomDef: CalculatorDefinition = {
  id: "bathroom",
  slug: "vannaya-komnata",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор ванной комнаты",
  h1: "Калькулятор плитки для ванной — пол, стены и коробки",
  description:
    "Рассчитайте плитку для пола и стен ванной по обмеру или готовым площадям, с отдельным явным запасом и фасовкой каждой позиции.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор плитки для ванной: пол, стены, коробки",
  ),
  metaDescription:
    "Бесплатный калькулятор плитки для ванной: рассчитайте площадь пола и стен, количество плиток и коробок по фактической фасовке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "ванная",
    "плитка в ванную",
    "расчёт плитки в ванной",
    "плитка для пола ванной",
    "плитка для стен ванной",
    "сколько коробок плитки",
    "ремонт ванной",
  ],
  popularity: 85,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Как задана облицовка",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Размеры комнаты" },
        { value: 1, label: "Готовые площади" },
      ],
      hint:
        "Простая геометрия считает прямоугольный пол и четыре стены. Для ниш, коробов, экранов и разных зон используйте готовые площади из обмера или раскладки.",
      fullWidth: true,
    },
    {
      key: "includeFloorTile",
      label: "Считать плитку пола",
      type: "switch",
      defaultValue: 1,
      hint:
        "Отключите, если пол будет выполнен другим материалом или эта позиция уже посчитана отдельно.",
    },
    {
      key: "includeWallTile",
      label: "Считать плитку стен",
      type: "switch",
      defaultValue: 1,
      hint:
        "Отключите, если облицовываются только отдельные зоны и их удобнее внести отдельной готовой площадью.",
    },
    {
      key: "lengthM",
      label: "Длина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 2.5,
      hint: "Внутренний размер по готовой плоскости облицовки.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "widthM",
      label: "Ширина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 1.7,
      hint: "Внутренний размер по готовой плоскости облицовки.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "heightM",
      label: "Высота облицовки стен",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 2.5,
      hint:
        "Фактическая высота облицовки, а не обязательно высота помещения до потолка.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 0 },
        { key: "includeWallTile", op: "eq", value: 0 },
      ],
    },
    {
      key: "openingAreaM2",
      label: "Проёмы и необлицовываемые зоны",
      type: "number",
      unit: "м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 1.47,
      hint:
        "Суммарная площадь двери, окна и других зон, которые нужно вычесть из четырёх стен. Ниши и короба, наоборот, добавьте через готовую площадь.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 0 },
        { key: "includeWallTile", op: "eq", value: 0 },
      ],
    },
    {
      key: "floorAreaM2",
      label: "Готовая площадь пола",
      type: "number",
      unit: "м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 4.25,
      hint: "Чистая площадь облицовки пола из обмера или проекта, до запаса.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeFloorTile", op: "eq", value: 0 },
      ],
    },
    {
      key: "wallAreaM2",
      label: "Готовая площадь стен",
      type: "number",
      unit: "м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 19.53,
      hint:
        "Сумма всех облицовываемых плоскостей стен из обмера или раскладки, до запаса.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeWallTile", op: "eq", value: 0 },
      ],
    },
    {
      key: "floorTileWidthMm",
      label: "Ширина напольной плитки",
      type: "number",
      unit: "мм",
      min: 10,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 300,
      hint: "Номинальный размер выбранной коллекции по карточке товара.",
      group: "Напольная плитка",
      hideIf: { key: "includeFloorTile", op: "eq", value: 0 },
    },
    {
      key: "floorTileHeightMm",
      label: "Длина напольной плитки",
      type: "number",
      unit: "мм",
      min: 10,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 300,
      hint: "Второй номинальный размер выбранной коллекции.",
      group: "Напольная плитка",
      hideIf: { key: "includeFloorTile", op: "eq", value: 0 },
    },
    {
      key: "floorAllowancePercent",
      label: "Запас напольной плитки",
      type: "select",
      unit: "%",
      defaultValue: 10,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Выберите запас осознанно по раскладке, рисунку, подрезке и возможности добрать ту же партию. Калькулятор применит его один раз.",
      group: "Напольная плитка",
      hideIf: { key: "includeFloorTile", op: "eq", value: 0 },
    },
    {
      key: "floorPackagingMode",
      label: "Как покупать напольную плитку",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Поштучно / фасовка неизвестна" },
        { value: 1, label: "Целыми коробками" },
      ],
      hint:
        "Если магазин продаёт только коробками, выберите второй вариант и перепишите количество плиток из маркировки упаковки.",
      group: "Напольная плитка",
      hideIf: { key: "includeFloorTile", op: "eq", value: 0 },
      fullWidth: true,
    },
    {
      key: "floorTilesPerBox",
      label: "Напольных плиток в коробке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 10,
      hint:
        "Фактическое количество по этикетке конкретного артикула. Формат плитки сам по себе фасовку не определяет.",
      group: "Напольная плитка",
      hideIf: [
        { key: "includeFloorTile", op: "eq", value: 0 },
        { key: "floorPackagingMode", op: "ne", value: 1 },
      ],
    },
    {
      key: "wallTileWidthMm",
      label: "Ширина настенной плитки",
      type: "number",
      unit: "мм",
      min: 10,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 200,
      hint: "Номинальный размер выбранной коллекции по карточке товара.",
      group: "Настенная плитка",
      hideIf: { key: "includeWallTile", op: "eq", value: 0 },
    },
    {
      key: "wallTileHeightMm",
      label: "Длина настенной плитки",
      type: "number",
      unit: "мм",
      min: 10,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 300,
      hint: "Второй номинальный размер выбранной коллекции.",
      group: "Настенная плитка",
      hideIf: { key: "includeWallTile", op: "eq", value: 0 },
    },
    {
      key: "wallAllowancePercent",
      label: "Запас настенной плитки",
      type: "select",
      unit: "%",
      defaultValue: 10,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Запас для стен задаётся отдельно: раскладка, декоры, ниши и повторное использование обрезков могут отличаться от пола.",
      group: "Настенная плитка",
      hideIf: { key: "includeWallTile", op: "eq", value: 0 },
    },
    {
      key: "wallPackagingMode",
      label: "Как покупать настенную плитку",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Поштучно / фасовка неизвестна" },
        { value: 1, label: "Целыми коробками" },
      ],
      hint:
        "Коробка считается только по введённому количеству плиток, без попытки угадать фасовку по формату.",
      group: "Настенная плитка",
      hideIf: { key: "includeWallTile", op: "eq", value: 0 },
      fullWidth: true,
    },
    {
      key: "wallTilesPerBox",
      label: "Настенных плиток в коробке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 25,
      hint:
        "Фактическое количество по этикетке конкретного артикула. Проверьте также тон, калибр и номер партии.",
      group: "Настенная плитка",
      hideIf: [
        { key: "includeWallTile", op: "eq", value: 0 },
        { key: "wallPackagingMode", op: "ne", value: 1 },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const includeFloorTile = readNumber(inputs.includeFloorTile, 1) >= 0.5 ? 1 : 0;
    const includeWallTile = readNumber(inputs.includeWallTile, 1) >= 0.5 ? 1 : 0;
    const lengthM = clamp(readNumber(inputs.lengthM, 2.5), 0.1, 100);
    const widthM = clamp(readNumber(inputs.widthM, 1.7), 0.1, 100);
    const heightM = clamp(readNumber(inputs.heightM, 2.5), 0.1, 20);
    const openingAreaM2 = clamp(readNumber(inputs.openingAreaM2, 1.47), 0, 10000);
    const grossWallAreaM2 = inputMode === 0 ? 2 * (lengthM + widthM) * heightM : 0;
    const appliedOpeningAreaM2 = inputMode === 0
      ? Math.min(openingAreaM2, grossWallAreaM2)
      : 0;
    const floorAreaM2 = includeFloorTile
      ? inputMode === 0
        ? lengthM * widthM
        : clamp(readNumber(inputs.floorAreaM2, 4.25), 0, 10000)
      : 0;
    const wallAreaM2 = includeWallTile
      ? inputMode === 0
        ? Math.max(0, grossWallAreaM2 - appliedOpeningAreaM2)
        : clamp(readNumber(inputs.wallAreaM2, 19.53), 0, 10000)
      : 0;

    const floorPosition = calculateTilePosition({
      areaM2: floorAreaM2,
      tileWidthMm: clampInteger(readNumber(inputs.floorTileWidthMm, 300), 10, 5000),
      tileHeightMm: clampInteger(readNumber(inputs.floorTileHeightMm, 300), 10, 5000),
      allowancePercent: clamp(readNumber(inputs.floorAllowancePercent, 10), 0, 100),
      packagingMode: clampInteger(readNumber(inputs.floorPackagingMode, 0), 0, 1),
      tilesPerBox: clampInteger(readNumber(inputs.floorTilesPerBox, 10), 1, 1000),
    });
    const wallPosition = calculateTilePosition({
      areaM2: wallAreaM2,
      tileWidthMm: clampInteger(readNumber(inputs.wallTileWidthMm, 200), 10, 5000),
      tileHeightMm: clampInteger(readNumber(inputs.wallTileHeightMm, 300), 10, 5000),
      allowancePercent: clamp(readNumber(inputs.wallAllowancePercent, 10), 0, 100),
      packagingMode: clampInteger(readNumber(inputs.wallPackagingMode, 0), 0, 1),
      tilesPerBox: clampInteger(readNumber(inputs.wallTilesPerBox, 25), 1, 1000),
    });

    const materials: MaterialResult[] = [];
    if (includeFloorTile && floorPosition.areaM2 > 0) {
      materials.push(buildTileMaterial("Напольная плитка", floorPosition));
    }
    if (includeWallTile && wallPosition.areaM2 > 0) {
      materials.push(buildTileMaterial("Настенная плитка", wallPosition));
    }

    const selectedAreaM2 = round(floorAreaM2 + wallAreaM2, 6);
    const basePieces = floorPosition.basePieces + wallPosition.basePieces;
    const requiredPieces = floorPosition.requiredPieces + wallPosition.requiredPieces;
    const purchasePieces = floorPosition.purchasePieces + wallPosition.purchasePieces;
    const selectedPositionCount = materials.length;
    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode =
      requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: basePieces,
      purchase_quantity: purchasePieces,
      leftover: Math.max(0, purchasePieces - basePieces),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `input_mode:${inputMode}`,
        `selected_positions:${selectedPositionCount}`,
        `floor_allowance_percent:${round(floorPosition.allowancePercent, 6)}`,
        `wall_allowance_percent:${round(wallPosition.allowancePercent, 6)}`,
        "no_hidden_scenario_multiplier",
      ],
      key_factors: {
        hidden_multiplier: 1,
        input_mode: inputMode,
        selected_positions: selectedPositionCount,
      },
      buy_plan: {
        package_label: "bathroom-tile-pieces-by-position",
        package_size: 1,
        packages_count: purchasePieces,
        unit: "шт",
      },
    };

    const warnings: string[] = [
      "Расчёт по площади не заменяет раскладку по отдельным плоскостям: ниши, короба, экран ванны, декоры, рисунок, швы и повторное использование обрезков нужно проверить на схеме.",
      "Запас задаётся отдельно для пола и стен и применяется ровно один раз. Это пользовательское решение, а не скрытая нормативная надбавка.",
      "Фасовка плитки зависит от конкретного артикула. Если выбрана закупка коробками, перепишите количество плиток из этикетки и закажите один тон, калибр и партию.",
      "Клей, затирка, грунт, гидроизоляция, герметик, профили и расходники автоматически не добавляются: рассчитайте их отдельными калькуляторами по проекту и техкартам совместимой системы.",
    ];
    if (inputMode === 0 && openingAreaM2 > grossWallAreaM2) {
      warnings.push(
        `Вычитаемая площадь ${formatRuNumber(openingAreaM2)} м² больше площади четырёх стен ${formatRuNumber(grossWallAreaM2)} м². В расчёте вычет ограничен площадью стен.`,
      );
    }
    if (selectedPositionCount === 0) {
      warnings.push(
        "Нет позиции к закупке: включите плитку пола или стен и задайте ненулевую площадь.",
      );
    }

    const geometryNote = inputMode === 0
      ? `Пол: ${formatRuNumber(lengthM)} × ${formatRuNumber(widthM)} = ${formatRuNumber(floorAreaM2)} м². Стены: 2 × (${formatRuNumber(lengthM)} + ${formatRuNumber(widthM)}) × ${formatRuNumber(heightM)} − ${formatRuNumber(appliedOpeningAreaM2)} = ${formatRuNumber(wallAreaM2)} м².`
      : `Приняты готовые площади: пол ${formatRuNumber(floorAreaM2)} м², стены ${formatRuNumber(wallAreaM2)} м².`;
    const positionNote = (label: string, position: TilePosition): string =>
      `${label}: ${formatRuNumber(position.areaM2)} / ${formatRuNumber(position.tileAreaM2)} = ${formatRuNumber(position.theoreticalPieces)} шт по площади; с запасом ${formatRuNumber(position.allowancePercent)}% требуется ${position.requiredPieces} шт; к покупке ${position.purchasePieces} шт${position.packagingMode === 1 ? ` (${position.boxes} ${plural(position.boxes, "коробка", "коробки", "коробок")} по ${position.tilesPerBox} шт)` : ""}.`;
    const practicalNotes = [
      geometryNote,
      ...(includeFloorTile && floorPosition.areaM2 > 0 ? [positionNote("Пол", floorPosition)] : []),
      ...(includeWallTile && wallPosition.areaM2 > 0 ? [positionNote("Стены", wallPosition)] : []),
      "До заказа разложите плитку по каждой плоскости, согласуйте стартовые оси и подрезки, затем сверьте артикул, тон, калибр, партию и фасовку на коробке.",
    ];

    return {
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        includeFloorTile,
        includeWallTile,
        lengthM: round(lengthM, 6),
        widthM: round(widthM, 6),
        heightM: round(heightM, 6),
        grossWallAreaM2: round(grossWallAreaM2, 6),
        openingAreaM2: round(openingAreaM2, 6),
        appliedOpeningAreaM2: round(appliedOpeningAreaM2, 6),
        floorAreaM2: round(floorAreaM2, 6),
        wallAreaM2: round(wallAreaM2, 6),
        selectedAreaM2,
        selectedPositionCount,
        floorTileAreaM2: floorPosition.tileAreaM2,
        floorTheoreticalPieces: floorPosition.theoreticalPieces,
        floorBasePieces: floorPosition.basePieces,
        floorAllowancePercent: round(floorPosition.allowancePercent, 6),
        floorRequiredPieces: floorPosition.requiredPieces,
        floorBoxes: floorPosition.boxes,
        floorPurchasePieces: floorPosition.purchasePieces,
        floorPurchasedSurplusPieces: floorPosition.purchasedSurplusPieces,
        wallTileAreaM2: wallPosition.tileAreaM2,
        wallTheoreticalPieces: wallPosition.theoreticalPieces,
        wallBasePieces: wallPosition.basePieces,
        wallAllowancePercent: round(wallPosition.allowancePercent, 6),
        wallRequiredPieces: wallPosition.requiredPieces,
        wallBoxes: wallPosition.boxes,
        wallPurchasePieces: wallPosition.purchasePieces,
        wallPurchasedSurplusPieces: wallPosition.purchasedSurplusPieces,
        basePieces,
        requiredPieces,
        purchasePieces,
        minExactNeed: basePieces,
        recExactNeed: basePieces,
        maxExactNeed: basePieces,
        minPurchase: purchasePieces,
        recPurchase: purchasePieces,
        maxPurchase: purchasePieces,
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
          "Режим точности не меняет закупку: калькулятор использует только введённые площади, размеры плитки, два явных запаса и фактические фасовки.",
        ],
      },
      summaryCards: [
        {
          icon: "▱",
          label: "Площадь облицовки",
          value: formatRuNumber(selectedAreaM2),
          unit: "м²",
          hint: inputMode === 0 ? "по простой геометрии" : "по готовым площадям",
          tone: "slate",
        },
        {
          icon: "▦",
          label: "Плитка пола",
          value: includeFloorTile && floorPosition.areaM2 > 0 ? String(floorPosition.purchasePieces) : "—",
          unit: includeFloorTile && floorPosition.areaM2 > 0 ? "шт" : undefined,
          hint: includeFloorTile && floorPosition.areaM2 > 0
            ? floorPosition.packagingMode === 1
              ? `${floorPosition.boxes} ${plural(floorPosition.boxes, "коробка", "коробки", "коробок")}`
              : "поштучная потребность"
            : "не выбрана",
          tone: "amber",
        },
        {
          icon: "▤",
          label: "Плитка стен",
          value: includeWallTile && wallPosition.areaM2 > 0 ? String(wallPosition.purchasePieces) : "—",
          unit: includeWallTile && wallPosition.areaM2 > 0 ? "шт" : undefined,
          hint: includeWallTile && wallPosition.areaM2 > 0
            ? wallPosition.packagingMode === 1
              ? `${wallPosition.boxes} ${plural(wallPosition.boxes, "коробка", "коробки", "коробок")}`
              : "поштучная потребность"
            : "не выбрана",
          tone: "emerald",
        },
      ],
      hidePrimaryMaterialBadge: true,
    };
  },
  formulaDescription: `
**Простая геометрия:**
- Пол = длина × ширина
- Стены = 2 × (длина + ширина) × высота облицовки − суммарная площадь проёмов и необлицовываемых зон

**Каждая позиция плитки считается отдельно:**
- Теоретическое количество = площадь облицовки / (ширина плитки × длина плитки)
- С явным запасом = ⌈теоретическое количество × (1 + запас / 100)⌉
- При закупке коробками = ⌈количество с запасом / плиток в коробке⌉ целых коробок

Скрытых запасов и множителей MIN/REC/MAX нет. Клей, затирка, грунт, гидроизоляция, герметики, профили и расходники в результат не подмешиваются.
  `,
  howToUse: [
    "Выберите простую комнату или готовые площади из обмера и раскладки",
    "Включите нужные позиции: плитку пола, стен или обе",
    "Введите фактические размеры каждого артикула и отдельный осознанный запас",
    "Если плитка продаётся коробками, перепишите количество штук с этикетки",
    "После расчёта проверьте раскладку, партию и связанные материалы в отдельных калькуляторах",
  ],
  expertTips: [
    {
      title: "Сначала раскладка, затем закупка",
      content:
        "Общая площадь не показывает ширину крайних подрезок и повторное использование обрезков. Для дорогой плитки и сложной ванной сначала разложите каждую стену, нишу, короб и экран.",
      author: "Мастер-отделочник",
    },
    {
      title: "Не смешивайте партии",
      content:
        "Перед оплатой сверяйте на всех коробках артикул, тон, калибр и номер партии. Добор того же рисунка позже может отличаться по оттенку и размеру.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Сколько плитки нужно на ванную 2,5 × 1,7 м?",
      answer:
        "Зависит от высоты облицовки, площади проёмов, размеров плитки, раскладки, выбранного запаса и фасовки. При стандартных полях калькулятор отдельно покажет пол и стены, а не смешает два артикула в одну коробку.",
    },
    {
      question: "Почему калькулятор не добавляет клей и гидроизоляцию?",
      answer:
        "Их нельзя надёжно вывести только из размеров ванной. Расход клея зависит от продукта, основания, зуба шпателя и способа нанесения; гидроизоляция — от проектных зон, узлов, слоёв и техкарты системы. Для них есть отдельные калькуляторы с подходящими входными данными.",
    },
    {
      question: "Можно ли определить число коробок только по размеру плитки?",
      answer:
        "Нет. У разных артикулов одного формата бывает разное число плиток и квадратных метров в коробке. Введите количество штук с этикетки конкретного товара.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор плитки для ванной</h2>
<p>Калькулятор ведёт две независимые закупочные позиции: плитку для пола и плитку для стен. Для простой прямоугольной комнаты площадь пола равна длине, умноженной на ширину. Площадь стен считается по периметру и фактической высоте облицовки, затем из неё вычитается суммарная площадь двери, окна и других необлицовываемых зон.</p>
<p>Если в ванной есть ниши, короба, экран, акцентная плитка, разные высоты или сложные проёмы, выберите режим готовых площадей. В него переносится чистая площадь каждой позиции из обмера или раскладки.</p>

<h2>Формула количества плитки и коробок</h2>
<p><strong>N<sub>теор</sub> = S / (A × B)</strong>, где S — площадь облицовки, A и B — номинальные размеры плитки в метрах.</p>
<p><strong>N<sub>с запасом</sub> = ⌈N<sub>теор</sub> × (1 + Z / 100)⌉</strong>, где Z — выбранный пользователем запас.</p>
<p><strong>Коробки = ⌈N<sub>с запасом</sub> / N<sub>в коробке</sub>⌉</strong>. Пол и стены округляются отдельно, потому что это обычно разные артикулы и разные фасовки.</p>
<p>Калькулятор не назначает «правильный» процент автоматически. Запас зависит от раскладки, рисунка, количества углов и подрезок, повторного использования обрезков, хрупкости материала и возможности позже купить ту же партию.</p>

<h2>Почему фасовку нужно брать с коробки</h2>
<p>Номинальный формат не определяет упаковку. Например, в официальной карточке одной плитки Kerama Marazzi 20 × 30 см указано 25 штук и 1,5 м² в коробке. У другого артикула или формата значения будут другими, поэтому калькулятор просит фактическое число плиток с этикетки.</p>
<p>Перед заказом сверьте артикул, тон, калибр и номер партии. Количество коробок показывает закупочное округление, но не подтверждает визуальную раскладку по стенам.</p>

<h2>Связанные расчёты ремонта ванной</h2>
<p>Комплексная закупка собирается из проверяемых расчётов, а не из универсальных коэффициентов. Отдельно рассчитайте <a href="/kalkulyatory/poly/klej-dlya-plitki/">плиточный клей по техкарте продукта</a>, <a href="/kalkulyatory/poly/zatirka/">затирку по геометрии шва</a> и <a href="/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/">гидроизоляционный состав по проектной площади</a>. Совместимость грунта, клея, гидроизоляции, затирки и герметика подтверждают документы выбранной системы.</p>

<h2>Нормативная и товарная проверка</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/11c8f68d-d224-42fa-8a93-812cd157e1d0" target="_blank" rel="noopener noreferrer">ГОСТ 13996-2019</a> — действующие общие технические условия для керамических плиток и плит из них.</li>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017 с изменениями</a> — требования к изоляционным и отделочным покрытиям.</li>
  <li><a href="https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430" target="_blank" rel="noopener noreferrer">СП 29.13330.2011 с изменениями</a> — требования к полам.</li>
  <li><a href="https://kerama-marazzi.com/catalog/ceramic_tile/8376/" target="_blank" rel="noopener noreferrer">Пример официальной карточки плитки 20 × 30 см</a> — показывает товарную фасовку конкретного артикула.</li>
</ul>
`,
    faq: [
      {
        question: "Как посчитать площадь стен ванной под плитку?",
        answer:
          "<p>Для простой прямоугольной комнаты используйте формулу 2 × (длина + ширина) × высота облицовки. Затем вычтите суммарную площадь двери, окна и других зон без плитки.</p><p>Ниши, короба, экран ванны и разные высоты лучше обмерить по отдельным плоскостям и внести итог в режиме готовых площадей.</p>",
      },
      {
        question: "Какой запас плитки выбрать для ванной?",
        answer:
          "<p>Единого процента для любой ванной нет. Он зависит от схемы укладки, рисунка, подрезок, ниш, коробов, количества углов и возможности использовать обрезки повторно.</p><p>Выберите запас по фактической раскладке. Калькулятор применит введённое значение один раз и отдельно для пола и стен.</p>",
      },
      {
        question: "Почему после округления до коробок остаётся лишняя плитка?",
        answer:
          "<p>Магазин часто продаёт плитку неделимыми коробками. Калькулятор сначала получает целое число плиток с выбранным запасом, затем округляет его вверх до фактической фасовки артикула.</p><p>Разница между плитками в купленных коробках и потребностью с запасом показана как остаток от фасовки.</p>",
      },
      {
        question: "Считает ли калькулятор гидроизоляцию, клей и затирку?",
        answer:
          "<p>Нет, и это намеренное ограничение. Расходы этих материалов нельзя безопасно назначить только по площади ванной: нужны техкарта продукта, основание, схема мокрых зон, число слоёв, параметры шва и способ нанесения.</p><p>Используйте связанные калькуляторы, затем проверьте совместимость всей системы.</p>",
      },
    ],
  },
};
