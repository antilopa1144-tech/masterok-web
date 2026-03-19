import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalDecorStone } from "../../../../engine/decor-stone";
import decorstoneSpec from "../../../../configs/calculators/decor-stone-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const decorStoneDef: CalculatorDefinition = {
  id: "walls_decor_stone",
  slug: "dekorativnyj-kamen",
  title: "Калькулятор декоративного камня",
  h1: "Калькулятор декоративного камня онлайн — расчёт расхода",
  description: "Рассчитайте количество декоративного камня, клея, затирки и грунтовки по площади облицовки.",
  metaTitle: withSiteMetaTitle("Калькулятор декоративного камня | Клей, затирка, расшивка"),
  metaDescription: "Бесплатный калькулятор декоративного камня: рассчитайте облицовочный камень, клей, затирку и грунтовку по площади стен с учётом расшивки швов.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["декоративный камень", "облицовочный камень", "клей для камня", "затирка", "расшивка"],
  popularity: 50,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По площади" },
        { value: 1, label: "По размерам стены" },
      ],
    },
    {
      key: "area",
      label: "Площадь облицовки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 15,
      group: "byArea",
    },
    {
      key: "wallWidth",
      label: "Ширина стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 10,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "stoneType",
      label: "Тип камня",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гипсовый (лёгкий, интерьер)" },
        { value: 1, label: "Цементный (фасад/интерьер)" },
        { value: 2, label: "Натуральный (тяжёлый)" },
      ],
    },
    {
      key: "jointWidth",
      label: "Ширина шва (расшивка)",
      type: "slider",
      unit: "мм",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 10,
    },
    {
      key: "needGrout",
      label: "Затирка швов",
      type: "switch",
      defaultValue: 1,
    },
    {
      key: "needPrimer",
      label: "Грунтовка",
      type: "switch",
      defaultValue: 1,
    },
  ],
  calculate(inputs) {
    const spec = decorstoneSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalDecorStone(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

    return {
      materials: canonical.materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
    };
  },
  formulaDescription: `
**Расчёт декоративного камня:**
- Камень: площадь × 1.10 (запас 10%)
- Клей: площадь × 3–7 кг/м² (по типу камня) × 1.10
- Затирка: площадь × (ширина шва / 5) × 0.2 × 1.10
- Грунтовка: площадь × 0.15 л/м²
  `,
  howToUse: [
    "Введите площадь облицовки или размеры стены",
    "Выберите тип камня",
    "Задайте ширину шва (0 — бесшовная укладка)",
    "Включите затирку и грунтовку при необходимости",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Какой клей использовать для декоративного камня?",
      answer: "Для гипсового камня подходят гипсовые и цементные клеевые составы с расходом около 3 кг/м², для цементного камня обычно используют усиленный плиточный клей с расходом 5 кг/м², а для натурального тяжёлого камня — клей повышенной фиксации с расходом до 7 кг/м². На стену клей наносится и на основание, и на камень для надёжного сцепления по всей площади контакта.",
    },
    {
      question: "Нужна ли расшивка швов при укладке декоративного камня?",
      answer: "Расшивка швов при укладке декоративного камня зависит от стиля облицовки: для имитации кирпичной кладки обычно делают шов 8–12 мм с заполнением затиркой, а для бесшовной укладки камни кладут вплотную. Расшивка защищает торцы, улучшает внешний вид, позволяет подчеркнуть рисунок кладки и прячет неровности подрезки, но при этом увеличивает расход материалов и время работы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта декоративного камня</h2>
<p>Расход материалов для облицовки декоративным камнем:</p>
<ul>
  <li><strong>Камень</strong> = S &times; 1.10 (запас 10% на подрезку и подбор)</li>
  <li><strong>Клей</strong> = S &times; R<sub>клей</sub> &times; 1.10 / Вес мешка</li>
  <li><strong>Затирка</strong> = S &times; (Ширина шва / 5) &times; 0.2 &times; 1.10 / Вес мешка</li>
  <li><strong>Грунтовка</strong> = S &times; 0.15 л/м² &times; 1.10 / Объём канистры</li>
</ul>

<h2>Нормы расхода клея по типу камня</h2>
<table>
  <thead>
    <tr><th>Тип камня</th><th>Расход клея, кг/м²</th><th>Вес камня, кг/м²</th><th>Рекомендуемый клей</th></tr>
  </thead>
  <tbody>
    <tr><td>Гипсовый (интерьер)</td><td>3.0</td><td>10–20</td><td>Гипсовый монтажный клей, Knauf Перлфикс</td></tr>
    <tr><td>Цементный (фасад/интерьер)</td><td>5.0</td><td>25–45</td><td>Ceresit CM 117, Knauf Флексклебер</td></tr>
    <tr><td>Натуральный (тяжёлый)</td><td>7.0</td><td>40–80</td><td>Ceresit CM 17, усиленный плиточный</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Облицовка декоративным камнем выполняется по <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия». Для натурального камня на фасаде дополнительно учитываются требования <strong>ГОСТ 9480-2012</strong> «Плиты облицовочные из природного камня». Несущая способность стены должна быть достаточной для веса камня — при облицовке тяжёлым натуральным камнем (более 40 кг/м²) требуется проверка основания.</p>

<h2>Технология укладки</h2>
<ul>
  <li>Подготовка основания: выравнивание, грунтовка</li>
  <li>Разметка стартовой линии по уровню</li>
  <li>Нанесение клея на стену и на камень (двойной промаз)</li>
  <li>Укладка камня снизу вверх с фиксацией</li>
  <li>Расшивка швов затиркой (пистолет или мешок)</li>
  <li>Финишная обработка гидрофобизатором (для фасада)</li>
</ul>
`,
    faq: [
      {
        question: "Сколько клея нужно на 15 м² декоративного камня?",
        answer: "<p>Расход клея зависит от типа камня:</p><ul><li><strong>Гипсовый камень</strong>: 15 &times; 3.0 &times; 1.10 = 49.5 кг &asymp; <strong>2 мешка по 25 кг</strong></li><li><strong>Цементный камень</strong>: 15 &times; 5.0 &times; 1.10 = 82.5 кг &asymp; <strong>4 мешка по 25 кг</strong></li><li><strong>Натуральный камень</strong>: 15 &times; 7.0 &times; 1.10 = 115.5 кг &asymp; <strong>5 мешков по 25 кг</strong></li></ul><p>Клей наносится двойным промазом: и на стену, и на тыльную сторону камня. При неровном основании расход увеличивается на <strong>15–20%</strong>.</p>",
      },
      {
        question: "Можно ли клеить декоративный камень на гипсокартон?",
        answer: "<p>Да, <strong>лёгкий гипсовый камень</strong> (10–20 кг/м²) можно клеить на ГКЛ без дополнительного усиления. Для более тяжёлого камня есть ограничения:</p><table><thead><tr><th>Тип камня</th><th>Вес, кг/м²</th><th>На ГКЛ</th></tr></thead><tbody><tr><td>Гипсовый</td><td>10–20</td><td>Можно (грунтовка + клей)</td></tr><tr><td>Цементный лёгкий</td><td>25–35</td><td>С усилением (2 слоя ГКЛ или ГВЛВ)</td></tr><tr><td>Натуральный</td><td>40–80</td><td>Нельзя (только на кирпич/бетон)</td></tr></tbody></table><p>Перед облицовкой ГКЛ обязательно грунтуют составом глубокого проникновения. Шаг профилей каркаса под ГКЛ должен быть не более <strong>400 мм</strong>.</p>",
      },
      {
        question: "Как рассчитать затирку для швов декоративного камня?",
        answer: "<p>Расход затирки зависит от ширины шва и площади облицовки:</p><p><strong>M = S &times; (Ш<sub>шва</sub> / 5) &times; 0.2 &times; 1.10</strong></p><p>Пример: 15 м², шов 10 мм:</p><p>M = 15 &times; (10 / 5) &times; 0.2 &times; 1.10 = <strong>6.6 кг</strong> &asymp; 2 мешка по 5 кг.</p><ul><li><strong>Шов 5 мм</strong> — минимальная расшивка, расход ~0.22 кг/м²</li><li><strong>Шов 10 мм</strong> — стандартная кладка, расход ~0.44 кг/м²</li><li><strong>Шов 15–20 мм</strong> — грубая кладка, расход ~0.66–0.88 кг/м²</li></ul><p>Затирку наносят строительным пистолетом или из полиэтиленового мешка с обрезанным углом, формируя аккуратный шов.</p>",
      },
    ],
  },
};
