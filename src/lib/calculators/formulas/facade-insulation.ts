import type { CalculatorDefinition } from "../types";

export const facadeInsulationDef: CalculatorDefinition = {
  id: "insulation_mineral_wool",
  slug: "uteplenie-fasada-minvatoj",
  title: "Калькулятор утепления фасада минватой",
  h1: "Калькулятор утепления фасада минватой — расчёт материалов",
  description: "Рассчитайте количество минеральной ваты, клея, дюбелей и штукатурки для утепления фасада по системе СФТК (мокрый фасад).",
  metaTitle: "Калькулятор утепления фасада минватой | СФТК — Мастерок",
  metaDescription: "Бесплатный калькулятор утепления фасада: минвата ROCKWOOL/KNAUF, клей, дюбели-грибки, армосетка, грунтовка, штукатурка для мокрого фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["утепление фасада", "минвата", "мокрый фасад", "СФТК", "ROCKWOOL"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь фасада (за вычетом проёмов)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 2000,
      step: 5,
      defaultValue: 100,
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм (Московская обл., тёплые регионы)" },
        { value: 80, label: "80 мм" },
        { value: 100, label: "100 мм (рекомендуется)" },
        { value: 120, label: "120 мм" },
        { value: 150, label: "150 мм (Сибирь, Урал)" },
        { value: 200, label: "200 мм (крайний север)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минвата фасадная (ROCKWOOL Fasrock, KNAUF)" },
        { value: 1, label: "ЭППС (пенополистирол, для нежилых зданий)" },
      ],
    },
    {
      key: "finishType",
      label: "Финишный слой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Декоративная штукатурка «короед»" },
        { value: 1, label: "Декоративная штукатурка «шуба»" },
        { value: 2, label: "Под покраску (тонкий слой)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(10, inputs.area ?? 100);
    const thickness = inputs.thickness ?? 100;
    const insulationType = Math.round(inputs.insulationType ?? 0);
    const finishType = Math.round(inputs.finishType ?? 0);

    const warnings: string[] = [];
    const materials = [];

    // Утеплитель
    const areaWithReserve = area * 1.05;

    if (insulationType === 0) {
      // Минвата фасадная, плиты 600×1200 мм = 0.72 м²
      const platesNeeded = Math.ceil(areaWithReserve / 0.72);
      materials.push({
        name: `Минвата фасадная ${thickness} мм (плита 600×1200 мм, 0.72 м²)`,
        quantity: areaWithReserve / 0.72,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Утеплитель",
      });
    } else {
      // ЭППС плиты 1200×600 мм = 0.72 м²
      const platesNeeded = Math.ceil(areaWithReserve / 0.72);
      materials.push({
        name: `ЭППС ${thickness} мм (плита 1200×600 мм, 0.72 м²)`,
        quantity: areaWithReserve / 0.72,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Утеплитель",
      });
      warnings.push("ЭППС на фасаде не рекомендуется для жилых зданий — допустим только минвата (требование пожарных норм СП 2.13130)");
    }

    // Клей-пена или сухая клеевая смесь для минваты
    // Расход клея: 4 кг/м² (смесь Ceresit CT 180, Weber.Therm)
    const glueConsumption = insulationType === 0 ? 4 : 5; // кг/м²
    const totalGlueKg = area * glueConsumption;
    const glueBags = Math.ceil(totalGlueKg / 25);
    materials.push({
      name: `Клей для утеплителя (мешок 25 кг, расход ~${glueConsumption} кг/м²)`,
      quantity: totalGlueKg / 25,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Клей",
    });

    // Дюбели-грибки TERMOCLIP 10×(100+thickness) мм
    // 5–6 шт/м² для минваты, 4 шт/м² для ЭППС
    const dubelsPerM2 = insulationType === 0 ? 6 : 4;
    const dubelsTotal = Math.ceil(area * dubelsPerM2 * 1.05);
    materials.push({
      name: `Дюбель-грибок фасадный TERMOCLIP 10×${thickness + 60} мм`,
      quantity: area * dubelsPerM2,
      unit: "шт",
      withReserve: dubelsTotal,
      purchaseQty: dubelsTotal,
      category: "Крепёж",
    });

    // Базовый штукатурный слой + армосетка
    // Армосетка стеклотканевая 145 г/м², рулон 50 м²
    const meshArea = area * 1.15; // нахлёст 15%
    const meshRolls = Math.ceil(meshArea / 50);
    materials.push({
      name: "Сетка фасадная стеклотканевая 145 г/м² (рулон 50 м²)",
      quantity: meshArea / 50,
      unit: "рулонов",
      withReserve: meshRolls,
      purchaseQty: meshRolls,
      category: "Армирование",
    });

    // Клеевой состав для армировки (Ceresit CT 85, Weber.Therm Armat) ~4 кг/м²
    const armKg = area * 4;
    const armBags = Math.ceil(armKg / 25);
    materials.push({
      name: "Штукатурно-клеевой состав для армировки (мешок 25 кг, ~4 кг/м²)",
      quantity: armKg / 25,
      unit: "мешков",
      withReserve: armBags,
      purchaseQty: armBags,
      category: "Армирование",
    });

    // Грунтовка (Ceresit CT 16 или аналог) — 1 л на 4 м²
    const primerLiters = area / 4 * 1.1;
    const primerCans = Math.ceil(primerLiters / 10); // канистра 10 л
    materials.push({
      name: "Грунтовка адгезионная (канистра 10 л, ~0.25 л/м²)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    });

    // Декоративная штукатурка
    let plasterConsumption: number; // кг/м²
    let plasterName: string;
    switch (finishType) {
      case 0: plasterConsumption = 3.5; plasterName = "Декоративная штукатурка «короед» (мешок 25 кг, ~3.5 кг/м²)"; break;
      case 1: plasterConsumption = 4.5; plasterName = "Декоративная штукатурка «шуба» (мешок 25 кг, ~4.5 кг/м²)"; break;
      default: plasterConsumption = 2.5; plasterName = "Финишная штукатурка под покраску (мешок 25 кг, ~2.5 кг/м²)"; break;
    }
    const plasterKg = area * plasterConsumption;
    const plasterBags = Math.ceil(plasterKg / 25);
    materials.push({
      name: plasterName,
      quantity: plasterKg / 25,
      unit: "мешков",
      withReserve: plasterBags,
      purchaseQty: plasterBags,
      category: "Штукатурка",
    });

    // Профиль цокольный (стартовый) — погонные метры по периметру
    // Предполагаем периметр ≈ √(area) × 4 (упрощение)
    const perimeter = Math.sqrt(area) * 4;
    const profileLength = perimeter * 1.05;
    const profilePcs = Math.ceil(profileLength / 2); // профили по 2 м
    materials.push({
      name: "Профиль цокольный стартовый 2 м",
      quantity: profileLength / 2,
      unit: "шт",
      withReserve: profilePcs,
      purchaseQty: profilePcs,
      category: "Комплектующие",
    });

    if (thickness < 100) {
      warnings.push(`Толщина ${thickness} мм может не обеспечить нормативное сопротивление теплопередаче для жилых зданий — проверьте теплотехнический расчёт`);
    }
    if (area > 500) {
      warnings.push("При площади >500 м² рекомендуется разбить фасад на захватки и использовать леса с допуском нагрузки");
    }

    return {
      materials,
      totals: { area, thickness } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт материалов для мокрого фасада (СФТК):**
- Утеплитель: площадь × 1.05 / 0.72 м² (плита 600×1200)
- Клей: ~4 кг/м² (мешки 25 кг)
- Дюбели-грибки: 6 шт/м² (минвата), 4 шт/м² (ЭППС)
- Армосетка: площадь × 1.15 (нахлёст)
- Штукатурка «короед»: ~3.5 кг/м²
  `,
  howToUse: [
    "Введите площадь фасада (без окон и дверей)",
    "Выберите толщину утеплителя",
    "Выберите тип утеплителя и финишный слой",
    "Нажмите «Рассчитать»",
  ],
};
