import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import parquetCanonicalSpecJson from "../../../../configs/calculators/parquet-canonical.v1.json";
import { computeCanonicalParquet } from "../../../../engine/parquet";
import type { ParquetCanonicalSpec } from "../../../../engine/canonical";

const parquetCanonicalSpec = parquetCanonicalSpecJson as ParquetCanonicalSpec;

function mapLegacyLayoutProfile(layingMethod: number | undefined): number {
  switch (Math.round(layingMethod ?? 0)) {
    case 1:
      return 2;
    case 2:
      return 3;
    default:
      return 1;
  }
}

export const parquetDef: CalculatorDefinition = {
  id: "floors_parquet",
  slug: "parket",
  formulaVersion: parquetCanonicalSpec.formula_version,
  title: "Калькулятор паркетной доски",
  h1: "Калькулятор паркетной доски онлайн — расчёт количества упаковок",
  description: "Рассчитайте количество паркетной доски, подложки и плинтуса с учётом схемы укладки и сценариев MIN/REC/MAX.",
  metaTitle: withSiteMetaTitle("Калькулятор паркетной доски | Расчёт онлайн"),
  metaDescription: "Бесплатный калькулятор паркетной доски: рассчитайте упаковки, подложку, плинтус и порожки с учётом схемы укладки и практического запаса.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["паркет", "паркетная доска", "Tarkett", "Quick-Step", "напольное покрытие"],
  popularity: 62,
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
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая (+5%)" },
        { value: 1, label: "Диагональная (+15%)" },
        { value: 2, label: "Ёлочка (+20%)" },
      ],
    },
    {
      key: "packArea",
      label: "Площадь упаковки",
      type: "slider",
      unit: "м²",
      min: 0.5,
      max: 4,
      step: 0.01,
      defaultValue: 1.892,
      hint: "Указана на упаковке. Tarkett: 1.892 м², Quick-Step: 1.835 м²",
    },
    {
      key: "boardWidth",
      label: "Ширина доски",
      type: "select",
      defaultValue: 190,
      options: [
        { value: 120, label: "120 мм" },
        { value: 150, label: "150 мм" },
        { value: 190, label: "190 мм (стандарт)" },
        { value: 200, label: "200 мм" },
        { value: 220, label: "220 мм (широкая)" },
      ],
    },
  ],
  calculate(inputs) {
    return computeCanonicalParquet(
      parquetCanonicalSpec,
      {
        inputMode: inputs.inputMode ?? 0,
        length: inputs.length ?? inputs.roomLength,
        width: inputs.width ?? inputs.roomWidth,
        area: inputs.area,
        perimeter: inputs.perimeter,
        packArea: inputs.packArea,
        layoutProfileId: inputs.layoutProfileId ?? mapLegacyLayoutProfile(inputs.layingMethod),
        reservePercent: inputs.reservePercent,
        needUnderlayment: inputs.needUnderlayment ?? 1,
        needPlinth: inputs.needPlinth ?? 1,
        needGlue: inputs.needGlue ?? 0,
        underlaymentRollArea: inputs.underlaymentRollArea,
        doorThresholds: inputs.doorThresholds ?? 1,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );
  },
  formulaDescription: `
**Расчёт паркетной доски:**
Площадь пола умножается на детерминированный запас по схеме укладки, после чего переводится в упаковки.
Подложка, плинтус и доборные элементы считаются отдельно, а MIN/REC/MAX показывают рабочий диапазон закупки.
  `,
  howToUse: [
    "Введите размеры комнаты",
    "Выберите способ укладки",
    "Укажите площадь упаковки с этикетки",
    "Нажмите «Рассчитать» — получите упаковки, подложку, плинтус и сценарии закупки",
  ],
faq: [
    {
      question: "Какой запас паркетной доски брать при укладке?",
      answer:
        "На прямую часто берут 5–7%; на диагональ и ёлочку — заметно больше (до 15–20%). Подрезка и подбор по текстуре повышают расход; добор из другой партии может отличаться по оттенку.",
    },
    {
      question: "Нужна ли подложка под паркетную доску?",
      answer:
        "При плавающей укладке — обычно да: шумоизоляция и мелкие перепады основания по инструкции производителя. При клеевом монтаже подложка не нужна. На тёплый пол и гарантию проверяйте совместимость набора с инструкцией доски.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта паркетной доски</h2>
<p>Количество упаковок паркетной доски определяется по формуле:</p>
<p><strong>N<sub>упак</sub> = &lceil;S &times; (1 + К<sub>отход</sub>/100) / S<sub>упак</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — площадь пола (м&sup2;)</li>
  <li><strong>К<sub>отход</sub></strong> — запас на подрезку: 5% (прямая), 15% (диагональная), 20% (ёлочка)</li>
  <li><strong>S<sub>упак</sub></strong> — площадь одной упаковки (м&sup2;)</li>
</ul>

<h2>Запас на подрезку по способу укладки</h2>
<table>
  <thead>
    <tr><th>Способ укладки</th><th>Запас, %</th><th>Примечание</th></tr>
  </thead>
  <tbody>
    <tr><td>Прямая (палубная)</td><td>5&ndash;7</td><td>Минимальный отход, стандарт</td></tr>
    <tr><td>Диагональная</td><td>12&ndash;15</td><td>Подрезка у стен под 45&deg;</td></tr>
    <tr><td>Ёлочка (классическая)</td><td>15&ndash;20</td><td>Максимальный расход на подгонку</td></tr>
  </tbody>
</table>

<h2>Сопутствующие материалы</h2>
<ul>
  <li><strong>Подложка:</strong> 2&ndash;3 мм пробка, ППС или PE-плёнка (плавающий монтаж)</li>
  <li><strong>Паркетный клей:</strong> 800&ndash;1 200 г/м&sup2; (при клеевой укладке)</li>
  <li><strong>Плинтус:</strong> по периметру помещения минус дверные проёмы + 5%</li>
  <li><strong>Порожки:</strong> по количеству дверных проёмов</li>
  <li><strong>Пароизоляция:</strong> ПЭ-плёнка 200 мкм на бетонное основание</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 862.1-85</strong> &laquo;Изделия паркетные. Паркет штучный&raquo;</li>
  <li><strong>ГОСТ 862.3-86</strong> &laquo;Изделия паркетные. Доски паркетные&raquo;</li>
  <li><strong>СП 71.13330.2017</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
</ul>
<p>Популярные площади упаковки: Tarkett &mdash; 1.892 м&sup2;, Quick-Step &mdash; 1.835 м&sup2;, Barlinek &mdash; 2.17 м&sup2;. Акклиматизация доски перед укладкой: <strong>48 часов</strong> при температуре 18&ndash;24&deg;C.</p>
`,
    faq: [
      {
        question: "Сколько паркетной доски нужно на комнату?",
        answer: "<p>Расчёт для комнаты 5 &times; 4 м = 20 м&sup2; (прямая укладка, упаковка Tarkett 1.892 м&sup2;):</p><ul><li>С запасом 5%: 20 &times; 1.05 = 21.0 м&sup2;</li><li>Упаковок: &lceil;21.0 / 1.892&rceil; = <strong>12 упаковок</strong></li></ul><p>Для диагональной укладки (запас 15%): 20 &times; 1.15 / 1.892 = 12.2 &rarr; <strong>13 упаковок</strong>. Для ёлочки (запас 20%): <strong>13&ndash;14 упаковок</strong>. Берите полные пачки из одной партии.</p>",
      },
      {
        question: "Нужна ли подложка под паркетную доску?",
        answer: "<p>При <strong>плавающей укладке</strong> (замковое соединение) подложка обязательна. Она выполняет функции:</p><ul><li>Компенсация микронеровностей основания (до 2 мм)</li><li>Звукоизоляция &mdash; снижение ударного шума на 15&ndash;20 дБ</li><li>Пароизоляция (при наличии встроенного слоя)</li></ul><p>Типы подложки: пробка (2&ndash;3 мм), экструдированный ППС (2&ndash;3 мм), PE-плёнка. При <strong>клеевой укладке</strong> подложка не используется &mdash; доска клеится непосредственно на основание.</p>",
      },
      {
        question: "Чем отличается клеевая укладка паркета от плавающей?",
        answer: "<p>Два основных способа монтажа паркетной доски:</p><table><thead><tr><th>Параметр</th><th>Плавающая</th><th>Клеевая</th></tr></thead><tbody><tr><td>Крепление</td><td>Замок (click)</td><td>Паркетный клей</td></tr><tr><td>Подложка</td><td>Обязательна</td><td>Не нужна</td></tr><tr><td>Требования к основанию</td><td>Перепад &le; 2 мм/м</td><td>Перепад &le; 2 мм/м</td></tr><tr><td>Тёплый пол</td><td>Ограниченно</td><td>Предпочтительно</td></tr><tr><td>Ремонтопригодность</td><td>Можно разобрать</td><td>Сложно демонтировать</td></tr></tbody></table><p>Расход паркетного клея: <strong>800&ndash;1 200 г/м&sup2;</strong>. По <strong>СП 71.13330</strong> оба способа допустимы при соблюдении требований к основанию.</p>",
      },
    ],
  },
};

