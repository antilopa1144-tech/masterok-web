import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import paintCanonicalSpecJson from "../../../../configs/calculators/paint-canonical.v1.json";
import { computeCanonicalPaint } from "../../../../engine/paint";
import type { PaintCanonicalSpec } from "../../../../engine/canonical";

const paintCanonicalSpec = paintCanonicalSpecJson as PaintCanonicalSpec;

export const paintDef: CalculatorDefinition = {
  id: "paint",
  slug: "kraska",
  formulaVersion: paintCanonicalSpec.formula_version,
  title: "Калькулятор краски",
  h1: "Калькулятор краски онлайн — расчёт количества краски для стен и потолка",
  description: "Рассчитайте точное количество краски для стен, потолка или фасада. Учёт количества слоёв и типа поверхности.",
  metaTitle: withSiteMetaTitle("Калькулятор краски онлайн | Расчёт краски"),
  metaDescription: "Бесплатный калькулятор краски: рассчитайте литры краски для стен, потолка или фасада с учётом количества слоёв, впитываемости основания и типа поверхности.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["краска", "покраска", "стены", "потолок", "фасад", "расход краски"],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 40,
    },
    {
      key: "coats",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой (подкраска)" },
        { value: 2, label: "2 слоя (стандарт)" },
        { value: 3, label: "3 слоя (тёмные цвета, экономные краски)" },
      ],
    },
    {
      key: "surfaceType",
      label: "Тип поверхности",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гладкая шпатлёванная" },
        { value: 1, label: "Бетон, штукатурка" },
        { value: 2, label: "Пористая (газоблок, кирпич)" },
        { value: 3, label: "Дерево" },
      ],
    },
    {
      key: "surfacePrep",
      label: "Подготовка основания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Загрунтованная поверхность" },
        { value: 1, label: "Новая необработанная" },
        { value: 2, label: "Ранее окрашенная" },
      ],
    },
    {
      key: "colorIntensity",
      label: "Насыщенность цвета",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Светлый / белый" },
        { value: 1, label: "Яркий / насыщенный" },
        { value: 2, label: "Тёмный" },
      ],
    },
    {
      key: "consumption",
      label: "Расход краски (на упаковке)",
      type: "slider",
      unit: "м²/л",
      min: 5,
      max: 20,
      step: 0.5,
      defaultValue: 10,
      hint: "Указан на упаковке краски. Типичный расход 8–14 м²/л",
    },
  ],
  calculate(inputs) {
    return computeCanonicalPaint(
      paintCanonicalSpec,
      {
        inputMode: inputs.inputMode,
        area: inputs.area,
        wallArea: inputs.wallArea,
        ceilingArea: inputs.ceilingArea,
        roomWidth: inputs.roomWidth,
        roomLength: inputs.roomLength,
        roomHeight: inputs.roomHeight,
        length: inputs.length,
        width: inputs.width,
        height: inputs.height,
        openingsArea: inputs.openingsArea,
        doorsWindows: inputs.doorsWindows,
        paintType: inputs.paintType ?? 0,
        surfaceType: inputs.surfaceType,
        surfacePrep: inputs.surfacePrep ?? 0,
        colorIntensity: inputs.colorIntensity ?? 0,
        coats: inputs.coats,
        coverage: inputs.coverage ?? inputs.consumption,
        canSize: inputs.canSize,
      },
      factorTables.factors,
    );
  },
  formulaDescription: `
**Расчёт краски:**
Литры = Площадь × Количество слоёв × Поправка поверхности × Поправка основания × Поправка цвета / Укрывистость

Сценарии MIN/REC/MAX добавляют реальные факторы потерь, упаковки и условий работ.
  `,
  howToUse: [
    "Введите площадь стен, потолка или фасада",
    "Укажите количество слоёв и тип поверхности",
    "Введите укрывистость с банки (обычно 8–14 м²/л)",
    "Нажмите «Рассчитать» — получите краску, грунтовку и расходники",
  ],
  expertTips: [
    {
      title: "Выбор валика",
      content: "Для водно-дисперсионных красок лучше использовать валик из микрофибры или полиамида с ворсом 9-12 мм.",
      author: "Мастер-маляр",
    },
    {
      title: "Проверка цвета",
      content: "Всегда делайте выкрас на небольшом участке стены. Цвет на стене и в банке может отличаться при разном освещении.",
      author: "Дизайнер",
    },
  ],
  faq: [
    {
      question: "Нужно ли грунтовать перед покраской?",
      answer: "Да, перед покраской основание обычно грунтуют, потому что грунтовка выравнивает впитываемость, улучшает сцепление краски с поверхностью и уменьшает риск пятен, полос и перерасхода материала уже на первом слое. Особенно заметен эффект на пористых, неоднородных, недавно зашпаклёванных или локально отремонтированных основаниях, где без грунта покрытие часто ложится неравномерно и итоговый расход краски оказывается заметно выше расчётного.",
    },
    {
      question: "Почему калькулятор показывает три сценария?",
      answer: "MIN, REC и MAX позволяют заранее увидеть расход краски в идеальных, рабочих и консервативных условиях, а не ориентироваться только на одну усреднённую цифру, которая редко совпадает с реальностью на объекте. Так проще выбрать безопасный объём закупки с учётом впитываемости основания, потерь при нанесении, количества слоёв и того, как теоретический расход переводится в реальные фасовки банок, особенно если выбранный цвет укрывистый не с первого прохода.",
    },
  ],
};









