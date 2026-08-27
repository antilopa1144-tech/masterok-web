import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFence } from "../../../../engine/fence";
import fenceSpec from "../../../../configs/calculators/fence-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const fenceDef: CalculatorDefinition = {
  id: "fence",
  slug: "zabor",
  formulaVersion: fenceSpec.formula_version,
  title: "Калькулятор забора",
  h1: "Калькулятор забора онлайн — расчёт материалов для ограждения",
  description: "Рассчитайте столбы, лаги, профлист или сетку-рабицу и крепёж для забора любой длины.",
  metaTitle: withSiteMetaTitle("Калькулятор забора: расчёт материалов онлайн"),
  metaDescription: "Бесплатный калькулятор забора: рассчитайте профлист, столбы, поперечные лаги, сетку и крепёж по длине и высоте ограждения участка.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["забор", "профлист", "ограждение", "столбы", "сетка-рабица", "лаги для забора"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "fenceLength",
      label: "Длина забора",
      type: "slider",
      unit: "м",
      min: 5,
      max: 500,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "fenceHeight",
      label: "Высота забора",
      type: "slider",
      unit: "м",
      min: 1,
      max: 3,
      step: 0.1,
      defaultValue: 2,
    },
    {
      key: "fenceType",
      label: "Тип забора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Из профнастила (на столбах)" },
        { value: 1, label: "Сетка-рабица (на столбах)" },
        { value: 2, label: "Деревянный штакетник" },
      ],
    },
    {
      key: "postStep",
      label: "Шаг столбов",
      type: "select",
      defaultValue: 2.5,
      options: [
        { value: 2.0, label: "2.0 м" },
        { value: 2.5, label: "2.5 м (стандарт)" },
        { value: 3.0, label: "3.0 м" },
      ],
    },
    {
      key: "gatesCount",
      label: "Ворота (двустворчатые, 4 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "wicketsCount",
      label: "Калитки (1 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "sheetWorkingWidthMm",
      label: "Рабочая ширина профлиста",
      type: "number",
      unit: "мм",
      min: 500,
      max: 1500,
      step: 10,
      defaultValue: 1150,
      hint: "Перенесите из паспорта листа: например, 1150 мм для проверенного С8 или 1000 мм для проверенного С21",
    },
    { key: "coverReservePercent", label: "Запас заполнения", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 0, hint: "Добавляется один раз до округления к покупке" },
    { key: "screwsPerSheet", label: "Саморезов на лист", type: "number", unit: "шт", min: 0, max: 30, step: 1, defaultValue: 6, hint: "Укажите по монтажной схеме выбранного профиля и числу лаг" },
    { key: "screwReservePercent", label: "Запас саморезов", type: "number", unit: "%", min: 0, max: 30, step: 1, defaultValue: 5 },
    { key: "screwPackCount", label: "Саморезов в упаковке", type: "number", unit: "шт", min: 1, max: 5000, step: 10, integerOnly: true, defaultValue: 200 },
  ],
  calculate(inputs) {
    const spec = fenceSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalFence(spec, inputs, factorTable);

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
**Расчёт забора:**
Столбов = ⌈Длина / Шаг⌉ + 1 + Ворота×2 + Калитки×2
Точная потребность профлиста = Длина_нетто / Рабочая ширина
К покупке = ⌈Точная потребность × (1 + явный запас / 100)⌉

Рабочая ширина уже учитывает боковой нахлёст. Не подставляйте габаритную ширину. Шаг, сечения и глубина опор в форме — предварительные параметры; конструкцию проверяют по грунту, высоте и ветровой нагрузке.
  `,
  howToUse: [
    "Введите длину забора",
    "Укажите высоту и тип заполнения",
    "Задайте шаг столбов и рабочую ширину листа из паспорта",
    "Укажите количество ворот и калиток",
    "Нажмите «Рассчитать» — получите все материалы",
  ],
  faq: [
    {
      question: "Какой шаг столбов оптимален для забора из профлиста?",
      answer:
        "Шаг 2,5 м в форме — только стартовый ориентир. Фактический шаг, сечения и фундамент определяют расчётом по высоте, ветровому району, грунту и узлам ворот.",
    },
    {
      question: "Нужно ли учитывать ворота и калитку отдельно?",
      answer:
        "Да. Это отдельные узлы с усилением: дополнительные столбы, каркас, фурнитура и часто другой фундамент/закладные. Если считать «просто вычесть длину», чаще всего возникает недобор именно по опорам и комплектующим.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта забора</h2>
<p><strong>Длина заполнения</strong> = общая длина минус ширина ворот и калиток.</p>
<p><strong>Точная потребность листов</strong> = длина заполнения / рабочая ширина профлиста.</p>
<p><strong>К покупке</strong> = округление вверх (точная потребность &times; (1 + выбранный запас / 100)).</p>
<ul>
  <li>Рабочая ширина уже исключает боковой нахлёст и обычно меньше габаритной.</li>
  <li>Для подтверждённых карточек «Металл Профиль» С8 имеет рабочую ширину 1150 мм, С21 — 1000 мм; для покупки переносите значение конкретного товара.</li>
  <li>Запас вводится явно и применяется один раз. Режим точности не добавляет скрытый процент.</li>
  <li>Саморезы считаются в штуках на купленные листы и округляются до указанной упаковки.</li>
</ul>

<h2>Что калькулятор не проектирует</h2>
<p>Сечения столбов и лаг, глубина и тип фундамента, ветровая устойчивость, узлы ворот и допустимая высота зависят от проекта и местных правил. Показанные опоры, бетон и ряды лаг — предварительная комплектация, а не расчёт несущей конструкции.</p>
`,
    faq: [
      {
        question: "Сколько столбов нужно на забор 50 метров?",
        answer: "<p>При длине заполнения 45 м после вычета ворот и калитки и шаге 2,5 м предварительная модель показывает 19 рядовых опор вместе с крайними и ещё 4 опоры для проёмов — <strong>23 столба</strong>. Сечение, глубину и фундамент нужно проверить по грунту, высоте, ветровой нагрузке и узлам ворот.</p>",
      },
      {
        question: "Сколько листов профнастила нужно на забор?",
        answer: "<p>Для 45 м заполнения и рабочей ширины 1150 мм точная потребность равна 45 / 1,15 = <strong>39,13 листа</strong>, поэтому без дополнительного запаса к покупке нужно <strong>40 листов</strong>. При рабочей ширине 1000 мм потребуется <strong>45 листов</strong>. Указывайте именно рабочую ширину из паспорта: она уже учитывает нахлёст.</p><p>При настройке 6 саморезов на лист чистая потребность для 40 листов — 240 шт.; с запасом 5% — 252 шт., что при фасовке 200 шт. означает <strong>2 упаковки, 400 шт. к покупке</strong>.</p>",
      },
      {
        question: "Нужно ли бетонировать столбы забора?",
        answer: "<p>Способ установки нельзя выбрать только по типу заполнения: нужны данные о грунте, промерзании, высоте, ветровой нагрузке и конструкции ворот. Калькулятор сохраняет предварительное допущение 0,03 м³ бетона на опору, но прямо отделяет его от проектного решения.</p>",
      },
    ],
  },
};
