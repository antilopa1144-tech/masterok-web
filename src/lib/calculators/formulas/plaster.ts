import type { CalculatorDefinition } from "../types";

export const plasterDef: CalculatorDefinition = {
  id: "mixes_plaster",
  slug: "shtukaturka",
  title: "Калькулятор штукатурки",
  h1: "Калькулятор штукатурки онлайн — расчёт расхода смеси на стены",
  description: "Рассчитайте количество штукатурки на стены и потолок. Учёт толщины слоя, типа поверхности и производителя.",
  metaTitle: "Калькулятор штукатурки онлайн | Расчёт расхода — Мастерок",
  metaDescription: "Бесплатный калькулятор штукатурки: рассчитайте количество мешков Knauf, Волма, Ceresit по площади и толщине слоя. Нормы по СНиП 3.04.01-87.",
  category: "walls",
  categorySlug: "steny",
  tags: ["штукатурка", "штукатурная смесь", "Knauf", "Волма", "гипсовая штукатурка", "цементная штукатурка"],
  popularity: 82,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "height",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 50,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь окон и дверей",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "plasterType",
      label: "Тип штукатурки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гипсовая (KnaufРотбанд, Волма Слой)" },
        { value: 1, label: "Цементная (Ceresit CT 29, Старатели)" },
        { value: 2, label: "Цементно-известковая (UNIS Силин)" },
      ],
    },
    {
      key: "thickness",
      label: "Толщина слоя",
      type: "slider",
      unit: "мм",
      min: 5,
      max: 50,
      step: 1,
      defaultValue: 15,
      hint: "Оптимально 10–20 мм. По СНиП: до 20 мм без армирования",
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 30,
      options: [
        { value: 25, label: "25 кг" },
        { value: 30, label: "30 кг" },
        { value: 40, label: "40 кг" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let wallArea: number;

    if (inputMode === 0) {
      const l = Math.max(1, inputs.length ?? 5);
      const w = Math.max(1, inputs.width ?? 4);
      const h = Math.max(2, inputs.height ?? 2.7);
      wallArea = 2 * (l + w) * h;
    } else {
      wallArea = Math.max(1, inputs.area ?? 50);
    }

    const openings = Math.max(0, inputs.openingsArea ?? 5);
    const netArea = Math.max(0, wallArea - openings);
    const thickness = Math.max(5, Math.min(50, inputs.thickness ?? 15));
    const type = Math.round(inputs.plasterType ?? 0);
    const bagWeight = inputs.bagWeight ?? 30;

    // Расход по типам (кг/м² на 10 мм толщины): гипс ~8, цементная ~15, цем-изв ~13
    const consumptionPer10mm: Record<number, number> = { 0: 8.5, 1: 15, 2: 13 };
    const kgPer10mm = consumptionPer10mm[type] ?? 8.5;
    const kgPerSqm = kgPer10mm * (thickness / 10);

    const totalKg = netArea * kgPerSqm * 1.1; // +10% запас
    const bags = Math.ceil(totalKg / bagWeight);

    const warnings: string[] = [];
    if (thickness > 20 && type === 0) {
      warnings.push("Гипсовую штукатурку толщиной > 20 мм наносят в 2 слоя с армирующей сеткой");
    }
    if (thickness > 30) {
      warnings.push("При толщине > 30 мм обязательно армирование стекловолоконной сеткой");
    }
    if (netArea < 5) {
      warnings.push("Маленькая площадь — лучше использовать готовую шпаклёвку из ведра");
    }

    const typeNames = ["Гипсовая штукатурка", "Цементная штукатурка", "Цементно-известковая"];
    const groundKg = netArea * 0.1; // грунтовка ~100 мл/м²
    const groundCans = Math.ceil(groundKg / 5);

    return {
      materials: [
        {
          name: `${typeNames[type] ?? typeNames[0]} (мешки ${bagWeight} кг)`,
          quantity: totalKg / bagWeight,
          unit: "мешков",
          withReserve: bags,
          purchaseQty: bags,
          category: "Основное",
        },
        {
          name: "Грунтовка (5 л)",
          quantity: netArea * 0.1 / 5,
          unit: "шт",
          withReserve: groundCans,
          purchaseQty: groundCans,
          category: "Подготовка",
        },
        ...(thickness > 20 ? [{
          name: "Стеклосетка армировочная (50×50 мм)",
          quantity: netArea,
          unit: "м²",
          withReserve: Math.ceil(netArea * 1.1),
          purchaseQty: Math.ceil(netArea * 1.1),
          category: "Армирование",
        }] : []),
        {
          name: "Маяки штукатурные (3 м, уп. 10 шт)",
          quantity: netArea / 1.5 / 10,
          unit: "упак.",
          withReserve: Math.ceil(netArea / 1.5 / 10),
          purchaseQty: Math.ceil(netArea / 1.5 / 10),
          category: "Вспомогательное",
        },
        ...(inputMode === 0 ? [{
          name: "Угловой профиль перфорированный 25×25 мм (3 м)",
          quantity: Math.ceil(Math.max(2, inputs.height ?? 2.7) * 4 / 3),
          unit: "шт",
          withReserve: Math.ceil(Math.max(2, inputs.height ?? 2.7) * 4 / 3 * 1.1),
          purchaseQty: Math.ceil(Math.max(2, inputs.height ?? 2.7) * 4 / 3 * 1.1),
          category: "Вспомогательное",
        }] : []),
      ],
      totals: { wallArea, netArea, thickness, totalKg } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт штукатурки по СНиП 3.04.01-87:**
Расход = Площадь × Толщина (мм) / 10 × Норма (кг/м²)

Нормы расхода (на 10 мм слоя):
- Гипсовая (Rotband, Волма Слой): 8–9 кг/м²
- Цементная (CT 29, Старатели): 14–16 кг/м²
- Цементно-известковая: 12–14 кг/м²

Запас 10% на потери при нанесении.
Маяки: шаг 1.2–1.5 м по длине стены.
  `,
  howToUse: [
    "Введите размеры помещения или площадь стен",
    "Укажите площадь окон и дверей (вычитается из площади)",
    "Выберите тип штукатурки",
    "Укажите толщину слоя (обычно 10–20 мм)",
    "Нажмите «Рассчитать» — получите мешки, грунтовку и маяки",
  ],
};
