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
import ceilingStretchSpec from "../../../../configs/calculators/ceiling-stretch-canonical.v1.json";

const WEB_FORMULA_VERSION = "ceiling-stretch-web-project-v1";

const CEILING_TYPE_LABELS: Record<number, string> = {
  0: "система полотна не выбрана",
  1: "ПВХ-полотно",
  2: "тканевое полотно",
};

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
  value > 0 ? Math.ceil(value - 1e-10) : 0;

const applyReserve = (value: number, reservePercent: number): number =>
  round(value * (1 + reservePercent / 100), 6);

const formatRuNumber = (value: number, maximumFractionDigits = 3): string =>
  value.toLocaleString("ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });

const pluralRu = (
  value: number,
  one: string,
  few: string,
  many: string,
): string => {
  const integer = Math.abs(Math.trunc(value));
  const mod100 = integer % 100;
  const mod10 = integer % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const ceilingStretchDef: CalculatorDefinition = {
  id: "ceilings_stretch",
  slug: "natyazhnoj-potolok",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор натяжного потолка",
  h1: "Калькулятор натяжного потолка — площадь и проектные материалы",
  description:
    "Оцените площадь потолка для запроса сметы и добавьте только подтверждённые картой замера позиции: заказное полотно, профиль, вставку и монтажные узлы.",
  metaTitle: withSiteMetaTitle("Калькулятор натяжного потолка: площадь и профиль"),
  metaDescription:
    "Бесплатный калькулятор натяжного потолка: рассчитайте площадь для сметы и проектные профиль, вставку, узлы светильников и обходы труб без скрытых материалов.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: [
    "натяжной потолок",
    "площадь натяжного потолка",
    "профиль натяжного потолка",
    "полотно по замеру",
    "комплектующие потолка",
  ],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямоугольник по длине и ширине" },
        { value: 1, label: "Готовая площадь по обмеру" },
      ],
      group: "Помещение",
      fullWidth: true,
    },
    {
      key: "length",
      label: "Длина прямоугольного участка",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
      hint:
        "Для сложного контура используйте готовую площадь, но перед заказом всё равно нужна карта замера с диагоналями и узлами.",
    },
    {
      key: "width",
      label: "Ширина прямоугольного участка",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Готовая площадь потолка",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 20,
      group: "byArea",
      hint:
        "Площадь сложного контура по обмеру. Она не содержит периметр, диагонали, кривые, ниши и размеры заказного полотна.",
    },
    {
      key: "ceilingType",
      label: "Принятая система полотна",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не выбрана — только предварительная геометрия" },
        { value: 1, label: "ПВХ — по карте раскроя изготовителя" },
        { value: 2, label: "Тканевая — по инструкции системы" },
      ],
      group: "Полотно",
      fullWidth: true,
      hint:
        "Название не назначает ширину рулона, усадку, припуск, шов, крепление или пожарный класс. Эти параметры подтверждают по конкретному продукту.",
    },
    {
      key: "projectCanvasEnabled",
      label: "Есть готовая площадь заказного полотна",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — использую площадь только для сметы" },
        { value: 1, label: "Да — введу итог из карты раскроя" },
      ],
      group: "Полотно",
      fullWidth: true,
      hint:
        "Для ПВХ и ткани правила раскроя различаются. Вводите только готовый итог изготовителя или принятой системы, а не универсальный процент.",
    },
    {
      key: "projectCanvasOrderAreaM2",
      label: "Площадь полотна по карте раскроя",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Полотно",
      hideIf: { key: "projectCanvasEnabled", op: "eq", value: 0 },
      hint:
        "Готовая площадь заказа с учётом правил выбранной системы. Калькулятор не пересчитывает её повторно.",
    },
    {
      key: "profileEnabled",
      label: "Добавить основной профиль по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — длина и система не подтверждены" },
        { value: 1, label: "Да — введу длину и товарный профиль" },
      ],
      group: "Основной профиль",
      fullWidth: true,
      hint:
        "Длину берут из карты контура с нишами, коробами, колоннами и разделителями. Из одной площади она не выводится.",
    },
    {
      key: "projectProfileLengthM",
      label: "Длина основного профиля по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      group: "Основной профиль",
      hideIf: { key: "profileEnabled", op: "eq", value: 0 },
    },
    {
      key: "profileReservePercent",
      label: "Ваш запас профиля",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Основной профиль",
      hideIf: { key: "profileEnabled", op: "eq", value: 0 },
    },
    {
      key: "profilePieceLengthM",
      label: "Товарная длина одного профиля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 2.5,
      group: "Основной профиль",
      hideIf: { key: "profileEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина элемента выбранной профильной системы.",
    },
    {
      key: "insertEnabled",
      label: "Добавить декоративную вставку по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — узел примыкания не выбран" },
        { value: 1, label: "Да — введу длину и рулон" },
      ],
      group: "Вставка",
      fullWidth: true,
      hint:
        "Вставка нужна не каждой системе: возможны теневые, бесщелевые и другие примыкания.",
    },
    {
      key: "projectInsertLengthM",
      label: "Длина вставки по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      group: "Вставка",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "insertReservePercent",
      label: "Ваш запас вставки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Вставка",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "insertRollLengthM",
      label: "Длина одного рулона вставки",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 50,
      group: "Вставка",
      hideIf: { key: "insertEnabled", op: "eq", value: 0 },
    },
    {
      key: "lightingNodesEnabled",
      label: "Добавить монтажные комплекты светильников",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — светотехнический проект не готов" },
        { value: 1, label: "Да — введу готовое количество" },
      ],
      group: "Свет",
      fullWidth: true,
      hint:
        "Количество точек, тип платформ, колец, креплений и электрики принимают проектом. Калькулятор не подбирает светильники по площади.",
    },
    {
      key: "projectLightingNodeCount",
      label: "Комплектов узлов по ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      group: "Свет",
      hideIf: { key: "lightingNodesEnabled", op: "eq", value: 0 },
    },
    {
      key: "lightingNodesPerPack",
      label: "Комплектов в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      group: "Свет",
      hideIf: { key: "lightingNodesEnabled", op: "eq", value: 0 },
      hint:
        "Состав одного комплекта подтвердите отдельно: платформа, кольцо и крепёж не всегда продаются вместе.",
    },
    {
      key: "pipeBypassesEnabled",
      label: "Добавить обходы труб по ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — проходок нет или узлы не готовы" },
        { value: 1, label: "Да — введу готовое количество" },
      ],
      group: "Проходки",
      fullWidth: true,
      hint:
        "Диаметр, температура трубы, расположение и тип усиления должны быть согласованы с системой полотна.",
    },
    {
      key: "projectPipeBypassCount",
      label: "Обходов труб по ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      group: "Проходки",
      hideIf: { key: "pipeBypassesEnabled", op: "eq", value: 0 },
    },
    {
      key: "pipeBypassesPerPack",
      label: "Элементов обхода в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      group: "Проходки",
      hideIf: { key: "pipeBypassesEnabled", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const length = clamp(readNumber(inputs.length, 5), 1, 50);
    const width = clamp(readNumber(inputs.width, 4), 1, 50);
    const area = inputMode === 0
      ? round(length * width, 6)
      : round(clamp(readNumber(inputs.area, 20), 0.1, 10000), 6);
    const ceilingType = clampInteger(readNumber(inputs.ceilingType, 0), 0, 2);

    const projectCanvasEnabled = readNumber(inputs.projectCanvasEnabled, 0) > 0;
    const projectCanvasOrderAreaM2 = projectCanvasEnabled
      ? clamp(readNumber(inputs.projectCanvasOrderAreaM2, 0), 0, 100000)
      : 0;
    const canvasOrderConfirmed =
      projectCanvasEnabled && projectCanvasOrderAreaM2 > 0;
    const canvasOrderAreaM2 = round(
      canvasOrderConfirmed ? projectCanvasOrderAreaM2 : area,
      6,
    );

    const profileEnabled = readNumber(inputs.profileEnabled, 0) > 0;
    const projectProfileLengthM = profileEnabled
      ? clamp(readNumber(inputs.projectProfileLengthM, 0), 0, 100000)
      : 0;
    const profileReservePercent = profileEnabled
      ? clamp(readNumber(inputs.profileReservePercent, 0), 0, 30)
      : 0;
    const profilePieceLengthM = clamp(
      readNumber(inputs.profilePieceLengthM, 2.5),
      0.1,
      30,
    );
    const requiredProfileLengthM = applyReserve(
      projectProfileLengthM,
      profileReservePercent,
    );
    const profilePieces = ceilPositive(
      requiredProfileLengthM / profilePieceLengthM,
    );
    const purchaseProfileLengthM = round(
      profilePieces * profilePieceLengthM,
      6,
    );
    const leftoverProfileLengthM = round(
      Math.max(0, purchaseProfileLengthM - requiredProfileLengthM),
      6,
    );

    const insertEnabled = readNumber(inputs.insertEnabled, 0) > 0;
    const projectInsertLengthM = insertEnabled
      ? clamp(readNumber(inputs.projectInsertLengthM, 0), 0, 100000)
      : 0;
    const insertReservePercent = insertEnabled
      ? clamp(readNumber(inputs.insertReservePercent, 0), 0, 30)
      : 0;
    const insertRollLengthM = clamp(
      readNumber(inputs.insertRollLengthM, 50),
      0.1,
      10000,
    );
    const requiredInsertLengthM = applyReserve(
      projectInsertLengthM,
      insertReservePercent,
    );
    const insertRolls = ceilPositive(requiredInsertLengthM / insertRollLengthM);
    const purchaseInsertLengthM = round(insertRolls * insertRollLengthM, 6);
    const leftoverInsertLengthM = round(
      Math.max(0, purchaseInsertLengthM - requiredInsertLengthM),
      6,
    );

    const lightingNodesEnabled =
      readNumber(inputs.lightingNodesEnabled, 0) > 0;
    const projectLightingNodeCount = lightingNodesEnabled
      ? clampInteger(readNumber(inputs.projectLightingNodeCount, 0), 0, 100000)
      : 0;
    const lightingNodesPerPack = clampInteger(
      readNumber(inputs.lightingNodesPerPack, 1),
      1,
      10000,
    );
    const lightingNodePacks = ceilPositive(
      projectLightingNodeCount / lightingNodesPerPack,
    );
    const purchaseLightingNodeCount =
      lightingNodePacks * lightingNodesPerPack;

    const pipeBypassesEnabled = readNumber(inputs.pipeBypassesEnabled, 0) > 0;
    const projectPipeBypassCount = pipeBypassesEnabled
      ? clampInteger(readNumber(inputs.projectPipeBypassCount, 0), 0, 100000)
      : 0;
    const pipeBypassesPerPack = clampInteger(
      readNumber(inputs.pipeBypassesPerPack, 1),
      1,
      10000,
    );
    const pipeBypassPacks = ceilPositive(
      projectPipeBypassCount / pipeBypassesPerPack,
    );
    const purchasePipeBypassCount = pipeBypassPacks * pipeBypassesPerPack;

    const materials: MaterialResult[] = [
      {
        name: canvasOrderConfirmed
          ? "Полотно по карте раскроя изготовителя"
          : "Предварительная площадь полотна для сметы",
        subtitle: canvasOrderConfirmed
          ? `${CEILING_TYPE_LABELS[ceilingType]}; готовый итог карты раскроя без повторного коэффициента`
          : `${CEILING_TYPE_LABELS[ceilingType]}; площадь помещения не является размером заказной заготовки`,
        quantity: area,
        unit: "м²",
        withReserve: canvasOrderAreaM2,
        purchaseQty: canvasOrderAreaM2,
        category: "Полотно",
        highlight: true,
      },
    ];

    if (profileEnabled && projectProfileLengthM > 0) {
      materials.push({
        name: "Основной профиль по проекту",
        subtitle: `Товарный элемент ${formatRuNumber(profilePieceLengthM)} м; запас ${formatRuNumber(profileReservePercent)}%`,
        quantity: round(projectProfileLengthM, 6),
        unit: "м",
        withReserve: requiredProfileLengthM,
        purchaseQty: purchaseProfileLengthM,
        category: "Профиль",
        packageInfo: {
          count: profilePieces,
          size: profilePieceLengthM,
          packageUnit: "профилей",
        },
      });
    }

    if (insertEnabled && projectInsertLengthM > 0) {
      materials.push({
        name: "Декоративная вставка по проекту",
        subtitle: `Рулон ${formatRuNumber(insertRollLengthM)} м; запас ${formatRuNumber(insertReservePercent)}%`,
        quantity: round(projectInsertLengthM, 6),
        unit: "м",
        withReserve: requiredInsertLengthM,
        purchaseQty: purchaseInsertLengthM,
        category: "Примыкание",
        packageInfo: {
          count: insertRolls,
          size: insertRollLengthM,
          packageUnit: "рулонов",
        },
      });
    }

    if (lightingNodesEnabled && projectLightingNodeCount > 0) {
      materials.push({
        name: "Монтажные комплекты светильников по ведомости",
        subtitle: lightingNodesPerPack === 1
          ? "Поштучная закупка; состав комплекта проверяется отдельно"
          : `${lightingNodesPerPack} шт в неделимой упаковке; состав комплекта проверяется отдельно`,
        quantity: projectLightingNodeCount,
        unit: "шт",
        withReserve: projectLightingNodeCount,
        purchaseQty: purchaseLightingNodeCount,
        category: "Свет",
        packageInfo: {
          count: lightingNodePacks,
          size: lightingNodesPerPack,
          packageUnit: lightingNodesPerPack === 1 ? "штук" : "упаковок",
        },
      });
    }

    if (pipeBypassesEnabled && projectPipeBypassCount > 0) {
      materials.push({
        name: "Обходы труб по проектной ведомости",
        subtitle: pipeBypassesPerPack === 1
          ? "Поштучная закупка выбранного типоразмера"
          : `${pipeBypassesPerPack} шт в неделимой упаковке выбранного типоразмера`,
        quantity: projectPipeBypassCount,
        unit: "шт",
        withReserve: projectPipeBypassCount,
        purchaseQty: purchasePipeBypassCount,
        category: "Проходки",
        packageInfo: {
          count: pipeBypassPacks,
          size: pipeBypassesPerPack,
          packageUnit: pipeBypassesPerPack === 1 ? "штук" : "упаковок",
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
      exact_need: canvasOrderAreaM2,
      purchase_quantity: canvasOrderAreaM2,
      leftover: 0,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `plan_area_m2:${area}`,
        `ceiling_type:${ceilingType}`,
        `canvas_order_confirmed:${canvasOrderConfirmed ? 1 : 0}`,
        `canvas_order_area_m2:${canvasOrderAreaM2}`,
      ],
      key_factors: {
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: canvasOrderConfirmed
          ? "custom-canvas-order"
          : "preliminary-plan-area",
        package_size: canvasOrderAreaM2,
        packages_count: 1,
        unit: "м²",
      },
    };

    const warnings: string[] = [
      "Площадь потолка — база предварительной сметы, а не карта раскроя полотна. Для заказа нужны контур, длины сторон, диагонали, углы, кривые, ниши, проходки и правила выбранной системы.",
      `${CEILING_TYPE_LABELS[ceilingType]} не назначает ширину рулона, усадку или припуск, расположение шва, профиль и способ монтажа автоматически.`,
      "Профиль, вставка, разделители, карнизы, закладные, кольца, крепёж, проводка и обходы труб не выводятся из площади: добавляйте только готовые позиции проекта.",
      "Калькулятор не проектирует освещение, вентиляционные решётки, датчики, пожарные извещатели, акустику, высоту опуска и доступ к инженерным системам.",
      "Пожарные, санитарные и эксплуатационные характеристики проверяйте по документам конкретного полотна, профиля и помещения, а не по общему названию ПВХ или ткани.",
    ];

    if (!canvasOrderConfirmed) {
      warnings.push(
        "Готовая площадь заказного полотна не введена: основной результат остаётся предварительной площадью для запроса сметы.",
      );
    }
    if (projectCanvasEnabled && projectCanvasOrderAreaM2 <= 0) {
      warnings.push(
        "Карта раскроя включена, но её площадь равна 0 — используется только площадь помещения.",
      );
    }
    if (inputMode === 1) {
      warnings.push(
        "Готовая площадь не определяет периметр и геометрию контура. Линейные материалы вводите отдельными проектными длинами.",
      );
    }
    if (profileEnabled && projectProfileLengthM <= 0) {
      warnings.push(
        "Основной профиль включён, но проектная длина равна 0 — позиция не добавлена.",
      );
    }
    if (insertEnabled && projectInsertLengthM <= 0) {
      warnings.push(
        "Декоративная вставка включена, но проектная длина равна 0 — позиция не добавлена.",
      );
    }
    if (lightingNodesEnabled && projectLightingNodeCount <= 0) {
      warnings.push(
        "Комплекты светильников включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }
    if (pipeBypassesEnabled && projectPipeBypassCount <= 0) {
      warnings.push(
        "Обходы труб включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }
    if (ceilingType === 1) {
      warnings.push(
        "Для ПВХ-полотна технологию изготовления, коэффициенты раскроя, нагрев, сварные швы и допустимые приборы определяет документация системы и изготовитель.",
      );
    }
    if (ceilingType === 2) {
      warnings.push(
        "Для тканевого полотна проверьте доступную ширину конкретного артикула, припуски и необходимость промежуточного профиля; общая площадь этого не показывает.",
      );
    }

    const practicalNotes = [
      `Площадь потолка по введённой геометрии — ${formatRuNumber(area)} м².`,
      canvasOrderConfirmed
        ? `По готовой карте раскроя изготовителя в расчёт принято ${formatRuNumber(canvasOrderAreaM2)} м² полотна без дополнительного коэффициента.`
        : "Для запроса точной цены передайте замерщику план, все стороны, диагонали, углы, ниши, проходки и перечень встраиваемых элементов.",
      "До изготовления согласуйте тип полотна, цвет и фактуру, швы, примыкания, высоту опуска, профиль, карнизы, свет, вентиляцию и доступ к коммуникациям.",
      "Проверьте маркировку, сертификаты и документы пожарной безопасности именно выбранного артикула и области применения.",
    ];

    return {
      canonicalSpecId: ceilingStretchSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        ...(inputMode === 0
          ? { length: round(length, 6), width: round(width, 6) }
          : {}),
        area,
        ceilingType,
        canvasOrderConfirmed: canvasOrderConfirmed ? 1 : 0,
        canvasOrderAreaM2,
        projectProfileLengthM: round(projectProfileLengthM, 6),
        requiredProfileLengthM,
        profilePieces,
        purchaseProfileLengthM,
        leftoverProfileLengthM,
        projectInsertLengthM: round(projectInsertLengthM, 6),
        requiredInsertLengthM,
        insertRolls,
        purchaseInsertLengthM,
        leftoverInsertLengthM,
        projectLightingNodeCount,
        lightingNodePacks,
        purchaseLightingNodeCount,
        projectPipeBypassCount,
        pipeBypassPacks,
        purchasePipeBypassCount,
        minExactNeedArea: canvasOrderAreaM2,
        recExactNeedArea: canvasOrderAreaM2,
        maxExactNeedArea: canvasOrderAreaM2,
        minPurchaseArea: canvasOrderAreaM2,
        recPurchaseArea: canvasOrderAreaM2,
        maxPurchaseArea: canvasOrderAreaM2,
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
          "Режим точности не меняет площадь и ведомость: учитываются только введённая геометрия и явные проектные позиции.",
        ],
      },
      summaryCards: [
        {
          icon: "□",
          label: "Площадь потолка",
          value: formatRuNumber(area),
          unit: "м²",
          hint: "по введённой геометрии",
          tone: "violet",
        },
        {
          icon: canvasOrderConfirmed ? "✓" : "≈",
          label: canvasOrderConfirmed ? "Полотно по карте" : "Статус расчёта",
          value: canvasOrderConfirmed
            ? formatRuNumber(canvasOrderAreaM2)
            : "предварительный",
          unit: canvasOrderConfirmed ? "м²" : undefined,
          hint: canvasOrderConfirmed
            ? "без повторного коэффициента"
            : "нужна карта замера и раскроя",
          tone: "amber",
        },
        {
          icon: "▤",
          label: "Проектные позиции",
          value: String(Math.max(0, materials.length - 1)),
          unit: pluralRu(
            Math.max(0, materials.length - 1),
            "позиция",
            "позиции",
            "позиций",
          ),
          hint: "кроме предварительной площади",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Площадь потолка:** для прямоугольника равна длине × ширине; для сложного контура вводится готовая площадь по обмеру. Это предварительная база сметы, а не размер заказного полотна.

**Полотно:** точная площадь принимается только готовым итогом карты раскроя изготовителя или выбранной системы. Универсальная усадка, припуск или запас не подставляются.

**Комплектующие:** основной профиль, декоративная вставка, монтажные комплекты светильников и обходы труб по умолчанию выключены и считаются только по проектной длине или количеству и фактической фасовке.
  `,
  howToUse: [
    "Введите длину и ширину прямоугольного участка или готовую площадь сложного потолка",
    "Укажите принятую систему полотна только как контекст — она не подставит скрытые нормы",
    "Если изготовитель уже подготовил карту раскроя, включите блок и перенесите итоговую площадь полотна",
    "Добавьте профиль и вставку только по измеренным проектным длинам и товарным размерам",
    "Добавьте узлы светильников и обходы труб готовым количеством из ведомости",
    "Нажмите «Рассчитать» — получите предварительную площадь и только подтверждённые проектные позиции",
  ],
  expertTips: [
    {
      title: "Площадь не заменяет замерный лист",
      content:
        "Для изготовления нужны все стороны, диагонали, направление обхода точек, кривые, ниши, колонны и проходки. Даже прямоугольник стоит проверить диагоналями: фактические стены редко образуют идеальные 90 градусов.",
      author: "Монтажник натяжных потолков",
    },
    {
      title: "Сначала инженерные узлы",
      content:
        "До заказа полотна согласуйте светильники, люстры, карнизы, вентиляцию, датчики и доступ к коммуникациям. Их платформы и усиления определяют раскрой и монтажную ведомость.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему площадь комнаты не равна площади заказного полотна?",
      answer:
        "Потому что изготовление зависит от типа и артикула полотна, геометрии контура, правил раскроя системы, припусков или технологической усадки, доступной ширины и возможных швов. Точный итог должен прийти из карты раскроя изготовителя.",
    },
    {
      question: "Почему калькулятор не считает профиль по площади?",
      answer:
        "Одинаковая площадь может иметь разный периметр, число ниш, колонн, коробов и разделителей. Введите готовую длину из проекта и фактическую длину товарного профиля.",
    },
    {
      question: "Почему число светильников не подбирается автоматически?",
      answer:
        "Освещение рассчитывают по назначению помещения, требуемой освещённости, световому потоку, схеме, высоте и фотометрии приборов. Калькулятор принимает только готовое число монтажных узлов и не подменяет светотехнический проект.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор натяжного потолка</h2>
<p>Калькулятор разделяет предварительную геометрию и заказную ведомость. Для прямоугольника площадь равна <strong>S = L × W</strong>; для сложного контура вводится готовая площадь по обмеру. Этот результат подходит для запроса предварительной сметы, но не является картой раскроя.</p>
<p>Если изготовитель уже выдал итоговую площадь полотна, её можно включить отдельным полем. Калькулятор не добавляет к ней второй запас, усадку или сценарный коэффициент.</p>

<h2>Почему нельзя восстановить заказ из одних квадратных метров</h2>
<p>Для полотна нужны длины сторон, диагонали, углы, криволинейные участки, ниши, колонны, проходки и положение инженерных элементов. ПВХ и тканевые системы используют разные правила изготовления и крепления. Название материала не задаёт ширину артикула, припуски, технологическую усадку, швы и профиль.</p>
<p>Официальные рекомендации <a href="https://www.clipso.com/en/clipso-group-en/discover-clipso/answers-to-questions.html" target="_blank" rel="noopener noreferrer">CLIPSO по подготовке заказа</a> требуют фактические длину и ширину с системными припусками и отдельно отмечают промежуточный профиль для больших ширин. Каталог <a href="https://products.pongs.com/individual-application/stretch-ceiling?lang=en" target="_blank" rel="noopener noreferrer">PONGS для натяжных потолков</a> показывает, что доступные ширины и свойства зависят от конкретного артикула. Эти данные нельзя превращать в один универсальный коэффициент для любого ПВХ или тканевого полотна.</p>

<h2>Как считаются проектные материалы</h2>
<ul>
  <li><strong>Основной профиль</strong> — по готовой длине контура, вашему запасу и товарной длине элемента;</li>
  <li><strong>Декоративная вставка</strong> — только если она есть в принятом узле, по проектной длине, запасу и длине рулона;</li>
  <li><strong>Монтажные комплекты светильников</strong> — по готовому числу точек и фактической фасовке; состав платформы, кольца и крепежа проверяется отдельно;</li>
  <li><strong>Обходы труб</strong> — по ведомости и выбранному типоразмеру, а не по площади потолка.</li>
</ul>
<p>Разделительные и теневые профили, карнизы, люстры, вентиляционные решётки, датчики, пожарные извещатели, электрика и крепёж не появляются автоматически: для них нужны проектные узлы и совместимость системы.</p>

<h2>Нормативная граница</h2>
<p>Действующий <a href="https://protect.gost.ru/gost/details/c57927ba-11f0-4efd-bf15-2a34afac1e91" target="_blank" rel="noopener noreferrer">ГОСТ Р 59690-2021</a> устанавливает классификацию и технические требования к материалам и комплектующим для натяжных потолков. Он не превращает площадь помещения в готовый раскрой и не назначает характеристики любого товара по общему названию материала.</p>
<p>ГОСТ Р 56387-2018 относится к сухим цементным клеевым смесям и не является стандартом натяжных потолков. Пожарные, санитарные, эксплуатационные свойства и область применения проверяют по маркировке и документам конкретного полотна и комплектующих.</p>

<h2>Что передать для точной сметы</h2>
<ul>
  <li>план с последовательными длинами всех сторон и диагоналями;</li>
  <li>ниши, короба, колонны, кривые, уровни и высоту опуска;</li>
  <li>тип полотна и профильной системы, цвет, фактуру, швы и примыкания;</li>
  <li>светильники, люстры, карнизы, вентиляцию, датчики и проходки;</li>
  <li>требования к доступу, пожарной безопасности и условиям помещения.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько квадратных метров натяжного потолка нужно для комнаты 5 × 4 м?",
        answer:
          "<p>Площадь плана равна 20 м². Это корректная база для предварительной сметы, но не размер заказного полотна. Для точного изготовления нужны стороны, диагонали, углы, ниши, проходки и правила конкретной ПВХ- или тканевой системы. Готовый итог перенесите из карты раскроя изготовителя.</p>",
      },
      {
        question: "Можно ли посчитать багет как периметр квадрата из площади?",
        answer:
          "<p>Нет. Например, 20 м² могут быть прямоугольником 5 × 4 м с периметром 18 м или вытянутым помещением 10 × 2 м с периметром 24 м, не считая ниш и коробов. Введите измеренную проектную длину профиля.</p>",
      },
      {
        question: "Сколько светильников нужно для натяжного потолка?",
        answer:
          "<p>Тип потолка не определяет число светильников. Нужны назначение помещения, нормируемая освещённость, световой поток и фотометрия приборов, высота и схема. После светотехнического решения введите готовое число монтажных узлов; калькулятор округлит только их фактическую фасовку.</p>",
      },
    ],
  },
};
