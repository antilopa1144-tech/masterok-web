import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import laminateCanonicalSpecJson from "../../../../configs/calculators/laminate-canonical.v1.json";
import { computeCanonicalLaminate } from "../../../../engine/laminate";
import type { LaminateCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex, getSpec } from "../manufacturerField";

const laminateCanonicalSpec = laminateCanonicalSpecJson as LaminateCanonicalSpec;
const manufacturerField = buildManufacturerField("laminate");

function mapLegacyLayoutProfile(layingMethod: number | undefined, offsetMode: number | undefined): number {
  const method = Math.round(layingMethod ?? 0);
  const offset = Math.round(offsetMode ?? 0);

  if (method === 1) return 4;
  if (method === 2) return 5;
  if (offset === 1) return 2;
  if (offset === 2) return 3;
  return 1;
}

export const laminateDef: CalculatorDefinition = {
  id: "laminate",
  slug: "laminat",
  formulaVersion: laminateCanonicalSpec.formula_version,
  title: "Калькулятор ламината",
  h1: "Калькулятор ламината онлайн — расчёт количества упаковок",
  description: "Рассчитайте количество упаковок ламината, подложки и плинтуса для вашей комнаты. Учёт способа укладки и явного запаса.",
  metaTitle: withSiteMetaTitle("Калькулятор ламината онлайн | Расчёт упаковок"),
  metaDescription: "Бесплатный калькулятор ламината: рассчитайте количество упаковок, подложку, плинтус и порожки с учётом схемы укладки и запаса на подрезку.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["ламинат", "напольное покрытие", "подложка", "плинтус", "пол"],
  popularity: 82,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам комнаты" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 0.5,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "packArea",
      label: "Площадь упаковки",
      type: "slider",
      unit: "м²",
      min: 0.5,
      max: 5,
      step: 0.001,
      defaultValue: 2.397,
      hint: "Указано на упаковке. Популярные: 2.397, 2.178, 1.9965 м²",
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая" },
        { value: 1, label: "Диагональная" },
        { value: 2, label: "Ёлочка" },
      ],
    },
    {
      key: "offsetMode",
      label: "Смещение досок",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Хаотичное / случайное" },
        { value: 1, label: "На 1/3 длины" },
        { value: 2, label: "На 1/2 длины" },
      ],
    },
    {
      key: "reservePercent",
      label: "Явный запас",
      type: "slider",
      unit: "%",
      min: 0,
      max: 25,
      step: 1,
      defaultValue: 10,
      hint: "Если запас выше расчётного по раскладке, калькулятор возьмёт его как основной.",
    },
    {
      key: "hasUnderlayment",
      label: "Подложка",
      type: "switch",
      defaultValue: 1,
    },
    {
      key: "underlaymentRoll",
      label: "Площадь рулона подложки",
      type: "slider",
      unit: "м²",
      min: 5,
      max: 20,
      step: 1,
      defaultValue: 10,
    },
    {
      key: "doorThresholds",
      label: "Количество порогов",
      type: "slider",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "floorBase",
      label: "Тип основания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Бетонная стяжка" },
        { value: 1, label: "Деревянный пол" },
      ],
      hint: "На бетон нужна пароизоляция от остаточной влаги. На сухой дерево пароизоляция вредна — создаёт конденсат.",
    },
    {
      key: "outerCorners",
      label: "Внешние углы плинтуса",
      type: "slider",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 0,
      hint: "Углы, где стена выступает наружу — у дверных откосов, выступов, колонн.",
    },
    ...(manufacturerField ? [manufacturerField] : []),
  ],
  calculate(inputs) {
    const manufacturer = getManufacturerByIndex("laminate", inputs.manufacturer);
    const brandPackM2 = getSpec<number | undefined>(manufacturer, "packM2", undefined);
    const packArea = brandPackM2 ?? inputs.packArea;

    const result = computeCanonicalLaminate(
      laminateCanonicalSpec,
      {
        inputMode: inputs.inputMode,
        length: inputs.length,
        width: inputs.width,
        area: inputs.area,
        perimeter: inputs.perimeter,
        packArea,
        layoutProfileId: inputs.layoutProfileId ?? mapLegacyLayoutProfile(inputs.layingMethod, inputs.offsetMode),
        reservePercent: inputs.reservePercent,
        hasUnderlayment: inputs.hasUnderlayment,
        underlaymentRollArea: inputs.underlaymentRoll,
        doorThresholds: inputs.doorThresholds,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );

    if (manufacturer) {
      result.materials = result.materials.map((m) =>
        m.name.toLowerCase().includes("ламинат") || m.category === "Основное"
          ? { ...m, name: `${m.name} — ${manufacturer.name}` }
          : m
      );
    }
    return result;
  },
  formulaDescription: `
**Расчёт ламината:**
Площадь пола умножается на детерминированный запас по схеме укладки и размеру помещения.
Если вы задаёте явный запас выше расчётного, калькулятор берёт именно его.
Отдельно считаются упаковки ламината, подложка, плинтус, клинья и расходники.

**Сопутствующие материалы плинтуса:**
- Внутренние углы — 4 шт на стандартную прямоугольную комнату.
- Внешние углы — по числу выступающих углов комнаты (дверные откосы, выступы, колонны). Указываются явно.
- Заглушки плинтуса — 2 шт на каждый дверной проём (левая + правая).
- Соединители — между отрезками плинтуса.

**Пароизоляционная плёнка — только для бетонной стяжки.**
На сухом деревянном основании пароизоляция вредна: она создаёт замкнутую полость, в которой при перепаде температур образуется конденсат. Это приводит к разбуханию замков ламината и плесени снизу.

**Скотч для стыков подложки** добавляется только для рулонных подложек. У EPS-«гармошки» стыки самоклеящиеся.

**Компенсационный шов** обязателен при площади более 50 м² (СП 71.13330).
  `,
  howToUse: [
    "Введите размеры комнаты или площадь пола",
    "Укажите площадь одной упаковки ламината",
    "Выберите схему укладки и при необходимости задайте явный запас",
    "Выберите тип основания: на бетонной стяжке нужна пароизоляция, на сухом дереве — нет",
    "Укажите количество внешних углов плинтуса (выступы, дверные откосы, колонны)",
    "Нажмите «Рассчитать» — вы получите упаковки, подложку, плинтус и расходники",
  ],
  expertTips: [
    {
      title: "Не прячьте запас в голове",
      content: "Если берёте материал из разных партий или ожидаете сложные подрезки, лучше явно задать запас в калькуляторе, а не надеяться на усреднённый процент.",
      author: "Прораб"
    },
    {
      title: "Проверяйте фактическую площадь упаковки",
      content: "У разных коллекций ламината количество досок и площадь упаковки сильно отличаются. Ошибка в packArea быстро даёт лишнюю или недостающую упаковку.",
      author: "Мастер по полам"
    }
  ],
  faq: [
    {
      question: "Почему калькулятор считает три сценария?",
      answer:
        "MIN, REC и MAX — три уровня учёта запаса (подрезка, геометрия, риск добора из другой партии). Сравните упаковки по сценариям и закупайте тот вариант, который соответствует сложности монтажа.",
    },
    {
      question: "Зачем указывать количество порогов?",
      answer:
        "От этого считаются длина переходных профилей и сопутствующий монтаж: при большем числе проёмов и смен покрытия профилей и доборов нужно больше, чем кажется только по площади пола.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта ламината</h2>
<p>Количество упаковок ламината определяется по формуле:</p>
<p><strong>N<sub>упак</sub> = &lceil;S &times; (1 + К<sub>отход</sub>/100) / S<sub>упак</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — площадь пола (м&sup2;)</li>
  <li><strong>К<sub>отход</sub></strong> — коэффициент отхода по способу укладки (%)</li>
  <li><strong>S<sub>упак</sub></strong> — площадь одной упаковки (м&sup2;, указана на пачке)</li>
</ul>

<h2>Запас на отходы по способу укладки</h2>
<table>
  <thead>
    <tr><th>Способ укладки</th><th>Запас, %</th><th>Примечание</th></tr>
  </thead>
  <tbody>
    <tr><td>Прямая (хаотичное смещение)</td><td>5&ndash;7</td><td>Минимальный отход</td></tr>
    <tr><td>Прямая (смещение 1/3)</td><td>7&ndash;10</td><td>Более строгая раскладка</td></tr>
    <tr><td>Прямая (смещение 1/2)</td><td>8&ndash;12</td><td>Много подрезки торцов</td></tr>
    <tr><td>Диагональная</td><td>10&ndash;15</td><td>Подрезка у стен под углом</td></tr>
    <tr><td>Ёлочка</td><td>15&ndash;20</td><td>Максимальный отход</td></tr>
  </tbody>
</table>

<h2>Сопутствующие материалы</h2>
<ul>
  <li><strong>Подложка:</strong> рулон 10&ndash;15 м&sup2;, укладка встык без нахлёста</li>
  <li><strong>Плинтус:</strong> по периметру минус дверные проёмы + 5% запас</li>
  <li><strong>Клинья распорные:</strong> для технологического зазора 8&ndash;12 мм у стен</li>
  <li><strong>Порожки:</strong> по количеству дверных проёмов и переходов</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 32304-2013</strong> &laquo;Ламинированные напольные покрытия&raquo;</li>
  <li><strong>EN 13329</strong> &laquo;Ламинированные покрытия для пола&raquo;</li>
  <li><strong>ISO 10874</strong> &laquo;Классификация напольных покрытий&raquo;</li>
</ul>
<p>Для жилых помещений рекомендуется класс износостойкости <strong>32&ndash;33</strong>, толщина доски <strong>8&ndash;12 мм</strong>. Зазор у стен 8&ndash;12 мм обязателен для компенсации расширения.</p>
`,
    faq: [
      {
        question: "Сколько упаковок ламината нужно на комнату 20 м2?",
        answer: "<p>Расчёт для комнаты 20 м&sup2; (прямая укладка, упаковка 2.397 м&sup2;):</p><ul><li>С запасом 7%: 20 &times; 1.07 = 21.4 м&sup2;</li><li>Упаковок: &lceil;21.4 / 2.397&rceil; = <strong>9 упаковок</strong></li></ul><p>Для диагональной укладки (запас 12%): 20 &times; 1.12 / 2.397 = 9.35 &rarr; <strong>10 упаковок</strong>. Всегда берите полные пачки &mdash; поштучно ламинат не продаётся.</p>",
      },
      {
        question: "Какую подложку выбрать под ламинат?",
        answer: "<p>Типы подложки и их характеристики:</p><table><thead><tr><th>Материал</th><th>Толщина</th><th>Особенности</th></tr></thead><tbody><tr><td>Вспененный полиэтилен</td><td>2&ndash;3 мм</td><td>Бюджетный вариант, быстро продавливается</td></tr><tr><td>Экструдированный ППС</td><td>2&ndash;5 мм</td><td>Хорошая звукоизоляция, долговечность</td></tr><tr><td>Пробка</td><td>2&ndash;4 мм</td><td>Натуральная, отличная звукоизоляция</td></tr><tr><td>Хвойная (МДВП)</td><td>3&ndash;7 мм</td><td>Выравнивание до 3 мм перепада</td></tr></tbody></table><p>На бетонное основание дополнительно стелят <strong>пароизоляционную плёнку</strong> (ПЭ 200 мкм). По <strong>ГОСТ 32304-2013</strong> общая толщина подложки не должна превышать рекомендации производителя.</p>",
      },
      {
        question: "Какой зазор оставлять у стен при укладке ламината?",
        answer: "<p>По <strong>ГОСТ 32304-2013</strong> и рекомендациям производителей зазор между ламинатом и стеной должен составлять <strong>8&ndash;12 мм</strong>. Этот зазор необходим:</p><ul><li>Для компенсации <strong>теплового расширения</strong> покрытия (ламинат расширяется на 1&ndash;2 мм на метр при изменении влажности)</li><li>Для предотвращения <strong>вздутия и коробления</strong> покрытия</li><li>Закрывается <strong>плинтусом</strong> &mdash; не виден после монтажа</li></ul><p>Зазор также требуется вокруг труб отопления (трубных розеток), у дверных коробок и порожков. Для помещений длиной более 8 м рекомендуется <strong>компенсационный шов</strong>.</p>",
      },
    ],
  },
};

