import decorstoneSpec from "../../../../configs/calculators/decor-stone-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { computeCanonicalDecorStone } from "../../../../engine/decor-stone";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

export const decorStoneDef: CalculatorDefinition = {
  id: "walls_decor_stone",
  slug: "dekorativnyj-kamen",
  title: "Калькулятор декоративного камня",
  h1: "Калькулятор декоративного камня онлайн — расчёт покупки",
  description: "Рассчитайте чистую площадь, запас, упаковки камня и расходники по данным с этикеток выбранных материалов.",
  metaTitle: withSiteMetaTitle("Калькулятор декоративного камня: упаковки и расходники"),
  metaDescription: "Бесплатный калькулятор декоративного камня: рассчитайте чистую площадь, запас, реальные упаковки, клей, затирку и грунтовку по паспортным нормам.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["декоративный камень", "облицовочный камень", "упаковки камня", "клей для камня", "затирка"],
  popularity: 50,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По готовой площади" },
      ],
    },
    {
      key: "area",
      label: "Чистая площадь облицовки",
      type: "number",
      unit: "м²",
      min: 1,
      max: 500,
      step: 0.1,
      defaultValue: 15,
      group: "byArea",
      hint: "Если площадь уже посчитана за вычетом окон и дверей",
    },
    {
      key: "wallWidth",
      label: "Ширина стены",
      type: "number",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "number",
      unit: "м",
      min: 0.5,
      max: 10,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "openingsArea",
      label: "Площадь окон и дверей",
      type: "number",
      unit: "м²",
      min: 0,
      max: 200,
      step: 0.1,
      defaultValue: 0,
      group: "bySize",
      hint: "Вычитается из общей площади стены",
    },
    {
      key: "stoneType",
      label: "Тип камня",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гипсовый (лёгкий, интерьер)" },
        { value: 1, label: "Цементный (фасад/интерьер)" },
        { value: 2, label: "Натуральный (тяжёлый)" },
      ],
      hint: "Влияет на предупреждения, но не подменяет норму расхода выбранного клея",
    },
    {
      key: "reservePercent",
      label: "Запас камня",
      type: "slider",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      hint: "Применяется один раз до округления по упаковкам",
    },
    {
      key: "packArea",
      label: "Площадь камня в упаковке",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 1,
      hint: "Укажите значение с коробки выбранной коллекции",
    },
    {
      key: "glueRate",
      label: "Расход клея по паспорту",
      type: "number",
      unit: "кг/м²",
      min: 0.1,
      max: 20,
      step: 0.1,
      defaultValue: 5,
      hint: "Расход зависит от клея, основания, шпателя и формата камня",
    },
    {
      key: "glueBag",
      label: "Масса мешка клея",
      type: "number",
      unit: "кг",
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 25,
    },
    {
      key: "needGrout",
      label: "Нужна затирка швов",
      type: "switch",
      defaultValue: 1,
    },
    {
      key: "groutRate",
      label: "Расход затирки по паспорту",
      type: "number",
      unit: "кг/м²",
      min: 0.01,
      max: 5,
      step: 0.01,
      defaultValue: 0.4,
      hideIf: { key: "needGrout", op: "eq", value: 0 },
    },
    {
      key: "groutBag",
      label: "Масса упаковки затирки",
      type: "number",
      unit: "кг",
      min: 0.5,
      max: 25,
      step: 0.5,
      defaultValue: 5,
      hideIf: { key: "needGrout", op: "eq", value: 0 },
    },
    {
      key: "needPrimer",
      label: "Нужна грунтовка",
      type: "switch",
      defaultValue: 1,
    },
    {
      key: "primerRate",
      label: "Расход грунтовки на слой",
      type: "number",
      unit: "л/м²",
      min: 0.01,
      max: 1,
      step: 0.01,
      defaultValue: 0.15,
      hideIf: { key: "needPrimer", op: "eq", value: 0 },
    },
    {
      key: "primerLayers",
      label: "Количество слоёв грунтовки",
      type: "number",
      min: 1,
      max: 3,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hideIf: { key: "needPrimer", op: "eq", value: 0 },
    },
    {
      key: "primerCan",
      label: "Объём канистры грунтовки",
      type: "number",
      unit: "л",
      min: 0.5,
      max: 20,
      step: 0.5,
      defaultValue: 10,
      hideIf: { key: "needPrimer", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalDecorStone(
      decorstoneSpec as any,
      { ...inputs, accuracyMode: inputs.accuracyMode as any },
      defaultFactorTables.factors as any,
    );

    return {
      materials: canonical.materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
    };
  },
  formulaDescription: `
**Расчёт декоративного камня:**
- Чистая площадь = ширина × высота − площадь проёмов
- Камень = чистая площадь × (1 + запас / 100)
- Упаковки = округление вверх до площади камня в одной коробке
- Клей, затирка и грунтовка = чистая площадь × паспортный расход; покупка округляется до выбранной фасовки
  `,
  howToUse: [
    "Введите готовую чистую площадь или размеры стены и площадь проёмов",
    "Перенесите с упаковок площадь камня, нормы расхода и фасовки расходников",
    "Выберите запас камня на подрезку и подбор оттенка",
    "Сравните точную потребность, целые упаковки и остаток",
  ],
  faq: [
    {
      question: "Почему расход клея не выбирается автоматически по типу камня?",
      answer: "Расход задаёт производитель конкретного клея. Он зависит от основания, размера элементов, зуба шпателя и способа нанесения, поэтому тип камня сам по себе не даёт надёжной нормы.",
    },
    {
      question: "Какую площадь упаковки указывать?",
      answer: "Укажите площадь в квадратных метрах с этикетки коробки выбранной коллекции. У разных коллекций она отличается; угловые элементы могут продаваться отдельно в погонных метрах или штуках.",
    },
    {
      question: "Откуда взять расход затирки и грунтовки?",
      answer: "Используйте паспортные значения выбранных составов. Для грунтовки укажите расход на один слой и фактическое количество слоёв; для затирки — расход в кг/м² для вашей геометрии шва.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как считается декоративный камень</h2>
<p>Сначала калькулятор определяет чистую площадь облицовки. В режиме размеров из площади стены вычитаются окна и двери. Затем один раз добавляется выбранный запас и результат округляется вверх до площади реальной упаковки.</p>
<p><strong>Камень к покупке</strong> = ceil((S<sub>чистая</sub> &times; (1 + запас / 100)) / S<sub>упаковки</sub>) &times; S<sub>упаковки</sub>.</p>

<h2>Почему нормы расходников вводятся с этикетки</h2>
<p>Универсальной нормы клея или затирки только по типу камня нет. На расход влияют характеристики выбранного состава, основание, размер элементов, шпатель и технология монтажа. Поэтому калькулятор использует паспортный расход конкретного материала и отдельно округляет его до массы мешка или объёма канистры.</p>

<h2>Что показывает результат</h2>
<ul>
  <li>чистую площадь без проёмов;</li>
  <li>точную потребность камня с одним запасом;</li>
  <li>целые упаковки и ожидаемый остаток;</li>
  <li>точный расход и количество упаковок клея, затирки и грунтовки.</li>
</ul>
`,
    faq: [
      {
        question: "Как рассчитать коробки декоративного камня?",
        answer: "<p>Разделите площадь с запасом на площадь камня в одной коробке и округлите вверх. Калькулятор делает это отдельно для каждого сценария и показывает остаток после покупки.</p>",
      },
      {
        question: "Нужно ли добавлять запас к клею и грунтовке?",
        answer: "<p>Не добавляйте скрытый запас поверх паспортной нормы. Если производитель уже даёт диапазон, выберите значение, соответствующее вашему основанию и способу нанесения. Калькулятор округлит точную потребность до целой фасовки.</p>",
      },
    ],
  },
};
