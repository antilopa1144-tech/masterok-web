import type { CalculatorDefinition } from '../types';
import { withSiteMetaTitle } from "../meta";
import selfLevelingCanonicalSpecJson from '../../../../configs/calculators/self-leveling-canonical.v1.json';
import { computeCanonicalSelfLeveling } from '../../../../engine/self-leveling';
import type { SelfLevelingCanonicalSpec } from '../../../../engine/canonical';

const selfLevelingCanonicalSpec = selfLevelingCanonicalSpecJson as SelfLevelingCanonicalSpec;

export const selfLevelingDef: CalculatorDefinition = {
  id: 'floors_self_leveling',
  slug: 'nalivnoy-pol',
  formulaVersion: selfLevelingCanonicalSpec.formula_version,
  title: 'Калькулятор наливного пола',
  h1: 'Калькулятор наливного пола онлайн — расчёт расхода смеси',
  description: 'Рассчитайте количество самовыравнивающейся смеси для наливного пола. Ceresit CN, Knauf Боден, Волма Нивелир.',
  metaTitle: withSiteMetaTitle("Калькулятор наливного пола | Расчёт Ceresit CN, Knauf"),
  metaDescription: 'Бесплатный калькулятор наливного пола: рассчитайте мешки Ceresit CN 175, Knauf Боден 25, Волма Нивелир по площади, толщине слоя и расходу смеси.',
  category: 'flooring',
  categorySlug: 'poly',
  tags: ['наливной пол', 'самовыравнивающийся пол', 'Ceresit CN', 'Knauf Боден', 'Волма Нивелир'],
  popularity: 58,
  complexity: 1,
  fields: [
    {
      key: 'inputMode',
      label: 'Способ ввода',
      type: 'radio',
      defaultValue: 0,
      options: [
        { value: 0, label: 'По размерам помещения' },
        { value: 1, label: 'По площади' },
      ],
    },
    {
      key: 'length',
      label: 'Длина помещения',
      type: 'slider',
      unit: 'м',
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: 'bySize',
    },
    {
      key: 'width',
      label: 'Ширина помещения',
      type: 'slider',
      unit: 'м',
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: 'bySize',
    },
    {
      key: 'area',
      label: 'Площадь',
      type: 'slider',
      unit: 'м²',
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: 'byArea',
    },
    {
      key: 'thickness',
      label: 'Толщина слоя',
      type: 'slider',
      unit: 'мм',
      min: 3,
      max: 100,
      step: 1,
      defaultValue: 10,
      hint: 'Выравнивающий слой: 5–30 мм, финишный: 3–5 мм',
    },
    {
      key: 'mixtureType',
      label: 'Тип смеси',
      type: 'select',
      defaultValue: 0,
      options: [
        { value: 0, label: 'Выравнивающая (Ceresit CN 175, Волма Нивелир)' },
        { value: 1, label: 'Финишная (Ceresit CN 68, Knauf Боден 25)' },
        { value: 2, label: 'Быстросхватывающаяся (Ceresit CN 76)' },
      ],
    },
    {
      key: 'bagWeight',
      label: 'Фасовка мешка',
      type: 'select',
      defaultValue: 25,
      options: [
        { value: 20, label: '20 кг' },
        { value: 25, label: '25 кг' },
      ],
    },
  ],
  calculate(inputs) {
    return computeCanonicalSelfLeveling(selfLevelingCanonicalSpec, {
      inputMode: inputs.inputMode,
      length: inputs.length,
      width: inputs.width,
      area: inputs.area,
      thickness: inputs.thickness,
      mixtureType: inputs.mixtureType,
      bagWeight: inputs.bagWeight,
      accuracyMode: inputs.accuracyMode as any,
    });
  },
  formulaDescription: `
**Расход наливного пола:**
кг/м² = Расход_на_1мм × Толщина (мм)

Нормы расхода на 1 мм:
- Выравнивающая (Ceresit CN 175): ~1.6 кг/м²
- Финишная (Knauf Боден 25): ~1.4 кг/м²
- Быстросхватывающаяся (Ceresit CN 76): ~1.8 кг/м²

По СНиП 3.04.01-87: при перепадах до 4 мм — финишная, 5–30 мм — выравнивающая.
  `,
  howToUse: [
    'Введите размеры помещения или площадь',
    'Укажите толщину слоя (фактический перепад пола)',
    'Выберите тип смеси',
    'Нажмите «Рассчитать» — получите мешки, грунтовку и ленту',
  ],
faq: [
    {
      question: "Как определить толщину слоя наливного пола?",
      answer:
        "По средней толщине по площади после промеров нивелиром или правилом — не по одной «самой глубокой» яме. Сильный перепад лучше сначала грубо снять ремонтной стяжкой, а смесью — в допустимом для марки диапазоне.",
    },
    {
      question: "Нужна ли грунтовка перед наливным полом?",
      answer:
        "Обычно да: улучшает сцепление и снижает неравномерное впитывание воды из раствора. На пористом основании возможен второй слой грунта по инструкции производителя.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта наливного пола</h2>
<p>Расход самовыравнивающейся смеси определяется по формуле:</p>
<p><strong>M = S &times; R &times; h</strong></p>
<ul>
  <li><strong>M</strong> — общая масса смеси (кг)</li>
  <li><strong>S</strong> — площадь помещения (м&sup2;)</li>
  <li><strong>R</strong> — расход смеси на 1 мм толщины (кг/м&sup2;/мм)</li>
  <li><strong>h</strong> — средняя толщина слоя (мм)</li>
</ul>

<h2>Нормы расхода по типам смесей</h2>
<table>
  <thead>
    <tr><th>Тип смеси</th><th>Марка-пример</th><th>Расход, кг/м&sup2;/мм</th><th>Слой, мм</th></tr>
  </thead>
  <tbody>
    <tr><td>Выравнивающая</td><td>Ceresit CN 175, Волма Нивелир</td><td>1.6</td><td>5&ndash;60</td></tr>
    <tr><td>Финишная</td><td>Ceresit CN 68, Knauf Боден 25</td><td>1.4</td><td>3&ndash;10</td></tr>
    <tr><td>Быстросхватывающаяся</td><td>Ceresit CN 76</td><td>1.8</td><td>4&ndash;50</td></tr>
    <tr><td>Гипсовая</td><td>Knauf Боден 30</td><td>1.5</td><td>2&ndash;30</td></tr>
  </tbody>
</table>

<h2>Порядок устройства наливного пола</h2>
<ul>
  <li>Подготовка основания: обеспыливание, ремонт трещин</li>
  <li>Грунтование: 1&ndash;2 слоя (расход 150&ndash;200 г/м&sup2;)</li>
  <li>Установка демпферной ленты по периметру</li>
  <li>Заливка смеси с прокаткой игольчатым валиком</li>
  <li>Время высыхания: от 3 до 14 суток в зависимости от толщины</li>
</ul>

<h2>Нормативная база</h2>
<ul>
  <li><strong>СП 29.13330.2011</strong> &laquo;Полы&raquo;</li>
  <li><strong>СНиП 3.04.01-87</strong> &laquo;Изоляционные и отделочные покрытия&raquo;</li>
  <li><strong>ГОСТ 31358-2019</strong> &laquo;Смеси сухие строительные напольные&raquo;</li>
</ul>
<p>При перепадах основания до 4 мм используется финишная смесь, при 5&ndash;30 мм &mdash; выравнивающая, свыше 30 мм &mdash; двухслойная заливка (грубое + финишное выравнивание).</p>
`,
    faq: [
      {
        question: "Сколько мешков наливного пола нужно на 20 м2?",
        answer: "<p>Расчёт для выравнивающей смеси (Ceresit CN 175, расход 1.6 кг/м&sup2;/мм):</p><ul><li>Слой 10 мм: 20 &times; 1.6 &times; 10 = <strong>320 кг</strong> = 13 мешков по 25 кг</li><li>Слой 20 мм: 20 &times; 1.6 &times; 20 = <strong>640 кг</strong> = 26 мешков по 25 кг</li><li>Слой 5 мм (финишная): 20 &times; 1.4 &times; 5 = <strong>140 кг</strong> = 6 мешков</li></ul><p>Фактический расход может отличаться на 10&ndash;15% из-за неравномерности перепадов основания. Рекомендуется промерить пол и брать по средней толщине.</p>",
      },
      {
        question: "Можно ли заливать наливной пол на старую стяжку?",
        answer: "<p>Да, при соблюдении условий:</p><ul><li>Стяжка <strong>прочная</strong> (не крошится, не пылит после обеспыливания)</li><li>Нет <strong>отслоений</strong> (проверка простукиванием)</li><li>Поверхность <strong>загрунтована</strong> (1&ndash;2 слоя грунтовки глубокого проникновения)</li><li>Влажность основания не более <strong>4% CM</strong></li></ul><p>Если стяжка слабая или крошится &mdash; требуется демонтаж или укрепление проникающей грунтовкой. По <strong>СП 29.13330</strong> прочность основания должна быть не менее <strong>15 МПа</strong>.</p>",
      },
      {
        question: "Через сколько часов можно ходить по наливному полу?",
        answer: "<p>Сроки отверждения наливного пола зависят от типа смеси:</p><table><thead><tr><th>Тип смеси</th><th>Пешеходная нагрузка</th><th>Укладка покрытия</th></tr></thead><tbody><tr><td>Быстросхватывающаяся (CN 76)</td><td>3&ndash;5 часов</td><td>24 часа</td></tr><tr><td>Выравнивающая (CN 175)</td><td>4&ndash;6 часов</td><td>3&ndash;7 суток</td></tr><tr><td>Финишная (CN 68)</td><td>4&ndash;6 часов</td><td>3&ndash;5 суток</td></tr><tr><td>Гипсовая (Knauf Боден 30)</td><td>4&ndash;6 часов</td><td>5&ndash;7 суток</td></tr></tbody></table><p>Полный набор прочности: <strong>28 суток</strong>. Избегайте сквозняков, прямого солнца и температуры ниже +5&deg;C во время отверждения.</p>",
      },
    ],
  },
};

