import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFence } from "../../../../engine/fence";
import fenceSpec from "../../../../configs/calculators/fence-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const fenceDef: CalculatorDefinition = {
  id: "fence",
  slug: "zabor",
  title: "Калькулятор забора",
  h1: "Калькулятор забора онлайн — расчёт материалов для ограждения",
  description: "Рассчитайте столбы, лаги, профлист или сетку-рабицу и крепёж для забора любой длины.",
  metaTitle: withSiteMetaTitle("Калькулятор забора | Расчёт профлиста, столбов, сетки"),
  metaDescription: "Бесплатный калькулятор забора: рассчитайте профлист, столбы, поперечные лаги, сетку и крепёж по длине и высоте ограждения участка.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["забор", "профлист", "ограждение", "столбы", "сетка-рабица", "лаги для забора"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "fenceLength",
      label: "Длина забора",
      type: "slider",
      unit: "м",
      min: 5,
      max: 500,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "fenceHeight",
      label: "Высота забора",
      type: "slider",
      unit: "м",
      min: 1,
      max: 3,
      step: 0.1,
      defaultValue: 2,
    },
    {
      key: "fenceType",
      label: "Тип забора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Из профнастила (на столбах)" },
        { value: 1, label: "Сетка-рабица (на столбах)" },
        { value: 2, label: "Деревянный штакетник" },
      ],
    },
    {
      key: "postStep",
      label: "Шаг столбов",
      type: "select",
      defaultValue: 2.5,
      options: [
        { value: 2.0, label: "2.0 м" },
        { value: 2.5, label: "2.5 м (стандарт)" },
        { value: 3.0, label: "3.0 м" },
      ],
    },
    {
      key: "gatesCount",
      label: "Ворота (двустворчатые, 4 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "wicketsCount",
      label: "Калитки (1 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
  ],
  calculate(inputs) {
    const spec = fenceSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFence(spec, inputs, factorTable);

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
**Расчёт забора:**
Столбов = ⌈Длина / Шаг⌉ + 1 + Ворота×2 + Калитки×2
Листов профнастила = ⌈Длина_нетто / 1.15⌉

Стандарты:
- Шаг столбов: 2–3 м (оптимально 2.5 м)
- Профнастил С20: полезная ширина 1.15 м
- Глубина забивки столбов: 0.7–1.0 м (ниже точки промерзания)
  `,
  howToUse: [
    "Введите длину забора",
    "Укажите высоту и тип заполнения",
    "Задайте шаг столбов",
    "Укажите количество ворот и калиток",
    "Нажмите «Рассчитать» — получите все материалы",
  ],
  faq: [
    {
      question: "Какой шаг столбов оптимален для забора из профлиста?",
      answer:
        "Частый ориентир — около 2.5 м: удобно по монтажу и жёсткости секции. На ветреных участках, при высокой высоте или рядом с воротами/углами шаг обычно уменьшают, потому что там нагрузки выше.",
    },
    {
      question: "Нужно ли учитывать ворота и калитку отдельно?",
      answer:
        "Да. Это отдельные узлы с усилением: дополнительные столбы, каркас, фурнитура и часто другой фундамент/закладные. Если считать «просто вычесть длину», чаще всего возникает недобор именно по опорам и комплектующим.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта забора</h2>
<p>Основные расчётные формулы:</p>
<p><strong>Столбы = &lceil;L / Шаг&rceil; + 1 + N<sub>ворот</sub> &times; 2 + N<sub>калиток</sub> &times; 2</strong></p>
<p><strong>Лаги = L<sub>нетто</sub> &times; K<sub>рядов</sub></strong> (2 ряда при H &le; 2 м, 3 ряда при H &gt; 2 м)</p>
<p><strong>Листы профнастила = &lceil;L<sub>нетто</sub> / 1.15 м&rceil;</strong></p>
<ul>
  <li><strong>L</strong> — общая длина забора (м)</li>
  <li><strong>Шаг</strong> — расстояние между столбами (обычно 2.5 м)</li>
  <li><strong>L<sub>нетто</sub></strong> — длина за вычетом ворот и калиток</li>
  <li><strong>1.15 м</strong> — полезная ширина листа С20 с нахлёстом</li>
</ul>

<h2>Расход материалов по типу забора</h2>
<table>
  <thead>
    <tr><th>Элемент</th><th>Профнастил</th><th>Сетка-рабица</th><th>Штакетник</th></tr>
  </thead>
  <tbody>
    <tr><td>Столбы (труба)</td><td>60&times;60 мм</td><td>48&times;48 мм</td><td>60&times;60 мм</td></tr>
    <tr><td>Лаги</td><td>40&times;20 мм, 2–3 ряда</td><td>Не нужны</td><td>40&times;20 мм, 2–3 ряда</td></tr>
    <tr><td>Заполнение</td><td>C20, 0.45–0.5 мм</td><td>Рулон 10&times;1.5 м</td><td>Штакетина 100 мм</td></tr>
    <tr><td>Саморезы</td><td>6 шт/лист</td><td>&mdash;</td><td>4 шт/штакетина</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Установка заборов регулируется <strong>СП 53.13330.2019</strong> «Планировка и застройка территорий садоводческих объединений граждан» и местными градостроительными нормами. Высота глухого забора между участками обычно ограничена <strong>1.5–1.8 м</strong> (по местным правилам), со стороны улицы — до <strong>2.0–2.2 м</strong>. Глубина заделки столбов — ниже глубины промерзания грунта.</p>

<h2>Рекомендации по монтажу</h2>
<ul>
  <li><strong>Шаг столбов</strong> — 2.0–2.5 м (оптимально 2.5 м для профнастила)</li>
  <li><strong>Глубина заделки</strong> — 0.7–1.2 м (ниже глубины промерзания)</li>
  <li><strong>Бетонирование</strong> — обязательно для несущих и воротных столбов</li>
  <li><strong>Антикоррозийная обработка</strong> — грунтовка + покраска подземной части</li>
</ul>
`,
    faq: [
      {
        question: "Сколько столбов нужно на забор 50 метров?",
        answer: "<p>При стандартном шаге 2.5 м, с 1 воротами и 1 калиткой:</p><p>Столбы = &lceil;50 / 2.5&rceil; + 1 + 2 (ворота) + 2 (калитка) = 21 + 4 = <strong>25 столбов</strong></p><p>Материал столба:</p><ul><li><strong>Профнастил</strong> — труба 60&times;60&times;2 мм, длина 3 м (2 м над землёй + 1 м заделка)</li><li><strong>Сетка-рабица</strong> — труба 48&times;48&times;2 мм, длина 2.5 м</li></ul><p>На воротные столбы выбирают усиленную трубу <strong>80&times;80 мм</strong> или <strong>100&times;100 мм</strong> с бетонированием.</p>",
      },
      {
        question: "Сколько листов профнастила нужно на забор?",
        answer: "<p>Количество листов профнастила С20 (полезная ширина 1.15 м):</p><p><strong>N = &lceil;L<sub>нетто</sub> / 1.15&rceil;</strong></p><p>Для забора 50 м (за вычетом ворот 4 м и калитки 1 м): L = 50 &minus; 5 = <strong>45 м</strong></p><p>N = &lceil;45 / 1.15&rceil; = <strong>40 листов</strong></p><p>Высота листа: <strong>2.0 м</strong> (стандарт). Саморезов кровельных: 40 &times; 6 = <strong>240 шт</strong>.</p><p>Поперечные лаги (40&times;20 мм): 45 м &times; 2 ряда = <strong>90 м.п.</strong> (15 штук по 6 м).</p>",
      },
      {
        question: "Нужно ли бетонировать столбы забора?",
        answer: "<p>Бетонирование зависит от типа грунта и нагрузки:</p><ul><li><strong>Обязательно</strong> — воротные и калиточные столбы (повышенная нагрузка)</li><li><strong>Рекомендуется</strong> — на глинистых и пучинистых грунтах (все столбы)</li><li><strong>Можно забивать</strong> — на песчаных и скальных грунтах (если высота &le; 2 м)</li></ul><p>При бетонировании: яма &oslash;200 мм, глубина 1.0–1.2 м. Расход бетона на 1 столб: <strong>0.03–0.04 м&sup3;</strong>. На 25 столбов: &asymp; <strong>1 м&sup3;</strong> бетона М200.</p>",
      },
    ],
  },
};


