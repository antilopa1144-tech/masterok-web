import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const balconyDef: CalculatorDefinition = {
  id: "balcony",
  slug: "otdelka-balkona",
  title: "Калькулятор отделки балкона",
  h1: "Калькулятор отделки балкона и лоджии — расчёт материалов",
  description: "Рассчитайте материалы для утепления, обшивки и отделки балкона или лоджии: вагонка, ПВХ панели, утеплитель, подоконник.",
  metaTitle: "Калькулятор отделки балкона | Утепление, обшивка — Мастерок",
  metaDescription: "Бесплатный калькулятор отделки балкона: вагонка, ПВХ панели, утеплитель, ГКЛ — рассчитайте материалы для лоджии и балкона.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["отделка балкона", "утепление балкона", "вагонка", "лоджия", "обшивка балкона"],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина балкона/лоджии",
      type: "slider",
      unit: "м",
      min: 1,
      max: 10,
      step: 0.1,
      defaultValue: 3.0,
    },
    {
      key: "width",
      label: "Ширина балкона/лоджии",
      type: "slider",
      unit: "м",
      min: 0.6,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.2,
    },
    {
      key: "height",
      label: "Высота помещения",
      type: "slider",
      unit: "м",
      min: 2.0,
      max: 3.0,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "finishType",
      label: "Тип отделки стен",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Вагонка деревянная (сосна)" },
        { value: 1, label: "Панели ПВХ 100 мм" },
        { value: 2, label: "Имитация бруса 14×96 мм" },
        { value: 3, label: "МДФ панели 240 мм" },
      ],
    },
    {
      key: "insulationType",
      label: "Утепление",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Без утепления" },
        { value: 1, label: "Пенополистирол 50 мм" },
        { value: 2, label: "Пенофол (фольгированный, 10 мм)" },
        { value: 3, label: "ЭППС 50 мм + пенофол 10 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const length = Math.max(1, inputs.length ?? 3.0);
    const width = Math.max(0.6, inputs.width ?? 1.2);
    const height = Math.max(2.0, inputs.height ?? 2.5);
    const finishType = Math.round(inputs.finishType ?? 0);
    const insulationType = Math.round(inputs.insulationType ?? 1);

    // Площади поверхностей балкона
    // Стены: торцевая (лоджия) + 2 боковых + внутренняя
    const floorArea = length * width;
    const frontWallArea = length * height; // парапет/остекление — без отделки изнутри считаем наружную стену
    const sideWallsArea = 2 * width * height;
    const backWallArea = length * height; // внутренняя стена квартиры
    const ceilingArea = length * width;

    const wallArea = frontWallArea + sideWallsArea + backWallArea;
    const totalFinishArea = wallArea + ceilingArea; // потолок тоже обшиваем

    const warnings: string[] = [];
    const materials = [];

    // Утепление
    if (insulationType > 0) {
      if (insulationType === 1 || insulationType === 3) {
        const psPlates = Math.ceil(totalFinishArea * 1.05 / 0.72);
        materials.push({
          name: "Пенополистирол ПСБС-25 50 мм (лист 1200×600 мм)",
          quantity: totalFinishArea * 1.05 / 0.72,
          unit: "листов",
          withReserve: psPlates,
          purchaseQty: psPlates,
          category: "Утеплитель",
        });

        // Крепёж
        const psKreps = Math.ceil(psPlates * 4 * 1.05);
        materials.push({
          name: "Дюбель-грибок 6×50 мм для пенополистирола",
          quantity: psPlates * 4,
          unit: "шт",
          withReserve: psKreps,
          purchaseQty: psKreps,
          category: "Крепёж",
        });
      }

      if (insulationType >= 2) {
        const penfoilRolls = Math.ceil(totalFinishArea * 1.15 / 12); // рулон 12 м²
        materials.push({
          name: "Пенофол 10 мм (фольгированный, рулон 12 м²)",
          quantity: totalFinishArea * 1.15 / 12,
          unit: "рулонов",
          withReserve: penfoilRolls,
          purchaseQty: penfoilRolls,
          category: "Утеплитель",
        });

        const foilTapeRolls = Math.ceil(totalFinishArea / 20); // рулон 20 м
        materials.push({
          name: "Лента фольгированная (скотч) для стыков (рулон 50 м)",
          quantity: totalFinishArea / 20,
          unit: "рулонов",
          withReserve: foilTapeRolls,
          purchaseQty: foilTapeRolls,
          category: "Монтаж",
        });
      }
    }

    // Обрешётка
    const battenPitch = 0.4; // шаг 400 мм
    const battenRows = Math.ceil(totalFinishArea / battenPitch);
    const battenLengthM = battenRows * 2 * 1.1; // длина каждой рейки ~2 м
    const battenPcs = Math.ceil(battenLengthM / 2);
    materials.push({
      name: "Брусок обрешётки 20×40 мм (рейка 2 м)",
      quantity: battenLengthM / 2,
      unit: "шт",
      withReserve: battenPcs,
      purchaseQty: battenPcs,
      category: "Обрешётка",
    });

    // Отделочные панели
    let panelWidthMm: number;
    let panelLengthM: number;
    let panelName: string;

    switch (finishType) {
      case 0: panelWidthMm = 96; panelLengthM = 3; panelName = "Вагонка деревянная (сосна) 96×3000 мм"; break;
      case 1: panelWidthMm = 100; panelLengthM = 3; panelName = "Панель ПВХ 100×3000 мм"; break;
      case 2: panelWidthMm = 96; panelLengthM = 3; panelName = "Имитация бруса 96×3000 мм"; break;
      default: panelWidthMm = 240; panelLengthM = 2.7; panelName = "Панель МДФ 240×2700 мм"; break;
    }

    const panelAreaUnit = (panelWidthMm / 1000) * panelLengthM;
    const panelCount = Math.ceil(totalFinishArea * 1.1 / panelAreaUnit);
    materials.push({
      name: panelName,
      quantity: totalFinishArea * 1.1 / panelAreaUnit,
      unit: "шт",
      withReserve: panelCount,
      purchaseQty: panelCount,
      category: "Отделка",
    });

    // Кляймеры или скобы для вагонки
    const klaymerCount = Math.ceil(panelCount * 3 * 1.1);
    materials.push({
      name: finishType === 1 ? "Кляймер ПВХ" : "Кляймер для вагонки (скоба)",
      quantity: panelCount * 3,
      unit: "шт",
      withReserve: klaymerCount,
      purchaseQty: klaymerCount,
      category: "Крепёж",
    });

    // Пол — линолеум или ламинат
    const floorWithReserve = Math.ceil(floorArea * 1.1 * 10) / 10;
    materials.push({
      name: "Линолеум или ламинат (финишное покрытие пола)",
      quantity: floorArea,
      unit: "м²",
      withReserve: floorWithReserve,
      purchaseQty: floorWithReserve,
      category: "Пол",
    });

    // Подоконник-столешница
    const windowsillLength = length + 0.1; // выступ 5 см с каждой стороны
    materials.push({
      name: `Подоконник ПВХ/столешница ${Math.round(width * 100)} см (длина ${windowsillLength.toFixed(1)} м)`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Подоконник",
    });

    // Монтажная пена для швов и щелей
    const foamCansBalcony = Math.ceil((length + width) * 2 * 0.3); // ~0.3 баллона на м.п. периметра
    materials.push({
      name: "Монтажная пена профессиональная (баллон 750 мл)",
      quantity: foamCansBalcony,
      unit: "баллонов",
      withReserve: foamCansBalcony,
      purchaseQty: foamCansBalcony,
      category: "Монтаж",
    });

    // Герметик силиконовый для примыканий
    const sealantTubesBalcony = Math.ceil((length + width) * 2 / 6); // 1 туба на ~6 м.п.
    materials.push({
      name: "Герметик силиконовый (туба 310 мл)",
      quantity: sealantTubesBalcony,
      unit: "туб",
      withReserve: sealantTubesBalcony,
      purchaseQty: sealantTubesBalcony,
      category: "Герметик",
    });

    // Угловые и стартовые планки для панелей
    const cornerTrimLength = (4 * height + (length + width) * 2) * 1.1; // внутренние углы + периметр потолка
    const cornerTrimPcs = Math.ceil(cornerTrimLength / 3); // планки по 3 м
    materials.push({
      name: "Уголок/стартовая планка для панелей 3 м",
      quantity: cornerTrimLength / 3,
      unit: "шт",
      withReserve: cornerTrimPcs,
      purchaseQty: cornerTrimPcs,
      category: "Профиль",
    });

    if (insulationType === 0) {
      warnings.push("Без утепления балкон будет холодным — для комфортного использования рекомендуется минимум пенофол или пенополистирол");
    }
    if (finishType === 0 || finishType === 2) {
      warnings.push("Деревянная вагонка требует обработки антисептиком и лаком — балкон влажная зона");
    }

    const scenarios = buildNativeScenarios({
      id: "balcony-main",
      title: "Balcony main",
      exactNeed: totalFinishArea * 1.1 / panelAreaUnit,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "balcony-panel",
    });

    return {
      materials,
      totals: {
        floorArea,
        wallArea,
        totalFinishArea,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт отделки балкона:**
- Стены (4 стороны) + потолок = общая площадь
- Панели: площадь × 1.10 / (ширина × длина панели)
- Обрешётка: ряды через 400 мм
  `,
  howToUse: [
    "Введите размеры балкона",
    "Выберите тип отделки и утепления",
    "Нажмите «Рассчитать»",
  ],
};
