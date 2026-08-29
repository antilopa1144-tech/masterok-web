import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalConcrete } from "../../../../engine/concrete";
import concreteSpec from "../../../../configs/calculators/concrete-canonical.v1.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const cementManufacturerField = buildManufacturerField("cement", { label: "Производитель цемента" });

export const concreteDef: CalculatorDefinition = {
  id: "concrete_universal",
  slug: "beton",
  title: "Калькулятор бетона",
  h1: "Калькулятор бетона онлайн — расчёт объёма и состава смеси",
  description: "Рассчитайте геометрический объём и план заказа готовой смеси. Для самостоятельного замеса получите ориентировочную закупку компонентов, а не проектный рецепт бетона.",
  metaTitle: withSiteMetaTitle("Калькулятор бетона: объём и состав смеси"),
  metaDescription: "Бесплатный калькулятор бетона. Рассчитайте чистый объём, явный запас и заказ готовой смеси; для самостоятельного замеса — ориентировочную закупку цемента, песка и щебня.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["бетон", "цемент", "фундамент", "стяжка", "замес"],
  popularity: 95,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Как задать объём",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Знаю объём" },
        { value: 1, label: "По площади и толщине" },
      ],
      hint: "Если объём уже известен — введите м³. Для плиты, стяжки или площадки можно посчитать объём по площади и толщине слоя.",
    },
    {
      key: "concreteVolume",
      label: "Объём бетона",
      type: "slider",
      unit: "м³",
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь заливки",
      type: "slider",
      unit: "м²",
      min: 0.1,
      max: 1000,
      step: 0.1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "thickness",
      label: "Толщина слоя",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1000,
      step: 10,
      defaultValue: 200,
      group: "byArea",
    },
    {
      key: "concreteGrade",
      label: "Марка бетона",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 1, label: "В7.5 (М100)" },
        { value: 2, label: "В12.5 (М150)" },
        { value: 3, label: "В15 (М200)" },
        { value: 4, label: "В20 (М250)" },
        { value: 5, label: "В22.5 (М300)" },
        { value: 6, label: "В25 (М350)" },
        { value: 7, label: "В30 (М400)" },
      ],
      hint: "Класс бетона берите из проекта. Условия эксплуатации дополнительно задают марки F и W, подвижность и другие параметры смеси.",
    },
    {
      key: "manualMix",
      label: "Самостоятельный замес",
      type: "switch",
      defaultValue: 0,
      hint: "Включите для предварительной закупки цемента, песка и щебня. Это не заменяет лабораторный подбор состава.",
    },
    {
      key: "readyMixOrderStepM3",
      label: "Шаг заказа готовой смеси",
      type: "select",
      unit: "м³",
      defaultValue: 0.1,
      options: [
        { value: 0.1, label: "0,1 м³" },
        { value: 0.5, label: "0,5 м³" },
        { value: 1, label: "1 м³" },
      ],
      hint: "Уточните фактический шаг и минимальную партию у поставщика. При самостоятельном замесе поле не влияет на закупку компонентов.",
    },
    {
      key: "reserve",
      label: "Запас",
      type: "slider",
      unit: "%",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 5,
      hint: "Проектный запас на геометрию опалубки, потери и схему подачи. Значение не установлено ГОСТ и выбирается по условиям объекта.",
    },
    ...(cementManufacturerField ? [cementManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = concreteSpec as any;
    const canonical = computeCanonicalConcrete(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any });
    let materials = canonical.materials;

    const manufacturer = getManufacturerByIndex("cement", inputs.manufacturer);
    if (manufacturer) {
      materials = materials.map((m) =>
        /цемент|портланд/i.test(m.name)
          ? { ...m, name: `${m.name} — ${manufacturer.name}` }
          : m
      );
    }

    const rec = canonical.scenarios.REC;
    const manualMix = canonical.totals.manualMix === 1;

    return {
      materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      summaryCards: [
        {
          icon: "📐",
          label: "Чистый объём",
          value: canonical.totals.sourceVolume.toLocaleString("ru-RU"),
          unit: "м³",
          tone: "slate" as const,
        },
        {
          icon: manualMix ? "🧱" : "🚚",
          label: manualMix ? "Расчётный выход" : "Заказать",
          value: (manualMix ? rec.exact_need : rec.purchase_quantity).toLocaleString("ru-RU"),
          unit: "м³",
          hint: manualMix ? "Компоненты для REC ниже" : `Шаг ${canonical.totals.readyMixOrderStepM3} м³`,
          tone: "emerald" as const,
        },
        {
          icon: "🏗️",
          label: "Выбранный класс",
          value: concreteSpec.planning_mix.proportions.find((item) => item.grade === canonical.totals.concreteGrade)?.label ?? "—",
          hint: "Проверить по проекту",
          tone: "amber" as const,
        },
      ],
    };
  },
  formulaDescription: `
**Геометрический расчёт объёма:**

Объём = Площадь × Толщина

Объём с запасом = Объём × (1 + Запас/100)

MIN показывает чистую геометрию, REC — выбранный запас, MAX — запас не меньше плановых 10%. Для готовой смеси каждый сценарий округляется вверх по выбранному шагу заказа. Минимальную партию, шаг и технологический остаток линии подачи нужно подтвердить у поставщика.

При самостоятельном замесе таблица компонентов — **укрупнённая закупочная оценка**, а не нормативный рецепт. ГОСТ 27006-2019 требует подбирать состав по фактическим материалам и проверять его на производстве. Влажность заполнителей меняет требуемую добавку воды.

Арматура, опалубка и гидроизоляция здесь намеренно не рассчитываются: их нельзя достоверно определить только по объёму бетона без геометрии, нагрузок и проекта.
  `,
  howToUse: [
    "Введите известный объём или переключитесь на расчёт по площади и толщине",
    "Выберите класс бетона строго по проекту или спецификации",
    "Для готовой смеси укажите шаг заказа, согласованный с поставщиком",
    "Укажите явный запас с учётом фактической опалубки и схемы подачи",
    "Самостоятельный замес включайте только для предварительной оценки закупки компонентов",
    "Сверьте итог с проектом, поставщиком смеси и технологической картой бетонирования",
  ],
  faq: [
    {
      question: "Какую марку бетона выбрать для фундамента частного дома?",
      answer: "Класс прочности задаёт проектировщик по нагрузкам и расчётной схеме. Отдельно учитывают морозостойкость F, водонепроницаемость W, среду эксплуатации, подвижность и крупность заполнителя. Калькулятор не подбирает эти параметры и не заменяет проект."
    },
    {
      question: "Почему калькулятор не считает арматуру и опалубку по объёму бетона?",
      answer: "Один и тот же объём может относиться к плите, ленте, колонне или нескольким конструкциям с разной геометрией и нагрузками. Массу арматуры, защитный слой, площадь опалубки и гидроизоляцию определяют по чертежам и расчёту, поэтому среднее значение в кг/м³ создавало бы ложную точность."
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта объёма бетона</h2>
<p>Объём бетона с учётом запаса рассчитывается по формуле:</p>
<p><strong>V = S &times; h &times; (1 + З/100)</strong></p>
<ul>
  <li><strong>V</strong> — требуемый объём бетонной смеси (м&sup3;)</li>
  <li><strong>S</strong> — площадь заливаемой конструкции (м&sup2;)</li>
  <li><strong>h</strong> — толщина слоя бетона (м)</li>
  <li><strong>З</strong> — запас на потери при заливке (%)</li>
</ul>

<h2>Предварительная оценка компонентов самостоятельного замеса</h2>
<p>Таблица нужна для планирования закупки. Это не нормативный рецепт и не гарантия выбранного класса: фактический состав зависит от цемента, зернового состава и влажности заполнителей, добавок и требуемой удобоукладываемости.</p>
<table>
  <thead>
    <tr><th>Плановый класс</th><th>Цемент 32,5, кг</th><th>Песок, м&sup3;</th><th>Щебень, м&sup3;</th></tr>
  </thead>
  <tbody>
    <tr><td>В7.5 (М100)</td><td>170</td><td>0.56</td><td>0.88</td></tr>
    <tr><td>В12.5 (М150)</td><td>215</td><td>0.54</td><td>0.86</td></tr>
    <tr><td>В15 (М200)</td><td>290</td><td>0.50</td><td>0.82</td></tr>
    <tr><td>В20 (М250)</td><td>340</td><td>0.47</td><td>0.80</td></tr>
    <tr><td>В22.5 (М300)</td><td>380</td><td>0.44</td><td>0.78</td></tr>
    <tr><td>В25 (М350)</td><td>420</td><td>0.41</td><td>0.76</td></tr>
    <tr><td>В30 (М400)</td><td>480</td><td>0.38</td><td>0.73</td></tr>
  </tbody>
</table>
<p>Воду в закупочный список не включаем. Справочное значение в деталях нельзя автоматически выливать в замес: необходимо учитывать влагу в заполнителях и корректировать состав по испытаниям.</p>

<h2>Нормативная база</h2>
<p>Документы задают области требований, но не подтверждают универсальную таблицу расхода для любых местных материалов:</p>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/69dff0a2-aff4-4552-85c8-6b7cd61315f2" rel="nofollow noopener" target="_blank">ГОСТ 27006-2019</a> — подбор, назначение и передача состава в производство</li>
  <li><a href="https://protect.gost.ru/gost/details/fd47b526-d233-40ef-a03b-70d7199e1a97" rel="nofollow noopener" target="_blank">ГОСТ 7473-2010</a> — действующие до 1 ноября 2026 года требования к готовым бетонным смесям</li>
  <li><a href="https://protect.gost.ru/gost/details/b9da3cd9-2fb4-4473-9553-3979ad6be453" rel="nofollow noopener" target="_blank">ГОСТ 26633-2015</a> — требования к тяжёлым и мелкозернистым бетонам</li>
  <li><a href="https://protect.gost.ru/sp/details/2239acf1-711f-4f1f-aaa7-902fa06a8a60" rel="nofollow noopener" target="_blank">СП 70.13330.2012</a> — производство и приёмка бетонных работ</li>
</ul>
<p>ГОСТ 7473-2026 уже принят, но вводится в действие 1 ноября 2026 года. До этой даты карточка Росстандарта сохраняет статус действующего у ГОСТ 7473-2010.</p>
`,
    faq: [
      {
        question: "Сколько цемента нужно на 1 куб бетона М200?",
        answer: "<p>В плановой таблице калькулятора для В15 (М200) используется <strong>290 кг цемента класса 32,5</strong> на 1 м&sup3;. Это оценка закупки, а не обязательная норма: рабочий расход и количество воды определяют подбором состава по ГОСТ 27006-2019 с учётом фактических заполнителей, цемента, добавок и требуемой подвижности.</p>",
      },
      {
        question: "Как рассчитать объём бетона для ленточного фундамента?",
        answer: "<p>Для каждого прямолинейного участка используйте <strong>V = L &times; W &times; H</strong>, затем сложите объёмы и вычтите пересечения, если они были посчитаны дважды. Запас выбирают по фактической геометрии опалубки и схеме подачи; универсального процента ГОСТ не устанавливает.</p>",
      },
      {
        question: "Чем отличается марка бетона от класса?",
        answer: "<p>Класс В — нормируемая характеристика прочности, которую указывают в проекте. Марка М — традиционное обозначение средней прочности, используемое в бытовой речи и коммерческих таблицах. Для заказа ориентируйтесь на полный проектный набор характеристик смеси, а не только на привычную пару В/М.</p>",
      },
    ],
  },
};
