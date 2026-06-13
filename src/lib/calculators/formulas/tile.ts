import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import tileCanonicalSpecJson from "../../../../configs/calculators/tile-canonical.v1.json";
import { computeCanonicalTile } from "../../../../engine/tile";
import type { TileCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const tileCanonicalSpec = tileCanonicalSpecJson as TileCanonicalSpec;
const tileManufacturerField = buildManufacturerField("tile");

function mapLegacyMethodToCanonical(layingMethod: number | undefined): number {
  switch (Math.round(layingMethod ?? 0)) {
    case 1:
      return 2;
    case 2:
      return 3;
    default:
      return 1;
  }
}

function mapLegacyComplexityToCanonical(roomComplexity: number | undefined): number {
  return Math.max(1, Math.min(3, Math.round(roomComplexity ?? 0) + 1));
}

export const tileDef: CalculatorDefinition = {
  id: "tile",
  slug: "plitka",
  formulaVersion: tileCanonicalSpec.formula_version,
  title: "Калькулятор плитки",
  h1: "Калькулятор плитки онлайн — расчёт количества плитки и клея",
  description: "Рассчитайте количество плитки, клея и затирки для пола и стен. Учёт способа укладки, отходов и размера плитки.",
  metaTitle: withSiteMetaTitle("Калькулятор плитки: расчёт материалов онлайн"),
  metaDescription: "Бесплатный калькулятор плитки: рассчитайте плитку, клей и затирку для пола или стен с учётом схемы укладки, швов и запаса на подрезку.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плитка", "кафель", "керамика", "плиточный клей", "затирка", "ванная", "кухня"],
  popularity: 88,
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
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
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
      defaultValue: 12,
      group: "byArea",
    },
    {
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileHeight",
      label: "Высота/длина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая" },
        { value: 1, label: "Диагональная" },
        { value: 2, label: "Кирпичная (со смещением)" },
      ],
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
    {
      key: "jointDepth",
      label: "Глубина шва затирки",
      type: "slider",
      unit: "мм",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 6,
      hint: "Обычно равна ширине шва или 2/3 толщины плитки",
    },
    {
      key: "roomComplexity",
      label: "Сложность помещения",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простое (прямоугольник)" },
        { value: 1, label: "Среднее (короба, ниши)" },
        { value: 2, label: "Сложное (много углов, радиусы)" },
      ],
    },
    ...(tileManufacturerField ? [tileManufacturerField] : []),
  ],
  calculate(inputs) {
    const result = computeCanonicalTile(
      tileCanonicalSpec,
      {
        inputMode: inputs.inputMode,
        length: inputs.length,
        width: inputs.width,
        area: inputs.area,
        tileWidthCm: (inputs.tileWidth ?? 300) / 10,
        tileHeightCm: (inputs.tileHeight ?? 300) / 10,
        jointWidth: inputs.jointWidth,
        groutDepth: inputs.jointDepth,
        layoutPattern: inputs.layoutPattern ?? mapLegacyMethodToCanonical(inputs.layingMethod),
        roomComplexity: inputs.roomComplexity !== undefined ? mapLegacyComplexityToCanonical(inputs.roomComplexity) : 1,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );

    const manufacturer = getManufacturerByIndex("tile", inputs.manufacturer);
    if (manufacturer) {
      result.materials = result.materials.map((m) =>
        m.category === "Основное" || /плитк|керамогран/i.test(m.name)
          ? { ...m, name: `${m.name} — ${manufacturer.name}` }
          : m
      );
    }
    return result;
  },
  formulaDescription: `
**Расчёт плитки:**
Количество плитки считается по площади и размеру элемента, после чего применяется детерминированный запас на раскладку,
сложность помещения и формат плитки. Клей и затирка рассчитываются отдельно по нормам расхода.
  `,
  howToUse: [
    "Введите размеры или площадь укладки",
    "Укажите размер плитки и ширину шва",
    "Выберите способ укладки и сложность помещения",
    "Нажмите «Рассчитать» — получите плитку, клей, затирку и расходники",
  ],
  expertTips: [
    {
      title: "Подготовка основания",
      content: "Проверяйте плоскость основания до укладки. На крупном формате даже небольшие перепады быстро приведут к лишнему расходу клея и проблемам со швами.",
      author: "Мастер-отделочник"
    },
    {
      title: "Запас на подрезку",
      content: "Чем сложнее раскладка и чем крупнее формат плитки, тем выше отходы. Лучше планировать запас заранее, чем добирать плитку из другой партии.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Почему калькулятор показывает три сценария?",
      answer:
        "MIN — ориентир при «идеальной» раскладке, REC — рабочий запас, MAX — более жёсткий запас под сложные углы, рисунок и дорогую плитку. Так проще решить объём закупки и уменьшить риск добора другой партии.",
    },
    {
      question: "Нужна ли система выравнивания плитки?",
      answer:
        "СВП имеет смысл от формата ~45 см и на крупном керамограните — меньше ступенек по кромкам на длинных швах. На мозаику и мелкий формат часто не нужна. СВП не выравнивает перепады стяжки — основание готовят заранее.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта плитки</h2>
<p>Количество плитки рассчитывается по формуле:</p>
<p><strong>N = S / S<sub>пл</sub> &times; (1 + К<sub>отход</sub>/100)</strong></p>
<ul>
  <li><strong>S</strong> — площадь облицовки (м&sup2;)</li>
  <li><strong>S<sub>пл</sub></strong> — площадь одной плитки (м&sup2;)</li>
  <li><strong>К<sub>отход</sub></strong> — коэффициент отхода: 10% (прямая и со смещением), 15% (диагональ), 20% (ёлочка); крупный формат от 60 см добавляет +5%</li>
</ul>
<p>Сложная геометрия помещения добавляет к запасу: Г-образная комната +5%, много углов и радиусов +10%. Расход клея и затирки считается отдельно по нормам.</p>

<h2>Расход клея и затирки</h2>
<table>
  <thead>
    <tr><th>Материал</th><th>Расход</th><th>Условия</th></tr>
  </thead>
  <tbody>
    <tr><td>Плиточный клей (гребёнка 4&ndash;6 мм)</td><td>3.5 кг/м&sup2;</td><td>Плитка до 200&times;200 мм</td></tr>
    <tr><td>Плиточный клей (гребёнка 6&ndash;8 мм)</td><td>4.0 кг/м&sup2;</td><td>Плитка 200&times;200 &ndash; 400&times;400 мм</td></tr>
    <tr><td>Плиточный клей (гребёнка 8&ndash;10 мм)</td><td>5.5 кг/м&sup2;</td><td>Плитка 400&times;400 &ndash; 600&times;600 мм</td></tr>
    <tr><td>Плиточный клей (гребёнка 10&ndash;12 мм)</td><td>6.5 кг/м&sup2;</td><td>Керамогранит от 600&times;600 мм</td></tr>
    <tr><td>Затирка (шов 2 мм, плитка 300&times;300)</td><td>~0.15 кг/м&sup2;</td><td>геометрия шва, цементная</td></tr>
    <tr><td>Затирка (шов 3 мм, плитка 600&times;600)</td><td>~0.15 кг/м&sup2;</td><td>геометрия шва, цементная</td></tr>
  </tbody>
</table>
<p>Расход затирки приведён по геометрии шва (длина швов &times; ширина &times; глубина &times; плотность). Реальный расход с учётом переполнения и неровных швов обычно чуть выше — берите один запасной мешок.</p>

<h2>Коэффициент отхода по способу укладки</h2>
<ul>
  <li><strong>Прямая укладка:</strong> 10%</li>
  <li><strong>Диагональная:</strong> 15%</li>
  <li><strong>Кирпичная (со смещением):</strong> 10%</li>
  <li><strong>Ёлочка:</strong> 20%</li>
</ul>
<p>К базовому отходу прибавляется надбавка за сложность помещения (0/5/10%) и за крупный формат от 60 см (+5%).</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 71.13330.2017</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
  <li><strong>ГОСТ 6787-2001</strong> &laquo;Плитки керамические для полов&raquo;</li>
  <li><strong>ГОСТ 6141-91</strong> &laquo;Плитки керамические глазурованные для внутренней облицовки стен&raquo;</li>
</ul>
<p>Система выравнивания плитки (СВП) рекомендуется при формате от 45 см &mdash; снижает перепады между плитками на 50&ndash;80%.</p>
`,
    faq: [
      {
        question: "Сколько плитки нужно на 1 м2 с учётом подрезки?",
        answer: "<p>Расход плитки на 1 м&sup2; зависит от размера плитки, способа укладки и сложности помещения. В калькуляторе базовый отход прямой укладки — 10%, диагональной — 15%:</p><table><thead><tr><th>Размер плитки</th><th>Прямая (10%)</th><th>Диагональная (15%)</th></tr></thead><tbody><tr><td>200&times;200 мм</td><td>~28 шт (1.10 м&sup2;)</td><td>~29 шт (1.15 м&sup2;)</td></tr><tr><td>300&times;300 мм</td><td>~13 шт (1.10 м&sup2;)</td><td>~13 шт (1.15 м&sup2;)</td></tr><tr><td>600&times;600 мм</td><td>~3 шт (1.10 м&sup2;)</td><td>~3.3 шт (1.15 м&sup2;)</td></tr></tbody></table><p>Для сложных помещений (ниши, короба, радиусы) калькулятор добавляет к базовому запасу ещё 5&ndash;10%.</p>",
      },
      {
        question: "Какой размер гребёнки выбрать для плиточного клея?",
        answer: "<p>Размер зубцов гребёнки (шпателя) зависит от формата плитки:</p><ul><li><strong>4&times;4 мм</strong> &mdash; мозаика и плитка до 100&times;100 мм</li><li><strong>6&times;6 мм</strong> &mdash; плитка 100&times;200 &ndash; 300&times;300 мм</li><li><strong>8&times;8 мм</strong> &mdash; плитка 300&times;600 мм</li><li><strong>10&times;10 мм</strong> &mdash; плитка 600&times;600 мм</li><li><strong>12&times;12 мм</strong> &mdash; керамогранит от 600&times;1200 мм</li></ul><p>По <strong>СП 71.13330</strong> толщина клеевого слоя после прижатия плитки не должна превышать 10 мм для стен и 15 мм для пола.</p>",
      },
      {
        question: "Нужна ли СВП (система выравнивания плитки)?",
        answer: "<p>СВП рекомендуется при укладке плитки формата <strong>от 45 см</strong> (450&times;450 мм и выше). Преимущества:</p><ul><li>Снижение перепадов по кромкам на 50&ndash;80%</li><li>Ускорение укладки крупного формата</li><li>Минимизация ступенек на длинных швах</li></ul><p>Расход: клинья &mdash; многоразовые, зажимы &mdash; <strong>6&ndash;8 шт/м&sup2;</strong> (зависит от формата). Для мозаики и мелкой плитки СВП не нужна. Система не заменяет ровное основание &mdash; стяжка должна быть подготовлена до укладки.</p>",
      },
    ],
  },
};

