import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const terraceDef: CalculatorDefinition = {
  id: "terrace",
  slug: "kalkulyator-terrasnoy-doski",
  title: "Калькулятор террасной доски",
  h1: "Калькулятор террасной доски — расчёт декинга и материалов",
  description: "Рассчитайте количество террасной доски (декинга), лаг, крепежа и пропитки для террасы, веранды или дорожки.",
  metaTitle: withSiteMetaTitle("Калькулятор террасной доски | Декинг"),
  metaDescription: "Бесплатный калькулятор террасной доски: рассчитайте декинг, лаги, кляймеры и пропитку для террасы, веранды или садовой площадки по площади покрытия.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["террасная доска", "декинг", "терраса", "веранда", "лаги"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина террасы",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "width",
      label: "Ширина террасы",
      type: "slider",
      unit: "м",
      min: 1,
      max: 15,
      step: 0.5,
      defaultValue: 3,
    },
    {
      key: "boardType",
      label: "Тип доски",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Террасная доска (ДПК) 150×25 мм" },
        { value: 1, label: "Террасная доска лиственница 120×28 мм" },
        { value: 2, label: "Террасная доска сосна 90×28 мм" },
        { value: 3, label: "Планкен 120×20 мм (без зазора)" },
      ],
    },
    {
      key: "boardLength",
      label: "Длина доски",
      type: "select",
      defaultValue: 3000,
      options: [
        { value: 2000, label: "2000 мм" },
        { value: 3000, label: "3000 мм" },
        { value: 4000, label: "4000 мм" },
        { value: 6000, label: "6000 мм" },
      ],
    },
    {
      key: "lagStep",
      label: "Шаг лаг",
      type: "select",
      defaultValue: 400,
      options: [
        { value: 300, label: "300 мм (нагруженные террасы)" },
        { value: 400, label: "400 мм (стандарт)" },
        { value: 500, label: "500 мм (лёгкие конструкции)" },
        { value: 600, label: "600 мм (ДПК усиленный)" },
      ],
    },
    {
      key: "withTreatment",
      label: "Пропитка / масло (для дерева)",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Не требуется (ДПК)" },
        { value: 1, label: "Масло для террасной доски" },
        { value: 2, label: "Антисептик + масло (2 слоя)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const length = Math.max(1, inputs.length ?? 5);
    const width = Math.max(1, inputs.width ?? 3);
    const boardType = Math.round(inputs.boardType ?? 0);
    const boardLengthMm = inputs.boardLength ?? 3000;
    const lagStepMm = inputs.lagStep ?? 400;
    const withTreatment = Math.round(inputs.withTreatment ?? 1);

    const area = length * width;
    const boardLengthM = boardLengthMm / 1000;
    const lagStepM = lagStepMm / 1000;

    // Ширина доски и зазор
    let boardWidthMm: number;
    let gapMm: number;
    switch (boardType) {
      case 0: boardWidthMm = 150; gapMm = 5; break; // ДПК
      case 1: boardWidthMm = 120; gapMm = 5; break; // лиственница
      case 2: boardWidthMm = 90; gapMm = 5; break;  // сосна
      case 3: boardWidthMm = 120; gapMm = 0; break; // планкен без зазора
      default: boardWidthMm = 150; gapMm = 5;
    }

    const boardPitch = (boardWidthMm + gapMm) / 1000; // шаг укладки

    // Количество рядов досок (по ширине террасы)
    const rowCount = Math.ceil(width / boardPitch);

    // Длина каждого ряда = length (вдоль)
    // Количество досок в ряду
    const boardsPerRow = Math.ceil(length / boardLengthM);
    const totalBoards = rowCount * boardsPerRow;
    const totalBoardsWithReserve = Math.ceil(totalBoards * 1.1);

    const materials = [];

    materials.push({
      name: `Террасная доска ${boardWidthMm}×${boardType === 0 ? 25 : boardType === 3 ? 20 : 28} мм, L=${boardLengthM} м`,
      quantity: totalBoards,
      unit: "шт",
      withReserve: totalBoardsWithReserve,
      purchaseQty: totalBoardsWithReserve,
      category: "Доски",
    });

    // Лаги 50×50 мм (поперёк укладки досок = вдоль ширины)
    // По длине террасы ставим лаги через lagStep
    const lagRowCount = Math.ceil(length / lagStepM) + 1; // рядов лаг вдоль длины
    // Длина каждой лаги = ширина террасы
    const lagTotalLength = lagRowCount * width * 1.05;
    const lagBoardLength = 3; // лаги 50×50 продаются по 3м
    const lagPcs = Math.ceil(lagTotalLength / lagBoardLength);

    materials.push({
      name: "Лага 50×50 мм (сосна, антисептированная), L=3 м",
      quantity: lagTotalLength / lagBoardLength,
      unit: "шт",
      withReserve: lagPcs,
      purchaseQty: lagPcs,
      category: "Основание",
    });

    // Крепёж — кляймеры (для ДПК и натуральное дерево с зазором)
    if (gapMm > 0) {
      // 1 кляймер на каждую лагу × количество досок в ряду
      const klaymerCount = lagRowCount * rowCount;
      const klaymerWithReserve = Math.ceil(klaymerCount * 1.1);
      materials.push({
        name: "Кляймер стартовый/рядовой (комплект)",
        quantity: klaymerCount,
        unit: "шт",
        withReserve: klaymerWithReserve,
        purchaseQty: klaymerWithReserve,
        category: "Крепёж",
      });
    }

    // Саморезы нержавеющие 4.5×70 мм (для планкена или 2 самореза на пересечение)
    const screwCount = gapMm > 0
      ? Math.ceil(lagRowCount * rowCount * 1.2) // кляймеры + страховочные
      : lagRowCount * rowCount * 2;
    const screwPacks = Math.ceil(screwCount / 200); // пачки по 200 шт

    materials.push({
      name: "Саморез нержавеющий 4.5×70 мм (пачка 200 шт)",
      quantity: screwCount / 200,
      unit: "пачек",
      withReserve: screwPacks,
      purchaseQty: screwPacks,
      category: "Крепёж",
    });

    // Пропитка / масло (только для натурального дерева)
    if (withTreatment > 0 && boardType >= 1) {
      const treatmentLayers = withTreatment === 2 ? 2 : 1;
      const consumptionPerM2 = 0.15; // ~150 мл/м² за слой
      const totalLiters = area * treatmentLayers * consumptionPerM2 * 1.1;
      const cansNeeded = Math.ceil(totalLiters / 2.5); // канистры 2.5л

      materials.push({
        name: `Масло/антисептик для террасной доски (${withTreatment === 2 ? "2 слоя" : "1 слой"}, канистра 2.5 л)`,
        quantity: totalLiters / 2.5,
        unit: "канистр",
        withReserve: cansNeeded,
        purchaseQty: cansNeeded,
        category: "Защита",
      });
    }

    // Геотекстиль под основание (если есть грунт)
    const geotextileArea = area * 1.1;
    const geotextileRolls = Math.ceil(geotextileArea / 50); // рулон 50м²
    materials.push({
      name: "Геотекстиль нетканый (рулон 50 м²)",
      quantity: geotextileArea / 50,
      unit: "рулонов",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Основание",
    });

    const warnings: string[] = [];
    if (boardType === 0 && lagStepMm > 400) {
      warnings.push("ДПК рекомендуется укладывать на лаги с шагом не более 400 мм");
    }
    if (boardType >= 1 && withTreatment === 0) {
      warnings.push("Натуральная древесина без защитной пропитки прослужит значительно меньше — рекомендуется масло или антисептик");
    }
    if (area > 50) {
      warnings.push("Для больших террас рекомендуется деформационный зазор 10–15 мм у стен и строений");
    }

    const scenarios = buildNativeScenarios({
      id: "terrace-main",
      title: "Terrace main",
      exactNeed: totalBoards * 1.1,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "terrace-board",
    });

    return {
      materials,
      totals: {
        area,
        boardCount: totalBoards,
        lagCount: lagRowCount,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт террасной доски:**
- Рядов досок = Ширина / (Ширина доски + Зазор)
- Досок в ряду = Длина / Длина доски
- Лаг = (Длина / Шаг лаг + 1) × Ширина / 3 м
- Запас: доски +10%, лаги +5%
  `,
  howToUse: [
    "Введите размеры террасы",
    "Выберите тип и длину доски",
    "Укажите шаг лаг",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какой запас закладывать на террасную доску?",
      answer: "Для террасной доски обычно добавляют запас на подрезку, стыки, отбор по рисунку, направление укладки и возможный брак материала, потому что без него реальный монтаж почти всегда расходует больше, чем чистая площадь настила. Чем сложнее форма площадки, больше диагональных резов, примыканий, торцевых стыков и заметнее рисунок доски, тем осторожнее стоит считать резерв по материалу, чтобы не остаться без нужных элементов на финальном этапе сборки, когда добор тех же досок по партии уже неудобен. Отдельно полезно учитывать, что часть досок может уйти в подбор по оттенку, геометрии и рисунку текстуры, если настил делают на видимой фасадной или входной зоне, где разница партии и оттенка особенно заметна после монтажа. Если длина доски плохо кратна размеру площадки, отходов на торцевой подрезке обычно получается ощутимо больше, чем кажется по одной площади. Если длина доски плохо кратна размеру площадки, отходов на торцевой подрезке обычно получается ощутимо больше, чем кажется по одной площади. На террасах со сложным контуром, ступенями и примыканиями запас почти всегда растёт быстрее, чем на прямом настиле без подрезок. Он особенно растёт при диагональной укладке, сложной геометрии террасы, подрезке у ограждений и подборе длины доски под конкретный шаг лаг. При диагональной раскладке, сложном периметре и ступенях запас лучше считать ближе к верхней границе. На диагональной раскладке, сложных контурах и ступенях запас почти всегда нужен больше обычного прямого настила. На диагональной раскладке и сложном контуре запас почти всегда нужен выше, чем на прямом стандартном настиле."
    },
    {
      question: "Как выбрать шаг лаг для террасы?",
      answer: "Шаг лаг для террасы зависит от материала доски, её толщины, длины пролёта и требований конкретной системы настила, поэтому его лучше выбирать не по одному усреднённому числу, а по характеристикам производителя. Для ДПК шаг лаг обычно делают меньше, чем для более жёсткой массивной доски, чтобы покрытие не пружинило, не прогибалось и не теряло геометрию под рабочей нагрузкой, особенно в зонах активной ходьбы и у крайних участков настила, где деформации проявляются быстрее всего и быстрее разбалтывают крепёж. Если шаг сделать слишком редким, проблема чаще всего проявляется уже после эксплуатации, когда доска начинает играть и быстрее разбивает узлы крепления, а на открытой террасе это особенно заметно после сезона дождей и перепадов температуры. Для зон у ступеней, кромок и опорных столбов лаги нередко ставят плотнее среднего шага по полю настила. Шаг лаг лучше подбирать не только по прочности доски, но и по её визуальной стабильности, иначе покрытие может начать пружинить даже без формального превышения нагрузки. Его выбирают не только по типу доски, но и по толщине покрытия, направлению укладки и ожидаемой нагрузке, иначе настил может начать пружинить даже при хорошем материале. Его подбирают вместе с толщиной доски, направлением укладки, нагрузкой и типом основания, иначе настил может начать пружинить даже при качественном материале. Его подбирают под толщину доски, схему крепления и реальную нагрузку, а не по одному усреднённому числу. На длинных пролётах и тонкой доске экономия на количестве лаг обычно быстрее всего проявляется в прогибе и вибрации. Его лучше увязывать не только с доской, но и с длиной пролёта, нагрузкой на террасу и фактической жёсткостью подконструкции."
    }
  ],
};




