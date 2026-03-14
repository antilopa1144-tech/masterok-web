import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const balconyDef: CalculatorDefinition = {
  id: "balcony",
  slug: "otdelka-balkona",
  title: "Калькулятор отделки балкона",
  h1: "Калькулятор отделки балкона и лоджии — расчёт материалов",
  description: "Рассчитайте материалы для утепления, обшивки и отделки балкона или лоджии: вагонка, ПВХ панели, утеплитель, подоконник.",
  metaTitle: withSiteMetaTitle("Калькулятор отделки балкона | Утепление, обшивка"),
  metaDescription: "Бесплатный калькулятор отделки балкона: рассчитайте вагонку, ПВХ панели, утеплитель и ГКЛ для лоджии или балкона по размерам помещения.",
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
faq: [
    {
      question: "Нужно ли утеплять балкон перед отделкой?",
      answer: "Если балкон или лоджию планируют использовать круглый год, утепление обычно необходимо, потому что одна отделка не решает проблему теплопотерь, холодных поверхностей и конденсата. Без утепления облицовка в основном улучшает внешний вид, но не делает пространство по-настоящему комфортным и не защищает конструкцию от влажностных перепадов в холодный сезон, особенно если помещение хотят объединять с жилой зоной или использовать как рабочее место, где важна стабильная температура поверхности и отсутствие сырости. Ошибка обычно возникает, когда отделку делают как чисто декоративный слой, а теплотехнический узел остаётся по сути холодным и продолжает собирать конденсат в узлах примыкания. В таком случае внешне балкон выглядит готовым, а по факту быстро начинает работать как холодная и влажная зона с риском плесени, промерзания и сырости за отделкой. Если балкон будет частью тёплого контура, отделка без нормального утепления и узлов примыкания почти всегда начинает работать как красивая, но холодная облицовка. Если помещение планируют использовать как тёплую зону, утепление закладывают вместе с пароизоляцией, герметизацией узлов и расчётом точки росы, а не только по толщине материала. Если балкон хотят использовать как тёплую зону, утепление считают вместе с пароизоляцией, герметизацией узлов и расчётом точки росы, а не только по толщине материала. Если балкон планируют использовать не только летом, без утепления отделка и комфорт быстро упрутся в конденсат и холод. Иначе отделка часто начинает работать по холодному и влажному основанию, а не по нормальному тёплому узлу."
    },
    {
      question: "Какой запас материалов брать на отделку балкона?",
      answer: "Для панелей, вагонки и листовых материалов на балконе обычно закладывают запас 5–10%, потому что подрезка по парапету, углам, откосам и примыканиям почти всегда даёт отходы даже при простой геометрии. Если есть ниши, окна, нестандартные углы, сложный потолок или заметный рисунок отделки, запас лучше увеличить, чтобы не столкнуться с нехваткой материала в самом конце работ и не добирать потом панели или доборные элементы из другой партии, которые могут отличаться по тону или фактуре на маленьком заметном пространстве, особенно возле оконного блока и наружного угла. На маленьких балконах разница по тону и подрезке обычно заметна сильнее, чем кажется по площади, потому что весь узел просматривается целиком с близкой дистанции. Чем больше узких полос у окна, парапета и боковых стен, тем выше реальный отход по сравнению с расчётом от одной площади. Чем больше узких полос у окна, парапета и боковых стен, тем выше реальный отход по сравнению с расчётом от одной площади. На балконах запас часто растёт из-за узких полос, примыканий, наружных углов и подрезки около остекления, поэтому считать только по чистой площади почти всегда слишком оптимистично. На балконе отход особенно растёт из-за подрезки у примыканий, парапета, оконных блоков, углов и малой площади, где почти каждый лист или панель режется индивидуально. На маленьких и ломаных балконах процент подрезки обычно выше, чем кажется по одной только площади. На узких балконах и при большом количестве примыканий процент подрезки обычно выше, чем кажется по площади. На маленьких балконах запас часто съедают не стены, а откосы, наружные углы и подгонка вокруг рамы и порога."
    }
  ],
};


