import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalScreed } from "../../../../engine/screed";
import screedSpec from "../../../../configs/calculators/screed-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
export const screedDef: CalculatorDefinition = {
  id: "screed",
  slug: "styazhka",
  title: "Калькулятор стяжки пола",
  h1: "Калькулятор стяжки пола онлайн — расчёт цемента и песка",
  description: "Рассчитайте количество цемента, песка и воды для цементно-песчаной стяжки. Учёт толщины слоя.",
  metaTitle: withSiteMetaTitle("Калькулятор стяжки пола | Расчёт цемента и ЦПС"),
  metaDescription: "Бесплатный калькулятор стяжки: рассчитайте цемент, песок и готовую ЦПС для стяжки пола с учётом площади, толщины слоя и типа смеси.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["стяжка", "цементная стяжка", "ЦПС", "цемент", "пол", "наливной пол"],
  popularity: 75,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "thickness",
      label: "Толщина стяжки",
      type: "slider",
      unit: "мм",
      min: 30,
      max: 200,
      step: 5,
      defaultValue: 50,
      hint: "Минимум по СНиП: 30 мм для армирования, 40 мм для тёплого пола",
    },
    {
      key: "screedType",
      label: "Тип стяжки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ЦПС (цемент + песок 1:3)" },
        { value: 1, label: "Готовая ЦПС М150 (мешки 40/50 кг)" },
        { value: 2, label: "Полусухая стяжка" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = screedSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalScreed(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

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
**Расчёт стяжки:**
Объём (м³) = Площадь × Толщина × 1.15 (запас на усадку)

Пропорция ЦПС 1:3:
- Цемент: 1/4 от объёма = ~300 кг/м³
- Песок: 3/4 от объёма = ~900 кг/м³ ≈ 1.4 т

Готовая ЦПС М150: ~2000 кг/м³ (плотность смеси)

По СНиП 3.04.01-87: минимальная толщина стяжки — 30 мм
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Укажите толщину стяжки (обычно 40–70 мм, минимум 30 мм)",
    "Выберите тип: самомесная ЦПС 1:3 или готовая в мешках",
    "Нажмите «Рассчитать» — получите цемент, песок или мешки ЦПС",
  ],
faq: [
    {
      question: "Какая минимальная толщина стяжки пола?",
      answer:
        "Для обычной ЦПС ориентир — от ~30 мм с учётом основания и армирования; в жилых комнатах чаще 40–70 мм. Над коммуникациями и тёплым полом требования строже — сверьтесь со сметой узла и СП 29.",
    },
    {
      question: "Что выгоднее: готовая ЦПС или самомесная смесь?",
      answer:
        "В малогабарите и при ручном замесе готовая смесь даёт предсказуемый состав. На больших площадях с контролируемым замесом и доставкой песка самомес может быть дешевле, но дороже по организации работ.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта стяжки пола</h2>
<p>Объём материалов для цементно-песчаной стяжки рассчитывается по формуле:</p>
<p><strong>V = S &times; h &times; 1.08</strong></p>
<ul>
  <li><strong>V</strong> — объём готовой смеси (м&sup3;)</li>
  <li><strong>S</strong> — площадь помещения (м&sup2;)</li>
  <li><strong>h</strong> — толщина стяжки (м)</li>
  <li><strong>1.08</strong> — коэффициент на усадку и потери</li>
</ul>

<h2>Расход материалов на 1 м&sup3; стяжки</h2>
<table>
  <thead>
    <tr><th>Тип стяжки</th><th>Цемент М400</th><th>Песок</th><th>Вода</th></tr>
  </thead>
  <tbody>
    <tr><td>ЦПС 1:3 (ручной замес)</td><td>~300 кг (6 мешков)</td><td>~900 кг (~0.6 м&sup3;)</td><td>~150 л</td></tr>
    <tr><td>ЦПС 1:4 (облегчённая)</td><td>~250 кг (5 мешков)</td><td>~1 000 кг</td><td>~140 л</td></tr>
    <tr><td>Готовая ЦПС М150</td><td colspan="3">~2 000 кг/м&sup3; (40&ndash;50 мешков по 40/50 кг)</td></tr>
    <tr><td>Полусухая стяжка</td><td>~300 кг</td><td>~900 кг</td><td>~80 л</td></tr>
  </tbody>
</table>

<h2>Минимальная толщина стяжки</h2>
<ul>
  <li><strong>30 мм</strong> — минимум по СНиП для армированной стяжки</li>
  <li><strong>40 мм</strong> — над трубами тёплого пола</li>
  <li><strong>50 мм</strong> — стандартная толщина для жилых помещений</li>
  <li><strong>70&ndash;100 мм</strong> — при значительных перепадах основания</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 29.13330.2011</strong> &laquo;Полы&raquo; (актуализированная редакция СНиП 2.03.13-88)</li>
  <li><strong>СНиП 3.04.01-87</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
  <li><strong>ГОСТ 28013-98</strong> &laquo;Растворы строительные. Общие технические условия&raquo;</li>
</ul>
<p>Набор прочности стяжки: <strong>70% за 7 суток</strong>, 100% за 28 суток при +20&deg;C. Готовность к укладке покрытия: влажность стяжки не более <strong>2% CM</strong> (для ламината и паркета).</p>
`,
    faq: [
      {
        question: "Сколько цемента нужно на стяжку 50 мм?",
        answer: "<p>Расчёт для стяжки ЦПС 1:3 толщиной 50 мм на площадь 20 м&sup2;:</p><ul><li>Объём: 20 &times; 0.05 &times; 1.08 = <strong>1.08 м&sup3;</strong></li><li>Цемент М400: 1.08 &times; 300 = <strong>324 кг (7 мешков по 50 кг)</strong></li><li>Песок: 1.08 &times; 900 = <strong>972 кг (~0.65 м&sup3;)</strong></li></ul><p>Для готовой ЦПС М150: 1.08 &times; 2 000 = 2 160 кг &rarr; <strong>54 мешка по 40 кг</strong> или <strong>44 мешка по 50 кг</strong>.</p>",
      },
      {
        question: "Нужно ли армировать стяжку пола?",
        answer: "<p>Армирование стяжки рекомендуется в следующих случаях:</p><ul><li>Толщина менее <strong>40 мм</strong></li><li>Стяжка по <strong>утеплителю</strong> (плавающая)</li><li>Стяжка с <strong>тёплым полом</strong></li><li>Основание с <strong>трещинами</strong> или неоднородное</li><li>Повышенные <strong>эксплуатационные нагрузки</strong></li></ul><p>Применяется кладочная сетка 100&times;100&times;4 мм или фиброволокно 0.6&ndash;0.9 кг/м&sup3;. По <strong>СП 29.13330</strong> минимальная толщина армированной стяжки &mdash; 30 мм.</p>",
      },
      {
        question: "Через сколько дней после заливки стяжки можно укладывать покрытие?",
        answer: "<p>Сроки готовности стяжки к укладке финишного покрытия:</p><table><thead><tr><th>Тип стяжки</th><th>Толщина</th><th>Срок, сут.</th></tr></thead><tbody><tr><td>ЦПС мокрая</td><td>50 мм</td><td>28&ndash;35</td></tr><tr><td>ЦПС мокрая</td><td>70&ndash;100 мм</td><td>45&ndash;60</td></tr><tr><td>Полусухая</td><td>50 мм</td><td>14&ndash;21</td></tr><tr><td>Наливной пол</td><td>5&ndash;20 мм</td><td>3&ndash;14</td></tr></tbody></table><p>Проверка готовности: остаточная влажность не более <strong>2% CM</strong> для ламината и паркета, <strong>3% CM</strong> для плитки. Контроль &mdash; карбидным гигрометром или плёночным тестом.</p>",
      },
    ],
  },
};

