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
  metaTitle: withSiteMetaTitle("Калькулятор ламината: расчёт материалов онлайн"),
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
      key: "perimeter",
      label: "Фактический периметр",
      type: "number",
      unit: "м",
      min: 0,
      max: 200,
      step: 0.1,
      defaultValue: 0,
      group: "byArea",
      hint: "Введите длину стен и обходов без участков дверных проёмов. При 0 калькулятор использует предварительную оценку 4 × √S.",
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
      label: "Площадь упаковки подложки",
      type: "slider",
      unit: "м²",
      min: 5,
      max: 20,
      step: 1,
      defaultValue: 10,
      hint: "Укажите полезную площадь рулона, гармошки или пачки выбранной подложки.",
      hideIf: { key: "hasUnderlayment", op: "eq", value: 0 },
    },
    {
      key: "underlayType",
      label: "Формат подложки",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 2, label: "Рулонная ППЭ" },
        { value: 3, label: "Рулонная пробковая" },
        { value: 4, label: "Гармошка / плиты EPS" },
        { value: 5, label: "Хвойные плиты" },
      ],
      hint: "Для двух рулонных вариантов калькулятор добавляет один справочный рулон скотча на каждые 40 м². Для плит и гармошки скотч не добавляется — сверяйте способ соединения с инструкцией.",
      hideIf: { key: "hasUnderlayment", op: "eq", value: 0 },
    },
    {
      key: "doorThresholds",
      label: "Дверные проёмы с порожком",
      type: "slider",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
      hint: "Каждый проём добавляет один порожек и две заглушки, а из расчёта плинтуса условно вычитается 0,9 м. Для перехода вне двери это приближение не подходит.",
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
      hint: "Для бетонного варианта калькулятор предварительно добавит плёнку +10%, для деревянного — не добавит. Фактическую необходимость определяют по влажности основания и инструкции выбранного покрытия.",
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
        underlayType: inputs.underlayType,
        floorBase: inputs.floorBase,
        outerCorners: inputs.outerCorners,
        laminateClass: inputs.laminateClass,
        laminateThickness: inputs.laminateThickness,
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

**Пароизоляционная плёнка — предварительная позиция для бетонной стяжки.**
Калькулятор добавляет площадь основания +10% только для бетонного варианта и не добавляет её для деревянного. Фактическую необходимость, толщину и схему определяют по влажности основания и инструкции выбранного покрытия.

**Лента для стыков подложки** добавляется только для двух рулонных вариантов. Для гармошки и плит калькулятор её не добавляет; фактический способ соединения берите из инструкции продукта.

**Компенсационный профиль** при площади более 50 м² — предварительная позиция текущей модели длиной √S. Одна площадь не задаёт необходимость и расположение швов: нужны длина и ширина помещения, переходы и ограничения изготовителя покрытия.
  `,
  howToUse: [
    "Введите размеры комнаты или площадь пола",
    "Укажите площадь одной упаковки ламината",
    "Выберите схему укладки и при необходимости задайте явный запас",
    "Выберите тип основания и проверьте требования покрытия к влагозащитному слою",
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
    <tr><td>Прямая (хаотичное смещение)</td><td>5</td><td>Базовый профиль до явного запаса</td></tr>
    <tr><td>Прямая (смещение 1/3)</td><td>8</td><td>Базовый профиль до явного запаса</td></tr>
    <tr><td>Прямая (смещение 1/2)</td><td>12</td><td>Требования коллекции нужно проверить</td></tr>
    <tr><td>Диагональная</td><td>15</td><td>Подрезка у стен под углом</td></tr>
    <tr><td>Ёлочка</td><td>20</td><td>Только для совместимой коллекции</td></tr>
  </tbody>
</table>
<p>Калькулятор берёт большее из базового профиля и явно заданного запаса. В комнате меньше 15 м&sup2; модель дополнительно увеличивает процент на 0,5 пункта за каждый недостающий квадратный метр.</p>

<h2>Сопутствующие материалы</h2>
<ul>
  <li><strong>Подложка:</strong> площадь пола +5% планового добавления, затем округление по введённой площади упаковки;</li>
  <li><strong>Плинтус:</strong> по периметру минус условные 0,9 м на каждый указанный дверной проём, затем округление по 2,5 м;</li>
  <li><strong>Клинья:</strong> справочно через 0,5 м периметра, без упаковочного округления;</li>
  <li><strong>Порожки:</strong> по одному на каждый указанный дверной проём.</li>
</ul>
<p>При вводе только площади периметр оценивается как у квадрата: 4 × √S. Для точного плинтуса введите фактический периметр и проверьте внутренние и внешние углы.</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>ГОСТ 32304-2013</strong> с изменением №1 — технические требования к самому ламинированному покрытию;</li>
  <li><strong>СП 71.13330.2017</strong> — производство и приёмка работ по устройству покрытий полов;</li>
  <li><strong>ГОСТ Р 72714-2026</strong> — правила устройства плавающих жёстких модульных покрытий; вводится с 1 января 2027 года.</li>
</ul>
<p>Класс, толщину, основание, подложку, максимальные размеры поля и технологические зазоры выбирайте по назначению помещения и инструкции конкретной коллекции. ГОСТ на изделие не заменяет монтажную карту изготовителя.</p>
`,
    faq: [
      {
        question: "Сколько упаковок ламината нужно на комнату 20 м2?",
        answer: "<p>При упаковке 2,397 м&sup2;, прямой укладке и явном запасе 10% базовая геометрия даёт 20 &times; 1,10 = <strong>22 м&sup2;</strong>, затем &lceil;22 / 2,397&rceil; = <strong>10 базовых упаковок</strong>. В дефолтном режиме «Реальный» к потребности применяются сценарные поправки, поэтому итоговая карточка показывает <strong>11 упаковок</strong>. Для диагонали и сложного контура сверяйтесь с выбранным режимом и раскладкой по размерам доски.</p>",
      },
      {
        question: "Какую подложку выбрать под ламинат?",
        answer: "<p>Подложку выбирают по требованиям замковой системы, основанию, допустимой толщине, сопротивлению сжатию и совместимости с тёплым полом. Калькулятор считает только площадь упаковок и условный скотч для рулонных вариантов. Влагозащитный слой на бетонном основании применяют по измеренной влажности и инструкции выбранного покрытия.</p>",
      },
      {
        question: "Какой зазор оставлять у стен при укладке ламината?",
        answer: "<p>Размер зазора и максимальное поле без разделительного профиля зависят от конкретной коллекции, размеров помещения, влажности и примыканий. Используйте монтажную инструкцию изготовителя для стен, труб, коробок и переходов; калькулятор эти размеры не проектирует.</p>",
      },
    ],
  },
};
