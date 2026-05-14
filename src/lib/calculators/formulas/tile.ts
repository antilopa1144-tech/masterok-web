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
  metaTitle: withSiteMetaTitle("Калькулятор плитки онлайн | Расчёт плитки и клея"),
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
  <li><strong>К<sub>отход</sub></strong> — коэффициент отхода: 5% (прямая), 10&ndash;15% (диагональ), 15&ndash;20% (ёлочка)</li>
</ul>
<p>Расход плиточного клея и затирки рассчитывается отдельно по нормам производителя.</p>

<h2>Расход клея и затирки</h2>
<table>
  <thead>
    <tr><th>Материал</th><th>Расход</th><th>Условия</th></tr>
  </thead>
  <tbody>
    <tr><td>Плиточный клей (гребёнка 6 мм)</td><td>3.0&ndash;3.5 кг/м&sup2;</td><td>Плитка до 300&times;300 мм</td></tr>
    <tr><td>Плиточный клей (гребёнка 8 мм)</td><td>4.0&ndash;4.5 кг/м&sup2;</td><td>Плитка 300&times;600 мм</td></tr>
    <tr><td>Плиточный клей (гребёнка 10&ndash;12 мм)</td><td>5.0&ndash;6.5 кг/м&sup2;</td><td>Плитка от 600&times;600 мм</td></tr>
    <tr><td>Затирка (шов 2 мм, плитка 300&times;300)</td><td>0.3&ndash;0.5 кг/м&sup2;</td><td>&mdash;</td></tr>
    <tr><td>Затирка (шов 3 мм, плитка 600&times;600)</td><td>0.2&ndash;0.4 кг/м&sup2;</td><td>&mdash;</td></tr>
  </tbody>
</table>

<h2>Коэффициент отхода по способу укладки</h2>
<ul>
  <li><strong>Прямая укладка:</strong> 5&ndash;7% (простое помещение), 7&ndash;10% (ниши, короба)</li>
  <li><strong>Диагональная:</strong> 10&ndash;15%</li>
  <li><strong>Кирпичная (со смещением):</strong> 7&ndash;10%</li>
  <li><strong>Ёлочка:</strong> 15&ndash;20%</li>
</ul>

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
        answer: "<p>Расход плитки на 1 м&sup2; зависит от размера плитки, способа укладки и сложности помещения:</p><table><thead><tr><th>Размер плитки</th><th>Прямая укладка</th><th>Диагональная</th></tr></thead><tbody><tr><td>200&times;200 мм</td><td>~27 шт (1.08 м&sup2;)</td><td>~29 шт (1.16 м&sup2;)</td></tr><tr><td>300&times;300 мм</td><td>~12 шт (1.08 м&sup2;)</td><td>~13 шт (1.17 м&sup2;)</td></tr><tr><td>600&times;600 мм</td><td>~3 шт (1.08 м&sup2;)</td><td>~3.3 шт (1.19 м&sup2;)</td></tr></tbody></table><p>Для сложных помещений (ниши, короба, радиусы) добавляйте дополнительно 3&ndash;5% к базовому запасу.</p>",
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

