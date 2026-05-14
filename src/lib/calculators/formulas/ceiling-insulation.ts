import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalCeilingInsulation } from "../../../../engine/ceiling-insulation";
import ceilinginsulationSpec from "../../../../configs/calculators/ceiling-insulation-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const ceilingInsulationDef: CalculatorDefinition = {
  id: "ceilings_insulation",
  slug: "uteplenie-potolka",
  title: "Калькулятор утепления потолка",
  h1: "Калькулятор утепления потолка — расчёт минваты и ЭППС",
  description: "Рассчитайте количество утеплителя (минеральная вата или ЭППС), пароизоляции и крепежа для утепления потолка.",
  metaTitle: withSiteMetaTitle("Калькулятор утепления потолка | Минвата, ЭППС"),
  metaDescription: "Бесплатный калькулятор утепления потолка: рассчитайте минвату, пенополистирол и пароизоляцию по площади потолка, толщине слоя и типу утепления.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["утепление потолка", "минвата", "ЭППС", "теплоизоляция потолка", "Knauf"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм" },
        { value: 100, label: "100 мм (рекомендуется)" },
        { value: 150, label: "150 мм (усиленное)" },
        { value: 200, label: "200 мм (холодный чердак)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минеральная вата (плиты)" },
        { value: 1, label: "Минеральная вата (рулон)" },
        { value: 2, label: "ЭППС (пенополистирол)" },
        { value: 3, label: "Эковата (насыпная)" },
      ],
    },
    {
      key: "layers",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя (со смещением стыков)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = ceilinginsulationSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalCeilingInsulation(spec, inputs, factorTable);

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
**Расчёт утеплителя для потолка:**
- Минвата плиты (100 мм): ~1 пачка/6 м²
- Минвата рулон (100 мм): ~1 рулон/5 м²
- ЭППС (1200×600 мм): ⌈Площадь × 1.05 / 0.72⌉ плит
- Пароизоляция: площадь × 1.15 (нахлёст 15 см)
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите толщину утеплителя",
    "Выберите тип утеплителя",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Как выбрать толщину утепления потолка?",
      answer:
        "По теплотехнике: что сверху (чердак, жилая часть, кровля), климат и λ утеплителя. Контролируют по СП 50 или проекту; свободную высоту узла нужно суммировать с пароизоляцией и обрешёткой.",
    },
    {
      question: "Нужна ли пароизоляция при утеплении потолка?",
      answer:
        "Для минваты со стороны тёплого помещения — обычно да (цельный слой без зазоров). Иначе пар из комнаты увлажняет материал и снижает теплоизоляцию. Пенополистирол пару почти не пропускает — узел может отличаться.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта утепления потолка</h2>
<p>Расход утеплителя и сопутствующих материалов:</p>
<ul>
  <li><strong>Утеплитель (плиты)</strong> = S &times; N<sub>слоёв</sub> &times; 1.05 / S<sub>плиты</sub></li>
  <li><strong>Утеплитель (рулон)</strong> = S &times; N<sub>слоёв</sub> &times; 1.05 / S<sub>рулона</sub></li>
  <li><strong>ЭППС (плиты 1200&times;600)</strong> = S &times; 1.05 / 0.72 м²</li>
  <li><strong>Пароизоляция</strong> = S &times; 1.15 / S<sub>рулона</sub></li>
  <li><strong>Крепёж (грибки)</strong> = S &times; 5 шт/м² (для ЭППС)</li>
</ul>

<h2>Нормы расхода утеплителя по типу</h2>
<table>
  <thead>
    <tr><th>Тип утеплителя</th><th>Толщина, мм</th><th>Упаковка</th><th>Площадь упаковки</th></tr>
  </thead>
  <tbody>
    <tr><td>Минвата плиты (Knauf, Rockwool)</td><td>50 / 100</td><td>пачка 4–8 плит</td><td>3.0–6.0 м²</td></tr>
    <tr><td>Минвата рулон</td><td>50 / 100</td><td>рулон</td><td>5.0–10.0 м²</td></tr>
    <tr><td>ЭППС (Пеноплэкс, Технониколь)</td><td>30 / 50 / 100</td><td>плита 1200&times;600</td><td>0.72 м²</td></tr>
    <tr><td>Эковата (насыпная)</td><td>150–200</td><td>мешок 15 кг</td><td>~1 м² при 150 мм</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Утепление потолка (верхнего перекрытия) проектируется по <strong>СП 50.13330.2012</strong> «Тепловая защита зданий». Для верхнего перекрытия над холодным чердаком в Москве требуемое сопротивление теплопередаче — <strong>R &ge; 4.7 м²&middot;°C/Вт</strong>, что соответствует ~200 мм минваты (λ = 0.04). Устройство пароизоляции — обязательно со стороны тёплого помещения по <strong>СП 17.13330.2017</strong>.</p>

<h2>Схемы утепления потолка</h2>
<ul>
  <li><strong>Сверху (по чердаку)</strong> — утеплитель укладывается между балками или по плите, самый простой вариант</li>
  <li><strong>Снизу (изнутри помещения)</strong> — каркас + утеплитель + пароизоляция + обшивка ГКЛ</li>
  <li><strong>Комбинированный</strong> — основной слой сверху + дополнительный перекрёстный снизу</li>
</ul>
`,
    faq: [
      {
        question: "Какой утеплитель лучше для потолка: минвата или ЭППС?",
        answer: "<p>Для утепления потолка изнутри помещения чаще используют <strong>минеральную вату</strong>, а для утепления по чердачному перекрытию подходят оба варианта:</p><table><thead><tr><th>Параметр</th><th>Минвата</th><th>ЭППС</th></tr></thead><tbody><tr><td>Теплопроводность</td><td>0.035–0.045 Вт/(м&middot;°C)</td><td>0.028–0.034 Вт/(м&middot;°C)</td></tr><tr><td>Паропроницаемость</td><td>Высокая (пропускает пар)</td><td>Низкая (пароизолятор)</td></tr><tr><td>Горючесть</td><td>НГ (негорючая)</td><td>Г1–Г4</td></tr><tr><td>Применение</td><td>Между балками, в каркасе</td><td>По плите перекрытия</td></tr></tbody></table><p>Минвата безопаснее и лучше работает в деревянных перекрытиях. ЭППС эффективнее по толщине, но требует отдельной пароизоляции или используется там, где паропроницаемость не критична.</p>",
      },
      {
        question: "Сколько утеплителя нужно на потолок 30 м²?",
        answer: "<p>Для потолка 30 м² с утеплением <strong>100 мм минватой в 2 слоя со смещением</strong>:</p><ul><li><strong>Минвата</strong> = 30 &times; 2 &times; 1.05 / 0.6 = <strong>105 плит</strong> (600&times;1000 мм) &asymp; 21 пачка по 5 шт.</li><li><strong>Пароизоляция</strong> = 30 &times; 1.15 = 34.5 м² &asymp; <strong>1 рулон</strong> (75 м²)</li><li><strong>Скотч для пароизоляции</strong> = периметр + все стыки &asymp; <strong>2–3 рулона</strong></li></ul><p>Два слоя со смещением стыков эффективнее одного слоя той же толщины, так как перекрывают мостики холода на стыках плит.</p>",
      },
      {
        question: "Обязательна ли пароизоляция при утеплении потолка снизу?",
        answer: "<p><strong>Да, обязательна.</strong> При утеплении потолка изнутри (снизу) пароизоляция устанавливается между утеплителем и помещением. Без неё тёплый влажный воздух проникает в утеплитель и конденсируется внутри.</p><ul><li><strong>Изоспан Б</strong> — стандартная пароизоляция, расход = площадь &times; 1.15</li><li><strong>Изоспан С</strong> — армированная, для повышенной влажности</li><li><strong>Проклейка стыков</strong> — нахлёст 150 мм, бутилкаучуковый скотч</li></ul><p>Критически важно: пароизоляция должна быть <strong>непрерывной</strong>. Каждый незаклеенный стык, прокол или разрыв — это путь для влаги в утеплитель, который за 1–2 сезона приводит к намоканию и потере теплоизоляционных свойств.</p>",
      },
    ],
  },
};


