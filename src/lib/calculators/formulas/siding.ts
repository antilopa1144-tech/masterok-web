import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const sidingDef: CalculatorDefinition = {
  id: "exterior_siding",
  slug: "sayding",
  title: "Калькулятор сайдинга",
  h1: "Калькулятор сайдинга онлайн — расчёт панелей и комплектующих",
  description: "Рассчитайте количество панелей сайдинга, профиля, угловых и отделочных элементов для фасада.",
  metaTitle: withSiteMetaTitle("Калькулятор сайдинга | Расчёт панелей и комплектующих"),
  metaDescription: "Бесплатный калькулятор сайдинга: рассчитайте панели Docke, Grand Line, стартовые планки, угловые и финишные профили для облицовки фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["сайдинг", "виниловый сайдинг", "Docke", "Grand Line", "фасад", "облицовка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "facadeArea",
      label: "Площадь фасада",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 1000,
      step: 5,
      defaultValue: 150,
      hint: "Общая площадь стен под обшивку",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "perimeter",
      label: "Периметр здания",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 48,
    },
    {
      key: "height",
      label: "Высота стен",
      type: "slider",
      unit: "м",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 6,
    },
    {
      key: "sidingType",
      label: "Тип сайдинга",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Виниловый (полоса 230 мм × 3.66 м)" },
        { value: 1, label: "Металлический (панель 333 мм × 3 м)" },
        { value: 2, label: "Фиброцементный (плита 3600×190 мм)" },
      ],
    },
    {
      key: "cornersCount",
      label: "Количество наружных углов",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 4,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const facadeArea = Math.max(10, inputs.facadeArea ?? 150);
    const openings = Math.max(0, inputs.openingsArea ?? 20);
    const perimeter = Math.max(10, inputs.perimeter ?? 48);
    const height = Math.max(2, inputs.height ?? 6);
    const sidingType = Math.round(inputs.sidingType ?? 0);
    const corners = Math.round(inputs.cornersCount ?? 4);

    const netArea = Math.max(1, facadeArea - openings);

    // Размеры панели
    const panelData: Record<number, { usefulWidth: number; length: number; name: string }> = {
      0: { usefulWidth: 0.20, length: 3.66, name: "Виниловый сайдинг" },
      1: { usefulWidth: 0.30, length: 3.00, name: "Металлический сайдинг" },
      2: { usefulWidth: 0.175, length: 3.60, name: "Фиброцементный сайдинг" },
    };
    const panel = panelData[sidingType] ?? panelData[0];
    const panelArea = panel.usefulWidth * panel.length;
    const panelsNeeded = Math.ceil((netArea / panelArea) * 1.10);

    // Стартовая планка: по периметру + проёмы
    const starterLength = perimeter + (openings > 0 ? Math.sqrt(openings) * 4 : 0);
    const starterPcs = Math.ceil(starterLength / 3.66);

    // J-профиль (вокруг окон и дверей + верх/низ)
    const jProfileLength = Math.sqrt(openings) * 4 * 2 + perimeter;
    const jProfilePcs = Math.ceil(jProfileLength * 1.10 / 3.66);

    // Угловой профиль: высота × кол-во углов
    const cornerPcs = Math.ceil((height * corners * 1.05) / 3.0);

    // Финишная планка
    const finishPcs = Math.ceil(perimeter * 1.05 / 3.66);

    // Крепёж: ~1 саморез на 30 см длины панели → ~12 шт/м²
    const screws = Math.ceil(netArea * 12 * 1.05);

    // Обрешётка (доска 40×50 или металлопрофиль): шаг 400–600 мм
    const battensLm = Math.ceil((netArea / 0.5) * 1.05);

    const warnings: string[] = [];
    if (sidingType === 2) {
      warnings.push("Фиброцементный сайдинг требует обязательной окраски торцов при раскрое");
    }

    const scenarios = buildNativeScenarios({
      id: "siding-main",
      title: "Siding main",
      exactNeed: panelsNeeded,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "siding-panel",
    });

    return {
      materials: [
        {
          name: `${panel.name} (панели)`,
          quantity: netArea / panelArea,
          unit: "шт",
          withReserve: panelsNeeded,
          purchaseQty: panelsNeeded,
          category: "Панели",
        },
        {
          name: "Стартовая планка (3.66 м)",
          quantity: starterLength / 3.66,
          unit: "шт",
          withReserve: starterPcs,
          purchaseQty: starterPcs,
          category: "Комплектующие",
        },
        {
          name: "J-профиль (3.66 м)",
          quantity: jProfileLength / 3.66,
          unit: "шт",
          withReserve: jProfilePcs,
          purchaseQty: jProfilePcs,
          category: "Комплектующие",
        },
        {
          name: "Угловой профиль (3 м)",
          quantity: (height * corners) / 3.0,
          unit: "шт",
          withReserve: cornerPcs,
          purchaseQty: cornerPcs,
          category: "Комплектующие",
        },
        {
          name: "Финишная планка (3.66 м)",
          quantity: perimeter / 3.66,
          unit: "шт",
          withReserve: finishPcs,
          purchaseQty: finishPcs,
          category: "Комплектующие",
        },
        {
          name: "Саморезы для сайдинга",
          quantity: screws,
          unit: "шт",
          withReserve: screws,
          purchaseQty: Math.ceil(screws / 200) * 200,
          category: "Крепёж",
        },
        {
          name: "Обрешётка / брус 40×50 (м.п.)",
          quantity: netArea / 0.5,
          unit: "м.п.",
          withReserve: battensLm,
          purchaseQty: battensLm,
          category: "Обрешётка",
        },
        {
          name: "Гидроветрозащитная мембрана Изоспан А (рулон 75 м²)",
          quantity: netArea / 75,
          unit: "рулон",
          withReserve: Math.ceil(netArea * 1.15 / 75),
          purchaseQty: Math.ceil(netArea * 1.15 / 75),
          category: "Изоляция",
        },
        {
          name: "Герметик силиконовый (туба 310 мл)",
          quantity: Math.sqrt(netArea) * 4 / 15,
          unit: "шт",
          withReserve: Math.ceil(Math.sqrt(netArea) * 4 / 15),
          purchaseQty: Math.ceil(Math.sqrt(netArea) * 4 / 15),
          category: "Доп. материалы",
        },
      ],
      totals: { facadeArea, netArea, panelsNeeded, perimeter } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт сайдинга:**
Панелей = ⌈Площадь_нетто / Площадь_панели × 1.10⌉

Полезная ширина (с учётом нахлёста):
- Виниловый: 200 мм (при ширине 230 мм)
- Металлический: 300 мм (при ширине 333 мм)

Обрешётка: шаг 400–600 мм (перпендикулярно панелям).
  `,
  howToUse: [
    "Введите площадь фасада и вычтите проёмы",
    "Укажите периметр здания и высоту стен",
    "Выберите тип сайдинга",
    "Задайте количество наружных углов",
    "Нажмите «Рассчитать» — получите панели и все комплектующие",
  ],
faq: [
    {
      question: "Нужен ли запас сайдинга на подрезку?",
      answer: "Да, для сайдинга обычно закладывают запас 5–10% на подрезку и сложные участки фасада, потому что на углах, у окон, дверей и в зонах доборных элементов отходы появляются даже на простой геометрии. На домах с большим количеством углов, проёмов, перепадов фасада и нестандартных зон резерв может быть ещё выше, поскольку раскрой панелей становится менее предсказуемым и часть элементов приходится подгонять почти поштучно, а недостающую партию потом бывает сложно точно добрать по цвету и партии на видимом фасаде. Для заметных фасадов запас особенно важен, чтобы не добирать панели уже после начала монтажа и не получить разницу по тону, фактуре или направлению рисунка на солнце, что особенно бросается в глаза на длинных освещённых стенах. Если фасад длинный и панели стыкуются по длине, полезно закладывать резерв ещё и на подбор стыков в наименее заметных местах. Запас особенно важен на фронтонах, вокруг окон и на фасадах со сложной раскладкой, где отход растёт заметно быстрее, чем на прямой стене. Чем больше окон, углов, фронтонов и смен направления раскладки, тем больше сайдинг уходит не в площадь, а в аккуратную подгонку узлов. Да, особенно на фасадах с окнами, фронтонами, ломаной геометрией и раскладкой под доборные элементы, где отход заметно выше, чем на простой прямой стене. Да, особенно на сложном фасаде с окнами, углами и короткими доборными участками. Да, особенно если фасад с окнами, фронтонами и короткими участками, где отходов заметно больше. На фасадах с окнами, углами и короткими простенками подрезка обычно даёт отход заметно выше, чем на глухой стене. На фронтонах, вокруг окон и на длинных фасадах с разбивкой по осям запас обычно заканчивается быстрее, чем на простой глухой стене."
    },
    {
      question: "Какой шаг обрешётки делать под сайдинг?",
      answer: "Чаще всего шаг обрешётки под сайдинг принимают 400–600 мм в зависимости от типа панелей, основания, региона и ветровой нагрузки на фасад, потому что все эти факторы влияют на жёсткость облицовки. Точное значение лучше сверять с рекомендациями производителя конкретной системы, поскольку слишком редкая обрешётка может дать волну, прогибы и менее стабильную работу фасада, а слишком частая без необходимости просто увеличит расход материала и крепежа, не давая заметной выгоды в обычных условиях и на простом фасаде. На практике ошибка по шагу обрешётки обычно проявляется уже после монтажа, когда фасад начинает играть на ветру, визуально волноваться или расходиться по плоскости на длинных участках. Поэтому шаг каркаса лучше подбирать не «по памяти», а по конкретной системе, типу панели и ветровой ситуации на объекте, особенно на открытых и продуваемых фасадах. Если шаг сделать слишком редким, панель начнёт играть на ветру и волной выдаст ошибку каркаса даже при аккуратном монтаже. Если каркас попадает в зону сильного ветра или длинных открытых фасадов, редкий шаг быстрее даёт волнистость и шум панели при эксплуатации. Его подбирают по типу панели, ветровой нагрузке, состоянию основания и схеме крепления, потому что слишком редкая обрешётка даёт вибрацию и хуже держит плоскость фасада. Его подбирают по типу панели, ветровой нагрузке и ровности основания, а не по одному универсальному числу. Его уточняют по панели, ветровой нагрузке и ровности фасада, иначе обшивка быстрее теряет жёсткость и геометрию. На ветровых фасадах и под длинные панели шаг обычно имеет смысл проверять осторожнее, чем на коротких и защищённых стенах."
    }
  ],
};


