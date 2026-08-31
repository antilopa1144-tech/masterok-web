import facadePanelsSpec from "../../../../configs/calculators/facade-panels-canonical.v1.json";
import { computeCanonicalFacadePanels } from "../../../../engine/facade-panels";
import { withSiteMetaTitle } from "../meta";
import type { CalculatorDefinition } from "../types";

const formatRuNumber = (value: number, maximumFractionDigits = 3): string => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits,
}).format(value);

const getSpecDefault = (key: string, fallback: number): number => Number(
  facadePanelsSpec.input_schema.find((field) => field.key === key)?.default_value ?? fallback,
);

export const facadePanelsDef: CalculatorDefinition = {
  id: "exterior_facade_panels",
  slug: "fasadnye-paneli",
  title: "Калькулятор фасадных панелей",
  h1: "Калькулятор фасадных панелей — расчёт к покупке",
  description: "Рассчитайте чистую площадь фасада, панели с одним явным запасом, профиль, утеплитель и доборные элементы по данным выбранной системы.",
  metaTitle: withSiteMetaTitle("Калькулятор фасадных панелей: расчёт к покупке"),
  metaDescription: "Бесплатный калькулятор фасадных панелей: рассчитайте площадь без проёмов, количество панелей, профиль, утеплитель и доборные элементы к покупке.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["фасадные панели", "сайдинг", "обшивка фасада", "доборные элементы", "профиль"],
  popularity: 55,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 0, label: "По размерам дома" },
        { value: 1, label: "По готовой площади" },
      ],
    },
    {
      key: "area",
      label: "Чистая площадь фасада",
      type: "number",
      unit: "м²",
      min: 1,
      max: 5000,
      step: 0.1,
      defaultValue: 100,
      group: "byArea",
      hint: "Площадь уже без окон и дверей. В этом режиме нет периметра и высоты, поэтому профиль, наружные углы и стартовые элементы не рассчитываются.",
    },
    { key: "houseLength", label: "Длина прямоугольного дома", type: "number", unit: "м", min: 1, max: 200, step: 0.1, defaultValue: 10, group: "bySize", hint: "Периметр модели равен 2 × (длина + ширина). Выступы, пристройки и отдельные фасады не задаются." },
    { key: "houseWidth", label: "Ширина прямоугольного дома", type: "number", unit: "м", min: 1, max: 200, step: 0.1, defaultValue: 10, group: "bySize", hint: "Используется только для прямоугольного периметра 2 × (длина + ширина)." },
    { key: "wallHeight", label: "Единая высота стен", type: "number", unit: "м", min: 1, max: 20, step: 0.1, defaultValue: 3, group: "bySize", hint: "Одна высота применяется ко всему периметру. Фронтоны, цоколь, карнизы и перепады высоты не рассчитываются." },
    { key: "openingsArea", label: "Суммарная площадь проёмов", type: "number", unit: "м²", min: 0, max: 2000, step: 0.1, defaultValue: 10, group: "bySize", hint: "Вычитается только из площади облицовки. Обрамление окон и дверей, усиление подсистемы и подрезка вокруг проёмов не добавляются." },
    {
      key: "panelType",
      label: "Тип облицовки",
      type: "select",
      defaultValue: 0,
      fullWidth: true,
      options: [
        { value: 0, label: "Виниловый сайдинг" },
        { value: 1, label: "Металлический сайдинг" },
        { value: 2, label: "Фиброцементный сайдинг" },
        { value: 3, label: "Деревянный блок-хаус" },
        { value: 4, label: "Фасадные термопанели" },
        { value: 5, label: "Профлист стеновой" },
        { value: 6, label: "HPL-панели" },
      ],
      hint: "Тип меняет только название в смете. Он не выбирает конструкцию подсистемы, рабочую ширину, крепёж, раскладку или область применения.",
    },
    { key: "panelUsefulArea", label: "Полезная площадь одной панели", type: "number", unit: "м²", min: 0.01, max: 25, step: 0.01, defaultValue: 0.84, hint: "Перенесите рабочую площадь конкретного товара с учётом замка или нахлёста. Калькулятор не проверяет направление и раскладку." },
    { key: "reservePercent", label: "Явный запас панелей", type: "slider", unit: "%", min: 0, max: 30, step: 1, defaultValue: 10, hint: "Применяется один раз до округления до целой панели. Достаточность запаса для раскладки по отдельным фасадам не проверяется." },
    { key: "needProfile", label: "Оценить вертикальный профиль или рейку", type: "switch", defaultValue: 1, group: "bySize", hint: "Доступно только при заданной геометрии. Это длина вертикальных рядов, а не расчёт несущей подсистемы." },
    { key: "profileStep", label: "Шаг вертикальных рядов", type: "number", unit: "м", min: 0.1, max: 2, step: 0.05, defaultValue: 0.4, group: "bySize", hideIf: { key: "needProfile", op: "eq", value: 0 }, hint: "Число рядов = ceil(периметр / шаг), длина = ряды × высота. Проёмы, углы, горизонтальные ряды и усиления не учитываются." },
    { key: "profilePieceLength", label: "Товарная длина профиля или рейки", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3, group: "bySize", hideIf: { key: "needProfile", op: "eq", value: 0 }, hint: "Расчётную длину модель делит на эту длину и округляет вверх. Стыки и допустимая схема соединения не проверяются." },
    { key: "fastenersPerPanel", label: "Крепежа на одну панель", type: "number", unit: "шт", min: 0, max: 100, step: 1, integerOnly: true, defaultValue: 0, hint: "Укажите норму для конкретной панели и схемы крепления; 0 — не добавлять. Основание, краевые зоны и ветровая нагрузка автоматически не определяются." },
    { key: "needInsulation", label: "Посчитать утеплитель", type: "switch", defaultValue: 0 },
    { key: "insulationPackArea", label: "Площадь утеплителя в упаковке", type: "number", unit: "м²", min: 0.1, max: 100, step: 0.01, defaultValue: 5.76, hideIf: { key: "needInsulation", op: "eq", value: 0 }, hint: "Значение с этикетки выбранного утеплителя. Толщина, число слоёв, теплотехника, крепление и запас не рассчитываются." },
    { key: "externalCorners", label: "Полноразмерных наружных углов", type: "number", unit: "шт", min: 0, max: 100, step: 1, integerOnly: true, defaultValue: 4, group: "bySize", hint: "Каждый угол принимается равным полной введённой высоте. Углы другой высоты и внутренние углы не учитываются." },
    { key: "cornerPieceLength", label: "Товарная длина наружного угла", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3, group: "bySize", hint: "Общая длина = число углов × высота; результат округляется вверх до целого элемента." },
    { key: "starterPieceLength", label: "Товарная длина стартового элемента", type: "number", unit: "м", min: 0.5, max: 12, step: 0.1, defaultValue: 3, group: "bySize", hint: "Модель автоматически прокладывает стартовый элемент по всему прямоугольному периметру. Разрывы, цоколь, фронтоны и другая схема не задаются." },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalFacadePanels(facadePanelsSpec as any, inputs);
    const inputMode = Number(canonical.totals.inputMode);
    const panelUsefulArea = Number(canonical.totals.panelUsefulArea);
    const reservePercent = Number(canonical.totals.reservePercent);
    const perimeter = Number(canonical.totals.wallLength);
    const wallHeight = Number(canonical.totals.wallHeight);
    const panelsCount = Number(canonical.totals.panelsCount);
    const profileStep = Number(inputs.profileStep ?? getSpecDefault("profileStep", 0.4));
    const profilePieceLength = Number(inputs.profilePieceLength ?? getSpecDefault("profilePieceLength", 3));
    const fastenersPerPanel = Number(inputs.fastenersPerPanel ?? getSpecDefault("fastenersPerPanel", 0));
    const insulationPackArea = Number(inputs.insulationPackArea ?? getSpecDefault("insulationPackArea", 5.76));
    const externalCorners = Number(inputs.externalCorners ?? getSpecDefault("externalCorners", 4));
    const cornerPieceLength = Number(inputs.cornerPieceLength ?? getSpecDefault("cornerPieceLength", 3));
    const starterPieceLength = Number(inputs.starterPieceLength ?? getSpecDefault("starterPieceLength", 3));

    const materials = canonical.materials
      .filter((material) => inputMode === 0 || !["Подсистема", "Доборные элементы"].includes(material.category))
      .map((material) => {
        if (material.category === "Облицовка") {
          return {
            ...material,
            subtitle: `${formatRuNumber(Number(canonical.totals.area))} м² / ${formatRuNumber(panelUsefulArea)} м² × (1 + ${formatRuNumber(reservePercent, 1)}%) = ${formatRuNumber(material.quantity)} шт.; к покупке ceil = ${panelsCount} шт. Тип меняет только название, раскладка не выполняется`,
          };
        }
        if (material.category === "Подсистема") {
          const profileRuns = Math.ceil(perimeter / profileStep);
          return {
            ...material,
            subtitle: `ceil(${formatRuNumber(perimeter)} м / ${formatRuNumber(profileStep)} м) = ${profileRuns} вертикальных рядов; × ${formatRuNumber(wallHeight)} м = ${formatRuNumber(Number(canonical.totals.profileLength))} м; товарная длина ${formatRuNumber(profilePieceLength)} м. Проёмы и усиления не моделируются`,
          };
        }
        if (material.category === "Крепёж") {
          return {
            ...material,
            subtitle: `${panelsCount} панелей REC × ${formatRuNumber(fastenersPerPanel, 1)} шт. = ${formatRuNumber(Number(canonical.totals.fasteners))} шт. Основание, краевые зоны, схема и ветровая нагрузка не заданы`,
          };
        }
        if (material.category === "Утепление") {
          return {
            ...material,
            subtitle: `${formatRuNumber(Number(canonical.totals.area))} м² / ${formatRuNumber(insulationPackArea)} м² в упаковке → ${formatRuNumber(Number(canonical.totals.insulationPacks))} упак. Запас, толщина, слои, теплотехника и крепление не рассчитываются`,
          };
        }
        if (material.name === "Наружные угловые элементы") {
          return {
            ...material,
            subtitle: `ceil(${formatRuNumber(externalCorners)} угла × ${formatRuNumber(wallHeight)} м / ${formatRuNumber(cornerPieceLength)} м) = ${formatRuNumber(Number(canonical.totals.cornersCount))} шт. Все углы приняты полноразмерными`,
          };
        }
        if (material.name === "Стартовые элементы") {
          return {
            ...material,
            subtitle: `ceil(${formatRuNumber(perimeter)} м полного периметра / ${formatRuNumber(starterPieceLength)} м) = ${formatRuNumber(Number(canonical.totals.startersCount))} шт. Необходимость и фактическую длину определяет выбранная система`,
          };
        }
        return material;
      });

    const warnings = [...canonical.warnings];
    warnings.unshift(
      "Тип облицовки меняет только название основной позиции. Калькулятор не выбирает конструкцию подсистемы, рабочую ширину, крепёж, узлы или допустимость применения конкретного товара.",
      "MIN/REC/MAX меняют только число панелей. Профиль, крепёж, утеплитель и доборные элементы не получают отдельного сценарного запаса; крепёж считается от количества панелей REC.",
    );
    if (inputMode === 1) {
      warnings.unshift(
        "В режиме готовой площади периметр и высота не заданы, поэтому профиль, наружные углы и стартовые элементы исключены из web-ведомости. Для их оценки переключитесь на ввод по размерам.",
      );
    } else {
      warnings.unshift(
        "Геометрия — прямоугольный периметр 2 × (длина + ширина) с одной высотой. Фронтоны, выступы, цоколь, карнизы и отдельные плоскости не рассчитываются.",
      );
    }

    const totals: Record<string, number> = { ...canonical.totals };
    if (inputMode === 1) {
      for (const key of [
        "houseLength",
        "houseWidth",
        "wallLength",
        "wallHeight",
        "openingsArea",
        "profileLength",
        "profilePieces",
        "cornersCount",
        "startersCount",
      ]) {
        delete totals[key];
      }
    }

    const practicalNotes = (canonical.practicalNotes ?? []).map((note) => {
      if (note.startsWith("Полезную площадь панели")) {
        return inputMode === 1
          ? "Полезную площадь панели, расход крепежа и площадь утеплителя в упаковке перенесите из документации конкретных товаров. Геометрические элементы в этом режиме не считаются."
          : "Полезную площадь панели, расход крепежа, шаг и длину профиля перенесите из документации конкретной системы. Формулы показывают только предварительную длину и количество.";
      }
      return note;
    });

    return {
      materials,
      totals,
      warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
    };
  },
  formulaDescription: `
**Площадь:** при вводе по размерам S = 2 × (длина + ширина) × единая высота − суммарная площадь проёмов. При вводе готовой площади используется только S; периметр, профиль, углы и стартовые элементы не рассчитываются.

**Панели:** N = S / полезную площадь панели × (1 + явный запас / 100); к покупке = ceil(N). MIN считает без запаса, REC — с введённым запасом, MAX — не менее 15%.

**Только в режиме размеров:** вертикальные ряды = ceil(периметр / шаг), длина профиля = ряды × высота; наружные углы = ceil(число углов × высота / товарную длину); старт = ceil(периметр / товарную длину).

Крепёж = панели REC × введённая норма на панель. Утеплитель = ceil(чистая площадь / площадь упаковки). Эти позиции не получают отдельного MIN/REC/MAX и не образуют автоматически совместимую фасадную систему.
  `,
  howToUse: [
    "Выберите готовую чистую площадь для панелей либо прямоугольные размеры для предварительной геометрии подсистемы и доборов",
    "Перенесите полезную площадь конкретной панели, а не её габаритную площадь",
    "Укажите один явный запас; при вводе размеров отдельно проверьте шаг вертикальных рядов и товарные длины",
    "Добавляйте крепёж и утеплитель только по паспортным данным выбранных товаров",
    "Сверьте раскладку, проёмы, узлы, ветровую нагрузку и совместимость системы до заказа",
  ],
  faq: [
    {
      question: "Почему нужна именно полезная площадь панели?",
      answer: "Габаритная площадь может включать замок или нахлёст, который не закрывает фасад. Для закупки используйте рабочую ширину или полезную площадь из документации производителя.",
    },
    {
      question: "Считает ли калькулятор раскладку по каждому фасаду?",
      answer: "Нет. Это оценка закупки по площади. Для сложных фасадов отдельно проверьте раскрой, направление монтажа, швы, примыкания и возможность повторно использовать подрезки.",
    },
    {
      question: "Откуда брать шаг профиля и количество крепежа?",
      answer: "Из альбома технических решений и паспорта выбранной фасадной системы. Эти значения зависят от материала стены, ветрового района, размеров панелей и схемы крепления.",
    },
    {
      question: "Почему в режиме готовой площади нет профиля и доборных элементов?",
      answer: "Площадь не содержит периметр, высоту, число полноразмерных углов и длины примыканий. Подстановка скрытого дома дала бы выдуманную ведомость, поэтому эти позиции появляются только при вводе размеров.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как считается закупка фасадных панелей</h2>
<p>В режиме размеров используется прямоугольная модель: <strong>S = 2 &times; (L + W) &times; H − S<sub>проёмов</sub></strong>. Одна высота применяется ко всему периметру; фронтоны, пристройки, цоколь, карнизы и отдельные плоскости не задаются. В режиме готовой площади калькулятор принимает уже чистое S и не выдумывает отсутствующие периметр и высоту.</p>
<p>Площадь делится на <strong>полезную площадь одной панели</strong>. Пользовательский запас применяется один раз, после чего результат округляется вверх до целой панели.</p>
<p><strong>N = &lceil;(S / S<sub>полезная</sub>) &times; (1 + Z / 100)&rceil;</strong></p>
<p>Где <strong>S</strong> — чистая площадь, <strong>S<sub>полезная</sub></strong> — рабочая площадь панели, <strong>Z</strong> — выбранный запас.</p>
<p>MIN показывает панели без запаса, REC — с выбранным запасом, MAX — с запасом не менее 15%. Сценарии не пересчитывают профиль, крепёж, утеплитель или доборные элементы; крепёж использует число панелей REC.</p>

<h2>Почему режим готовой площади не считает профиль и доборы</h2>
<p>Из одной площади невозможно получить периметр, высоту и число углов. Поэтому в этом режиме результат содержит панели, крепёж по введённой норме и утеплитель по площади упаковки. Профиль, наружные углы и стартовые элементы исключены, а не рассчитываются по скрытой геометрии.</p>

<h2>Предварительные формулы режима размеров</h2>
<ul>
  <li>вертикальные ряды: <strong>ceil(P / шаг)</strong>, их длина: ряды &times; H;</li>
  <li>профили к покупке: <strong>ceil(длина рядов / товарная длина)</strong>;</li>
  <li>наружные углы: <strong>ceil(число полноразмерных углов &times; H / длина элемента)</strong>;</li>
  <li>стартовые элементы: <strong>ceil(P / длина элемента)</strong> по всему прямоугольному периметру;</li>
  <li>крепёж: панели REC &times; введённая норма на панель;</li>
  <li>утеплитель: <strong>ceil(S / площадь упаковки)</strong> без отдельного запаса и без расчёта толщины.</li>
</ul>
<p>Проёмы уменьшают площадь панелей, но не вычитаются из вертикальных рядов и не создают обрамления или усиления. Внутренние углы, соединительные, финишные и околооконные профили, отливы, откосы, мембраны, кронштейны и анкеры в ведомость не входят.</p>

<h2>Граница проекта фасада</h2>
<p>Выбор «виниловый сайдинг», «профлист», «термопанели» или «HPL» меняет только название позиции. Калькулятор не подтверждает общую подсистему для разных материалов. Для навесной вентилируемой системы действующий <a href="https://protect.gost.ru/gost/details/4fff71ba-dddf-4047-9f0e-440ad9ee581b" target="_blank" rel="noopener noreferrer">ГОСТ Р 58883-2020</a> устанавливает правила расчёта подконструкций. Нагрузки и их сочетания относятся к <a href="https://protect.gost.ru/sp/details/bac9e1fe-45f1-401b-8e32-949f4ee27821" target="_blank" rel="noopener noreferrer">СП 20.13330.2016 с изменениями № 1–6</a>, а теплотехнические параметры утепления — к действующему <a href="https://protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c" target="_blank" rel="noopener noreferrer">СП 50.13330.2024</a>. Эти документы не задают универсальный шаг, крепёж или полезную площадь для всех семи названий в селекте.</p>
    `,
    faq: [
      {
        question: "Что можно посчитать по готовой площади фасада?",
        answer: "Панели по полезной площади и явному запасу, крепёж по введённой норме на панель и упаковки утеплителя. Профиль и доборные элементы требуют периметр, высоту и углы, поэтому в этом режиме исключаются.",
      },
      {
        question: "Учитывает ли калькулятор окна в подсистеме?",
        answer: "Нет. Площадь проёмов вычитается из облицовки, но вертикальные ряды считаются по полному прямоугольному периметру. Обрамление, дополнительные ряды, отливы и откосы нужно внести по проектной спецификации.",
      },
      {
        question: "Подбирает ли тип панели совместимый профиль и крепёж?",
        answer: "Нет. Тип меняет только название основной позиции. Полезную площадь, шаг, товарные длины, крепёж и применимость берут из документации конкретной фасадной системы.",
      },
    ],
  },
};
