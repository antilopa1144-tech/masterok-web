import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFrameHouse } from "../../../../engine/frame-house";
import frameHouseSpec from "../../../../configs/calculators/frame-house-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const hideWithoutFraming = { key: "framingProjectLengthM", op: "eq" as const, value: 0 };
const hideWithoutOuter = { key: "outerSheathingEnabled", op: "eq" as const, value: 0 };
const hideWithoutInner = { key: "innerSheathingEnabled", op: "eq" as const, value: 0 };
const hideWithoutInsulation = { key: "insulationEnabled", op: "eq" as const, value: 0 };
const hideWithoutVapor = { key: "vaporBarrierEnabled", op: "eq" as const, value: 0 };
const hideWithoutWind = { key: "windBarrierEnabled", op: "eq" as const, value: 0 };
const hideWithoutTape = { key: "tapeProjectM", op: "eq" as const, value: 0 };
const hideWithoutSheathingFasteners = {
  key: "sheathingFastenersProjectPcs",
  op: "eq" as const,
  value: 0,
};
const hideWithoutFramingFasteners = {
  key: "framingFastenersProjectPcs",
  op: "eq" as const,
  value: 0,
};

export const frameHouseDef: CalculatorDefinition = {
  id: "frame_house",
  slug: "karkasnyj-dom",
  title: "Калькулятор материалов каркасного дома",
  h1: "Каркасный дом — закупка материалов по проектной ведомости",
  description:
    "Переведите площадь стен, готовые проектные количества и фасовки выбранных товаров в доски, листы, упаковки, рулоны и крепёж к покупке.",
  metaTitle: withSiteMetaTitle("Каркасный дом: материалы по проектной ведомости"),
  metaDescription:
    "Бесплатный калькулятор материалов каркасного дома: рассчитайте доски, листовую обшивку, утеплитель, мембраны, ленту и крепёж по проектной ведомости.",
  category: "walls",
  categorySlug: "steny",
  tags: [
    "каркасный дом",
    "каркасник",
    "пиломатериал",
    "листовая обшивка",
    "утеплитель",
    "мембраны",
    "материалы по проекту",
  ],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "wallLength",
      label: "Общая длина рассчитываемых стен",
      type: "number",
      unit: "м",
      min: 1,
      max: 200,
      step: 0.1,
      defaultValue: 30,
      hint: "Сумма длин стен одного принятого контура; несущую схему калькулятор не определяет",
      group: "Площадь стен",
    },
    {
      key: "wallHeight",
      label: "Проектная высота стен",
      type: "number",
      unit: "м",
      min: 1,
      max: 8,
      step: 0.1,
      defaultValue: 2.7,
      group: "Площадь стен",
    },
    {
      key: "openingsArea",
      label: "Суммарная площадь проёмов",
      type: "number",
      unit: "м²",
      min: 0,
      max: 500,
      step: 0.1,
      defaultValue: 10,
      hint: "Усиления, перемычки, стойки и отходы вокруг проёмов должны быть учтены проектом или раскладкой",
      group: "Площадь стен",
    },
    {
      key: "surfaceAreaBasis",
      label: "Какую площадь применять к материалам",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Валовую — без вычета проёмов (безопаснее до раскладки)" },
        { value: 1, label: "Чистую — после вычета проёмов" },
      ],
      hint: "Чистую площадь выбирайте только если раскладка подтверждает использование обрезков",
      group: "Площадь стен",
    },
    {
      key: "framingProjectLengthM",
      label: "Длина одной позиции пиломатериала из ведомости",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hint: "Сложите длины элементов только одного сечения и сорта; 0 — не добавлять пиломатериал",
      group: "Пиломатериал из проекта",
    },
    {
      key: "framingReservePercent",
      label: "Запас этой позиции на раскрой",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 5,
      hideIf: hideWithoutFraming,
      group: "Пиломатериал из проекта",
    },
    {
      key: "framingBoardLengthM",
      label: "Длина покупной доски",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 20,
      step: 0.1,
      defaultValue: 6,
      hideIf: hideWithoutFraming,
      hint: "Округление по общему метражу не заменяет карту раскроя цельных элементов",
      group: "Пиломатериал из проекта",
    },
    {
      key: "outerSheathingEnabled",
      label: "Наружная листовая обшивка",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Включить по проектной площади" },
      ],
      hint: "Тип, класс, толщину, ориентацию и схему стыков определяет проект",
      group: "Наружная обшивка",
    },
    {
      key: "outerSheetAreaM2",
      label: "Площадь одного наружного листа",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.001,
      defaultValue: 3.125,
      hideIf: hideWithoutOuter,
      hint: "3,125 м² — только стартовый пример листа 1250 × 2500 мм; введите фактический формат",
      group: "Наружная обшивка",
    },
    {
      key: "outerSheathingLayers",
      label: "Слоёв наружной листовой обшивки",
      type: "number",
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutOuter,
      group: "Наружная обшивка",
    },
    {
      key: "outerSheathingReservePercent",
      label: "Запас наружной обшивки",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      hideIf: hideWithoutOuter,
      group: "Наружная обшивка",
    },
    {
      key: "innerSheathingEnabled",
      label: "Внутренняя листовая обшивка",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Включить по проектной площади" },
      ],
      group: "Внутренняя обшивка",
    },
    {
      key: "innerSheetAreaM2",
      label: "Площадь одного внутреннего листа",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.001,
      defaultValue: 3,
      hideIf: hideWithoutInner,
      hint: "Введите фактическую площадь листа принятого материала",
      group: "Внутренняя обшивка",
    },
    {
      key: "innerSheathingLayers",
      label: "Слоёв внутренней листовой обшивки",
      type: "number",
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutInner,
      group: "Внутренняя обшивка",
    },
    {
      key: "innerSheathingReservePercent",
      label: "Запас внутренней обшивки",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      hideIf: hideWithoutInner,
      group: "Внутренняя обшивка",
    },
    {
      key: "insulationEnabled",
      label: "Утеплитель принятой толщины",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Включить по данным упаковки" },
      ],
      hint: "Толщину и материал выбирают теплотехническим расчётом, а не этим калькулятором",
      group: "Утепление",
    },
    {
      key: "insulationPackageAreaM2",
      label: "Площадь утеплителя в одной упаковке",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 0,
      hideIf: hideWithoutInsulation,
      hint: "Возьмите площадь для выбранной проектной толщины с этикетки товара",
      group: "Утепление",
    },
    {
      key: "insulationLayers",
      label: "Слоёв утеплителя по проекту",
      type: "number",
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutInsulation,
      group: "Утепление",
    },
    {
      key: "insulationReservePercent",
      label: "Запас утеплителя",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 5,
      hideIf: hideWithoutInsulation,
      group: "Утепление",
    },
    {
      key: "vaporBarrierEnabled",
      label: "Пароизоляционный слой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Включить по проекту" },
      ],
      hint: "Тип и расположение слоя определяют расчётом и проектом стены",
      group: "Мембраны",
    },
    {
      key: "vaporRollAreaM2",
      label: "Полезная площадь рулона пароизоляции",
      type: "number",
      unit: "м²",
      min: 0,
      max: 500,
      step: 0.1,
      defaultValue: 0,
      hideIf: hideWithoutVapor,
      group: "Мембраны",
    },
    {
      key: "vaporLayers",
      label: "Слоёв пароизоляции по проекту",
      type: "number",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutVapor,
      group: "Мембраны",
    },
    {
      key: "vaporReservePercent",
      label: "Запас пароизоляции",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 15,
      hideIf: hideWithoutVapor,
      group: "Мембраны",
    },
    {
      key: "windBarrierEnabled",
      label: "Наружная защитная мембрана",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Включить по проекту" },
      ],
      hint: "Назначение, паропроницаемость и вентиляционный зазор проверяют по системе стены",
      group: "Мембраны",
    },
    {
      key: "windRollAreaM2",
      label: "Полезная площадь рулона наружной мембраны",
      type: "number",
      unit: "м²",
      min: 0,
      max: 500,
      step: 0.1,
      defaultValue: 0,
      hideIf: hideWithoutWind,
      group: "Мембраны",
    },
    {
      key: "windLayers",
      label: "Слоёв наружной мембраны по проекту",
      type: "number",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutWind,
      group: "Мембраны",
    },
    {
      key: "windReservePercent",
      label: "Запас наружной мембраны",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 15,
      hideIf: hideWithoutWind,
      group: "Мембраны",
    },
    {
      key: "tapeProjectM",
      label: "Длина системной ленты из раскладки",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hint: "0 — не включать; длину стыков и примыканий берут из раскладки мембран",
      group: "Лента и крепёж",
    },
    {
      key: "tapeReservePercent",
      label: "Запас системной ленты",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      hideIf: hideWithoutTape,
      group: "Лента и крепёж",
    },
    {
      key: "tapeRollLengthM",
      label: "Длина ленты в одном рулоне",
      type: "number",
      unit: "м",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 0,
      hideIf: hideWithoutTape,
      group: "Лента и крепёж",
    },
    {
      key: "sheathingFastenersProjectPcs",
      label: "Крепёж обшивки из ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      defaultValue: 0,
      hint: "0 — не включать; тип, шаг и краевые расстояния калькулятор не назначает",
      group: "Лента и крепёж",
    },
    {
      key: "sheathingFastenersReservePercent",
      label: "Запас крепежа обшивки",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 5,
      hideIf: hideWithoutSheathingFasteners,
      group: "Лента и крепёж",
    },
    {
      key: "sheathingFastenersPackagePcs",
      label: "Крепежа обшивки в упаковке",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      hideIf: hideWithoutSheathingFasteners,
      group: "Лента и крепёж",
    },
    {
      key: "framingFastenersProjectPcs",
      label: "Крепёж соединений каркаса из ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      defaultValue: 0,
      hint: "0 — не включать; гвозди, анкеры, пластины и узлы задаёт проект",
      group: "Лента и крепёж",
    },
    {
      key: "framingFastenersReservePercent",
      label: "Запас крепежа каркаса",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 5,
      hideIf: hideWithoutFramingFasteners,
      group: "Лента и крепёж",
    },
    {
      key: "framingFastenersPackagePcs",
      label: "Крепежа каркаса в упаковке",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      hideIf: hideWithoutFramingFasteners,
      group: "Лента и крепёж",
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalFrameHouse(
      frameHouseSpec as any,
      inputs,
      defaultFactorTables.factors as any,
    );
    const totals = canonical.totals;
    return {
      materials: canonical.materials,
      totals,
      warnings: canonical.warnings,
      scenarios: totals.outerSheathingEnabled ? canonical.scenarios : undefined,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      hidePrimaryMaterialBadge: true,
      summaryCards: [
        {
          icon: "📐",
          label: "Площадь для закупки",
          value: String(totals.selectedSurfaceArea),
          unit: "м²",
          hint: totals.surfaceAreaBasis ? "после вычета проёмов" : "валовая площадь",
          tone: "slate",
        },
        {
          icon: "🧱",
          label: "Наружные листы",
          value: String(totals.outerSheets),
          unit: "шт.",
          hint: "по фактической площади листа",
          tone: "violet",
        },
        {
          icon: "📦",
          label: "Позиций к покупке",
          value: String(canonical.materials.length),
          hint: "только явно включённые",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Калькулятор переводит принятую проектную схему в закупку:**

1. Валовая площадь стен = общая длина × проектная высота. Проёмы вычитаются только при явном выборе чистой площади.
2. Одна позиция пиломатериала берётся готовым метражом из ведомости, получает явный запас и округляется до покупной длины доски.
3. Листовые слои считаются по фактической площади листа, утеплитель — по площади упаковки принятой толщины, мембраны — по полезной площади рулона.
4. Лента и крепёж появляются только после ввода проектного количества и реальной фасовки.
5. MIN/REC/MAX относятся к наружной листовой обшивке и не смешивают разные единицы материалов.

Калькулятор не назначает несущую схему, шаг и сечение стоек, узлы, перемычки, укосины, крепёж или толщину утепления.
  `,
  howToUse: [
    "Введите общую длину и проектную высоту рассчитываемых стен",
    "Выберите валовую или подтверждённую раскладкой чистую площадь",
    "Перенесите одну позицию пиломатериала из проектной ведомости",
    "Включите только предусмотренные проектом обшивки, утепление и мембраны",
    "Введите фактические площади листов, упаковок и рулонов",
    "Добавьте ленту и крепёж только по готовой раскладке или ведомости",
  ],
  faq: [
    {
      question: "Калькулятор подбирает шаг и сечение стоек?",
      answer:
        "Нет. Нагрузки, устойчивость, сорт и класс прочности древесины, шаг, сечение, усиления проёмов, перемычки, укосины и соединения определяются проектом. Здесь считается только закупка по готовым количествам.",
    },
    {
      question: "Почему пиломатериал вводится метражом из ведомости?",
      answer:
        "Один периметр не показывает углы, Т-образные примыкания, проёмы, перемычки, двойные стойки, обвязки и разные сечения. Автоматический подсчёт создавал бы правдоподобную, но неполную спецификацию.",
    },
    {
      question: "Почему утеплитель не выбирается как 150 или 200 мм?",
      answer:
        "Состав стены и толщину теплоизоляции определяют теплотехническим расчётом по действующему СП 50.13330.2024. После выбора материала введите площадь одной упаковки для принятой толщины.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор материалов каркасного дома</h2>
<p>Калькулятор переводит площадь стен, готовые количества из рабочей ведомости и реальные фасовки товаров в закупочные позиции. Он не проектирует несущую схему и стеновой пирог.</p>

<h2>Площадь стен без скрытого вычитания</h2>
<p>Валовая площадь равна общей длине стен, умноженной на проектную высоту. По умолчанию проёмы не вычитаются: это консервативно до готовой раскладки листов и рулонов. Чистую площадь можно выбрать явно, если обрезки действительно используются.</p>

<h2>Пиломатериал только из проектной ведомости</h2>
<p>Калькулятор не выводит число стоек из периметра. Пользователь переносит суммарную длину одной позиции одинакового сечения и сорта, задаёт запас и покупную длину доски. Разные позиции считают отдельно и сверяют с картой раскроя.</p>

<h2>Листы, утеплитель и мембраны по фактической упаковке</h2>
<p>Для листовой обшивки вводится площадь одного листа и число проектных слоёв. Для утеплителя — площадь упаковки выбранного материала при принятой толщине. Для мембран — полезная площадь рулона. Каждая позиция отдельно показывает точную площадь, явный запас, целые упаковки и остаток.</p>

<h2>Нормативная граница расчёта</h2>
<ul>
  <li><strong>СП 64.13330.2017</strong> — расчёт деревянных конструкций и соединений;</li>
  <li><strong>СП 20.13330.2016</strong> — нагрузки, воздействия и их сочетания;</li>
  <li><strong>СП 50.13330.2024</strong> — действующая тепловая защита зданий, заменившая редакцию 2012 года;</li>
  <li><strong>ГОСТ Р 70876-2023</strong> и <strong>ГОСТ Р 57031-2016</strong> — требования к элементам из массивной древесины и сортировке пиломатериалов по прочности;</li>
  <li><strong>ГОСТ 32567-2013</strong> — технические требования к древесным плитам с ориентированной стружкой.</li>
</ul>
<p>Эти документы задают границу ответственности: калькулятор материалов не заменяет рабочую документацию, расчёт нагрузок, теплотехнику, узлы и карту раскроя.</p>
`,
    faq: [
      {
        question: "Можно ли посчитать каркасный дом только по периметру?",
        answer:
          "<p>По периметру можно получить площадь стен, но нельзя достоверно определить несущие элементы. Для закупки пиломатериала нужна проектная ведомость с углами, примыканиями, проёмами, перемычками, укосинами, обвязками, сечениями и длинами.</p>",
      },
      {
        question: "Вычитать ли окна и двери из обшивки?",
        answer:
          "<p>До раскладки безопаснее считать валовую площадь: небольшие проёмы не всегда уменьшают число целых листов. Чистую площадь используйте, когда раскладка подтверждает, что обрезки можно применить.</p>",
      },
      {
        question: "Что не входит в результат?",
        answer:
          "<p>Не рассчитываются фундамент, перекрытия, кровля, нагрузки, устойчивость, сечения, сорт и влажность древесины, проёмы и ригели, укосины, узлы, анкеровка, инженерные проходки, огнезащита, отделка фасада и карта раскроя.</p>",
      },
    ],
  },
};
