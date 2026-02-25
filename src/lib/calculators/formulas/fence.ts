import type { CalculatorDefinition } from "../types";

export const fenceDef: CalculatorDefinition = {
  id: "fence",
  slug: "zabor",
  title: "Калькулятор забора",
  h1: "Калькулятор забора онлайн — расчёт материалов для ограждения",
  description: "Рассчитайте столбы, лаги, профлист или сетку-рабицу и крепёж для забора любой длины.",
  metaTitle: "Калькулятор забора | Расчёт профлиста, столбов, сетки — Мастерок",
  metaDescription: "Бесплатный калькулятор забора: рассчитайте профлист, столбы, поперечные лаги и крепёж по длине и высоте ограждения.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["забор", "профлист", "ограждение", "столбы", "сетка-рабица", "лаги для забора"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "fenceLength",
      label: "Длина забора",
      type: "slider",
      unit: "м",
      min: 5,
      max: 500,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "fenceHeight",
      label: "Высота забора",
      type: "slider",
      unit: "м",
      min: 1,
      max: 3,
      step: 0.1,
      defaultValue: 2,
    },
    {
      key: "fenceType",
      label: "Тип забора",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Из профнастила (на столбах)" },
        { value: 1, label: "Сетка-рабица (на столбах)" },
        { value: 2, label: "Деревянный штакетник" },
      ],
    },
    {
      key: "postStep",
      label: "Шаг столбов",
      type: "select",
      defaultValue: 2.5,
      options: [
        { value: 2.0, label: "2.0 м" },
        { value: 2.5, label: "2.5 м (стандарт)" },
        { value: 3.0, label: "3.0 м" },
      ],
    },
    {
      key: "gatesCount",
      label: "Ворота (двустворчатые, 4 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "wicketsCount",
      label: "Калитки (1 м)",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 1,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const length = Math.max(5, inputs.fenceLength ?? 50);
    const height = Math.max(1, inputs.fenceHeight ?? 2);
    const type = Math.round(inputs.fenceType ?? 0);
    const postStep = inputs.postStep ?? 2.5;
    const gates = Math.round(inputs.gatesCount ?? 1);
    const wickets = Math.round(inputs.wicketsCount ?? 1);

    // Длина секций (вычитаем проёмы)
    const openingsLength = gates * 4 + wickets * 1;
    const netLength = Math.max(1, length - openingsLength);

    // Столбы
    const postsCount = Math.ceil(netLength / postStep) + 1 + gates * 2 + wickets * 2;

    // Лаги (прожилины): 2 штуки на секцию при h≤2м, 3 при h>2м
    const lagsPerSpan = height > 2 ? 3 : 2;
    const lagSpans = Math.ceil(netLength / postStep);
    const lagsCount = lagSpans * lagsPerSpan;

    const warnings: string[] = [];
    const materials = [];

    if (type === 0) {
      // Профнастил
      const sheetWidth = 1.15; // полезная ширина листа профлиста С20
      const sheetsNeeded = Math.ceil((netLength / sheetWidth) * 1.02);
      materials.push({
        name: `Профнастил С20/С21 (лист ${height.toFixed(1)} м × 1.15 м)`,
        quantity: netLength / sheetWidth,
        unit: "шт",
        withReserve: sheetsNeeded,
        purchaseQty: sheetsNeeded,
        category: "Заполнение",
      });
      // Саморезы: 6–8 шт на лист
      const screws = sheetsNeeded * 7;
      materials.push({
        name: "Саморезы кровельные 5.5×19 мм",
        quantity: screws,
        unit: "шт",
        withReserve: Math.ceil(screws * 1.05),
        purchaseQty: Math.ceil(screws / 200) * 200,
        category: "Крепёж",
      });
      // Грунтовка по металлу (для мест реза): 1 баллончик (400 мл) на 20 м длины
      const primerCans = Math.ceil(length / 20);
      materials.push({
        name: "Грунтовка по металлу, баллончик 400 мл",
        quantity: length / 20,
        unit: "шт",
        withReserve: primerCans,
        purchaseQty: primerCans,
        category: "Доп. материалы",
      });
    } else if (type === 1) {
      // Сетка-рабица
      const rollWidth = height; // рулон нужной высоты
      const rollLength = 10; // стандартный рулон 10 м
      const rollsNeeded = Math.ceil(netLength / rollLength);
      materials.push({
        name: `Сетка-рабица Ø1.6 мм, h=${height.toFixed(1)} м (рулон 10 м)`,
        quantity: netLength / rollLength,
        unit: "рулонов",
        withReserve: rollsNeeded,
        purchaseQty: rollsNeeded,
        category: "Заполнение",
      });
      materials.push({
        name: "Натяжная проволока ∅4 мм",
        quantity: netLength * lagsPerSpan,
        unit: "м.п.",
        withReserve: Math.ceil(netLength * lagsPerSpan * 1.05),
        purchaseQty: Math.ceil(netLength * lagsPerSpan * 1.05),
        category: "Крепёж",
      });
    } else {
      // Штакетник деревянный
      const slatWidth = 0.1; // 100 мм
      const slatGap = 0.03; // 30 мм зазор
      const slatsNeeded = Math.ceil((netLength / (slatWidth + slatGap)) * 1.05);
      materials.push({
        name: `Штакетник деревянный 100×${(height * 1000).toFixed(0)} мм`,
        quantity: slatsNeeded,
        unit: "шт",
        withReserve: slatsNeeded,
        purchaseQty: slatsNeeded,
        category: "Заполнение",
      });
      // Антисептик для дерева: 150 мл/м² × 2 стороны
      const woodArea = netLength * height * 2;
      const antisepticLiters = woodArea * 0.15 * 1.15;
      const antisepticCans = Math.ceil(antisepticLiters / 5);
      materials.push({
        name: "Антисептик для дерева (канистра 5 л)",
        quantity: woodArea * 0.15 / 5,
        unit: "канистра",
        withReserve: antisepticCans,
        purchaseQty: antisepticCans,
        category: "Доп. материалы",
      });
      if (!warnings.length) warnings.push("Деревянный штакетник требует обработки антисептиком и покраски");
    }

    // Столбы (профтруба 60×60×2 мм, длина = высота + 0.9 м в землю)
    const postLength = height + 0.9;
    materials.push({
      name: `Столб профтруба 60×60 мм (${postLength.toFixed(1)} м)`,
      quantity: postsCount,
      unit: "шт",
      withReserve: postsCount,
      purchaseQty: postsCount,
      category: "Столбы",
    });

    // Лаги (профтруба 40×20 мм)
    if (type !== 1) {
      const lagsLm = lagsCount * postStep;
      materials.push({
        name: "Лага профтруба 40×20 мм",
        quantity: lagsLm,
        unit: "м.п.",
        withReserve: Math.ceil(lagsLm * 1.05),
        purchaseQty: Math.ceil(lagsLm * 1.05),
        category: "Лаги",
      });
    }

    // Бетон для фундамента столбов
    const concreteM3 = postsCount * 0.03; // ~30 л на столб
    materials.push({
      name: "Бетон М200 для замоноличивания столбов",
      quantity: concreteM3,
      unit: "м³",
      withReserve: Math.ceil(concreteM3 * 1.1 * 10) / 10,
      purchaseQty: Math.ceil(concreteM3 * 1.1 * 10) / 10,
      category: "Фундамент",
    });

    // Заглушки для столбов: 1 на столб
    const capsCount = Math.ceil(postsCount * 1.05);
    materials.push({
      name: "Заглушки для столбов 60×60 мм",
      quantity: postsCount,
      unit: "шт",
      withReserve: capsCount,
      purchaseQty: capsCount,
      category: "Доп. материалы",
    });

    if (gates > 0) warnings.push(`Ворота (${gates} шт): требуют усиленных столбов 80×80 или 100×100 мм`);

    return {
      materials,
      totals: { length, netLength, postsCount, height } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт забора:**
Столбов = ⌈Длина / Шаг⌉ + 1 + Ворота×2 + Калитки×2
Листов профнастила = ⌈Длина_нетто / 1.15⌉

Стандарты:
- Шаг столбов: 2–3 м (оптимально 2.5 м)
- Профнастил С20: полезная ширина 1.15 м
- Глубина забивки столбов: 0.7–1.0 м (ниже точки промерзания)
  `,
  howToUse: [
    "Введите длину забора",
    "Укажите высоту и тип заполнения",
    "Задайте шаг столбов",
    "Укажите количество ворот и калиток",
    "Нажмите «Рассчитать» — получите все материалы",
  ],
};
