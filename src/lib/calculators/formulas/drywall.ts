import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalDrywall } from "../../../../engine/drywall";
import drywallSpec from "../../../../configs/calculators/drywall-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const drywallManufacturerField = buildManufacturerField("drywall");

// Размеры листов ГКЛ (ширина × высота, м)
const SHEET_SIZES: Record<number, [number, number]> = {
  0: [1.2, 2.5],  // 1200×2500 мм = 3.0 м²
  1: [1.2, 3.0],  // 1200×3000 мм = 3.6 м²
  2: [0.6, 2.5],  // 600×2500 мм = 1.5 м²
};

export const drywallDef: CalculatorDefinition = {
  id: "drywall",
  slug: "gipsokarton",
  title: "Калькулятор гипсокартона",
  h1: "Калькулятор гипсокартона онлайн — расчёт листов и профиля",
  description: "Рассчитайте количество листов гипсокартона, потолочных и направляющих профилей, крепежа для перегородок и обшивки стен.",
  metaTitle: withSiteMetaTitle("Калькулятор гипсокартона: материалы онлайн"),
  metaDescription: "Бесплатный калькулятор гипсокартона: рассчитайте листы, потолочные и направляющие профили, дюбели и саморезы для перегородок и обшивки стен.",
  category: "walls",
  categorySlug: "steny",
  tags: ["гипсокартон", "ГКЛ", "перегородка", "Knauf", "профиль", "ПП", "ПН", "обшивка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "surfaceMode",
      label: "Что рассчитываем",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Все 4 стены комнаты" },
        { value: 1, label: "Одну стену" },
        { value: 2, label: "Перегородку" },
      ],
      hint: "Для потолка используйте отдельный калькулятор гипсокартонного потолка — там учитывается потолочная схема каркаса.",
      fullWidth: true,
    },
    {
      key: "inputMode",
      label: "Как задать поверхность",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам" },
        { value: 1, label: "По готовой площади" },
      ],
      fullWidth: true,
    },
    {
      key: "length",
      label: "Длина стены / перегородки",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
      hideIf: { key: "surfaceMode", op: "eq", value: 0 },
    },
    {
      key: "roomLength",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
      hideIf: { key: "surfaceMode", op: "ne", value: 0 },
    },
    {
      key: "roomWidth",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
      hideIf: { key: "surfaceMode", op: "ne", value: 0 },
    },
    {
      key: "height",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1.5,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      hint: "При вводе готовой площади высота нужна для ориентировочного расчёта профилей.",
    },
    {
      key: "area",
      label: "Площадь обшиваемой поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
      hint: "Укажите чистую площадь уже без окон и дверей.",
    },
    {
      key: "openingsArea",
      label: "Площадь окон и дверей",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100,
      step: 0.1,
      defaultValue: 0,
      group: "bySize",
      hint: "Суммарная площадь всех проёмов на выбранной стене или четырёх стенах.",
    },
    {
      key: "layers",
      label: "Слои гипсокартона с каждой стороны",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой (стандарт)" },
        { value: 2, label: "2 слоя (огнестойкость, шумозащита)" },
      ],
    },
    {
      key: "sheetSize",
      label: "Размер листа гипсокартона",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×2500 мм (стандарт)" },
        { value: 1, label: "1200×3000 мм" },
        { value: 2, label: "600×2500 мм (малоформатный)" },
      ],
    },
    {
      key: "profileStep",
      label: "Шаг профилей",
      type: "select",
      defaultValue: 0.6,
      options: [
        { value: 0.4, label: "400 мм (усиленный вариант)" },
        { value: 0.6, label: "600 мм (стандарт)" },
      ],
    },
    ...(drywallManufacturerField ? [drywallManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = drywallSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    // В интерфейсе три понятных пользовательских сценария. Канонический
    // движок по-прежнему получает независимые workType и wallScope, поэтому
    // расчётная логика и web/mobile parity не дублируются в компоненте формы.
    const hasSurfaceMode = Number.isFinite(inputs.surfaceMode);
    const surfaceMode = Math.round(inputs.surfaceMode ?? 0);
    const canonicalInputs = hasSurfaceMode
      ? {
          ...inputs,
          workType: surfaceMode === 2 ? 0 : 1,
          wallScope: surfaceMode === 0 ? 1 : 0,
        }
      : inputs;
    const canonical = computeCanonicalDrywall(
      spec,
      { ...canonicalInputs, accuracyMode: inputs.accuracyMode as any },
      factorTable,
    );

    const manufacturer = getManufacturerByIndex("drywall", inputs.manufacturer);
    const materials = canonical.materials.map((m) => {
      let next = m;
      // Листы ГКЛ — штучный товар: к покупке всегда целое число листов.
      // Движок отдаёт по основному материалу REC-расход (напр. 10.6 шт);
      // отображение округляет вверх, но в покупку/смету должно идти целое.
      if (m.category === "Основное" && /гкл|гипсокартон|лист/i.test(m.name)) {
        const whole = Math.ceil(m.purchaseQty ?? m.withReserve ?? m.quantity);
        next = { ...next, quantity: whole, withReserve: whole, purchaseQty: whole };
      }
      if (manufacturer && /лист|гкл|гипсокартон|профиль/i.test(next.name)) {
        next = { ...next, name: `${next.name} — ${manufacturer.name}` };
      }
      return next;
    });

    return {
      materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
    };
  },
  formulaDescription: `
**Расчёт ГКЛ:**
Листов = ⌈Площадь × Стороны × Слои × 1.10 / Площадь_листа⌉

Варианты расчётной площади листа:
- 1200×2500 мм = 3.0 м² (стандарт)
- 1200×3000 мм = 3.6 м²
- 600×2500 мм = 1.5 м² (малоформатный)

**Каркас:**
- Перегородка: ПН 50×40 по полу и потолку, ПС 50×50 с шагом 400–600 мм
- Облицовка стены / потолок: ПН 27×28 и ПП 60×27
- Чёрные саморезы для ГКЛ по металлу 3,5×25 мм: ~30 шт/м²
- Для второго слоя: саморезы 3,5×35 мм

Размер и комплектующие перед покупкой сверяйте с паспортом материала и
технической картой выбранной системы. Нормативная база — ГОСТ 32614-2012 и
СП 163.1325800.2014 с изменением № 1.
  `,
  howToUse: [
    "Сразу выберите, что считаете: все четыре стены комнаты, одну стену или отдельную перегородку",
    "Введите размеры и площадь проёмов либо готовую чистую площадь",
    "Укажите количество слоёв ГКЛ (стандарт — 1)",
    "Выберите шаг профилей (стандарт 600 мм, усиленный — 400 мм)",
    "Нажмите «Рассчитать» — получите листы, профиль и весь крепёж",
  ],
  faq: [
    {
      question: "Какой шаг профиля выбрать для стены из гипсокартона?",
      answer:
        "600 мм — типовой шаг для лёгких стен без тяжёлой отделки. 400 мм — при высоких перегородках, тяжёлой плитке, кухонной навеске, санузле и других повышенных нагрузках; усиление дешевле, чем переделка после отделки.",
    },
    {
      question: "Сколько слоёв ГКЛ делать на перегородке?",
      answer:
        "Один слой — для простых ненагруженных перегородок. Два слоя (хотя бы с одной стороны или с обеих) — если нужны жёсткость, ударостойкость, звук или надёжное крепление тяжёлых предметов и инженерии в стене.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта гипсокартона</h2>
<p>Количество листов ГКЛ для конструкции рассчитывается по формуле:</p>
<p><strong>N = &lceil;S &times; К<sub>сторон</sub> &times; К<sub>слоёв</sub> &times; 1.10 / S<sub>листа</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — площадь конструкции (м&sup2;)</li>
  <li><strong>К<sub>сторон</sub></strong> — коэффициент сторон (2 для перегородки, 1 для обшивки)</li>
  <li><strong>К<sub>слоёв</sub></strong> — количество слоёв ГКЛ с каждой стороны</li>
  <li><strong>S<sub>листа</sub></strong> — площадь одного листа (м&sup2;)</li>
  <li><strong>1.10</strong> — базовое допущение калькулятора: запас 10% на подрезку до округления</li>
</ul>

<h2>Размеры листов ГКЛ и расход профилей</h2>
<table>
  <thead>
    <tr><th>Материал</th><th>Размер / шаг</th><th>Расход на 1 м&sup2;</th></tr>
  </thead>
  <tbody>
    <tr><td>Лист ГКЛ 1200&times;2500</td><td>3.0 м&sup2;</td><td>0.37 листа (1 сторона)</td></tr>
    <tr><td>Лист ГКЛ 1200&times;3000</td><td>3.6 м&sup2;</td><td>0.31 листа</td></tr>
    <tr><td>ПН 50&times;40 (для перегородки)</td><td>3 м</td><td>По полу и потолку</td></tr>
    <tr><td>ПС 50&times;50 (для перегородки)</td><td>3&ndash;4 м</td><td>Шаг 400&ndash;600 мм</td></tr>
    <tr><td>Чёрные саморезы для ГКЛ по металлу 3,5×25 мм</td><td>&mdash;</td><td>~30 шт/м&sup2;</td></tr>
    <tr><td>Дюбель-гвозди 6&times;40</td><td>&mdash;</td><td>~2 шт/м.п. направляющей</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 163.1325800.2014</strong> &laquo;Конструкции с применением гипсокартонных и гипсоволокнистых листов&raquo;</li>
  <li><strong>ГОСТ 32614-2012 (EN 520:2009)</strong> &laquo;Плиты гипсовые строительные&raquo;</li>
  <li><strong>Технологические карты КНАУФ</strong> &mdash; для выбранной системы облицовки или перегородки</li>
</ul>
<p>Тип листа, число слоёв, огнестойкость и звукоизоляцию принимают по документации комплектной системы. Во влажных зонах одного влагостойкого листа недостаточно: места прямого попадания воды защищают предусмотренной системой гидроизоляцией.</p>
`,
    faq: [
      {
        question: "Сколько листов гипсокартона нужно на перегородку?",
        answer: "<p>Для расчёта перегородки (двухсторонняя обшивка в 1 слой, лист 1200&times;2500 мм = 3.0 м&sup2;):</p><p><strong>N = &lceil;S &times; 2 &times; 1.10 / 3.0&rceil;</strong></p><ul><li>Перегородка 5 &times; 2.7 м = 13.5 м&sup2;</li><li>Листов: &lceil;13.5 &times; 2 &times; 1.10 / 3.0&rceil; = <strong>10 листов</strong></li></ul><p>При двухслойной обшивке количество удваивается: <strong>20 листов</strong>. Запас 10% — базовое допущение калькулятора; для сложного раскроя его проверяют по схеме листов.</p>",
      },
      {
        question: "Какой профиль нужен для перегородки из гипсокартона?",
        answer: "<p>Профиль выбирают не отдельно, а в составе комплектной системы. Для простой перегородки КНАУФ С 111 применяются направляющие ПН и стоечные ПС соответствующей ширины. Для каркасной облицовки стены КНАУФ С 623 используются ПН 28&times;27, ПП 60&times;27 и прямые подвесы. Ширину профиля, шаг стоек, крепёж и число слоёв принимают по альбому выбранной системы с учётом высоты и требований к конструкции.</p>",
      },
      {
        question: "Как повысить звукоизоляцию перегородки из ГКЛ?",
        answer: "<p>Звукоизоляцию оценивают для испытанной конструкции целиком: учитывают тип и ширину каркаса, количество и вид листов, заполнение полости, уплотнительную ленту, герметизацию примыканий и монтажные узлы. Нельзя прибавить универсальное число децибел только за второй слой или произвольную минеральную вату. Выберите комплектную систему с документированным индексом Rw и выполните её по техническому альбому. Калькулятор определяет количество материалов, но не подтверждает звукоизоляционные характеристики конструкции.</p>",
      },
    ],
  },
};
