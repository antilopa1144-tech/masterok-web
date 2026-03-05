import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

// Пропорции на 1 м³ бетона (цемент М400, по СНиП)
// [цемент кг, песок м³, щебень м³, вода л]
const PROPORTIONS: Record<number, [number, number, number, number]> = {
  1: [170, 0.56, 0.88, 210], // М100
  2: [215, 0.54, 0.86, 200], // М150
  3: [290, 0.50, 0.82, 190], // М200
  4: [340, 0.47, 0.80, 185], // М250
  5: [380, 0.44, 0.78, 180], // М300
  6: [420, 0.41, 0.76, 175], // М350
  7: [480, 0.38, 0.73, 170], // М400
};

const GRADE_LABELS: Record<number, string> = {
  1: "М100 (В7.5)", 2: "М150 (В12.5)", 3: "М200 (В15)", 4: "М250 (В20)",
  5: "М300 (В22.5)", 6: "М350 (В25)", 7: "М400 (В30)",
};

export const concreteDef: CalculatorDefinition = {
  id: "concrete_universal",
  slug: "beton",
  title: "Калькулятор бетона",
  h1: "Калькулятор бетона онлайн — расчёт объёма и состава смеси",
  description: "Рассчитайте объём бетона и состав смеси (цемент, песок, щебень) по марке. Пропорции по СНиП.",
  metaTitle: "Калькулятор бетона онлайн | Расчёт объёма и состава — Мастерок",
  metaDescription: "Бесплатный калькулятор бетона: рассчитайте объём, количество цемента, песка и щебня для любой марки бетона (М100–М400) по СНиП. Быстро и точно.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["бетон", "цемент", "фундамент", "стяжка", "замес"],
  popularity: 95,
  complexity: 2,
  fields: [
    {
      key: "concreteVolume",
      label: "Объём бетона",
      type: "slider",
      unit: "м³",
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 5,
    },
    {
      key: "concreteGrade",
      label: "Марка бетона",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 1, label: "М100 (В7.5) — подбетонка, дорожки" },
        { value: 2, label: "М150 (В12.5) — стяжки, отмостки" },
        { value: 3, label: "М200 (В15) — фундаменты, плиты" },
        { value: 4, label: "М250 (В20) — монолитные плиты" },
        { value: 5, label: "М300 (В22.5) — несущие конструкции" },
        { value: 6, label: "М350 (В25) — гидротехнические" },
        { value: 7, label: "М400 (В30) — высоконагруженные" },
      ],
    },
    {
      key: "manualMix",
      label: "Самостоятельный замес",
      type: "switch",
      defaultValue: 0,
      hint: "Включите, чтобы рассчитать количество цемента, песка и щебня",
    },
    {
      key: "reserve",
      label: "Запас",
      type: "slider",
      unit: "%",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 5,
      hint: "Рекомендуется 5–10% на потери при заливке",
    },
  ],
  calculate(inputs) {
    const volume = inputs.concreteVolume ?? 5;
    const grade = Math.min(7, Math.max(1, Math.round(inputs.concreteGrade ?? 3)));
    const manualMix = (inputs.manualMix ?? 0) > 0;
    const reserve = inputs.reserve ?? 5;

    const totalVolume = volume * (1 + reserve / 100);
    const [cementKg, sandM3, gravelM3, waterL] = PROPORTIONS[grade] ?? PROPORTIONS[3];

    const warnings: string[] = [];
    if (volume < 0.5) warnings.push("Для малых объёмов (< 0.5 м³) удобнее использовать готовые сухие смеси");
    if (grade >= 5 && manualMix) warnings.push("Бетон М300+ сложно приготовить вручную. Рекомендуется заказ готового бетона");

    const scenarios = buildNativeScenarios({
      id: "concrete-main",
      title: "Concrete main",
      exactNeed: totalVolume,
      unit: "м³",
      packageSizes: [0.1],
      packageLabelPrefix: "concrete-volume",
    });

    const materials = [
      {
        name: `Бетон ${GRADE_LABELS[grade] ?? "М200"}`,
        quantity: totalVolume,
        unit: "м³",
        withReserve: totalVolume,
        purchaseQty: Math.ceil(totalVolume * 10) / 10,
        category: "Основное",
      },
    ];

    // Гидроизоляция обмазочная (битумная мастика): 1 кг/м², по периметру × высоту
    // Оценка: из объёма получаем площадь верхней поверхности, а периметр и высоту — через толщину
    // Для универсального калькулятора принимаем условную толщину 0.2 м (фундамент / стяжка)
    const estimatedThickness = 0.2; // м — условная толщина заливки
    const topSurfaceArea = totalVolume / estimatedThickness;
    const estimatedSide = Math.sqrt(topSurfaceArea);
    const estimatedPerimeter = estimatedSide * 4;
    const estimatedHeight = estimatedThickness; // высота заливки
    const waterproofArea = estimatedPerimeter * estimatedHeight;
    const masticKg = waterproofArea * 1.0 * 1.15; // 1 кг/м² × reserve 15%
    const masticBuckets = Math.ceil(masticKg / 20); // ведро 20 кг

    materials.push({
      name: "Гидроизоляция обмазочная (мастика битумная, ведро 20 кг)",
      quantity: waterproofArea * 1.0,
      unit: "ведро",
      withReserve: masticKg,
      purchaseQty: masticBuckets,
      category: "Гидроизоляция",
    });

    // Плёнка полиэтиленовая для укрытия бетона при наборе прочности
    const filmArea = topSurfaceArea * 1.1; // reserve 10%
    const filmRolls = Math.ceil(filmArea / 30); // 1 рулон = 30 м²

    materials.push({
      name: "Плёнка полиэтиленовая (для укрытия бетона, рулон 30 м²)",
      quantity: topSurfaceArea,
      unit: "рулон",
      withReserve: filmArea,
      purchaseQty: filmRolls,
      category: "Уход за бетоном",
    });

    if (manualMix) {
      const cementTotal = totalVolume * cementKg;
      const cementBags = Math.ceil(cementTotal / 50);
      materials.push(
        {
          name: "Цемент М400",
          quantity: cementTotal,
          unit: "кг",
          withReserve: cementTotal,
          purchaseQty: cementBags,
          category: "Компоненты",
        },
        {
          name: "Мешки цемента (50 кг)",
          quantity: cementBags,
          unit: "мешков",
          withReserve: cementBags,
          purchaseQty: cementBags,
          category: "Компоненты",
        },
        {
          name: "Песок строительный",
          quantity: totalVolume * sandM3,
          unit: "м³",
          withReserve: totalVolume * sandM3 * 1.05,
          purchaseQty: Math.ceil(totalVolume * sandM3 * 1.05 * 10) / 10,
          category: "Компоненты",
        },
        {
          name: "Щебень (фр. 5–20 мм)",
          quantity: totalVolume * gravelM3,
          unit: "м³",
          withReserve: totalVolume * gravelM3 * 1.05,
          purchaseQty: Math.ceil(totalVolume * gravelM3 * 1.05 * 10) / 10,
          category: "Компоненты",
        },
        {
          name: "Вода",
          quantity: totalVolume * waterL,
          unit: "л",
          withReserve: totalVolume * waterL,
          purchaseQty: Math.ceil(totalVolume * waterL),
          category: "Компоненты",
        }
      );
    }

    return {
      materials,
      totals: {
        volume,
        totalVolume,
        grade,
        reserve,
      },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Формула расчёта бетона по СНиП:**

Объём с запасом = Объём × (1 + Запас/100)

Состав на 1 м³ бетона (цемент М400):
| Марка | Цемент, кг | Песок, м³ | Щебень, м³ | Вода, л |
|-------|-----------|-----------|------------|---------|
| М100  | 170       | 0.56      | 0.88       | 210     |
| М200  | 290       | 0.50      | 0.82       | 190     |
| М300  | 380       | 0.44      | 0.78       | 180     |
| М400  | 480       | 0.38      | 0.73       | 170     |
  `,
  howToUse: [
    "Введите требуемый объём бетона в м³",
    "Выберите марку бетона (для фундаментов обычно М200–М250)",
    "Включите «Самостоятельный замес», если хотите замешивать раствор вручную",
    "Укажите запас (5–10%) на потери при заливке",
    "Нажмите «Рассчитать» — получите готовый список материалов",
  ],
  expertTips: [
    {
      title: "Потери в бетононасосе",
      content: "Если заказываете бетононасос, всегда добавляйте 0.3–0.5 м³ сверх расчёта. Этот объём остаётся в системе (трубах и бункере) и не попадает в опалубку.",
      author: "Иваныч, прораб с 20-летним стажем"
    },
    {
      title: "Усадка и вибрирование",
      content: "При использовании глубинного вибратора бетон уплотняется на 2–3%. Если планируете тщательное вибрирование, увеличьте запас до 10%.",
      author: "Технадзор"
    }
  ],
  faq: [
    {
      question: "Какую марку бетона выбрать для фундамента частного дома?",
      answer: "Для ленточного фундамента одноэтажного дома достаточно М200 (В15). Для двухэтажного или при высоком уровне грунтовых вод лучше использовать М250 (В20) или М300 (В22.5)."
    },
    {
      question: "Можно ли заливать бетон в дождь?",
      answer: "Небольшой дождь не страшен, если укрыть свежезалитый бетон плёнкой. Сильный ливень может вымыть цементное молочко, что снизит прочность верхнего слоя."
    }
  ]
};
