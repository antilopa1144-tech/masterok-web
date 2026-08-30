import type { CalculatorDefinition, CalculatorField } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalStairs } from "../../../../engine/stairs";
import stairsSpec from "../../../../configs/calculators/stairs-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const hiddenWhen = (key: string, value = 0) => ({ key, op: "eq" as const, value });

function numberField(
  key: string,
  label: string,
  unit: string,
  defaultValue: number,
  max: number,
  step: number,
  group: string,
  options: Partial<CalculatorField> = {},
): CalculatorField {
  return { key, label, type: "number", unit, min: 0, max, step, defaultValue, group, ...options };
}

const geometryGroup = "Геометрия одного марша";
const treadGroup = "Ступени и подступенки";
const stringerGroup = "Несущие элементы по проекту";
const concreteGroup = "Монолитная лестница по проекту";
const railingGroup = "Ограждение по проекту";
const otherGroup = "Крепёж и площадки по проекту";

export const stairsDef: CalculatorDefinition = {
  id: "stairs",
  slug: "kalkulyator-lestnicy",
  title: "Калькулятор прямой лестницы",
  h1: "Прямая лестница — геометрия марша и закупка по проекту",
  description:
    "Рассчитайте подъёмы, проступи, длину и уклон одного прямого марша, затем переведите готовую проектную ведомость в покупные единицы.",
  metaTitle: withSiteMetaTitle("Прямая лестница: ступени и материалы по проекту"),
  metaDescription:
    "Бесплатный калькулятор прямой лестницы: рассчитайте геометрию ступеней, длину марша, габарит прохода и закупку по проекту и реальным фасовкам.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["лестница", "ступени", "проступь", "косоур", "расчёт лестницы", "материалы по проекту"],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "geometryMode", label: "Как задано число подъёмов", type: "select", defaultValue: 0,
      options: [
        { value: 0, label: "Подобрать по целевой высоте подступенка" },
        { value: 1, label: "Ввести число подъёмов из проекта" },
      ],
      hint: "Автоподбор нужен для эскиза. Перед закупкой число подъёмов фиксируют по проекту и чистовым отметкам.",
      group: geometryGroup, fullWidth: true,
    },
    numberField("floorRiseM", "Высота от чистого пола до чистого пола", "м", 2.8, 6, 0.001, geometryGroup, {
      min: 1,
      hint: "Не черновая высота помещения: учитываются будущие покрытия обоих этажей.",
    }),
    numberField("targetRiserHeightMm", "Целевая высота подступенка", "мм", 175, 250, 1, geometryGroup, {
      min: 100, hideIf: hiddenWhen("geometryMode", 1),
      hint: "Калькулятор округлит число подъёмов и покажет фактическую высоту.",
    }),
    numberField("projectRiserCount", "Число подъёмов по проекту", "шт", 16, 50, 1, geometryGroup, {
      min: 1, integerOnly: true, hideIf: hiddenWhen("geometryMode", 0),
    }),
    numberField("treadDepthMm", "Глубина проступи по линии хода", "мм", 280, 500, 1, geometryGroup, {
      min: 100, hint: "Для забежных ступеней и поворотов этот расчёт не применяется.",
    }),
    {
      key: "topFloorActsAsTread", label: "Верхний пол заменяет последнюю проступь", type: "select", defaultValue: 1,
      options: [
        { value: 1, label: "Да — проступей на одну меньше подъёмов" },
        { value: 0, label: "Нет — верхняя проступь отдельная" },
      ],
      group: geometryGroup, fullWidth: true,
    },
    numberField("stairWidthM", "Ширина марша", "м", 1, 3, 0.01, geometryGroup, {
      min: 0.5, hint: "Не назначает число несущих элементов и ограждений.",
    }),
    numberField("openingLengthM", "Длина проёма вдоль марша", "м", 0, 20, 0.01, "Эскизная проверка прохода", {
      hint: "0 — не оценивать габарит прохода. Точная проверка выполняется по разрезу.",
    }),
    numberField("floorStructureThicknessM", "Толщина перекрытия с чистовыми слоями", "м", 0.3, 2, 0.01, "Эскизная проверка прохода", {
      hideIf: hiddenWhen("openingLengthM"),
      hint: "Оценка не учитывает балки, выступы, ограждение и локальные препятствия.",
    }),
    {
      key: "includeTreadBlanks", label: "Добавить чистовые заготовки ступеней", type: "select", defaultValue: 1,
      options: [
        { value: 1, label: "Да — количество берётся из геометрии" },
        { value: 0, label: "Нет — не включать в закупку" },
      ],
      hint: "Материал, толщина, опирание и несущая способность должны быть определены проектом.",
      group: treadGroup, fullWidth: true,
    },
    numberField("treadReservePercent", "Запас чистовых ступеней", "%", 0, 50, 1, treadGroup, {
      hideIf: hiddenWhen("includeTreadBlanks"),
    }),
    numberField("treadsPerPackagePcs", "Ступеней в одной покупной упаковке", "шт", 1, 1000, 1, treadGroup, {
      integerOnly: true, hideIf: hiddenWhen("includeTreadBlanks"), hint: "Для заказных одиночных деталей оставьте 1.",
    }),
    numberField("riserProjectPcs", "Подступенки из проектной ведомости", "шт", 0, 1000, 1, treadGroup, {
      integerOnly: true, hint: "0 — открытая лестница или позиция не включается.",
    }),
    numberField("riserReservePercent", "Запас подступенков", "%", 0, 50, 1, treadGroup, {
      hideIf: hiddenWhen("riserProjectPcs"),
    }),
    numberField("risersPerPackagePcs", "Подступенков в упаковке", "шт", 1, 1000, 1, treadGroup, {
      integerOnly: true, hideIf: hiddenWhen("riserProjectPcs"),
    }),
    numberField("stringerProjectPcs", "Косоуры или тетивы одной проектной позиции", "шт", 0, 100, 1, stringerGroup, {
      integerOnly: true,
      hint: "Количество, сечение, материал и узлы переносите из проекта; разные позиции считайте отдельно.",
    }),
    numberField("stringerBlankLengthM", "Длина одной проектной детали", "м", 0, 30, 0.01, stringerGroup, {
      hideIf: hiddenWhen("stringerProjectPcs"),
    }),
    numberField("stringerReservePercent", "Запас деталей на брак и раскрой", "%", 0, 50, 1, stringerGroup, {
      hideIf: hiddenWhen("stringerProjectPcs"),
    }),
    numberField("stringerStockLengthM", "Длина покупной заготовки", "м", 0, 30, 0.01, stringerGroup, {
      hideIf: hiddenWhen("stringerProjectPcs"),
      hint: "Если заготовка короче детали, калькулятор не предполагает составной элемент.",
    }),
    numberField("concreteProjectM3", "Бетон из проектной ведомости", "м³", 0, 100, 0.001, concreteGroup, {
      hint: "0 — не включать. Класс, армирование, опалубку и схему бетонирования задаёт проект.",
    }),
    numberField("concreteReservePercent", "Запас бетона", "%", 5, 30, 1, concreteGroup, {
      hideIf: hiddenWhen("concreteProjectM3"),
    }),
    numberField("concreteOrderStepM3", "Минимальный шаг заказа бетона", "м³", 0.1, 10, 0.001, concreteGroup, {
      hideIf: hiddenWhen("concreteProjectM3"),
    }),
    numberField("rebarProjectKg", "Масса арматуры по проекту", "кг", 0, 100000, 0.1, concreteGroup, {
      hint: "Диаметры, классы, нахлёсты, анкеровку и защитный слой калькулятор не назначает.",
    }),
    numberField("rebarReservePercent", "Запас арматуры", "%", 5, 30, 1, concreteGroup, {
      hideIf: hiddenWhen("rebarProjectKg"),
    }),
    numberField("rebarPackageKg", "Закупочный шаг арматуры", "кг", 1, 10000, 0.1, concreteGroup, {
      hideIf: hiddenWhen("rebarProjectKg"),
    }),
    numberField("handrailProjectM", "Длина поручня одной проектной позиции", "м", 0, 1000, 0.01, railingGroup, {
      hint: "Число сторон, высота, сечение, стыки и узлы должны быть определены проектом.",
    }),
    numberField("handrailReservePercent", "Запас поручня", "%", 5, 30, 1, railingGroup, {
      hideIf: hiddenWhen("handrailProjectM"),
    }),
    numberField("handrailStockLengthM", "Длина покупной заготовки поручня", "м", 0, 30, 0.01, railingGroup, {
      hideIf: hiddenWhen("handrailProjectM"),
    }),
    numberField("railingInfillProjectPcs", "Стойки или элементы заполнения по проекту", "шт", 0, 10000, 1, railingGroup, {
      integerOnly: true, hint: "Калькулятор не выводит шаг и безопасные просветы из длины марша.",
    }),
    numberField("railingInfillReservePercent", "Запас элементов ограждения", "%", 0, 30, 1, railingGroup, {
      hideIf: hiddenWhen("railingInfillProjectPcs"),
    }),
    numberField("railingInfillPackagePcs", "Элементов ограждения в упаковке", "шт", 1, 10000, 1, railingGroup, {
      integerOnly: true, hideIf: hiddenWhen("railingInfillProjectPcs"),
    }),
    numberField("fastenersProjectPcs", "Крепёж и анкеры одной проектной позиции", "шт", 0, 1000000, 1, otherGroup, {
      integerOnly: true, hint: "Тип, размер, материал, несущую способность и зоны крепления задаёт проект.",
    }),
    numberField("fastenersReservePercent", "Запас крепежа", "%", 5, 30, 1, otherGroup, {
      hideIf: hiddenWhen("fastenersProjectPcs"),
    }),
    numberField("fastenersPackagePcs", "Крепежа в упаковке", "шт", 0, 100000, 1, otherGroup, {
      integerOnly: true, hideIf: hiddenWhen("fastenersProjectPcs"),
    }),
    numberField("landingFinishProjectM2", "Покрытие площадок из проектной ведомости", "м²", 0, 1000, 0.01, otherGroup, {
      hint: "Площадка не выводится из прямого марша автоматически.",
    }),
    numberField("landingFinishReservePercent", "Запас покрытия площадок", "%", 10, 50, 1, otherGroup, {
      hideIf: hiddenWhen("landingFinishProjectM2"),
    }),
    numberField("landingFinishPackageM2", "Площадь покрытия в упаковке", "м²", 0, 1000, 0.001, otherGroup, {
      hideIf: hiddenWhen("landingFinishProjectM2"),
    }),
  ],
  calculate(inputs) {
    return computeCanonicalStairs(stairsSpec as never, inputs, defaultFactorTables.factors as never);
  },
  formulaDescription: `
**Геометрия одного прямого марша:**

1. **Число подъёмов** — округление высоты этажа к целевой высоте подступенка либо точное количество из проекта.
2. **Фактический подступенок** — высота от чистого пола до чистого пола / число подъёмов.
3. **Число проступей** — равно числу подъёмов или на одну меньше, если верхний пол служит последней проступью.
4. **Горизонтальная длина** — число проступей × их глубина; **длина по уклону** — гипотенуза подъёма и горизонтальной длины.
5. **К покупке** — проектное количество с явным запасом, округлённое вверх по реальной фасовке или длине заготовки.

Оценка габарита прохода строится по линии уклона. Она помогает заметить риск, но не заменяет проектный разрез.
  `,
  howToUse: [
    "Укажите высоту между чистыми полами и выберите автоподбор или проектное число подъёмов",
    "Введите глубину проступи и уточните, является ли верхний пол последней проступью",
    "Для эскизной проверки прохода добавьте длину проёма и толщину перекрытия",
    "Перенесите в закупку только готовые количества из проекта и фасовки выбранных товаров",
  ],
  expertTips: [
    {
      title: "Сначала чистовые отметки",
      content: "Даже небольшое изменение толщины пола меняет высоту крайних ступеней. Финальное число подъёмов фиксируйте после увязки всех чистовых слоёв.",
      author: "Проектная граница калькулятора",
    },
    {
      title: "Каждый типоразмер — отдельной строкой",
      content: "Косоуры, поручни, анкеры и элементы ограждения разных длин или сечений считайте отдельными позициями: общий метраж скрывает ограничения раскроя.",
      author: "Практика комплектации",
    },
  ],
  faq: [
    {
      question: "Почему подъёмов и проступей может быть разное количество?",
      answer: "Если верхний чистый пол служит последней поверхностью шага, проступей на одну меньше, чем подъёмов. При отдельной верхней ступени количества совпадают.",
    },
    {
      question: "Можно ли по этому расчёту выбрать косоур или армирование?",
      answer: "Нет. Сечения, опоры, соединения, армирование и анкеры зависят от нагрузок и конструктивной схемы. Калькулятор принимает только готовую проектную ведомость.",
    },
    {
      question: "Насколько точна проверка высоты прохода?",
      answer: "Это эскизная оценка по прямой линии уклона. Точный габарит проверяют на разрезе с балками, чистовыми слоями, выступами, площадками и ограждениями.",
    },
    {
      question: "Подходит ли расчёт для Г- и П-образной лестницы?",
      answer: "Только для каждого прямого марша отдельно. Повороты, площадки и забежные ступени рассчитывают по проектной геометрии без условных коэффициентов.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что именно считает калькулятор прямой лестницы</h2>
<p>Расчёт предназначен для <strong>одного прямого марша</strong> с постоянной высотой подступенка и глубиной проступи. Он показывает число подъёмов и проступей, фактическую высоту подступенка, горизонтальную длину, длину по уклону, угол и контрольное значение <strong>2h + b</strong>.</p>
<p>Если указать длину проёма и толщину перекрытия, калькулятор даст эскизную оценку габарита прохода. Для закупки он не придумывает конструкцию: косоуры, бетон, арматура, поручни, заполнение ограждения, крепёж и покрытие площадок появляются только после ввода готовых проектных количеств.</p>

<h2>Почему здесь нет автоматического подбора материалов</h2>
<p>Одинаковая геометрия может быть реализована деревянной, стальной, железобетонной или комбинированной конструкцией. Сечение и число несущих элементов, опоры, узлы, армирование и анкеры зависят от нагрузок и расчётной схемы. Поэтому калькулятор разделяет геометрию, явный запас и округление до покупной единицы.</p>

<h2>Нормативная граница</h2>
<p>Для одноквартирных домов область проектирования описывает <a href="https://protect.gost.ru/sp/details/a99146d7-4dc6-4bb8-96e0-35e0233050c2" rel="noopener noreferrer">СП 55.13330.2016</a>, а требования к эвакуационным путям зависят от назначения лестницы и рассматриваются по <a href="https://protect.gost.ru/sp/details/9fdcb635-708c-4c67-81a7-83e6baad9ab3" rel="noopener noreferrer">СП 1.13130.2020</a>. Несущие деревянные, стальные и железобетонные элементы рассчитывают соответственно по СП 64.13330.2017, СП 16.13330.2017 и СП 63.13330.2018.</p>
<p><a href="https://protect.gost.ru/gost/details/0201c996-021b-408c-b36e-778f77f18f70" rel="noopener noreferrer">ГОСТ 25772-2025</a> относится к металлическим ограждениям. <a href="https://protect.gost.ru/gost/details/7814a8b1-2ee4-4c42-b314-ec344a2a149b" rel="noopener noreferrer">ГОСТ 23120-2016</a> имеет область применения для стальных маршевых лестниц производственных зданий и не используется здесь как универсальная норма бытовой лестницы.</p>

<h2>Как читать результат</h2>
<ul>
  <li><strong>Точная потребность</strong> — геометрическое или проектное количество до запаса.</li>
  <li><strong>С запасом</strong> — только введённый пользователем процент, без скрытого коэффициента.</li>
  <li><strong>К покупке</strong> — округление вверх по фактической упаковке, длине заготовки или шагу заказа.</li>
  <li><strong>MIN / REC / MAX</strong> — сценарии только для чистовых ступеней; MAX совпадает с REC и не добавляет скрытый запас.</li>
</ul>
`,
    faq: [
      {
        question: "Как рассчитать число ступеней при высоте 2,8 м?",
        answer: "<p>При целевой высоте подступенка 175 мм калькулятор получает 16 подъёмов: 2800 / 175 = 16. Если верхний пол служит последней проступью, чистовых проступей будет 15.</p>",
      },
      {
        question: "Зачем отдельно вводить длину косоура из проекта?",
        answer: "<p>Длина линии уклона описывает геометрию марша, но не равна автоматически покупной детали. Узлы опирания, выпуски, запилы и соединения меняют проектную длину.</p>",
      },
    ],
  },
};
