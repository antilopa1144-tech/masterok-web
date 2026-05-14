import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import wallpaperCanonicalSpecJson from "../../../../configs/calculators/wallpaper-canonical.v1.json";
import { computeCanonicalWallpaper } from "../../../../engine/wallpaper";
import type { WallpaperCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex, getSpec } from "../manufacturerField";

const wallpaperCanonicalSpec = wallpaperCanonicalSpecJson as WallpaperCanonicalSpec;
const manufacturerField = buildManufacturerField("wallpaper");

export const wallpaperDef: CalculatorDefinition = {
  id: "wallpaper",
  slug: "oboi",
  formulaVersion: wallpaperCanonicalSpec.formula_version,
  title: "Калькулятор обоев",
  h1: "Калькулятор обоев онлайн — расчёт количества рулонов",
  description: "Рассчитайте точное количество рулонов обоев с учётом высоты комнаты, дверей, окон и раппорта.",
  metaTitle: withSiteMetaTitle("Калькулятор обоев онлайн | Расчёт рулонов"),
  metaDescription: "Бесплатный калькулятор обоев: рассчитайте количество рулонов, полос, клея и грунтовки с учётом высоты комнаты, окон, дверей и раппорта узора.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["обои", "рулоны", "оклейка", "ремонт", "стены"],
  popularity: 78,
  complexity: 1,
  fields: [
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
      key: "rollLength",
      label: "Длина рулона",
      type: "slider",
      unit: "м",
      min: 5,
      max: 25,
      step: 1,
      defaultValue: 10,
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
      key: "doors",
      label: "Количество дверей",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "windows",
      label: "Количество окон",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "reserveRolls",
      label: "Запас рулонов",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
      hint: "Рекомендуемый запас на подрезку, брак и будущий ремонт",
    },
    ...(manufacturerField ? [manufacturerField] : []),
  ],
  calculate(inputs) {
    const manufacturer = getManufacturerByIndex("wallpaper", inputs.manufacturer);
    const brandRollWidth = getSpec<number | undefined>(manufacturer, "rollWidth", undefined);
    const brandRollLength = getSpec<number | undefined>(manufacturer, "rollLength", undefined);

    const inputRollWidth = inputs.rollWidth !== undefined
      ? (inputs.rollWidth > 10 ? inputs.rollWidth / 1000 : inputs.rollWidth)
      : undefined;
    const rollWidth = brandRollWidth ?? inputRollWidth;
    const rollLength = brandRollLength ?? inputs.rollLength;

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
        doorsCount: inputs.doorsCount ?? inputs.doors,
        windowsCount: inputs.windowsCount ?? inputs.windows,
        rollLength,
        rollWidth,
        rapport: inputs.rapport,
        wallpaperType: inputs.wallpaperType ?? 1,
        reserveRolls: inputs.reserveRolls ?? 1,
        reservePercent: inputs.reservePercent ?? 0,
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
    }
    return result;
  },
  formulaDescription: `
**Расчёт обоев:**
Рулоны считаются через полезную площадь стен, раскрой полосы и выход полос из рулона.

Сначала определяется полезная площадь после вычета проёмов, затем — длина полосы с учётом раппорта,
а после этого рассчитывается точное количество рулонов и сценарии MIN/REC/MAX.
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
        "Чтобы показать вилку расхода: идеальный минимум (MIN), рабочий запас с подрезкой/раппортом (REC) и более безопасный вариант (MAX). Это помогает не «упереться» в добор 1 рулона из другой партии на финише.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта обоев</h2>
<p>Количество рулонов рассчитывается по формуле:</p>
<p><strong>Рулоны = &lceil;Полосы / Полос_из_рулона&rceil; + Запас</strong></p>
<ul>
  <li><strong>Полосы</strong> = Периметр / Ширина_рулона &minus; Проёмы</li>
  <li><strong>Полос_из_рулона</strong> = &lfloor;Длина_рулона / (Высота + Раппорт)&rfloor;</li>
  <li><strong>Раппорт</strong> — шаг повтора рисунка (0 — без подгонки)</li>
</ul>

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
<p>При наличии раппорта (подгонки рисунка) выход полос из рулона снижается. Раппорт 32–64 см может увеличить расход на <strong>15–25%</strong>.</p>

<h2>Нормативная база</h2>
<p>Оклеечные работы регламентируются <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия». Раздел 7.4 определяет требования к подготовке основания: ровность, влажность, грунтование. Основание должно быть сухим (влажность &lt; 8%), ровным и загрунтованным.</p>

<h2>Полезные формулы</h2>
<ul>
  <li><strong>Периметр комнаты</strong> = 2 &times; (длина + ширина)</li>
  <li><strong>Вычет на дверь</strong> — обычно ширина 0.8–0.9 м (&asymp; 1 полоса)</li>
  <li><strong>Вычет на окно</strong> — обычно ширина 1.2–1.5 м (&asymp; 2 полосы)</li>
  <li><strong>Рекомендуемый запас</strong> — 1 рулон на будущий ремонт</li>
</ul>
`,
    faq: [
      {
        question: "Сколько рулонов обоев нужно на комнату 15 м²?",
        answer: "<p>Для комнаты 15 м&sup2; (например, 5 &times; 3 м) с высотой потолка 2.7 м, 1 дверью и 1 окном:</p><ul><li>Периметр = 2 &times; (5 + 3) = 16 м</li><li>Полосы (ширина 0.53 м) = 16 / 0.53 &minus; 3 (проёмы) &asymp; <strong>27 полос</strong></li><li>Полос из рулона (без раппорта) = 10.05 / 2.7 = <strong>3 полосы</strong></li><li>Рулоны = 27 / 3 = <strong>9 рулонов</strong> + 1 запас = <strong>10 рулонов</strong></li></ul><p>При раппорте 32 см: полос из рулона = 10.05 / (2.7 + 0.32) = 3 &rarr; расход не изменится, но с раппортом 64 см будет только 2 полосы из рулона, и понадобится уже <strong>14 рулонов</strong>.</p>",
      },
      {
        question: "Как учитывать раппорт при расчёте обоев?",
        answer: "<p>Раппорт — это шаг повторения рисунка, указанный на этикетке рулона. Он увеличивает длину каждой полосы:</p><p><strong>Длина_полосы = Высота_комнаты + Раппорт + 5 см</strong> (запас на подрезку)</p><p>Влияние раппорта на расход:</p><ul><li><strong>Без раппорта (0 см)</strong> — минимальный расход</li><li><strong>Раппорт 16–32 см</strong> — расход увеличивается на 10–15%</li><li><strong>Раппорт 48–64 см</strong> — расход увеличивается на 20–30%</li></ul><p>При большом раппорте выбирайте рулоны длиной 25 м (под покраску) — выход полос существенно выше.</p>",
      },
      {
        question: "Какой клей выбрать для обоев и сколько его нужно?",
        answer: "<p>Тип клея зависит от основы обоев:</p><table><thead><tr><th>Обои</th><th>Клей</th><th>Расход, м&sup2;/уп</th></tr></thead><tbody><tr><td>Бумажные</td><td>КМЦ / универсальный</td><td>30–40</td></tr><tr><td>Виниловые</td><td>Виниловый (Quelyd, Metylan)</td><td>25–35</td></tr><tr><td>Флизелиновые</td><td>Флизелиновый</td><td>25–30</td></tr><tr><td>Тяжёлые, стеклообои</td><td>Усиленный / готовый</td><td>15–20</td></tr></tbody></table><p>На 1 упаковку клея приходится в среднем <strong>5–7 рулонов</strong> обоев. Клей наносится на стену (флизелин) или на полотно с выдержкой 5–10 минут (бумага, винил на бумаге).</p>",
      },
    ],
  },
};



