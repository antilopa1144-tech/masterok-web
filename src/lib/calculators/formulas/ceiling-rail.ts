import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalCeilingRail } from "../../../../engine/ceiling-rail";
import ceilingrailSpec from "../../../../configs/calculators/ceiling-rail-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const ceilingRailDef: CalculatorDefinition = {
  id: "ceilings_rail",
  slug: "reechnyj-potolok",
  title: "Калькулятор реечного потолка",
  h1: "Калькулятор реечного потолка онлайн — расчёт реек и профилей",
  description: "Рассчитайте количество алюминиевых реек, направляющих профилей и крепежа для реечного потолка.",
  metaTitle: withSiteMetaTitle("Калькулятор реечного потолка | Расчёт реек Armstrong, Cesal"),
  metaDescription: "Бесплатный калькулятор реечного потолка: рассчитайте алюминиевые рейки, профили и крепёж для потолка Cesal или Armstrong по площади помещения.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["реечный потолок", "рейка", "алюминиевый потолок", "Armstrong", "Cesal"],
  popularity: 60,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 15,
    },
    {
      key: "railWidth",
      label: "Ширина рейки",
      type: "select",
      defaultValue: 10,
      options: [
        { value: 10, label: "100 мм (стандарт)" },
        { value: 15, label: "150 мм" },
        { value: 20, label: "200 мм" },
      ],
    },
    {
      key: "railLength",
      label: "Длина рейки",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 3, label: "3.0 м" },
        { value: 3.6, label: "3.6 м" },
        { value: 4, label: "4.0 м" },
      ],
    },
    {
      key: "roomLength",
      label: "Длина комнаты (для направления монтажа)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
  ],
  calculate(inputs) {
    const spec = ceilingrailSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalCeilingRail(spec, inputs, factorTable);

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
**Расчёт реечного потолка:**
- Рядов реек = ⌈Ширина комнаты / Ширина рейки⌉
- Реек = ⌈(Рядов × Длина комнаты × 1.1) / Длина рейки⌉
- Направляющих = ⌈Длина / 1.0⌉ + 1 (шаг 1 м)
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите ширину и длину рейки",
    "Укажите длину комнаты",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какой запас нужен на реечный потолок?",
      answer:
        "Калькулятор берёт ~10% на подрезку и бой. Ниши, короба и узкие доборные полосы повышают расход; добор той же партии по цвету часто сложен — лучше закупить с запасом сразу.",
    },
    {
      question: "Какой шаг направляющих делать для реечного потолка?",
      answer:
        "Строго по паспорту выбранной системы (рейка, пролёт, подвесы). Редкий каркас даёт «игру» поля — не экономьте на профиле вдоль длинных помещений и тяжёлых светильников.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта реечного потолка</h2>
<p>Расход элементов реечного потолка рассчитывается по площади и размерам помещения:</p>
<ul>
  <li><strong>Рядов реек</strong> = Ширина помещения / Ширина рейки (с округлением вверх)</li>
  <li><strong>Реек</strong> = (Рядов &times; Длина &times; 1.10) / Длина рейки</li>
  <li><strong>Стрингеры (направляющие)</strong> = Длина помещения / 1.0 м (шаг) + 1</li>
  <li><strong>Подвесы</strong> = по 1 шт. на каждые 1.0–1.2 м стрингера</li>
  <li><strong>Пристенный П-профиль</strong> = Периметр / 3.0 м</li>
</ul>

<h2>Нормы расхода на 1 м² реечного потолка</h2>
<table>
  <thead>
    <tr><th>Элемент</th><th>Расход на 1 м²</th><th>Типовой размер</th></tr>
  </thead>
  <tbody>
    <tr><td>Рейка 100 мм</td><td>10 п.м.</td><td>3000 / 3600 / 4000 мм</td></tr>
    <tr><td>Рейка 150 мм</td><td>6.7 п.м.</td><td>3000 / 3600 / 4000 мм</td></tr>
    <tr><td>Стрингер</td><td>1.0 п.м.</td><td>3000 / 4000 мм</td></tr>
    <tr><td>Подвес пружинный</td><td>1.0 шт.</td><td>—</td></tr>
    <tr><td>П-профиль пристенный</td><td>по периметру</td><td>3000 мм</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Реечные подвесные потолки монтируются по <strong>СП 71.13330.2017</strong> и монтажным инструкциям производителей (Cesal, Albes, Armstrong). Минимальное понижение от базового потолка — <strong>50 мм</strong> (при прямом монтаже стрингера). Алюминиевые рейки соответствуют <strong>ГОСТ 22233-2018</strong> «Профили прессованные из алюминиевых сплавов».</p>

<h2>Типы реечных потолков</h2>
<ul>
  <li><strong>Открытый тип</strong> — между рейками видны щели (декоративные вставки по желанию)</li>
  <li><strong>Закрытый тип</strong> — рейки стыкуются впритык без зазоров</li>
  <li><strong>Кубообразный (гриль)</strong> — рейки установлены на ребро, создают 3D-эффект</li>
</ul>
`,
    faq: [
      {
        question: "Сколько реек нужно на ванную 3×2 м?",
        answer: "<p>Для ванной комнаты 3&times;2 м (6 м²) с рейкой шириной <strong>100 мм</strong> и длиной <strong>3.0 м</strong>:</p><p><strong>Рядов</strong> = 2000 / 100 = <strong>20 рядов</strong></p><p><strong>Реек</strong> = 20 &times; (3000 / 3000) &times; 1.10 = <strong>22 рейки</strong></p><ul><li><strong>Стрингеры</strong> = 3 / 1.0 + 1 = 4 &times; (2000 / 3000) &asymp; <strong>3 шт. по 3 м</strong></li><li><strong>Подвесы</strong> = ~6 шт.</li><li><strong>П-профиль</strong> = 10 п.м. / 3 = <strong>4 шт.</strong></li></ul><p>Реечный потолок из алюминия — оптимальное решение для ванной: он не боится влаги, легко моется и снимается для обслуживания коммуникаций.</p>",
      },
      {
        question: "Можно ли установить реечный потолок своими руками?",
        answer: "<p>Да, реечный потолок — одна из самых простых подвесных систем для самостоятельного монтажа. Порядок работ:</p><ul><li><strong>1.</strong> Разметка уровня по периметру (лазерный или водяной уровень)</li><li><strong>2.</strong> Крепление пристенного П-профиля дюбелями (шаг 400–500 мм)</li><li><strong>3.</strong> Установка подвесов к базовому потолку (шаг 1.0–1.2 м)</li><li><strong>4.</strong> Навеска стрингеров на подвесы, выравнивание</li><li><strong>5.</strong> Защёлкивание реек в стрингеры от стены к стене</li></ul><p>Последнюю рейку подрезают по ширине ножницами по металлу. Весь монтаж ванной 6 м² занимает <strong>2–4 часа</strong> при наличии шуруповёрта и уровня.</p>",
      },
      {
        question: "Какой реечный потолок лучше для кухни: алюминий или сталь?",
        answer: "<p>Для кухни лучше выбирать <strong>алюминиевые рейки</strong>:</p><table><thead><tr><th>Параметр</th><th>Алюминий</th><th>Оцинкованная сталь</th></tr></thead><tbody><tr><td>Влагостойкость</td><td>100% (не ржавеет)</td><td>Хорошая (при целом покрытии)</td></tr><tr><td>Вес</td><td>Лёгкий (~0.5 кг/м²)</td><td>Тяжелее (~1.2 кг/м²)</td></tr><tr><td>Уход</td><td>Моется любым средством</td><td>Осторожно с абразивами</td></tr><tr><td>Цена</td><td>Дороже на 30–50%</td><td>Бюджетнее</td></tr></tbody></table><p>Алюминий не корродирует даже при повреждении покрытия, что критично для кухни с парами и жиром. Стальные рейки подходят для сухих помещений с меньшими требованиями к влагостойкости.</p>",
      },
    ],
  },
};

