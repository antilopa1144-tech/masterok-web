import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const gypsumBoardDef: CalculatorDefinition = {
  id: "gypsum_board",
  slug: "gipsokarton-potolok",
  title: "Калькулятор гипсокартона на потолок",
  h1: "Калькулятор гипсокартона на потолок — расчёт ГКЛ, профилей и крепежа",
  description: "Рассчитайте листы гипсокартона Knauf, профили ПП 60×27 и ПН 27×28, дюбели и саморезы для обшивки стен, перегородок и потолков.",
  metaTitle: withSiteMetaTitle("Калькулятор гипсокартона на потолок | Расчёт ГКЛ Knauf"),
  metaDescription: "Бесплатный калькулятор гипсокартона: рассчитайте листы ГКЛ, профили ПП 60×27 и ПН 27×28, подвесы, дюбели и саморезы для потолка, перегородки или обшивки стен.",
  category: "walls",
  categorySlug: "steny",
  tags: ["гипсокартон", "ГКЛ", "Knauf", "профиль ПП 60", "перегородка", "обшивка стен"],
  popularity: 88,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "constructionType",
      label: "Тип конструкции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Обшивка стены (на профилях)" },
        { value: 1, label: "Перегородка (двусторонняя)" },
        { value: 2, label: "Потолок из ГКЛ" },
      ],
    },
    {
      key: "layers",
      label: "Количество слоёв ГКЛ",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя (повышенная прочность/шумоизоляция)" },
      ],
    },
    {
      key: "gklType",
      label: "Тип ГКЛ",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ГКЛ (стандартный)" },
        { value: 1, label: "ГКЛВ (влагостойкий)" },
        { value: 2, label: "ГКЛО (огнестойкий)" },
      ],
    },
    {
      key: "profileStep",
      label: "Шаг профилей",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 400, label: "400 мм (усиленный монтаж)" },
        { value: 600, label: "600 мм (стандарт)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const constructionType = Math.round(inputs.constructionType ?? 0);
    const layers = Math.round(inputs.layers ?? 1);
    const profileStep = inputs.profileStep ?? 600; // мм
    const profileStepM = profileStep / 1000;

    // Лист ГКЛ: 1200×2500 мм = 3.0 м²
    const sheetArea = 1.2 * 2.5; // 3.0 м²
    const sheetsOneSide = Math.ceil(area * layers / sheetArea * 1.1);
    const totalSheets = constructionType === 1
      ? sheetsOneSide * 2 // перегородка — обе стороны
      : sheetsOneSide;

    // ПП 60×27 (несущий профиль) — стойки с шагом profileStep, длина = высота стены
    // Высота ≈ √(area/1.5) для обшивки стены, 2.7 для потолка
    const wallHeight = constructionType === 2 ? Math.sqrt(area) : 2.7;
    const wallLength = area / wallHeight;

    const ppCount = constructionType === 2
      // Потолок: несущие через 600 мм по длине + поперечные через 600 мм
      ? Math.ceil(wallLength / profileStepM) * Math.ceil(wallHeight / profileStepM)
      : Math.ceil(wallLength / profileStepM) + 1; // стойки по ширине
    const ppLength = wallHeight;
    const ppPcs = constructionType === 2
      ? ppCount
      : ppCount;

    // Длина одного ПП = wallHeight, считаем м.п.
    const ppMeters = ppPcs * ppLength;
    const ppLengthStd = 3.0; // стандартный 3 м
    const ppQuantity = Math.ceil(ppMeters / ppLengthStd);

    // ПН 27×28 (направляющий профиль) — по периметру, 2 ряда
    const perimeter = (wallLength + wallHeight) * 2;
    const pnMeters = constructionType === 1 ? perimeter * 2 : perimeter; // перегородка: верх+низ×2 (обе стороны не нужны, только периметр)
    const pnQuantity = Math.ceil(pnMeters / 3.0);

    // Саморезы ТН 3.5×25 мм (для крепления ГКЛ к профилям)
    // ~24 шурупа на лист (шаг 250 мм по крайним и 300 мм по средним стойкам)
    const screwsGKL = totalSheets * 24;

    // Дюбели для крепления ПН к стене/полу/потолку (каждые 500 мм)
    const dubelCount = Math.ceil(pnMeters / 0.5) * 2;

    // Серпянка (лента для стыков): ~1 м на каждый стык (стыки по вертикали = wallLength/1.2+1)
    const jointsPerRow = Math.ceil(wallLength / 1.2) + 1;
    const serpyanka = Math.ceil(jointsPerRow * wallHeight * layers * 1.1);

    const gklTypes = ["ГКЛ", "ГКЛВ", "ГКЛО"];
    const constructionNames = ["Обшивка стены", "Перегородка", "Потолок"];

    const warnings: string[] = [];
    if (constructionType === 0 && layers === 2) {
      warnings.push("2 слоя ГКЛ на обшивке стены — обязательно смещение стыков листов");
    }
    if (constructionType === 1) {
      warnings.push("Перегородка: заполните пространство звукоизоляционной минватой 50–100 мм");
    }

    const scenarios = buildNativeScenarios({
      id: "gypsum-board-main",
      title: "Gypsum board main",
      exactNeed: area * layers * (constructionType === 1 ? 2 : 1) / sheetArea * 1.1,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "gypsum-sheet",
    });

    return {
      materials: [
        {
          name: `${gklTypes[Math.round(inputs.gklType ?? 0)] ?? "ГКЛ"} 1200×2500×12.5 мм (${constructionNames[constructionType]})`,
          quantity: area * layers * (constructionType === 1 ? 2 : 1) / sheetArea,
          unit: "шт",
          withReserve: totalSheets,
          purchaseQty: totalSheets,
          category: "Листы",
        },
        {
          name: "Профиль ПП 60×27 (стоечный, 3 м)",
          quantity: ppMeters / ppLengthStd,
          unit: "шт",
          withReserve: ppQuantity,
          purchaseQty: ppQuantity,
          category: "Профиль",
        },
        {
          name: "Профиль ПН 27×28 (направляющий, 3 м)",
          quantity: pnMeters / 3.0,
          unit: "шт",
          withReserve: pnQuantity,
          purchaseQty: pnQuantity,
          category: "Профиль",
        },
        {
          name: "Саморезы для ГКЛ 3.5×25 мм (чёрные фосфатированные)",
          quantity: (screwsGKL * 2.5) / 1000,  // кг: ~2.5 г/шт
          unit: "кг",
          withReserve: Math.ceil(screwsGKL * 1.1 * 2.5 / 500) / 2,  // кратно 0.5 кг
          purchaseQty: Math.ceil(screwsGKL * 1.1 * 2.5 / 500) / 2,
          category: "Крепёж",
        },
        {
          name: "Дюбель-гвоздь 6×40 мм (профиль к стене)",
          quantity: dubelCount,
          unit: "шт",
          withReserve: Math.ceil(dubelCount * 1.1),
          purchaseQty: Math.ceil(dubelCount / 50) * 50,
          category: "Крепёж",
        },
        {
          name: "Серпянка (стекловолоконная лента 45 мм × 20 м)",
          quantity: serpyanka / 20,
          unit: "рулонов",
          withReserve: Math.ceil(serpyanka / 20),
          purchaseQty: Math.ceil(serpyanka / 20),
          category: "Отделка стыков",
        },
        {
          name: "Шпаклёвка Knauf Фуген (для стыков, 25 кг)",
          quantity: (serpyanka / 10) / 25,
          unit: "мешков",
          withReserve: Math.ceil((serpyanka / 10) / 25),
          purchaseQty: Math.ceil((serpyanka / 10) / 25),
          category: "Отделка стыков",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: (() => {
            // 150 мл/м²; перегородка — 2 стороны, обшивка/потолок — 1 сторона
            const sides = constructionType === 1 ? 2 : 1;
            return area * sides * 0.15; // литры
          })(),
          unit: "л",
          withReserve: (() => {
            const sides = constructionType === 1 ? 2 : 1;
            return Math.ceil(area * sides * 0.15 * 1.15 * 10) / 10;
          })(),
          purchaseQty: (() => {
            const sides = constructionType === 1 ? 2 : 1;
            return Math.ceil(area * sides * 0.15 * 1.15 / 10); // канистра 10 л
          })(),
          category: "Грунтовка",
        },
        ...(constructionType === 1 ? [{
          name: "Скоба крепёжная (примыкание к стенам)",
          quantity: wallHeight * 3 * 2, // 3 шт на м высоты × 2 стены
          unit: "шт",
          withReserve: Math.ceil(wallHeight * 3 * 2 * 1.1),
          purchaseQty: Math.ceil(wallHeight * 3 * 2 * 1.1),
          category: "Крепёж",
        }] : []),
      ],
      totals: { area, totalSheets, ppQuantity } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт гипсокартона:**
- Лист ГКЛ Knauf: 1200×2500 мм = 3.0 м²
- Запас +10% на подрезку
- ПП 60×27: шаг 400 или 600 мм
- ПН 27×28: по периметру конструкции

Стандарт Knauf: саморезы с шагом 250 мм по краям, 300 мм в середине.
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип конструкции",
    "Укажите количество слоёв и тип ГКЛ",
    "Задайте шаг профилей",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какой шаг профиля выбрать для потолка из ГКЛ?",
      answer: "Для потолка из гипсокартона шаг профиля 400 мм обычно выбирают как более надёжный и жёсткий вариант для жилых помещений, особенно если важна стабильная плоскость и нормальная работа облицовки без провисаний. Шаг 600 мм допустим только для более лёгких решений и при строгом соблюдении рекомендаций конкретной системы, потому что запас по жёсткости у такой схемы заметно ниже, а чувствительность к ошибкам монтажа и перегрузке возрастает, особенно под светильники и сложные примыкания на больших потолочных плоскостях. Для тяжёлых светильников, скрытых карнизов, длинных пролётов и сложной геометрии потолка уменьшенный шаг каркаса обычно даёт заметно спокойнее результат, чем попытка сэкономить на количестве профилей. На практике шаг 600 мм чаще оправдан там, где потолок действительно простой, облицовка лёгкая и нет дополнительных нагрузок на каркас. Если планируются тяжёлые светильники, много швов или сложная геометрия, уменьшенный шаг почти всегда даёт более предсказуемую плоскость и меньше проблем на финише. Чем тяжелее облицовка, больше формат листа и выше требования к жёсткости, тем осторожнее стоит подходить к шагу 600 мм и чаще выбирать более плотную схему. При большой длине листов, тяжёлой отделке и повышенных требованиях к жёсткости обычно безопаснее ориентироваться на более частый шаг каркаса. Шаг лучше подбирать под толщину листа, тип отделки и требования к жёсткости, а не по одному универсальному числу. Его лучше подбирать под толщину листа, отделку и жёсткость конструкции, а не по одному усреднённому шаблону. Если планируется тяжёлая отделка или встроенный свет, лучше оценивать шаг каркаса сразу вместе с нагрузкой, а не после закупки профиля."
    },
    {
      question: "Нужен ли запас гипсокартона при расчёте?",
      answer: "Да, для гипсокартона лучше сразу закладывать запас 5–10% на подрезку, отходы, бой и неизбежные потери при раскрое листов, особенно если конструкция состоит не из одной простой плоскости. Это особенно важно для сложных перегородок, ниш, коробов, потолков с выступами и участков с большим количеством примыканий, где обрезков всегда получается заметно больше и добор одного-двух листов почти неизбежен без предварительного резерва, особенно если нужен тот же формат и тип листа для одного узла отделки. Для влагостойкого или огнестойкого ГКЛ резерв особенно полезен, потому что точный добор того же типа листа потом может оказаться дороже и менее удобным по логистике, а замена на другой лист сразу ломает единый пирог конструкции. На потолках, коробах и узких доборных полосах фактический отход обычно выше, чем на простой перегородке из крупных прямых листов. Запас особенно важен на потолках, откосах и сложных раскладках листов, где одна испорченная деталь даёт не локальный, а каскадный перерасход по следующему ряду. Особенно это заметно в помещениях с нишами, коробами, подрезкой вокруг дверей и нестандартной раскладкой листов, где отход возрастает сильнее, чем на простой прямой стене. Да, потому что расход заметно растёт на подрезке у проёмов, ниш, коробов, откосов и при раскладке листов так, чтобы швы не совпадали по слабым линиям. Да, потому что подрезка, раскладка швов и отбор целых листов почти всегда дают дополнительный расход. Если лист редкого формата или типа, запас лучше брать сразу из той же партии, чтобы потом не ломать раскрой заменой материала. Даже при простой раскладке часть листов почти всегда уходит на подрезку, усиление откосов и добор вокруг проёмов, поэтому нулевой запас редко реалистичен."
    }
  ],
};


