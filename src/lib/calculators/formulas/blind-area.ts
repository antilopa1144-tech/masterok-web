import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const blindAreaDef: CalculatorDefinition = {
  id: "foundation_blind_area",
  slug: "otmostka",
  title: "Калькулятор отмостки",
  h1: "Калькулятор отмостки онлайн — расчёт бетона и материалов",
  description: "Рассчитайте объём бетона, щебня, песка и гидроизоляции для устройства отмостки вокруг дома.",
  metaTitle: withSiteMetaTitle("Калькулятор отмостки | Расчёт бетона, материалов"),
  metaDescription: "Бесплатный калькулятор отмостки: рассчитайте бетон, щебень, песок и ЭППС для устройства отмостки по периметру дома и ширине конструкции.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["отмостка", "бетонная отмостка", "отмостка дома", "отмостка расчёт"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "perimeter",
      label: "Периметр дома",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 40,
    },
    {
      key: "width",
      label: "Ширина отмостки",
      type: "select",
      defaultValue: 1.0,
      options: [
        { value: 0.6, label: "0.6 м (минимум)" },
        { value: 0.8, label: "0.8 м" },
        { value: 1.0, label: "1.0 м (рекомендуется)" },
        { value: 1.2, label: "1.2 м" },
        { value: 1.5, label: "1.5 м" },
      ],
    },
    {
      key: "thickness",
      label: "Толщина бетонного слоя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 70, label: "70 мм" },
        { value: 100, label: "100 мм (стандарт)" },
        { value: 150, label: "150 мм (армированная)" },
      ],
    },
    {
      key: "materialType",
      label: "Тип отмостки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Бетонная (М200)" },
        { value: 1, label: "Тротуарная плитка" },
        { value: 2, label: "Мягкая (плёнка + щебень)" },
      ],
    },
    {
      key: "withInsulation",
      label: "Утепление ЭППС под отмосткой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без утепления" },
        { value: 50, label: "ЭППС 50 мм" },
        { value: 100, label: "ЭППС 100 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const perimeter = Math.max(10, inputs.perimeter ?? 40);
    const width = inputs.width ?? 1.0;
    const thicknessMm = inputs.thickness ?? 100;
    const thicknessM = thicknessMm / 1000;
    const materialType = Math.round(inputs.materialType ?? 0);
    const insulationMm = inputs.withInsulation ?? 0;

    const area = perimeter * width;

    const warnings: string[] = [];
    const materials = [];

    if (materialType === 0) {
      // Бетонная отмостка
      const concreteM3 = area * thicknessM;
      materials.push({
        name: `Бетон М200 (В15) — отмостка ${thicknessMm} мм`,
        quantity: concreteM3,
        unit: "м³",
        withReserve: Math.ceil(concreteM3 * 1.05 * 10) / 10,
        purchaseQty: Math.ceil(concreteM3 * 1.05 * 10) / 10,
        category: "Бетон",
      });

      if (thicknessMm >= 100) {
        // Армирующая сетка ВР-1 (ячейка 150×150 мм)
        const meshPcs = Math.ceil(area * 1.1 / 1.0); // рулон/лист ≈ 1 м²
        materials.push({
          name: "Сетка армирующая ВР-1 (ячейка 150×150 мм, 1 м²)",
          quantity: area,
          unit: "м²",
          withReserve: Math.ceil(area * 1.1),
          purchaseQty: Math.ceil(area * 1.1),
          category: "Армирование",
        });
      }

      // Компенсационный шов: дамп-лента по периметру у стены
      materials.push({
        name: "Демпферная лента (компенсационный шов, 10 мм × 100 мм)",
        quantity: perimeter,
        unit: "м.п.",
        withReserve: Math.ceil(perimeter * 1.05),
        purchaseQty: Math.ceil(perimeter * 1.05),
        category: "Деформационный шов",
      });

    } else if (materialType === 1) {
      // Тротуарная плитка
      const tileM2 = Math.ceil(area * 1.08);
      materials.push({
        name: "Тротуарная плитка (200×100×60 мм)",
        quantity: area,
        unit: "м²",
        withReserve: tileM2,
        purchaseQty: tileM2,
        category: "Покрытие",
      });
      // Сухая смесь под плитку: 5–7 кг/м²
      const mixKg = area * 6;
      materials.push({
        name: "Цементно-песчаная смесь для укладки плитки (50 кг)",
        quantity: mixKg / 50,
        unit: "мешков",
        withReserve: Math.ceil(mixKg / 50),
        purchaseQty: Math.ceil(mixKg / 50),
        category: "Основание",
      });
      // Бордюр
      const borderPcs = Math.ceil(perimeter / 0.5); // бордюрный камень 0.5 м
      materials.push({
        name: "Бордюрный камень 500×200×80 мм",
        quantity: perimeter / 0.5,
        unit: "шт",
        withReserve: borderPcs,
        purchaseQty: borderPcs,
        category: "Бордюр",
      });
    } else {
      // Мягкая отмостка
      const membraneM2 = Math.ceil(area * 1.15);
      materials.push({
        name: "Профилированная мембрана HDPE (рулон)",
        quantity: area,
        unit: "м²",
        withReserve: membraneM2,
        purchaseQty: membraneM2,
        category: "Гидроизоляция",
      });
      const pebbleM3 = area * 0.1;
      materials.push({
        name: "Щебень декоративный (100 мм слой)",
        quantity: pebbleM3,
        unit: "м³",
        withReserve: Math.ceil(pebbleM3 * 1.1 * 10) / 10,
        purchaseQty: Math.ceil(pebbleM3 * 1.1 * 10) / 10,
        category: "Покрытие",
      });
    }

    // Общее: щебень подготовка 150 мм
    const crushedStoneM3 = area * 0.15;
    materials.push({
      name: "Щебень фракция 20-40 мм (подготовка 150 мм)",
      quantity: crushedStoneM3,
      unit: "м³",
      withReserve: Math.ceil(crushedStoneM3 * 1.1 * 10) / 10,
      purchaseQty: Math.ceil(crushedStoneM3 * 1.1 * 10) / 10,
      category: "Подготовка",
    });

    // Песок 100 мм
    const sandM3 = area * 0.1;
    materials.push({
      name: "Песок крупнозернистый (100 мм подсыпка)",
      quantity: sandM3,
      unit: "м³",
      withReserve: Math.ceil(sandM3 * 1.1 * 10) / 10,
      purchaseQty: Math.ceil(sandM3 * 1.1 * 10) / 10,
      category: "Подготовка",
    });

    // Геотекстиль (разделительный слой под подготовку)
    const geotextileArea = area * 1.15; // reserve 15% на нахлёсты
    const geotextileRolls = Math.ceil(geotextileArea / 50); // 1 рулон = 50 м²
    materials.push({
      name: "Геотекстиль 200 г/м² (разделительный, рулон 50 м²)",
      quantity: area,
      unit: "рулон",
      withReserve: geotextileArea,
      purchaseQty: geotextileRolls,
      category: "Подготовка",
    });

    // Демпферная лента (компенсационный шов у стены) — для типов, где ещё не добавлена
    if (materialType !== 0) {
      const damperLengthReserve = perimeter * 1.1; // reserve 10%
      const damperRolls = Math.ceil(damperLengthReserve / 20); // 1 рулон = 20 м
      materials.push({
        name: "Демпферная лента (компенсационный шов, 10 мм × 100 мм, рулон 20 м)",
        quantity: perimeter,
        unit: "рулон",
        withReserve: damperLengthReserve,
        purchaseQty: damperRolls,
        category: "Деформационный шов",
      });
    }

    // ЭППС утепление
    if (insulationMm > 0) {
      const eppsPlates = Math.ceil(area * 1.05 / 0.72);
      materials.push({
        name: `ЭППС ${insulationMm} мм (утепление, плита 1200×600)`,
        quantity: area / 0.72,
        unit: "плит",
        withReserve: eppsPlates,
        purchaseQty: eppsPlates,
        category: "Утепление",
      });
    }

    if (width < 0.8) {
      warnings.push("Минимальная ширина отмостки по СП 45.13330 — 0.6 м, рекомендуется 1.0 м");
    }
    warnings.push("Уклон отмостки от стены: 1–3% (10–30 мм/м) для отвода воды");
    warnings.push("Компенсационный шов у стены фундамента обязателен — иначе трещины");

    const scenarios = buildNativeScenarios({
      id: "blind-area-main",
      title: "Blind area main",
      exactNeed: area,
      unit: "м²",
      packageSizes: [1],
      packageLabelPrefix: "blind-area-m2",
    });

    return {
      materials,
      totals: { area, perimeter, width } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт отмостки:**
- Площадь = периметр × ширину
- Бетон М200: площадь × толщину (м³)
- Подготовка: щебень 150 мм + песок 100 мм
- Уклон 1–3% обязателен по СП 45.13330
  `,
  howToUse: [
    "Введите периметр дома",
    "Выберите ширину и толщину отмостки",
    "Укажите тип отмостки",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какая ширина отмостки считается нормальной?",
      answer: "Нормальная ширина отмостки зависит от типа грунта, выноса кровли, высоты цоколя и общей конструкции дома, но на практике часто закладывают около 1 метра или больше, чтобы она действительно работала, а не была формальной полосой у стены. Важно, чтобы отмостка уверенно отводила воду от фундамента, перекрывала реальную зону попадания стока с крыши и не оказывалась уже карнизного свеса в проблемных местах, особенно на участках с сильным увлажнением и пучинистыми грунтами, где вода дольше держится у основания дома. Если сделать её слишком узкой, она часто выглядит законченной только визуально, но плохо работает именно в дождь, межсезонье и при косом ветровом дожде, когда вода всё равно возвращается к фундаменту. То есть ориентир по ширине нужно привязывать не только к виду дома, но и к реальной траектории воды на участке после ливня и схода с крыши. На участках с сильным увлажнением и мягким грунтом безопаснее считать ширину не по красивому минимуму, а с запасом под фактический отвод воды от пятна застройки. На практике её ещё увязывают со свесом кровли, типом грунта и организацией отвода воды, потому что слишком узкая полоса плохо защищает основание даже при хорошем материале. Её обычно соотносят не только со свесом кровли, но и с типом грунта, уклоном участка и схемой отвода воды, чтобы полоса реально уводила влагу от фундамента. Её выбирают с учётом свеса кровли, грунта и отвода воды, а не по одному фиксированному числу для всех домов. На пучинистых грунтах и при большом свесе кровли разумно смотреть не на минимум, а на более защитную рабочую ширину. На участках с сильным увлажнением и активным снегосбросом полезно смотреть не только на норму, но и на фактический вынос воды от здания."
    },
    {
      question: "Нужно ли утеплять отмостку?",
      answer: "Утеплённая отмостка особенно полезна рядом с отапливаемыми домами, тёплыми плитами и на пучинистых грунтах, где важно уменьшить промерзание грунта непосредственно у фундамента и в зоне примыкания основания к дому. Она помогает снизить риск морозного пучения, сделать узел основания стабильнее зимой и уменьшить вероятность сезонных деформаций, трещин и локальных подвижек возле дома, особенно если фундамент работает в зоне переменного увлажнения и промерзания, а участок плохо отводит талую и дождевую воду. На практике утеплённая отмостка особенно оправдана там, где рядом с фундаментом долго держатся влага, сезонные перепады температуры и нет надёжного дренажа, а доступ к ремонту после благоустройства участка уже ограничен. Для мелкозаглублённого фундамента и тёплой плиты такой узел обычно даёт особенно заметный эффект по стабильности грунта у дома. Для мелкозаглублённого фундамента и тёплой плиты такой узел обычно даёт особенно заметный эффект по стабильности грунта у дома. Утепление особенно полезно у мелкозаглублённых фундаментов и на пучинистых грунтах, где оно помогает стабилизировать температурный режим вокруг основания. Утепление особенно полезно на пучинистых грунтах и рядом с отапливаемым фундаментом, где важно снизить промерзание основания и уменьшить сезонные деформации вокруг дома. В пучинистых грунтах и у тёплого фундамента утепление помогает снизить промерзание и подвижки по периметру дома. На пучинистых грунтах и у отапливаемого дома утепление помогает уменьшить промерзание и подвижки по периметру. Особенно это оправдано там, где важно уменьшить промерзание грунта рядом с фундаментом и сократить риск сезонных подвижек."
    }
  ],
};





