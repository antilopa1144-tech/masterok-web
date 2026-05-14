import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalBrickwork } from "../../../../engine/brickwork";
import brickworkSpec from "../../../../configs/calculators/brickwork-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

// Кирпичей на 1 м² стены с учётом шва 10 мм (по ГОСТ)
// [0.5 кирпича, 1 кирпич, 1.5 кирпича, 2 кирпича]
const BRICKS_PER_SQM: Record<number, [number, number, number, number]> = {
  0: [51, 102, 153, 204],  // одинарный 250×120×65
  1: [39, 78, 117, 156],   // полуторный 250×120×88
  2: [26, 52, 78, 104],    // двойной 250×120×138
};

// Расход раствора м³ на 1 м³ кладки
const MORTAR_PER_M3: Record<number, number> = {
  0: 0.221, // одинарный
  1: 0.195, // полуторный
  2: 0.166, // двойной
};

// Толщина стены в мм
const WALL_THICKNESS_MM: Record<number, number> = {
  0: 120, // в полкирпича
  1: 250, // в кирпич
  2: 380, // в 1.5 кирпича
  3: 510, // в 2 кирпича
};

const BRICK_HEIGHTS: Record<number, number> = {
  0: 65,  // одинарный
  1: 88,  // полуторный
  2: 138, // двойной
};

