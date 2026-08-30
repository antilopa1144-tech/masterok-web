import ventilationSpec from "../../../../configs/calculators/ventilation-canonical.v1.json";
import { computeCanonicalVentilation } from "../../../../engine/ventilation";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

export const ventilationDef: CalculatorDefinition = {
  id: "engineering_ventilation",
  slug: "ventilyaciya",
  formulaVersion: ventilationSpec.formula_version,
  title: "Калькулятор вентиляции",
  h1: "Калькулятор вентиляции — расход воздуха и проверка воздуховода",
  description:
    "Рассчитайте предварительный минимум наружного воздуха для жилья или введите проектный расход, проверьте скорость в выбранном сечении и посчитайте воздуховоды по ведомости.",
  metaTitle: withSiteMetaTitle("Калькулятор вентиляции: расход и воздуховоды"),
  metaDescription:
    "Бесплатный калькулятор вентиляции. Рассчитайте расход наружного воздуха, проверьте скорость в круглом или прямоугольном канале и количество покупных отрезков.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["вентиляция", "расход воздуха", "скорость воздуха", "воздуховод", "СП 60.13330"],
  popularity: 62,
  complexity: 3,
  fields: [
    {
      key: "calculationMode",
      label: "Исходный расход воздуха",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Предварительно для жилья" },
        { value: 1, label: "Готовый расход из проекта" },
      ],
      hint: "Жилой режим применим к помещениям с естественным проветриванием. Для других объектов используйте расход из проекта.",
      fullWidth: true,
    },
    {
      key: "totalArea",
      label: "Площадь жилых помещений",
      type: "number",
      unit: "м²",
      min: 10,
      max: 1000,
      step: 0.1,
      defaultValue: 80,
      hideIf: { key: "calculationMode", op: "eq", value: 1 },
      hint: "Без кухни, санузлов, кладовых и других подсобных помещений.",
    },
    {
      key: "ceilingHeight",
      label: "Высота помещений",
      type: "number",
      unit: "м",
      min: 2.2,
      max: 5,
      step: 0.05,
      defaultValue: 2.7,
      hideIf: { key: "calculationMode", op: "eq", value: 1 },
      hint: "Введите в метрах: например, 2,7 м.",
    },
    {
      key: "peopleCount",
      label: "Постоянно находящихся людей",
      type: "number",
      unit: "чел.",
      min: 1,
      max: 50,
      step: 1,
      integerOnly: true,
      defaultValue: 3,
      hideIf: { key: "calculationMode", op: "eq", value: 1 },
    },
    {
      key: "projectAirflowM3h",
      label: "Проектный расход воздуха",
      type: "number",
      unit: "м³/ч",
      min: 1,
      max: 100000,
      step: 10,
      defaultValue: 300,
      hideIf: { key: "calculationMode", op: "eq", value: 0 },
      hint: "Готовое значение из расчёта вентиляции; калькулятор не проверяет, как оно получено.",
    },
    {
      key: "ductShape",
      label: "Форма проверяемого канала",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Круглый" },
        { value: 1, label: "Прямоугольный" },
      ],
      fullWidth: true,
    },
    {
      key: "roundDiameterMm",
      label: "Внутренний диаметр",
      type: "number",
      unit: "мм",
      min: 80,
      max: 2000,
      step: 5,
      defaultValue: 200,
      hideIf: { key: "ductShape", op: "eq", value: 1 },
    },
    {
      key: "rectWidthMm",
      label: "Внутренняя ширина",
      type: "number",
      unit: "мм",
      min: 100,
      max: 3000,
      step: 10,
      defaultValue: 300,
      hideIf: { key: "ductShape", op: "eq", value: 0 },
    },
    {
      key: "rectHeightMm",
      label: "Внутренняя высота",
      type: "number",
      unit: "мм",
      min: 50,
      max: 3000,
      step: 10,
      defaultValue: 200,
      hideIf: { key: "ductShape", op: "eq", value: 0 },
    },
    {
      key: "targetVelocityMps",
      label: "Целевая скорость для проверки",
      type: "number",
      unit: "м/с",
      min: 0.5,
      max: 15,
      step: 0.1,
      defaultValue: 3,
      hint: "Проектное ограничение. Оно служит для сравнения, а не заменяет проверку шума и потерь давления.",
    },
    {
      key: "selectedFanCapacityM3h",
      label: "Паспортная производительность вентилятора",
      type: "number",
      unit: "м³/ч",
      min: 0,
      max: 100000,
      step: 10,
      defaultValue: 0,
      hint: "Необязательно. 0 — вентилятор не проверять. Фактический расход определяется рабочей точкой сети.",
    },
    {
      key: "ductLengthM",
      label: "Длина воздуховода по трассе",
      type: "number",
      unit: "м",
      min: 0,
      max: 10000,
      step: 0.1,
      defaultValue: 0,
      hint: "По проекту или замеру. Калькулятор не угадывает трассу по площади.",
    },
    {
      key: "stockLengthM",
      label: "Длина покупного отрезка",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 50,
      step: 0.1,
      defaultValue: 3,
    },
    {
      key: "ductReservePercent",
      label: "Запас длины",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      hint: "Явный запас на подрезку и уточнение трассы; скрытых надбавок нет.",
    },
    {
      key: "fittingCount",
      label: "Фасонные элементы по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
    {
      key: "airTerminalCount",
      label: "Решётки и диффузоры по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
    {
      key: "clampCount",
      label: "Хомуты и крепления по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 50000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalVentilation(ventilationSpec as any, inputs);
    const totals = { ...canonical.totals };
    if (totals.calculationMode === 1) {
      totals.totalArea = 0;
      totals.volume = 0;
    }
    const formatMetric = (value: number, maximumFractionDigits = 2) =>
      new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);
    const hasPurchase = totals.recPurchase > 0;
    return {
      materials: canonical.materials,
      totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      summaryCards: [
        {
          icon: "💨",
          label: "Расчётный расход",
          value: formatMetric(totals.requiredAirflow, 1),
          unit: "м³/ч",
          hint: totals.calculationMode === 0 ? "предварительный минимум для жилья" : "принят из проекта",
          tone: "violet",
        },
        {
          icon: "📐",
          label: "Скорость в канале",
          value: formatMetric(totals.actualVelocityMps),
          unit: "м/с",
          hint: `цель ${formatMetric(totals.targetVelocityMps)} м/с`,
          tone: totals.actualVelocityMps > totals.targetVelocityMps ? "amber" : "emerald",
        },
        {
          icon: hasPurchase ? "🛒" : "🧭",
          label: "Закупка трассы",
          value: hasPurchase ? formatMetric(totals.recPurchase, 1) : "Не задана",
          unit: hasPurchase ? "м" : undefined,
          hint: hasPurchase
            ? `${formatMetric(totals.ductSections, 0)} отрезков по ${formatMetric(totals.stockLengthM)} м`
            : "внесите длину из проекта или замера",
          tone: hasPurchase ? "emerald" : "slate",
        },
      ],
    };
  },
  formulaDescription: `
**Предварительный жилой режим (помещения с естественным проветриванием):**
- если на человека приходится более 20 м²: L = max(N × 30 м³/ч, V × 0,35 1/ч);
- если не более 20 м²: L = S × 3 м³/(ч·м²).

**Проверка воздуховода:**
- v = L / (3600 × A);
- Aтреб = L / (3600 × vцель).

Закупка считается только по введённой длине трассы и фактической длине покупного отрезка.
  `,
  howToUse: [
    "Выберите предварительный жилой расчёт или введите готовый проектный расход",
    "Укажите внутреннее сечение проверяемого воздуховода и целевую скорость",
    "При необходимости сравните паспортную производительность выбранного вентилятора",
    "Для закупки внесите длину трассы и штучные элементы из проектной ведомости",
    "Проверьте предупреждения: они показывают границы применимости результата",
  ],
  faq: [
    {
      question: "Почему калькулятор больше не подбирает вентилятор только по площади?",
      answer:
        "Площадь не задаёт сопротивление сети. Рабочую точку вентилятора определяют расход, потери давления на прямых участках и местных сопротивлениях, фильтры, клапаны и характеристика самого оборудования.",
    },
    {
      question: "Что означает расчётная скорость в воздуховоде?",
      answer:
        "Это средняя скорость при заданном расходе и внутреннем сечении. Она помогает отсеять явно тесный канал, но не заменяет аэродинамический расчёт потерь давления и акустическую проверку.",
    },
    {
      question: "Почему длина воздуховода по умолчанию равна нулю?",
      answer:
        "Трассу нельзя достоверно получить из площади здания. Введите длину по плану или замеру — тогда калькулятор округлит её до покупных отрезков и добавит только указанный вами запас.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что рассчитывает калькулятор вентиляции</h2>
<p>Калькулятор разделяет три разных задачи: предварительную оценку минимального расхода наружного воздуха для жилья, проверку выбранного сечения по средней скорости и закупку воздуховодов по готовой трассе. Он не выдаёт площадь здания за полноценный проект вентиляции.</p>

<h2>Предварительный расход наружного воздуха</h2>
<p>Для жилых помещений с естественным проветриванием использована логика приложения В СП 60.13330.2020. При площади более 20 м² на человека сравниваются 30 м³/ч на человека и 0,35 объёма помещения в час; принимается большее значение. При площади до 20 м² на человека используется 3 м³/ч на каждый квадратный метр жилой площади.</p>
<p>Это не итоговый баланс квартиры или дома. Вытяжные расходы кухни, санузлов и других помещений, перетоки между комнатами и компенсацию вытяжки определяют по планировке и требованиям к конкретному зданию.</p>

<h2>Проверка сечения воздуховода</h2>
<p>Средняя скорость определяется по формуле <strong>v = L / (3600 × A)</strong>, где L — расход воздуха в м³/ч, A — свободная площадь сечения в м². Калькулятор также показывает теоретическое сечение и эквивалентный круглый диаметр для заданной целевой скорости.</p>
<p>Эта проверка не учитывает шероховатость, длину сети, отводы, тройники, решётки, фильтры и другие сопротивления. Поэтому по одному диаметру нельзя подтвердить давление, шум или фактическую производительность вентилятора.</p>

<h2>Закупка воздуховодов</h2>
<p>Длина трассы, фасонные элементы, воздухораспределители и крепёж вводятся из проекта или замера. MIN показывает длину без запаса, REC и MAX — с явно заданным запасом. Количество округляется вверх до целых покупных отрезков; скрытых коэффициентов нет.</p>

<h2>Нормативная база и границы применения</h2>
<p>Расчётная граница опирается на СП 60.13330.2020 с актуальными изменениями, СП 54.13330.2022 для многоквартирных жилых зданий и ГОСТ Р 70824-2023 для устройства и контроля систем вентиляции. Противопожарные решения, дымоудаление, защита от конденсата, автоматика и электроснабжение требуют отдельного проекта.</p>
`,
    faq: [
      {
        question: "Можно ли по этому расчёту сразу купить вентилятор?",
        answer: "<p>Нет. Можно сравнить паспортную производительность с требуемым расходом, но окончательный выбор делают по рабочей точке: расходу и давлению на характеристике вентилятора с учётом сопротивления сети.</p>",
      },
      {
        question: "Как проверить прямоугольный воздуховод?",
        answer: "<p>Введите внутреннюю ширину и высоту. Калькулятор перемножит их, получит свободное сечение и определит среднюю скорость при расчётном расходе.</p>",
      },
      {
        question: "Почему REC и MAX совпадают?",
        answer: "<p>Для проектной ведомости консервативный запас должен быть явным. Оба сценария используют введённый процент и не добавляют второй скрытый коэффициент.</p>",
      },
    ],
  },
};
