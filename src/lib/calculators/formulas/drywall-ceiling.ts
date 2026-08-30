import drywallCeilingSpec from "../../../../configs/calculators/drywall-ceiling-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { computeCanonicalDrywallCeiling } from "../../../../engine/drywall-ceiling";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

export const drywallCeilingDef: CalculatorDefinition = {
  id: "drywall_ceiling",
  slug: "podvesnoy-potolok-gkl",
  formulaVersion: drywallCeilingSpec.formula_version,
  title: "Калькулятор потолка КНАУФ П 113",
  h1: "Потолок из гипсовых плит КНАУФ П 113 — материалы к покупке",
  description:
    "Рассчитайте комплект одноуровневого потолка П 113.1 или П 113.2 по официальной ведомости, фактическому периметру и выбранным фасовкам.",
  metaTitle: withSiteMetaTitle("Потолок КНАУФ П 113: расчёт материалов"),
  metaDescription:
    "Бесплатный калькулятор потолка КНАУФ П 113. Рассчитайте плиты, профили, подвесы, крепёж, ленты и составы к покупке для П 113.1 или П 113.2.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: [
    "подвесной потолок",
    "КНАУФ П 113",
    "гипсовая плита",
    "ГКЛ",
    "ПП 60×27",
    "ПН 28×27",
  ],
  popularity: 70,
  complexity: 3,
  fields: [
    {
      key: "inputMode",
      label: "Как задать потолок",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Длина и ширина" },
        { value: 1, label: "Площадь и периметр" },
      ],
      hint: "Периметр нужен для ПН и лент. В режиме площади он вводится отдельно, без условного квадрата.",
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Фактическая площадь потолка",
      type: "number",
      unit: "м²",
      min: 1,
      max: 500,
      step: 0.1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "perimeterM",
      label: "Суммарный периметр примыканий",
      type: "number",
      unit: "м",
      min: 1,
      max: 500,
      step: 0.1,
      defaultValue: 18,
      group: "byArea",
      hint: "Измерьте все участки примыкания ПН и системных лент к стенам.",
    },
    {
      key: "layers",
      label: "Вариант системы",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "П 113.1 — один слой 12,5 мм" },
        { value: 2, label: "П 113.2 — два слоя 12,5 мм" },
      ],
      hint: "Калькулятор не подбирает число слоёв: перенесите вариант из проекта или рабочего решения.",
    },
    { key: "sheetWidthMm", label: "Ширина выбранной плиты", type: "number", unit: "мм", min: 600, max: 1500, step: 50, defaultValue: 1200 },
    { key: "sheetLengthMm", label: "Длина выбранной плиты", type: "number", unit: "мм", min: 1200, max: 4000, step: 100, defaultValue: 2500 },
    { key: "sheetReservePercent", label: "Запас плит на раскрой", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10, hint: "Явный запас применяется один раз; MAX не добавляет скрытые проценты." },
    { key: "profileLengthM", label: "Длина покупного профиля", type: "number", unit: "м", min: 2, max: 6, step: 0.1, defaultValue: 3, hint: "Одинаковая длина используется для ПП и ПН; нестандартные позиции считайте отдельно." },
    { key: "profileReservePercent", label: "Запас профиля", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
    { key: "fastenerReservePercent", label: "Запас штучных элементов", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
    { key: "tnScrewPackCount", label: "Шурупов TN в упаковке", type: "number", unit: "шт", min: 1, max: 10000, step: 1, integerOnly: true, defaultValue: 1000, hint: "TN 25 и TN 35 показаны раздельно; укажите фасовку выбранного товара." },
    { key: "lnScrewPackCount", label: "Шурупов LN в упаковке", type: "number", unit: "шт", min: 1, max: 5000, step: 1, integerOnly: true, defaultValue: 100 },
    { key: "jointTapeRollM", label: "Бумажной ленты в рулоне", type: "number", unit: "м", min: 1, max: 200, step: 1, defaultValue: 50 },
    { key: "sealingTapeRollM", label: "Уплотнительной ленты в рулоне", type: "number", unit: "м", min: 1, max: 200, step: 1, defaultValue: 30 },
    { key: "separatingTapeRollM", label: "Разделительной ленты в рулоне", type: "number", unit: "м", min: 1, max: 200, step: 1, defaultValue: 50 },
    { key: "puttyBagKg", label: "Фасовка шпаклёвки для стыков", type: "number", unit: "кг", min: 1, max: 50, step: 1, defaultValue: 25 },
    { key: "primerCanL", label: "Объём канистры грунтовки", type: "number", unit: "л", min: 0.5, max: 20, step: 0.5, defaultValue: 5 },
    { key: "finishReservePercent", label: "Запас лент и составов", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10 },
  ],
  calculate(inputs) {
    const spec = drywallCeilingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalDrywallCeiling(
      spec,
      { ...inputs, accuracyMode: inputs.accuracyMode as any },
      factorTable,
    );

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
**Что считается:**
- площадь и фактический периметр потолка;
- гипсовые плиты по формату и числу слоёв;
- полный ориентировочный комплект П 113.1 или П 113.2 по официальной ведомости КНАУФ;
- каждый запас применяется один раз, затем длиномер и фасовки округляются к покупке.

Это оценка материалов конкретной системы П 113, а не универсальный проект подвесного потолка.
  `,
  howToUse: [
    "Выберите ввод по размерам либо укажите фактические площадь и периметр",
    "Выберите П 113.1 или П 113.2 только по принятому проектному решению",
    "Перенесите размеры плит, длину профиля и фасовки выбранных товаров",
    "Сверьте результат с рабочими чертежами, нагрузками и раскладкой помещения",
  ],
  faq: [
    {
      question: "Почему калькулятор считает только систему П 113?",
      answer:
        "Расходы профилей, подвесов и соединителей зависят от конкретной комплектной системы. Здесь использована опубликованная ведомость одноуровневого металлического каркаса КНАУФ П 113, поэтому её нормы не выдаются за универсальные для любого потолка.",
    },
    {
      question: "Чем П 113.1 отличается от П 113.2 в расчёте?",
      answer:
        "П 113.1 имеет один слой плит, П 113.2 — два. Для двух слоёв отдельно считаются TN 25 и TN 35, применяется другая норма шпаклёвки, а несущую способность подвесов и шаги обязательно проверяют по нагрузке.",
    },
    {
      question: "Почему MAX совпадает с REC?",
      answer:
        "Дополнительный скрытый запас создавал бы ложную точность. MIN показывает чистую потребность плит, а REC и MAX используют только процент, который вы сами ввели.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор потолка П 113</h2>
<p>Калькулятор составляет закупочную оценку для <strong>комплектной системы КНАУФ П 113</strong> на одноуровневом металлическом каркасе. Вариант П 113.1 имеет один слой гипсовых плит 12,5 мм, П 113.2 — два слоя.</p>
<p>Геометрия помещения не подменяется квадратом: при вводе готовой площади отдельно указывается фактический периметр. Поэтому ПН, уплотнительная и разделительная ленты считаются по реальным примыканиям.</p>

<h2>Какие материалы входят</h2>
<ul>
  <li>гипсовые плиты выбранного формата;</li>
  <li>профили ПП 60&times;27 и ПН 28&times;27;</li>
  <li>одноуровневые соединители, удлинители и подвесы;</li>
  <li>шурупы LN, TN 25 и, для П 113.2, TN 35;</li>
  <li>анкеры подвесов и крепёж ПН к стенам;</li>
  <li>уплотнительная, разделительная и бумажная армирующая ленты;</li>
  <li>шпаклёвка для стыков и грунтовка.</li>
</ul>

<h2>Граница применимости</h2>
<p><a href="https://protect.gost.ru/sp/details/92439dea-05ad-4cfe-9dc4-c1bddcdb8c55" rel="noopener noreferrer">СП 163.1325800.2014</a> распространяется на проектирование и монтаж конструкций с гипсовыми плитами, включая подвесные потолки. Требования к самим плитам задаёт <a href="https://protect.gost.ru/gost/details/2bab5670-8967-4962-94cb-4e15a4d15f4b" rel="noopener noreferrer">ГОСТ 32614-2012</a>.</p>
<p>Расходы взяты из <a href="https://www.knauf.ru/upload/iblock/16e/8h7c3z35upmxuw098s9cc2f9lnxpedfg/102_0003-Albom-RCH-_Potolki-iz-KNAUF_listov-i-KNAUF_superlistov_-_18_02_2025_-v01-Preview.pdf" rel="noopener noreferrer">альбома рабочих чертежей КНАУФ 2025 года</a>. Производитель указывает, что значения рассчитаны для потолка 10&times;10 м без потерь на раскрой и должны уточняться по проекту.</p>
<p>Светильники, люки, ниши, перепады уровня, криволинейные участки, усиления, изоляция и специальные швы не входят. Точки крепления, тип подвеса и допустимую нагрузку проверяют по рабочим чертежам и основанию.</p>

<h2>Пример для помещения 5&times;4 м</h2>
<p>Для П 113.1, плит 1200&times;2500 мм и запасов по умолчанию калькулятор показывает 8 плит, 21 профиль ПП по 3 м, 7 профилей ПН, 36 соединителей, 5 удлинителей и 15 подвесов. Шурупы, анкеры, ленты и составы выводятся отдельными позициями с округлением по указанной фасовке.</p>
`,
    faq: [
      {
        question: "Сколько листов нужно на потолок 20 м²?",
        answer:
          "<p>Для П 113.1 и плиты 1200&times;2500 мм чистая потребность равна 6,67 листа. При явном запасе 10% получается 7,33 листа, поэтому к покупке — <strong>8 листов</strong>.</p>",
      },
      {
        question: "Можно ли использовать расчёт для другой системы потолка?",
        answer:
          "<p>Нет. П 112, деревянный каркас, независимый потолок и системы других производителей имеют другую сетку и ведомость. Для них нужна отдельная спецификация или проектная ведомость.</p>",
      },
      {
        question: "Как учитывать светильники и люки?",
        answer:
          "<p>Их усиления и дополнительные элементы принимают по проектной раскладке. Калькулятор не вычитает отверстия автоматически и не назначает несущие узлы вокруг оборудования.</p>",
      },
    ],
  },
};
