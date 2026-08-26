import facadePanelsSpec from "../../../../configs/calculators/facade-panels-canonical.v1.json";
import { computeCanonicalFacadePanels } from "../../../../engine/facade-panels";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

export const facadePanelsDef: CalculatorDefinition = {
  id: "exterior_facade_panels",
  slug: "fasadnye-paneli",
  title: "Калькулятор фасадных панелей",
  h1: "Калькулятор фасадных панелей — расчёт к покупке",
  description: "Рассчитайте чистую площадь фасада, панели с одним явным запасом, профиль, утеплитель и доборные элементы по данным выбранной системы.",
  metaTitle: withSiteMetaTitle("Калькулятор фасадных панелей: расчёт к покупке"),
  metaDescription: "Бесплатный калькулятор фасадных панелей: рассчитайте площадь без проёмов, количество панелей, профиль, утеплитель и доборные элементы к покупке.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["фасадные панели", "сайдинг", "обшивка фасада", "доборные элементы", "профиль"],
  popularity: 55,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 0, label: "По размерам дома" },
        { value: 1, label: "По готовой площади" },
      ],
    },
    {
      key: "area",
      label: "Чистая площадь фасада",
      type: "number",
      unit: "м²",
      min: 1,
      max: 5000,
      step: 0.1,
      defaultValue: 100,
      group: "byArea",
      hint: "Площадь уже без окон и дверей",
    },
    { key: "houseLength", label: "Длина дома", type: "number", unit: "м", min: 1, max: 200, step: 0.1, defaultValue: 10, group: "bySize" },
    { key: "houseWidth", label: "Ширина дома", type: "number", unit: "м", min: 1, max: 200, step: 0.1, defaultValue: 10, group: "bySize" },
    { key: "wallHeight", label: "Высота фасада", type: "number", unit: "м", min: 1, max: 20, step: 0.1, defaultValue: 3, group: "bySize" },
    { key: "openingsArea", label: "Площадь окон и дверей", type: "number", unit: "м²", min: 0, max: 2000, step: 0.1, defaultValue: 10, group: "bySize", hint: "Вычитается из общей площади стен" },
    {
      key: "panelType",
      label: "Тип облицовки",
      type: "select",
      defaultValue: 0,
      fullWidth: true,
      options: [
        { value: 0, label: "Виниловый сайдинг" },
        { value: 1, label: "Металлический сайдинг" },
        { value: 2, label: "Фиброцементный сайдинг" },
        { value: 3, label: "Деревянный блок-хаус" },
        { value: 4, label: "Фасадные термопанели" },
        { value: 5, label: "Профлист стеновой" },
        { value: 6, label: "HPL-панели" },
      ],
      hint: "Тип задаёт название в смете; размеры и нормы ниже возьмите из паспорта конкретного товара",
    },
    { key: "panelUsefulArea", label: "Полезная площадь одной панели", type: "number", unit: "м²", min: 0.01, max: 25, step: 0.01, defaultValue: 0.84, hint: "Не габаритная, а рабочая площадь с учётом замка или нахлёста" },
    { key: "reservePercent", label: "Запас панелей", type: "slider", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10, hint: "Применяется один раз до округления до целой панели" },
    { key: "needProfile", label: "Посчитать профиль или обрешётку", type: "switch", defaultValue: 1 },
    { key: "profileStep", label: "Шаг профиля", type: "number", unit: "м", min: 0.1, max: 2, step: 0.05, defaultValue: 0.4, hideIf: { key: "needProfile", op: "eq", value: 0 }, hint: "По паспорту системы и расчёту основания" },
    { key: "profilePieceLength", label: "Длина одного профиля", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3, hideIf: { key: "needProfile", op: "eq", value: 0 } },
    { key: "fastenersPerPanel", label: "Крепежа на одну панель", type: "number", unit: "шт", min: 0, max: 100, step: 1, integerOnly: true, defaultValue: 0, hint: "Укажите норму из паспорта; 0 — не добавлять в смету" },
    { key: "needInsulation", label: "Посчитать утеплитель", type: "switch", defaultValue: 0 },
    { key: "insulationPackArea", label: "Площадь утеплителя в упаковке", type: "number", unit: "м²", min: 0.1, max: 100, step: 0.01, defaultValue: 5.76, hideIf: { key: "needInsulation", op: "eq", value: 0 }, hint: "Значение с этикетки выбранного утеплителя" },
    { key: "externalCorners", label: "Наружных углов", type: "number", unit: "шт", min: 0, max: 100, step: 1, integerOnly: true, defaultValue: 4 },
    { key: "cornerPieceLength", label: "Длина углового элемента", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3 },
    { key: "starterPieceLength", label: "Длина стартового элемента", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3 },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalFacadePanels(facadePanelsSpec as any, inputs);
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
**Расчёт фасадных панелей:**
- Чистая площадь = периметр × высота − площадь проёмов
- Точная потребность = чистая площадь / полезная площадь одной панели
- Рекомендуемая потребность = точная потребность × (1 + запас / 100)
- К покупке = округление рекомендуемой потребности вверх до целой панели
- Профиль, утеплитель и доборные элементы округляются по введённой длине или площади упаковки

