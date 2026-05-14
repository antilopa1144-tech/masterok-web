import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalBasement } from "../../../../engine/basement";
import basementSpec from "../../../../configs/calculators/basement-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const basementDef: CalculatorDefinition = {
  id: "foundation_basement",
  slug: "podval-fundamenta",
  title: "Калькулятор подвала и цоколя",
  h1: "Калькулятор подвала и цокольного этажа — расчёт материалов",
  description: "Рассчитайте бетон, арматуру, гидроизоляцию и утепление для строительства подвала или цокольного этажа.",
  metaTitle: withSiteMetaTitle("Калькулятор подвала | Цокольный этаж"),
  metaDescription: "Бесплатный калькулятор подвала: рассчитайте бетон, арматуру, гидроизоляцию стен и пола, утепление ЭППС для цокольного этажа.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["подвал", "цоколь", "цокольный этаж", "гидроизоляция подвала", "фундамент"],
  popularity: 48,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Длина подвала",
      type: "slider",
      unit: "м",
      min: 3,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "width",
      label: "Ширина подвала",
      type: "slider",
      unit: "м",
      min: 3,
      max: 20,
      step: 0.5,
      defaultValue: 6,
    },
    {
      key: "depth",
      label: "Глубина (высота стен подвала)",
      type: "slider",
      unit: "м",
      min: 1.5,
      max: 4,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "wallThickness",
      label: "Толщина стен подвала",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (монолит, до 2 м глубины)" },
        { value: 200, label: "200 мм (монолит, стандарт)" },
        { value: 250, label: "250 мм (монолит, более 3 м)" },
        { value: 300, label: "300 мм (монолит, глубокий подвал)" },
      ],
    },
    {
      key: "floorThickness",
      label: "Толщина плиты пола",
      type: "select",
      defaultValue: 150,
      options: [
        { value: 100, label: "100 мм (минимум)" },
        { value: 150, label: "150 мм (стандарт)" },
        { value: 200, label: "200 мм (нагруженный пол)" },
      ],
    },
    {
      key: "waterproofType",
      label: "Тип гидроизоляции",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Обмазочная (мастика 2 слоя)" },
        { value: 1, label: "Оклеечная (рулонная) + обмазка" },
        { value: 2, label: "Проникающая (Пенетрон, Кальматрон)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = basementSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalBasement(spec, inputs, factorTable);

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
**Расчёт подвала:**
- Бетон пола: длина × ширина × толщина
- Бетон стен: периметр × глубина × толщина
- Арматура пола: ~22 кг/м² (сетка ∅12, 200×200, 2 ряда)
- Арматура стен: ~18 кг/м²
- Гидроизоляция: вся поверхность стен и пол
  `,
  howToUse: [
    "Введите размеры и глубину подвала",
    "Выберите толщину стен и пола",
    "Выберите тип гидроизоляции",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Нужна ли гидроизоляция пола и стен подвала одновременно?",
      answer:
        "Обычно да: влага идёт и с грунта по стенам, и снизу через плиту; слабое место — примыкания и вводы. Тип гидроизоляции и контур выбирают по УГВ, дренажу и назначению подвала; «закрыть только одну плоскость» часто оставляет уязвимый узел.",
    },
    {
      question: "Какую толщину стен подвала выбирать?",
      answer:
        "Толщину, армирование и материал задаёт расчёт: глубина, давление грунта, вода, нагрузка от дома и перекрытий. Калькулятор даёт ориентир по материалам при введённых размерах; для заглублённого подвала без проекта нельзя подбирать стену «на глаз».",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта материалов для подвала</h2>
<p>Расчёт подвала включает несколько конструктивных элементов:</p>
<p><strong>V<sub>стен</sub> = P &times; H &times; t</strong></p>
<p><strong>V<sub>пола</sub> = L &times; W &times; t<sub>пл</sub></strong></p>
<ul>
  <li><strong>P</strong> — периметр подвала = 2 &times; (L + W), м</li>
  <li><strong>H</strong> — высота стен подвала (м)</li>
  <li><strong>t</strong> — толщина стен (м)</li>
  <li><strong>L, W</strong> — длина и ширина подвала (м)</li>
  <li><strong>t<sub>пл</sub></strong> — толщина плиты пола (м)</li>
</ul>

<h2>Расход арматуры на конструкции подвала</h2>
<table>
  <thead>
    <tr><th>Конструкция</th><th>Расход арматуры</th><th>Шаг сетки</th></tr>
  </thead>
  <tbody>
    <tr><td>Плита пола</td><td>~22 кг/м&sup2;</td><td>200 &times; 200 мм, 2 сетки</td></tr>
    <tr><td>Стены подвала</td><td>~18 кг/м&sup2;</td><td>200 &times; 200 мм</td></tr>
  </tbody>
</table>
<p>Гидроизоляция рассчитывается по всей площади наружных стен и плиты пола с учётом нахлёстов (10&ndash;15 см).</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 22.13330.2016</strong> &laquo;Основания зданий и сооружений&raquo;</li>
  <li><strong>СП 28.13330.2017</strong> &laquo;Защита строительных конструкций от коррозии&raquo;</li>
  <li><strong>СП 63.13330.2018</strong> &laquo;Бетонные и железобетонные конструкции&raquo;</li>
  <li><strong>СП 71.13330.2017</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
</ul>
<p>Для подвалов с высоким уровнем грунтовых вод применяют бетон класса <strong>В25 (М350)</strong> с водонепроницаемостью W8 и комбинированную гидроизоляцию (обмазочная + оклеечная).</p>
`,
    faq: [
      {
        question: "Как рассчитать объём бетона для стен подвала?",
        answer: "<p>Объём бетона для стен подвала рассчитывается по формуле:</p><p><strong>V = P &times; H &times; t</strong></p><ul><li><strong>P</strong> — периметр подвала, м</li><li><strong>H</strong> — высота стен, м</li><li><strong>t</strong> — толщина стен, м</li></ul><p>Пример: подвал 8 &times; 6 м, высота стен 2.5 м, толщина 200 мм. Периметр = 28 м. V = 28 &times; 2.5 &times; 0.2 = <strong>14 м&sup3;</strong>. Плита пола: 8 &times; 6 &times; 0.15 = <strong>7.2 м&sup3;</strong>. Итого: ~21.2 м&sup3; + запас.</p>",
      },
      {
        question: "Какую гидроизоляцию выбрать для подвала?",
        answer: "<p>Выбор гидроизоляции зависит от уровня грунтовых вод (УГВ):</p><table><thead><tr><th>УГВ</th><th>Рекомендуемый тип</th><th>Расход</th></tr></thead><tbody><tr><td>Ниже подвала</td><td>Обмазочная мастика, 2 слоя</td><td>3&ndash;4 кг/м&sup2;</td></tr><tr><td>На уровне пола</td><td>Оклеечная (Техноэласт) + обмазка</td><td>1.2 рулона/10 м&sup2;</td></tr><tr><td>Выше подвала</td><td>Проникающая (Пенетрон) + дренаж</td><td>0.8&ndash;1.0 кг/м&sup2;</td></tr></tbody></table><p>По <strong>СП 28.13330</strong> рекомендуется комбинировать виды гидроизоляции для надёжной защиты.</p>",
      },
      {
        question: "Какая минимальная толщина стен монолитного подвала?",
        answer: "<p>Минимальная толщина стен зависит от глубины подвала и давления грунта:</p><ul><li><strong>150 мм</strong> — при глубине до 2 м и лёгких грунтах</li><li><strong>200 мм</strong> — стандартный вариант для частного дома</li><li><strong>250&ndash;300 мм</strong> — при глубине более 3 м или высоком давлении грунта</li></ul><p>По <strong>СП 63.13330</strong> толщина стены должна обеспечивать защитный слой бетона не менее 20 мм для внутренней и 40 мм для наружной арматуры. При высоком УГВ и боковом давлении грунта рекомендуется увеличивать толщину до 250 мм.</p>",
      },
    ],
  },
};


