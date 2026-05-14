import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalWallPanels } from "../../../../engine/wall-panels";
import wallpanelsSpec from "../../../../configs/calculators/wall-panels-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const wallPanelsDef: CalculatorDefinition = {
  id: "walls_panels",
  slug: "paneli-dlya-sten",
  title: "Калькулятор панелей для стен",
  h1: "Калькулятор панелей для стен — ПВХ, МДФ, 3D панели",
  description: "Рассчитайте количество декоративных панелей (ПВХ, МДФ, 3D), клея и плинтусов для отделки стен.",
  metaTitle: withSiteMetaTitle("Калькулятор панелей для стен | ПВХ, МДФ, 3D"),
  metaDescription: "Бесплатный калькулятор панелей для стен: рассчитайте ПВХ, МДФ или 3D панели, клей и плинтусы по площади отделки стен в комнате.",
  category: "walls",
  categorySlug: "steny",
  tags: ["панели для стен", "ПВХ панели", "МДФ панели", "3D панели", "вагонка", "декоративные панели"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 15,
    },
    {
      key: "panelType",
      label: "Тип панели",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ПВХ панели (25 см × 3 м)" },
        { value: 1, label: "МДФ панели (19 см × 2.6 м)" },
        { value: 2, label: "3D панели (50×50 см)" },
        { value: 3, label: "Вагонка (10 см × 3 м)" },
        { value: 4, label: "Декоративный камень (0.5 м²/упак.)" },
      ],
    },
    {
      key: "mountMethod",
      label: "Способ монтажа",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "На клей" },
        { value: 1, label: "На обрешётку (рейки)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = wallpanelsSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalWallPanels(spec, inputs, factorTable);

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
**Расчёт панелей для стен:**
- Запас +10% на подрезку
- ПВХ 250×3000: ~1.32 шт/м²
- МДФ 190×2600: ~2.02 шт/м²
- Вагонка 100×3000: ~3.33 шт/м²
  `,
  howToUse: [
    "Введите площадь стен",
    "Выберите тип панели",
    "Укажите способ монтажа",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какой запас панелей для стен брать на подрезку?",
      answer:
        "Обычно 5–10%; ближе к 10% при сложной планировке, углах, нишах и подборе рисунка — чтобы не добирать пару панелей другой партии.",
    },
    {
      question: "Что выбрать: ПВХ, МДФ или 3D панели?",
      answer:
        "ПВХ — влажные зоны (кухня, санузел): влагостойкость и простой уход. МДФ — сухие жилые комнаты с более «теплым» видом. 3D/гипсовые акценты — там, где нет постоянной влажности и важен декор. Выбор по влажности, ударной нагрузке и регламенту монтажа.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта стеновых панелей</h2>
<p>Количество панелей рассчитывается по формуле:</p>
<p><strong>N = S &divide; S<sub>панели</sub> &times; K<sub>запас</sub></strong></p>
<ul>
  <li><strong>S</strong> — площадь стен за вычетом проёмов (м²)</li>
  <li><strong>S<sub>панели</sub></strong> — рабочая площадь одной панели (м²)</li>
  <li><strong>K<sub>запас</sub></strong> — коэффициент запаса (1.05–1.10)</li>
</ul>

<h2>Типовые размеры панелей</h2>
<table>
  <thead><tr><th>Тип панели</th><th>Длина, мм</th><th>Ширина, мм</th><th>Рабочая площадь, м²</th></tr></thead>
  <tbody>
    <tr><td>ПВХ</td><td>2700–3000</td><td>250–375</td><td>0.68–1.13</td></tr>
    <tr><td>МДФ</td><td>2600</td><td>238–325</td><td>0.62–0.85</td></tr>
    <tr><td>3D гипсовые</td><td>500</td><td>500</td><td>0.25</td></tr>
    <tr><td>Вагонка</td><td>2000–3000</td><td>96</td><td>0.19–0.29</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Монтаж стеновых панелей регламентируется <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия». Для влажных помещений используются влагостойкие панели по <strong>ГОСТ 19111-2001</strong> (ПВХ) или <strong>ГОСТ 32687-2014</strong> (МДФ).</p>

<h2>Обрешётка и крепёж</h2>
<ul>
  <li><strong>Шаг обрешётки</strong>: 400–600 мм (деревянный брусок 20×40 или металлический профиль)</li>
  <li><strong>Кляймеры</strong>: 2–3 шт на каждую панель в каждом ряду обрешётки</li>
  <li><strong>Стартовый/финишный профиль</strong>: по периметру стены</li>
  <li><strong>Плинтус</strong>: периметр пола за вычетом дверных проёмов</li>
</ul>
`,
    faq: [
      {
        question: "Сколько панелей ПВХ нужно на стену 10 м²?",
        answer: "<p>При стандартном размере ПВХ панели <strong>2700×250 мм</strong> (рабочая площадь ~0.675 м²) на 10 м² потребуется:</p><p>10 &divide; 0.675 &times; 1.05 = <strong>~16 панелей</strong> (с 5% запасом на подрезку).</p><p>Дополнительно понадобятся: стартовый профиль (по периметру), внутренние и наружные углы, плинтус потолочный. Если ширина панели 375 мм — количество уменьшится до ~13 штук.</p>",
      },
      {
        question: "Как крепить панели — на клей или на обрешётку?",
        answer: "<p>Зависит от ровности стен и назначения помещения:</p><ul><li><strong>На клей (жидкие гвозди)</strong> — только на идеально ровные стены (перепад до 3 мм). Плюс: экономия пространства. Минус: демонтаж разрушает панели и стену.</li><li><strong>На обрешётку</strong> — универсальный способ. Скрывает неровности до 50 мм, позволяет проложить утепление и коммуникации. Обязателен для влажных помещений (вентзазор за панелями).</li></ul><p>Для ванных и кухонь всегда рекомендуется обрешётка — она обеспечивает вентиляцию и предотвращает скопление конденсата за панелями.</p>",
      },
      {
        question: "Какие панели лучше для ванной комнаты?",
        answer: "<p>Для ванной подходят только <strong>влагостойкие ПВХ панели</strong>. МДФ и 3D гипсовые панели в мокрых зонах использовать нельзя — они разбухнут от влаги.</p><p>Требования к панелям для ванной:</p><ul><li>Толщина стенки <strong>не менее 8 мм</strong> (тонкие панели 5 мм прогибаются)</li><li>Шов <strong>бесшовного типа</strong> (через стыки не проникает вода)</li><li>Обрешётка из <strong>пластикового или оцинкованного</strong> профиля (дерево сгниёт)</li><li>Крепление <strong>кляймерами из нержавеющей стали</strong></li></ul>",
      },
    ],
  },
};
