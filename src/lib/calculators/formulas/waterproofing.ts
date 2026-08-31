import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalWaterproofing } from "../../../../engine/waterproofing";
import waterproofingSpec from "../../../../configs/calculators/waterproofing-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const formatRuNumber = (value: number): string => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
}).format(value);

export const waterproofingDef: CalculatorDefinition = {
  id: "bathroom_waterproof",
  slug: "gidroizolyaciya-vlagozaschita",
  title: "Калькулятор гидроизоляции",
  h1: "Калькулятор гидроизоляции — ванная, душевая, балкон",
  description: "Рассчитайте количество гидроизоляционной мастики, ленты и праймера для ванной комнаты, душевой зоны или санузла.",
  metaTitle: withSiteMetaTitle("Калькулятор гидроизоляции: расход мастики на м²"),
  metaDescription: "Бесплатный калькулятор гидроизоляции для ванной: рассчитайте площадь пола и стен, расход мастики по слоям, ленту, грунтовку и количество вёдер к покупке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["гидроизоляция", "ванная", "душевая", "санузел", "Ceresit CL 51"],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "floorArea",
      label: "Площадь пола",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 6,
      hint: "Введите фактическую площадь пола, которую нужно покрыть. Трап, поддон, пороги, вычеты и отдельные участки автоматически не определяются.",
    },
    {
      key: "wallHeight",
      label: "Высота обработки стен",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 0, label: "Только заданная площадь пола" },
        { value: 200, label: "Полоса стен 200 мм (модель)" },
        { value: 300, label: "Полоса стен 300 мм (модель)" },
        { value: 500, label: "Полоса стен 500 мм (модель)" },
        { value: 2000, label: "Стены высотой 2000 мм (модель)" },
      ],
      hint: "Площадь стен считается как полный периметр × выбранная высота. Отдельную стену душа, дверной проём, ниши и зоны разной высоты задать нельзя.",
    },
    {
      key: "roomPerimeter",
      label: "Периметр помещения",
      type: "slider",
      unit: "м",
      min: 4,
      max: 40,
      step: 0.5,
      defaultValue: 10,
      hint: "Используется и для площади стен, и как основа условного расчёта ленты и двух видов герметика. Реальную длину углов и швов модель не измеряет.",
    },
    {
      key: "masticType",
      label: "Расчётный профиль мастики",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Профиль A — 1,0 кг/м² за слой, ведро 15 кг" },
        { value: 1, label: "Профиль B — 1,2 кг/м² за слой, ведро 20 кг" },
        { value: 2, label: "Профиль C — 0,8 кг/м² за слой, ведро 15 кг" },
      ],
      hint: "Это три коэффициента старой модели, а не марки и не химические типы материалов. Для профилей B/C модель дополнительно добавляет условный праймер 20 л.",
    },
    {
      key: "layers",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой — множитель ×1" },
        { value: 2, label: "2 слоя — множитель ×2" },
        { value: 3, label: "3 слоя — множитель ×3" },
      ],
      hint: "Модель линейно умножает норму на число слоёв. Фактические число слоёв, общую толщину и суммарный расход берите из техкарты выбранного продукта.",
    },
    {
      key: "pipePenetrations",
      label: "Примыкания труб — условная надбавка",
      type: "slider",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 0,
      hint: "Каждый пункт механически добавляет 1 кг мастики и 0,5 м к расчёту ленты. Диаметр, манжета, фактическая площадь и техкарта узла не учитываются.",
    },
    {
      key: "insetCount",
      label: "Дополнительные узлы — условная надбавка",
      type: "slider",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 0,
      hint: "Каждый пункт механически добавляет 1,5 кг мастики и 2 м к расчёту ленты. Размер, форма и фактический периметр узла не задаются.",
    },
    {
      key: "floorCurvatureClass",
      label: "Поправка модели на неровность",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без поправки — ×1,00" },
        { value: 1, label: "Условная поправка — ×1,10" },
        { value: 2, label: "Условная поправка — ×1,20" },
      ],
      hint: "Это сметный коэффициент, а не способ выравнивания. Дефекты основания устраняют до гидроизоляции по требованиям выбранной системы.",
    },
  ],
  calculate(inputs) {
    const spec = waterproofingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalWaterproofing(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

    const masticType = canonical.totals.masticType;
    const profile = ["A", "B", "C"][masticType] ?? "A";
    const rate = spec.material_rules.consumption_per_layer[String(masticType)] as number;
    const bucketKg = spec.material_rules.bucket_kg[String(masticType)] as number;
    const rateLabel = formatRuNumber(rate);

    const materials = canonical.materials.map((material) => {
      if (material.category === "Основное") {
        return {
          ...material,
          name: `Расчётный профиль ${profile} (${rateLabel} кг/м² за слой; ведро ${bucketKg} кг)`,
          subtitle: `(${formatRuNumber(canonical.totals.totalArea)} м² × ${rateLabel} кг/м² × ${canonical.totals.layers} сл. × ${formatRuNumber(canonical.totals.curvatureMult)} + ${formatRuNumber(canonical.totals.extraMasticKg)} кг на узлы) × режим точности = ${formatRuNumber(canonical.totals.masticKg)} кг. Это не паспорт продукта`,
        };
      }
      if (material.name.startsWith("Системная эластичная")) {
        return {
          ...material,
          name: "Гидроизоляционная лента (условная позиция, 10 м)",
          subtitle: `Условная формула: (периметр ${formatRuNumber(canonical.totals.roomPerimeter)} м + ${canonical.totals.wallHeightMm > 0 ? "периметр × 1,2" : "0"} + 0,5 м × трубы + 2 м × узлы) × 1,10. Реальные углы, швы и манжеты не измерены`,
        };
      }
      if (material.name.startsWith("Санитарный нейтральный")) {
        return {
          ...material,
          name: "Силиконовый герметик (условная позиция, 280–310 мл)",
          subtitle: `Условно ceil(${formatRuNumber(canonical.totals.roomPerimeter)} м / 6) + 1 туба. Фактические финишные швы, сечение и выход продукта не заданы`,
        };
      }
      if (material.name.startsWith("Грунтовка под полимерную")) {
        return {
          ...material,
          name: "Грунтовка (условная позиция, 2 кг)",
          subtitle: `0,15 кг/м² × ${formatRuNumber(canonical.totals.totalArea)} м² × 1,10. Основание, впитываемость, продукт и совместимость системы не выбраны`,
        };
      }
      if (material.name.startsWith("Праймер для выбранной")) {
        return {
          ...material,
          name: "Праймер (условная позиция, 20 л)",
          subtitle: `0,30 л/м² × ${formatRuNumber(canonical.totals.totalArea)} м² × 1,10. Модель добавляет эту позицию для профилей B/C; покупайте только если её требует техкарта выбранного состава`,
        };
      }
      if (material.name.startsWith("Эластичный герметик")) {
        return {
          ...material,
          name: "Герметик для примыканий (условная позиция, 280–310 мл)",
          subtitle: `Условно ceil(${formatRuNumber(canonical.totals.roomPerimeter)} м × 0,5 / 10). Фактические деформационные швы, сечение и совместимый продукт не заданы`,
        };
      }
      return material;
    });

    const warnings = canonical.warnings.map((warning) => {
      if (warning.includes("Один слой допускается")) {
        return "Выбран множитель ×1 слой. Допустимое число слоёв, суммарную толщину, межслойную сушку и расход определяет техкарта конкретного продукта.";
      }
      if (warning.includes("Обработка стен обязательна")) {
        return "Стены не включены: рассчитана только заданная площадь пола. Реальные мокрые зоны и высоты покрытия определяют по проекту помещения и техкарте системы.";
      }
      if (warning.includes("Не указаны примыкания труб")) {
        return "Для труб и дополнительных узлов указано 0, поэтому фиксированные надбавки не применены. Обмерьте реальные проходки, манжеты и усиления: модель не добавляет типовые 3–5 узлов или скрытый процент автоматически.";
      }
      return warning;
    });

    warnings.unshift(
      `Профиль ${profile} — только коэффициент ${rateLabel} кг/м² за слой и ведро ${bucketKg} кг. Он не выбирает Ceresit, «жидкую резину», полимерную или другую реальную систему.`,
      "Лента, оба герметика, грунтовка или праймер — предварительные независимые позиции. Их наличие, тип, длину и совместимость подтвердите по проекту узлов и техкартам одной системы.",
      "Режим точности сначала меняет массу и число вёдер основного состава; MIN/REC/MAX затем применяют полевые коэффициенты к уже округлённому числу вёдер. Остальные материалы между сценариями не пересчитываются.",
    );

    const practicalNotes = (canonical.practicalNotes ?? []).map((note) => {
      if (note.includes("минимум на 200 мм")) {
        return `Модель добавила стены высотой ${canonical.totals.wallHeightMm} мм по всему периметру. Это расчётный ввод, а не универсальная схема мокрых зон.`;
      }
      if (note.includes("Учтены") && note.includes("добавлено")) {
        return `Для ${canonical.totals.pipePenetrations} труб и ${canonical.totals.insetCount} дополнительных узлов применены фиксированные надбавки: ${formatRuNumber(canonical.totals.extraMasticKg)} кг мастики и ${formatRuNumber(canonical.totals.penetrationTapeM)} м до общего запаса ленты. Геометрия узлов не рассчитывалась.`;
      }
      if (note.includes("Класс кривизны")) {
        return `Применён условный множитель неровности ×${formatRuNumber(canonical.totals.curvatureMult)}. Он не заменяет диагностику и ремонт основания до гидроизоляции.`;
      }
      return note;
    });

    return {
      materials,
      totals: canonical.totals,
      warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
    };
  },
  formulaDescription: `
**Площадь модели:** S = площадь пола + периметр × выбранная высота стен.

**Мастика:** M = (S × профиль расхода × слои × поправка неровности + 1 кг × трубы + 1,5 кг × дополнительные узлы) × режим точности. Масса округляется вверх до ведра 15 или 20 кг.

**Лента:** L = (периметр + периметр × 1,2 при выбранных стенах + 0,5 м × трубы + 2 м × дополнительные узлы) × 1,10. Это условная модель, а не обмер углов и манжет.

MIN/REC/MAX применяют полевые коэффициенты к уже округлённому числу вёдер основного состава. Грунтовка или праймер, лента и оба герметика между сценариями не меняются.
  `,
  howToUse: [
    "Введите фактическую площадь пола и периметр помещения",
    "Выберите единую высоту полосы по всему периметру; отдельные мокрые стены и проёмы модель не различает",
    "Выберите расчётный профиль только по паспортному суммарному расходу и реальной фасовке своего продукта",
    "Укажите число слоёв и, при необходимости, явные условные надбавки на трубы, узлы и неровность",
    "Сверьте мастику, ленту, манжеты, грунт и герметики с проектом узлов и техкартой одной совместимой системы до покупки",
  ],
  faq: [
    {
      question: "Как выбрать число слоёв и расход?",
      answer:
        "По технической карте конкретного состава: производитель задаёт число слоёв, суммарную толщину, расход, межслойную сушку и подготовку основания. Калькулятор только линейно умножает профиль на 1, 2 или 3 и не распознаёт выбранный продукт.",
    },
    {
      question: "Что означает высота обработки стен?",
      answer:
        "Это единая полоса по всему введённому периметру: площадь стен равна периметру, умноженному на выбранную высоту. Калькулятор не определяет реальные мокрые зоны, отдельную стену душа, проёмы и участки разной высоты.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как устроен расчёт гидроизоляции</h2>
<p>Сначала калькулятор получает условную площадь покрытия:</p>
<p><strong>S = S<sub>пола</sub> + P &times; H</strong></p>
<ul>
  <li><strong>S<sub>пола</sub></strong> — площадь пола (м²)</li>
  <li><strong>P</strong> — периметр помещения (м)</li>
  <li><strong>H</strong> — одна выбранная высота стен по всему периметру (м)</li>
</ul>
<p>Затем масса равна <strong>M = (S &times; R &times; N &times; K + 1,0 &times; T + 1,5 &times; U) &times; A</strong>, где R — профиль кг/м² за слой, N — число слоёв, K — условная поправка неровности, T — число труб, U — число дополнительных узлов, A — режим точности. Итог округляется вверх до ведра выбранного профиля.</p>
<p>MIN/REC/MAX работают не с килограммами: коэффициент сценария применяется к уже округлённому числу вёдер. Лента, грунтовка или праймер и два герметика между сценариями не пересчитываются.</p>

<h2>Три профиля модели — не три типа продукта</h2>
<table>
  <thead>
    <tr><th>Профиль</th><th>Расход за слой</th><th>Ведро</th><th>Автоматическая подготовка</th></tr>
  </thead>
  <tbody>
    <tr><td>A</td><td>1,0 кг/м&sup2;</td><td>15 кг</td><td>Грунтовка 0,15 кг/м&sup2; &times; 1,10, банка 2 кг</td></tr>
    <tr><td>B</td><td>1,2 кг/м&sup2;</td><td>20 кг</td><td>Условный праймер 0,30 л/м&sup2; &times; 1,10, канистра 20 л</td></tr>
    <tr><td>C</td><td>0,8 кг/м&sup2;</td><td>15 кг</td><td>Условный праймер 0,30 л/м&sup2; &times; 1,10, канистра 20 л</td></tr>
  </tbody>
</table>
<p>Профили не выбирают химический тип, область применения или совместимый праймер. Например, официальная карточка <a href="https://ceresit.ru/ru/products/waterproofing/waterproofing-materials/cl_51_combo" target="_blank" rel="noopener noreferrer">Ceresit CL 51 COMBO</a> указывает для конкретной мастики около 1,4 кг/м&sup2; суммарно за два слоя, а комплект 7,5 кг + 8 м ленты рассчитан на площадь до 5,7 м&sup2;. Эти данные не совпадают с профилем A и не загружаются автоматически.</p>

<h2>Лента и узлы</h2>
<p>Лента в этой модели считается как <strong>(P + P &times; 1,2 при выбранных стенах + 0,5 &times; T + 2 &times; U) &times; 1,10</strong>. Множитель P &times; 1,2 — условная аппроксимация, а не длина фактических вертикальных углов. Тип и ширина ленты, готовые внутренние углы и манжеты модель не выбирает. Область применения конкретной ленты проверяйте по карточке производителя, например <a href="https://www.ceresit.ru/ru/products/waterproofing/waterproofing-materials/cl-152-sealing-tape/" target="_blank" rel="noopener noreferrer">Ceresit CL 152</a>.</p>

<h2>Проектные и монтажные требования</h2>
<p><a href="https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430" target="_blank" rel="noopener noreferrer">СП 29.13330.2011 «Полы» с изменениями</a> относится к проектированию полов, а <a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017 «Изоляционные и отделочные покрытия» с изменениями</a> — к производству и приёмке изоляционных работ. Эти документы не превращают профили A/B/C, высоту 200 мм или фиксированные надбавки на узлы в универсальную норму для любой ванной, душевой или балкона. Зоны, основание и узлы задаёт проект, а расход, слои и совместимость — техкарта выбранной системы.</p>
`,
    faq: [
      {
        question: "Как получается 16 кг в примере 6 м²?",
        answer: "<p>При периметре 10 м и высоте стен 200 мм площадь модели равна 6 + 10 &times; 0,2 = 8 м&sup2;. Профиль A и два слоя дают 8 &times; 1,0 &times; 2 = <strong>16 кг</strong> до режима точности и сценариев. Ведро профиля A равно 15 кг, поэтому базовая покупка округляется до двух вёдер, то есть 30 кг. Это пример коэффициентов калькулятора, а не расчёт Ceresit CL 51 или другого товара.</p>",
      },
      {
        question: "Почему расчёт ленты нужно перепроверить вручную?",
        answer: "<p>Калькулятор не получает длины отдельных горизонтальных и вертикальных углов. Он использует условную формулу через периметр и фиксированные метры на трубы и дополнительные узлы. Для закупки измерьте фактические швы, выберите совместимые ленту, готовые углы и манжеты по проекту и техкарте системы.</p>",
      },
      {
        question: "Можно ли выбрать реальный продукт по профилю A, B или C?",
        answer: "<p>Нет. Профили задают только число кг/м&sup2; за слой и размер условного ведра. Они не кодируют состав, область применения, допустимое основание, толщину, время сушки, фасовки, грунт или комплектные элементы. Сначала выберите систему по проектным условиям и её техкарте, затем сравните паспортный суммарный расход и реальную фасовку с ближайшим профилем.</p>",
      },
    ],
  },
};
