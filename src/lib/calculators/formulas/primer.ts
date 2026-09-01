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
import primerSpec from "../../../../configs/calculators/primer-canonical.v1.json";

const WEB_FORMULA_VERSION = "primer-web-passport-v1";

const ALLOWANCE_OPTIONS = [
  { value: 0, label: "0% — без надбавки" },
  { value: 3, label: "3%" },
  { value: 5, label: "5%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
  { value: 25, label: "25%" },
  { value: 30, label: "30%" },
];

const PURPOSE_NAMES: Record<number, string> = {
  0: "Грунтовка выбранного продукта",
  1: "Грунтовка глубокого проникновения по техкарте",
  2: "Адгезионная грунтовка по техкарте",
  3: "Грунтовка под финишное покрытие по техкарте",
};

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

export const primerDef: CalculatorDefinition = {
  id: "mixes_primer",
  slug: "gruntovka",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор грунтовки",
  h1: "Калькулятор грунтовки — расход по техкарте и упаковка",
  description:
    "Рассчитайте одну однородную позицию грунтовки по готовой площади или простой геометрии комнаты, паспортному расходу, числу слоёв и фактической упаковке.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор грунтовки: расход по техкарте и упаковка",
  ),
  metaDescription:
    "Бесплатный калькулятор грунтовки: рассчитайте потребность по площади, расходу из техкарты и слоям, затем округлите закупку по фактической упаковке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "грунтовка",
    "расход грунтовки",
    "техкарта грунтовки",
    "грунтовка стен",
    "грунтовка потолка",
    "адгезионная грунтовка",
    "грунтовка глубокого проникновения",
  ],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Как задана площадь",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Готовая площадь" },
        { value: 1, label: "Прямоугольная комната" },
      ],
      hint:
        "Считайте одну однородную позицию: один продукт, одинаковая норма и одинаковое число слоёв на всей выбранной площади.",
      fullWidth: true,
    },
    {
      key: "projectAreaM2",
      label: "Площадь грунтования",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100000,
      step: 0.1,
      defaultValue: 50,
      hint:
        "Готовая чистая площадь однородного основания из обмера или проекта.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "roomWidthM",
      label: "Ширина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 4,
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "roomLengthM",
      label: "Длина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 5,
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "roomHeightM",
      label: "Высота комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 2.7,
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "openingAreaM2",
      label: "Площадь проёмов в стенах",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 3.6,
      hint: "Сумма дверей, окон и других участков стен без грунтования.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "surfaceScope",
      label: "Какие поверхности считать",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Только стены" },
        { value: 1, label: "Только потолок" },
        { value: 2, label: "Только пол" },
        { value: 3, label: "Стены и потолок" },
      ],
      hint:
        "Объединяйте стены и потолок только если для них выбран один продукт, одна паспортная норма и одинаковое число слоёв.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "primerPurpose",
      label: "Название позиции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Грунтовка выбранного продукта" },
        { value: 1, label: "Глубокого проникновения" },
        { value: 2, label: "Адгезионная" },
        { value: 3, label: "Под финишное покрытие" },
      ],
      hint:
        "Название меняет только подпись результата. Совместимость с основанием и следующим покрытием проверяйте по техкарте.",
    },
    {
      key: "quantityUnit",
      label: "Единица техкарты и упаковки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Литры" },
        { value: 1, label: "Килограммы" },
      ],
      hint:
        "Используйте одну единицу для расхода и фасовки. Калькулятор не переводит литры в килограммы без плотности конкретного продукта.",
    },
    {
      key: "passportConsumptionPerM2",
      label: "Расход из техкарты на один слой",
      type: "number",
      unit: "л или кг/м²",
      min: 0.001,
      max: 50,
      step: 0.001,
      defaultValue: 0.1,
      hint:
        "Введите расход выбранного продукта для вашего основания и способа нанесения. Если дана вилка, значение уточняют по техкарте и пробному участку.",
      fullWidth: true,
    },
    {
      key: "coatCount",
      label: "Число слоёв по техкарте",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя" },
        { value: 3, label: "3 слоя" },
        { value: 4, label: "4 слоя" },
      ],
      hint:
        "Не добавляйте слой автоматически: повторное нанесение, разбавление и межслойную сушку задаёт производитель.",
    },
    {
      key: "allowancePercent",
      label: "Явная надбавка к расходу",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Надбавка применяется один раз. Основание и способ нанесения лучше учитывать в паспортном расходе, а не дублировать скрытыми коэффициентами.",
    },
    {
      key: "packageSize",
      label: "Фактическая фасовка",
      type: "number",
      unit: "л или кг",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 5,
      hint:
        "Введите количество литров или килограммов в одной неделимой упаковке выбранного артикула.",
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const projectAreaM2 = clamp(
      readNumber(inputs.projectAreaM2, 50),
      0,
      100000,
    );
    const roomWidthM = clamp(readNumber(inputs.roomWidthM, 4), 0.1, 1000);
    const roomLengthM = clamp(
      readNumber(inputs.roomLengthM, 5),
      0.1,
      1000,
    );
    const roomHeightM = clamp(
      readNumber(inputs.roomHeightM, 2.7),
      0.1,
      100,
    );
    const openingAreaM2 = clamp(
      readNumber(inputs.openingAreaM2, 3.6),
      0,
      100000,
    );
    const surfaceScope = clampInteger(
      readNumber(inputs.surfaceScope, 0),
      0,
      3,
    );
    const primerPurpose = clampInteger(
      readNumber(inputs.primerPurpose, 0),
      0,
      3,
    );
    const quantityUnit = clampInteger(
      readNumber(inputs.quantityUnit, 0),
      0,
      1,
    );
    const passportConsumptionPerM2 = clamp(
      readNumber(inputs.passportConsumptionPerM2, 0.1),
      0.001,
      50,
    );
    const coatCount = clampInteger(readNumber(inputs.coatCount, 1), 1, 4);
    const allowancePercent = clamp(
      readNumber(inputs.allowancePercent, 0),
      0,
      30,
    );
    const packageSize = clamp(
      readNumber(inputs.packageSize, 5),
      0.1,
      10000,
    );
    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode;
    const accuracyMode: AccuracyMode = [
      "basic",
      "realistic",
      "professional",
      "custom",
    ].includes(requestedAccuracyMode)
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const grossWallAreaM2 = round(
      2 * (roomWidthM + roomLengthM) * roomHeightM,
      6,
    );
    const appliedOpeningAreaM2 = Math.min(openingAreaM2, grossWallAreaM2);
    const netWallAreaM2 = round(
      Math.max(0, grossWallAreaM2 - appliedOpeningAreaM2),
      6,
    );
    const ceilingAreaM2 = round(roomWidthM * roomLengthM, 6);
    const floorAreaM2 = ceilingAreaM2;

    let workAreaM2 = projectAreaM2;
    if (inputMode === 1) {
      if (surfaceScope === 0) workAreaM2 = netWallAreaM2;
      if (surfaceScope === 1) workAreaM2 = ceilingAreaM2;
      if (surfaceScope === 2) workAreaM2 = floorAreaM2;
      if (surfaceScope === 3) {
        workAreaM2 = round(netWallAreaM2 + ceilingAreaM2, 6);
      }
    }

    const basePrimerNeed = round(
      workAreaM2 * passportConsumptionPerM2 * coatCount,
      6,
    );
    const requiredPrimerNeed = round(
      basePrimerNeed * (1 + allowancePercent / 100),
      6,
    );
    const primerPackages = ceilPositive(requiredPrimerNeed / packageSize);
    const purchasePrimerQuantity = round(primerPackages * packageSize, 6);
    const packageLeftoverQuantity = round(
      Math.max(0, purchasePrimerQuantity - requiredPrimerNeed),
      6,
    );
    const unit = quantityUnit === 1 ? "кг" : "л";

    const material: MaterialResult = {
      name: PURPOSE_NAMES[primerPurpose] ?? PURPOSE_NAMES[0],
      quantity: basePrimerNeed,
      unit,
      withReserve: requiredPrimerNeed,
      purchaseQty: purchasePrimerQuantity,
      category: "Основное",
      packageInfo: {
        count: primerPackages,
        size: round(packageSize, 6),
        packageUnit: "упаковок",
      },
    };

    const scenario: CalculatorScenario = {
      exact_need: basePrimerNeed,
      purchase_quantity: purchasePrimerQuantity,
      leftover: packageLeftoverQuantity,
      assumptions: [
        `Расход ${formatRuNumber(passportConsumptionPerM2)} ${unit}/м² на слой перенесён из техкарты выбранного продукта.`,
        `Число слоёв — ${coatCount}; явная надбавка — ${formatRuNumber(allowancePercent)}%.`,
        `Фасовка — ${formatRuNumber(packageSize)} ${unit}.`,
      ],
      key_factors: {
        hidden_multiplier: 1,
        explicit_allowance_factor: round(1 + allowancePercent / 100, 6),
      },
      buy_plan: {
        package_label: "упаковка грунтовки",
        package_size: packageSize,
        packages_count: primerPackages,
        unit,
      },
    };

    const warnings = [
      "Калькулятор не выбирает грунтовку автоматически. Совместимость продукта с основанием, следующим материалом и условиями эксплуатации проверяйте по технической документации.",
      "Расход, число слоёв, допустимое разбавление, способ нанесения и межслойную сушку задаёт производитель конкретного продукта.",
      "Если разные поверхности требуют другого продукта, расхода или числа слоёв, считайте их отдельными однородными позициями.",
      "Литры и килограммы не пересчитываются друг в друга без паспортной плотности конкретного состава.",
      "Валик, кисть, кювета, распылитель и средства защиты не добавляются: комплект инструмента зависит от способа нанесения и условий объекта.",
    ];
    if (openingAreaM2 > grossWallAreaM2 && inputMode === 1) {
      warnings.push(
        "Введённая площадь проёмов больше площади стен: вычет ограничен площадью стен, проверьте обмер.",
      );
    }
    if (inputMode === 1 && surfaceScope === 3) {
      warnings.push(
        "Стены и потолок объединены в одну позицию. Убедитесь, что для обеих поверхностей подходит один продукт, одна норма и одинаковое число слоёв.",
      );
    }

    const surfaceDescription =
      inputMode === 0
        ? `Принята готовая площадь ${formatRuNumber(workAreaM2)} м².`
        : surfaceScope === 0
          ? `Стены: ${formatRuNumber(grossWallAreaM2)} м² брутто − ${formatRuNumber(appliedOpeningAreaM2)} м² проёмов = ${formatRuNumber(workAreaM2)} м².`
          : surfaceScope === 1
            ? `Потолок: ${formatRuNumber(roomWidthM)} × ${formatRuNumber(roomLengthM)} = ${formatRuNumber(workAreaM2)} м².`
            : surfaceScope === 2
              ? `Пол: ${formatRuNumber(roomWidthM)} × ${formatRuNumber(roomLengthM)} = ${formatRuNumber(workAreaM2)} м².`
              : `Стены без проёмов ${formatRuNumber(netWallAreaM2)} м² + потолок ${formatRuNumber(ceilingAreaM2)} м² = ${formatRuNumber(workAreaM2)} м².`;

    const practicalNotes = [
      surfaceDescription,
      `Чистая потребность: ${formatRuNumber(workAreaM2)} м² × ${formatRuNumber(passportConsumptionPerM2)} ${unit}/м² × ${coatCount} ${plural(coatCount, "слой", "слоя", "слоёв")} = ${formatRuNumber(basePrimerNeed)} ${unit}.`,
      `С явной надбавкой ${formatRuNumber(allowancePercent)}% требуется ${formatRuNumber(requiredPrimerNeed)} ${unit}; к покупке ${primerPackages} ${plural(primerPackages, "упаковка", "упаковки", "упаковок")} по ${formatRuNumber(packageSize)} ${unit} = ${formatRuNumber(purchasePrimerQuantity)} ${unit}.`,
      "Перед закупкой сверьте артикул, назначение, единицу расхода, фасовку, срок годности и условия хранения на этикетке и в техкарте.",
    ];

    return {
      canonicalSpecId: primerSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials: [material],
      totals: {
        inputMode,
        projectAreaM2: round(projectAreaM2, 6),
        roomWidthM: round(roomWidthM, 6),
        roomLengthM: round(roomLengthM, 6),
        roomHeightM: round(roomHeightM, 6),
        openingAreaM2: round(openingAreaM2, 6),
        appliedOpeningAreaM2: round(appliedOpeningAreaM2, 6),
        grossWallAreaM2,
        netWallAreaM2,
        ceilingAreaM2,
        floorAreaM2,
        surfaceScope,
        workAreaM2: round(workAreaM2, 6),
        primerPurpose,
        quantityUnit,
        passportConsumptionPerM2: round(passportConsumptionPerM2, 6),
        coatCount,
        allowancePercent: round(allowancePercent, 6),
        packageSize: round(packageSize, 6),
        basePrimerNeed,
        requiredPrimerNeed,
        primerPackages,
        purchasePrimerQuantity,
        packageLeftoverQuantity,
        purchasedSurplusQuantity: round(
          Math.max(0, purchasePrimerQuantity - basePrimerNeed),
          6,
        ),
        minExactNeed: basePrimerNeed,
        recExactNeed: basePrimerNeed,
        maxExactNeed: basePrimerNeed,
        minPurchase: purchasePrimerQuantity,
        recPurchase: purchasePrimerQuantity,
        maxPurchase: purchasePrimerQuantity,
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
          "Режим точности не меняет расход: учитываются только введённая площадь, паспортная норма, слои, явная надбавка и фасовка.",
        ],
      },
      summaryCards: [
        {
          icon: "▱",
          label: "Площадь",
          value: formatRuNumber(workAreaM2),
          unit: "м²",
          hint: inputMode === 0 ? "по обмеру или проекту" : "по геометрии",
          tone: "slate",
        },
        {
          icon: "◒",
          label: "С надбавкой",
          value: formatRuNumber(requiredPrimerNeed),
          unit,
          hint: `${coatCount} ${plural(coatCount, "слой", "слоя", "слоёв")}, ${formatRuNumber(allowancePercent)}%`,
          tone: "amber",
        },
        {
          icon: "▤",
          label: "К покупке",
          value: formatRuNumber(purchasePrimerQuantity),
          unit,
          hint: `${primerPackages} ${plural(primerPackages, "упаковка", "упаковки", "упаковок")} по ${formatRuNumber(packageSize)} ${unit}`,
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Готовая площадь:** используется площадь одной однородной позиции из обмера или проекта.

**Прямоугольная комната:**
- стены брутто = 2 × (длина + ширина) × высота;
- стены нетто = max(0; стены брутто − площадь проёмов);
- потолок или пол = длина × ширина.

**Чистая потребность:** площадь × паспортный расход на один слой × явное число слоёв.

**С надбавкой:** чистая потребность × (1 + введённая надбавка / 100). Надбавка применяется один раз.

**К покупке:** ⌈потребность с надбавкой / фактическую фасовку⌉ целых упаковок.

Калькулятор не назначает продукт, расход, число слоёв, разбавление, сушку и инструмент автоматически и не переводит литры в килограммы без паспортной плотности.
  `,
  howToUse: [
    "Введите готовую площадь однородного основания или рассчитайте простую прямоугольную комнату",
    "Выберите литры или килограммы так же, как указано в техкарте и на упаковке",
    "Перенесите расход на один слой для вашего основания и способа нанесения",
    "Укажите разрешённое техкартой число слоёв и собственную явную надбавку",
    "Введите фактическую фасовку выбранного артикула",
    "Нажмите «Рассчитать» и сверьте чистую потребность, надбавку, упаковки и остаток",
  ],
  expertTips: [
    {
      title: "Одна позиция — один продукт и одна норма",
      content:
        "Плотный бетон, гипсовая штукатурка и сильно впитывающее основание могут требовать разных продуктов и расходов. Не усредняйте их в одной площади — сделайте отдельные расчёты.",
      author: "Технолог отделочных работ",
    },
    {
      title: "Пробный участок важнее универсальной таблицы",
      content:
        "Если техкарта даёт диапазон, расход уточняют по состоянию основания и пробному нанесению. Второй слой и разбавление допустимы только по инструкции выбранного состава.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Откуда брать расход грунтовки на 1 м²?",
      answer:
        "Из технического листа или этикетки конкретного продукта для вашего основания и способа нанесения. Если указан диапазон, уточните значение пробным участком по правилам производителя.",
    },
    {
      question: "Можно ли сложить стены, потолок и пол в один расчёт?",
      answer:
        "Только если на всей площади используется один продукт, одна единица расхода, одинаковая норма и одинаковое число слоёв. Иначе каждую однородную позицию считайте отдельно.",
    },
    {
      question: "Почему калькулятор не переводит литры в килограммы?",
      answer:
        "Плотность зависит от конкретного состава. Используйте ту единицу, в которой производитель указывает расход и фасовку, либо выполняйте пересчёт только по паспортной плотности продукта.",
    },
    {
      question: "Когда нужен второй слой грунтовки?",
      answer:
        "Когда это требует или допускает техкарта конкретного продукта для данного основания. Не добавляйте слой автоматически: проверьте разбавление первого прохода, межслойную сушку и критерий повторной обработки.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор грунтовки</h2>
<p>Калькулятор переводит площадь одной однородной поверхности и расход выбранного продукта в чистую потребность и целые упаковки. Норму на один слой, число слоёв, единицу измерения и фасовку вводит пользователь по технической документации конкретного состава.</p>

<h2>Почему универсального расхода нет</h2>
<p>Расход зависит не только от слова «грунтовка», но и от состава, основания, впитываемости, подготовки и способа нанесения. Например, официальная карточка <a href="https://www.ceresit.ru/ru/products/tiling/supplementary-materials/ct_17_pro">Ceresit CT 17 PRO</a> указывает 0,1–0,2 л/м² за один проход в зависимости от впитывающей способности. Для <a href="https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/gruntovki/knauf-tifengrund/">КНАУФ-Тифенгрунд</a> указан расход 0,1 кг/м², а для адгезионного <a href="https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/gruntovki/knauf-betogrund/">КНАУФ-Бетогрунд</a> — около 0,25 кг/м². Эти значения относятся к разным продуктам и не должны смешиваться в одну автоматическую таблицу.</p>

<h2>Литры и килограммы — разные контракты</h2>
<p>Одни производители задают расход и фасовку в литрах, другие — в килограммах. Калькулятор сохраняет выбранную единицу на всём пути расчёта и не использует условную плотность. Перевод допустим только по плотности конкретного продукта из его технической документации.</p>

<h2>Формула расчёта</h2>
<p><strong>Чистая потребность = площадь × расход на один слой × число слоёв.</strong></p>
<p>Затем один раз применяется введённая надбавка, а результат округляется вверх до фактической фасовки. Режимы MIN/REC/MAX и «точности» не добавляют скрытых процентов.</p>

<h2>Нормативная граница</h2>
<p><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939">СП 71.13330.2017 «Изоляционные и отделочные покрытия»</a> устанавливает общие правила производства и приёмки отделочных работ. Конкретные продукт, основание, расход, разбавление, число слоёв, способ нанесения и время сушки определяются техкартой производителя.</p>

<h2>Что калькулятор не подбирает</h2>
<p>Результат не подтверждает совместимость грунтовки с основанием и следующим покрытием. Валик, кисть, кювета, распылитель и средства защиты также не добавляются автоматически: они зависят от технологии нанесения и объекта.</p>
`,
    faq: [
      {
        question: "Как использовать диапазон расхода из техкарты?",
        answer:
          "<p>Выберите значение по условиям, которые описывает производитель, и при необходимости уточните его пробным участком. Не прибавляйте одновременно верхнюю границу диапазона, скрытый коэффициент основания и ещё один сценарный запас.</p>",
      },
      {
        question: "Как посчитать стены с окнами и дверями?",
        answer:
          "<p>В режиме комнаты калькулятор считает периметр стен по длине, ширине и высоте, затем вычитает введённую сумму проёмов. Ниши, колонны, откосы и сложную геометрию добавьте в готовую площадь отдельным обмером.</p>",
      },
      {
        question: "Почему в результате нет валика и кисти?",
        answer:
          "<p>Производитель может разрешать кисть, валик или другой способ нанесения, а количество инструмента зависит от бригады, сменности и состояния инвентаря. Калькулятор считает только выбранную грунтовку и не создаёт фиктивную ведомость инструмента.</p>",
      },
    ],
  },
};
