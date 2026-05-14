import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalBlindArea } from "../../../../engine/blind-area";
import blindareaSpec from "../../../../configs/calculators/blind-area-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const blindAreaDef: CalculatorDefinition = {
  id: "foundation_blind_area",
  slug: "otmostka",
  title: "Калькулятор отмостки",
  h1: "Калькулятор отмостки онлайн — расчёт бетона и материалов",
  description: "Рассчитайте объём бетона, щебня, песка и гидроизоляции для устройства отмостки вокруг дома.",
  metaTitle: withSiteMetaTitle("Калькулятор отмостки | Расчёт бетона, материалов"),
  metaDescription: "Бесплатный калькулятор отмостки: рассчитайте бетон, щебень, песок и ЭППС для устройства отмостки по периметру дома и ширине конструкции.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["отмостка", "бетонная отмостка", "отмостка дома", "отмостка расчёт"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "perimeter",
      label: "Периметр дома",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 40,
    },
    {
      key: "width",
      label: "Ширина отмостки",
      type: "select",
      defaultValue: 1.0,
      options: [
        { value: 0.6, label: "0.6 м (минимум)" },
        { value: 0.8, label: "0.8 м" },
        { value: 1.0, label: "1.0 м (рекомендуется)" },
        { value: 1.2, label: "1.2 м" },
        { value: 1.5, label: "1.5 м" },
      ],
    },
    {
      key: "thickness",
      label: "Толщина бетонного слоя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 70, label: "70 мм" },
        { value: 100, label: "100 мм (стандарт)" },
        { value: 150, label: "150 мм (армированная)" },
      ],
    },
    {
      key: "materialType",
      label: "Тип отмостки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Бетонная (М200)" },
        { value: 1, label: "Тротуарная плитка" },
        { value: 2, label: "Мягкая (плёнка + щебень)" },
      ],
    },
    {
      key: "withInsulation",
      label: "Утепление ЭППС под отмосткой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без утепления" },
        { value: 50, label: "ЭППС 50 мм" },
        { value: 100, label: "ЭППС 100 мм" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = blindareaSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalBlindArea(spec, inputs, factorTable);

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
**Расчёт отмостки:**
- Площадь = периметр × ширину
- Бетон М200: площадь × толщину (м³)
- Подготовка: щебень 150 мм + песок 100 мм
- Уклон 1–3% обязателен по СП 45.13330
  `,
  howToUse: [
    "Введите периметр дома",
    "Выберите ширину и толщину отмостки",
    "Укажите тип отмостки",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Какая ширина отмостки считается нормальной?",
      answer:
        "Ширину связывают со свесом кровли, уклоном, грунтом и отводом воды: полоса должна перекрывать зону схода стока и уводить влагу от цоколя. Минимумы из норм — ориентир; на слабых и влажных грунтах обычно закладывают больший запас, чем «минимально по виду».",
    },
    {
      question: "Нужно ли утеплять отмостку?",
      answer:
        "Часто да для отапливаемого дома, МЗЛФ и пучинистых грунтов: утеплённый контур снижает промерзание у фундамента и стабилизирует узел. Конкретная схема — по проекту и дренажу участка.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта отмостки</h2>
<p>Площадь и объём материалов для отмостки определяются по формулам:</p>
<p><strong>S = P &times; W</strong></p>
<p><strong>V<sub>бет</sub> = S &times; h</strong></p>
<ul>
  <li><strong>S</strong> — площадь отмостки (м&sup2;)</li>
  <li><strong>P</strong> — периметр дома (м)</li>
  <li><strong>W</strong> — ширина отмостки (м)</li>
  <li><strong>h</strong> — толщина бетонного слоя (м)</li>
</ul>
<p>Обязательный уклон отмостки от стены: <strong>1&ndash;3%</strong> (10&ndash;30 мм на 1 м ширины).</p>

<h2>Конструкция отмостки (послойно)</h2>
<table>
  <thead>
    <tr><th>Слой</th><th>Толщина, мм</th><th>Материал</th></tr>
  </thead>
  <tbody>
    <tr><td>Уплотнённый грунт</td><td>&mdash;</td><td>Основание</td></tr>
    <tr><td>Песчаная подушка</td><td>100&ndash;150</td><td>Песок средний, уплотнённый</td></tr>
    <tr><td>Щебёночная подушка</td><td>100&ndash;150</td><td>Щебень фр. 20&ndash;40 мм</td></tr>
    <tr><td>Утеплитель (опционально)</td><td>50&ndash;100</td><td>ЭППС Пеноплэкс/Технониколь</td></tr>
    <tr><td>Бетонный слой</td><td>70&ndash;150</td><td>Бетон М200 (В15)</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 45.13330.2017</strong> &laquo;Земляные сооружения, основания и фундаменты&raquo;</li>
  <li><strong>СП 22.13330.2016</strong> &laquo;Основания зданий и сооружений&raquo;</li>
  <li><strong>СП 82.13330.2016</strong> &laquo;Благоустройство территорий&raquo;</li>
</ul>
<p>По нормам ширина отмостки должна быть не менее чем на 200 мм больше выступа карнизного свеса кровли и не менее <strong>600 мм</strong> для нормальных грунтов, <strong>1 000 мм</strong> &mdash; для просадочных.</p>
`,
    faq: [
      {
        question: "Какой ширины должна быть отмостка вокруг дома?",
        answer: "<p>Минимальная ширина отмостки по <strong>СП 82.13330</strong>:</p><ul><li><strong>600 мм</strong> — для непросадочных грунтов</li><li><strong>1 000 мм</strong> — для просадочных грунтов (I тип)</li><li><strong>1 200&ndash;1 500 мм</strong> — для просадочных грунтов (II тип)</li></ul><p>При этом ширина отмостки должна превышать вынос карнизного свеса минимум на 200 мм. На практике для частного дома оптимальная ширина составляет <strong>1.0&ndash;1.2 м</strong>.</p>",
      },
      {
        question: "Какой уклон делать у отмостки?",
        answer: "<p>Поперечный уклон отмостки от стены здания должен составлять <strong>1&ndash;3%</strong> (10&ndash;30 мм на 1 метр ширины) по <strong>СП 82.13330</strong>. Это обеспечивает надёжный отвод воды от фундамента.</p><ul><li><strong>1%</strong> (10 мм/м) — минимально допустимый уклон</li><li><strong>2%</strong> (20 мм/м) — оптимальное значение</li><li><strong>3%</strong> (30 мм/м) — для регионов с обильными осадками</li></ul><p>Уклон задаётся при устройстве основания и контролируется по маякам перед заливкой бетона.</p>",
      },
      {
        question: "Нужна ли арматура в бетонной отмостке?",
        answer: "<p>Армирование бетонной отмостки не является строго обязательным, но существенно повышает её долговечность:</p><ul><li><strong>Без армирования</strong> — допустимо при толщине 100&ndash;150 мм на надёжном основании</li><li><strong>С сеткой</strong> — кладочная сетка 100 &times; 100 &times; 4 мм или арматурная сетка &Oslash;6 мм с шагом 200 мм</li></ul><p>Армирование особенно рекомендуется на пучинистых грунтах и при толщине бетона менее 100 мм. Деформационные швы устраивают каждые 2&ndash;3 метра для предотвращения хаотичного растрескивания.</p>",
      },
    ],
  },
};

