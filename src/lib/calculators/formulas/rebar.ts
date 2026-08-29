import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalRebar } from "../../../../engine/rebar";
import rebarSpec from "../../../../configs/calculators/rebar-canonical.v1.json";

const hideForGrid = { key: "structureType", op: "ne" as const, value: 0 };
const hideForFrame = { key: "structureType", op: "ne" as const, value: 1 };

export const rebarDef: CalculatorDefinition = {
  id: "rebar",
  slug: "armatura",
  title: "Калькулятор арматуры",
  h1: "Калькулятор арматуры — метраж, вес и прутки к покупке",
  description:
    "Переведите готовую схему сетки или каркаса в точный метраж, массу, вязальную проволоку и целые прутки выбранной длины.",
  metaTitle: withSiteMetaTitle("Калькулятор арматуры: вес, метраж и прутки"),
  metaDescription:
    "Бесплатный калькулятор арматуры: рассчитайте по готовой проектной сетке или каркасу чистый метраж, теоретическую массу, вязальную проволоку и целые прутки 6, 11,7 или 12 м к покупке.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["арматура", "арматурная сетка", "каркас", "вес арматуры", "вязальная проволока"],
  popularity: 74,
  complexity: 3,
  fields: [
    {
      key: "structureType",
      label: "Схема из проекта",
      type: "radio",
      defaultValue: 0,
      fullWidth: true,
      options: [
        { value: 0, label: "Сетка — один или два слоя" },
        { value: 1, label: "Продольный каркас с хомутами" },
      ],
      hint: "Калькулятор не выбирает схему и не проверяет несущую способность",
      group: "Схема",
    },
    {
      key: "length",
      label: "Длина сетки",
      type: "number",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 10,
      hideIf: hideForGrid,
      group: "Сетка из проекта",
    },
    {
      key: "width",
      label: "Ширина сетки",
      type: "number",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 8,
      hideIf: hideForGrid,
      group: "Сетка из проекта",
    },
    {
      key: "gridLayers",
      label: "Количество слоёв сетки",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой — по проекту" },
        { value: 2, label: "2 слоя — по проекту" },
      ],
      hideIf: hideForGrid,
      group: "Сетка из проекта",
    },
    {
      key: "gridStepMm",
      label: "Максимальный шаг стержней",
      type: "number",
      unit: "мм",
      min: 100,
      max: 500,
      step: 10,
      defaultValue: 200,
      hideIf: hideForGrid,
      hint: "Перенесите шаг из проекта; калькулятор размещает крайние стержни в пределах заданного защитного отступа",
      group: "Сетка из проекта",
    },
    {
      key: "edgeCoverMm",
      label: "Отступ стержня от каждой кромки",
      type: "number",
      unit: "мм",
      min: 0,
      max: 150,
      step: 5,
      defaultValue: 50,
      hideIf: hideForGrid,
      hint: "Геометрический отступ до оси крайнего стержня — не автоподбор защитного слоя",
      group: "Сетка из проекта",
    },
    {
      key: "frameLengthM",
      label: "Суммарная длина каркаса",
      type: "number",
      unit: "м",
      min: 1,
      max: 500,
      step: 0.1,
      defaultValue: 36,
      hideIf: hideForFrame,
      hint: "Сложите все прямые участки каркаса; углы, выпуски и анкеровку учтите в проектной ведомости или запасе",
      group: "Каркас из проекта",
    },
    {
      key: "longitudinalBars",
      label: "Продольных стержней в каркасе",
      type: "number",
      min: 2,
      max: 16,
      step: 1,
      integerOnly: true,
      defaultValue: 4,
      hideIf: hideForFrame,
      group: "Каркас из проекта",
    },
    {
      key: "stirrupWidthMm",
      label: "Ширина хомута по оси",
      type: "number",
      unit: "мм",
      min: 100,
      max: 2000,
      step: 10,
      defaultValue: 300,
      hideIf: hideForFrame,
      group: "Каркас из проекта",
    },
    {
      key: "stirrupHeightMm",
      label: "Высота хомута по оси",
      type: "number",
      unit: "мм",
      min: 100,
      max: 3000,
      step: 10,
      defaultValue: 300,
      hideIf: hideForFrame,
      group: "Каркас из проекта",
    },
    {
      key: "stirrupStepMm",
      label: "Шаг хомутов",
      type: "number",
      unit: "мм",
      min: 100,
      max: 1000,
      step: 10,
      defaultValue: 400,
      hideIf: hideForFrame,
      group: "Каркас из проекта",
    },
    {
      key: "stirrupDiameterMm",
      label: "Диаметр хомутов",
      type: "select",
      defaultValue: 8,
      options: [6, 8, 10, 12].map((value) => ({ value, label: `∅${value} мм — по проекту` })),
      hideIf: hideForFrame,
      group: "Каркас из проекта",
    },
    {
      key: "stirrupHookAllowanceMm",
      label: "Припуск на крюки одного хомута",
      type: "number",
      unit: "мм",
      min: 0,
      max: 1500,
      step: 10,
      defaultValue: 300,
      hideIf: hideForFrame,
      hint: "Суммарная дополнительная длина на замыкание одного хомута по детали проекта",
      group: "Каркас из проекта",
    },
    {
      key: "mainDiameter",
      label: "Диаметр основной арматуры",
      type: "select",
      defaultValue: 12,
      options: [6, 8, 10, 12, 14, 16].map((value) => ({ value, label: `∅${value} мм — по проекту` })),
      hint: "Класс и диаметр перенесите из проекта; калькулятор использует диаметр только для теоретической массы",
      group: "Закупка",
    },
    {
      key: "reservePercent",
      label: "Запас на стыки и раскрой",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      hint: "Явный закупочный запас; не заменяет расчёт нахлёстов, анкеровки и карту раскроя",
      group: "Закупка",
    },
    {
      key: "rodLengthM",
      label: "Длина покупного прутка",
      type: "select",
      defaultValue: 11.7,
      options: [
        { value: 6, label: "6 м" },
        { value: 11.7, label: "11,7 м" },
        { value: 12, label: "12 м" },
      ],
      hint: "Выберите фактическую длину у поставщика",
      group: "Закупка",
    },
    {
      key: "tieSharePercent",
      label: "Доля перевязываемых пересечений",
      type: "select",
      unit: "%",
      defaultValue: 100,
      options: [
        { value: 25, label: "25% — по проекту производства работ" },
        { value: 50, label: "50% — по проекту производства работ" },
        { value: 100, label: "100% — каждый узел" },
      ],
      group: "Вязальная проволока",
    },
    {
      key: "wireLengthPerTieM",
      label: "Проволоки на одну вязку",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.3,
      group: "Вязальная проволока",
    },
    {
      key: "wireReservePercent",
      label: "Запас проволоки",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      group: "Вязальная проволока",
    },
    {
      key: "wirePackageKg",
      label: "Фасовка проволоки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 кг" },
        { value: 5, label: "5 кг" },
        { value: 10, label: "10 кг" },
      ],
      group: "Вязальная проволока",
    },
  ],

  calculate(inputs) {
    const canonical = computeCanonicalRebar(rebarSpec as any, inputs);
    return {
      materials: canonical.materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
    };
  },

  formulaDescription: `
**Расчёт выполняется только по готовой проектной схеме:**

1. Для сетки определяется чистая длина стержней в двух направлениях с учётом указанного отступа от кромок, шага и числа слоёв.
2. Для продольного каркаса отдельно считаются основные стержни и хомуты по введённым длине, числу стержней, размерам, шагу и припуску на крюки.
3. Теоретическая масса = метраж × масса одного погонного метра для выбранного диаметра.
4. Запас применяется один раз, после чего каждый диаметр отдельно округляется вверх до целых прутков выбранной длины.
5. Проволока считается по числу пересечений, выбранной доле перевязки, длине на вязку, запасу и фасовке.

Калькулятор не назначает армирование и не проверяет прочность, трещиностойкость, нахлёсты, анкеровку или допустимость сварки.
  `,
  howToUse: [
    "Выберите проектную схему: сетка или продольный каркас",
    "Перенесите размеры, шаги, диаметры и количество стержней из проекта",
    "Укажите закупочный запас и фактическую длину прутка у поставщика",
    "Настройте долю перевязки, расход на узел и фасовку проволоки",
    "Сверьте чистый метраж, расчётную массу и отдельные позиции к покупке",
  ],
  faq: [
    {
      question: "Калькулятор подбирает диаметр и шаг арматуры?",
      answer:
        "Нет. Диаметр, класс, шаг, число слоёв, нахлёсты, анкеровку и форму хомутов назначает конструктор. Здесь готовую схему переводят в метраж, теоретическую массу и закупочные единицы.",
    },
    {
      question: "Почему стержни разных диаметров округляются отдельно?",
      answer:
        "Продольная арматура и хомуты являются разными товарными позициями. Складывать их метраж до округления нельзя: для каждого диаметра нужно своё целое число прутков.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор арматуры</h2>
<p>Калькулятор переводит готовую проектную схему в чистый метраж, теоретическую массу и количество прутков к покупке. Несущую способность и параметры армирования он не определяет.</p>

<h2>Формула массы арматуры</h2>
<p><strong>M = L &times; m<sub>п.м.</sub></strong>, где L — длина стержней, а m<sub>п.м.</sub> — теоретическая масса метра выбранного диаметра.</p>

<h2>Пример: сетка 10 × 8 м, два слоя</h2>
<p>При отступе 50 мм, шаге 200 мм и арматуре ∅12 мм чистый метраж составляет <strong>1 617,6 м</strong>, теоретическая масса — около <strong>1 436,4 кг</strong>. При явном запасе 10% и прутках 11,7 м к покупке получается <strong>153 прутка</strong>. Эти цифры описывают закупку по введённой схеме, а не достаточность армирования.</p>

<h2>Теоретическая масса одного метра</h2>
<table>
  <thead><tr><th>Диаметр</th><th>Масса, кг/м</th></tr></thead>
  <tbody>
    <tr><td>∅6</td><td>0,222</td></tr>
    <tr><td>∅8</td><td>0,395</td></tr>
    <tr><td>∅10</td><td>0,617</td></tr>
    <tr><td>∅12</td><td>0,888</td></tr>
    <tr><td>∅14</td><td>1,210</td></tr>
    <tr><td>∅16</td><td>1,580</td></tr>
  </tbody>
</table>
<p>Фактическая масса партии может отличаться в пределах требований стандарта и документов поставщика.</p>

<h2>Нормативная граница расчёта</h2>
<ul>
  <li><strong>ГОСТ 34028-2016</strong> — технические требования к арматурному прокату;</li>
  <li><strong>ГОСТ 5781-82</strong> — горячекатаная арматурная сталь и табличная теоретическая масса;</li>
  <li><strong>СП 63.13330.2018</strong> — расчёт и конструирование железобетонных элементов.</li>
</ul>
<p>Параметры схемы берут из проекта. Запас в калькуляторе является закупочным и не заменяет расчёт нахлёстов, анкеровки, выпусков и карту раскроя.</p>
`,
    faq: [
      {
        question: "Сколько весит метр арматуры ∅12 мм?",
        answer: "<p>Теоретическая масса одного погонного метра арматуры ∅12 мм — <strong>0,888 кг</strong>. Пруток 11,7 м имеет теоретическую массу около <strong>10,39 кг</strong>.</p>",
      },
      {
        question: "Как считается вязальная проволока?",
        answer: "<p>Число пересечений умножается на выбранную долю перевязки и длину проволоки на одну вязку. Затем применяется отдельный запас и результат округляется до выбранной фасовки.</p>",
      },
    ],
  },
};
