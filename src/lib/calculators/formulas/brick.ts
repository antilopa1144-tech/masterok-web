import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalBrick } from "../../../../engine/brick";
import brickSpec from "../../../../configs/calculators/brick-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const brickManufacturerField = buildManufacturerField("brick");

export const brickDef: CalculatorDefinition = {
  id: "brick",
  slug: "kirpich",
  title: "Калькулятор кирпича",
  h1: "Калькулятор кирпича онлайн — расчёт количества кирпичей и раствора",
  description: "Рассчитайте точное количество кирпича, цемента и песка для кладки. Учёт типа кирпича, толщины стены, условий работы.",
  metaTitle: withSiteMetaTitle("Калькулятор кирпича онлайн | Расчёт кладки"),
  metaDescription: "Бесплатный калькулятор кирпичной кладки: рассчитайте количество кирпичей, цемента и песка по площади или размерам стены. Нормы по ГОСТ 530-2012 и СНиП.",
  category: "walls",
  categorySlug: "steny",
  tags: ["кирпич", "кладка", "кирпичная кладка", "стена", "перегородка", "раствор"],
  popularity: 90,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ задания площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallWidth",
      label: "Ширина стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 6,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 10,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь кладки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "brickType",
      label: "Тип кирпича",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Одинарный 250×120×65 мм" },
        { value: 1, label: "Полуторный 250×120×88 мм" },
        { value: 2, label: "Двойной 250×120×138 мм" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина кладки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "0.5 кирпича (120 мм) — перегородка" },
        { value: 1, label: "1 кирпич (250 мм) — стена" },
        { value: 2, label: "1.5 кирпича (380 мм) — несущая" },
        { value: 3, label: "2 кирпича (510 мм) — несущая усил." },
      ],
    },
    {
      key: "workingConditions",
      label: "Условия работы",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Нормальные" },
        { value: 2, label: "Ветреные" },
        { value: 3, label: "Холодные (ниже +5°C)" },
        { value: 4, label: "Жаркие (выше +30°C)" },
      ],
    },
    {
      key: "wasteMode",
      label: "Запас на бой и подрезку",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стандартный (5%)" },
        { value: 1, label: "Усиленный (10%) — сложная геометрия" },
        { value: 2, label: "Минимальный (3%) — опытный мастер" },
      ],
    },
    {
      key: "mortarAdditive",
      label: "Добавка в раствор",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Известь гашёная (традиционно)" },
        { value: 1, label: "Пластификатор (современная)" },
      ],
      hint: "Известь даёт смешанный раствор, лучше удерживает воду и пластичнее. Пластификатор — современная замена.",
    },
    ...(brickManufacturerField ? [brickManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = brickSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalBrick(spec, inputs, factorTable);

    const manufacturer = getManufacturerByIndex("brick", inputs.manufacturer);
    const materials = manufacturer
      ? canonical.materials.map((m) =>
          m.category === "Основное" || m.name.toLowerCase().includes("кирпич")
            ? { ...m, name: `${m.name} — ${manufacturer.name}` }
            : m
        )
      : canonical.materials;

    return {
      materials,
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
**Нормы расчёта кирпичной кладки (ГОСТ 530-2012):**

1. **Количество кирпича**: Рассчитывается исходя из объёма кладки за вычетом растворных швов (стандарт 10 мм).
2. **Расход раствора**: В среднем 0.23–0.25 м³ на 1 м³ кладки.
3. **Запас**: 5% — стандарт на бой при разгрузке и подрезку. 10% — если в стене много проёмов и углов.

**Пропорции раствора М150**: 1 часть цемента М400 на 3 части песка.

**Пластифицирующая добавка в раствор:**
| Добавка       | Расход на 1 м³ раствора | Преимущество                                    |
|---------------|-------------------------|-------------------------------------------------|
| Известь гашёная | 150 кг                | Традиционный смешанный раствор, лучше удерживает воду, пластичнее. Стандарт по СП 15.13330. |
| Пластификатор | 0.5 л                   | Современная замена. Удобнее дозировать, экономия объёма. |

**Обязательная гидроизоляция:** между фундаментом и первым рядом кладки укладывается рубероид по периметру стены (СП 15.13330).

**Инструмент:** кельма, молоток-кирочка, уровень, расшивка, шнур-причалка, ёмкость для замеса.
  `,
  howToUse: [
    "Выберите тип кирпича и толщину стены",
    "Укажите размеры стены или чистую площадь кладки",
    "Выберите условия работы (влияет на расход воды и добавки)",
    "Выберите добавку в раствор — известь (традиционно) или пластификатор (современно)",
    "Укажите желаемый запас (рекомендуем 5%)",
    "Нажмите «Рассчитать» для получения полной сметы",
  ],
  expertTips: [
    {
      title: "Бой кирпича",
      content: "При покупке кирпича рядового (забутовочного) закладывайте минимум 5% на бой. Если кирпич везут издалека навалом, а не на поддонах — бой может составить до 10%.",
      author: "Петрович, каменщик"
    },
    {
      title: "Цвет шва",
      content: "Если кладка лицевая, используйте готовые цветные кладочные смеси. Самодельный раствор из песка и цемента всегда будет «гулять» по оттенку, что испортит вид фасада.",
      author: "Прораб-облицовщик"
    }
  ],
  faq: [
    {
      question: "Нужно ли армировать кладку?",
      answer:
        "Да, в ответственных местах: длинные участки, зоны проёмов, примыкания к жёстким конструкциям, тонкие перегородки. Схему армирования (сетка, шаг по рядам) задаёт проект или типовое решение; она снижает риск трещин при усадке и неравномерной нагрузке.",
    },
    {
      question: "Какой песок лучше для раствора?",
      answer:
        "Нужен чистый песок средней крупности со стабильной фракцией, без избытка глины и органики. От повторяемости замеса зависит прочность шва; «экономия» на качестве песка обычно дороже по переделкам.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта количества кирпича</h2>
<p>Количество кирпича для кладки определяется по формуле:</p>
<p><strong>N = S &times; R &times; (1 + З/100)</strong></p>
<ul>
  <li><strong>N</strong> — количество кирпичей (шт.)</li>
  <li><strong>S</strong> — площадь кладки за вычетом проёмов (м&sup2;)</li>
  <li><strong>R</strong> — расход кирпича на 1 м&sup2; (шт/м&sup2;)</li>
  <li><strong>З</strong> — запас на бой и подрезку (%)</li>
</ul>

<h2>Расход кирпича на 1 м&sup2; стены (шов 10 мм)</h2>
<table>
  <thead>
    <tr><th>Формат кирпича</th><th>0.5 кирпича (120 мм)</th><th>1 кирпич (250 мм)</th><th>1.5 кирпича (380 мм)</th><th>2 кирпича (510 мм)</th></tr>
  </thead>
  <tbody>
    <tr><td>Одинарный 250&times;120&times;65</td><td>51</td><td>102</td><td>153</td><td>204</td></tr>
    <tr><td>Полуторный 250&times;120&times;88</td><td>39</td><td>78</td><td>117</td><td>156</td></tr>
    <tr><td>Двойной 250&times;120&times;138</td><td>26</td><td>52</td><td>78</td><td>104</td></tr>
  </tbody>
</table>
<p>Нормы приведены с учётом растворных швов толщиной 10 мм по <strong>ГОСТ 530-2012</strong>.</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 530-2012</strong> &laquo;Кирпич и камень керамические&raquo;</li>
  <li><strong>СП 15.13330.2020</strong> &laquo;Каменные и армокаменные конструкции&raquo;</li>
  <li><strong>СП 70.13330.2012</strong> &laquo;Несущие и ограждающие конструкции&raquo;</li>
</ul>
<p>Расход раствора М150 (пропорция 1:3 цемент:песок): в среднем <strong>0.23&ndash;0.25 м&sup3; на 1 м&sup3; кладки</strong>. Армирование кладочной сеткой &mdash; каждые 5 рядов одинарного кирпича.</p>
`,
    faq: [
      {
        question: "Сколько кирпича нужно на 1 квадратный метр стены?",
        answer: "<p>Расход зависит от формата кирпича и толщины стены. Для кладки <strong>в один кирпич</strong> (250 мм) с учётом шва 10 мм:</p><ul><li>Одинарный (250&times;120&times;65 мм) &mdash; <strong>102 шт/м&sup2;</strong></li><li>Полуторный (250&times;120&times;88 мм) &mdash; <strong>78 шт/м&sup2;</strong></li><li>Двойной (250&times;120&times;138 мм) &mdash; <strong>52 шт/м&sup2;</strong></li></ul><p>Нормы по <strong>ГОСТ 530-2012</strong>. Для кладки в полкирпича значения вдвое меньше, для полутора кирпичей &mdash; в 1.5 раза больше.</p>",
      },
      {
        question: "Какой запас кирпича закладывать при расчёте?",
        answer: "<p>Рекомендуемый запас на бой и подрезку:</p><table><thead><tr><th>Условия</th><th>Запас, %</th></tr></thead><tbody><tr><td>Простая кладка, опытный мастер</td><td>3&ndash;5%</td></tr><tr><td>Стандартная кладка, прямые стены</td><td>5&ndash;7%</td></tr><tr><td>Много проёмов, углы, декоративные элементы</td><td>8&ndash;10%</td></tr><tr><td>Облицовочная кладка, подбор по тону</td><td>10&ndash;15%</td></tr></tbody></table><p>Для лицевого кирпича важно брать весь объём из одной партии, чтобы избежать разнотона на фасаде.</p>",
      },
      {
        question: "Какой раствор использовать для кирпичной кладки?",
        answer: "<p>Стандартный кладочный раствор марки <strong>М150</strong> готовится в пропорции:</p><ul><li><strong>1 : 3</strong> (цемент М400 : песок) по объёму</li><li>Расход на 1 м&sup3; кладки: <strong>0.23&ndash;0.25 м&sup3;</strong> раствора</li></ul><p>Для облицовочной кладки применяют цветные кладочные смеси. Для зимних работ (ниже +5&deg;C) добавляют противоморозные добавки по <strong>СП 70.13330</strong>. Подвижность раствора для полнотелого кирпича &mdash; 9&ndash;13 см по конусу.</p>",
      },
    ],
  },
};

