import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalStairs } from "../../../../engine/stairs";
import stairsSpec from "../../../../configs/calculators/stairs-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const stairsDef: CalculatorDefinition = {
  id: "stairs",
  slug: "kalkulyator-lestnicy",
  title: "Калькулятор лестницы",
  h1: "Калькулятор лестницы онлайн — расчёт ступеней и материалов",
  description: "Рассчитайте количество ступеней, длину пролёта и материалы для деревянной, бетонной или металлической лестницы.",
  metaTitle: withSiteMetaTitle("Калькулятор лестницы | Расчёт ступеней, материалов"),
  metaDescription: "Бесплатный калькулятор лестницы: рассчитайте количество ступеней, косоуры, перила и основные материалы по высоте этажа и ширине пролёта.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["лестница", "ступени", "косоур", "расчёт лестницы", "деревянная лестница"],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "floorHeight",
      label: "Высота этажа (подъём лестницы)",
      type: "slider",
      unit: "м",
      min: 2.0,
      max: 6.0,
      step: 0.1,
      defaultValue: 2.8,
    },
    {
      key: "stepHeight",
      label: "Высота ступени",
      type: "select",
      defaultValue: 170,
      options: [
        { value: 150, label: "150 мм (пологая, удобная)" },
        { value: 170, label: "170 мм (стандарт жилой)" },
        { value: 180, label: "180 мм" },
        { value: 200, label: "200 мм (крутая)" },
      ],
    },
    {
      key: "stepWidth",
      label: "Ширина ступени (проступь)",
      type: "select",
      defaultValue: 280,
      options: [
        { value: 250, label: "250 мм" },
        { value: 280, label: "280 мм (стандарт)" },
        { value: 300, label: "300 мм (комфорт)" },
        { value: 320, label: "320 мм (широкая)" },
      ],
    },
    {
      key: "stairWidth",
      label: "Ширина лестницы",
      type: "slider",
      unit: "м",
      min: 0.6,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
    },
    {
      key: "materialType",
      label: "Материал",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Дерево (сосна/лиственница)" },
        { value: 1, label: "Бетонная монолитная" },
        { value: 2, label: "Металлический каркас + дерево" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = stairsSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalStairs(spec, inputs, factorTable);

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
**Расчёт лестницы:**
- Ступеней = округление(Высота / Высота ступени)
- Горизонтальный пролёт = Ступеней × Ширину проступи
- Длина косоура = √(H² + L²)
- Нормы ГОСТ 23120: ступень 150–200 мм, проступь ≥250 мм
  `,
  howToUse: [
    "Введите высоту этажа",
    "Выберите высоту ступени и ширину проступи",
    "Укажите ширину лестницы и материал",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Какая высота ступени считается удобной?",
      answer:
        "Ориентир для жилья — примерно 150–180 мм. Но удобство определяется связкой размеров (высота + проступь) и уклоном марша, поэтому проверяйте по формуле Блонделя \(2h + b = 600–640 мм\), особенно если лестница «на каждый день».",
    },
    {
      question: "Как выбрать ширину проступи?",
      answer:
        "Частый минимум — от 250 мм, комфортнее 270–300 мм. Подбирайте вместе с высотой ступени и уклоном (по Блонделю), иначе марш получится крутым и неудобным даже при «красивых» цифрах по отдельности.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формулы расчёта лестницы</h2>
<p>Основные формулы для расчёта параметров прямой маршевой лестницы:</p>
<ul>
  <li><strong>Количество ступеней</strong> = H / h (округление)</li>
  <li><strong>Горизонтальная проекция (длина пролёта)</strong> = n &times; b</li>
  <li><strong>Длина косоура</strong> = &radic;(H² + L²)</li>
  <li><strong>Формула удобства</strong>: 2h + b = 600–640 мм (формула Блонделя)</li>
</ul>
<p>Где: <strong>H</strong> — высота этажа, <strong>h</strong> — высота ступени, <strong>b</strong> — ширина проступи, <strong>n</strong> — число ступеней, <strong>L</strong> — длина пролёта.</p>

<h2>Нормы размеров ступеней</h2>
<table>
  <thead>
    <tr><th>Параметр</th><th>ГОСТ 23120-2016</th><th>Рекомендация для жилья</th></tr>
  </thead>
  <tbody>
    <tr><td>Высота ступени (h)</td><td>150–200 мм</td><td>165–180 мм</td></tr>
    <tr><td>Ширина проступи (b)</td><td>&ge; 250 мм</td><td>270–300 мм</td></tr>
    <tr><td>Ширина марша</td><td>&ge; 900 мм</td><td>1000–1200 мм</td></tr>
    <tr><td>Высота перил</td><td>&ge; 900 мм</td><td>900–1100 мм</td></tr>
    <tr><td>Угол подъёма</td><td>20°–50°</td><td>30°–37° (оптимально)</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Размеры лестниц регламентируются <strong>ГОСТ 23120-2016</strong> «Лестницы маршевые, площадки и ограждения стальные» и <strong>СП 1.13130.2020</strong> «Эвакуационные пути и выходы». Для жилых домов уклон лестничных маршей — не более <strong>1:1.25</strong> (угол ~38°). Формула Блонделя (<strong>2h + b = 600–640 мм</strong>) используется для проверки удобства шага.</p>

<h2>Материалы для лестниц</h2>
<ul>
  <li><strong>Дерево (сосна/лиственница)</strong> — ступени 40 мм, косоуры 50&times;300 мм, перила &empty; 50 мм</li>
  <li><strong>Бетон (монолит)</strong> — арматура d12, бетон B25, опалубка</li>
  <li><strong>Металлокаркас + дерево</strong> — швеллер/профильная труба + деревянные ступени и перила</li>
</ul>
`,
    faq: [
      {
        question: "Как рассчитать количество ступеней на высоту 2.8 м?",
        answer: "<p>При высоте этажа <strong>2800 мм</strong> и высоте ступени <strong>170 мм</strong>:</p><p><strong>n = 2800 / 170 = 16.5 &rarr; 17 ступеней</strong> (фактическая высота = 2800 / 17 = <strong>164.7 мм</strong>)</p><p>Проверка по формуле Блонделя: 2 &times; 165 + 280 = <strong>610 мм</strong> (в пределах нормы 600–640 мм).</p><ul><li><strong>Длина пролёта</strong> = 16 &times; 280 = <strong>4480 мм</strong> (17 подъёмов, 16 проступей)</li><li><strong>Длина косоура</strong> = &radic;(2800² + 4480²) = <strong>~5283 мм</strong></li></ul><p>Если пространство ограничено, используют Г-образную или П-образную лестницу с площадкой.</p>",
      },
      {
        question: "Какой угол наклона лестницы считается удобным?",
        answer: "<p>Оптимальный угол наклона жилой лестницы — <strong>30°–37°</strong>. При этом формула удобства (Блонделя) должна выполняться:</p><table><thead><tr><th>Угол, °</th><th>Высота ступени, мм</th><th>Проступь, мм</th><th>Оценка</th></tr></thead><tbody><tr><td>25–30</td><td>150–160</td><td>300–320</td><td>Пологая, удобная, длинная</td></tr><tr><td>30–37</td><td>165–180</td><td>270–300</td><td>Оптимальная для жилья</td></tr><tr><td>37–45</td><td>180–200</td><td>250–270</td><td>Крутая, компактная</td></tr></tbody></table><p>По <strong>ГОСТ 23120-2016</strong> допускается уклон до 1:1 (45°), но для ежедневного использования в жилом доме лучше не превышать 37°, особенно если лестницей пользуются дети и пожилые.</p>",
      },
      {
        question: "Сколько стоит деревянная лестница на второй этаж?",
        answer: "<p>Ориентировочная стоимость материалов для прямой деревянной лестницы (сосна, 17 ступеней, ширина 1.0 м):</p><ul><li><strong>Ступени</strong> (доска 40 мм, клеёная) — 17 шт. &times; 800–1200 руб. = <strong>13 600–20 400 руб.</strong></li><li><strong>Косоуры</strong> (2 шт., доска 50&times;300&times;5300 мм) — <strong>4000–6000 руб.</strong></li><li><strong>Перила + балясины</strong> (комплект) — <strong>8000–15 000 руб.</strong></li><li><strong>Крепёж, клей, лак</strong> — <strong>3000–5000 руб.</strong></li></ul><p><strong>Итого материалы</strong>: 28 600–46 400 руб. Лиственница обойдётся на 40–60% дороже сосны. Металлокаркас с деревянными ступенями — от 50 000 руб. за материалы.</p>",
      },
    ],
  },
};