Запас панелей применяется один раз. Общие коэффициенты «на всякий случай» не добавляются.
  `,
  howToUse: [
    "Введите готовую площадь либо размеры дома и площадь проёмов",
    "Перенесите полезную площадь панели с паспорта или карточки товара",
    "Укажите явный запас и параметры профиля, утеплителя и доборов",
    "Сравните точную потребность и целое количество к покупке",
  ],
  faq: [
    {
      question: "Почему нужна именно полезная площадь панели?",
      answer: "Габаритная площадь может включать замок или нахлёст, который не закрывает фасад. Для закупки используйте рабочую ширину или полезную площадь из документации производителя.",
    },
    {
      question: "Считает ли калькулятор раскладку по каждому фасаду?",
      answer: "Нет. Это оценка закупки по площади. Для сложных фасадов отдельно проверьте раскрой, направление монтажа, швы, примыкания и возможность повторно использовать подрезки.",
    },
    {
      question: "Откуда брать шаг профиля и количество крепежа?",
      answer: "Из альбома технических решений и паспорта выбранной фасадной системы. Эти значения зависят от материала стены, ветрового района, размеров панелей и схемы крепления.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как считается закупка фасадных панелей</h2>
<p>Сначала калькулятор определяет чистую площадь фасада: для ввода по размерам из площади стен вычитаются окна и двери. Затем площадь делится на <strong>полезную площадь одной панели</strong>. Пользовательский запас применяется один раз, после чего результат округляется вверх до целой панели.</p>
<p><strong>N = &lceil;(S / S<sub>полезная</sub>) &times; (1 + Z / 100)&rceil;</strong></p>
<p>Где <strong>S</strong> — чистая площадь, <strong>S<sub>полезная</sub></strong> — рабочая площадь панели, <strong>Z</strong> — выбранный запас.</p>
<h2>Почему параметры системы вводятся вручную</h2>
<p>Одинаковое название материала не гарантирует одинаковую рабочую ширину, шаг обрешётки, расход крепежа или фасовку утеплителя. Поэтому калькулятор не подставляет скрытые универсальные нормы: значения переносятся из паспорта конкретного товара и проекта фасада.</p>
<h2>Что входит в результат</h2>
<ul><li>чистая площадь фасада;</li><li>точная потребность и целые панели к покупке;</li><li>расчётная длина и количество профилей;</li><li>упаковки утеплителя;</li><li>угловые и стартовые элементы;</li><li>крепёж, если указан паспортный расход.</li></ul>
<p>Результат остаётся оценкой закупки по площади. Он не заменяет раскладку панелей по отдельным стенам и проверку подсистемы по нагрузкам.</p>
    `,
    faq: [],
  },
};