export const brickworkDef: CalculatorDefinition = {
  id: "brickwork",
  slug: "kladka-kirpicha",
  title: "Калькулятор кладки кирпича",
  h1: "Калькулятор кладки кирпича онлайн — расчёт кирпича и раствора",
  description: "Рассчитайте количество кирпича, раствора и кладочной сетки для стен. Нормы по ГОСТ 530-2012.",
  metaTitle: withSiteMetaTitle("Калькулятор кладки кирпича | Расчёт кирпича и раствора"),
  metaDescription: "Бесплатный калькулятор кладки кирпича: рассчитайте кирпич, раствор и сетку для стены в полкирпича, кирпич или полтора кирпича. По ГОСТ 530-2012.",
  category: "walls",
  categorySlug: "steny",
  tags: ["кирпич", "кладка", "раствор", "кирпичная стена", "рядовой кирпич", "кладочная сетка"],
  popularity: 80,
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
      key: "brickFormat",
      label: "Формат кирпича",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Одинарный (250×120×65 мм)" },
        { value: 1, label: "Полуторный (250×120×88 мм)" },
        { value: 2, label: "Двойной (250×120×138 мм)" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина стены",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "В полкирпича (120 мм) — перегородки" },
        { value: 1, label: "В кирпич (250 мм) — несущие стены" },
        { value: 2, label: "В 1.5 кирпича (380 мм) — наружные стены" },
        { value: 3, label: "В 2 кирпича (510 мм) — наружные стены" },
      ],
    },
    {
      key: "mortarJoint",
      label: "Толщина растворного шва",
      type: "slider",
      unit: "мм",
      min: 8,
      max: 15,
      step: 1,
      defaultValue: 10,
    },
  ],
  calculate(inputs) {
    const spec = brickworkSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalBrickwork(spec, inputs, factorTable);

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
**Расход кирпича на 1 м² стены (шов 10 мм, ГОСТ 530-2012):**

| Формат | 0.5 кирп. | 1 кирп. | 1.5 кирп. | 2 кирп. |
|--------|-----------|---------|-----------|---------|
| Одинарный | 51 | 102 | 153 | 204 |
| Полуторный | 39 | 78 | 117 | 156 |
| Двойной | 26 | 52 | 78 | 104 |

**Расход раствора:** 0.17–0.22 м³ на 1 м³ кладки (зависит от формата кирпича).
  `,
  howToUse: [
    "Введите размеры стен или общую площадь",
    "Укажите площадь проёмов (окна, двери)",
    "Выберите формат кирпича и толщину стены",
    "Нажмите «Рассчитать» — получите кирпич, раствор и сетку",
  ],
faq: [
    {
      question: "Сколько кирпича уходит на 1 м² стены?",
      answer:
        "Зависит от формата кирпича (одинарный, полуторный, двойной), толщины стены, схемы перевязки и толщины шва. Ориентир для одинарного в «один кирпич» — около 102 шт/м² при типовом шве; для других вариантов смотрите таблицу расхода в описании калькулятора и добавляйте запас на бой и подрезку.",
    },
    {
      question: "Какой запас кирпича закладывать при расчёте?",
      answer:
        "Обычно 5–7% на простых стенах с малым количеством подрезки. При сложной геометрии, лицевой кладке, арках и строгом подборе по цвету — 8–10% и выше: добор из другой партии часто отличается по оттенку.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта кирпичной кладки</h2>
<p>Количество кирпича для стены рассчитывается по формуле:</p>
<p><strong>N = (S<sub>стены</sub> &minus; S<sub>проёмов</sub>) &times; R &times; (1 + З/100)</strong></p>
<ul>
  <li><strong>S<sub>стены</sub></strong> — общая площадь стены (м&sup2;)</li>
  <li><strong>S<sub>проёмов</sub></strong> — площадь оконных и дверных проёмов (м&sup2;)</li>
  <li><strong>R</strong> — расход кирпича на 1 м&sup2; при выбранной толщине стены (шт/м&sup2;)</li>
  <li><strong>З</strong> — запас на бой и подрезку (%)</li>
</ul>

<h2>Расход раствора на кирпичную кладку</h2>
<table>
  <thead>
    <tr><th>Формат кирпича</th><th>Расход раствора на 1 м&sup3; кладки</th><th>Примечание</th></tr>
  </thead>
  <tbody>
    <tr><td>Одинарный (65 мм)</td><td>0.221 м&sup3;</td><td>Наибольший расход</td></tr>
    <tr><td>Полуторный (88 мм)</td><td>0.195 м&sup3;</td><td>Средний расход</td></tr>
    <tr><td>Двойной (138 мм)</td><td>0.166 м&sup3;</td><td>Экономичный вариант</td></tr>
  </tbody>
</table>
<p>Расход указан для шва толщиной 10 мм. Армирование кладочной сеткой 50&times;50&times;4 мм выполняется каждые 5 рядов одинарного кирпича.</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 70.13330.2012</strong> &laquo;Несущие и ограждающие конструкции&raquo;</li>
  <li><strong>СП 15.13330.2020</strong> &laquo;Каменные и армокаменные конструкции&raquo;</li>
  <li><strong>ГОСТ 530-2012</strong> &laquo;Кирпич и камень керамические&raquo;</li>
  <li><strong>ГОСТ 28013-98</strong> &laquo;Растворы строительные&raquo;</li>
</ul>
<p>Толщина горизонтального шва: <strong>10&ndash;15 мм</strong>, вертикального: <strong>8&ndash;12 мм</strong> по СП 70.13330.</p>
`,
    faq: [
      {
        question: "Сколько раствора уходит на 1 м3 кирпичной кладки?",
        answer: "<p>Расход кладочного раствора зависит от формата кирпича и толщины шва:</p><ul><li>Одинарный кирпич (65 мм): <strong>0.221 м&sup3;</strong> раствора на 1 м&sup3; кладки</li><li>Полуторный (88 мм): <strong>0.195 м&sup3;</strong></li><li>Двойной (138 мм): <strong>0.166 м&sup3;</strong></li></ul><p>При толщине шва 12 мм вместо 10 мм расход увеличивается на 15&ndash;20%. Данные приведены для полнотелого кирпича; для пустотелого расход раствора выше на 10&ndash;15% за счёт заполнения пустот.</p>",
      },
      {
        question: "Через сколько рядов армировать кирпичную кладку?",
        answer: "<p>По <strong>СП 15.13330</strong> армирование кирпичной кладки выполняется:</p><ul><li><strong>Каждые 5 рядов</strong> одинарного кирпича (325 мм по высоте)</li><li><strong>Каждые 4 ряда</strong> полуторного кирпича (352 мм)</li><li><strong>Каждые 3 ряда</strong> двойного кирпича (414 мм)</li></ul><p>Применяется сетка: кладочная 50&times;50&times;4 мм или арматура &Oslash;4&ndash;5 мм. Обязательно армирование под оконными проёмами, на углах и в зонах концентрации нагрузки.</p>",
      },
      {
        question: "Какая толщина шва допускается в кирпичной кладке?",
        answer: "<p>По <strong>СП 70.13330</strong> допустимая толщина растворных швов:</p><table><thead><tr><th>Тип шва</th><th>Стандарт, мм</th><th>Допуск, мм</th></tr></thead><tbody><tr><td>Горизонтальный</td><td>12</td><td>10&ndash;15</td></tr><tr><td>Вертикальный</td><td>10</td><td>8&ndash;12</td></tr></tbody></table><p>Среднее значение по высоте 10 рядов не должно отклоняться более чем на &plusmn;2 мм от проектного. Для лицевой кладки требования к ровности шва ещё строже.</p>",
      },
    ],
  },
};

