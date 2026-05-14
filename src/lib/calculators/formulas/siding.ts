import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalSiding } from "../../../../engine/siding";
import sidingSpec from "../../../../configs/calculators/siding-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const sidingDef: CalculatorDefinition = {
  id: "exterior_siding",
  slug: "sayding",
  title: "Калькулятор сайдинга",
  h1: "Калькулятор сайдинга онлайн — расчёт панелей и комплектующих",
  description: "Рассчитайте количество панелей сайдинга, профиля, угловых и отделочных элементов для фасада.",
  metaTitle: withSiteMetaTitle("Калькулятор сайдинга | Расчёт панелей и комплектующих"),
  metaDescription: "Бесплатный калькулятор сайдинга: рассчитайте панели Docke, Grand Line, стартовые планки, угловые и финишные профили для облицовки фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["сайдинг", "виниловый сайдинг", "Docke", "Grand Line", "фасад", "облицовка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "facadeArea",
      label: "Площадь фасада",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 1000,
      step: 5,
      defaultValue: 150,
      hint: "Общая площадь стен под обшивку",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "perimeter",
      label: "Периметр здания",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 48,
    },
    {
      key: "height",
      label: "Высота стен",
      type: "slider",
      unit: "м",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 6,
    },
    {
      key: "sidingType",
      label: "Тип сайдинга",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Виниловый (полоса 230 мм × 3.66 м)" },
        { value: 1, label: "Металлический (панель 333 мм × 3 м)" },
        { value: 2, label: "Фиброцементный (плита 3600×190 мм)" },
      ],
    },
    {
      key: "cornersCount",
      label: "Количество наружных углов",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 4,
    },
  ],
  calculate(inputs) {
    const spec = sidingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalSiding(spec, inputs, factorTable);

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
**Расчёт сайдинга:**
Панелей = ⌈Площадь_нетто / Площадь_панели × 1.10⌉

Полезная ширина (с учётом нахлёста):
- Виниловый: 200 мм (при ширине 230 мм)
- Металлический: 300 мм (при ширине 333 мм)

Обрешётка: шаг 400–600 мм (перпендикулярно панелям).
  `,
  howToUse: [
    "Введите площадь фасада и вычтите проёмы",
    "Укажите периметр здания и высоту стен",
    "Выберите тип сайдинга",
    "Задайте количество наружных углов",
    "Нажмите «Рассчитать» — получите панели и все комплектующие",
  ],
  faq: [
    {
      question: "Нужен ли запас сайдинга на подрезку?",
      answer:
        "Да. Для простых фасадов обычно хватает 5–10%, для фасадов с множеством углов/окон/фронтонов запас лучше увеличить. Это снижает риск «недобора» и проблем с совпадением партии/тона при докупке.",
    },
    {
      question: "Какой шаг обрешётки делать под сайдинг?",
      answer:
        "Обычно 400–600 мм, но точный шаг зависит от типа панелей и ветровой нагрузки — сверяйте с инструкцией производителя. Редкий шаг даёт волну/вибрацию на ветру, слишком частый — лишний расход без пользы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта сайдинга</h2>
<p>Количество панелей сайдинга:</p>
<p><strong>N = &lceil;S<sub>нетто</sub> / S<sub>панели</sub> &times; K<sub>запас</sub>&rceil;</strong></p>
<ul>
  <li><strong>S<sub>нетто</sub></strong> = Площадь фасада &minus; Площадь проёмов (м&sup2;)</li>
  <li><strong>S<sub>панели</sub></strong> — полезная площадь одной панели (м&sup2;)</li>
  <li><strong>K<sub>запас</sub></strong> — 1.10 (10% на подрезку)</li>
</ul>

<h2>Стандартные размеры панелей сайдинга</h2>
<table>
  <thead>
    <tr><th>Тип сайдинга</th><th>Рабочая ширина</th><th>Длина</th><th>Площадь панели</th></tr>
  </thead>
  <tbody>
    <tr><td>Виниловый (D4.5)</td><td>200 мм</td><td>3660 мм</td><td>0.73 м&sup2;</td></tr>
    <tr><td>Металлический</td><td>300 мм</td><td>3000 мм</td><td>0.90 м&sup2;</td></tr>
    <tr><td>Фиброцементный</td><td>190 мм</td><td>3600 мм</td><td>0.68 м&sup2;</td></tr>
  </tbody>
</table>

<h2>Комплектующие для сайдинга</h2>
<table>
  <thead>
    <tr><th>Элемент</th><th>Формула расчёта</th></tr>
  </thead>
  <tbody>
    <tr><td>Стартовая планка</td><td>Периметр / 3.66 м</td></tr>
    <tr><td>Финишная планка</td><td>Периметр / 3.66 м</td></tr>
    <tr><td>Наружный угол</td><td>Количество_углов &times; Высота / 3.05 м</td></tr>
    <tr><td>J-профиль</td><td>Периметр_проёмов / 3.66 м</td></tr>
    <tr><td>H-профиль (соединительный)</td><td>При длине стены &gt; 3.66 м</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Монтаж сайдинга выполняется по рекомендациям производителей (Docke, Grand Line, Mitten) и общим строительным нормам. Обрешётка устанавливается перпендикулярно панелям с шагом <strong>400–600 мм</strong>. При утеплении используется контробрешётка для создания вентиляционного зазора <strong>25–40 мм</strong>.</p>

<h2>Правила монтажа</h2>
<ul>
  <li><strong>Зазор на расширение</strong> — 5–6 мм у торцов панели (температурное расширение винила)</li>
  <li><strong>Саморезы</strong> — не докручивать на 1 мм (панель должна двигаться)</li>
  <li><strong>Обрешётка</strong> — строго по уровню, перепад не более 2 мм на 3 м</li>
  <li><strong>Направление монтажа</strong> — снизу вверх, от стартовой планки</li>
</ul>
`,
    faq: [
      {
        question: "Сколько панелей сайдинга нужно на дом?",
        answer: "<p>Для дома с фасадом 150 м&sup2; и проёмами 20 м&sup2; (виниловый сайдинг D4.5):</p><ul><li>Площадь нетто: 150 &minus; 20 = <strong>130 м&sup2;</strong></li><li>С запасом 10%: 130 &times; 1.10 = <strong>143 м&sup2;</strong></li><li>Панелей (0.73 м&sup2;): &lceil;143 / 0.73&rceil; = <strong>196 панелей</strong></li></ul><p>Комплектующие: стартовая планка &lceil;48 / 3.66&rceil; = <strong>14 шт</strong>, наружных углов 4 &times; &lceil;6 / 3.05&rceil; = <strong>8 шт</strong>, J-профиль для 6 проёмов &asymp; <strong>20 шт</strong>.</p>",
      },
      {
        question: "Какой шаг обрешётки нужен под сайдинг?",
        answer: "<p>Рекомендуемый шаг обрешётки под сайдинг:</p><table><thead><tr><th>Тип сайдинга</th><th>Шаг, мм</th><th>Сечение бруска</th></tr></thead><tbody><tr><td>Виниловый</td><td>400</td><td>40&times;50 или 50&times;50 мм</td></tr><tr><td>Металлический</td><td>400–600</td><td>50&times;50 мм</td></tr><tr><td>Фиброцементный</td><td>600</td><td>50&times;60 мм</td></tr></tbody></table><p>Обрешётка ставится <strong>вертикально</strong> (для горизонтального сайдинга). В ветровых зонах и на высоких фасадах шаг уменьшают до <strong>300–400 мм</strong>. Деревянный брусок обрабатывают антисептиком.</p>",
      },
      {
        question: "Нужно ли утеплять стены под сайдинг?",
        answer: "<p>Утепление под сайдинг не обязательно, но рекомендуется для повышения энергоэффективности дома. Типовая схема:</p><ul><li><strong>Без утепления</strong>: стена &rarr; обрешётка 50&times;50 &rarr; сайдинг</li><li><strong>С утеплением</strong>: стена &rarr; утеплитель (50–100 мм) &rarr; ветрозащитная мембрана &rarr; контробрешётка 25&times;50 &rarr; сайдинг</li></ul><p>При утеплении между сайдингом и мембраной обязателен <strong>вентзазор 25–40 мм</strong> (контробрешётка). Без него влага не выходит из утеплителя и снижает его эффективность.</p>",
      },
    ],
  },
};


