import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFacadePanels } from "../../../../engine/facade-panels";
import facadepanelsSpec from "../../../../configs/calculators/facade-panels-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const facadePanelsDef: CalculatorDefinition = {
  id: "exterior_facade_panels",
  slug: "fasadnye-paneli",
  title: "Калькулятор фасадных панелей",
  h1: "Калькулятор фасадных панелей — расчёт обшивки фасада",
  description: "Рассчитайте количество фасадных панелей (фиброцемент, металл, HPL), подсистемы и крепежа для вентилируемого фасада.",
  metaTitle: withSiteMetaTitle("Калькулятор фасадных панелей | Вентфасад"),
  metaDescription: "Бесплатный калькулятор фасадных панелей: рассчитайте фиброцементные, металлические или HPL панели, подсистему и крепёж для вентилируемого фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["фасадные панели", "вентфасад", "фиброцемент", "металлокассеты", "HPL панели"],
  popularity: 55,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь фасада (без проёмов)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 2000,
      step: 5,
      defaultValue: 120,
    },
    {
      key: "panelType",
      label: "Тип панелей",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Фиброцементные (1200×3000 мм)" },
        { value: 1, label: "Металлокассеты (600×1200 мм)" },
        { value: 2, label: "HPL компакт (1200×2440 мм)" },
        { value: 3, label: "Сайдинг металлический (0.23 м²/полоса)" },
      ],
    },
    {
      key: "substructureType",
      label: "Подсистема (несущий каркас)",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Алюминиевый профиль (стандарт)" },
        { value: 1, label: "Оцинкованная сталь (бюджетная)" },
        { value: 2, label: "Деревянная обрешётка 50×50 мм" },
      ],
    },
    {
      key: "insulationIncluded",
      label: "Утеплитель в составе",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без утеплителя" },
        { value: 1, label: "Минвата 50 мм" },
        { value: 2, label: "Минвата 100 мм" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = facadepanelsSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFacadePanels(spec, inputs, factorTable);

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
**Расчёт фасадных панелей:**
- Панели: площадь × 1.10 / площадь одной панели
- Кронштейны: ~4 шт/м² (шаг 600×600 мм)
- Направляющие: площадь / 0.6 м.п. (шаг 600 мм)
  `,
  howToUse: [
    "Введите площадь фасада",
    "Выберите тип панелей и подсистемы",
    "Укажите наличие утеплителя",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Нужна ли подсистема под фасадные панели?",
      answer:
        "Чаще всего да: подсистема/обрешётка выравнивает плоскость, создаёт вентзазор и задаёт шаг крепления. Тип подсистемы зависит от панелей, основания и утепления — без неё фасад легко «волной» и с проблемами по узлам.",
    },
    {
      question: "Стоит ли сразу учитывать утеплитель в расчёте фасада?",
      answer:
        "Да, если планируется тёплый навесной фасад. Утеплитель влияет на вынос подсистемы, длину крепежа и узлы примыканий — считать «панели отдельно» почти всегда приводит к пересборке спецификации.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта фасадных панелей</h2>
<p>Количество панелей для вентилируемого фасада:</p>
<p><strong>N = &lceil;S &times; K<sub>запас</sub> / S<sub>панели</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — площадь фасада за вычетом проёмов (м&sup2;)</li>
  <li><strong>K<sub>запас</sub></strong> — 1.10 (10% на подрезку и отходы)</li>
  <li><strong>S<sub>панели</sub></strong> — полезная площадь одной панели (м&sup2;)</li>
</ul>
<p>Расчёт подсистемы (несущего каркаса):</p>
<p><strong>Кронштейны:</strong> S &times; 4 шт/м&sup2; (шаг 600&times;600 мм)</p>
<p><strong>Направляющие:</strong> S / 0.6 (м.п. вертикальных профилей)</p>

<h2>Площадь стандартных панелей</h2>
<table>
  <thead>
    <tr><th>Тип панели</th><th>Размер, мм</th><th>Площадь, м&sup2;</th></tr>
  </thead>
  <tbody>
    <tr><td>Фиброцементная</td><td>1200&times;3000</td><td>3.60</td></tr>
    <tr><td>Металлокассета</td><td>600&times;1200</td><td>0.72</td></tr>
    <tr><td>HPL компакт</td><td>1200&times;2440</td><td>2.93</td></tr>
    <tr><td>Металлосайдинг</td><td>230&times;3000</td><td>0.69</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Проектирование вентилируемых фасадов выполняется по <strong>СП 50.13330.2012</strong> «Тепловая защита зданий» и <strong>ГОСТ 33079-2014</strong> «Конструкции фасадные навесные вентилируемые». Стандарты определяют требования к несущей подсистеме, вентиляционному зазору (не менее <strong>40 мм</strong>), ветрозащитной мембране и огнестойкости конструкции.</p>

<h2>Состав системы вентфасада</h2>
<ul>
  <li><strong>Кронштейны</strong> — крепятся к стене анкерами через термопрокладку</li>
  <li><strong>Направляющие профили</strong> — вертикальные, шаг 600 мм</li>
  <li><strong>Утеплитель</strong> — минвата между кронштейнами (при необходимости)</li>
  <li><strong>Ветрозащитная мембрана</strong> — поверх утеплителя</li>
  <li><strong>Облицовочные панели</strong> — на кляммерах или заклёпках</li>
</ul>
`,
    faq: [
      {
        question: "Сколько панелей нужно на фасад 120 м²?",
        answer: "<p>Количество зависит от типа панелей (с учётом 10% запаса):</p><ul><li><strong>Фиброцемент 1200&times;3000</strong>: &lceil;120 &times; 1.10 / 3.60&rceil; = <strong>37 панелей</strong></li><li><strong>Металлокассеты 600&times;1200</strong>: &lceil;120 &times; 1.10 / 0.72&rceil; = <strong>184 кассеты</strong></li><li><strong>HPL 1200&times;2440</strong>: &lceil;120 &times; 1.10 / 2.93&rceil; = <strong>46 панелей</strong></li></ul><p>Подсистема: кронштейнов 120 &times; 4 = <strong>480 шт</strong>, направляющих 120 / 0.6 = <strong>200 м.п.</strong></p>",
      },
      {
        question: "Нужен ли вентиляционный зазор за фасадными панелями?",
        answer: "<p>Да, вентиляционный зазор — обязательный элемент навесного вентилируемого фасада. По <strong>ГОСТ 33079-2014</strong> минимальная величина зазора — <strong>40 мм</strong>.</p><p>Функции вентзазора:</p><ul><li>Удаление влаги из утеплителя и стены</li><li>Предотвращение конденсата на внутренней стороне панелей</li><li>Выравнивание температурных нагрузок на облицовку</li></ul><p>Внизу и вверху фасада должны быть <strong>приточные и вытяжные отверстия</strong> для циркуляции воздуха. Без них зазор не работает, а влага накапливается в утеплителе.</p>",
      },
      {
        question: "Какой тип подсистемы выбрать для вентфасада?",
        answer: "<p>Выбор подсистемы зависит от нагрузки и бюджета:</p><table><thead><tr><th>Подсистема</th><th>Нагрузка</th><th>Применение</th></tr></thead><tbody><tr><td>Алюминиевая</td><td>До 50 кг/м&sup2;</td><td>Лёгкие панели, HPL, композит</td></tr><tr><td>Оцинкованная сталь</td><td>До 70 кг/м&sup2;</td><td>Керамогранит, фиброцемент</td></tr><tr><td>Нержавеющая сталь</td><td>До 80 кг/м&sup2;</td><td>Тяжёлый натуральный камень</td></tr><tr><td>Деревянная обрешётка</td><td>До 25 кг/м&sup2;</td><td>Лёгкий сайдинг, имитация бруса</td></tr></tbody></table><p>Для большинства жилых домов оптимальна <strong>оцинкованная сталь</strong> — баланс цены и несущей способности.</p>",
      },
    ],
  },
};




