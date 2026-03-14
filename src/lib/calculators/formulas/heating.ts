import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const heatingDef: CalculatorDefinition = {
  id: "engineering_heating",
  slug: "otoplenie-radiatory",
  title: "Калькулятор отопления и радиаторов",
  h1: "Калькулятор отопления — расчёт радиаторов и труб",
  description: "Рассчитайте мощность отопления, количество секций радиаторов и длину труб для дома или квартиры по площади и климатическому региону.",
  metaTitle: withSiteMetaTitle("Калькулятор отопления | Радиаторы, трубы"),
  metaDescription: "Бесплатный калькулятор отопления: рассчитайте тепловую мощность, количество секций радиаторов и длину труб для квартиры или частного дома по площади и климату.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["отопление", "радиаторы", "расчёт отопления", "биметаллический радиатор", "трубы отопления"],
  popularity: 75,
  complexity: 2,
  fields: [
    {
      key: "totalArea",
      label: "Общая площадь отапливаемых помещений",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 80,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "select",
      defaultValue: 270,
      options: [
        { value: 250, label: "2.5 м (стандарт)" },
        { value: 270, label: "2.7 м" },
        { value: 300, label: "3.0 м (высокие потолки)" },
        { value: 350, label: "3.5 м" },
      ],
    },
    {
      key: "climateZone",
      label: "Климатический регион",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Южные регионы (Краснодар, Ростов, -15°C)" },
        { value: 1, label: "Центральная Россия (Москва, -25°C)" },
        { value: 2, label: "Урал, Сибирь (Новосибирск, -35°C)" },
        { value: 3, label: "Крайний север (Якутия, -45°C)" },
      ],
    },
    {
      key: "buildingType",
      label: "Тип здания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Квартира (угловая/последний этаж)" },
        { value: 1, label: "Квартира (средний этаж)" },
        { value: 2, label: "Частный дом (хорошее утепление)" },
        { value: 3, label: "Частный дом (слабое утепление)" },
      ],
    },
    {
      key: "radiatorType",
      label: "Тип радиатора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Биметаллический (180 Вт/секция)" },
        { value: 1, label: "Алюминиевый (200 Вт/секция)" },
        { value: 2, label: "Чугунный 7-секционный (700 Вт/радиатор)" },
        { value: 3, label: "Панельный стальной Тип 22 (700 Вт/1200 мм)" },
      ],
    },
    {
      key: "roomCount",
      label: "Количество помещений",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const totalArea = Math.max(10, inputs.totalArea ?? 80);
    const ceilingHeightMm = inputs.ceilingHeight ?? 270;
    const climateZone = Math.round(inputs.climateZone ?? 1);
    const buildingType = Math.round(inputs.buildingType ?? 0);
    const radiatorType = Math.round(inputs.radiatorType ?? 0);
    const roomCount = Math.max(1, Math.round(inputs.roomCount ?? 4));

    const ceilingH = ceilingHeightMm / 100; // в дм

    // Коэффициент мощности по регионам (Вт/м²)
    const powerPerM2Base = [80, 100, 130, 150][climateZone];

    // Поправочный коэффициент по типу здания
    const buildingCoeff = [1.3, 1.0, 1.1, 1.4][buildingType];

    // Поправка на высоту потолков (базовая 2.7м)
    const heightCoeff = ceilingH / 2.7;

    const totalPowerW = totalArea * powerPerM2Base * buildingCoeff * heightCoeff;
    const totalPowerKW = Math.round(totalPowerW / 100) / 10;

    const warnings: string[] = [];
    const materials = [];

    // Радиаторы
    let sectionsPerRadiator: number;
    let wattPerUnit: number;
    let radiatorName: string;

    switch (radiatorType) {
      case 0:
        wattPerUnit = 180; sectionsPerRadiator = 1; radiatorName = "Биметаллический радиатор (секция, 180 Вт при ΔT50)";
        break;
      case 1:
        wattPerUnit = 200; sectionsPerRadiator = 1; radiatorName = "Алюминиевый радиатор (секция, 200 Вт при ΔT50)";
        break;
      case 2:
        wattPerUnit = 700; sectionsPerRadiator = 7; radiatorName = "Радиатор чугунный МС-140 (7 секций, 700 Вт)";
        break;
      default:
        wattPerUnit = 700; sectionsPerRadiator = 1; radiatorName = "Радиатор стальной панельный Тип 22 L=1200 мм (700 Вт)";
    }

    const totalUnits = Math.ceil(totalPowerW / wattPerUnit);
    materials.push({
      name: radiatorName,
      quantity: totalUnits,
      unit: radiatorType <= 1 ? "секций" : "шт",
      withReserve: totalUnits,
      purchaseQty: totalUnits,
      category: "Радиаторы",
    });

    // Если биметалл/алюминий — подсчитываем целые радиаторы (по 8 секций)
    if (radiatorType <= 1) {
      const sectionsPerRad = 8;
      const radiatorCount = Math.ceil(totalUnits / sectionsPerRad);
      materials.push({
        name: `Радиатор в сборе (по ${sectionsPerRad} секций)`,
        quantity: totalUnits / sectionsPerRad,
        unit: "шт",
        withReserve: radiatorCount,
        purchaseQty: radiatorCount,
        category: "Радиаторы",
      });
    }

    // Трубопровод (ПП или металлопластик)
    // Среднее расстояние от котла/стояка до радиатора ~5 м × 2 трубы
    const pipePerRoom = 10; // 10 м.п. на помещение (подача + обратка)
    const totalPipeLength = pipePerRoom * roomCount * 1.15;
    const pipePcs = Math.ceil(totalPipeLength / 4); // продаётся штангами по 4 м
    materials.push({
      name: "Труба полипропиленовая PP-R ∅25 мм (штанга 4 м)",
      quantity: totalPipeLength / 4,
      unit: "штанг",
      withReserve: pipePcs,
      purchaseQty: pipePcs,
      category: "Трубопровод",
    });

    // Фитинги (уголки, тройники, муфты)
    const fittingsCount = Math.ceil(roomCount * 6 * 1.1); // ~6 фитингов на комнату
    materials.push({
      name: "Фитинги ПП (уголки 90°, тройники, муфты) — комплект",
      quantity: roomCount * 6,
      unit: "шт",
      withReserve: fittingsCount,
      purchaseQty: fittingsCount,
      category: "Фитинги",
    });

    // Кронштейны для радиаторов
    const bracketsCount = Math.ceil(roomCount * 3 * 1.05); // ~3 кронштейна на радиатор
    materials.push({
      name: "Кронштейн для радиатора (настенный)",
      quantity: roomCount * 3,
      unit: "шт",
      withReserve: bracketsCount,
      purchaseQty: bracketsCount,
      category: "Монтаж",
    });

    // Термоголовки
    const thermoCount = Math.ceil(roomCount * 1.05);
    materials.push({
      name: "Термостатическая головка для радиатора",
      quantity: roomCount,
      unit: "шт",
      withReserve: thermoCount,
      purchaseQty: thermoCount,
      category: "Автоматика",
    });

    // Кран Маевского
    materials.push({
      name: "Кран Маевского (воздухоотводчик) ∅1/2\"",
      quantity: roomCount,
      unit: "шт",
      withReserve: Math.ceil(roomCount * 1.1),
      purchaseQty: Math.ceil(roomCount * 1.1),
      category: "Фурнитура",
    });

    if (totalPowerKW > 20) {
      warnings.push(`Суммарная мощность ${totalPowerKW} кВт — для частного дома рекомендуется газовый котёл с запасом 15–20% (нужен котёл от ${Math.ceil(totalPowerKW * 1.2)} кВт)`);
    }
    if (buildingType >= 2 && climateZone >= 2) {
      warnings.push("Для Сибири и севера рекомендуется теплотехнический расчёт у специалиста — данный расчёт ориентировочный");
    }

    const scenarios = buildNativeScenarios({
      id: "heating-main",
      title: "Heating main",
      exactNeed: totalUnits,
      unit: "секций",
      packageSizes: [1],
      packageLabelPrefix: "heating-section",
    });

    return {
      materials,
      totals: {
        totalPowerW: Math.round(totalPowerW),
        totalPowerKW,
        totalArea,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт мощности отопления:**
- Базовая: 80–150 Вт/м² в зависимости от региона
- Поправки: тип здания (×1.0–1.4), высота потолков
- Секций радиатора = Мощность / 180 Вт (биметалл)
  `,
  howToUse: [
    "Введите площадь и высоту потолков",
    "Выберите климатический регион и тип здания",
    "Выберите тип радиатора и количество помещений",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Сколько ватт на квадратный метр брать для отопления?",
      answer: "Для квартир и домов ориентир по отоплению часто берут в диапазоне 80–150 Вт/м², но это только стартовая оценка, а не готовая мощность для любого помещения. Точное значение зависит от региона, высоты потолков, качества утепления, числа наружных стен, типа окон, реальных теплопотерь и режима эксплуатации, поэтому одинаковая площадь в разных домах может требовать разную мощность, особенно если часть помещений угловая или с большими остеклёнными зонами, где запас по теплу нужен больше обычного в морозные дни. Самая частая ошибка — брать усреднённый норматив без поправки на угловые комнаты, реальное качество ограждающих конструкций и желаемую температуру в помещении, а потом компенсировать недостачу тепла уже во время эксплуатации. Для санузлов, входных зон и комнат с панорамными окнами резерв по мощности обычно нужен выше среднего по дому. Этот ориентир полезен только как стартовая оценка: на реальном объекте его всегда нужно проверять по теплопотерям, иначе ошибка особенно быстро вылезает на угловых и остеклённых помещениях. Этот ориентир всегда проверяют поправкой на утепление, высоту потолка, площадь остекления и климат, потому что одинаковая площадь может требовать разной мощности в два раза и больше. Это лишь грубый ориентир, который всегда уточняют по утеплению, высоте потолка, площади остекления, инфильтрации и температурному режиму региона. Точный запас по мощности зависит от утепления, окон, высоты потолка и климата, а не только от площади помещения. Без учёта утепления, остекления и реальных теплопотерь эта цифра остаётся только ориентиром, а не готовым подбором системы."
    },
    {
      question: "Как рассчитать количество секций радиатора?",
      answer: "Количество секций радиатора рассчитывают делением требуемой тепловой мощности помещения на паспортную теплоотдачу одной секции выбранной модели, а затем округляют результат в большую сторону с небольшим резервом по комфорту. Для биметаллических радиаторов часто используют ориентир около 180 Вт на секцию, но точнее брать значение именно из характеристик конкретного радиатора и учитывать реальные теплопотери комнаты, а не только её площадь, особенно если есть большие окна или угловое расположение помещения. Ошибка чаще всего появляется там, где секции считают по площади, но не учитывают окна, углы, фактический тепловой режим комнаты и температуру подачи системы, а это потом даёт недогрев именно в морозные дни. То есть хороший расчёт радиатора всегда ближе к теплопотерям комнаты и режиму системы, чем к простой формуле «площадь на секцию», особенно в угловых и остеклённых помещениях. Правильнее считать не только по площади комнаты, а по теплопотерям, типу окон, угловому положению и температурному режиму системы, иначе секции быстро оказываются «на глаз». Сначала определяют теплопотери помещения, затем делят требуемую мощность на теплоотдачу одной секции с поправкой на реальную температуру системы и схему подключения. Сначала определяют теплопотери помещения, затем делят требуемую мощность на теплоотдачу одной секции с поправкой на температуру системы и схему подключения. Считать нужно не только по площади, но и по теплопотерям комнаты, типу подключения и реальной температуре системы. Количество секций лучше считать по реальным теплопотерям комнаты, а не только по её площади без поправки на окна и стены."
    }
  ],
};


