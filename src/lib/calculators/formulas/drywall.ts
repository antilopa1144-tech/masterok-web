import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

// Размеры листов ГКЛ (ширина × высота, м)
const SHEET_SIZES: Record<number, [number, number]> = {
  0: [1.2, 2.5],  // 1200×2500 мм = 3.0 м²
  1: [1.2, 3.0],  // 1200×3000 мм = 3.6 м²
  2: [0.6, 2.5],  // 600×2500 мм = 1.5 м²
};

export const drywallDef: CalculatorDefinition = {
  id: "drywall",
  slug: "gipsokarton",
  title: "Калькулятор гипсокартона",
  h1: "Калькулятор гипсокартона онлайн — расчёт листов и профиля",
  description: "Рассчитайте количество листов ГКЛ, профилей ПП и ПН, крепежа для перегородок и обшивки стен.",
  metaTitle: withSiteMetaTitle("Калькулятор гипсокартона онлайн | Расчёт ГКЛ и профиля"),
  metaDescription: "Бесплатный калькулятор гипсокартона: рассчитайте листы ГКЛ Knauf, профиль ПП/ПН, дюбели и саморезы для перегородок, обшивки стен и каркасных конструкций.",
  category: "walls",
  categorySlug: "steny",
  tags: ["гипсокартон", "ГКЛ", "перегородка", "Knauf", "профиль", "ПП", "ПН", "обшивка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "workType",
      label: "Тип работы",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Перегородка (двухсторонняя обшивка)" },
        { value: 1, label: "Обшивка стены (одна сторона)" },
        { value: 2, label: "Потолочная конструкция" },
      ],
    },
    {
      key: "length",
      label: "Длина конструкции",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "height",
      label: "Высота конструкции",
      type: "slider",
      unit: "м",
      min: 1.5,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "layers",
      label: "Слои ГКЛ с каждой стороны",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой (стандарт)" },
        { value: 2, label: "2 слоя (огнестойкость, шумозащита)" },
      ],
    },
    {
      key: "sheetSize",
      label: "Размер листа ГКЛ",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×2500 мм (стандарт)" },
        { value: 1, label: "1200×3000 мм" },
        { value: 2, label: "600×2500 мм (малоформатный)" },
      ],
    },
    {
      key: "profileStep",
      label: "Шаг профилей",
      type: "select",
      defaultValue: 0.6,
      options: [
        { value: 0.4, label: "400 мм (усиленный вариант)" },
        { value: 0.6, label: "600 мм (стандарт)" },
      ],
    },
  ],
  calculate(inputs) {
    const workType = Math.round(inputs.workType ?? 0);
    const length = Math.max(0.5, inputs.length ?? 5);
    const height = Math.max(1.5, inputs.height ?? 2.7);
    const layers = Math.round(inputs.layers ?? 1);
    const profileStep = inputs.profileStep ?? 0.6;
    const sheetSizeIdx = Math.round(inputs.sheetSize ?? 0);
    const [sheetW, sheetH] = SHEET_SIZES[sheetSizeIdx] ?? SHEET_SIZES[0];
    const gklArea = sheetW * sheetH;

    const area = length * height;
    const sides = workType === 0 ? 2 : 1; // перегородка — 2 стороны
    const totalSheetArea = area * sides * layers;
    const sheetsNeeded = Math.ceil((totalSheetArea / gklArea) * 1.10);

    // Профиль ПН 27×28 (направляющий): по периметру + запас 5%
    const pnPerimeter = workType === 2
      ? 2 * (length + height) // потолок: периметр
      : 2 * (length + height); // стена/перегородка
    const pnLength = Math.ceil(pnPerimeter * 1.05 / 3) * 3; // кратно 3 м (стандарт)

    // Профиль ПП 60×27 (стоечный/несущий): по длине / шаг + 1
    const ppCount = Math.ceil(length / profileStep) + 1;
    const ppLength = ppCount * height * 1.05;
    const ppPieces3m = Math.ceil(ppLength / 3);

    // Саморезы: ~30 шт/м² на ГКЛ (крепление к профилю)
    const screwsTFLength = Math.ceil(totalSheetArea * 30 * 1.05);
    // Саморезы металл-металл (LB): для соединения профилей
    const screwsLB = Math.ceil(ppCount * 4 * 1.05);
    // Дюбели для ПН: через каждые 60 см по периметру
    const pnDowels = Math.ceil(pnPerimeter / 0.6);

    // Шпаклёвка стартовая (Knauf Фуген): 0.8 кг/м² по площади ГКЛ
    const puttyStartKg = totalSheetArea * 0.8 * 1.15;
    const puttyStartBags = Math.ceil(puttyStartKg / 25);

    // Шпаклёвка финишная (Knauf Ротбанд Финиш): 1.0 кг/м²
    const puttyFinishKg = totalSheetArea * 1.0 * 1.15;
    const puttyFinishBags = Math.ceil(puttyFinishKg / 25);

    // Серпянка (лента армирующая 50 мм): ~2.5 м швов на каждый лист ГКЛ
    const totalSheetCount = sheetsNeeded;
    const seamLengthM = totalSheetCount * 2.5;
    const serpyankaRolls = Math.ceil(seamLengthM * 1.1 / 90);

    // Грунтовка глубокого проникновения: 150 мл/м² × 2 слоя = 300 мл/м²
    const primerLiters = totalSheetArea * 0.3 * 1.15;
    const primerCans = Math.ceil(primerLiters / 10);

    // Наждачная бумага P180: 1 лист на 5 м², упаковка 10 шт
    const sandpaperSheets = Math.ceil(totalSheetArea / 5);
    const sandpaperPacks = Math.ceil(sandpaperSheets / 10);

    const warnings: string[] = [];
    if (height > 3.5) warnings.push("При высоте > 3.5 м: требуется усиленный каркас (профиль шириной 100 мм)");
    if (layers === 2) warnings.push("Двойной слой: второй слой крепится со смещением стыков на 600 мм");

    const scenarios = buildNativeScenarios({
      id: "drywall-main",
      title: "Drywall main",
      exactNeed: (totalSheetArea / gklArea) * 1.1,
      unit: "листов",
      packageSizes: [1],
      packageLabelPrefix: "drywall-sheet",
    });

    return {
      materials: [
        {
          name: `ГКЛ ${Math.round(sheetW * 1000)}×${Math.round(sheetH * 1000)} мм (${workType === 0 ? "ГКЛ стандарт" : "ГКЛ"}), листы`,
          quantity: totalSheetArea / gklArea,
          unit: "листов",
          withReserve: sheetsNeeded,
          purchaseQty: sheetsNeeded,
          category: "Листы ГКЛ",
        },
        {
          name: "Профиль направляющий ПН 27×28 (3 м)",
          quantity: pnPerimeter / 3,
          unit: "шт (3 м)",
          withReserve: Math.ceil(pnLength / 3),
          purchaseQty: Math.ceil(pnLength / 3),
          category: "Профиль",
        },
        {
          name: "Профиль стоечный ПП 60×27 (3 м)",
          quantity: ppLength / 3,
          unit: "шт (3 м)",
          withReserve: ppPieces3m,
          purchaseQty: ppPieces3m,
          category: "Профиль",
        },
        {
          name: "Саморезы для ГКЛ 3.5×25 мм (чёрные фосфатированные)",
          quantity: (totalSheetArea * 30 * 2.5) / 1000,  // кг: ~2.5 г/шт
          unit: "кг",
          withReserve: Math.ceil(screwsTFLength * 2.5 / 500) / 2,  // кратно 0.5 кг
          purchaseQty: Math.ceil(screwsTFLength * 2.5 / 500) / 2,
          category: "Крепёж",
        },
        {
          name: "Саморезы-клопы 3.5×9.5 мм (металл–металл)",
          quantity: ppCount * 4,
          unit: "шт",
          withReserve: screwsLB,
          purchaseQty: Math.ceil(screwsLB / 100) * 100,
          category: "Крепёж",
        },
        {
          name: "Дюбели 6×40 для крепления ПН",
          quantity: pnDowels,
          unit: "шт",
          withReserve: Math.ceil(pnDowels * 1.05),
          purchaseQty: Math.ceil(pnDowels * 1.05 / 100) * 100,
          category: "Крепёж",
        },
        {
          name: "Лента уплотнительная (рулон 30 м)",
          quantity: pnPerimeter / 30,
          unit: "рулонов",
          withReserve: Math.ceil(pnPerimeter / 30),
          purchaseQty: Math.ceil(pnPerimeter / 30),
          category: "Доп. материалы",
        },
        {
          name: "Шпаклёвка стартовая Knauf Фуген (25 кг)",
          quantity: totalSheetArea * 0.8 / 25,
          unit: "мешок",
          withReserve: puttyStartBags,
          purchaseQty: puttyStartBags,
          category: "Отделка",
        },
        {
          name: "Шпаклёвка финишная Knauf Ротбанд Финиш (25 кг)",
          quantity: totalSheetArea * 1.0 / 25,
          unit: "мешок",
          withReserve: puttyFinishBags,
          purchaseQty: puttyFinishBags,
          category: "Отделка",
        },
        {
          name: "Серпянка (лента армирующая 50 мм, рулон 90 м)",
          quantity: seamLengthM / 90,
          unit: "рулон",
          withReserve: serpyankaRolls,
          purchaseQty: serpyankaRolls,
          category: "Отделка",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: totalSheetArea * 0.3 / 10,
          unit: "канистра",
          withReserve: primerCans,
          purchaseQty: primerCans,
          category: "Отделка",
        },
        {
          name: "Наждачная бумага P180 (упаковка 10 шт)",
          quantity: sandpaperSheets / 10,
          unit: "упаковка",
          withReserve: sandpaperPacks,
          purchaseQty: sandpaperPacks,
          category: "Отделка",
        },
      ],
      totals: { area, sides, layers, sheetsNeeded },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт ГКЛ:**
Листов = ⌈Площадь × Стороны × Слои / Площадь_листа⌉ × 1.10

Доступные размеры листа ГКЛ (Knauf):
- 1200×2500 мм = 3.0 м² (стандарт)
- 1200×3000 мм = 3.6 м²
- 600×2500 мм = 1.5 м² (малоформатный)

**Каркас:**
- ПН 27×28 направляющий: по периметру конструкции
- ПП 60×27 стоечный: каждые 400–600 мм
- Саморезы TN 25 мм: ~30 шт/м²

По ГОСТ 6266-97 и ТТК Knauf.
  `,
  howToUse: [
    "Выберите тип конструкции: перегородка или обшивка стены",
    "Введите длину и высоту конструкции",
    "Укажите количество слоёв ГКЛ (стандарт — 1)",
    "Выберите шаг профилей (стандарт 600 мм, усиленный — 400 мм)",
    "Нажмите «Рассчитать» — получите листы, профиль и весь крепёж",
  ],
faq: [
    {
      question: "Какой шаг профиля выбрать для стены из гипсокартона?",
      answer: "Для стандартной обшивки стен часто используют шаг профилей 600 мм, если система не несёт повышенной нагрузки и отделка остаётся лёгкой, а сама конструкция не требует дополнительной жёсткости. Если нужна более жёсткая схема, тяжёлая облицовка, мебельное крепление или повышенная ударная стойкость, шаг обычно уменьшают до 400 мм, чтобы каркас работал стабильнее и меньше реагировал на нагрузку и деформации, особенно на высоких стенах, в зонах с навесным оборудованием и рядом с дверными проёмами, где даже небольшой прогиб потом заметен на отделке. Чем выше стена и больше навесная нагрузка, тем осторожнее обычно подходят именно к шагу каркаса и узлам крепления направляющих, потому что переделка готовой стены обходится дороже пары лишних стоек на старте. Под тяжёлую плитку, кухонные шкафы и санузловые зоны шаг 400 мм обычно оказывается заметно спокойнее в эксплуатации. Чем выше стена, тяжелее отделка и больше навесного оборудования, тем важнее не растягивать каркас до предельного шага даже ради небольшой экономии профиля. При тяжёлой отделке, подвесе мебели и высоких перегородках лучше ориентироваться на более жёсткую схему, а не только на минимально допустимый шаг из типового решения. При тяжёлой отделке, навесной мебели, высокой перегородке и повышенных требованиях к жёсткости чаще ориентируются на более плотную схему каркаса. Шаг зависит от высоты перегородки, слоя обшивки, типа утепления и того, будут ли на стене тяжёлые навески. Если тяжёлые навесы уже понятны на старте, усиление лучше заложить в каркас сразу, а не пытаться спасать стену после обшивки. Чем выше стена и тяжелее будущая отделка, тем опаснее ориентироваться только на минимальный шаг без проверки всей схемы каркаса."
    },
    {
      question: "Сколько слоёв ГКЛ делать на перегородке?",
      answer: "Один слой ГКЛ подходит для самых простых решений и лёгких внутренних перегородок, когда нет повышенных требований к прочности, звукоизоляции и нагрузке на поверхность. Для более надёжных конструкций, зон с риском ударных повреждений, навеской оборудования, скрытой инженерией или повышенными требованиями к акустике чаще делают двухслойную обшивку с каждой стороны, потому что она заметно жёстче и стабильнее в эксплуатации, а по швам и крепежу ведёт себя спокойнее при реальной нагрузке и случайных ударах в быту. Если перегородка будет работать рядом с дверью, мебелью, тяжёлой навеской или в проходной зоне, экономия на втором слое обычно быстро становится заметной, а исправлять это после отделки уже неудобно. В жилых проходных зонах второй слой чаще даёт запас не только по акустике, но и по обычной бытовой стойкости поверхности, что особенно важно в первый же год эксплуатации. Один слой подходит не всегда: под повышенную жёсткость, шумоизоляцию, тяжёлые навесы и более стабильную отделку чаще выбирают двухслойную обшивку хотя бы с одной стороны. Один слой подходит не всегда: при повышенных требованиях к жёсткости, звукоизоляции, ударной стойкости или подвесу тяжёлых предметов часто выбирают двухслойную обшивку. Один слой подходит не всегда: при повышенных требованиях к жёсткости, звукоизоляции, ударной стойкости или подвесе тяжёлых предметов чаще выбирают двухслойную обшивку. Один слой подходит не всегда: под повышенную жёсткость, шумоизоляцию и навеску часто нужен второй. Один или два слоя выбирают не по шаблону, а по жёсткости, звуку, нагрузке и тому, что потом будут крепить к стене."
    }
  ],
};


