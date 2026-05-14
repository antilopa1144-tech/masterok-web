import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalTerrace } from "../../../../engine/terrace";
import terraceSpec from "../../../../configs/calculators/terrace-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const terraceDef: CalculatorDefinition = {
  id: "terrace",
  slug: "kalkulyator-terrasnoy-doski",
  title: "Калькулятор террасной доски",
  h1: "Калькулятор террасной доски — расчёт декинга и материалов",
  description: "Рассчитайте количество террасной доски (декинга), лаг, крепежа и пропитки для террасы, веранды или дорожки.",
  metaTitle: withSiteMetaTitle("Калькулятор террасной доски | Декинг"),
  metaDescription: "Бесплатный калькулятор террасной доски: рассчитайте декинг, лаги, кляймеры и пропитку для террасы, веранды или садовой площадки по площади покрытия.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["террасная доска", "декинг", "терраса", "веранда", "лаги"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина террасы",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "width",
      label: "Ширина террасы",
      type: "slider",
      unit: "м",
      min: 1,
      max: 15,
      step: 0.5,
      defaultValue: 3,
    },
    {
      key: "boardType",
      label: "Тип доски",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Террасная доска (ДПК) 150×25 мм" },
        { value: 1, label: "Террасная доска лиственница 120×28 мм" },
        { value: 2, label: "Террасная доска сосна 90×28 мм" },
        { value: 3, label: "Планкен 120×20 мм (без зазора)" },
      ],
    },
    {
      key: "boardLength",
      label: "Длина доски",
      type: "select",
      defaultValue: 3000,
      options: [
        { value: 2000, label: "2000 мм" },
        { value: 3000, label: "3000 мм" },
        { value: 4000, label: "4000 мм" },
        { value: 6000, label: "6000 мм" },
      ],
    },
    {
      key: "lagStep",
      label: "Шаг лаг",
      type: "select",
      defaultValue: 400,
      options: [
        { value: 300, label: "300 мм (нагруженные террасы)" },
        { value: 400, label: "400 мм (стандарт)" },
        { value: 500, label: "500 мм (лёгкие конструкции)" },
        { value: 600, label: "600 мм (ДПК усиленный)" },
      ],
    },
    {
      key: "withTreatment",
      label: "Пропитка / масло (для дерева)",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Не требуется (ДПК)" },
        { value: 1, label: "Масло для террасной доски" },
        { value: 2, label: "Антисептик + масло (2 слоя)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = terraceSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalTerrace(spec, inputs, factorTable);

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
**Расчёт террасной доски:**
- Рядов досок = Ширина / (Ширина доски + Зазор)
- Досок в ряду = Длина / Длина доски
- Лаг = (Длина / Шаг лаг + 1) × Ширина / 3 м
- Запас: доски +10%, лаги +5%
  `,
  howToUse: [
    "Введите размеры террасы",
    "Выберите тип и длину доски",
    "Укажите шаг лаг",
    "Нажмите «Рассчитать»",
  ],
  faq: [
    {
      question: "Какой запас закладывать на террасную доску?",
      answer:
        "Обычно закладывают запас на подрезку и стыки: чем сложнее контур, больше диагоналей, ступеней и примыканий — тем выше запас. Если добирать материал потом неудобно (партия/тон), лучше взять с небольшим резервом сразу.",
    },
    {
      question: "Как выбрать шаг лаг для террасы?",
      answer:
        "По паспорту системы и толщине доски. Для ДПК шаг лаг, как правило, меньше, чем для массивной доски; на кромках, у ступеней и в местах повышенной нагрузки лаги часто ставят плотнее, чтобы настил не «пружинил».",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формулы расчёта террасной доски</h2>
<p>Основные формулы для расчёта декинга и подконструкции:</p>
<ul>
  <li><strong>Рядов досок</strong> = Ширина террасы / (Ширина доски + Зазор)</li>
  <li><strong>Досок в ряду</strong> = Длина террасы / Длина доски (с округлением вверх)</li>
  <li><strong>Всего досок</strong> = Рядов &times; Досок в ряду &times; 1.10 (запас 10%)</li>
  <li><strong>Лаг</strong> = (Длина / Шаг лаг + 1) &times; Ширина террасы / Длина лаги</li>
  <li><strong>Кляймеры</strong> = Рядов &times; (Длина / Шаг лаг + 1)</li>
</ul>

<h2>Типоразмеры террасной доски</h2>
<table>
  <thead>
    <tr><th>Тип доски</th><th>Сечение, мм</th><th>Длина, мм</th><th>Зазор, мм</th></tr>
  </thead>
  <tbody>
    <tr><td>ДПК (композит)</td><td>150&times;25</td><td>2000–4000</td><td>3–5</td></tr>
    <tr><td>Лиственница</td><td>120&times;28</td><td>2000–6000</td><td>5–8</td></tr>
    <tr><td>Сосна (импрегнированная)</td><td>90&times;28</td><td>2000–6000</td><td>5–8</td></tr>
    <tr><td>Планкен</td><td>120&times;20</td><td>2000–4000</td><td>0 (бесшовный)</td></tr>
  </tbody>
</table>

<h2>Нормы шага лаг</h2>
<table>
  <thead>
    <tr><th>Тип покрытия</th><th>Шаг лаг, мм</th><th>Сечение лаги</th></tr>
  </thead>
  <tbody>
    <tr><td>ДПК стандартный</td><td>400</td><td>40&times;60 алюм. или 50&times;50 ДПК</td></tr>
    <tr><td>ДПК усиленный</td><td>300–400</td><td>50&times;70 алюм.</td></tr>
    <tr><td>Дерево 28 мм</td><td>400–500</td><td>Брус 50&times;70</td></tr>
    <tr><td>Нагруженные террасы</td><td>300</td><td>Брус 50&times;100</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Террасное покрытие из древесины обрабатывается защитными составами по <strong>ГОСТ 20022.6-93</strong> «Защита древесины». Расход масла для террасной доски — <strong>80–120 мл/м²</strong> за один слой (обычно 2 слоя). Конструкция террасы должна обеспечивать уклон для стока воды <strong>1–2%</strong> от здания.</p>
`,
    faq: [
      {
        question: "Сколько террасной доски нужно на площадку 5×3 м?",
        answer: "<p>Для террасы 5&times;3 м с доской ДПК 150&times;25&times;3000 мм:</p><p><strong>Рядов</strong> = 3000 / (150 + 5) = <strong>19 рядов</strong></p><p><strong>Досок</strong> = 19 &times; (5000 / 3000) &times; 1.10 = 19 &times; 2 &times; 1.10 &asymp; <strong>42 доски</strong></p><ul><li><strong>Лаги (шаг 400 мм)</strong> = (5000 / 400 + 1) = 14 линий &times; 3 м = <strong>42 п.м.</strong></li><li><strong>Кляймеры</strong> = 19 &times; 14 = <strong>~266 шт.</strong></li><li><strong>Масло (2 слоя)</strong> = 15 м² &times; 0.1 л &times; 2 = <strong>3 л</strong></li></ul><p>При длине доски 4000 мм расход уменьшается за счёт меньшего числа стыков.</p>",
      },
      {
        question: "Что лучше: террасная доска ДПК или лиственница?",
        answer: "<p>Выбор зависит от приоритетов по обслуживанию, бюджету и внешнему виду:</p><table><thead><tr><th>Параметр</th><th>ДПК (композит)</th><th>Лиственница</th></tr></thead><tbody><tr><td>Срок службы</td><td>15–25 лет</td><td>10–20 лет (с обработкой)</td></tr><tr><td>Уход</td><td>Минимальный (мойка)</td><td>Масло 1–2 раза в год</td></tr><tr><td>Цена за м²</td><td>1500–3500 руб.</td><td>1200–2500 руб.</td></tr><tr><td>Внешний вид</td><td>Однородный, фабричный</td><td>Натуральная текстура</td></tr></tbody></table><p>ДПК не гниёт, не требует покраски и не трескается, но нагревается на солнце сильнее натурального дерева. Лиственница красивее, но требует регулярной обработки маслом.</p>",
      },
      {
        question: "Какой уклон нужен для террасы?",
        answer: "<p>Для отвода дождевой воды терраса должна иметь уклон <strong>1–2%</strong> от стены здания. Это означает:</p><ul><li><strong>1%</strong> = перепад 1 см на 1 м длины</li><li><strong>2%</strong> = перепад 2 см на 1 м длины</li></ul><p>Для террасы шириной 3 м при уклоне 1.5% перепад составит <strong>4.5 см</strong>. Уклон формируется при установке лаг — дальняя от стены лага устанавливается ниже ближней на расчётную величину перепада. Недостаточный уклон приводит к застою воды на поверхности и ускоренному износу покрытия.</p>",
      },
    ],
  },
};


