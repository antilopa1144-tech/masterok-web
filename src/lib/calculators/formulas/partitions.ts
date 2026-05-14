import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalPartitions } from "../../../../engine/partitions";
import partitionsSpec from "../../../../configs/calculators/partitions-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const partitionsDef: CalculatorDefinition = {
  id: "partitions_blocks",
  slug: "peregorodki-iz-blokov",
  title: "Калькулятор перегородок из блоков",
  h1: "Калькулятор перегородок из газоблока и пеноблока онлайн",
  description: "Рассчитайте количество блоков (газобетон, пенобетон), клея и армирующей сетки для возведения перегородки.",
  metaTitle: withSiteMetaTitle("Калькулятор перегородок из блоков | Газоблок, пеноблок"),
  metaDescription: "Бесплатный калькулятор перегородок: рассчитайте газоблоки или пеноблоки, клей и армирующую сетку по длине, высоте и толщине перегородки.",
  category: "walls",
  categorySlug: "steny",
  tags: ["перегородки", "газоблок", "пеноблок", "перегородка из блоков", "газобетон"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина перегородки",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "height",
      label: "Высота перегородки",
      type: "slider",
      unit: "м",
      min: 2,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "thickness",
      label: "Толщина блока",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 75, label: "75 мм (75мм — шумоизоляция)" },
        { value: 100, label: "100 мм (стандарт)" },
        { value: 150, label: "150 мм (усиленная)" },
        { value: 200, label: "200 мм (несущая)" },
      ],
    },
    {
      key: "blockType",
      label: "Тип блока",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Газобетон D500 (Ytong, БЗТК)" },
        { value: 1, label: "Пенобетон D600" },
        { value: 2, label: "Гипсовые пазогребневые плиты" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = partitionsSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalPartitions(spec, inputs, factorTable);

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
**Расчёт перегородки из блоков:**
- Газоблок 625×250: ~6.4 шт/м²
- ПГП 667×500: ~3.0 шт/м²
- Клей: 1.5 кг/м² (мешок 25 кг)
- Армирование: каждые 3 ряда (~75 см)
  `,
  howToUse: [
    "Введите длину и высоту перегородки",
    "Выберите толщину и тип блока",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какую толщину блока выбрать для межкомнатной перегородки?",
      answer:
        "Типово 75–100 мм под бытовые перегородки; толще — при необходимости жёсткости, лучшей шумоизоляции и тяжёлой навески, высоких пролётах или влажных зонах. Нагрузку и коммуникации закладывают заранее — по проекту или СП 15.",
    },
    {
      question: "Нужно ли армировать перегородку из блоков?",
      answer:
        "Да: по принципу кладки блоков каждые 3 ряда, усиление возле проёмов и примыканий по СП 15 — это уменьшает трещины от усадки и температури в стыках с домом.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта перегородки из блоков</h2>
<p>Количество блоков для перегородки определяется по формуле:</p>
<p><strong>N = (L &times; H &minus; S<sub>проёмов</sub>) / (L<sub>бл</sub> &times; H<sub>бл</sub>) &times; 1.05</strong></p>
<ul>
  <li><strong>L</strong> — длина перегородки (м)</li>
  <li><strong>H</strong> — высота перегородки (м)</li>
  <li><strong>L<sub>бл</sub></strong> — длина блока (м)</li>
  <li><strong>H<sub>бл</sub></strong> — высота блока (м)</li>
  <li><strong>1.05</strong> — запас 5% на подрезку</li>
</ul>

<h2>Расход блоков на 1 м&sup2; перегородки</h2>
<table>
  <thead>
    <tr><th>Тип блока</th><th>Размер, мм</th><th>Блоков на 1 м&sup2;</th><th>Расход клея</th></tr>
  </thead>
  <tbody>
    <tr><td>Газобетон D500</td><td>625&times;250&times;100</td><td>6.4</td><td>1.5 кг/м&sup2;</td></tr>
    <tr><td>Газобетон D500</td><td>625&times;250&times;150</td><td>6.4</td><td>2.0 кг/м&sup2;</td></tr>
    <tr><td>Пеноблок D600</td><td>600&times;300&times;100</td><td>5.6</td><td>1.5 кг/м&sup2;</td></tr>
    <tr><td>ПГП (пазогребневые)</td><td>667&times;500&times;80</td><td>3.0</td><td>1.5 кг/м&sup2;</td></tr>
  </tbody>
</table>

<h2>Армирование перегородок</h2>
<p>Кладка из блоков армируется каждые <strong>3 ряда</strong> (примерно 750 мм). Способы армирования:</p>
<ul>
  <li>Арматура &Oslash;8 мм в штробах (газобетон, пеноблок)</li>
  <li>Кладочная сетка 50&times;50&times;4 мм (керамзитоблок)</li>
  <li>Оцинкованная перфолента 20&times;1 мм (ПГП)</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 15.13330.2020</strong> &laquo;Каменные и армокаменные конструкции&raquo;</li>
  <li><strong>ГОСТ 31360-2007</strong> &laquo;Изделия стеновые из ячеистого бетона&raquo;</li>
  <li><strong>ГОСТ 6428-83</strong> &laquo;Плиты гипсовые пазогребневые&raquo;</li>
</ul>
<p>Примыкание перегородки к стенам и потолку выполняется через <strong>эластичную прокладку</strong> (демпферная лента) для компенсации деформаций здания.</p>
`,
    faq: [
      {
        question: "Какой блок лучше для межкомнатной перегородки?",
        answer: "<p>Сравнение блоков для перегородок:</p><table><thead><tr><th>Параметр</th><th>Газобетон D500</th><th>Пеноблок D600</th><th>ПГП</th></tr></thead><tbody><tr><td>Прочность</td><td>B2.5&ndash;B3.5</td><td>B1.5&ndash;B2.5</td><td>М35&ndash;М50</td></tr><tr><td>Звукоизоляция (100 мм)</td><td>~38 дБ</td><td>~40 дБ</td><td>~41 дБ</td></tr><tr><td>Навеска на стену</td><td>До 25 кг на точку</td><td>До 15 кг</td><td>До 30 кг</td></tr><tr><td>Скорость монтажа</td><td>Высокая</td><td>Средняя</td><td>Высокая</td></tr></tbody></table><p>Для санузлов рекомендуются <strong>влагостойкие ПГП</strong> или газобетон с гидрофобизатором.</p>",
      },
      {
        question: "Как крепить перегородку из блоков к стене и потолку?",
        answer: "<p>Примыкание перегородки к несущим конструкциям:</p><ul><li><strong>К стене:</strong> анкеры или перфолента через каждые 2&ndash;3 ряда, с прокладкой демпферной ленты для виброразвязки</li><li><strong>К потолку:</strong> зазор 15&ndash;20 мм, заполненный монтажной пеной или эластичным герметиком</li><li><strong>К полу:</strong> первый ряд укладывается на гидроизоляцию (отсечка от влаги стяжки)</li></ul><p>По <strong>СП 15.13330</strong> жёсткая заделка перегородки в стену и потолок не допускается &mdash; конструкция должна компенсировать прогибы перекрытия.</p>",
      },
      {
        question: "На какую высоту можно возводить перегородку из блоков 100 мм?",
        answer: "<p>Максимальная высота перегородки зависит от толщины блока и длины пролёта:</p><ul><li><strong>75 мм:</strong> до 2.5 м при длине до 3 м</li><li><strong>100 мм:</strong> до 3.0 м при длине до 5 м</li><li><strong>150 мм:</strong> до 3.5 м при длине до 6 м</li><li><strong>200 мм:</strong> до 4.0 м, может быть несущей</li></ul><p>При превышении указанных размеров требуется конструктивное усиление: промежуточные стойки, уменьшение шага армирования, дополнительные связи с перекрытием по <strong>СП 15.13330</strong>.</p>",
      },
    ],
  },
};
