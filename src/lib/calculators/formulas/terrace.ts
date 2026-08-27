import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalTerrace } from "../../../../engine/terrace";
import terraceSpec from "../../../../configs/calculators/terrace-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const terraceDef: CalculatorDefinition = {
  id: "terrace",
  slug: "kalkulyator-terrasnoy-doski",
  formulaVersion: terraceSpec.formula_version,
  title: "Калькулятор террасной доски",
  h1: "Калькулятор террасной доски — расчёт декинга и материалов",
  description: "Рассчитайте террасную доску, лаги и крепёж по размерам профиля и паспорту системы — с отдельным запасом, раскроем и фасовками.",
  metaTitle: withSiteMetaTitle("Калькулятор террасной доски: материалы онлайн"),
  metaDescription: "Бесплатный калькулятор террасной доски: рассчитайте безопасный или оптимистичный раскрой, лаги, крепёж и фасовки без скрытого двойного запаса.",
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
        { value: 0, label: "Террасная доска из ДПК" },
        { value: 1, label: "Террасная доска из лиственницы" },
        { value: 2, label: "Террасная доска из сосны" },
        { value: 3, label: "Планкен для настила" },
      ],
    },
    {
      key: "boardLength",
      label: "Длина доски",
      type: "number",
      unit: "мм",
      min: 1000,
      max: 12000,
      step: 100,
      defaultValue: 3000,
    },
    { key: "boardWidthMm", label: "Рабочая ширина доски", type: "number", unit: "мм", min: 70, max: 300, step: 1, defaultValue: 150, hint: "Фактическая закрываемая ширина из паспорта профиля" },
    { key: "gapMm", label: "Зазор между досками", type: "number", unit: "мм", min: 0, max: 20, step: 1, defaultValue: 5, hint: "По инструкции производителя и температуре монтажа" },
    { key: "offcutReuseMode", label: "Переиспользовать пригодные обрезки", type: "switch", defaultValue: 0, hint: "Выключено — безопасный расчёт каждого ряда; включайте только после проверки раскладки" },
    { key: "boardReservePercent", label: "Запас доски", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10 },
    {
      key: "lagStep",
      label: "Шаг лаг",
      type: "select",
      defaultValue: 400,
      options: [
        { value: 300, label: "300 мм" },
        { value: 400, label: "400 мм" },
        { value: 500, label: "500 мм" },
        { value: 600, label: "600 мм" },
      ],
      hint: "Перенесите допустимый шаг из паспорта выбранной доски",
    },
    { key: "lagLengthM", label: "Длина лаги", type: "number", unit: "м", min: 1, max: 12, step: 0.5, defaultValue: 3 },
    { key: "lagReservePercent", label: "Запас лаг", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
    { key: "clipsPerIntersection", label: "Клипс на пересечение", type: "number", unit: "шт", min: 0, max: 4, step: 1, defaultValue: 1, hint: "По монтажной схеме выбранной системы" },
    { key: "starterClipsPerRow", label: "Стартовых и финишных клипс на ряд", type: "number", unit: "шт", min: 0, max: 4, step: 1, defaultValue: 2 },
    { key: "clipPackCount", label: "Клипс в упаковке", type: "number", unit: "шт", min: 1, max: 1000, step: 1, integerOnly: true, defaultValue: 100 },
    { key: "fastenersPerClip", label: "Саморезов на клипсу", type: "number", unit: "шт", min: 0, max: 4, step: 1, defaultValue: 1 },
    { key: "fastenerPackCount", label: "Саморезов в упаковке", type: "number", unit: "шт", min: 1, max: 5000, step: 10, integerOnly: true, defaultValue: 100 },
    { key: "fastenerReservePercent", label: "Запас крепежа", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
    {
      key: "withTreatment",
      label: "Пропитка / масло (для дерева)",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без обработки (обычно для ДПК)" },
        { value: 1, label: "Масло для деревянной доски" },
        { value: 2, label: "Антисептик для деревянной доски" },
      ],
    },
    { key: "treatmentRateLPerM2PerLayer", label: "Расход обработки на слой", type: "number", unit: "л/м²", min: 0.01, max: 1, step: 0.01, defaultValue: 0.1, hint: "Перенесите с этикетки выбранного продукта" },
    { key: "treatmentLayers", label: "Слоёв обработки", type: "number", min: 1, max: 4, step: 1, integerOnly: true, defaultValue: 2 },
    { key: "treatmentCanL", label: "Объём банки обработки", type: "number", unit: "л", min: 0.5, max: 20, step: 0.5, defaultValue: 2.5 },
    { key: "treatmentReservePercent", label: "Запас обработки", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10 },
    { key: "withGeotextile", label: "Добавить геотекстиль", type: "switch", defaultValue: 1 },
    { key: "geotextileRollM2", label: "Площадь рулона геотекстиля", type: "number", unit: "м²", min: 5, max: 200, step: 5, defaultValue: 50 },
    { key: "geotextileReservePercent", label: "Запас геотекстиля", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
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
**Как считается терраса:**
- Ряды = округление вверх ((ширина террасы + зазор) / (рабочая ширина доски + зазор))
- Безопасный раскрой = ряды × целые доски на каждый ряд
- Оптимистичный раскрой = общая длина всех рядов / длина доски
- Запас добавляется один раз после раскроя, затем результат округляется до целых досок
- Лаги, клипсы и саморезы считаются по указанному шагу, монтажной схеме и фасовкам
  `,
  howToUse: [
    "Введите размеры террасы",
    "Перенесите рабочую ширину, зазор и длину доски из паспорта профиля",
    "Оставьте безопасный раскрой или включите перенос обрезков после проверки схемы",
    "Укажите паспортный шаг лаг, крепёж и реальные фасовки",
  ],
  faq: [
    {
      question: "Какой запас закладывать на террасную доску?",
      answer:
        "Запас зависит от схемы, геометрии и возможности использовать обрезки. Калькулятор сначала считает раскрой, затем один раз добавляет указанный запас. Для сложного контура увеличьте его вручную и сохраните схему раскладки.",
    },
    {
      question: "Как выбрать шаг лаг для террасы?",
      answer:
        "Возьмите предельный шаг из паспорта выбранной доски и подконструкции. У стыков, кромок, ступеней и мест повышенной нагрузки может понадобиться отдельная схема или дополнительные лаги — калькулятор предупреждает о стыках, но не проектирует несущую конструкцию.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формулы расчёта террасной доски</h2>
<p>Калькулятор разделяет геометрию, раскрой, явный запас и округление до покупки:</p>
<ul>
  <li><strong>Ряды</strong> = округление вверх ((ширина террасы + зазор) / (рабочая ширина доски + зазор)).</li>
  <li><strong>Безопасный раскрой</strong> = ряды &times; округление вверх (длина террасы / длина доски). Каждый ряд начинается целой доской.</li>
  <li><strong>Оптимистичный раскрой</strong> = общая длина всех рядов / длина доски. Он допустим только когда перенос пригодных обрезков подтверждён раскладкой.</li>
  <li><strong>К покупке</strong> = потребность после раскроя &times; (1 + выбранный запас), затем округление вверх до целых досок.</li>
  <li><strong>Лаги и крепёж</strong> считаются по введённому шагу, длине лаг, числу креплений на пересечение и фактическим фасовкам.</li>
</ul>

<h2>Какие данные брать с товара и проекта</h2>
<p>Рабочая ширина профиля, монтажный зазор, предельный шаг лаг, крепёж на пересечение и фасовка зависят от конкретной системы. Перенесите их из паспорта производителя или проектной схемы. Для масла и антисептика укажите расход на слой, число слоёв и объём банки с этикетки. Калькулятор не подменяет проверку основания, дренажа, уклонов и несущей способности.</p>

<h2>Почему два режима раскроя дают разный итог</h2>
<p>Безопасный режим не обещает повторное использование короткого остатка в другом ряду и поэтому подходит для предварительной закупки. Оптимистичный режим объединяет длину рядов и уменьшает отход, но требует реальной схемы стыков, допустимой разбежки и дополнительных опор под соединениями.</p>
`,
    faq: [
      {
        question: "Сколько террасной доски нужно на площадку 5×3 м?",
        answer: "<p>Для террасы 5&times;3 м, рабочей ширины 150 мм, зазора 5 мм и доски длиной 3000 мм получается <strong>20 рядов</strong>. Безопасный раскрой требует 40 досок до запаса и <strong>44 доски</strong> при запасе 10%. Оптимистичный перенос обрезков даёт 33,34 доски до запаса и <strong>37 досок</strong> к покупке, но такую экономию нужно подтвердить схемой стыков.</p><p>При шаге лаг 400 мм калькулятор показывает 14 линий: 42 пог. м до запаса и <strong>15 лаг по 3 м</strong> к покупке. При настройках по умолчанию крепёж округляется до <strong>4 упаковок по 100 клипс</strong> и <strong>4 упаковок по 100 саморезов</strong>.</p>",
      },
      {
        question: "Можно ли считать клипсы по универсальной норме на квадратный метр?",
        answer: "<p>Для точной закупки — нет. Количество зависит от числа рядов, линий лаг, стартового и финишного крепежа и монтажной схемы конкретной системы. Калькулятор считает пересечения явно и округляет результат до указанной упаковки.</p>",
      },
      {
        question: "Учитывает ли калькулятор дополнительные лаги под стыками?",
        answer: "<p>Он показывает число стыков и предупреждает о необходимости проверить дополнительные опоры, но не добавляет универсальное количество автоматически. Схема двойных лаг и допустимая разбежка зависят от выбранного профиля, подконструкции и проекта.</p>",
      },
    ],
  },
};
