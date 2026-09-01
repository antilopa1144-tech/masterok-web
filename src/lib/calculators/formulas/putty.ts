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
import puttySpec from "../../../../configs/calculators/putty-canonical.v1.json";

const WEB_FORMULA_VERSION = "putty-web-passport-v1";

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
  0: "Шпаклёвка выбранного продукта",
  1: "Выравнивающая шпаклёвка по техкарте",
  2: "Финишная шпаклёвка по техкарте",
  3: "Шпаклёвка для стыков или ремонта по техкарте",
};

interface PositionCalculation {
  purpose: number;
  rateBasis: number;
  consumptionRate: number;
  thicknessMm: number;
  layerCount: number;
  allowancePercent: number;
  packageWeightKg: number;
  baseNeedKg: number;
  requiredNeedKg: number;
  packages: number;
  purchaseKg: number;
  leftoverKg: number;
  material: MaterialResult;
}

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

const calculatePosition = ({
  workAreaM2,
  purpose,
  rateBasis,
  consumptionRate,
  thicknessMm,
  layerCount,
  allowancePercent,
  packageWeightKg,
  category,
}: {
  workAreaM2: number;
  purpose: number;
  rateBasis: number;
  consumptionRate: number;
  thicknessMm: number;
  layerCount: number;
  allowancePercent: number;
  packageWeightKg: number;
  category: string;
}): PositionCalculation => {
  const rateFactor = rateBasis === 0 ? thicknessMm : layerCount;
  const baseNeedKg = round(workAreaM2 * consumptionRate * rateFactor, 6);
  const requiredNeedKg = round(
    baseNeedKg * (1 + allowancePercent / 100),
    6,
  );
  const packages = ceilPositive(requiredNeedKg / packageWeightKg);
  const purchaseKg = round(packages * packageWeightKg, 6);
  const leftoverKg = round(Math.max(0, purchaseKg - requiredNeedKg), 6);

  return {
    purpose,
    rateBasis,
    consumptionRate,
    thicknessMm,
    layerCount,
    allowancePercent,
    packageWeightKg,
    baseNeedKg,
    requiredNeedKg,
    packages,
    purchaseKg,
    leftoverKg,
    material: {
      name: PURPOSE_NAMES[purpose] ?? PURPOSE_NAMES[0],
      quantity: baseNeedKg,
      unit: "кг",
      withReserve: requiredNeedKg,
      purchaseQty: purchaseKg,
      category,
      packageInfo: {
        count: packages,
        size: round(packageWeightKg, 6),
        packageUnit: "упаковок",
      },
    },
  };
};

const positionFormulaText = (
  position: PositionCalculation,
  workAreaM2: number,
): string => {
  const multiplierText =
    position.rateBasis === 0
      ? `${formatRuNumber(position.thicknessMm)} мм средней толщины`
      : `${position.layerCount} ${plural(position.layerCount, "проход", "прохода", "проходов")}`;

  return `${PURPOSE_NAMES[position.purpose] ?? PURPOSE_NAMES[0]}: ${formatRuNumber(workAreaM2)} м² × ${formatRuNumber(position.consumptionRate)} кг/м² ${position.rateBasis === 0 ? "на 1 мм" : "на проход"} × ${multiplierText} = ${formatRuNumber(position.baseNeedKg)} кг; с надбавкой ${formatRuNumber(position.allowancePercent)}% требуется ${formatRuNumber(position.requiredNeedKg)} кг, к покупке ${position.packages} ${plural(position.packages, "упаковка", "упаковки", "упаковок")} по ${formatRuNumber(position.packageWeightKg)} кг = ${formatRuNumber(position.purchaseKg)} кг.`;
};

