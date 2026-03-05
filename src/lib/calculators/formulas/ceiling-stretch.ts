import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const ceilingStretchDef: CalculatorDefinition = {
  id: "ceilings_stretch",
  slug: "natyazhnoj-potolok",
  title: "Калькулятор натяжного потолка",
  h1: "Калькулятор натяжного потолка онлайн — расчёт площади и материалов",
  description: "Рассчитайте площадь натяжного потолка, длину багета, количество точечных светильников и стоимость монтажа.",
  metaTitle: "Калькулятор натяжного потолка | Расчёт площади, багета — Мастерок",
  metaDescription: "Бесплатный калькулятор натяжного потолка: рассчитайте площадь, длину багета, количество светильников онлайн.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["натяжной потолок", "багет", "светильники", "потолок"],
  popularity: 72,
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
      defaultValue: 20,
    },
    {
      key: "corners",
      label: "Количество углов в комнате",
      type: "slider",
      unit: "шт",
      min: 3,
      max: 20,
      step: 1,
      defaultValue: 4,
    },
    {
      key: "fixtures",
      label: "Точечные светильники",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 6,
    },
    {
      key: "ceilingType",
      label: "Тип полотна",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Глянцевое (ПВХ)" },
        { value: 1, label: "Матовое (ПВХ)" },
        { value: 2, label: "Тканевое (полиэстер)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const corners = Math.round(inputs.corners ?? 4);
    const fixtures = Math.round(inputs.fixtures ?? 6);
    const ceilingType = Math.round(inputs.ceilingType ?? 0);

    // Периметр из площади и числа углов (прямоугольник: периметр ≈ 4×√area для квадрата)
    // Используем упрощённую формулу: периметр = 2×(√(area×R) + √(area/R)), R зависит от углов
    // Для простого расчёта: периметр ≈ √(area × 4)  (квадратная комната)
    const side = Math.sqrt(area);
    const perimeter = side * 4; // упрощение — для прямоугольной комнаты достаточно

    // Багет: по периметру + 10% на подрезку и стыки
    const baguetLength = perimeter * 1.1;

    // Разметочный шнур = периметр
    const stringLength = perimeter;

    // Стартовый профиль (алюминиевый Г-образный, 2.5м хлысты)
    const profilePcs = Math.ceil(baguetLength / 2.5);

    const typeNames = ["Глянцевое ПВХ", "Матовое ПВХ", "Тканевое"];

    const warnings: string[] = [];
    if (area > 100) {
      warnings.push("Для больших площадей (>100 м²) используются составные полотна со швом — учтите при заказе");
    }
    if (ceilingType === 2) {
      warnings.push("Тканевый натяжной потолок можно монтировать без нагрева — безопаснее для деревянных перекрытий");
    }
    if (fixtures > 0) {
      warnings.push(`Для ${fixtures} светильников: устанавливайте закладные платформы ДО натяжки полотна`);
    }

    const scenarios = buildNativeScenarios({
      id: "ceiling-stretch-main",
      title: "Ceiling stretch main",
      exactNeed: area,
      unit: "м²",
      packageSizes: [1],
      packageLabelPrefix: "ceiling-stretch-m2",
    });

    return {
      materials: [
        {
          name: `Полотно натяжного потолка — ${typeNames[ceilingType] ?? "ПВХ"}`,
          quantity: area,
          unit: "м²",
          withReserve: area,
          purchaseQty: Math.ceil(area),
          category: "Полотно",
        },
        {
          name: "Профиль стартовый (багет) алюминиевый 2.5 м",
          quantity: baguetLength / 2.5,
          unit: "шт",
          withReserve: profilePcs,
          purchaseQty: profilePcs,
          category: "Профиль",
        },
        {
          name: "Декоративная вставка в багет (гарпун/клипса)",
          quantity: perimeter,
          unit: "м.п.",
          withReserve: Math.ceil(perimeter * 1.1),
          purchaseQty: Math.ceil(perimeter * 1.1),
          category: "Профиль",
        },
        ...(fixtures > 0 ? [{
          name: "Закладная платформа для светильника",
          quantity: fixtures,
          unit: "шт",
          withReserve: fixtures,
          purchaseQty: fixtures,
          category: "Светильники",
        }] : []),
        {
          name: "Маскировочная лента (заглушка, бухта 50 м)",
          quantity: perimeter,
          unit: "м.п.",
          withReserve: Math.ceil(perimeter * 1.1 * 10) / 10,
          purchaseQty: Math.ceil(perimeter * 1.1 / 50),
          category: "Профиль",
        },
        {
          name: "Обвод для труб",
          quantity: 2,
          unit: "шт",
          withReserve: 2,
          purchaseQty: 2,
          category: "Доборные",
        },
      ],
      totals: { area, perimeter, fixtures } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт натяжного потолка:**
- Площадь полотна = площадь комнаты
- Длина багета = периметр × 1.1 (запас на подрезку)
- Профиль 2.5 м: ⌈Длина багета / 2.5⌉

Монтаж выполняется профессионалами с тепловой пушкой для ПВХ.
  `,
  howToUse: [
    "Введите площадь потолка",
    "Укажите количество углов в комнате",
    "Задайте количество точечных светильников",
    "Выберите тип полотна",
    "Нажмите «Рассчитать»",
  ],
};
