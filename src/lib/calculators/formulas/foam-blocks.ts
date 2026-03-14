import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

// Размеры блоков [длина мм, высота мм, толщина мм]
const BLOCK_SIZES: Record<number, [number, number, number, string]> = {
  0: [600, 300, 200, "Пеноблок 600×300×200 мм"],
  1: [600, 300, 100, "Пеноблок 600×300×100 мм (перегородки)"],
  2: [390, 190, 188, "Керамзитоблок 390×190×188 мм"],
  3: [390, 190, 90, "Керамзитоблок 390×190×90 мм (перегородки)"],
};

export const foamBlocksDef: CalculatorDefinition = {
  id: "foam_blocks",
  slug: "penobloki",
  title: "Калькулятор пеноблоков и керамзитоблоков",
  h1: "Калькулятор пеноблоков онлайн — расчёт блоков, клея и арматуры",
  description: "Рассчитайте количество пеноблоков или керамзитоблоков, клея и армирования для стен и перегородок.",
  metaTitle: withSiteMetaTitle("Калькулятор пеноблоков и керамзитоблоков | Расчёт блоков"),
  metaDescription: "Бесплатный калькулятор пеноблоков: рассчитайте количество пеноблоков D600/D800, керамзитоблоков, клея и кладочной сетки для стен и перегородок. По ГОСТ 21520-89.",
  category: "walls",
  categorySlug: "steny",
  tags: ["пеноблок", "керамзитоблок", "кладка", "блоки", "перегородки", "D600", "D800"],
  popularity: 76,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallLength",
      label: "Длина стены (периметр)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 27,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "blockSize",
      label: "Размер блока",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пеноблок 600×300×200 мм (несущие)" },
        { value: 1, label: "Пеноблок 600×300×100 мм (перегородки)" },
        { value: 2, label: "Керамзитоблок 390×190×188 мм (несущие)" },
        { value: 3, label: "Керамзитоблок 390×190×90 мм (перегородки)" },
      ],
    },
    {
      key: "mortarType",
      label: "Тип раствора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Клей для блоков (шов 2–3 мм)" },
        { value: 1, label: "Цементно-песчаная смесь (шов 10 мм)" },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let wallArea: number;
    let wallLength: number;
    let wallHeight: number;

    if (inputMode === 0) {
      wallLength = Math.max(1, inputs.wallLength ?? 10);
      wallHeight = Math.max(1, inputs.wallHeight ?? 2.7);
      wallArea = wallLength * wallHeight;
    } else {
      wallArea = Math.max(1, inputs.area ?? 27);
      wallHeight = 2.7;
      wallLength = wallArea / wallHeight;
    }

    const openings = Math.max(0, inputs.openingsArea ?? 5);
    const netArea = Math.max(0.5, wallArea - openings);

    const blockSizeIdx = Math.round(inputs.blockSize ?? 0);
    const [blockL, blockH, blockT, blockName] = BLOCK_SIZES[blockSizeIdx] ?? BLOCK_SIZES[0];
    const mortarType = Math.round(inputs.mortarType ?? 0);

    const isKeramzit = blockSizeIdx >= 2;

    // Площадь грани блока
    const blockFaceArea = (blockL / 1000) * (blockH / 1000);
    const blocksNet = netArea / blockFaceArea;
    const blocksWithReserve = Math.ceil(blocksNet * 1.05);

    // Объём кладки
    const volume = netArea * (blockT / 1000);

    // Раствор/клей
    let mortarName: string;
    let mortarQty: number;
    let mortarBags: number;
    let mortarUnit: string;
    if (mortarType === 0) {
      // Клей: 25 кг/м³ кладки, мешки 25 кг
      const glueKg = volume * 25;
      mortarName = "Клей для блоков (мешки 25 кг)";
      mortarQty = glueKg;
      mortarBags = Math.ceil(glueKg / 25);
      mortarUnit = "мешков";
    } else {
      // ЦПС: 0.25 м³/м³ кладки, плотность 1700 кг/м³, мешки 50 кг
      const cpsM3 = volume * 0.25;
      const cpsKg = cpsM3 * 1700;
      mortarName = "ЦПС (мешки 50 кг)";
      mortarQty = cpsKg;
      mortarBags = Math.ceil(cpsKg / 50);
      mortarUnit = "мешков";
    }

    // Армирование
    const rows = Math.ceil(wallHeight / (blockH / 1000));
    const rebarRows = Math.ceil(rows / 4);

    const materials: Array<{
      name: string; quantity: number; unit: string;
      withReserve: number; purchaseQty: number; category: string;
    }> = [
      {
        name: blockName,
        quantity: blocksNet,
        unit: "шт",
        withReserve: blocksWithReserve,
        purchaseQty: blocksWithReserve,
        category: "Блоки",
      },
      {
        name: mortarName,
        quantity: mortarQty,
        unit: mortarUnit,
        withReserve: mortarBags,
        purchaseQty: mortarBags,
        category: "Раствор",
      },
    ];

    if (isKeramzit) {
      // Керамзитоблок: кладочная сетка 50×50×3 мм каждые 3-4 ряда
      const meshRows = Math.ceil(rows / 3);
      const meshArea = wallLength * (meshRows * (blockT / 1000));
      const meshWithReserve = Math.ceil(meshArea * 1.1);
      materials.push({
        name: "Кладочная сетка 50×50×3 мм",
        quantity: meshArea,
        unit: "м²",
        withReserve: meshWithReserve,
        purchaseQty: meshWithReserve,
        category: "Армирование",
      });
    } else {
      // Пеноблок: арматура Ø8 в штробах, 2 прутка на ряд
      const rebarLength = Math.ceil(wallLength * rebarRows * 2 * 1.1);
      materials.push({
        name: "Арматура Ø8 (штробы)",
        quantity: wallLength * rebarRows * 2,
        unit: "м.п.",
        withReserve: rebarLength,
        purchaseQty: rebarLength,
        category: "Армирование",
      });
    }

    // U-блоки для перемычек
    const openingsCount = Math.max(1, Math.round(openings / 2)); // ~2 м² на проём
    const uBlocksPerOpening = 2;
    const uBlocks = Math.ceil(openingsCount * uBlocksPerOpening * 1.1);
    if (openings > 0) {
      materials.push({
        name: isKeramzit ? "Перемычка бетонная (2 м)" : "U-блок для перемычек",
        quantity: openingsCount * uBlocksPerOpening,
        unit: "шт",
        withReserve: uBlocks,
        purchaseQty: uBlocks,
        category: "Перемычки",
      });
    }

    // Грунтовка
    const primerL = netArea * 0.15;
    const primerCans = Math.ceil(primerL * 1.15 / 10);
    materials.push({
      name: "Грунтовка глубокого проникновения (канистра 10 л)",
      quantity: primerL,
      unit: "шт",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    });

    const warnings: string[] = [];
    if (blockT <= 100) {
      warnings.push("Блоки толщиной ≤ 100 мм — только для ненесущих перегородок");
    }
    if (blockT > 100 && isKeramzit) {
      warnings.push("Для наружных стен из керамзитоблоков требуется утепление (минвата от 100 мм)");
    }
    if (mortarType === 1 && !isKeramzit) {
      warnings.push("Для пеноблоков рекомендуется специальный клей (шов 2–3 мм) вместо ЦПС — меньше мостиков холода");
    }

    const scenarios = buildNativeScenarios({
      id: "foam-blocks-main",
      title: "Foam blocks main",
      exactNeed: blocksNet * 1.05,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "foam-block-piece",
    });

    return {
      materials,
      totals: { wallArea, netArea, blocksNet, volume } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт блоков:**
Количество = Площадь_нетто / (Длина_блока × Высота_блока) × 1.05

**Расход раствора:**
- Клей: 25 кг/м³ кладки (шов 2–3 мм)
- ЦПС: 0.25 м³/м³ кладки (шов 10 мм)

По ГОСТ 21520-89: армирование каждые 3–4 ряда.
  `,
  howToUse: [
    "Введите размеры стен или общую площадь",
    "Укажите площадь оконных и дверных проёмов",
    "Выберите тип и размер блока",
    "Выберите тип раствора (клей или ЦПС)",
    "Нажмите «Рассчитать» — получите блоки, раствор и армирование",
  ],
faq: [
    {
      question: "Что выбрать для кладки блоков: клей или ЦПС?",
      answer: "Для ровных газобетонных и пеноблоков обычно выгоднее клей, потому что тонкий шов уменьшает мостики холода, даёт более аккуратную геометрию кладки и снижает общий расход смеси по сравнению с толстым раствором. ЦПС чаще выбирают при неровной геометрии блоков, для грубого выравнивания рядов или при работе с материалами, где тонкошовная кладка не так критична, но такой выбор почти всегда увеличивает толщину шва и потери по теплотехнике, особенно на наружных стенах без дополнительного утепления, при длинных протяжённых стенах, на участках с перемычками, в местах опирания плит и там, где потом сложнее контролировать ровность облицовки. Если блоки заметно гуляют по геометрии, это лучше увидеть до начала кладки, а не пытаться компенсировать всё раствором. Для первого ряда по неровному основанию раствор ещё может быть оправдан, а дальше клей обычно даёт заметно более точную и тёплую кладку. При ровной геометрии блоков клей почти всегда даёт более тёплый и аккуратный шов, а ЦПС обычно оправдана там, где приходится компенсировать заметные отклонения ряда и основания. Клей обычно выгоднее по точности шва и снижению мостиков холода, а ЦПС используют там, где геометрия блока слабее или нужно компенсировать большие перепады основания. Клей обычно выгоднее по точности шва и снижению мостиков холода, а ЦПС используют там, где геометрия блоков хуже или нужно компенсировать перепады основания. На точной геометрии блоков клей обычно даёт ровнее шов и меньше мостиков холода, чем толстослойный раствор. Если блоки ровные, клей обычно даёт более предсказуемый тонкий шов и меньшие теплопотери, чем работа по старой привычке на ЦПС."
    },
    {
      question: "Нужно ли армировать кладку из блоков?",
      answer: "Да, кладку из блоков обычно армируют каждые 3–4 ряда, а также усиливают зоны под окнами, над проёмами и другие напряжённые участки, где локальные деформации и риск трещин проявляются сильнее всего уже в процессе эксплуатации. Такое армирование помогает лучше распределить нагрузки, уменьшить вероятность раскрытия трещин и сделать стену из блоков устойчивее к усадочным и эксплуатационным воздействиям, особенно на длинных простенках и участках с концентрацией напряжений возле проёмов и примыканий. Это особенно актуально, если основание ещё даёт усадку, блоки работают в связке с тяжёлыми перемычками и жёсткими монолитными элементами или стена имеет длинные слабоподдержанные участки. На таких стенах экономия на армировании почти всегда становится заметной быстрее, чем экономия на самих блоках. Особенно не стоит пропускать армирование под оконными зонами и на длинных участках стен, где микротрещина сначала выглядит косметической, а потом начинает повторяться по отделке. Особенно это важно под оконными зонами, на длинных стенах и у мест сопряжения с жёсткими элементами, где напряжения концентрируются быстрее всего. Обычно армирование особенно важно в первых рядах, под оконными проёмами, в длинных участках и зонах концентрации напряжений, где без него быстрее появляются трещины. Армирование особенно важно в зонах проёмов, длинных стен и первых рядах, где выше риск трещин. Особенно важно армировать зоны проёмов, первый ряд и длинные участки стены, где выше риск раскрытия трещин. Особенно это важно в длинных стенах, под окнами и в зонах концентрации напряжений, где трещины появляются быстрее всего."
    }
  ],
};


