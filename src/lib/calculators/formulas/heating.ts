import heatingSpec from "../../../../configs/calculators/heating-canonical.v1.json";
import { computeCanonicalHeating } from "../../../../engine/heating";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

export const heatingDef: CalculatorDefinition = {
  id: "engineering_heating",
  slug: "otoplenie-radiatory",
  formulaVersion: heatingSpec.formula_version,
  title: "Калькулятор радиаторов отопления",
  h1: "Калькулятор радиаторов — мощность при рабочем режиме",
  description:
    "Введите тепловую нагрузку помещения, паспортную теплоотдачу секции или прибора и при необходимости пересчитайте её на фактический температурный режим.",
  metaTitle: withSiteMetaTitle("Калькулятор радиаторов по тепловой нагрузке"),
  metaDescription:
    "Бесплатный калькулятор радиаторов: рассчитайте число секций или приборов по тепловой нагрузке помещения и паспортной мощности при рабочем температурном режиме.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["отопление", "радиаторы", "секции радиатора", "тепловая нагрузка", "температурный напор"],
  popularity: 75,
  complexity: 3,
  fields: [
    {
      key: "loadMode",
      label: "Исходная тепловая нагрузка",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Готовая из проекта" },
        { value: 1, label: "Предварительно по Вт/м²" },
      ],
      hint: "Для точного подбора считайте каждое помещение отдельно. Режим Вт/м² — только явная сметная оценка.",
      fullWidth: true,
    },
    {
      key: "designHeatLoadW",
      label: "Тепловая нагрузка помещения",
      type: "number",
      unit: "Вт",
      min: 100,
      max: 200000,
      step: 100,
      defaultValue: 8000,
      hideIf: { key: "loadMode", op: "eq", value: 1 },
      hint: "Готовое расчётное значение из проекта или расчёта теплопотерь для одного помещения/зоны.",
    },
    {
      key: "heatedAreaM2",
      label: "Площадь помещения",
      type: "number",
      unit: "м²",
      min: 1,
      max: 2000,
      step: 0.1,
      defaultValue: 80,
      hideIf: { key: "loadMode", op: "eq", value: 0 },
    },
    {
      key: "specificHeatLoadWm2",
      label: "Удельная нагрузка из расчёта или допущения",
      type: "number",
      unit: "Вт/м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 100,
      hideIf: { key: "loadMode", op: "eq", value: 0 },
      hint: "Это не норматив по региону. Введите обоснованное значение и используйте результат только для предварительной сметы.",
    },
    {
      key: "deviceKind",
      label: "Что подбираем",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Секции радиатора" },
        { value: 1, label: "Готовые приборы" },
      ],
      fullWidth: true,
    },
    {
      key: "devicePowerMode",
      label: "Паспортная теплоотдача",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Уже для рабочего режима" },
        { value: 1, label: "Пересчитать по ΔT и n" },
      ],
      hint: "Прямой режим надёжнее: возьмите теплоотдачу из таблицы изготовителя при расчётных температурах системы.",
      fullWidth: true,
    },
    {
      key: "deviceOutputAtDesignW",
      label: "Теплоотдача одной секции или прибора",
      type: "number",
      unit: "Вт",
      min: 10,
      max: 50000,
      step: 1,
      defaultValue: 180,
      hideIf: { key: "devicePowerMode", op: "eq", value: 1 },
      hint: "Паспортное значение именно при температуре подачи, обратки и воздуха вашего проекта.",
    },
    {
      key: "nominalDeviceOutputW",
      label: "Номинальная теплоотдача",
      type: "number",
      unit: "Вт",
      min: 10,
      max: 50000,
      step: 1,
      defaultValue: 180,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
      hint: "Значение из паспорта при указанном ниже номинальном температурном напоре.",
    },
    {
      key: "ratedDeltaTK",
      label: "Номинальный температурный напор ΔT",
      type: "number",
      unit: "К",
      min: 10,
      max: 100,
      step: 1,
      defaultValue: 50,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
      hint: "Не угадывайте по названию радиатора — возьмите ΔT из паспорта выбранной модели.",
    },
    {
      key: "supplyTempC",
      label: "Расчётная температура подачи",
      type: "number",
      unit: "°C",
      min: 20,
      max: 120,
      step: 1,
      defaultValue: 75,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
    },
    {
      key: "returnTempC",
      label: "Расчётная температура обратки",
      type: "number",
      unit: "°C",
      min: 10,
      max: 110,
      step: 1,
      defaultValue: 65,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
    },
    {
      key: "roomTempC",
      label: "Расчётная температура помещения",
      type: "number",
      unit: "°C",
      min: 5,
      max: 35,
      step: 1,
      defaultValue: 20,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
    },
    {
      key: "temperatureExponent",
      label: "Паспортный показатель степени n",
      type: "number",
      min: 1,
      max: 2,
      step: 0.01,
      defaultValue: 1.3,
      hideIf: { key: "devicePowerMode", op: "eq", value: 0 },
      hint: "Берите n из протокола испытаний или технической документации изготовителя.",
    },
    {
      key: "designReservePercent",
      label: "Явный проектный запас мощности",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 0,
      hint: "По умолчанию скрытого запаса нет. Избыточная мощность тоже требует регулирования и проверки режима.",
    },
    {
      key: "pipeLengthM",
      label: "Длина труб по схеме",
      type: "number",
      unit: "м",
      min: 0,
      max: 10000,
      step: 0.1,
      defaultValue: 0,
      hint: "Необязательно. Введите фактическую длину из проекта или замера; материал и диаметр калькулятор не назначает.",
    },
    {
      key: "pipeStockLengthM",
      label: "Длина покупного отрезка трубы",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "pipeReservePercent",
      label: "Запас длины труб",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 0,
      hint: "Явный запас; скрытых надбавок нет.",
    },
    {
      key: "fittingCount",
      label: "Фитинги по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
    {
      key: "bracketCount",
      label: "Кронштейны по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
    {
      key: "valveSetCount",
      label: "Комплекты арматуры по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
    {
      key: "airVentCount",
      label: "Воздухоотводчики по ведомости",
      type: "number",
      unit: "шт.",
      min: 0,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalHeating(heatingSpec as any, inputs);
    const totals = { ...canonical.totals };
    if (totals.loadMode === 0) {
      totals.heatedAreaM2 = 0;
      totals.preliminaryHeatLoadW = 0;
    }
    const formatMetric = (value: number, maximumFractionDigits = 2) =>
      new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);
    const primaryUnit = totals.deviceKind === 0 ? "секций" : "шт.";
    return {
      materials: canonical.materials,
      totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      summaryCards: [
        {
          icon: "🔥",
          label: "Тепловая нагрузка",
          value: formatMetric(totals.heatLoadW / 1000, 2),
          unit: "кВт",
          hint: totals.loadMode === 0 ? "принята из проекта" : "предварительно по введённым Вт/м²",
          tone: totals.loadMode === 0 ? "emerald" : "amber",
        },
        {
          icon: "🌡️",
          label: "Мощность единицы",
          value: formatMetric(totals.effectiveDeviceOutputW, 1),
          unit: "Вт",
          hint: totals.devicePowerMode === 0 ? "для рабочего режима" : `после пересчёта при ΔT ${formatMetric(totals.designDeltaTK, 1)} К`,
          tone: "violet",
        },
        {
          icon: "🛒",
          label: "К покупке",
          value: formatMetric(totals.recPurchase, 0),
          unit: primaryUnit,
          hint: totals.designReservePercent > 0
            ? `с явным запасом ${formatMetric(totals.designReservePercent, 1)}%`
            : "без скрытого запаса",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Тепловая нагрузка:**
- проектный режим принимает готовое значение для одного помещения или зоны;
- предварительный режим: Q = S × q, где q задаёт пользователь.

**Пересчёт теплоотдачи:**
- ΔT = (tподачи + tобратки) / 2 − tпомещения;
- Qраб = Qном × (ΔTраб / ΔTном)^n.

**Количество:**
- MIN = Q / Qраб;
- REC и MAX = Q × (1 + явный запас) / Qраб;
- к покупке — округление вверх до целой секции или прибора.
  `,
  howToUse: [
    "Для каждого помещения введите готовую тепловую нагрузку или явную предварительную удельную оценку",
    "Выберите секцию или готовый прибор",
    "Введите паспортную теплоотдачу для рабочего режима либо данные ΔT и показатель n для пересчёта",
    "При необходимости задайте явный проектный запас мощности",
    "Трубы и штучные элементы добавляйте только по проектной ведомости",
  ],
  faq: [
    {
      question: "Почему больше нет выбора «Москва / Сибирь» и типа здания?",
      answer:
        "Расчётная наружная температура зависит от конкретного населённого пункта, а теплопотери — от каждого ограждения, вентиляции и инфильтрации. Четыре региональных ярлыка и коэффициент «хороший/плохой дом» не дают проектную нагрузку.",
    },
    {
      question: "Зачем пересчитывать паспортную мощность радиатора?",
      answer:
        "Теплоотдача зависит от температурного напора. При низкотемпературной системе одна и та же секция или панель обычно отдаёт меньше тепла, чем в номинальном паспортном режиме.",
    },
    {
      question: "Можно ли посчитать все радиаторы дома одной строкой?",
      answer:
        "Только как грубую сумму. Для подбора каждый прибор считают по нагрузке конкретного помещения, размещению под окнами, доступному габариту и схеме подключения.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что рассчитывает калькулятор радиаторов</h2>
<p>Калькулятор переводит готовую тепловую нагрузку помещения в количество секций или отопительных приборов. Он отделяет расчёт теплопотерь здания от подбора конкретной модели и не выдаёт грубые климатические коэффициенты за проект.</p>

<h2>Откуда брать тепловую нагрузку</h2>
<p>СП 60.13330.2020 требует учитывать по помещениям трансмиссионные потери через ограждения, нагрев вентиляционного воздуха, инфильтрацию и расчётные теплопоступления. Наружные параметры принимают по СП 131.13330.2025, характеристики оболочки — с учётом СП 50.13330.2024. Поэтому точный результат начинается с проектной нагрузки конкретного помещения.</p>
<p>Режим Вт/м² оставлен для ранней сметы. Удельное значение вводит сам пользователь: калькулятор не назначает его по названию региона или субъективному «качеству утепления».</p>

<h2>Паспортная теплоотдача и температурный напор</h2>
<p>Если изготовитель уже приводит теплоотдачу при расчётной подаче, обратке и температуре помещения, используйте прямой режим. Если паспорт даёт номинальное значение при другом ΔT, можно применить степенную зависимость <strong>Qраб = Qном × (ΔTраб / ΔTном)^n</strong>. Показатель n берут только из документации или протокола испытаний конкретной модели.</p>

<h2>MIN, REC и MAX</h2>
<p>MIN использует тепловую нагрузку без дополнительного запаса. REC и MAX применяют только явно введённый проектный запас и совпадают — скрытого процента нет. Количество округляется вверх до целой секции или прибора.</p>

<h2>Закупка труб и арматуры</h2>
<p>Длина труб, фитинги, кронштейны, регулирующая арматура и воздухоотводчики вводятся по схеме и ведомости. Калькулятор не назначает материал, диаметр или число соединений по площади и количеству радиаторов: для этого нужен гидравлический расчёт и проект трасс.</p>
`,
    faq: [
      {
        question: "Какой температурный напор указать?",
        answer: "<p>Для рабочего режима калькулятор использует разность между средней температурой воды ((подача + обратка) / 2) и температурой помещения. Номинальный ΔT и показатель n перепишите из паспорта выбранной модели.</p>",
      },
      {
        question: "Почему калькулятор не подбирает котёл?",
        answer: "<p>Нагрузка на отопительные приборы — только часть исходных данных. Источник тепла выбирают с учётом ГВС, режима работы, резервирования, гидравлики, дымоудаления, автоматики и требований к помещению.</p>",
      },
      {
        question: "Почему трубы по умолчанию равны нулю?",
        answer: "<p>Фактическая длина и диаметр зависят от схемы разводки и гидравлического расчёта. Введите длину из проекта или замера, после чего калькулятор округлит её до покупных отрезков.</p>",
      },
    ],
  },
};
