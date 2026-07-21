import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalScreed } from "../../../../engine/screed";
import screedSpec from "../../../../configs/calculators/screed-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { applyScreedMix } from "./screed-mix";
export const screedDef: CalculatorDefinition = {
  id: "screed",
  slug: "styazhka",
  title: "Калькулятор стяжки пола",
  h1: "Калькулятор стяжки пола онлайн — расчёт цемента и песка",
  description: "Рассчитайте количество цемента, песка и воды для цементно-песчаной стяжки. Учёт толщины слоя.",
  metaTitle: withSiteMetaTitle("Калькулятор стяжки пола: расчёт материалов онлайн"),
  metaDescription: "Бесплатный калькулятор стяжки пола: рассчитайте цемент и песок для ручного замеса (М400/М500, пропорция 1:3 или 1:4), готовый пескобетон в мешках или полусухую стяжку с учётом площади, толщины и запаса.",
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
      hint: "40–50 мм — обычная стяжка в квартире; от 40 мм — над трубами тёплого пола; 30 мм — минимум только с армированием. Меньше 30 мм трескается.",
    },
    {
      key: "screedType",
      label: "Способ устройства",
      type: "select",
      defaultValue: 0,
      fullWidth: true,
      options: [
        { value: 0, label: "Ручной замес (цемент + песок отдельно)" },
        { value: 1, label: "Готовая смесь в мешках (пескобетон)" },
        { value: 2, label: "Полусухая стяжка (механизированная)" },
      ],
      hint: "Ручной замес дешевле по материалам, но дольше и зависит от рук. Готовая смесь — предсказуемый состав, удобно для квартиры. Полусухая — быстро сохнет и ровная, но нужна машина и бригада.",
    },
    // ── Ручной замес: марка цемента + пропорция ──
    {
      key: "cementGrade",
      label: "Марка цемента",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Портландцемент М400 — универсальный" },
        { value: 1, label: "Портландцемент М500 — крепче, цемента меньше" },
      ],
      hint: "М400 — стандарт для стяжки в квартире и доме. М500 крепче: того же раствора получаешь больше, цемента уходит меньше — берут для гаражей, нагруженных полов.",
      hideIf: { key: "screedType", op: "ne", value: 0 },
    },
    {
      key: "mixProportion",
      label: "Пропорция цемент : песок",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1 : 3 — прочнее (жилые комнаты)" },
        { value: 1, label: "1 : 4 — экономнее (нежилые, подсобки)" },
      ],
      hint: "1:3 — рабочая пропорция для жилья, раствор М150–М200. 1:4 экономит цемент, но раствор слабее — под кладовку, гараж, технические помещения.",
      hideIf: { key: "screedType", op: "ne", value: 0 },
    },
    // ── Готовая смесь: номенклатура мешков ──
    {
      key: "readyMix",
      label: "Готовая смесь",
      type: "select",
      defaultValue: 0,
      fullWidth: true,
      options: [
        { value: 0, label: "Пескобетон М300 (Каменный цветок, Русеан и т.п.)" },
        { value: 1, label: "Универсальная цементно-песчаная смесь М200 (для тонких слоёв)" },
      ],
      hint: "Пескобетон М300 — рабочая смесь для стяжки от 30 мм, мешки 40 кг. Цементно-песчаная смесь М200 чуть слабее — для тонких выравнивающих слоёв. Расход ~20 кг сухой смеси на 1 м² при слое 10 мм.",
      hideIf: { key: "screedType", op: "ne", value: 1 },
    },
  ],
  calculate(inputs) {
    const spec = screedSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalScreed(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

    const base = {
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

    // Веб-надстройка: марка цемента/пропорция (ручной) или вид готовой смеси.
    // Канонический результат не меняется для дефолта М400 1:3 — паритет с mobile.
    return applyScreedMix(base, {
      screedType: inputs.screedType,
      cementGrade: inputs.cementGrade,
      mixProportion: inputs.mixProportion,
      readyMix: inputs.readyMix,
    });
  },
  formulaDescription: `
**Расчёт стяжки:**
Объём (м³) = Площадь × Толщина × 1.15 (запас на усадку)

Пропорция цементно-песчаной смеси 1:3:
- Цемент: 1/4 от объёма = ~300 кг/м³
- Песок: 3/4 от объёма = ~900 кг/м³ ≈ 1.4 т

Готовая цементно-песчаная смесь М150: ~2000 кг/м³ (плотность смеси)

По СНиП 3.04.01-87: минимальная толщина стяжки — 30 мм
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Укажите толщину стяжки (обычно 40–70 мм, минимум 30 мм)",
    "Выберите способ: ручной замес, готовая смесь в мешках или полусухая",
    "Для ручного замеса уточните марку цемента (М400/М500) и пропорцию (1:3 / 1:4)",
    "Нажмите «Рассчитать» — получите цемент с песком, мешки пескобетона или смесь для полусухой",
  ],
faq: [
    {
      question: "Какая минимальная толщина стяжки пола?",
      answer:
        "Для обычной цементно-песчаной стяжки ориентир — от ~30 мм с учётом основания и армирования; в жилых комнатах чаще 40–70 мм. Над коммуникациями и тёплым полом требования строже — сверьтесь со сметой узла и СП 29.",
    },
    {
      question: "Что выгоднее: готовая цементно-песчаная или самомесная смесь?",
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
    <tr><td>Ручной замес 1:3 (цемент М400)</td><td>~325 кг (7 мешков)</td><td>~900 кг (~0.6 м&sup3;)</td><td>~150 л</td></tr>
    <tr><td>Ручной замес 1:4 (цемент М400)</td><td>~265 кг (6 мешков)</td><td>~990 кг</td><td>~140 л</td></tr>
    <tr><td>Ручной замес 1:3 (цемент М500)</td><td>~300 кг (6 мешков)</td><td>~900 кг</td><td>~150 л</td></tr>
    <tr><td>Готовая смесь (пескобетон М300)</td><td colspan="3">~2 000 кг/м&sup3; (~50 мешков по 40 кг)</td></tr>
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
        answer: "<p>Расчёт для ручного замеса 1:3 (цемент М400) толщиной 50 мм на площадь 20 м&sup2;:</p><ul><li>Объём с усадкой: 20 &times; 0.05 &times; 1.15 = <strong>1.15 м&sup3;</strong></li><li>Цемент М400: <strong>~374 кг (8 мешков по 50 кг)</strong></li><li>Песок: <strong>~1.4 т</strong></li></ul><p>Цемент М500 при той же пропорции даёт раствор крепче (М200), поэтому цемента уходит меньше. Для готовой смеси (пескобетон М300): 1.10 &times; 2 000 = 2 200 кг &rarr; <strong>~55 мешков по 40 кг</strong>.</p>",
      },
      {
        question: "Нужно ли армировать стяжку пола?",
        answer: "<p>Армирование стяжки рекомендуется в следующих случаях:</p><ul><li>Толщина менее <strong>40 мм</strong></li><li>Стяжка по <strong>утеплителю</strong> (плавающая)</li><li>Стяжка с <strong>тёплым полом</strong></li><li>Основание с <strong>трещинами</strong> или неоднородное</li><li>Повышенные <strong>эксплуатационные нагрузки</strong></li></ul><p>Применяется кладочная сетка 100&times;100&times;4 мм или фиброволокно 0.6&ndash;0.9 кг/м&sup3;. По <strong>СП 29.13330</strong> минимальная толщина армированной стяжки &mdash; 30 мм.</p>",
      },
      {
        question: "Через сколько дней после заливки стяжки можно укладывать покрытие?",
        answer: "<p>Сроки готовности стяжки к укладке финишного покрытия:</p><table><thead><tr><th>Тип стяжки</th><th>Толщина</th><th>Срок, сут.</th></tr></thead><tbody><tr><td>Мокрая цементно-песчаная</td><td>50 мм</td><td>28&ndash;35</td></tr><tr><td>Мокрая цементно-песчаная</td><td>70&ndash;100 мм</td><td>45&ndash;60</td></tr><tr><td>Полусухая</td><td>50 мм</td><td>14&ndash;21</td></tr><tr><td>Наливной пол</td><td>5&ndash;20 мм</td><td>3&ndash;14</td></tr></tbody></table><p>Проверка готовности карбидным гигрометром: остаточная влажность не более <strong>2%</strong> для ламината и паркета, <strong>3%</strong> для плитки. Для ориентировочной бытовой проверки используют плёночный тест.</p>",
      },
    ],
  },
};
