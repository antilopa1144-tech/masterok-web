import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFacadeBrick } from "../../../../engine/facade-brick";
import facadebrickSpec from "../../../../configs/calculators/facade-brick-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const facadeBrickDef: CalculatorDefinition = {
  id: "exterior_brick",
  slug: "oblitsovochnyj-kirpich",
  title: "Калькулятор облицовочного кирпича",
  h1: "Калькулятор облицовочного кирпича — расчёт для фасада",
  description: "Рассчитайте количество облицовочного (фасадного) кирпича, раствора и анкеров для облицовки фасада или цоколя.",
  metaTitle: withSiteMetaTitle("Калькулятор облицовочного кирпича | Фасад"),
  metaDescription: "Бесплатный калькулятор облицовочного кирпича: рассчитайте фасадный кирпич, раствор и гибкие связи для облицовки дома или цоколя.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["облицовочный кирпич", "фасадный кирпич", "облицовка фасада", "клинкер", "кирпич"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь облицовки (без проёмов)",
      type: "slider",
      unit: "м²",
      min: 5,
      max: 1000,
      step: 5,
      defaultValue: 80,
    },
    {
      key: "brickType",
      label: "Тип кирпича",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Одинарный (250×120×65 мм)" },
        { value: 1, label: "Полуторный (250×120×88 мм)" },
        { value: 2, label: "Двойной (250×120×138 мм)" },
        { value: 3, label: "Клинкерный (250×85×65 мм)" },
      ],
    },
    {
      key: "jointThickness",
      label: "Толщина шва",
      type: "select",
      defaultValue: 10,
      options: [
        { value: 8, label: "8 мм (клинкер, декоративная кладка)" },
        { value: 10, label: "10 мм (стандарт)" },
        { value: 12, label: "12 мм (крупный кирпич)" },
      ],
    },
    {
      key: "withTie",
      label: "Гибкие связи (анкеры)",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Не требуется (вентфасад без связей)" },
        { value: 1, label: "Гибкие связи стеклопластиковые ТПА" },
        { value: 2, label: "Гибкие связи нержавеющая сталь" },
      ],
    },
    {
      key: "windowCount",
      label: "Количество оконных проёмов",
      type: "slider",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 0,
      hint: "Над каждым окном по СП 15.13330.2020 нужна полоса гидроизоляции. Без неё дождь по швам идёт в проём — гниют откосы через 1-2 сезона.",
    },
    {
      key: "avgWindowWidth",
      label: "Средняя ширина окна",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 5,
      step: 0.1,
      defaultValue: 1.5,
      hint: "Полоса гидроизоляции = ширина окна + 0.6 м (по 0.3 м запаса по бокам).",
    },
  ],
  calculate(inputs) {
    const spec = facadebrickSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFacadeBrick(spec, inputs, factorTable);

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
**Расчёт облицовочного кирпича:**
- Одинарный 250×65: ~64 шт/м² (шов 10мм)
- Полуторный 250×88: ~49 шт/м²
- Двойной 250×138: ~31 шт/м²
- Раствор: ~0.23 м³ на 1 м³ кладки (кладка в полкирпича)
- Гибкие связи: 5 шт/м²
  `,
  howToUse: [
    "Введите площадь облицовки (без проёмов)",
    "Выберите тип кирпича и толщину шва",
    "Укажите необходимость гибких связей",
    "Опционально: количество окон и их среднюю ширину — добавится гидроизоляция перемычек по СП 15.13330.2020",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Нужен ли вентиляционный зазор за облицовочным кирпичом?",
      answer:
        "Обычно да: зазор помогает фасаду просыхать и снижает риск высолов/переувлажнения. Чтобы он работал, нужны продухи внизу и вверху кладки (смотрите узел по СП и проекту).",
    },
    {
      question: "Нужно ли считать гибкие связи для облицовочного кирпича?",
      answer:
        "Да. Связи держат облицовку относительно несущей стены; их шаг зависит от высоты, ветровой зоны и зон усиления (углы/проёмы). Если их не учесть, недобор всплывает уже при кладке и исправлять дороже.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта облицовочного кирпича</h2>
<p>Количество кирпича для облицовки фасада в полкирпича:</p>
<p><strong>N = S &times; R &times; (1 + З/100)</strong></p>
<ul>
  <li><strong>S</strong> — площадь облицовки без проёмов (м&sup2;)</li>
  <li><strong>R</strong> — расход кирпича на 1 м&sup2; (шт/м&sup2;)</li>
  <li><strong>З</strong> — запас на бой и подрезку (5&ndash;10%)</li>
</ul>

<h2>Расход облицовочного кирпича на 1 м&sup2; (шов 10 мм)</h2>
<table>
  <thead>
    <tr><th>Формат кирпича</th><th>Размер, мм</th><th>Расход, шт/м&sup2;</th><th>Раствор, м&sup3;/м&sup2;</th></tr>
  </thead>
  <tbody>
    <tr><td>Одинарный</td><td>250&times;120&times;65</td><td>~51</td><td>0.019</td></tr>
    <tr><td>Полуторный</td><td>250&times;120&times;88</td><td>~39</td><td>0.016</td></tr>
    <tr><td>Двойной</td><td>250&times;120&times;138</td><td>~26</td><td>0.013</td></tr>
    <tr><td>Клинкерный</td><td>250&times;85&times;65</td><td>~64</td><td>0.022</td></tr>
  </tbody>
</table>

<h2>Гибкие связи для облицовочной кладки</h2>
<p>Гибкие связи (анкеры) соединяют облицовочный слой с несущей стеной. Расход: <strong>5 шт/м&sup2;</strong> (шаг 500&times;400 мм). В зонах проёмов и углов &mdash; <strong>8&ndash;10 шт/м&sup2;</strong>.</p>
<ul>
  <li><strong>Базальтопластиковые (БПА)</strong> &mdash; не образуют мостиков холода</li>
  <li><strong>Стеклопластиковые (ТПА)</strong> &mdash; лёгкие, не корродируют</li>
  <li><strong>Нержавеющая сталь</strong> &mdash; максимальная прочность</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 15.13330.2020</strong> &laquo;Каменные и армокаменные конструкции&raquo;</li>
  <li><strong>ГОСТ 530-2012</strong> &laquo;Кирпич и камень керамические&raquo;</li>
  <li><strong>ГОСТ 7484-78</strong> &laquo;Кирпич и камни керамические лицевые&raquo;</li>
</ul>
<p>Вентиляционный зазор между облицовкой и несущей стеной: <strong>30&ndash;50 мм</strong>. Продухи внизу и вверху кладки для циркуляции воздуха.</p>
`,
    faq: [
      {
        question: "Сколько облицовочного кирпича нужно на 1 м2 фасада?",
        answer: "<p>Расход облицовочного кирпича на 1 м&sup2; при кладке в полкирпича (шов 10 мм):</p><ul><li>Одинарный (250&times;120&times;65) &mdash; <strong>51 шт/м&sup2;</strong></li><li>Полуторный (250&times;120&times;88) &mdash; <strong>39 шт/м&sup2;</strong></li><li>Клинкерный (250&times;85&times;65) &mdash; <strong>64 шт/м&sup2;</strong></li></ul><p>Пример: фасад 80 м&sup2;, одинарный кирпич: 80 &times; 51 &times; 1.07 = <strong>4 366 шт</strong> с запасом 7%. Рекомендуется брать весь объём из одной партии для однородности цвета.</p>",
      },
      {
        question: "Какой шаг гибких связей для облицовочной кладки?",
        answer: "<p>Стандартный шаг гибких связей по <strong>СП 15.13330</strong>:</p><table><thead><tr><th>Зона фасада</th><th>Шаг связей</th><th>Расход, шт/м&sup2;</th></tr></thead><tbody><tr><td>Основное поле стены</td><td>500 &times; 400 мм</td><td>5</td></tr><tr><td>Зоны проёмов (300 мм от края)</td><td>300 &times; 300 мм</td><td>8&ndash;10</td></tr><tr><td>Углы здания (1 м от угла)</td><td>300 &times; 300 мм</td><td>8&ndash;10</td></tr></tbody></table><p>Длина связи: толщина утеплителя + вентзазор 40 мм + заделка 90 мм в кладку + 90 мм в стену.</p>",
      },
      {
        question: "Нужен ли вентиляционный зазор за облицовочным кирпичом?",
        answer: "<p>Да, вентиляционный зазор <strong>30&ndash;50 мм</strong> обязателен между утеплителем (или несущей стеной) и облицовочной кладкой. Он обеспечивает:</p><ul><li>Удаление конденсата и влаги из конструкции стены</li><li>Предотвращение намокания утеплителя</li><li>Снижение риска высолов на кирпиче</li></ul><p>Для работы вентзазора устраивают <strong>продухи</strong>: незаполненные раствором вертикальные швы в нижнем и верхнем рядах (каждый 3&ndash;4 кирпич). По <strong>СП 23-101-2004</strong> зазор не менее 20 мм, рекомендуемый &mdash; 40 мм.</p>",
      },
    ],
  },
};

