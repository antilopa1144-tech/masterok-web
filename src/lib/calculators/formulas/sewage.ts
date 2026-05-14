import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalSewage } from "../../../../engine/sewage";
import sewageSpec from "../../../../configs/calculators/sewage-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const sewageDef: CalculatorDefinition = {
  id: "sewage",
  slug: "septik",
  title: "Калькулятор септика",
  h1: "Калькулятор септика онлайн — расчёт объёма и материалов",
  description: "Рассчитайте объём септика, количество бетонных колец, труб и сопутствующих материалов для автономной канализации.",
  metaTitle: withSiteMetaTitle("Калькулятор септика | Расчёт объёма и бетонных колец"),
  metaDescription: "Бесплатный калькулятор септика: рассчитайте объём по жильцам, бетонные кольца, трубы, щебень и геотекстиль для канализации дома.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["септик", "канализация", "бетонные кольца", "автономная канализация"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "residents",
      label: "Количество проживающих",
      type: "slider",
      unit: "чел",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
      hint: "Норма водоотведения — 200 литров/сутки на человека (СП 30.13330)",
    },
    {
      key: "septikType",
      label: "Тип септика",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Из бетонных колец (КС 10-9)" },
        { value: 1, label: "Пластиковый заводской" },
        { value: 2, label: "Из еврокубов (IBC-контейнеры)" },
      ],
    },
    {
      key: "chambersCount",
      label: "Количество камер",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 камера — минимальная очистка" },
        { value: 2, label: "2 камеры — стандарт (рекомендуется)" },
        { value: 3, label: "3 камеры — максимальная очистка" },
      ],
      hint: "2–3 камеры обеспечивают лучшую очистку стоков",
    },
    {
      key: "pipeLength",
      label: "Длина трубопровода от дома",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 10,
      hint: "Расстояние от дома до септика (мин. 5 м по СанПиН)",
    },
    {
      key: "groundType",
      label: "Тип грунта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Песок — хорошая фильтрация" },
        { value: 1, label: "Суглинок — средняя фильтрация" },
        { value: 2, label: "Глина — плохая фильтрация" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = sewageSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalSewage(spec, inputs, factorTable);

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
**Расчёт септика по СП 32.13330 и СП 30.13330:**

Суточный объём = Количество_жильцов × 200 л/сут
Объём септика = Суточный_объём × 3 (трёхсуточный запас)

**Бетонные кольца КС 10-9:**
- Ø внутренний 1000 мм, высота 890 мм
- Объём одного кольца ≈ 0.71 м³
- Каждая камера: днище + кольца + крышка + люк

**Минимальные расстояния (СанПиН 2.1.4.1110):**
- От дома — 5 м
- От колодца — 30–50 м
- От забора — 2 м
  `,
  howToUse: [
    "Укажите количество проживающих",
    "Выберите тип септика (бетонные кольца — самый популярный)",
    "Укажите количество камер (2 — стандарт)",
    "Задайте длину трубопровода от дома до септика",
    "Выберите тип грунта на участке",
    "Нажмите «Рассчитать» — получите полный перечень материалов",
  ],
  faq: [
    {
      question: "Сколько камер нужно для септика частного дома?",
      answer:
        "Для постоянного проживания чаще выбирают 2 камеры; при большом водоразборе/нескольких санузлах и высоких требованиях к очистке — 3 камеры или другой тип ЛОС. На высокий УГВ и ограничение по фильтрации схема влияет сильнее, чем «среднее» правило.",
    },
    {
      question: "Как выбрать объём септика?",
      answer:
        "Обычно считают по числу жильцов и минимум 3‑суточному запасу отстаивания (нормы водоотведения). Если есть залповые сбросы (ванна, гости) — лучше брать с небольшим резервом, иначе проблемы проявляются именно «на пике».",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта объёма септика</h2>
<p>Объём септика определяется по числу жильцов и трёхсуточному запасу:</p>
<p><strong>V = N &times; 200 л/сут &times; 3 дня / 1000</strong></p>
<ul>
  <li><strong>V</strong> — требуемый объём септика (м&sup3;)</li>
  <li><strong>N</strong> — количество постоянно проживающих (чел)</li>
  <li><strong>200 л/сут</strong> — норма водоотведения на человека (по СП 30.13330)</li>
  <li><strong>3 дня</strong> — минимальное время отстаивания стоков</li>
</ul>

<h2>Подбор бетонных колец КС 10-9</h2>
<table>
  <thead>
    <tr><th>Жильцов</th><th>Объём, м&sup3;</th><th>Камер</th><th>Колец (всего)</th></tr>
  </thead>
  <tbody>
    <tr><td>2–3</td><td>1.2–1.8</td><td>2</td><td>4–6</td></tr>
    <tr><td>4–5</td><td>2.4–3.0</td><td>2</td><td>6–8</td></tr>
    <tr><td>6–8</td><td>3.6–4.8</td><td>3</td><td>9–12</td></tr>
    <tr><td>10+</td><td>6.0+</td><td>3</td><td>12+</td></tr>
  </tbody>
</table>
<p>Кольцо КС 10-9: &oslash; внутренний 1000 мм, высота 890 мм, объём <strong>~0.71 м&sup3;</strong>. На каждую камеру дополнительно: днище КД 10, крышка КО 10, люк полимерный.</p>

<h2>Нормативная база</h2>
<p>Проектирование автономной канализации регламентируется <strong>СП 32.13330.2018</strong> «Канализация. Наружные сети и сооружения» и <strong>СП 30.13330.2020</strong> «Внутренний водопровод и канализация зданий». Санитарные требования — <strong>СанПиН 2.1.4.1110-02</strong>: минимальное расстояние от септика до колодца питьевой воды <strong>30–50 м</strong>, до жилого дома <strong>5 м</strong>, до забора <strong>2 м</strong>.</p>

<h2>Минимальные расстояния (СанПиН)</h2>
<ul>
  <li><strong>До жилого дома</strong> — не менее 5 м</li>
  <li><strong>До питьевого колодца</strong> — 30–50 м (зависит от грунта)</li>
  <li><strong>До забора соседа</strong> — не менее 2 м</li>
  <li><strong>До водоёма</strong> — не менее 30 м</li>
  <li><strong>До дороги</strong> — не менее 5 м</li>
</ul>
`,
    faq: [
      {
        question: "Какой объём септика нужен для семьи из 4 человек?",
        answer: "<p>По формуле трёхсуточного запаса:</p><p>V = 4 &times; 200 &times; 3 / 1000 = <strong>2.4 м&sup3;</strong></p><p>Из бетонных колец КС 10-9 (0.71 м&sup3;/кольцо):</p><ul><li><strong>2-камерный септик</strong>: 1-я камера 3 кольца (2.13 м&sup3;) + 2-я камера 2 кольца (1.42 м&sup3;) = <strong>5 колец</strong></li><li>Дополнительно: 2 днища, 2 крышки, 2 люка</li></ul><p>Итого объём: <strong>3.55 м&sup3;</strong> (с запасом). Для 4 жильцов с активным водопользованием лучше взять <strong>6 колец</strong> (по 3 на камеру).</p>",
      },
      {
        question: "Септик из бетонных колец или пластиковый — что лучше?",
        answer: "<p>Сравнение двух популярных типов:</p><table><thead><tr><th>Параметр</th><th>Бетонные кольца</th><th>Пластиковый</th></tr></thead><tbody><tr><td>Цена</td><td>Ниже на 30–50%</td><td>Выше</td></tr><tr><td>Монтаж</td><td>Кран + бригада</td><td>Ручной (лёгкий вес)</td></tr><tr><td>Герметичность</td><td>Требует гидроизоляции</td><td>Полная заводская</td></tr><tr><td>Всплытие при УГВ</td><td>Тяжёлый, не всплывает</td><td>Нужен якорь/пригруз</td></tr><tr><td>Срок службы</td><td>50+ лет</td><td>30–50 лет</td></tr></tbody></table><p><strong>Бетонные кольца</strong> — оптимальны при низком УГВ и наличии подъезда для крана. <strong>Пластиковый</strong> — при высоком УГВ и стеснённых условиях.</p>",
      },
      {
        question: "Какой уклон канализационной трубы от дома до септика?",
        answer: "<p>По <strong>СП 32.13330</strong> минимальный уклон наружной канализации зависит от диаметра трубы:</p><ul><li><strong>&oslash; 110 мм</strong> — уклон <strong>2 см на 1 м</strong> (0.02)</li><li><strong>&oslash; 160 мм</strong> — уклон <strong>0.8 см на 1 м</strong> (0.008)</li></ul><p>Для трубы 110 мм длиной 10 м: перепад высот = 10 &times; 0.02 = <strong>20 см</strong>.</p><p>Слишком большой уклон (&gt; 3 см/м) приводит к заиливанию: вода уходит быстрее твёрдых фракций. Оптимум для бытовой канализации — <strong>2 см/м</strong>.</p>",
      },
    ],
  },
};


