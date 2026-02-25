import type { CalculatorDefinition } from "../types";

export const ceilingInsulationDef: CalculatorDefinition = {
  id: "ceilings_insulation",
  slug: "uteplenie-potolka",
  title: "Калькулятор утепления потолка",
  h1: "Калькулятор утепления потолка — расчёт минваты и ЭППС",
  description: "Рассчитайте количество утеплителя (минеральная вата или ЭППС), пароизоляции и крепежа для утепления потолка.",
  metaTitle: "Калькулятор утепления потолка | Минвата, ЭППС — Мастерок",
  metaDescription: "Бесплатный калькулятор утепления потолка: рассчитайте минвату, пенополистирол, пароизоляцию по площади и толщине слоя.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["утепление потолка", "минвата", "ЭППС", "теплоизоляция потолка", "Knauf"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм" },
        { value: 100, label: "100 мм (рекомендуется)" },
        { value: 150, label: "150 мм (усиленное)" },
        { value: 200, label: "200 мм (холодный чердак)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минеральная вата (плиты)" },
        { value: 1, label: "Минеральная вата (рулон)" },
        { value: 2, label: "ЭППС (пенополистирол)" },
        { value: 3, label: "Эковата (насыпная)" },
      ],
    },
    {
      key: "layers",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя (со смещением стыков)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 30);
    const thickness = inputs.thickness ?? 100; // мм
    const insulationType = Math.round(inputs.insulationType ?? 0);
    const layers = Math.round(inputs.layers ?? 1);

    // Запас +5% на подрезку
    const areaWithReserve = area * 1.05;

    const warnings: string[] = [];
    const materials = [];

    if (insulationType === 0) {
      // Минвата плиты (1200×600 мм, пачка = 6 м²)
      const packArea = 6.0; // м² в пачке (100 мм)
      const packsNeeded = Math.ceil(areaWithReserve / packArea) * layers;
      materials.push({
        name: `Минвата плиты ${thickness} мм (пачка ≈6 м²)`,
        quantity: areaWithReserve / packArea,
        unit: "пачек",
        withReserve: packsNeeded,
        purchaseQty: packsNeeded,
        category: "Утеплитель",
      });
    } else if (insulationType === 1) {
      // Минвата рулон (9 м²/рулон для 50 мм, 5 м²/рулон для 100 мм)
      const rollArea = thickness <= 50 ? 9 : 5;
      const rollsNeeded = Math.ceil(areaWithReserve * layers / rollArea);
      materials.push({
        name: `Минвата рулон ${thickness} мм (≈${rollArea} м²/рулон)`,
        quantity: areaWithReserve * layers / rollArea,
        unit: "рулонов",
        withReserve: rollsNeeded,
        purchaseQty: rollsNeeded,
        category: "Утеплитель",
      });
    } else if (insulationType === 2) {
      // ЭППС плиты 1200×600 мм
      const plateArea = 0.72; // 1 плита = 1.2×0.6
      const platesNeeded = Math.ceil(areaWithReserve * layers / plateArea);
      materials.push({
        name: `ЭППС ${thickness} мм (плита 1200×600 мм)`,
        quantity: areaWithReserve * layers / plateArea,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Утеплитель",
      });
      if (thickness < 100) {
        warnings.push("ЭППС менее 100 мм не рекомендуется для жилых помещений — рассмотрите 100 мм");
      }
    } else {
      // Эковата: расход ~35 кг/м³
      const density = 35; // кг/м³
      const volume = area * (thickness / 1000) * layers;
      const kgNeeded = volume * density;
      const bagsNeeded = Math.ceil(kgNeeded / 15); // 15 кг/мешок
      materials.push({
        name: "Эковата (мешок 15 кг)",
        quantity: kgNeeded / 15,
        unit: "мешков",
        withReserve: bagsNeeded,
        purchaseQty: bagsNeeded,
        category: "Утеплитель",
      });
      warnings.push("Эковата требует специального оборудования для задувки — наём подрядчика");
    }

    // Пароизоляция (только для минваты)
    if (insulationType <= 1) {
      const paroRolls = Math.ceil(area * 1.15 / 50); // рулон 50 м², нахлёст 15%
      materials.push({
        name: "Пароизоляция (плёнка, рулон 50 м²)",
        quantity: area * 1.15 / 50,
        unit: "рулонов",
        withReserve: paroRolls,
        purchaseQty: paroRolls,
        category: "Изоляция",
      });
      materials.push({
        name: "Лента бутиловая для проклейки стыков",
        quantity: Math.ceil(area / 50) * 10,
        unit: "м.п.",
        withReserve: Math.ceil(area / 50) * 12,
        purchaseQty: Math.ceil(area / 50) * 12,
        category: "Изоляция",
      });
      warnings.push("Пароизоляция монтируется с тёплой стороны утеплителя (под потолком жилого помещения)");
    }

    if (insulationType === 2) {
      warnings.push("ЭППС не паропроницаем — пароизоляция не требуется, но обеспечьте вентиляцию чердака");
    }

    return {
      materials,
      totals: { area, thickness } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт утеплителя для потолка:**
- Минвата плиты (100 мм): ~1 пачка/6 м²
- Минвата рулон (100 мм): ~1 рулон/5 м²
- ЭППС (1200×600 мм): ⌈Площадь × 1.05 / 0.72⌉ плит
- Пароизоляция: площадь × 1.15 (нахлёст 15 см)
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите толщину утеплителя",
    "Выберите тип утеплителя",
    "Нажмите «Рассчитать»",
  ],
};
