import type { CalculatorDefinition } from "../types";

export const windowsDef: CalculatorDefinition = {
  id: "windows_install",
  slug: "ustanovka-okon",
  title: "Калькулятор установки окон",
  h1: "Калькулятор установки окон — расчёт материалов для монтажа",
  description: "Рассчитайте монтажную пену, паро-гидроизоляционные ленты (ПСУЛ/ИФУЛ), откосы и подоконник для установки пластиковых окон по ГОСТ.",
  metaTitle: "Калькулятор установки окон | ПВХ окна — Мастерок",
  metaDescription: "Бесплатный калькулятор установки пластиковых окон: ПСУЛ, монтажная пена, ИФУЛ, пластиковые откосы, подоконник — расчёт по ГОСТ 30971.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["установка окон", "ПВХ окна", "ПСУЛ", "монтажная пена", "откосы", "ГОСТ 30971"],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "windowCount",
      label: "Количество окон",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 5,
    },
    {
      key: "windowWidth",
      label: "Ширина окна",
      type: "select",
      defaultValue: 1200,
      options: [
        { value: 600, label: "600 мм (маленькое)" },
        { value: 900, label: "900 мм" },
        { value: 1200, label: "1200 мм (стандарт)" },
        { value: 1500, label: "1500 мм" },
        { value: 1800, label: "1800 мм (большое)" },
        { value: 2100, label: "2100 мм (двустворчатое широкое)" },
      ],
    },
    {
      key: "windowHeight",
      label: "Высота окна",
      type: "select",
      defaultValue: 1400,
      options: [
        { value: 900, label: "900 мм (маленькое)" },
        { value: 1200, label: "1200 мм" },
        { value: 1400, label: "1400 мм (стандарт)" },
        { value: 1600, label: "1600 мм" },
        { value: 2000, label: "2000 мм (высокое)" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина стены",
      type: "select",
      defaultValue: 500,
      options: [
        { value: 200, label: "200 мм (тонкая стена, гипсокартон)" },
        { value: 300, label: "300 мм" },
        { value: 380, label: "380 мм (кирпич в 1.5 кирпича)" },
        { value: 500, label: "500 мм (кирпич в 2 кирпича)" },
        { value: 600, label: "600 мм (газобетон утеплённый)" },
      ],
    },
    {
      key: "slopeType",
      label: "Тип откосов",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пластиковые сэндвич-панели (стандарт)" },
        { value: 1, label: "Штукатурные (тонкий слой)" },
        { value: 2, label: "Без откосов" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const windowCount = Math.max(1, Math.round(inputs.windowCount ?? 5));
    const windowWidthMm = inputs.windowWidth ?? 1200;
    const windowHeightMm = inputs.windowHeight ?? 1400;
    const wallThicknessMm = inputs.wallThickness ?? 500;
    const slopeType = Math.round(inputs.slopeType ?? 0);

    const windowWidthM = windowWidthMm / 1000;
    const windowHeightM = windowHeightMm / 1000;
    const wallThicknessM = wallThicknessMm / 1000;

    // Периметр одного окна
    const perimeterM = 2 * (windowWidthM + windowHeightM);

    const warnings: string[] = [];
    const materials = [];

    // ПСУЛ (предварительно сжатая уплотнительная лента)
    // Наружный контур окна + небольшой запас
    const psulLengthPerWindow = perimeterM * 1.1;
    const psulRollLength = 5.6; // рулон 5.6 м (ширина 30 мм, различные ПСУЛ)
    const psulRolls = Math.ceil(psulLengthPerWindow * windowCount / psulRollLength);
    materials.push({
      name: "ПСУЛ лента (предварительно сжатая, рулон 5.6 м)",
      quantity: psulLengthPerWindow * windowCount / psulRollLength,
      unit: "рулонов",
      withReserve: psulRolls,
      purchaseQty: psulRolls,
      category: "Изоляция",
    });

    // Монтажная пена
    // ~1 баллон на 1 м.п. периметра (при зазоре 30 мм)
    const foamPerWindow = perimeterM / 3; // ~1/3 баллона на м.п.
    const foamCans = Math.ceil(foamPerWindow * windowCount * 1.1);
    materials.push({
      name: "Монтажная пена профессиональная (баллон 750 мл)",
      quantity: foamPerWindow * windowCount,
      unit: "баллонов",
      withReserve: foamCans,
      purchaseQty: foamCans,
      category: "Изоляция",
    });

    // ИФУЛ (изоляционная лента внутреннего контура)
    const iflulRollLength = 8.5; // рулон 8.5 м (пароизоляционная)
    const iflulLengthPerWindow = perimeterM * 1.1;
    const iflulRolls = Math.ceil(iflulLengthPerWindow * windowCount / iflulRollLength);
    materials.push({
      name: "ИФУЛ лента пароизоляционная (рулон 8.5 м)",
      quantity: iflulLengthPerWindow * windowCount / iflulRollLength,
      unit: "рулонов",
      withReserve: iflulRolls,
      purchaseQty: iflulRolls,
      category: "Изоляция",
    });

    // Анкерные пластины или дюбели
    const anchorsPerWindow = Math.ceil(perimeterM / 0.7); // каждые 700 мм
    const totalAnchors = Math.ceil(anchorsPerWindow * windowCount * 1.05);
    materials.push({
      name: "Анкерная пластина (монтажная) L=130 мм",
      quantity: anchorsPerWindow * windowCount,
      unit: "шт",
      withReserve: totalAnchors,
      purchaseQty: totalAnchors,
      category: "Крепёж",
    });

    // Шурупы для анкерных пластин
    const screwsCount = Math.ceil(totalAnchors * 2 * 1.05);
    materials.push({
      name: "Шуруп 5×80 мм для крепления к стене",
      quantity: totalAnchors * 2,
      unit: "шт",
      withReserve: screwsCount,
      purchaseQty: screwsCount,
      category: "Крепёж",
    });

    // Подоконник
    const windowsillWidth = wallThicknessM + 0.15; // 150 мм выступ внутри
    const windowsillWidthCm = Math.ceil(windowsillWidth * 100 / 5) * 5; // округл. до 5 см
    const windowsillLengthM = (windowWidthM + 0.1) * windowCount; // +10 см на зарезку
    const windowsillPcs = Math.ceil(windowsillLengthM / 6); // продаётся по 6 м
    materials.push({
      name: `Подоконник ПВХ ширина ${windowsillWidthCm} см (плита 6 м)`,
      quantity: windowsillLengthM / 6,
      unit: "плит (6 м)",
      withReserve: windowsillPcs,
      purchaseQty: windowsillPcs,
      category: "Подоконник",
    });

    // Монтажная пена для подоконника
    const sillFoamCans = Math.ceil(windowCount * 0.5);
    materials.push({
      name: "Монтажная пена под подоконник (баллон 500 мл)",
      quantity: windowCount * 0.5,
      unit: "баллонов",
      withReserve: sillFoamCans,
      purchaseQty: sillFoamCans,
      category: "Подоконник",
    });

    // Откосы
    if (slopeType === 0) {
      // Пластиковые сэндвич-панели
      // Откос: 2 боковых + 1 верхний, ширина = толщина стены
      const slopeSideArea = 2 * windowHeightM * wallThicknessM;
      const slopeTopArea = windowWidthM * wallThicknessM;
      const totalSlopeArea = (slopeSideArea + slopeTopArea) * windowCount;
      const sandwichPanelArea = 1200 * 3000 / 1e6; // 3.6 м²
      const sandwichPcs = Math.ceil(totalSlopeArea * 1.1 / sandwichPanelArea);

      materials.push({
        name: `Сэндвич-панель ПВХ ${wallThicknessMm} мм (1200×3000 мм)`,
        quantity: totalSlopeArea * 1.1 / sandwichPanelArea,
        unit: "листов",
        withReserve: sandwichPcs,
        purchaseQty: sandwichPcs,
        category: "Откосы",
      });

      // F-образный профиль обрамления
      const fProfileLength = perimeterM * 0.75 * windowCount * 1.1; // 3 стороны
      const fProfilePcs = Math.ceil(fProfileLength / 3);
      materials.push({
        name: "F-профиль ПВХ 3 м (обрамление откосов)",
        quantity: fProfileLength / 3,
        unit: "шт",
        withReserve: fProfilePcs,
        purchaseQty: fProfilePcs,
        category: "Откосы",
      });

    } else if (slopeType === 1) {
      // Штукатурные откосы
      const slopeArea = (2 * windowHeightM + windowWidthM) * 0.4 * windowCount; // ширина откоса ~400 мм
      const plasterKg = slopeArea * 10; // ~10 кг/м² (2 слоя)
      const plasterBags = Math.ceil(plasterKg / 25);
      materials.push({
        name: "Штукатурная смесь для откосов (мешок 25 кг)",
        quantity: plasterKg / 25,
        unit: "мешков",
        withReserve: plasterBags,
        purchaseQty: plasterBags,
        category: "Откосы",
      });

      const cornerProfile = (2 * windowHeightM + windowWidthM) * windowCount * 1.1;
      const cornerPcs = Math.ceil(cornerProfile / 3);
      materials.push({
        name: "Уголок перфорированный штукатурный 3 м",
        quantity: cornerProfile / 3,
        unit: "шт",
        withReserve: cornerPcs,
        purchaseQty: cornerPcs,
        category: "Откосы",
      });
    }

    warnings.push("ПСУЛ наклеивается на раму ДО установки окна в проём — после монтажа нанести невозможно");
    if (wallThicknessMm > 500) {
      warnings.push("Толстые стены требуют усиленного крепления оконной рамы — проверьте несущую способность анкеров в конкретном материале стены");
    }

    return {
      materials,
      totals: {
        windowCount,
        totalPerimeter: perimeterM * windowCount,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт по ГОСТ 30971 (монтажный шов):**
- ПСУЛ: периметр × 1.1 (рулон 5.6 м)
- Пена: ~1/3 баллона/м.п. периметра
- ИФУЛ: периметр × 1.1 (рулон 8.5 м)
- Анкеры: каждые 700 мм по периметру
  `,
  howToUse: [
    "Введите количество и размеры окон",
    "Укажите толщину стены",
    "Выберите тип откосов",
    "Нажмите «Рассчитать»",
  ],
};
