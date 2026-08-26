import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import wallpaperCanonicalSpecJson from "../../../../configs/calculators/wallpaper-canonical.v1.json";
import { computeCanonicalWallpaper } from "../../../../engine/wallpaper";
import type { WallpaperCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const wallpaperCanonicalSpec = wallpaperCanonicalSpecJson as WallpaperCanonicalSpec;
const manufacturerField = buildManufacturerField("wallpaper");

export const wallpaperDef: CalculatorDefinition = {
  id: "wallpaper",
  slug: "oboi",
  formulaVersion: wallpaperCanonicalSpec.formula_version,
  title: "Калькулятор обоев",
  h1: "Калькулятор обоев онлайн — расчёт количества рулонов",
  description: "Рассчитайте количество рулонов обоев с учётом высоты комнаты, дверей, окон и раппорта.",
  metaTitle: withSiteMetaTitle("Калькулятор обоев: расчёт материалов онлайн"),
  metaDescription: "Бесплатный калькулятор обоев: рассчитайте количество рулонов, полос, клея и грунтовки с учётом высоты комнаты, окон, дверей и раппорта узора.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["обои", "рулоны", "оклейка", "ремонт", "стены"],
  popularity: 78,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По периметру" },
        { value: 1, label: "По площади стен" },
      ],
    },
    {
      key: "area",
      label: "Площадь стен до вычета проёмов",
      type: "number",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 0.1,
      defaultValue: 40,
      group: "byArea",
    },
    {
      key: "perimeter",
      label: "Периметр комнаты",
      type: "slider",
      unit: "м",
      min: 5,
      max: 60,
      step: 0.5,
      defaultValue: 14,
      hint: "Сумма длин всех стен",
      group: "bySize",
    },
    {
      key: "height",
      label: "Высота помещения",
      type: "slider",
      unit: "м",
      min: 2.0,
      max: 5.0,
      step: 0.05,
      defaultValue: 2.7,
    },
    {
      key: "openingsArea",
      label: "Площадь окон и дверей",
      type: "number",
      unit: "м²",
      min: 0,
      max: 500,
      step: 0.1,
      defaultValue: 0,
      hint: "Всегда вычитается из площади для клея; влияние на полосы выбирается ниже",
    },
    {
      key: "openingDeductionMode",
      label: "Уменьшать полосы на площадь проёмов",
      type: "switch",
      defaultValue: 0,
      hint: "По умолчанию выключено: безопасный расчёт целых полос по периметру. Включайте только если подрезки над и под проёмами точно заменят целые полотна",
    },
    {
      key: "rollLength",
      label: "Длина рулона",
      type: "slider",
      unit: "м",
      min: 5,
      max: 25,
      step: 0.05,
      defaultValue: 10.05,
      hint: "Стандарт — 10 м, европейский — 10.05 м",
    },
    {
      key: "rollWidth",
      label: "Ширина рулона",
      type: "slider",
      unit: "мм",
      min: 530,
      max: 1060,
      step: 10,
      defaultValue: 530,
      hint: "Стандарт: 530 мм (0.53 м) или 1060 мм",
    },
    {
      key: "rapport",
      label: "Раппорт (подгонка узора)",
      type: "slider",
      unit: "см",
      min: 0,
      max: 64,
      step: 1,
      defaultValue: 0,
      hint: "Если рисунок без подгонки — 0",
    },
    {
      key: "patternShift",
      label: "Смещение рисунка",
      type: "number",
      unit: "см",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 0,
      hint: "Второе число на этикетке для смещённой стыковки; добавляется как безопасный припуск перед округлением по раппорту",
      hideIf: { key: "rapport", op: "eq", value: 0 },
    },
    {
      key: "trimAllowanceCm",
      label: "Припуск на подрезку",
      type: "number",
      unit: "см",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
    },
    {
      key: "reservePercent",
      label: "Запас к расчётным рулонам",
      type: "slider",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 0,
      hint: "Применяется один раз до округления",
    },
    {
      key: "reserveRolls",
      label: "Запас рулонов",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 0,
      hint: "Дополнительные целые рулоны сверх чистой потребности по полосам",
    },
    { key: "pasteCoverageM2", label: "Покрытие упаковки клея", type: "number", unit: "м²", min: 1, max: 200, step: 1, defaultValue: 30, hint: "Перенесите с этикетки выбранного клея" },
    { key: "pastePackKg", label: "Масса упаковки клея", type: "number", unit: "кг", min: 0.05, max: 20, step: 0.05, defaultValue: 0.25 },
    { key: "primerRate", label: "Расход грунтовки на слой", type: "number", unit: "л/м²", min: 0.01, max: 1, step: 0.01, defaultValue: 0.15, hint: "По паспорту грунтовки и впитываемости основания" },
    { key: "primerLayers", label: "Слоёв грунтовки", type: "number", min: 1, max: 3, step: 1, integerOnly: true, defaultValue: 1 },
    { key: "primerCanL", label: "Объём канистры грунтовки", type: "number", unit: "л", min: 0.5, max: 20, step: 0.5, defaultValue: 5 },
    ...(manufacturerField ? [manufacturerField] : []),
  ],
  calculate(inputs) {
    const manufacturer = getManufacturerByIndex("wallpaper", inputs.manufacturer);
    const inputRollWidth = inputs.rollWidth !== undefined
      ? (inputs.rollWidth > 10 ? inputs.rollWidth / 1000 : inputs.rollWidth)
      : undefined;
    const rollWidth = inputRollWidth;
    const rollLength = inputs.rollLength;

    const result = computeCanonicalWallpaper(
      wallpaperCanonicalSpec,
      {
        inputMode: inputs.inputMode,
        perimeter: inputs.perimeter,
        area: inputs.area,
        roomWidth: inputs.roomWidth,
        roomLength: inputs.roomLength,
        roomHeight: inputs.roomHeight,
        length: inputs.length,
        width: inputs.width,
        height: inputs.height,
        wallHeight: inputs.wallHeight ?? inputs.height,
        openingsArea: inputs.openingsArea,
        openingDeductionMode: inputs.openingDeductionMode,
        doorsCount: inputs.doorsCount ?? inputs.doors,
        windowsCount: inputs.windowsCount ?? inputs.windows,
        rollLength,
        rollWidth,
        rapport: inputs.rapport,
        patternShift: inputs.patternShift,
        trimAllowanceCm: inputs.trimAllowanceCm,
        wallpaperType: inputs.wallpaperType ?? 1,
        reserveRolls: inputs.reserveRolls ?? 0,
        reservePercent: inputs.reservePercent ?? 0,
        pasteCoverageM2: inputs.pasteCoverageM2,
        pastePackKg: inputs.pastePackKg,
        primerRate: inputs.primerRate,
        primerLayers: inputs.primerLayers,
        primerCanL: inputs.primerCanL,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );

    if (manufacturer) {
      result.materials = result.materials.map((m) =>
        m.name.toLowerCase().includes("обои") || m.name.toLowerCase().includes("рулон")
          ? { ...m, name: `${m.name} — ${manufacturer.name}` }
          : m
      );
      result.practicalNotes = [
        ...(result.practicalNotes ?? []),
        `Производитель выбран только для подписи. Размеры рулона не подменяются скрытно: в расчёте использованы значения из полей формы.`,
      ];
    }
    return result;
  },
  formulaDescription: `
**Расчёт обоев:**
Рулоны считаются по целым полотнам, а клей и грунтовка — по полезной площади стен.

По умолчанию проёмы не уменьшают число целых полотен: их подрезки нельзя заранее считать полной заменой полосы.
Длина полотна включает припуск и смещение рисунка, после чего округляется вверх до целого раппорта.
MIN показывает чистую потребность, REC применяет выбранный запас один раз, а MAX предусматривает минимум
один запасной рулон на будущий ремонт.
  `,
  howToUse: [
    "Измерьте периметр комнаты и высоту потолков",
    "Укажите параметры рулона и раппорт (шаг рисунка)",
    "Нажмите «Рассчитать» — получите рулоны, клей, грунтовку и расходники",
  ],
  expertTips: [
    {
      title: "Партия обоев",
      content: "При покупке обязательно проверяйте номер партии (Batch No) на всех рулонах. Обои из разных партий могут отличаться по оттенку, что будет заметно на стене.",
      author: "Мастер-отделочник"
    },
    {
      title: "Сквозняки",
      content: "После оклейки обоев окна и двери должны быть закрыты минимум 24 часа. Сквозняк приведет к неравномерному высыханию и расхождению швов.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Нужно ли мазать клеем сами обои?",
      answer:
        "Зависит от типа обоев и инструкции производителя. Флизелин чаще клеят «клей на стену», а бумажные и часть виниловых — с нанесением на полотно (иногда с выдержкой). Ошибка даёт пузыри и слабый шов, поэтому лучше свериться с этикеткой рулона.",
    },
    {
      question: "Почему калькулятор показывает три сценария?",
      answer:
        "MIN — чистая потребность по полосам и раппорту. REC добавляет только указанный вами процент и запасные рулоны. MAX сохраняет выбранный запас и предусматривает минимум один целый рулон на будущий ремонт.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта обоев</h2>
<p>Количество рулонов рассчитывается по формуле:</p>
<p><strong>Рулоны = &lceil;(Полосы / Полос_из_рулона) &times; (1 + Запас, %) + Запасные_рулоны&rceil;</strong></p>
<ul>
  <li><strong>Полосы, безопасный режим</strong> = &lceil;Периметр / Ширина_рулона&rceil;</li>
  <li><strong>Полосы с использованием подрезок</strong> = &lceil;(Полезная_площадь / Высота) / Ширина_рулона&rceil;</li>
  <li><strong>Длина полосы</strong> = &lceil;(Высота + припуск + смещение) / Раппорт&rceil; &times; Раппорт; без рисунка — Высота + припуск</li>
  <li><strong>Полос_из_рулона</strong> = &lfloor;Длина_рулона / Длина_полосы&rfloor;</li>
  <li><strong>Раппорт</strong> — шаг повтора рисунка (0 — без подгонки)</li>
</ul>
<p>Проёмы всегда уменьшают площадь для клея и грунтовки. Уменьшать по ним число полотен безопасно только тогда, когда размеры и расположение проёмов действительно позволяют использовать короткие подрезки.</p>

<h2>Стандартные размеры рулонов</h2>
<table>
  <thead>
    <tr><th>Тип обоев</th><th>Ширина, м</th><th>Длина, м</th><th>Площадь рулона, м&sup2;</th></tr>
  </thead>
  <tbody>
    <tr><td>Бумажные, виниловые (стандарт)</td><td>0.53</td><td>10.05</td><td>5.3</td></tr>
    <tr><td>Флизелиновые (широкие)</td><td>1.06</td><td>10.05</td><td>10.7</td></tr>
    <tr><td>Под покраску</td><td>1.06</td><td>25.0</td><td>26.5</td></tr>
  </tbody>
</table>
<p>При наличии раппорта выход полотен из рулона может снизиться. Расход меняется ступенчато, поэтому калькулятор сначала определяет длину одного полотна, а затем считает, сколько целых полотен помещается в рулоне.</p>

<h2>Нормативная база</h2>
<p>Оклеечные работы регламентируются <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия». Раздел 7.4 определяет требования к подготовке основания: ровность, влажность, грунтование. Основание должно быть сухим (влажность &lt; 8%), ровным и загрунтованным.</p>

<h2>Что проверить перед покупкой</h2>
<ul>
  <li><strong>Периметр комнаты</strong> = 2 &times; (длина + ширина)</li>
  <li><strong>Раппорт и смещение</strong> — перенесите оба значения с этикетки рулона</li>
  <li><strong>Покрытие клея</strong> — укажите площадь, заявленную для выбранного типа обоев</li>
  <li><strong>Расход грунтовки</strong> — возьмите из паспорта материала с учётом числа слоёв</li>
  <li><strong>Партия</strong> — все рулоны должны иметь один номер партии и оттенка</li>
</ul>
`,
    faq: [
      {
        question: "Сколько рулонов нужно для комнаты 5 × 3 м?",
        answer: "<p>При высоте 2.7 м, рулоне 0.53 &times; 10.05 м и обоях без рисунка безопасный расчёт такой:</p><ul><li>Периметр = 2 &times; (5 + 3) = 16 м</li><li>Полосы = &lceil;16 / 0.53&rceil; = <strong>31 полоса</strong></li><li>Длина полосы с припуском 10 см = 2.8 м</li><li>Из рулона выходит &lfloor;10.05 / 2.8&rfloor; = <strong>3 полосы</strong></li><li>Рулоны = &lceil;31 / 3&rceil; = <strong>11 рулонов</strong></li></ul><p>Дверь и окна по умолчанию уменьшают расход клея, но не число целых полотен. Включайте вычет проёмов из полотен только если уверены, что подрезки можно использовать.</p>",
      },
      {
        question: "Как учитывать раппорт при расчёте обоев?",
        answer: "<p>Раппорт — шаг повторения рисунка на этикетке рулона. К высоте стены добавляются припуск на подрезку и указанное смещение, затем длина полотна округляется вверх до ближайшего целого раппорта:</p><p><strong>Длина_полосы = &lceil;(Высота + припуск + смещение) / Раппорт&rceil; &times; Раппорт</strong></p><p>Расход меняется ступенчато: пока из рулона выходит прежнее число полотен, покупка не увеличивается. Перенесите с этикетки и раппорт, и смещение рисунка.</p>",
      },
      {
        question: "Какой клей выбрать для обоев и сколько его нужно?",
        answer: "<p>Выберите клей, который производитель разрешает для вашего типа и массы обоев. В калькулятор перенесите с упаковки две величины: площадь покрытия одной упаковки и её массу.</p><p>Калькулятор делит полезную площадь стен на заявленное покрытие и округляет число упаковок вверх. Универсальная норма «упаковок на рулон» не используется, потому что концентрация и покрытие у составов различаются.</p>",
      },
    ],
  },
};
