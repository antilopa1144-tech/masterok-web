import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalHeating } from "../../../../engine/heating";
import heatingSpec from "../../../../configs/calculators/heating-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const heatingDef: CalculatorDefinition = {
  id: "engineering_heating",
  slug: "otoplenie-radiatory",
  title: "Калькулятор отопления и радиаторов",
  h1: "Калькулятор отопления — расчёт радиаторов и труб",
  description: "Рассчитайте мощность отопления, количество секций радиаторов и длину труб для дома или квартиры по площади и климатическому региону.",
  metaTitle: withSiteMetaTitle("Калькулятор отопления | Радиаторы, трубы"),
  metaDescription: "Бесплатный калькулятор отопления: рассчитайте тепловую мощность, секции радиаторов и длину труб для квартиры или дома по площади и климату.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["отопление", "радиаторы", "расчёт отопления", "биметаллический радиатор", "трубы отопления"],
  popularity: 75,
  complexity: 2,
  fields: [
    {
      key: "totalArea",
      label: "Общая площадь отапливаемых помещений",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 80,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "select",
      defaultValue: 270,
      options: [
        { value: 250, label: "2.5 м (стандарт)" },
        { value: 270, label: "2.7 м" },
        { value: 300, label: "3.0 м (высокие потолки)" },
        { value: 350, label: "3.5 м" },
      ],
    },
    {
      key: "climateZone",
      label: "Климатический регион",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Южные регионы (Краснодар, Ростов, -15°C)" },
        { value: 1, label: "Центральная Россия (Москва, -25°C)" },
        { value: 2, label: "Урал, Сибирь (Новосибирск, -35°C)" },
        { value: 3, label: "Крайний север (Якутия, -45°C)" },
      ],
    },
    {
      key: "buildingType",
      label: "Тип здания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Квартира (угловая/последний этаж)" },
        { value: 1, label: "Квартира (средний этаж)" },
        { value: 2, label: "Частный дом (хорошее утепление)" },
        { value: 3, label: "Частный дом (слабое утепление)" },
      ],
    },
    {
      key: "radiatorType",
      label: "Тип радиатора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Биметаллический (180 Вт/секция)" },
        { value: 1, label: "Алюминиевый (200 Вт/секция)" },
        { value: 2, label: "Чугунный 7-секционный (700 Вт/радиатор)" },
        { value: 3, label: "Панельный стальной Тип 22 (700 Вт/1200 мм)" },
      ],
    },
    {
      key: "roomCount",
      label: "Количество помещений",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
    },
  ],
  calculate(inputs) {
    const spec = heatingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalHeating(spec, inputs, factorTable);

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
**Расчёт мощности отопления:**
- Базовая: 80–150 Вт/м² в зависимости от региона
- Поправки: тип здания (×1.0–1.4), высота потолков
- Секций радиатора = Мощность / 180 Вт (биметалл)
  `,
  howToUse: [
    "Введите площадь и высоту потолков",
    "Выберите климатический регион и тип здания",
    "Выберите тип радиатора и количество помещений",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Сколько ватт на квадратный метр брать для отопления?",
      answer:
        "Грубый ориентир — 80–150 Вт/м², но итог зависит от климата, высоты потолка, утепления и остекления. Угловые комнаты, санузлы и большие окна обычно требуют большего запаса, поэтому точнее считать по теплопотерям/коэффициентам, а не «по площади».",
    },
    {
      question: "Как рассчитать количество секций радиатора?",
      answer:
        "Сначала оценивают нужную мощность комнаты, потом делят на паспортную теплоотдачу 1 секции (с учётом режима системы) и округляют вверх. Ориентир «180 Вт/секция» бывает у биметалла, но надёжнее брать данные конкретной модели и помнить про углы/окна.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта мощности отопления</h2>
<p>Требуемая тепловая мощность определяется по площади и поправочным коэффициентам:</p>
<p><strong>Q = S &times; q &times; K<sub>здания</sub> &times; K<sub>потолков</sub></strong></p>
<ul>
  <li><strong>Q</strong> — требуемая мощность (Вт)</li>
  <li><strong>S</strong> — площадь отапливаемых помещений (м&sup2;)</li>
  <li><strong>q</strong> — удельная мощность по климатическому региону (Вт/м&sup2;)</li>
  <li><strong>K<sub>здания</sub></strong> — коэффициент типа здания (1.0–1.4)</li>
  <li><strong>K<sub>потолков</sub></strong> — поправка на высоту потолков (&gt; 2.7 м)</li>
</ul>

<h2>Удельная мощность по регионам</h2>
<table>
  <thead>
    <tr><th>Регион</th><th>Расчётная t, &deg;C</th><th>q, Вт/м&sup2;</th></tr>
  </thead>
  <tbody>
    <tr><td>Юг (Краснодар, Ростов)</td><td>&minus;15</td><td>80–100</td></tr>
    <tr><td>Центр (Москва, Воронеж)</td><td>&minus;25</td><td>100–120</td></tr>
    <tr><td>Урал, Сибирь (Новосибирск)</td><td>&minus;35</td><td>120–140</td></tr>
    <tr><td>Крайний север (Якутск)</td><td>&minus;45</td><td>140–200</td></tr>
  </tbody>
</table>
<p>Количество секций радиатора: <strong>N<sub>секций</sub> = &lceil;Q<sub>комнаты</sub> / P<sub>секции</sub>&rceil;</strong>, где P — теплоотдача одной секции (обычно 150–200 Вт для биметаллических).</p>

<h2>Нормативная база</h2>
<p>Проектирование систем отопления выполняется по <strong>СП 60.13330.2020</strong> «Отопление, вентиляция и кондиционирование воздуха» (актуализированная редакция СНиП 41-01-2003) и <strong>СП 50.13330.2012</strong> «Тепловая защита зданий». Стандарты определяют расчётные температуры, тепловые нагрузки и требования к размещению отопительных приборов.</p>

<h2>Поправочные коэффициенты</h2>
<ul>
  <li><strong>Угловая квартира / последний этаж</strong> — K = 1.2–1.3</li>
  <li><strong>Частный дом (хорошее утепление)</strong> — K = 1.1</li>
  <li><strong>Частный дом (слабое утепление)</strong> — K = 1.3–1.4</li>
  <li><strong>Высота потолков &gt; 2.7 м</strong> — K = H / 2.7</li>
  <li><strong>Панорамные окна</strong> — добавить 10–15% к мощности комнаты</li>
</ul>
`,
    faq: [
      {
        question: "Сколько секций радиатора нужно на комнату 20 м²?",
        answer: "<p>Для комнаты 20 м&sup2; в центральной России (q = 100 Вт/м&sup2;), квартира на среднем этаже:</p><p>Q = 20 &times; 100 = <strong>2000 Вт</strong></p><p>Количество секций биметаллического радиатора (180 Вт/секция):</p><p>N = &lceil;2000 / 180&rceil; = <strong>12 секций</strong></p><p>Для угловой комнаты или последнего этажа: Q = 2000 &times; 1.3 = 2600 Вт &rarr; <strong>15 секций</strong>.</p><p>Радиаторы размещают под каждым окном — тёплый воздух создаёт тепловую завесу и предотвращает запотевание стёкол.</p>",
      },
      {
        question: "Как рассчитать мощность котла для частного дома?",
        answer: "<p>Мощность котла определяется суммарными теплопотерями дома:</p><p><strong>Q<sub>котла</sub> = S &times; q &times; K &times; 1.20</strong></p><p>Пример для дома 120 м&sup2; в Подмосковье (хорошее утепление):</p><ul><li>Q = 120 &times; 110 &times; 1.1 &times; 1.20 = <strong>17 424 Вт &asymp; 18 кВт</strong></li></ul><p>Коэффициент 1.20 — запас на горячее водоснабжение (бойлер косвенного нагрева). Ближайший стандартный котёл: <strong>24 кВт</strong>.</p><p>Для дома с плохим утеплением тот же расчёт даст 25–30 кВт.</p>",
      },
      {
        question: "Какие трубы выбрать для отопления частного дома?",
        answer: "<p>Основные варианты труб для систем отопления:</p><table><thead><tr><th>Тип трубы</th><th>Макс. t, &deg;C</th><th>Давление, бар</th><th>Применение</th></tr></thead><tbody><tr><td>Полипропилен (PP-R, армир.)</td><td>70–95</td><td>10–25</td><td>Квартиры, дома с газовым котлом</td></tr><tr><td>Сшитый полиэтилен (PEX)</td><td>90–110</td><td>10</td><td>Тёплый пол, коллекторная разводка</td></tr><tr><td>Металлопластик (PEX-AL-PEX)</td><td>95</td><td>10</td><td>Универсальная</td></tr><tr><td>Медь</td><td>250+</td><td>40+</td><td>Премиум-системы, пар</td></tr></tbody></table><p>Для частного дома оптимален <strong>армированный полипропилен</strong> (PPR-AL или PPR-FB): надёжный, недорогой, срок службы 50+ лет.</p>",
      },
    ],
  },
};


