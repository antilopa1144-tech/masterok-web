import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFoamBlocks } from "../../../../engine/foam-blocks";
import foamblocksSpec from "../../../../configs/calculators/foam-blocks-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

// Размеры блоков [длина мм, высота мм, толщина мм]
const BLOCK_SIZES: Record<number, [number, number, number, string]> = {
  0: [600, 300, 200, "Пеноблок 600×300×200 мм"],
  1: [600, 300, 100, "Пеноблок 600×300×100 мм (перегородки)"],
  2: [390, 190, 188, "Керамзитоблок 390×190×188 мм"],
  3: [390, 190, 90, "Керамзитоблок 390×190×90 мм (перегородки)"],
};

export const foamBlocksDef: CalculatorDefinition = {
  id: "foam_blocks",
  slug: "penobloki",
  title: "Калькулятор пеноблоков и керамзитоблоков",
  h1: "Калькулятор пеноблоков онлайн — расчёт блоков, клея и арматуры",
  description: "Рассчитайте количество пеноблоков или керамзитоблоков, клея и армирования для стен и перегородок.",
  metaTitle: withSiteMetaTitle("Калькулятор пеноблоков и керамзитоблоков | Расчёт блоков"),
  metaDescription: "Бесплатный калькулятор пеноблоков: рассчитайте пеноблоки D600/D800, керамзитоблоки, клей и сетку для стен и перегородок. По ГОСТ 21520-89.",
  category: "walls",
  categorySlug: "steny",
  tags: ["пеноблок", "керамзитоблок", "кладка", "блоки", "перегородки", "D600", "D800"],
  popularity: 76,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallLength",
      label: "Длина стены (периметр)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 27,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "blockSize",
      label: "Размер блока",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пеноблок 600×300×200 мм (несущие)" },
        { value: 1, label: "Пеноблок 600×300×100 мм (перегородки)" },
        { value: 2, label: "Керамзитоблок 390×190×188 мм (несущие)" },
        { value: 3, label: "Керамзитоблок 390×190×90 мм (перегородки)" },
      ],
    },
    {
      key: "mortarType",
      label: "Тип раствора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Клей для блоков (шов 2–3 мм)" },
        { value: 1, label: "Цементно-песчаная смесь (шов 10 мм)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = foamblocksSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFoamBlocks(spec, inputs, factorTable);

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
**Расчёт блоков:**
Количество = Площадь_нетто / (Длина_блока × Высота_блока) × 1.05

**Расход раствора:**
- Клей: 25 кг/м³ кладки (шов 2–3 мм)
- ЦПС: 0.25 м³/м³ кладки (шов 10 мм)

По ГОСТ 21520-89: армирование каждые 3–4 ряда.
  `,
  howToUse: [
    "Введите размеры стен или общую площадь",
    "Укажите площадь оконных и дверных проёмов",
    "Выберите тип и размер блока",
    "Выберите тип раствора (клей или ЦПС)",
    "Нажмите «Рассчитать» — получите блоки, раствор и армирование",
  ],
faq: [
    {
      question: "Что выбрать для кладки блоков: клей или ЦПС?",
      answer:
        "Для ровных блоков (пеноблок, газобетон) обычно берут тонкошовный клей: тонкий шов меньше мостиков холода и даёт ровную кладку. ЦПС чаще на первом ряду по неровному основании или при «гуляющей» геометрии — но шов толще и выше расход смеси. Согласуйте с типом блока и СП 15.13330.",
    },
    {
      question: "Нужно ли армировать кладку из блоков?",
      answer:
        "Да: типово каждые 3–4 ряда, усиление в первом и верхнем рядах, под и над проёмами и в зонах опирания плит и перемычек — по ГОСТ 21520-89 и СП 15.13330. На длинных стенах и с жёсткими вставками пропуск армирования быстро даёт трещины.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта пеноблоков и керамзитоблоков</h2>
<p>Количество блоков для стены рассчитывается по формуле:</p>
<p><strong>N = S<sub>нетто</sub> / (L<sub>бл</sub> &times; H<sub>бл</sub>) &times; 1.05</strong></p>
<ul>
  <li><strong>S<sub>нетто</sub></strong> — площадь стены за вычетом проёмов (м&sup2;)</li>
  <li><strong>L<sub>бл</sub></strong> — длина блока (м)</li>
  <li><strong>H<sub>бл</sub></strong> — высота блока (м)</li>
  <li><strong>1.05</strong> — запас 5% на подрезку и бой</li>
</ul>

<h2>Размеры и расход блоков на 1 м&sup2; стены</h2>
<table>
  <thead>
    <tr><th>Тип блока</th><th>Размер, мм</th><th>Блоков на 1 м&sup2;</th><th>Блоков в 1 м&sup3;</th></tr>
  </thead>
  <tbody>
    <tr><td>Пеноблок несущий</td><td>600&times;300&times;200</td><td>5.6</td><td>27.8</td></tr>
    <tr><td>Пеноблок перегородочный</td><td>600&times;300&times;100</td><td>5.6</td><td>55.6</td></tr>
    <tr><td>Керамзитоблок несущий</td><td>390&times;190&times;188</td><td>13.5</td><td>71.8</td></tr>
    <tr><td>Керамзитоблок перегородочный</td><td>390&times;190&times;90</td><td>13.5</td><td>149.9</td></tr>
  </tbody>
</table>

<h2>Расход раствора и армирование</h2>
<ul>
  <li><strong>Клей для блоков:</strong> 25 кг/м&sup3; кладки при толщине шва 2&ndash;3 мм</li>
  <li><strong>ЦПС:</strong> 0.25 м&sup3;/м&sup3; кладки при толщине шва 10 мм</li>
  <li><strong>Армирование:</strong> каждые 3&ndash;4 ряда (по ГОСТ 21520-89)</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 21520-89</strong> &laquo;Блоки из ячеистых бетонов стеновые мелкие&raquo;</li>
  <li><strong>ГОСТ 6133-99</strong> &laquo;Камни бетонные стеновые&raquo; (керамзитоблоки)</li>
  <li><strong>СП 15.13330.2020</strong> &laquo;Каменные и армокаменные конструкции&raquo;</li>
</ul>
<p>Пеноблоки D600&ndash;D800 используются для несущих стен, D400&ndash;D500 &mdash; для перегородок и утепления. Керамзитоблоки M50&ndash;M75 &mdash; для несущих стен малоэтажных зданий.</p>
`,
    faq: [
      {
        question: "Чем пеноблок отличается от газоблока?",
        answer: "<p>Основные различия между пеноблоком и газоблоком:</p><table><thead><tr><th>Параметр</th><th>Пеноблок</th><th>Газоблок</th></tr></thead><tbody><tr><td>Производство</td><td>Неавтоклавный</td><td>Автоклавный</td></tr><tr><td>Геометрия</td><td>&plusmn;3&ndash;5 мм</td><td>&plusmn;1&ndash;2 мм</td></tr><tr><td>Прочность (D500)</td><td>B1.5&ndash;B2.5</td><td>B2.5&ndash;B3.5</td></tr><tr><td>Тип кладки</td><td>На клей или ЦПС</td><td>Только на клей</td></tr></tbody></table><p>Газобетон обычно прочнее при той же плотности и имеет лучшую геометрию, что позволяет вести тонкошовную кладку. Пеноблок дешевле, но чаще требует более толстого шва.</p>",
      },
      {
        question: "Нужно ли армировать кладку из пеноблоков?",
        answer: "<p>Да, по <strong>ГОСТ 21520-89</strong> и <strong>СП 15.13330</strong> армирование кладки из пеноблоков обязательно:</p><ul><li>Каждые <strong>3&ndash;4 ряда</strong> по всей длине стены</li><li>Под и над <strong>оконными проёмами</strong> (на 900 мм в стороны)</li><li>В <strong>первом и последнем</strong> рядах кладки</li><li>В зонах опирания <strong>перемычек и плит перекрытия</strong></li></ul><p>Для армирования используют арматуру &Oslash;8&ndash;10 мм в штробах или кладочную сетку 50&times;50&times;4 мм.</p>",
      },
      {
        question: "Какой керамзитоблок лучше: полнотелый или пустотелый?",
        answer:
          "<p>По назначению и марке (ориентир, <strong>ГОСТ 6133-99</strong>):</p><ul><li><strong>Полнотелый</strong> (M75&ndash;M100) &mdash; несущие стены, цоколь, столбы (~17 кг).</li><li><strong>Двухпустотный</strong> (M50&ndash;M75) &mdash; несущие 1&ndash;2 этажа, лучше теплоизоляция (~14 кг).</li><li><strong>Многопустотный</strong> (M35&ndash;M50) &mdash; перегородки и ненагруженные стены (~10 кг).</li></ul><p>В пустотелых блоках раствор не должен заполнять пустоты.</p>",
      },
    ],
  },
};

