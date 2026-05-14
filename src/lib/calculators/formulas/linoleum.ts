import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import linoleumCanonicalSpecJson from "../../../../configs/calculators/linoleum-canonical.v1.json";
import { computeCanonicalLinoleum } from "../../../../engine/linoleum";
import type { LinoleumCanonicalSpec } from "../../../../engine/canonical";

const linoleumCanonicalSpec = linoleumCanonicalSpecJson as LinoleumCanonicalSpec;

export const linoleumDef: CalculatorDefinition = {
  id: "floors_linoleum",
  slug: "linoleum",
  formulaVersion: linoleumCanonicalSpec.formula_version,
  title: "Калькулятор линолеума",
  h1: "Калькулятор линолеума онлайн — расчёт погонных метров и раскроя",
  description: "Рассчитайте количество линолеума с учётом ширины рулона, полос, раппорта рисунка и доборных материалов.",
  metaTitle: withSiteMetaTitle("Калькулятор линолеума | Расчёт погонных метров"),
  metaDescription: "Бесплатный калькулятор линолеума: рассчитайте погонные метры, полосы, швы, клей и плинтус с учётом ширины рулона и рисунка.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["линолеум", "напольное покрытие", "рулонное покрытие", "линолеум ширина"],
  popularity: 60,
  complexity: 2,
  fields: [
    {
      key: "roomLength",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
    },
    {
      key: "roomWidth",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "rollWidth",
      label: "Ширина рулона",
      type: "select",
      defaultValue: 3.5,
      options: [
        { value: 1.5, label: "1.5 м" },
        { value: 2.0, label: "2.0 м" },
        { value: 2.5, label: "2.5 м" },
        { value: 3.0, label: "3.0 м" },
        { value: 3.5, label: "3.5 м (стандарт)" },
        { value: 4.0, label: "4.0 м" },
        { value: 5.0, label: "5.0 м" }
      ],
    },
    {
      key: "hasPattern",
      label: "Рисунок с раппортом",
      type: "switch",
      defaultValue: 0,
    },
    {
      key: "patternRepeat",
      label: "Шаг раппорта",
      type: "slider",
      unit: "см",
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 30,
      hint: "Указан на упаковке рулона",
    },
  ],
  calculate(inputs) {
    return computeCanonicalLinoleum(
      linoleumCanonicalSpec,
      {
        inputMode: inputs.inputMode ?? 0,
        length: inputs.length ?? inputs.roomLength,
        width: inputs.width ?? inputs.roomWidth,
        area: inputs.area,
        roomWidth: inputs.roomWidth,
        perimeter: inputs.perimeter,
        rollWidth: inputs.rollWidth,
        hasPattern: inputs.hasPattern,
        patternRepeatCm: inputs.patternRepeat ?? inputs.patternRepeatCm,
        needGlue: inputs.withGlue ?? 0,
        needPlinth: inputs.withPlinth ?? 1,
        needTape: inputs.needTape ?? 1,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );
  },
  formulaDescription: `
**Раскрой линолеума:**
Калькулятор определяет количество полос по ширине рулона, длину каждой полосы с подрезкой, запас на раппорт рисунка и переводит результат в погонные метры покупки.
Отдельно считаются клей, грунтовка, плинтус и холодная сварка швов.
  `,
  howToUse: [
    "Введите размеры комнаты",
    "Выберите ширину рулона",
    "Если у линолеума рисунок — включите раппорт",
    "Нажмите «Рассчитать» — получите погонные метры, швы, клей и доборные материалы",
  ],
faq: [
    {
      question: "Что делать, если ширина комнаты больше ширины рулона?",
      answer:
        "Нужно несколько полос: считайте швы, длину каждого полотна и при необходимости холодную сварку. Калькулятор заложит метраж и число швов — заранее продумайте, где шов будет менее заметен (свет, мебель).",
    },
    {
      question: "Нужно ли учитывать раппорт рисунка у линолеума?",
      answer:
        "Да, при рисунке с шагом повторения: полотна совмещают по рисунку, метраж по длине растёт. Укажите раппорт в калькуляторе или закладывайте запас по этикетке рулона.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта линолеума</h2>
<p>Расчёт линолеума основан на раскрое рулона по ширине комнаты:</p>
<p><strong>Полосы = &lceil;W<sub>комнаты</sub> / W<sub>рулона</sub>&rceil;</strong></p>
<p><strong>L<sub>покупки</sub> = Полосы &times; (L<sub>комнаты</sub> + запас)</strong></p>
<ul>
  <li><strong>W<sub>комнаты</sub></strong> — ширина комнаты (м)</li>
  <li><strong>W<sub>рулона</sub></strong> — ширина рулона (м)</li>
  <li><strong>L<sub>комнаты</sub></strong> — длина комнаты (м)</li>
  <li><strong>Запас</strong> — 5&ndash;10 см на подрезку у стен + раппорт рисунка</li>
</ul>

<h2>Стандартные ширины рулонов</h2>
<table>
  <thead>
    <tr><th>Ширина, м</th><th>Применение</th><th>Длина рулона, м</th></tr>
  </thead>
  <tbody>
    <tr><td>1.5</td><td>Узкие коридоры, балконы</td><td>15&ndash;25</td></tr>
    <tr><td>2.0</td><td>Маленькие комнаты, кухни</td><td>15&ndash;25</td></tr>
    <tr><td>2.5</td><td>Средние помещения</td><td>15&ndash;25</td></tr>
    <tr><td>3.0</td><td>Жилые комнаты</td><td>15&ndash;30</td></tr>
    <tr><td>3.5</td><td>Стандарт для жилых комнат</td><td>20&ndash;30</td></tr>
    <tr><td>4.0&ndash;5.0</td><td>Большие комнаты, залы</td><td>20&ndash;30</td></tr>
  </tbody>
</table>

<h2>Сопутствующие материалы</h2>
<ul>
  <li><strong>Клей для линолеума:</strong> 300&ndash;500 г/м&sup2; (акриловый, при площади &gt;20 м&sup2;)</li>
  <li><strong>Холодная сварка швов:</strong> 1 тюбик на 10&ndash;15 п.м. шва</li>
  <li><strong>Плинтус:</strong> периметр минус дверные проёмы + 5%</li>
  <li><strong>Двусторонний скотч:</strong> для небольших помещений (&lt;15 м&sup2;)</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 18108-80</strong> &laquo;Линолеум поливинилхлоридный на теплозвукоизолирующей подоснове&raquo;</li>
  <li><strong>ГОСТ 7251-77</strong> &laquo;Линолеум поливинилхлоридный на тканевой и нетканой подоснове&raquo;</li>
  <li><strong>СП 71.13330.2017</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
</ul>
<p>Класс износостойкости для жилых помещений: <strong>23&ndash;31</strong>, для коммерческих: <strong>32&ndash;34</strong>. Акклиматизация рулона перед укладкой: не менее 24 часов при температуре не ниже +15&deg;C.</p>
`,
    faq: [
      {
        question: "Как выбрать ширину рулона линолеума?",
        answer: "<p>Оптимальная ширина рулона &mdash; когда линолеум ложится <strong>одним полотном</strong> без швов:</p><ul><li>Комната 3.2 м шириной &rarr; рулон <strong>3.5 м</strong></li><li>Комната 3.8 м &rarr; рулон <strong>4.0 м</strong></li><li>Комната 4.5 м &rarr; рулон <strong>5.0 м</strong> или два полотна по 2.5 м</li></ul><p>Если без шва не обойтись, стык располагают перпендикулярно окну (параллельно свету) для минимальной заметности. Запас 5&ndash;10 см с каждой стороны &mdash; обязателен.</p>",
      },
      {
        question: "Нужно ли приклеивать линолеум к полу?",
        answer: "<p>Рекомендации по фиксации линолеума:</p><ul><li><strong>До 15 м&sup2;</strong> &mdash; достаточно двустороннего скотча по периметру и у швов</li><li><strong>15&ndash;25 м&sup2;</strong> &mdash; желательно приклеивание по всей площади</li><li><strong>Более 25 м&sup2;</strong> &mdash; приклеивание обязательно</li></ul><p>Расход акрилового клея: <strong>300&ndash;500 г/м&sup2;</strong> (зависит от впитываемости основания). По <strong>СП 71.13330</strong> в общественных помещениях приклеивание обязательно при любой площади.</p>",
      },
      {
        question: "Что такое раппорт рисунка и как он влияет на расход?",
        answer: "<p>Раппорт &mdash; это шаг повторения рисунка на линолеуме. При стыковке двух полотен рисунок должен совпадать, что увеличивает расход:</p><ul><li>Раппорт <strong>30 см</strong> &mdash; дополнительно +30 см к каждому полотну</li><li>Раппорт <strong>60 см</strong> &mdash; +60 см к каждому полотну</li><li>Раппорт <strong>100 см</strong> &mdash; +100 см (максимальный перерасход)</li></ul><p>Пример: 2 полотна по 5 м при раппорте 60 см: вместо 10 п.м. потребуется 10 + 2 &times; 0.6 = <strong>11.2 п.м.</strong> Раппорт указан на этикетке рулона.</p>",
      },
    ],
  },
};

