import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalStripFoundation } from "../../../../engine/strip-foundation";
import stripfoundationSpec from "../../../../configs/calculators/strip-foundation-canonical.v1.json";
import frostDepthRf from "../../../../configs/regional/frost-depth-rf.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

// Маппинг регионов: index → id для UI (FieldOption.value — number).
// Индекс 0 зарезервирован для «не указан» (без региональной валидации).
const REGION_INDEX_TO_ID: Record<number, string> = (() => {
  const map: Record<number, string> = { 0: "" };
  (frostDepthRf.regions as Array<{ id: string }>).forEach((region, i) => {
    map[i + 1] = region.id;
  });
  return map;
})();

const REGION_OPTIONS = (() => {
  const opts: Array<{ value: number; label: string }> = [
    { value: 0, label: "Не указан (без проверки промерзания)" },
  ];
  (frostDepthRf.regions as Array<{ id: string; name: string; min_frost_depth_m: number }>).forEach((r, i) => {
    opts.push({
      value: i + 1,
      label: `${r.name} (норма ${r.min_frost_depth_m.toFixed(1)} м)`,
    });
  });
  return opts;
})();

export const stripFoundationDef: CalculatorDefinition = {
  id: "strip_foundation",
  slug: "lentochnyy-fundament",
  title: "Калькулятор ленточного фундамента",
  h1: "Калькулятор ленточного фундамента — расчёт бетона и арматуры",
  description: "Рассчитайте объём бетона, количество арматуры и опалубки для ленточного фундамента дома.",
  metaTitle: withSiteMetaTitle("Калькулятор ленточного фундамента | Расчёт бетона"),
  metaDescription: "Бесплатный калькулятор ленточного фундамента: рассчитайте бетон, арматуру, опалубку и объём ленты по периметру и размерам фундамента.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["ленточный фундамент", "фундамент", "бетон", "арматура", "опалубка"],
  popularity: 80,
  complexity: 3,
  fields: [
    {
      key: "perimeter",
      label: "Периметр ленты (все стены)",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 40,
      hint: "Общая длина всех несущих стен с учётом внутренних",
    },
    {
      key: "width",
      label: "Ширина ленты",
      type: "slider",
      unit: "мм",
      min: 200,
      max: 600,
      step: 50,
      defaultValue: 400,
    },
    {
      key: "depth",
      label: "Глубина ленты (ниже уровня земли)",
      type: "slider",
      unit: "мм",
      min: 300,
      max: 2000,
      step: 50,
      defaultValue: 700,
    },
    {
      key: "aboveGround",
      label: "Высота над землёй (цоколь)",
      type: "slider",
      unit: "мм",
      min: 0,
      max: 600,
      step: 50,
      defaultValue: 300,
    },
    {
      key: "reinforcement",
      label: "Армирование",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "2 нитки Ø12 мм (лёгкие постройки)" },
        { value: 1, label: "4 нитки Ø12 мм (дом 1–2 этажа)" },
        { value: 2, label: "4 нитки Ø14 мм (тяжёлые конструкции)" },
        { value: 3, label: "6 ниток Ø12 мм (широкая лента)" },
      ],
    },
    {
      key: "deliveryMethod",
      label: "Способ заливки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Миксер (самослив)" },
        { value: 1, label: "Бетононасос (+0.5 м³ потери)" },
        { value: 2, label: "Вручную (замес на месте)" },
      ],
    },
    {
      key: "regionIndex",
      label: "Регион (для проверки глубины промерзания)",
      type: "select",
      defaultValue: 0,
      options: REGION_OPTIONS,
      hint: "Если регион указан — калькулятор сравнит глубину фундамента с нормативной по СНиП 2.02.01-83*. Если depth ниже нормы — предупредит о риске морозного пучения.",
    },
    {
      key: "soilType",
      label: "Тип грунта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Суглинки и глины (типовое)" },
        { value: 1, label: "Супеси (×1.22)" },
        { value: 2, label: "Мелкий и пылеватый песок (×1.27)" },
        { value: 3, label: "Крупный песок и гравий (×1.30)" },
      ],
      hint: "Поправочные коэффициенты глубины промерзания по Приложению 1 СНиП 2.02.01-83*.",
    },
  ],
  calculate(inputs) {
    const spec = stripfoundationSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    // UI передаёт regionIndex (number) — преобразуем в regionId (string) для engine.
    // Если inputs.regionId уже задан как строка (программный API/тесты) —
    // оставляем без изменений.
    const rawRegionId = (inputs as Record<string, unknown>).regionId;
    let resolvedRegionId: string | undefined;
    if (typeof rawRegionId === "string" && rawRegionId.length > 0) {
      resolvedRegionId = rawRegionId;
    } else {
      const regionIndex = Math.round(inputs.regionIndex ?? 0);
      const mapped = REGION_INDEX_TO_ID[regionIndex] ?? "";
      resolvedRegionId = mapped || undefined;
    }
    const engineInputs = {
      ...inputs,
      regionId: resolvedRegionId,
    };
    const canonical = computeCanonicalStripFoundation(spec, engineInputs as any, factorTable);

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
**Расчёт ленточного фундамента (нормы РФ):**

1. **Бетон**: Объём = Периметр × Ширина × Высота. Запас 7% учитывает усадку при вибрировании и погрешность приёмки.
2. **Арматура**: 
   - Продольная: нахлёст 12% (по 40 диаметров в местах стыка).
   - Хомуты: шаг 400 мм, защитный слой бетона 50 мм с каждой стороны.
3. **Опалубка**: Расчёт по площади боковых поверхностей цокольной части.

Рекомендуемая марка бетона: М250 (В20) и выше.
  `,
  howToUse: [
    "Введите полный периметр ленты (все несущие стены)",
    "Укажите ширину ленты (обычно на 100 мм шире стены)",
    "Задайте глубину залегания и высоту цоколя",
    "Выберите способ заливки (насос требует доп. объёма)",
    "Опционально: укажите регион и тип грунта — калькулятор предупредит, если глубина ниже нормы промерзания",
    "Нажмите «Рассчитать» — получите полную смету материалов",
  ],
  expertTips: [
    {
      title: "Защитный слой",
      content: "Арматура не должна касаться земли или опалубки. Используйте пластиковые фиксаторы («стульчики» и «звёздочки»), чтобы обеспечить слой бетона 50 мм. Это защитит металл от коррозии.",
      author: "Иваныч, прораб"
    },
    {
      title: "Продухи в цоколе",
      content: "Не забудьте заложить гильзы для продухов (вентиляции подполья) и ввода коммуникаций (вода, канализация) до заливки бетона. Долбить готовый монолит — дорого и долго.",
      author: "Инженер-строитель"
    }
  ],
  faq: [
    {
      question: "Нужна ли подбетонка?",
      answer:
        "Не всегда: часто достаточно уплотнённой песчано-гравийной подушки и отсечки под ленту. Подбетонку делают, когда нужно ровное чистое основание под арматуру и гидроизоляцию, слабое или «мокрое» дно траншеи, или так требует проектный узел.",
    },
    {
      question: "Когда можно снимать опалубку?",
      answer:
        "Боковую опалубку часто снимают через несколько суток, когда кромка держится без крошения, но нагружать ленту и засыпать грунтом следует по фактической прочности бетона и регламенту для вашей марки и температуры (обычно ориентируются на контроль прочности, а не на один фиксированный день).",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта ленточного фундамента</h2>
<p>Объём бетона для ленточного фундамента определяется по формуле:</p>
<p><strong>V = P &times; W &times; H</strong></p>
<ul>
  <li><strong>V</strong> — объём бетона (м&sup3;)</li>
  <li><strong>P</strong> — периметр ленты с учётом внутренних стен (м)</li>
  <li><strong>W</strong> — ширина ленты (м)</li>
  <li><strong>H</strong> — полная высота = глубина заложения + высота цоколя (м)</li>
</ul>
<p>К объёму добавляется запас 7% на усадку при вибрировании и погрешность приёмки бетона.</p>

<h2>Расчёт арматуры для ленточного фундамента</h2>
<table>
  <thead>
    <tr><th>Параметр</th><th>Значение</th><th>Примечание</th></tr>
  </thead>
  <tbody>
    <tr><td>Продольная арматура</td><td>&Oslash;12&ndash;14 мм, A500С</td><td>4&ndash;6 ниток</td></tr>
    <tr><td>Нахлёст стержней</td><td>40d (480&ndash;560 мм)</td><td>+12% к общей длине</td></tr>
    <tr><td>Хомуты (поперечная)</td><td>&Oslash;6&ndash;8 мм, A240</td><td>Шаг 400 мм</td></tr>
    <tr><td>Защитный слой бетона</td><td>50 мм</td><td>С каждой стороны</td></tr>
  </tbody>
</table>
<p>Расчёт опалубки производится по площади боковых поверхностей цокольной части фундамента.</p>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 22.13330.2016</strong> &laquo;Основания зданий и сооружений&raquo;</li>
  <li><strong>СП 63.13330.2018</strong> &laquo;Бетонные и железобетонные конструкции&raquo;</li>
  <li><strong>ГОСТ 5781-82</strong> &laquo;Сталь горячекатаная для армирования&raquo;</li>
  <li><strong>СП 50-101-2004</strong> &laquo;Проектирование и устройство оснований и фундаментов&raquo;</li>
</ul>
<p>Рекомендуемая марка бетона для ленточного фундамента частного дома: <strong>М250 (В20)</strong> и выше. При высоком уровне грунтовых вод &mdash; не ниже М300 с водонепроницаемостью W6.</p>
`,
    faq: [
      {
        question: "Как рассчитать количество бетона для ленточного фундамента?",
        answer: "<p>Для расчёта объёма бетона используйте формулу: <strong>V = P &times; W &times; H</strong>, где P &mdash; общий периметр ленты (включая внутренние стены), W &mdash; ширина, H &mdash; высота.</p><p>Пример: периметр 40 м, ширина 0.4 м, высота 1 м = 40 &times; 0.4 &times; 1 = <strong>16 м&sup3;</strong>. С запасом 7%: 16 &times; 1.07 = <strong>17.12 м&sup3;</strong>.</p><ul><li>При заливке бетононасосом добавьте 0.3&ndash;0.5 м&sup3; на потери в системе</li><li>Рекомендуемая марка &mdash; М250 (В20) для жилых домов</li></ul>",
      },
      {
        question: "Какой диаметр арматуры нужен для ленточного фундамента?",
        answer: "<p>Диаметр продольной рабочей арматуры зависит от ширины ленты и нагрузки:</p><ul><li><strong>&Oslash;12 мм</strong> &mdash; для лёгких построек (каркасные, деревянные дома)</li><li><strong>&Oslash;12&ndash;14 мм</strong> &mdash; стандартный вариант для домов 1&ndash;2 этажа</li><li><strong>&Oslash;14&ndash;16 мм</strong> &mdash; для тяжёлых конструкций (кирпичные, блочные дома)</li></ul><p>Поперечные хомуты делают из арматуры <strong>&Oslash;6&ndash;8 мм</strong> с шагом 400 мм. Защитный слой бетона &mdash; не менее 50 мм по <strong>СП 63.13330</strong>.</p>",
      },
      {
        question: "На какую глубину закладывать ленточный фундамент?",
        answer: "<p>Глубина заложения фундамента зависит от глубины промерзания грунта в регионе и типа грунта:</p><table><thead><tr><th>Регион</th><th>Глубина промерзания</th><th>Минимум заложения</th></tr></thead><tbody><tr><td>Москва, ЦФО</td><td>1.4 м</td><td>0.7&ndash;1.5 м</td></tr><tr><td>Санкт-Петербург</td><td>1.2 м</td><td>0.6&ndash;1.3 м</td></tr><tr><td>Новосибирск</td><td>2.2 м</td><td>1.1&ndash;2.3 м</td></tr></tbody></table><p>Для мелкозаглублённых фундаментов (МЗЛФ) допускается заложение 0.3&ndash;0.7 м при условии утепления отмостки по <strong>СП 22.13330</strong>.</p>",
      },
    ],
  },
};


