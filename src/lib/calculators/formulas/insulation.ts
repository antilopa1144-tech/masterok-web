import type { CalculatorDefinition } from "../types";

export const insulationDef: CalculatorDefinition = {
  id: "insulation",
  slug: "uteplenie",
  title: "Калькулятор утеплителя",
  h1: "Калькулятор утеплителя онлайн — расчёт минваты и пеноплекса",
  description: "Рассчитайте количество утеплителя (минеральная вата, пеноплекс, ППС) для стен, кровли или пола.",
  metaTitle: "Калькулятор утеплителя онлайн | Расчёт минваты и пеноплекса — Мастерок",
  metaDescription: "Бесплатный калькулятор утеплителя: рассчитайте количество минваты, пеноплекса или пенопласта с учётом площади, толщины и запаса.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["утеплитель", "минвата", "пеноплекс", "пенопласт", "утепление", "теплоизоляция"],
  popularity: 68,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь утепления",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минеральная вата (плиты)" },
        { value: 1, label: "Пеноплекс/ЭППС (плиты)" },
        { value: 2, label: "Пенопласт ППС (плиты)" },
        { value: 3, label: "Эковата (напыление)" },
      ],
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм" },
        { value: 80, label: "80 мм" },
        { value: 100, label: "100 мм (рекомендуется)" },
        { value: 150, label: "150 мм" },
        { value: 200, label: "200 мм" },
      ],
    },
    {
      key: "plateSize",
      label: "Размер плиты",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×600 мм (Rockwool, Knauf)" },
        { value: 1, label: "1000×500 мм (Технониколь)" },
        { value: 2, label: "2000×1000 мм (пеноплекс стандарт)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 50);
    const type = Math.round(inputs.insulationType ?? 0);
    const thickness = inputs.thickness ?? 100;
    const sizeOption = Math.round(inputs.plateSize ?? 0);

    const plateSizes: Record<number, [number, number]> = {
      0: [1.2, 0.6],   // 1200×600 = 0.72 м²
      1: [1.0, 0.5],   // 1000×500 = 0.5 м²
      2: [2.0, 1.0],   // 2000×1000 = 2.0 м²
    };
    const [pw, ph] = plateSizes[sizeOption] ?? [1.2, 0.6];
    const plateArea = pw * ph;

    const warnings: string[] = [];

    if (type === 3) {
      // Эковата
      const density = 35; // кг/м³
      const volume = area * (thickness / 1000);
      const ecoWoolKg = Math.ceil(volume * density * 1.1);
      warnings.push("Эковата требует профессионального оборудования для напыления");
      return {
        materials: [
          { name: "Эковата (мешки 15 кг)", quantity: ecoWoolKg / 15, unit: "мешков", withReserve: Math.ceil(ecoWoolKg / 15), purchaseQty: Math.ceil(ecoWoolKg / 15), category: "Основное" },
        ],
        totals: { area, thickness, volume, ecoWoolKg },
        warnings,
      };
    }

    const areaWithReserve = area * 1.05;
    const platesNeeded = Math.ceil(areaWithReserve / plateArea);

    // Дюбели для крепления: 5–8 шт/м² в зависимости от типа
    const dowelsPerSqm: Record<number, number> = { 0: 7, 1: 5, 2: 6 };
    const dowels = Math.ceil(area * (dowelsPerSqm[type] ?? 6) * 1.05);

    const materials = [
      {
        name: `${["Минвата", "Пеноплекс", "Пенопласт ППС"][type]} ${thickness} мм`,
        quantity: area / plateArea,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Основное",
      },
      {
        name: "Дюбели-зонтики (тарельчатые)",
        quantity: dowels,
        unit: "шт",
        withReserve: dowels,
        purchaseQty: Math.ceil(dowels / 100) * 100,
        category: "Крепёж",
      },
    ];

    if (type === 0) {
      // Минвата: нужна гидроветрозащитная мембрана и пароизоляция
      const membraneArea = Math.ceil(area * 1.15);
      materials.push({
        name: "Гидроветрозащитная мембрана",
        quantity: area,
        unit: "м²",
        withReserve: membraneArea,
        purchaseQty: Math.ceil(membraneArea / 50),
        category: "Мембрана",
      });
      warnings.push("Минвата требует гидро- и ветрозащитной мембраны с внешней стороны");
    }

    if (type >= 1) {
      // ЭППС/ППС: нужен клей-пена или клей на цементной основе
      const glueKg = area * 2.5; // ~2.5 кг/м²
      const glueBags = Math.ceil(glueKg / 25);
      materials.push({
        name: "Клей для пенополистирола (мешки 25 кг)",
        quantity: glueKg / 25,
        unit: "мешков",
        withReserve: glueBags,
        purchaseQty: glueBags,
        category: "Клей",
      });
    }

    // Грунтовка для основания перед утеплением
    const primerLiters = area * 0.15 * 1.15; // 150 мл/м², запас 15%
    const primerCans = Math.ceil(primerLiters / 10); // канистра 10 л
    materials.push({
      name: "Грунтовка для основания (канистра 10 л, ~150 мл/м²)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Подготовка",
    });

    // Скотч алюминиевый для стыков фольгированного утеплителя (если минвата с фольгой)
    if (type === 0) {
      const jointLengthEstimate = area * 2; // примерная длина стыков, м
      const aluTapeRolls = Math.ceil(jointLengthEstimate / 50); // 1 рулон = 50 м
      materials.push({
        name: "Скотч алюминиевый для стыков утеплителя (рулон 50 м)",
        quantity: jointLengthEstimate / 50,
        unit: "рулонов",
        withReserve: aluTapeRolls,
        purchaseQty: aluTapeRolls,
        category: "Монтаж",
      });
    }

    return {
      materials,
      totals: { area, thickness, platesNeeded, plateArea },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт утеплителя:**
Плит = ⌈Площадь × 1.05 / Площадь_плиты⌉

Стандартные размеры плит:
- Минвата Knauf/Rockwool: 1200×600 мм = 0.72 м²
- Пеноплекс: 1200×600 или 2000×1000 мм
- Пенопласт ППС: 1000×500 мм = 0.5 м²

Нормы крепления: 5–8 дюблей-зонтиков на 1 м²
Запас 5% на подрезку
  `,
  howToUse: [
    "Введите площадь утепляемой поверхности",
    "Выберите тип утеплителя",
    "Укажите толщину (для большинства регионов России — 100–150 мм)",
    "Выберите размер плиты (указан на упаковке)",
    "Нажмите «Рассчитать» — получите плиты, дюбели и сопутствующие материалы",
  ],
};
