import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFoundationSlab } from "../../../../engine/foundation-slab";
import foundationslabSpec from "../../../../configs/calculators/foundation-slab-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const foundationSlabDef: CalculatorDefinition = {
  id: "foundation_slab",
  slug: "plitnyj-fundament",
  title: "Калькулятор плитного фундамента",
  h1: "Калькулятор плитного фундамента онлайн — расчёт бетона и арматуры",
  description: "Рассчитайте объём бетона, арматуру, опалубку и геотекстиль для монолитной плиты фундамента по ГОСТ.",
  metaTitle: withSiteMetaTitle("Калькулятор плитного фундамента | Расчёт бетона, арматуры"),
  metaDescription:
    "Бесплатный калькулятор монолитной плиты фундамента: рассчитайте бетон, арматуру А500С, опалубку и подготовку основания по СП 22.13330 и СП 63.13330.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["плитный фундамент", "монолитная плита", "фундамент", "бетон", "арматура"],
  popularity: 68,
  complexity: 3,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 0, label: "По размерам (длина × ширина)" },
        { value: 1, label: "По площади" },
      ],
      hint: "По размерам — точнее для прямоугольных и вытянутых плит. По площади — упрощённый расчёт.",
    },
    {
      key: "length",
      label: "Длина плиты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина плиты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 6,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь плиты",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 60,
      group: "byArea",
    },
    {
      key: "thickness",
      label: "Толщина плиты",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (лёгкие постройки)" },
        { value: 200, label: "200 мм (жилой дом, рекомендуется)" },
        { value: 250, label: "250 мм (тяжёлые конструкции)" },
        { value: 300, label: "300 мм (многоэтажные дома)" },
      ],
    },
    {
      key: "rebarDiam",
      label: "Диаметр арматуры",
      type: "select",
      defaultValue: 12,
      options: [
        { value: 10, label: "∅10 мм (лёгкие нагрузки)" },
        { value: 12, label: "∅12 мм (стандарт)" },
        { value: 14, label: "∅14 мм (повышенные нагрузки)" },
        { value: 16, label: "∅16 мм (тяжёлые конструкции)" },
      ],
    },
    {
      key: "rebarStep",
      label: "Шаг арматуры",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (усиленная сетка)" },
        { value: 200, label: "200 мм (стандарт)" },
        { value: 250, label: "250 мм (облегчённая)" },
      ],
    },
    {
      key: "insulationThickness",
      label: "Утеплитель ЭППС под плитой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не нужен" },
        { value: 50, label: "50 мм" },
        { value: 100, label: "100 мм (тёплый дом)" },
        { value: 150, label: "150 мм (Северные регионы)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = foundationslabSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFoundationSlab(spec, inputs, factorTable);

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
**Расчёт монолитной плиты:**
- Бетон В22.5: площадь × толщину (м³)
- Арматура: 2 сетки (верх+низ), шаг 200 мм
- Подготовка: щебень 150 мм + песок 100 мм
- Утепление ЭППС — опционально
  `,
  howToUse: [
    "Выберите способ ввода: по размерам (точнее) или по площади",
    "Введите длину и ширину (или площадь) плиты",
    "Выберите толщину и армирование",
    "Укажите необходимость утепления",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Какая толщина плиты фундамента нужна для частного дома?",
      answer:
        "Толщину монолитной плиты, армирование и узел с подушкой задаёт проект по нагрузке, грунту и схеме дома. Бытовой ориентир в сотнях миллиметров не заменяет расчёт: от толщины зависят объём бетона, жёсткость и зоны концентрации нагрузок.",
    },
    {
      question: "Нужно ли утеплять плитный фундамент?",
      answer:
        "Утепление под плитой (часто ЭППС) типично для жилых домов и тёплого пола: меньше теплопотерь вниз, спокойнее узел у цоколя. Нужна ли конкретная толщина и кромочное утепление — по теплотехнике и проекту; кромку и плиту обычно рассматривают одним узлом.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта плитного фундамента</h2>
<p>Объём бетона для монолитной плиты определяется по формуле:</p>
<p><strong>V = S &times; h</strong></p>
<ul>
  <li><strong>V</strong> — объём бетона (м&sup3;)</li>
  <li><strong>S</strong> — площадь плиты (м&sup2;)</li>
  <li><strong>h</strong> — толщина плиты (м)</li>
</ul>
<p>Дополнительно рассчитываются: арматурная сетка (верхний и нижний пояс), подготовка основания (щебень + песок) и утепление ЭППС.</p>

<h2>Армирование монолитной плиты</h2>
<table>
  <thead>
    <tr><th>Параметр</th><th>Стандартное значение</th><th>Нормативный документ</th></tr>
  </thead>
  <tbody>
    <tr><td>Класс арматуры</td><td>A500С</td><td>ГОСТ 34028-2016</td></tr>
    <tr><td>Диаметр рабочей арматуры</td><td>&Oslash;12&ndash;16 мм</td><td>СП 63.13330</td></tr>
    <tr><td>Шаг сетки</td><td>200 &times; 200 мм</td><td>Проект</td></tr>
    <tr><td>Количество сеток</td><td>2 (верх + низ)</td><td>СП 63.13330</td></tr>
    <tr><td>Защитный слой бетона</td><td>35&ndash;50 мм</td><td>СП 63.13330</td></tr>
  </tbody>
</table>
<p>Расход арматуры на 1 м&sup2; плиты толщиной 200 мм при шаге 200 мм и &Oslash;12 составляет примерно <strong>18&ndash;22 кг/м&sup2;</strong>.</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 22.13330.2016</strong> &laquo;Основания зданий и сооружений&raquo;</li>
  <li><strong>СП 63.13330.2018</strong> &laquo;Бетонные и железобетонные конструкции&raquo;</li>
  <li><strong>ГОСТ 26633-2015</strong> &laquo;Бетоны тяжёлые и мелкозернистые. Технические условия&raquo;</li>
  <li><strong>ГОСТ 34028-2016</strong> &laquo;Арматурный прокат для железобетонных конструкций&raquo;</li>
</ul>
<p>Рекомендуемый класс бетона для плитного фундамента: <strong>В22.5 (М300)</strong> и выше с морозостойкостью F150 и водонепроницаемостью W6.</p>
`,
    faq: [
      {
        question: "Сколько арматуры нужно на плитный фундамент?",
        answer: "<p>Расход арматуры зависит от толщины плиты, шага сетки и диаметра стержней. При стандартной схеме (2 сетки, шаг 200 мм, &Oslash;12):</p><ul><li>Плита 60 м&sup2;: примерно <strong>1 100&ndash;1 300 кг</strong> арматуры</li><li>Плита 100 м&sup2;: примерно <strong>1 800&ndash;2 200 кг</strong> арматуры</li></ul><p>Дополнительно учитывают вертикальные связи (&Oslash;6&ndash;8 мм, шаг 600 мм) и нахлёст стержней (40 диаметров), что добавляет 10&ndash;15% к общему метражу.</p>",
      },
      {
        question: "Какая подготовка основания нужна под плитный фундамент?",
        answer: "<p>Стандартный &laquo;пирог&raquo; основания под плиту по <strong>СП 22.13330</strong>:</p><ul><li>Уплотнённый грунт (виброплитой)</li><li>Песчаная подушка &mdash; 100&ndash;200 мм</li><li>Щебёночная подушка &mdash; 100&ndash;200 мм</li><li>Подбетонка (бетон М100) &mdash; 50&ndash;100 мм (опционально)</li><li>Гидроизоляция (мембрана или рулонная)</li><li>Утеплитель ЭППС &mdash; 50&ndash;150 мм (для тёплой плиты)</li></ul><p>Каждый слой уплотняется виброплитой до требуемого коэффициента уплотнения.</p>",
      },
      {
        question: "Нужно ли делать рёбра жёсткости у плитного фундамента?",
        answer: "<p>Рёбра жёсткости под плитой рекомендуются в следующих случаях:</p><ul><li>Тяжёлые дома (кирпич, газобетон от 2 этажей)</li><li>Слабые или неоднородные грунты</li><li>Плита тоньше 250 мм при значительных нагрузках</li></ul><p>Рёбра устраивают по периметру плиты и под несущими стенами. Типичные размеры: ширина 300&ndash;400 мм, высота 200&ndash;300 мм. Армируются каркасом из 4 стержней &Oslash;12&ndash;14 мм с хомутами &Oslash;6 шагом 300 мм по <strong>СП 63.13330</strong>.</p>",
      },
    ],
  },
};
