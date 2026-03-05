import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const stairsDef: CalculatorDefinition = {
  id: "stairs",
  slug: "kalkulyator-lestnicy",
  title: "Калькулятор лестницы",
  h1: "Калькулятор лестницы онлайн — расчёт ступеней и материалов",
  description: "Рассчитайте количество ступеней, длину пролёта и материалы для деревянной, бетонной или металлической лестницы.",
  metaTitle: "Калькулятор лестницы | Расчёт ступеней, материалов — Мастерок",
  metaDescription: "Бесплатный калькулятор лестницы: рассчитайте количество ступеней, косоуры, перила и доски по высоте и ширине пролёта.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["лестница", "ступени", "косоур", "расчёт лестницы", "деревянная лестница"],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "floorHeight",
      label: "Высота этажа (подъём лестницы)",
      type: "slider",
      unit: "м",
      min: 2.0,
      max: 6.0,
      step: 0.1,
      defaultValue: 2.8,
    },
    {
      key: "stepHeight",
      label: "Высота ступени",
      type: "select",
      defaultValue: 170,
      options: [
        { value: 150, label: "150 мм (пологая, удобная)" },
        { value: 170, label: "170 мм (стандарт жилой)" },
        { value: 180, label: "180 мм" },
        { value: 200, label: "200 мм (крутая)" },
      ],
    },
    {
      key: "stepWidth",
      label: "Ширина ступени (проступь)",
      type: "select",
      defaultValue: 280,
      options: [
        { value: 250, label: "250 мм" },
        { value: 280, label: "280 мм (стандарт)" },
        { value: 300, label: "300 мм (комфорт)" },
        { value: 320, label: "320 мм (широкая)" },
      ],
    },
    {
      key: "stairWidth",
      label: "Ширина лестницы",
      type: "slider",
      unit: "м",
      min: 0.6,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
    },
    {
      key: "materialType",
      label: "Материал",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Дерево (сосна/лиственница)" },
        { value: 1, label: "Бетонная монолитная" },
        { value: 2, label: "Металлический каркас + дерево" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const floorHeight = Math.max(2.0, inputs.floorHeight ?? 2.8);
    const stepHeightMm = inputs.stepHeight ?? 170;
    const stepWidthMm = inputs.stepWidth ?? 280;
    const stairWidth = Math.max(0.6, inputs.stairWidth ?? 1.0);
    const materialType = Math.round(inputs.materialType ?? 0);

    const stepHeightM = stepHeightMm / 1000;
    const stepWidthM = stepWidthMm / 1000;

    // Количество ступеней
    const stepCount = Math.round(floorHeight / stepHeightM);
    // Реальная высота ступени после округления
    const realStepHeight = floorHeight / stepCount;
    // Горизонтальная проекция лестницы
    const horizontalLength = (stepCount - 1) * stepWidthM; // последняя ступень — это пол верхнего этажа
    // Длина косоура
    const stringerLength = Math.sqrt(floorHeight * floorHeight + horizontalLength * horizontalLength);

    const warnings: string[] = [];
    const materials = [];

    if (stepHeightMm > 190) {
      warnings.push(`Высота ступени ${stepHeightMm} мм превышает рекомендуемые 170–190 мм (ГОСТ 23120)`);
    }
    if (stepWidthMm < 250) {
      warnings.push("Ширина проступи менее 250 мм — неудобна для ходьбы (минимум по ГОСТ 23120: 250 мм)");
    }
    if (stairWidth < 0.9) {
      warnings.push("Ширина лестницы для жилых домов — не менее 0.9 м (СП 54.13330)");
    }

    if (materialType === 0) {
      // Дерево: косоуры, ступени, подступенки
      const stringerPcs = 2; // 2 косоура
      // Косоур: доска 50×250 мм, длина = stringerLength + запас
      const stringerBoard = Math.ceil(stringerLength * 1.1) * stringerPcs;

      materials.push({
        name: `Косоур доска 50×250 мм (длина ${stringerLength.toFixed(2)} м)`,
        quantity: stringerBoard,
        unit: "м.п.",
        withReserve: Math.ceil(stringerBoard * 1.1),
        purchaseQty: Math.ceil(stringerBoard * 1.1),
        category: "Несущие",
      });

      // Ступени: доска 40×300 мм (или 36×300)
      const treadPcs = stepCount;
      const treadLength = stairWidth + 0.05; // небольшой навес
      materials.push({
        name: `Проступь (ступень) доска 40×${stepWidthMm} мм × ${treadLength.toFixed(2)} м`,
        quantity: treadPcs,
        unit: "шт",
        withReserve: Math.ceil(treadPcs * 1.05),
        purchaseQty: Math.ceil(treadPcs * 1.05),
        category: "Ступени",
      });

      // Подступенки: доска 20×170 мм
      materials.push({
        name: `Подступенок доска 20×${stepHeightMm} мм × ${stairWidth.toFixed(2)} м`,
        quantity: stepCount,
        unit: "шт",
        withReserve: Math.ceil(stepCount * 1.05),
        purchaseQty: Math.ceil(stepCount * 1.05),
        category: "Ступени",
      });

    } else if (materialType === 1) {
      // Бетонная лестница
      const volume = (stairWidth * stepWidthM * stepHeightM / 2) * stepCount; // приближение
      materials.push({
        name: "Бетон М300 (В22.5)",
        quantity: volume,
        unit: "м³",
        withReserve: Math.ceil(volume * 1.1 * 10) / 10,
        purchaseQty: Math.ceil(volume * 1.1 * 10) / 10,
        category: "Бетон",
      });

      const rebarKg = stepCount * stairWidth * 10; // приближение
      materials.push({
        name: "Арматура А500С ∅12 мм",
        quantity: rebarKg / 1000,
        unit: "т",
        withReserve: Math.ceil(rebarKg * 1.1) / 1000,
        purchaseQty: Math.ceil(rebarKg * 1.1) / 1000,
        category: "Арматура",
      });

    } else {
      // Металлокаркас
      const channelLength = stringerLength * 2 + stepCount * stairWidth * 1.1;
      materials.push({
        name: "Швеллер 100×50 мм или профтруба 80×80 мм",
        quantity: channelLength,
        unit: "м.п.",
        withReserve: Math.ceil(channelLength * 1.1),
        purchaseQty: Math.ceil(channelLength * 1.1),
        category: "Каркас",
      });

      // Деревянные ступени на металл
      materials.push({
        name: `Ступень дубовая 40×${stepWidthMm} мм × ${stairWidth.toFixed(2)} м`,
        quantity: stepCount,
        unit: "шт",
        withReserve: Math.ceil(stepCount * 1.05),
        purchaseQty: Math.ceil(stepCount * 1.05),
        category: "Ступени",
      });
    }

    // Перила: по обеим сторонам = 2 × горизонтальная длина
    const railingLength = horizontalLength * 2;
    materials.push({
      name: "Поручень (перила)",
      quantity: railingLength,
      unit: "м.п.",
      withReserve: Math.ceil(railingLength * 1.05),
      purchaseQty: Math.ceil(railingLength * 1.05),
      category: "Ограждение",
    });

    // Балясины: через каждые 150 мм по длине
    const balyasiny = Math.ceil(railingLength / 0.15);
    materials.push({
      name: "Балясина",
      quantity: balyasiny,
      unit: "шт",
      withReserve: Math.ceil(balyasiny * 1.05),
      purchaseQty: Math.ceil(balyasiny * 1.05),
      category: "Ограждение",
    });

    // Крепёж
    if (materialType === 0) {
      // Дерево: саморезы + шурупы-глухари для косоуров
      const screws = stepCount * 8 + 20; // ~8 саморезов на ступень + крепление косоуров
      materials.push({
        name: "Саморезы по дереву 4.5×50 мм (уп. 200 шт)",
        quantity: screws / 200,
        unit: "упак.",
        withReserve: Math.max(1, Math.ceil(screws * 1.1 / 200)),
        purchaseQty: Math.max(1, Math.ceil(screws * 1.1 / 200)),
        category: "Крепёж",
      });
      // Лак / масло для дерева
      const woodArea = stepCount * stairWidth * 0.5 + stringerLength * 2 * 0.25; // ступени + косоуры
      const lacLiters = woodArea * 0.12 * 2; // 120 мл/м² × 2 слоя
      materials.push({
        name: "Лак для дерева / масло (0.75 л)",
        quantity: lacLiters / 0.75,
        unit: "банок",
        withReserve: Math.max(1, Math.ceil(lacLiters / 0.75)),
        purchaseQty: Math.max(1, Math.ceil(lacLiters / 0.75)),
        category: "Отделка",
      });
    } else if (materialType === 2) {
      // Металлокаркас: болты + саморезы для ступеней
      const bolts = stepCount * 4 + 8;
      materials.push({
        name: "Болты М8×60 + гайки + шайбы",
        quantity: bolts,
        unit: "шт",
        withReserve: Math.ceil(bolts * 1.1),
        purchaseQty: Math.ceil(bolts * 1.1),
        category: "Крепёж",
      });
    }

    const scenarios = buildNativeScenarios({
      id: "stairs-main",
      title: "Stairs main",
      exactNeed: stepCount,
      unit: "ступеней",
      packageSizes: [1],
      packageLabelPrefix: "stairs-step",
    });

    return {
      materials,
      totals: {
        stepCount,
        horizontalLength,
        stringerLength,
        realStepHeight: Math.round(realStepHeight * 1000) / 1000,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт лестницы:**
- Ступеней = округление(Высота / Высота ступени)
- Горизонтальный пролёт = Ступеней × Ширину проступи
- Длина косоура = √(H² + L²)
- Нормы ГОСТ 23120: ступень 150–200 мм, проступь ≥250 мм
  `,
  howToUse: [
    "Введите высоту этажа",
    "Выберите высоту ступени и ширину проступи",
    "Укажите ширину лестницы и материал",
    "Нажмите «Рассчитать»",
  ],
};