export const puttyDef: CalculatorDefinition = {
  id: "mixes_putty",
  slug: "shpaklevka",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор шпаклёвки",
  h1: "Калькулятор шпаклёвки — расход по техкарте и упаковка",
  description:
    "Рассчитайте одну или две позиции шпаклёвки по площади, паспортному расходу, фактической толщине или числу проходов и упаковке выбранного продукта.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор шпаклёвки: расход по техкарте",
  ),
  metaDescription:
    "Бесплатный калькулятор шпаклёвки: рассчитайте потребность по площади и расходу из техкарты, затем округлите закупку по фактической упаковке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "шпаклёвка",
    "расход шпаклёвки",
    "шпаклёвка на м2",
    "шпаклёвка стен",
    "финишная шпаклёвка",
    "выравнивающая шпаклёвка",
    "техкарта шпаклёвки",
  ],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Как задана площадь",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 1, label: "Готовая площадь" },
        { value: 0, label: "Прямоугольная комната" },
      ],
      hint:
        "Считайте одну однородную площадь. Если основание, продукт или толщина различаются, разделите объект на отдельные расчёты.",
      fullWidth: true,
    },
    {
      key: "area",
      label: "Площадь шпаклевания",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100000,
      step: 0.1,
      defaultValue: 50,
      hint: "Чистая площадь однородного основания из обмера или проекта.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "length",
      label: "Длина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 5,
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 4,
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "height",
      label: "Высота комнаты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 2.7,
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "openingArea",
      label: "Площадь проёмов в стенах",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 3.6,
      hint: "Сумма окон, дверей и других участков стен без шпаклевания.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 0 },
        { key: "surface", op: "eq", value: 1 },
      ],
    },
    {
      key: "surface",
      label: "Какие поверхности считать",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стены" },
        { value: 1, label: "Потолок" },
        { value: 2, label: "Стены и потолок" },
      ],
      hint:
        "В режиме готовой площади выбор только подписывает назначение обмера. В режиме комнаты он определяет геометрию.",
    },
    {
      key: "primaryPurpose",
      label: "Первая позиция",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Шпаклёвка выбранного продукта" },
        { value: 1, label: "Выравнивающая" },
        { value: 2, label: "Финишная" },
        { value: 3, label: "Для стыков или локального ремонта" },
      ],
      hint:
        "Название меняет только подпись результата. Назначение, основание и допустимый слой сверяйте с техкартой.",
      fullWidth: true,
    },
    {
      key: "primaryRateBasis",
      label: "Как указан расход первой позиции",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "На 1 мм толщины" },
        { value: 1, label: "На один проход" },
      ],
      hint:
        "Выберите ровно ту базу, которая написана в технической карте. Не пересчитывайте расход на проход в расход на миллиметр без данных производителя.",
      fullWidth: true,
    },
    {
      key: "primaryConsumptionRate",
      label: "Расход первой позиции из техкарты",
      type: "number",
      unit: "кг/м²",
      min: 0.001,
      max: 100,
      step: 0.001,
      defaultValue: 1,
      hint:
        "Введите расход выбранного продукта на 1 мм или один проход — согласно выбранной базе.",
      fullWidth: true,
    },
    {
      key: "primaryThicknessMm",
      label: "Средняя суммарная толщина первой позиции",
      type: "number",
      unit: "мм",
      min: 0.01,
      max: 100,
      step: 0.1,
      defaultValue: 1,
      hint:
        "Используйте фактическую среднюю толщину по обмеру и не превышайте допустимый слой за проход из техкарты.",
      hideIf: { key: "primaryRateBasis", op: "ne", value: 0 },
    },
    {
      key: "primaryLayerCount",
      label: "Число проходов первой позиции",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 проход" },
        { value: 2, label: "2 прохода" },
        { value: 3, label: "3 прохода" },
        { value: 4, label: "4 прохода" },
        { value: 5, label: "5 проходов" },
      ],
      hint:
        "Число проходов задаёт пользователь по технологии конкретного продукта; Q1–Q4 не подставляет его автоматически.",
      hideIf: { key: "primaryRateBasis", op: "ne", value: 1 },
    },
    {
      key: "primaryAllowancePercent",
      label: "Надбавка первой позиции",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Надбавка применяется один раз. Неровность и толщину лучше учитывать обмером, а не повторным скрытым коэффициентом.",
    },
    {
      key: "primaryPackageWeightKg",
      label: "Фасовка первой позиции",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 20,
      hint: "Фактическая масса одной неделимой упаковки выбранного артикула.",
    },
    {
      key: "addSecondPosition",
      label: "Добавить вторую позицию",
      type: "switch",
      defaultValue: 0,
      hint:
        "Используйте для отдельного второго продукта на той же площади — например, после выравнивающей шпаклёвки. Расход и фасовка задаются независимо.",
      fullWidth: true,
    },
    {
      key: "secondPurpose",
      label: "Вторая позиция",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 0, label: "Шпаклёвка выбранного продукта" },
        { value: 1, label: "Выравнивающая" },
        { value: 2, label: "Финишная" },
        { value: 3, label: "Для стыков или локального ремонта" },
      ],
      hideIf: { key: "addSecondPosition", op: "ne", value: 1 },
    },
    {
      key: "secondRateBasis",
      label: "Как указан расход второй позиции",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "На 1 мм толщины" },
        { value: 1, label: "На один проход" },
      ],
      hideIf: { key: "addSecondPosition", op: "ne", value: 1 },
      fullWidth: true,
    },
    {
      key: "secondConsumptionRate",
      label: "Расход второй позиции из техкарты",
      type: "number",
      unit: "кг/м²",
      min: 0.001,
      max: 100,
      step: 0.001,
      defaultValue: 1,
      hint: "Введите паспортный расход второго продукта для выбранной базы.",
      hideIf: { key: "addSecondPosition", op: "ne", value: 1 },
      fullWidth: true,
    },
    {
      key: "secondThicknessMm",
      label: "Средняя суммарная толщина второй позиции",
      type: "number",
      unit: "мм",
      min: 0.01,
      max: 100,
      step: 0.1,
      defaultValue: 1,
      hideIf: [
        { key: "addSecondPosition", op: "ne", value: 1 },
        { key: "secondRateBasis", op: "ne", value: 0 },
      ],
    },
    {
      key: "secondLayerCount",
      label: "Число проходов второй позиции",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 проход" },
        { value: 2, label: "2 прохода" },
        { value: 3, label: "3 прохода" },
        { value: 4, label: "4 прохода" },
        { value: 5, label: "5 проходов" },
      ],
      hideIf: [
        { key: "addSecondPosition", op: "ne", value: 1 },
        { key: "secondRateBasis", op: "ne", value: 1 },
      ],
    },
    {
      key: "secondAllowancePercent",
      label: "Надбавка второй позиции",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: ALLOWANCE_OPTIONS,
      hideIf: { key: "addSecondPosition", op: "ne", value: 1 },
    },
    {
      key: "secondPackageWeightKg",
      label: "Фасовка второй позиции",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 20,
      hint: "Фактическая масса упаковки второго артикула.",
      hideIf: { key: "addSecondPosition", op: "ne", value: 1 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 1), 0, 1);
    const area = clamp(readNumber(inputs.area, 50), 0, 100000);
    const length = clamp(readNumber(inputs.length, 5), 0.1, 1000);
    const width = clamp(readNumber(inputs.width, 4), 0.1, 1000);
    const height = clamp(readNumber(inputs.height, 2.7), 0.1, 100);
    const openingArea = clamp(
      readNumber(inputs.openingArea, 3.6),
      0,
      100000,
    );
    const surface = clampInteger(readNumber(inputs.surface, 0), 0, 2);

    const grossWallAreaM2 = round(2 * (length + width) * height, 6);
    const appliedOpeningAreaM2 = Math.min(openingArea, grossWallAreaM2);
    const netWallAreaM2 = round(
      Math.max(0, grossWallAreaM2 - appliedOpeningAreaM2),
      6,
    );
    const ceilingAreaM2 = round(length * width, 6);

    let workAreaM2 = area;
    if (inputMode === 0) {
      if (surface === 0) workAreaM2 = netWallAreaM2;
      if (surface === 1) workAreaM2 = ceilingAreaM2;
      if (surface === 2) {
        workAreaM2 = round(netWallAreaM2 + ceilingAreaM2, 6);
      }
    }

    const primaryPurpose = clampInteger(
      readNumber(inputs.primaryPurpose, 0),
      0,
      3,
    );
    const primaryRateBasis = clampInteger(
      readNumber(inputs.primaryRateBasis, 0),
      0,
      1,
    );
    const primaryConsumptionRate = clamp(
      readNumber(inputs.primaryConsumptionRate, 1),
      0.001,
      100,
    );
    const primaryThicknessMm = clamp(
      readNumber(inputs.primaryThicknessMm, 1),
      0.01,
      100,
    );
    const primaryLayerCount = clampInteger(
      readNumber(inputs.primaryLayerCount, 1),
      1,
      5,
    );
    const primaryAllowancePercent = clamp(
      readNumber(inputs.primaryAllowancePercent, 0),
      0,
      30,
    );
    const primaryPackageWeightKg = clamp(
      readNumber(inputs.primaryPackageWeightKg, 20),
      0.1,
      10000,
    );

    const primary = calculatePosition({
      workAreaM2,
      purpose: primaryPurpose,
      rateBasis: primaryRateBasis,
      consumptionRate: primaryConsumptionRate,
      thicknessMm: primaryThicknessMm,
      layerCount: primaryLayerCount,
      allowancePercent: primaryAllowancePercent,
      packageWeightKg: primaryPackageWeightKg,
      category: "Первая позиция",
    });

    const addSecondPosition = clampInteger(
      readNumber(inputs.addSecondPosition, 0),
      0,
      1,
    );
    const secondPurpose = clampInteger(
      readNumber(inputs.secondPurpose, 2),
      0,
      3,
    );
    const secondRateBasis = clampInteger(
      readNumber(inputs.secondRateBasis, 0),
      0,
      1,
    );
    const secondConsumptionRate = clamp(
      readNumber(inputs.secondConsumptionRate, 1),
      0.001,
      100,
    );
    const secondThicknessMm = clamp(
      readNumber(inputs.secondThicknessMm, 1),
      0.01,
      100,
    );
    const secondLayerCount = clampInteger(
      readNumber(inputs.secondLayerCount, 1),
      1,
      5,
    );
    const secondAllowancePercent = clamp(
      readNumber(inputs.secondAllowancePercent, 0),
      0,
      30,
    );
    const secondPackageWeightKg = clamp(
      readNumber(inputs.secondPackageWeightKg, 20),
      0.1,
      10000,
    );
    const second = addSecondPosition
      ? calculatePosition({
          workAreaM2,
          purpose: secondPurpose,
          rateBasis: secondRateBasis,
          consumptionRate: secondConsumptionRate,
          thicknessMm: secondThicknessMm,
          layerCount: secondLayerCount,
          allowancePercent: secondAllowancePercent,
          packageWeightKg: secondPackageWeightKg,
          category: "Вторая позиция",
        })
      : null;

    const materials = second
      ? [primary.material, second.material]
      : [primary.material];
    const totalBaseNeedKg = round(
      primary.baseNeedKg + (second?.baseNeedKg ?? 0),
      6,
    );
    const totalRequiredNeedKg = round(
      primary.requiredNeedKg + (second?.requiredNeedKg ?? 0),
      6,
    );
    const totalPurchaseKg = round(
      primary.purchaseKg + (second?.purchaseKg ?? 0),
      6,
    );
    const totalLeftoverKg = round(
      primary.leftoverKg + (second?.leftoverKg ?? 0),
      6,
    );
    const totalPackages = primary.packages + (second?.packages ?? 0);

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode;
    const accuracyMode: AccuracyMode = [
      "basic",
      "realistic",
      "professional",
      "custom",
    ].includes(requestedAccuracyMode)
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const assumptions = [
      `${PURPOSE_NAMES[primary.purpose]}: расход ${formatRuNumber(primary.consumptionRate)} кг/м² ${primary.rateBasis === 0 ? "на 1 мм" : "на проход"}, надбавка ${formatRuNumber(primary.allowancePercent)}%, фасовка ${formatRuNumber(primary.packageWeightKg)} кг.`,
    ];
    if (second) {
      assumptions.push(
        `${PURPOSE_NAMES[second.purpose]}: расход ${formatRuNumber(second.consumptionRate)} кг/м² ${second.rateBasis === 0 ? "на 1 мм" : "на проход"}, надбавка ${formatRuNumber(second.allowancePercent)}%, фасовка ${formatRuNumber(second.packageWeightKg)} кг.`,
      );
    }

    const scenario: CalculatorScenario = {
      exact_need: totalRequiredNeedKg,
      purchase_quantity: totalPurchaseKg,
      leftover: totalLeftoverKg,
      assumptions,
      key_factors: {
        hidden_multiplier: 1,
        primary_allowance_factor: round(
          1 + primaryAllowancePercent / 100,
          6,
        ),
        second_allowance_factor: second
          ? round(1 + secondAllowancePercent / 100, 6)
          : 1,
      },
      buy_plan: {
        package_label: second
          ? "отдельные упаковки двух позиций"
          : "упаковка шпаклёвки",
        package_size: second ? 1 : primaryPackageWeightKg,
        packages_count: second ? 0 : totalPackages,
        unit: "kg",
      },
    };

    const warnings = [
      "Калькулятор не выбирает шпаклёвку автоматически. Основание, назначение, допустимую толщину за проход и совместимость со следующим покрытием проверяйте по технической документации продукта.",
      "Расход на 1 мм и расход на один проход — разные паспортные базы. Используйте только ту, которую указывает производитель конкретного состава.",
      "Категории качества Q1–Q4 описывают требуемый результат и технологию системы, но не являются универсальным числом слоёв или фиксированной нормой расхода.",
      "Грунтовка, лента для стыков, угловые профили, абразив и инструмент не добавляются автоматически: их необходимость и количество зависят от основания, узлов и принятой системы.",
      "Срок жизни смеси, межслойная сушка, шлифование и подготовка основания определяются техкартой конкретного продукта и условиями объекта.",
    ];
    if (
      inputMode === 0 &&
      surface !== 1 &&
      openingArea > grossWallAreaM2
    ) {
      warnings.push(
        "Введённая площадь проёмов больше площади стен: вычет ограничен площадью стен, проверьте обмер.",
      );
    }
    if (inputMode === 0 && surface === 2) {
      warnings.push(
        "Стены и потолок объединены в одну площадь. Убедитесь, что для них подходят те же продукты, нормы и толщины; иначе выполните отдельные расчёты.",
      );
    }
    if (second) {
      warnings.push(
        "Две позиции рассчитаны независимо на одной площади. Проверьте очередность, совместимость, грунтование и готовность первого слоя перед вторым по документации системы.",
      );
    }

    const surfaceDescription =
      inputMode === 1
        ? `Принята готовая площадь ${formatRuNumber(workAreaM2)} м².`
        : surface === 0
          ? `Стены: ${formatRuNumber(grossWallAreaM2)} м² брутто − ${formatRuNumber(appliedOpeningAreaM2)} м² проёмов = ${formatRuNumber(workAreaM2)} м².`
          : surface === 1
            ? `Потолок: ${formatRuNumber(length)} × ${formatRuNumber(width)} = ${formatRuNumber(workAreaM2)} м².`
            : `Стены без проёмов ${formatRuNumber(netWallAreaM2)} м² + потолок ${formatRuNumber(ceilingAreaM2)} м² = ${formatRuNumber(workAreaM2)} м².`;

    const practicalNotes = [
      surfaceDescription,
      positionFormulaText(primary, workAreaM2),
    ];
    if (second) practicalNotes.push(positionFormulaText(second, workAreaM2));
    practicalNotes.push(
      "Перед закупкой сверьте артикул, назначение, допустимое основание, расход, толщину за проход, фасовку, срок годности и условия хранения на упаковке и в техкарте.",
    );

    return {
      canonicalSpecId: puttySpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        area: round(workAreaM2, 6),
        inputAreaM2: round(area, 6),
        length: round(length, 6),
        width: round(width, 6),
        height: round(height, 6),
        openingArea: round(openingArea, 6),
        appliedOpeningAreaM2: round(appliedOpeningAreaM2, 6),
        grossWallAreaM2,
        netWallAreaM2,
        ceilingAreaM2,
        surface,
        workAreaM2: round(workAreaM2, 6),
        primaryPurpose,
        primaryRateBasis,
        primaryConsumptionRate: round(primaryConsumptionRate, 6),
        primaryThicknessMm: round(primaryThicknessMm, 6),
        primaryLayerCount,
        primaryAllowancePercent: round(primaryAllowancePercent, 6),
        primaryPackageWeightKg: round(primaryPackageWeightKg, 6),
        primaryBaseNeedKg: primary.baseNeedKg,
        primaryRequiredNeedKg: primary.requiredNeedKg,
        primaryPackages: primary.packages,
        primaryPurchaseKg: primary.purchaseKg,
        primaryLeftoverKg: primary.leftoverKg,
        addSecondPosition,
        secondPurpose,
        secondRateBasis,
        secondConsumptionRate: round(secondConsumptionRate, 6),
        secondThicknessMm: round(secondThicknessMm, 6),
        secondLayerCount,
        secondAllowancePercent: round(secondAllowancePercent, 6),
        secondPackageWeightKg: round(secondPackageWeightKg, 6),
        secondBaseNeedKg: second?.baseNeedKg ?? 0,
        secondRequiredNeedKg: second?.requiredNeedKg ?? 0,
        secondPackages: second?.packages ?? 0,
        secondPurchaseKg: second?.purchaseKg ?? 0,
        secondLeftoverKg: second?.leftoverKg ?? 0,
        totalBaseNeedKg,
        totalRequiredNeedKg,
        totalPurchaseKg,
        totalLeftoverKg,
        totalPackages,
        minExactNeedKg: totalBaseNeedKg,
        recExactNeedKg: totalBaseNeedKg,
        maxExactNeedKg: totalBaseNeedKg,
        minPurchaseKg: totalPurchaseKg,
        recPurchaseKg: totalPurchaseKg,
        maxPurchaseKg: totalPurchaseKg,
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
          "Режим точности не меняет расход: учитываются только площадь, паспортная база, явная толщина или число проходов, надбавка и фасовка каждой позиции.",
        ],
      },
      summaryCards: [
        {
          icon: "▱",
          label: "Площадь",
          value: formatRuNumber(workAreaM2),
          unit: "м²",
          hint: inputMode === 1 ? "по обмеру или проекту" : "по геометрии",
          tone: "slate",
        },
        {
          icon: "◒",
          label: "С надбавкой",
          value: formatRuNumber(totalRequiredNeedKg),
          unit: "кг",
          hint: second ? "сумма двух отдельных позиций" : "одна позиция",
          tone: "amber",
        },
        {
          icon: "▤",
          label: "К покупке",
          value: formatRuNumber(totalPurchaseKg),
          unit: "кг",
          hint: `${totalPackages} ${plural(totalPackages, "упаковка", "упаковки", "упаковок")}`,
          tone: "emerald",
        },
      ],
      hidePrimaryMaterialBadge: Boolean(second),
    };
  },
  formulaDescription: `
**Площадь комнаты:**
- стены брутто = 2 × (длина + ширина) × высота;
- стены нетто = max(0; стены брутто − площадь проёмов);
- потолок = длина × ширина.

**Если расход дан на 1 мм:** чистая потребность = площадь × паспортный расход на 1 мм × фактическая средняя толщина.

**Если расход дан на один проход:** чистая потребность = площадь × паспортный расход на проход × явное число проходов.

**С надбавкой:** чистая потребность × (1 + введённая надбавка / 100). Надбавка применяется один раз для каждой позиции.

**К покупке:** ⌈потребность с надбавкой / фактическую фасовку⌉ целых упаковок.

Вторая позиция считается отдельно по собственной техкарте. Калькулятор не назначает продукт, слои, грунтовку, ленту, абразив и инструмент автоматически.
  `,
  howToUse: [
    "Введите готовую площадь или размеры прямоугольной комнаты и площадь проёмов",
    "Перенесите из техкарты расход первой позиции и выберите его базу: на 1 мм или на проход",
    "Укажите фактическую толщину либо число проходов, явную надбавку и фасовку",
    "При необходимости добавьте второй продукт с независимыми параметрами и сверьте совместимость системы",
  ],
  faq: [
    {
      question: "Какой расход шпаклёвки вводить?",
      answer:
        "Расход конкретного продукта для выбранного основания и способа нанесения. Если техкарта даёт значение на 1 мм, вводите среднюю суммарную толщину; если на один проход — число проходов. Эти базы нельзя смешивать.",
    },
    {
      question: "Почему калькулятор не выбирает стартовую и финишную шпаклёвку сам?",
      answer:
        "Назначение зависит от основания, перепадов, требуемой категории поверхности, финишного покрытия и совместимости системы. Калькулятор позволяет посчитать две подтверждённые позиции, но не подменяет обследование и техкарту.",
    },
    {
      question: "Почему Q1–Q4 не меняет число слоёв?",
      answer:
        "Q1–Q4 описывает требуемое качество и состав операций для конкретной системы. Одна и та же категория может достигаться разными материалами и технологиями, поэтому универсального числа слоёв и расхода нет.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор шпаклёвки</h2>
<p>Калькулятор переводит площадь одной однородной поверхности и паспортный расход выбранного продукта в чистую потребность и целые упаковки. Можно посчитать одну позицию или два разных продукта на той же площади — каждый со своей базой расхода, толщиной или числом проходов, надбавкой и фасовкой.</p>

<h2>Почему универсальной нормы нет</h2>
<p>Расход зависит от состава, назначения и способа, которым он указан. Официальная карточка <a href="https://www.knauf.ru/catalog/shpaklyevki/shpaklyevki-polimernye/knauf-rotband-pasta-profi/">КНАУФ-Ротбанд Паста Профи</a> приводит 0,48 кг/м² для слоя 0,3 мм. Для сплошного шпаклевания <a href="https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/shpaklyevki/knauf-fugen/">КНАУФ-Фуген</a> указан диапазон 0,8–1,0 кг/м² при слое 1 мм, а расход того же продукта для заделки стыков ГКЛ указан отдельно. <a href="https://ceresit.ru/ru/products/vnutrennyay-otdelka/shpaklevki/ct_127_polymer_plus">Ceresit CT 127</a> указывает 1,2–1,3 кг/м² на 1 мм. Значения относятся к разным продуктам и операциям и не образуют универсальный пресет.</p>

<h2>Расход на миллиметр и на проход</h2>
<p>Если производитель задаёт расход на 1 мм, калькулятор умножает его на фактическую среднюю толщину. Если техкарта задаёт расход на один проход или для конкретного контрольного слоя, используется явное число проходов. Калькулятор не переводит одну базу в другую без данных производителя.</p>

<h2>Q1–Q4 — требование к результату, а не коэффициент</h2>
<p>Официальная <a href="https://www.knauf.ru/company/technology/sistema-q1-q4/">система качества поверхности Q1–Q4 КНАУФ</a> связывает категории с последующим покрытием и последовательностью операций. Она не является универсальной таблицей «класс → число слоёв → расход» для любого основания и любой шпаклёвки. Поэтому продукт, слой и проходы пользователь подтверждает по принятой системе.</p>

<h2>Формула закупки</h2>
<p><strong>Чистая потребность = площадь × паспортный расход × толщина или число проходов.</strong></p>
<p>Для каждой позиции один раз применяется введённая надбавка, затем масса округляется вверх до фактической упаковки. MIN/REC/MAX и режимы точности не добавляют скрытых процентов.</p>

<h2>Нормативная граница</h2>
<p><a href="https://protect.gost.ru/gost/details/05226480-ceea-4d2a-96f5-91b8943d3865">ГОСТ Р 58278-2024</a> распространяется на сухие гипсовые шпаклёвочные смеси заводского изготовления и устанавливает требования к продукции. <a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939">СП 71.13330.2017 «Изоляционные и отделочные покрытия»</a> задаёт общие правила производства и приёмки отделочных работ. Конкретные назначение, основание, расход, допустимая толщина, приготовление, время работы и сушка остаются в техкарте производителя.</p>

<h2>Что не добавляется автоматически</h2>
<p>Грунтовка, армирующая лента, уголки, абразив, шпатели и средства защиты зависят от основания, швов, кромок, системы и имеющегося инструмента. Например, карточка КНАУФ-Фуген отдельно описывает заделку стыков с армирующей лентой; из площади сплошного шпаклевания нельзя автоматически восстановить длину таких стыков.</p>
`,
    faq: [
      {
        question: "Как использовать диапазон расхода из техкарты?",
        answer:
          "<p>Выберите значение по основанию, толщине и способу нанесения, которые описывает производитель, а при необходимости уточните его пробным участком. Не совмещайте верхнюю границу диапазона со скрытым коэффициентом неровности и ещё одним сценарным запасом.</p>",
      },
      {
        question: "Как посчитать стартовую и финишную шпаклёвку?",
        answer:
          "<p>Включите вторую позицию и перенесите для каждого выбранного продукта собственные расход, базу расхода, толщину или число проходов, надбавку и фасовку. Калькулятор посчитает упаковки раздельно, но совместимость и очередность нужно подтвердить по документации системы.</p>",
      },
      {
        question: "Как посчитать стены с окнами и дверями?",
        answer:
          "<p>В режиме комнаты калькулятор считает периметр стен по длине, ширине и высоте, затем вычитает введённую сумму проёмов. Ниши, колонны, откосы и сложную геометрию добавьте в готовую площадь отдельным обмером.</p>",
      },
      {
        question: "Почему нет грунтовки, серпянки и наждачной бумаги?",
        answer:
          "<p>Площадь шпаклевания не определяет длину стыков, тип кромок, требуемую ленту, грунтовку и абразив. Эти позиции считают по принятой системе и фактическим узлам, а не по универсальному коэффициенту.</p>",
      },
    ],
  },
};
