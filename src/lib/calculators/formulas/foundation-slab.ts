import type { CalculatorDefinition } from "../types";

export const foundationSlabDef: CalculatorDefinition = {
  id: "foundation_slab",
  slug: "plitnyj-fundament",
  title: "Калькулятор плитного фундамента",
  h1: "Калькулятор плитного фундамента онлайн — расчёт бетона и арматуры",
  description: "Рассчитайте объём бетона, арматуру, опалубку и геотекстиль для монолитной плиты фундамента по ГОСТ.",
  metaTitle: "Калькулятор плитного фундамента | Расчёт бетона, арматуры — Мастерок",
  metaDescription: "Бесплатный калькулятор монолитной плиты фундамента: бетон, арматура А500С, опалубка, подготовка по ГОСТ 13579.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["плитный фундамент", "монолитная плита", "фундамент", "бетон", "арматура"],
  popularity: 68,
  complexity: 3,
  fields: [
    {
      key: "area",
      label: "Площадь плиты",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 60,
    },
    {
      key: "thickness",
      label: "Толщина плиты",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (лёгкие постройки)" },
        { value: 200, label: "200 мм (жилой дом, рекомендуется)" },
        { value: 250, label: "250 мм (тяжёлые конструкции)" },
        { value: 300, label: "300 мм (многоэтажные дома)" },
      ],
    },
    {
      key: "rebarDiam",
      label: "Диаметр арматуры",
      type: "select",
      defaultValue: 12,
      options: [
        { value: 10, label: "∅10 мм (лёгкие нагрузки)" },
        { value: 12, label: "∅12 мм (стандарт)" },
        { value: 14, label: "∅14 мм (повышенные нагрузки)" },
        { value: 16, label: "∅16 мм (тяжёлые конструкции)" },
      ],
    },
    {
      key: "rebarStep",
      label: "Шаг арматуры",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (усиленная сетка)" },
        { value: 200, label: "200 мм (стандарт)" },
        { value: 250, label: "250 мм (облегчённая)" },
      ],
    },
    {
      key: "insulationThickness",
      label: "Утеплитель ЭППС под плитой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не нужен" },
        { value: 50, label: "50 мм" },
        { value: 100, label: "100 мм (тёплый дом)" },
        { value: 150, label: "150 мм (Северные регионы)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(10, inputs.area ?? 60);
    const thicknessMm = inputs.thickness ?? 200;
    const thicknessM = thicknessMm / 1000;
    const rebarDiam = inputs.rebarDiam ?? 12; // мм
    const rebarStepMm = inputs.rebarStep ?? 200;
    const rebarStepM = rebarStepMm / 1000;
    const insulationThickness = inputs.insulationThickness ?? 0;

    // Периметр плиты (приближение — квадрат)
    const side = Math.sqrt(area);
    const perimeter = side * 4;

    // Объём бетона М300 (В22.5)
    const concreteM3 = area * thicknessM;
    const concreteWithReserve = Math.ceil(concreteM3 * 1.05 * 10) / 10;

    // Арматура А500С: 2 сетки (верхняя + нижняя)
    // Количество прутков в каждом направлении = side / rebarStepM + 1
    const barCountPerDirection = Math.ceil(side / rebarStepM) + 1;
    const barLengthPerRow = side; // длина прутка ≈ сторона плиты
    const totalBarLength = barCountPerDirection * barLengthPerRow * 2 * 2; // 2 направления × 2 сетки (верх + низ)

    // Масса арматуры: 1 м.п. ∅12 = 0.888 кг; ∅10 = 0.617; ∅14 = 1.208; ∅16 = 1.578
    const weightPerMeter: Record<number, number> = { 10: 0.617, 12: 0.888, 14: 1.208, 16: 1.578 };
    const kgPerM = weightPerMeter[rebarDiam] ?? 0.888;
    const totalRebarKg = totalBarLength * kgPerM;
    const rebarTons = totalRebarKg / 1000;

    // Вязальная проволока: ~20 г на узел, узлов ≈ barCountPerDirection² × 2 сетки
    const joints = barCountPerDirection * barCountPerDirection * 2;
    const wireKg = joints * 0.02;

    // Опалубка: периметр × толщину плиты (щиты 0.2 м высотой)
    const formworkArea = perimeter * thicknessM;
    const formworkM2 = Math.ceil(formworkArea * 1.1);

    // Геотекстиль: под подготовку (площадь + нахлёст 20%)
    const geotextileM2 = Math.ceil(area * 1.2);

    // Щебень подготовка: 150 мм слой
    const crushedStoneM3 = area * 0.15;

    // Песок подушка: 100 мм слой
    const sandM3 = area * 0.1;

    // ЭППС утеплитель
    const insulationPlates = insulationThickness > 0
      ? Math.ceil(area * 1.05 / 0.72) // плита 1200×600 = 0.72 м²
      : 0;

    const warnings: string[] = [];
    if (thicknessMm < 200) {
      warnings.push("Плита <200 мм не рекомендуется для жилых домов — рассмотрите 200 мм");
    }
    if (rebarStepMm > 200 && area > 100) {
      warnings.push("Для плиты >100 м² рекомендуется шаг арматуры 150–200 мм");
    }
    warnings.push("Бетон укладывается без технологических перерывов — заказывайте миксеры с интервалом не более 1.5 ч");

    return {
      materials: [
        {
          name: `Бетон М300 (В22.5) — монолитная плита ${thicknessMm} мм`,
          quantity: concreteM3,
          unit: "м³",
          withReserve: concreteWithReserve,
          purchaseQty: concreteWithReserve,
          category: "Бетон",
        },
        {
          name: `Арматура А500С ∅${rebarDiam} мм, шаг ${rebarStepMm} мм`,
          quantity: rebarTons,
          unit: "т",
          withReserve: Math.ceil(rebarTons * 1.05 * 100) / 100,
          purchaseQty: Math.ceil(rebarTons * 1.05 * 100) / 100,
          category: "Арматура",
        },
        {
          name: "Проволока вязальная 1.2 мм",
          quantity: wireKg,
          unit: "кг",
          withReserve: Math.ceil(wireKg * 1.1),
          purchaseQty: Math.ceil(wireKg * 1.1),
          category: "Арматура",
        },
        {
          name: "Щебень фракция 20-40 мм (подготовка 150 мм)",
          quantity: crushedStoneM3,
          unit: "м³",
          withReserve: Math.ceil(crushedStoneM3 * 1.1 * 10) / 10,
          purchaseQty: Math.ceil(crushedStoneM3 * 1.1 * 10) / 10,
          category: "Подготовка",
        },
        {
          name: "Песок крупнозернистый (подушка 100 мм)",
          quantity: sandM3,
          unit: "м³",
          withReserve: Math.ceil(sandM3 * 1.1 * 10) / 10,
          purchaseQty: Math.ceil(sandM3 * 1.1 * 10) / 10,
          category: "Подготовка",
        },
        {
          name: "Геотекстиль 200 г/м²",
          quantity: area,
          unit: "м²",
          withReserve: geotextileM2,
          purchaseQty: geotextileM2,
          category: "Подготовка",
        },
        {
          name: "Опалубка (доска 50×150 мм или щиты)",
          quantity: formworkArea,
          unit: "м²",
          withReserve: formworkM2,
          purchaseQty: formworkM2,
          category: "Опалубка",
        },
        // Гидроизоляция рулонная: поверх подготовки, под бетонную плиту
        {
          name: "Гидроизоляция рулонная Технониколь (рулон 10 м²)",
          quantity: area,
          unit: "рулонов",
          withReserve: Math.ceil(area * 1.15 / 10),
          purchaseQty: Math.ceil(area * 1.15 / 10),
          category: "Гидроизоляция",
        },
        ...(insulationPlates > 0 ? [{
          name: `ЭППС ${insulationThickness} мм (плита 1200×600)`,
          quantity: area / 0.72,
          unit: "плит",
          withReserve: insulationPlates,
          purchaseQty: insulationPlates,
          category: "Утепление",
        }] : []),
      ],
      totals: { area, concreteM3, rebarTons } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт монолитной плиты:**
- Бетон В22.5: площадь × толщину (м³)
- Арматура: 2 сетки (верх+низ), шаг 200 мм
- Подготовка: щебень 150 мм + песок 100 мм
- Утепление ЭППС — опционально
  `,
  howToUse: [
    "Введите площадь плиты",
    "Выберите толщину и армирование",
    "Укажите необходимость утепления",
    "Нажмите «Рассчитать»",
  ],
};
