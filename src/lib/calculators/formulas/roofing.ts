import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalRoofing } from "../../../../engine/roofing";
import roofingSpec from "../../../../configs/calculators/roofing-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const roofingManufacturerField = buildManufacturerField("roofing");

export const roofingDef: CalculatorDefinition = {
  id: "roofing_unified",
  slug: "krovlya",
  title: "Калькулятор кровли",
  h1: "Калькулятор кровли онлайн — расчёт материалов для крыши",
  description: "Рассчитайте материалы для кровли: металлочерепица, профнастил, ондулин, мягкая черепица, шифер. Учёт уклона и сопутствующих материалов.",
  metaTitle: withSiteMetaTitle("Калькулятор кровли онлайн | Расчёт материалов"),
  metaDescription: "Бесплатный калькулятор кровли: рассчитайте металлочерепицу, профнастил, мягкую кровлю, обрешётку, гидроизоляцию и доборные элементы с учётом уклона крыши.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["кровля", "крыша", "металлочерепица", "профнастил", "ондулин", "мягкая черепица"],
  popularity: 85,
  complexity: 2,
  fields: [
    {
      key: "roofingType",
      label: "Тип кровельного материала",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Металлочерепица" },
        { value: 1, label: "Мягкая черепица (битумная)" },
        { value: 2, label: "Профнастил" },
        { value: 3, label: "Ондулин" },
        { value: 4, label: "Шифер" },
        { value: 5, label: "Керамическая черепица" },
      ],
    },
    {
      key: "area",
      label: "Площадь кровли (в плане)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 80,
      hint: "Площадь горизонтальной проекции крыши",
    },
    {
      key: "slope",
      label: "Уклон крыши",
      type: "slider",
      unit: "°",
      min: 5,
      max: 60,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "ridgeLength",
      label: "Длина конька",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "sheetWidth",
      label: "Ширина листа (полезная)",
      type: "slider",
      unit: "м",
      min: 0.8,
      max: 1.5,
      step: 0.01,
      defaultValue: 1.18,
      hint: "Для металлочерепицы стандарт 1.18 м, полезная ширина ~1.10 м",
    },
    {
      key: "sheetLength",
      label: "Длина листа",
      type: "slider",
      unit: "м",
      min: 1,
      max: 8,
      step: 0.5,
      defaultValue: 2.5,
    },
    {
      key: "complexity",
      label: "Сложность крыши",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простая (1-2 ската)" },
        { value: 1, label: "Средняя (вальмовая, многощипцовая)" },
        { value: 2, label: "Сложная (эркеры, башенки, много ендов)" },
      ],
    },
    ...(roofingManufacturerField ? [roofingManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = roofingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalRoofing(spec, inputs, factorTable);

    const manufacturer = getManufacturerByIndex("roofing", inputs.manufacturer);
    const materials = manufacturer
      ? canonical.materials.map((m) =>
          m.category === "Основное" || /металлочереп|черепиц|профнастил|профлист|ондулин|кровл|мягкая/i.test(m.name)
            ? { ...m, name: `${m.name} — ${manufacturer.name}` }
            : m
        )
      : canonical.materials;

    return {
      materials,
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
**Расчёт кровли (практика РФ):**

1. **Геометрия**: Площадь скатов = Площадь дома / cos(угла).
2. **Запас на подрезку**: 
   - Двускатная: 5%
   - Вальмовая: 15%
   - Сложная: до 25-30% (много треугольных обрезков).
3. **Пирог**: Обязательно учитывается контрбрус (вентзазор) и супердиффузионная мембрана.
4. **Доборка**: Конёк и планки считаются с нахлёстом 10-15 см на каждый элемент.
  `,
  howToUse: [
    "Укажите площадь дома по фундаменту (в плане)",
    "Задайте угол наклона крыши (стандарт 30-45°)",
    "Выберите тип материала и сложность формы крыши",
    "Нажмите «Рассчитать» — вы получите список от листов до саморезов",
  ],
  expertTips: [
    {
      title: "Конденсат и вентзазор",
      content: "Никогда не экономьте на контрбрусе (брусок 50х50 поверх пленки). Без него влага будет скапливаться на обрешетке, что приведет к гниению дерева за 3-5 лет.",
      author: "Кровельщик со стажем"
    },
    {
      title: "Длина листа",
      content: "Не заказывайте листы металлочерепицы длиннее 4.5 метров. Их крайне сложно поднимать без деформации, и температурное расширение может «порвать» саморезы.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Нужны ли снегозадержатели?",
      answer:
        "Для скатов с металлом и гладким покрытием — да, над зонами ходьбы, парковки и входов: снижают риск схода снега лавиной на людей и водосток. На длинных скатах делают несколько рядов по проекту.",
    },
    {
      question: "Какая мембрана лучше?",
      answer:
        "Под утеплённую кровлю обычно берут супердиффузионную мембрану по паспорту кровельной системы: паропроницаемость, UV при открытом монтаже, прочность и проклейка нахлёстов. Весь пирог — по СП 17 и инструкции производителя.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта кровельных материалов</h2>
<p>Реальная площадь скатов определяется с учётом угла наклона крыши:</p>
<p><strong>S<sub>скатов</sub> = S<sub>плана</sub> / cos(&alpha;)</strong></p>
<ul>
  <li><strong>S<sub>плана</sub></strong> — площадь горизонтальной проекции крыши (м&sup2;)</li>
  <li><strong>&alpha;</strong> — угол наклона крыши (градусы)</li>
</ul>
<p>Количество листов кровельного материала:</p>
<p><strong>N = &lceil;S<sub>скатов</sub> &times; K<sub>запас</sub> / S<sub>листа</sub>&rceil;</strong></p>

<h2>Коэффициенты запаса по сложности крыши</h2>
<table>
  <thead>
    <tr><th>Сложность крыши</th><th>Запас на подрезку</th><th>Пример</th></tr>
  </thead>
  <tbody>
    <tr><td>Простая (1–2 ската)</td><td>5%</td><td>Двускатная, односкатная</td></tr>
    <tr><td>Средняя (вальмовая)</td><td>15%</td><td>Четырёхскатная, многощипцовая</td></tr>
    <tr><td>Сложная (эркеры, башни)</td><td>25–30%</td><td>С ендовами, слуховыми окнами</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Проектирование и устройство кровель регламентируется <strong>СП 17.13330.2017</strong> «Кровли» (актуализированная редакция СНиП II-26-76). Стандарт определяет минимальные уклоны для каждого типа покрытия, конструкцию кровельного пирога, требования к вентиляции подкровельного пространства и водоотводу.</p>

<h2>Минимальные уклоны по типу материала</h2>
<ul>
  <li><strong>Металлочерепица</strong> — от 14&deg; (1:4)</li>
  <li><strong>Профнастил</strong> — от 8&deg; (1:7)</li>
  <li><strong>Гибкая черепица</strong> — от 12&deg; (1:5)</li>
  <li><strong>Ондулин</strong> — от 6&deg; (1:10)</li>
  <li><strong>Керамическая черепица</strong> — от 22&deg; (1:2.5)</li>
</ul>
<p>При уклоне ниже рекомендуемого возрастает риск протечек, задувания снега и застоя воды на стыках листов.</p>
`,
    faq: [
      {
        question: "Как рассчитать площадь кровли по площади дома?",
        answer: "<p>Площадь скатов кровли рассчитывается из площади горизонтальной проекции и угла наклона:</p><p><strong>S<sub>скатов</sub> = S<sub>дома</sub> / cos(&alpha;)</strong></p><p>Примеры для дома 10&times;8 м (80 м&sup2;):</p><table><thead><tr><th>Угол, &deg;</th><th>cos(&alpha;)</th><th>S скатов, м&sup2;</th></tr></thead><tbody><tr><td>15</td><td>0.966</td><td>83</td></tr><tr><td>30</td><td>0.866</td><td>92</td></tr><tr><td>45</td><td>0.707</td><td>113</td></tr></tbody></table><p>К площади скатов добавляют свесы карнизов (обычно 0.3–0.5 м по периметру), что увеличивает реальную площадь кровли на <strong>10–15%</strong>.</p>",
      },
      {
        question: "Сколько саморезов нужно на 1 м² металлочерепицы?",
        answer: "<p>Норма расхода саморезов для металлочерепицы — <strong>6–8 шт/м&sup2;</strong> (саморезы кровельные 4.8&times;35 мм с EPDM-прокладкой). Схема крепления:</p><ul><li><strong>Нижний ряд</strong> — в каждую волну (через 350 мм)</li><li><strong>Средние ряды</strong> — через волну в шахматном порядке</li><li><strong>У конька и ендовы</strong> — в каждую волну</li></ul><p>Для кровли 100 м&sup2;: 100 &times; 7 = <strong>700 саморезов</strong>. Фасовка: упаковка 250 шт. Потребуется <strong>3 упаковки</strong>.</p>",
      },
      {
        question: "Какой кровельный пирог правильный для утеплённой крыши?",
        answer: "<p>Правильный кровельный пирог для утеплённой скатной крыши (изнутри наружу):</p><ul><li><strong>Пароизоляция</strong> — плёнка с проклейкой стыков</li><li><strong>Утеплитель</strong> — минвата 150–200 мм между стропил</li><li><strong>Супердиффузионная мембрана</strong> — паропроницаемая, влагозащитная</li><li><strong>Контрбрус</strong> — 50&times;50 мм (вентиляционный зазор)</li><li><strong>Обрешётка</strong> — шаг по типу покрытия (350 мм для металлочерепицы)</li><li><strong>Кровельное покрытие</strong></li></ul><p>Контрбрус обязателен — без него влага скапливается на обрешётке и вызывает гниение. Вентзазор должен быть <strong>не менее 40 мм</strong>.</p>",
      },
    ],
  },
};


