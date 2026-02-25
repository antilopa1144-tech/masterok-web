import type { CalculatorDefinition } from "../types";

export const decorPlasterDef: CalculatorDefinition = {
  id: "walls_decor_plaster",
  slug: "dekorativnaya-shtukaturka",
  title: "Калькулятор декоративной штукатурки",
  h1: "Калькулятор декоративной штукатурки онлайн — расчёт расхода",
  description: "Рассчитайте количество декоративной штукатурки (короед, шуба, камешковая, венецианская) по площади стен.",
  metaTitle: "Калькулятор декоративной штукатурки | Расчёт Ceresit, Baumit — Мастерок",
  metaDescription: "Бесплатный калькулятор декоративной штукатурки: рассчитайте расход короеда, камешковой, венецианской штукатурки Ceresit, Baumit по площади.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["декоративная штукатурка", "короед", "камешковая", "венецианская", "Ceresit", "Baumit"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "textureType",
      label: "Тип фактуры",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Короед (зерно 2 мм)" },
        { value: 1, label: "Короед (зерно 3 мм)" },
        { value: 2, label: "Камешковая (зерно 2.5 мм)" },
        { value: 3, label: "Шуба (роллерная)" },
        { value: 4, label: "Венецианская (тонкий слой)" },
      ],
    },
    {
      key: "surface",
      label: "Поверхность",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Фасад (наружная)" },
        { value: 1, label: "Интерьер (внутренняя)" },
      ],
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 25,
      options: [
        { value: 15, label: "15 кг (пластиковое ведро)" },
        { value: 25, label: "25 кг (мешок)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 50);
    const textureType = Math.round(inputs.textureType ?? 0);
    const surface = Math.round(inputs.surface ?? 0);
    const bagWeight = inputs.bagWeight ?? 25;

    // Расход кг/м² по типу фактуры
    const consumption: Record<number, number> = {
      0: 2.5,  // короед 2 мм
      1: 3.5,  // короед 3 мм
      2: 3.0,  // камешковая 2.5 мм
      3: 4.0,  // шуба
      4: 1.2,  // венецианская (2 слоя по 0.6)
    };
    const kgPerSqm = consumption[textureType] ?? 2.5;
    const totalKg = area * kgPerSqm * 1.05;
    const bags = Math.ceil(totalKg / bagWeight);

    // Грунтовка-краска под декоративную (окрашенная): совпадает по тону
    const primerCans = Math.ceil(area * 0.15 / 5);

    // Для венецианской: финишный воск
    const waxCans = textureType === 4 ? Math.ceil(area * 0.1 / 1) : 0;

    const warnings: string[] = [];
    if (surface === 0 && textureType === 4) {
      warnings.push("Венецианская штукатурка не предназначена для фасадов — используйте только внутри");
    }
    if (surface === 0) {
      warnings.push("Для фасада используйте акриловую или силиконовую декоративную штукатурку с защитой от UV");
    }

    const textureNames = ["Короед (зерно 2 мм)", "Короед (зерно 3 мм)", "Камешковая 2.5 мм", "Шуба", "Венецианская"];

    // Грунтовка глубокого проникновения для основания (200 мл/м²)
    const deepPrimerLiters = area * 0.2 * 1.15; // 200 мл/м², запас 15%
    const deepPrimerCans = Math.ceil(deepPrimerLiters / 10); // канистра 10 л

    // Колер (пигмент) — 1 банка на каждые 25 кг смеси
    const colorBanks = Math.ceil(totalKg / 25);

    return {
      materials: [
        {
          name: `${textureNames[textureType] ?? textureNames[0]} (${bagWeight} кг)`,
          quantity: totalKg / bagWeight,
          unit: bagWeight === 15 ? "вёдер" : "мешков",
          withReserve: bags,
          purchaseQty: bags,
          category: "Основное",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л, ~200 мл/м²)",
          quantity: deepPrimerLiters / 10,
          unit: "канистр",
          withReserve: deepPrimerCans,
          purchaseQty: deepPrimerCans,
          category: "Подготовка",
        },
        {
          name: "Грунтовка тонированная под штукатурку (5 л)",
          quantity: area * 0.15 / 5,
          unit: "шт",
          withReserve: primerCans,
          purchaseQty: primerCans,
          category: "Подготовка",
        },
        {
          name: "Колер (пигмент) — 1 банка на 25 кг смеси",
          quantity: colorBanks,
          unit: "банок",
          withReserve: colorBanks,
          purchaseQty: colorBanks,
          category: "Колеровка",
        },
        ...(textureType === 4 && waxCans > 0 ? [{
          name: "Воск финишный для венецианской (1 л)",
          quantity: waxCans,
          unit: "шт",
          withReserve: waxCans,
          purchaseQty: waxCans,
          category: "Финиш",
        }] : []),
      ],
      totals: { area, kgPerSqm, totalKg } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расход декоративной штукатурки (кг/м²):**
- Короед зерно 2 мм: 2.0–2.5 кг/м²
- Короед зерно 3 мм: 3.0–3.5 кг/м²
- Камешковая 2.5 мм: 2.8–3.2 кг/м²
- Шуба: 3.5–4.5 кг/м²
- Венецианская: 1.0–1.5 кг/м² (2 слоя)

Запас 5% на потери при нанесении.
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип фактуры",
    "Укажите — фасад или интерьер",
    "Нажмите «Рассчитать» — получите мешки и грунтовку",
  ],
};
