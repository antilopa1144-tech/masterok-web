import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalTileGrout } from "../../../../engine/tile-grout";
import tilegroutSpec from "../../../../configs/calculators/tile-grout-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const tileGroutDef: CalculatorDefinition = {
  id: "floors_tile_grout",
  slug: "zatirka",
  title: "Калькулятор затирки для плитки",
  h1: "Калькулятор затирки для плитки онлайн — расчёт расхода",
  description: "Рассчитайте количество затирки (фуги) для плитки с учётом ширины и глубины шва. Ceresit, Mapei, Litokol.",
  metaTitle: withSiteMetaTitle("Калькулятор затирки для плитки | Расчёт Ceresit, Mapei"),
  metaDescription: "Бесплатный калькулятор затирки: рассчитайте кг затирки Ceresit CE 33, Mapei Keracolor, Litokol Starlike по размеру плитки и ширине шва.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["затирка", "фуга", "Ceresit", "Mapei", "Litokol", "шов плитки"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь укладки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileHeight",
      label: "Высота плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileThickness",
      label: "Толщина плитки",
      type: "slider",
      unit: "мм",
      min: 6,
      max: 25,
      step: 1,
      defaultValue: 8,
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 20,
      step: 0.5,
      defaultValue: 3,
      hint: "Стандарт 2–3 мм, крупная плитка 3–5 мм",
    },
    {
      key: "groutType",
      label: "Тип затирки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Цементная (Ceresit CE 33, Mapei Keracolor)" },
        { value: 1, label: "Эпоксидная (Litokol Starlike, Mapei Kerapoxy)" },
        { value: 2, label: "Полиуретановая (готовая паста)" },
      ],
    },
    {
      key: "bagSize",
      label: "Упаковка",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 кг" },
        { value: 2, label: "2 кг" },
        { value: 5, label: "5 кг" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = tilegroutSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalTileGrout(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

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
**Расчёт затирки по длине швов:**
Длина швов/м² = 1000/Ширина_плитки + 1000/Высота_плитки (пм/м²)
Объём шва = Длина × Ширина_шва × Толщина_плитки
Расход = Объём × Плотность (кг/м³)

Плотность:
- Цементная: ~1600 кг/м³
- Эпоксидная: ~1400 кг/м³
- Полиуретановая: ~1200 кг/м³
  `,
  howToUse: [
    "Введите площадь укладки плитки",
    "Укажите размер и толщину плитки",
    "Задайте ширину шва (обычно 2–3 мм)",
    "Выберите тип затирки",
    "Нажмите «Рассчитать» — получите количество упаковок",
  ],
faq: [
    {
      question: "От чего зависит расход затирки для плитки?",
      answer:
        "От длины и объёма швов: мелкий формат и мозаика дают больше погонных метров шва на м²; плюс ширина и глубина шва, толщина плитки, плотность смеси и потери при протирке. Калькулятор закладывает запас коэффициентом 1.10.",
    },
    {
      question: "Какую затирку выбрать: цементную или эпоксидную?",
      answer:
        "Цементная — проще и дешевле для сухих комнат. Эпоксидная — для душа, постоянной влаги и агрессивной бытовой химии; монтаж сложнее и дороже, на текстурной плитке пробную укладку делают заранее.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта затирки для плитки</h2>
<p>Расход затирки рассчитывается по объёму швов и плотности смеси:</p>
<p><strong>M = L<sub>шв</sub> &times; Ш<sub>шва</sub> &times; T<sub>плитки</sub> &times; &rho; &times; S &times; 1.10</strong></p>
<ul>
  <li><strong>L<sub>шв</sub></strong> = (1000 / A + 1000 / B) — длина швов на 1 м² (пм/м²), где A и B — стороны плитки в мм</li>
  <li><strong>Ш<sub>шва</sub></strong> — ширина шва (мм)</li>
  <li><strong>T<sub>плитки</sub></strong> — толщина плитки (мм)</li>
  <li><strong>&rho;</strong> — плотность затирки (кг/м³)</li>
  <li><strong>S</strong> — площадь укладки (м²)</li>
</ul>

<h2>Плотность затирки по типу</h2>
<table>
  <thead>
    <tr><th>Тип затирки</th><th>Плотность, кг/м³</th><th>Примеры марок</th></tr>
  </thead>
  <tbody>
    <tr><td>Цементная</td><td>~1600</td><td>Ceresit CE 33, Mapei Keracolor, Litokol Litochrom</td></tr>
    <tr><td>Эпоксидная</td><td>~1400</td><td>Litokol Starlike, Mapei Kerapoxy, Ceresit CE 79</td></tr>
    <tr><td>Полиуретановая</td><td>~1200</td><td>Mapei Flexcolor, Fugalite Bio</td></tr>
  </tbody>
</table>

<h2>Расход затирки для типовых размеров плитки</h2>
<table>
  <thead>
    <tr><th>Плитка, мм</th><th>Шов 2 мм</th><th>Шов 3 мм</th><th>Шов 5 мм</th></tr>
  </thead>
  <tbody>
    <tr><td>200&times;200&times;8</td><td>0.26 кг/м²</td><td>0.38 кг/м²</td><td>0.64 кг/м²</td></tr>
    <tr><td>300&times;300&times;8</td><td>0.17 кг/м²</td><td>0.26 кг/м²</td><td>0.43 кг/м²</td></tr>
    <tr><td>300&times;600&times;10</td><td>0.16 кг/м²</td><td>0.24 кг/м²</td><td>0.40 кг/м²</td></tr>
    <tr><td>600&times;600&times;10</td><td>0.11 кг/м²</td><td>0.16 кг/м²</td><td>0.27 кг/м²</td></tr>
  </tbody>
</table>
<p>Значения указаны для цементной затирки (плотность 1600 кг/м³). Для эпоксидной умножьте на <strong>0.88</strong>, для полиуретановой — на <strong>0.75</strong>.</p>

<h2>Нормативная база</h2>
<p>Заполнение межплиточных швов выполняется по <strong>СП 71.13330.2017</strong>. Затирочные составы должны соответствовать <strong>EN 13888</strong> (CG — цементные, RG — реактивные). Ширина шва определяется форматом плитки: для малого формата — <strong>2–3 мм</strong>, для среднего — <strong>3–5 мм</strong>, для крупного — <strong>3–8 мм</strong>.</p>
`,
    faq: [
      {
        question: "Сколько затирки нужно на 20 м² плитки 300×300 мм?",
        answer: "<p>Для плитки 300&times;300&times;8 мм с шириной шва <strong>3 мм</strong> (цементная затирка):</p><p><strong>L<sub>шв</sub></strong> = 1000/300 + 1000/300 = <strong>6.67 пм/м²</strong></p><p><strong>M</strong> = 6.67 &times; 0.003 &times; 0.008 &times; 1600 &times; 20 &times; 1.10 = <strong>5.6 кг</strong></p><ul><li><strong>Упаковка 2 кг</strong> — 3 штуки</li><li><strong>Упаковка 5 кг</strong> — 2 штуки</li></ul><p>Для шва 5 мм расход увеличится до ~9.4 кг. На мозаике (50&times;50 мм) с тем же швом расход будет в <strong>6 раз выше</strong> из-за суммарной длины швов.</p>",
      },
      {
        question: "Цементная или эпоксидная затирка: что выбрать?",
        answer: "<p>Выбор зависит от условий эксплуатации:</p><table><thead><tr><th>Параметр</th><th>Цементная (CE 33)</th><th>Эпоксидная (Starlike)</th></tr></thead><tbody><tr><td>Цена за кг</td><td>150–300 руб.</td><td>800–1500 руб.</td></tr><tr><td>Влагостойкость</td><td>Средняя (впитывает влагу)</td><td>Абсолютная (не впитывает)</td></tr><tr><td>Химстойкость</td><td>Низкая (боится кислот)</td><td>Высокая</td></tr><tr><td>Загрязнение</td><td>Тёмные швы со временем</td><td>Не впитывает грязь</td></tr><tr><td>Монтаж</td><td>Простой, рабочее время 20–30 мин</td><td>Сложный, рабочее время 40–60 мин</td></tr></tbody></table><p><strong>Цементная</strong> — для жилых сухих помещений. <strong>Эпоксидная</strong> — для душевых, кухонных фартуков, бассейнов и коммерческих зон, где важна долговечность швов.</p>",
      },
      {
        question: "Как рассчитать ширину шва для плитки?",
        answer: "<p>Ширина шва зависит от формата плитки и условий укладки:</p><ul><li><strong>Мозаика (до 100&times;100 мм)</strong> — шов <strong>1–2 мм</strong></li><li><strong>Малый формат (до 300&times;300)</strong> — шов <strong>2–3 мм</strong></li><li><strong>Средний формат (300&times;600, 600&times;600)</strong> — шов <strong>3–5 мм</strong></li><li><strong>Крупный формат (&ge; 600&times;1200)</strong> — шов <strong>3–5 мм</strong> (минимум 2 мм)</li><li><strong>Фасад и тёплый пол</strong> — шов <strong>5–8 мм</strong> (компенсация деформаций)</li></ul><p>Бесшовная укладка (шов &lt; 1 мм) допустима только для ректифицированной плитки в помещениях без температурных перепадов. На фасадах и тёплом полу минимальный шов — <strong>3 мм</strong> по требованиям <strong>СП 71.13330</strong>.</p>",
      },
    ],
  },
};


