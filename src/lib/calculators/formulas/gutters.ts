import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalGutters } from "../../../../engine/gutters";
import guttersSpec from "../../../../configs/calculators/gutters-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const guttersDef: CalculatorDefinition = {
  id: "roofing_gutters",
  slug: "vodostok",
  title: "Калькулятор водосточной системы",
  h1: "Калькулятор водостока онлайн — расчёт труб и желобов",
  description: "Рассчитайте количество желобов, труб, воронок и крепежа для водосточной системы. Технониколь, Docke, Profil.",
  metaTitle: withSiteMetaTitle("Калькулятор водостока | Расчёт водосточной системы"),
  metaDescription: "Бесплатный калькулятор водостока: рассчитайте желоба, трубы, воронки и держатели для системы Технониколь, Docke или Profil по периметру кровли.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["водосток", "водосточная система", "желоб", "Технониколь", "Docke"],
  popularity: 58,
  complexity: 1,
  fields: [
    {
      key: "roofPerimeter",
      label: "Периметр кровли",
      type: "slider",
      unit: "м",
      min: 5,
      max: 200,
      step: 1,
      defaultValue: 40,
      hint: "Сумма длин всех карнизных свесов, где устанавливается желоб",
    },
    {
      key: "roofHeight",
      label: "Высота стены (от карниза до отмостки)",
      type: "slider",
      unit: "м",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "funnels",
      label: "Количество водосточных воронок",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
      hint: "Одна воронка на 10–12 м желоба",
    },
    {
      key: "gutterDia",
      label: "Диаметр системы",
      type: "select",
      defaultValue: 90,
      options: [
        { value: 75, label: "75 мм (малые строения)" },
        { value: 90, label: "90 мм (жилые дома)" },
        { value: 110, label: "110 мм (большие площади)" },
        { value: 125, label: "125 мм (коммерческие здания)" },
      ],
    },
    {
      key: "gutterLength",
      label: "Длина элементов",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 3, label: "3 м (стандарт)" },
        { value: 4, label: "4 м" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = guttersSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalGutters(spec, inputs, factorTable);

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
**Расчёт водосточной системы:**
- Желоба: Периметр / Длина_элемента × 1.05
- Трубы: на каждую воронку (Высота / Длина_элемента + 1)
- Держатели желоба: шаг 600 мм
- Хомуты труб: шаг 1500 мм
- Воронки: 1 на каждые 10–12 м желоба
  `,
  howToUse: [
    "Введите периметр кровли (длина карнизных свесов)",
    "Укажите высоту стены от карниза до земли",
    "Задайте количество воронок (1 на 10–12 м)",
    "Выберите диаметр системы",
    "Нажмите «Рассчитать» — получите полный список элементов",
  ],
  faq: [
    {
      question: "Сколько воронок нужно для водосточной системы?",
      answer:
        "От длины линии желоба и площади водосбора: типовое правило — около одной воронки на 10–12 м желоба (см. СП 17 и подбор диаметра). На ендовах и длинных карнизах точки ставят так, чтобы не переливал желоб в ливень.",
    },
    {
      question: "Почему важно считать держатели и хомуты отдельно?",
      answer:
        "Без них гнутся желоба и «гуляют» трубы. Калькулятор включает крепёж по периметру и высоте; экономия на держателях часто заканчивается переделкой после сезона дождей и снега.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта водосточной системы</h2>
<p>Основные элементы рассчитываются по периметру кровли и высоте стены:</p>
<p><strong>Желоба = &lceil;P<sub>кровли</sub> / L<sub>элемента</sub>&rceil; &times; 1.05</strong></p>
<p><strong>Трубы = N<sub>воронок</sub> &times; &lceil;H<sub>стены</sub> / L<sub>элемента</sub>&rceil;</strong></p>
<ul>
  <li><strong>P<sub>кровли</sub></strong> — периметр карнизных свесов (м)</li>
  <li><strong>H<sub>стены</sub></strong> — высота от карниза до отмостки (м)</li>
  <li><strong>L<sub>элемента</sub></strong> — длина одного жёлоба/трубы (обычно 3 м)</li>
  <li><strong>N<sub>воронок</sub></strong> — количество водосточных воронок</li>
</ul>

<h2>Расход крепёжных элементов</h2>
<table>
  <thead>
    <tr><th>Элемент</th><th>Шаг / правило</th><th>Формула</th></tr>
  </thead>
  <tbody>
    <tr><td>Держатели желоба</td><td>Через 600 мм</td><td>P / 0.6 + 1 на каждый стык</td></tr>
    <tr><td>Хомуты труб</td><td>Через 1500 мм</td><td>H / 1.5 на каждую трубу</td></tr>
    <tr><td>Воронки</td><td>1 на 10–12 м</td><td>&lceil;P / 10&rceil;</td></tr>
    <tr><td>Соединители желобов</td><td>На каждый стык</td><td>Желоба &minus; 1 (на линию)</td></tr>
    <tr><td>Заглушки</td><td>На торцы</td><td>2 на каждую линию</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Проектирование водостоков выполняется в соответствии с <strong>СП 17.13330.2017</strong> «Кровли» и <strong>СП 32.13330.2018</strong> «Канализация. Наружные сети и сооружения». Пропускная способность водосточной воронки зависит от диаметра системы и площади водосбора. Стандартное правило: одна воронка на <strong>10–12 м</strong> желоба или на <strong>50–80 м&sup2;</strong> площади ската.</p>

<h2>Выбор диаметра системы</h2>
<ul>
  <li><strong>75 мм</strong> — навесы, беседки, малые постройки (до 50 м&sup2; ската)</li>
  <li><strong>90 мм</strong> — жилые дома (до 100 м&sup2; ската на воронку)</li>
  <li><strong>110 мм</strong> — большие дома, коттеджи (до 150 м&sup2; на воронку)</li>
  <li><strong>125 мм</strong> — коммерческие здания, большие площади кровли</li>
</ul>
`,
    faq: [
      {
        question: "Сколько воронок нужно для водостока дома?",
        answer: "<p>Количество воронок определяется длиной карнизных свесов и площадью скатов:</p><ul><li><strong>Основное правило</strong>: 1 воронка на каждые 10–12 м желоба</li><li><strong>По площади</strong>: 1 воронка на 50–80 м&sup2; ската (зависит от диаметра системы)</li></ul><p>Пример: дом 10&times;10 м, периметр 40 м. Воронок: &lceil;40 / 10&rceil; = <strong>4 штуки</strong> (по одной на каждый угол). Каждая воронка требует <strong>отдельную вертикальную трубу</strong> до отмостки.</p>",
      },
      {
        question: "Как рассчитать количество держателей желоба?",
        answer: "<p>Держатели (кронштейны) устанавливаются с шагом <strong>600 мм</strong> по всей длине желоба:</p><p><strong>N = &lceil;L / 0.6&rceil; + 1</strong> (на каждую линию)</p><p>Для дома с периметром 40 м: &lceil;40 / 0.6&rceil; + 4 (по углам) = <strong>71 держатель</strong>.</p><p>Типы держателей:</p><ul><li><strong>Длинные</strong> (крюки) — крепятся к стропилам до монтажа кровли</li><li><strong>Короткие</strong> — крепятся к лобовой доске (можно ставить после кровли)</li></ul><p>Уклон желоба: <strong>3–5 мм на 1 м</strong> в сторону воронки.</p>",
      },
      {
        question: "Пластиковый или металлический водосток — что выбрать?",
        answer: "<p>Сравнение материалов водосточной системы:</p><table><thead><tr><th>Параметр</th><th>Пластик (ПВХ)</th><th>Металл (сталь с покрытием)</th></tr></thead><tbody><tr><td>Цена</td><td>Ниже на 20–30%</td><td>Выше</td></tr><tr><td>Срок службы</td><td>15–25 лет</td><td>25–50 лет</td></tr><tr><td>Шумность</td><td>Тише</td><td>Громче при дожде</td></tr><tr><td>Морозостойкость</td><td>Хрупкость при &minus;25 &deg;C</td><td>Высокая</td></tr><tr><td>Монтаж</td><td>Проще (клеевые соединения)</td><td>Сложнее (замковые)</td></tr></tbody></table><p><strong>Пластик</strong> — для регионов с мягким климатом и малых домов. <strong>Металл</strong> — для северных регионов и больших кровель.</p>",
      },
    ],
  },
};




