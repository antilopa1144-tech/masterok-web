import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const atticDef: CalculatorDefinition = {
  id: "attic",
  slug: "otdelka-mansardy",
  title: "Калькулятор отделки мансарды",
  h1: "Калькулятор мансарды — расчёт утепления и отделки",
  description: "Рассчитайте утеплитель, гидро-пароизоляцию и обшивку для жилой мансарды: минвата, мембрана, вагонка или гипсокартон.",
  metaTitle: withSiteMetaTitle("Калькулятор мансарды | Утепление, обшивка"),
  metaDescription: "Бесплатный калькулятор мансарды: рассчитайте утепление минватой, мембрану, вагонку и ГКЛ по площади кровли и отделке помещения.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["мансарда", "утепление мансарды", "мансардное утепление", "Rockwool", "гидроизоляция кровли"],
  popularity: 60,
  complexity: 3,
  fields: [
    {
      key: "roofArea",
      label: "Площадь кровельного ската (наклонная поверхность)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 300,
      step: 5,
      defaultValue: 60,
    },
    {
      key: "insulationThickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (2 слоя по 75 мм)" },
        { value: 200, label: "200 мм (2 слоя по 100 мм) — рекомендуется" },
        { value: 250, label: "250 мм (Сибирь, Урал)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Rockwool Лайт Баттс 100 мм" },
        { value: 1, label: "URSA ROOF 150 мм" },
        { value: 2, label: "Knauf Insulation Roof 100 мм" },
      ],
    },
    {
      key: "finishType",
      label: "Тип отделки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Вагонка деревянная (сосна)" },
        { value: 1, label: "Гипсокартон (ГКЛ) + шпаклёвка" },
        { value: 2, label: "Имитация бруса 14×96 мм" },
      ],
    },
    {
      key: "withVapourBarrier",
      label: "Пароизоляция",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Без пароизоляции (технические помещения)" },
        { value: 1, label: "Плёнка пароизоляционная (Изоспан Б)" },
        { value: 2, label: "Армированная пароизоляция Изоспан С" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const roofArea = Math.max(10, inputs.roofArea ?? 60);
    const insulationThicknessMm = inputs.insulationThickness ?? 200;
    const insulationType = Math.round(inputs.insulationType ?? 0);
    const finishType = Math.round(inputs.finishType ?? 0);
    const withVapourBarrier = Math.round(inputs.withVapourBarrier ?? 1);

    // Слои утепления: толщина / толщину плиты
    const plateThickness = insulationType === 1 ? 150 : 100; // мм
    const layerCount = Math.ceil(insulationThicknessMm / plateThickness);

    const warnings: string[] = [];
    const materials = [];

    // Ветрозащитная мембрана (под кровлей) — снаружи утеплителя
    const windMembraneRolls = Math.ceil(roofArea * 1.15 / 70); // рулон 70 м²
    materials.push({
      name: "Ветрозащитная мембрана TYVEK Housewrap (рулон 70 м²)",
      quantity: roofArea * 1.15 / 70,
      unit: "рулонов",
      withReserve: windMembraneRolls,
      purchaseQty: windMembraneRolls,
      category: "Мембрана",
    });

    // Утеплитель
    const insulationNames = [
      "Rockwool Лайт Баттс 100 мм (плита 1000×600 мм, 0.6 м²)",
      "URSA ROOF 150 мм (плита 1000×600 мм, 0.6 м²)",
      "Knauf Insulation Roof 100 мм (плита 1200×600 мм, 0.72 м²)",
    ];
    const plateareas = [0.6, 0.6, 0.72];
    const plateArea = plateareas[insulationType];

    const insPlates = Math.ceil(roofArea * 1.05 / plateArea) * layerCount;
    materials.push({
      name: insulationNames[insulationType] + ` (${layerCount} слой${layerCount > 1 ? "я" : ""})`,
      quantity: roofArea * 1.05 / plateArea * layerCount,
      unit: "плит",
      withReserve: insPlates,
      purchaseQty: insPlates,
      category: "Утеплитель",
    });

    // Пароизоляция (изнутри утеплителя)
    if (withVapourBarrier > 0) {
      const vbNames = [
        "",
        "Изоспан Б (плёнка пароизоляционная, рулон 70 м²)",
        "Изоспан С (армированная пароизоляция, рулон 70 м²)",
      ];
      const vbRolls = Math.ceil(roofArea * 1.15 / 70);
      materials.push({
        name: vbNames[withVapourBarrier],
        quantity: roofArea * 1.15 / 70,
        unit: "рулонов",
        withReserve: vbRolls,
        purchaseQty: vbRolls,
        category: "Пароизоляция",
      });

      // Лента соединительная для пароизоляции
      const tapeRolls = Math.ceil(roofArea / 40);
      materials.push({
        name: "Лента соединительная для пароизоляции (рулон 25 м)",
        quantity: roofArea / 40,
        unit: "рулонов",
        withReserve: tapeRolls,
        purchaseQty: tapeRolls,
        category: "Пароизоляция",
      });
    }

    // Обшивка
    if (finishType === 0 || finishType === 2) {
      // Вагонка/имитация бруса
      const panelWidth = finishType === 0 ? 96 : 96; // мм
      const panelLength = 3; // м
      const panelArea = (panelWidth / 1000) * panelLength;
      const panelCount = Math.ceil(roofArea * 1.12 / panelArea);
      materials.push({
        name: finishType === 0 ? "Вагонка сосна 96×3000 мм" : "Имитация бруса 96×3000 мм",
        quantity: roofArea * 1.12 / panelArea,
        unit: "шт",
        withReserve: panelCount,
        purchaseQty: panelCount,
        category: "Отделка",
      });

      // Обрешётка
      const lathenRows = Math.ceil(roofArea / 0.4);
      const lathenPcs = Math.ceil(lathenRows * 2.5 / 2); // рейки по 2 м
      materials.push({
        name: "Брусок обрешётки 30×40 мм, 2 м",
        quantity: lathenRows * 2.5 / 2,
        unit: "шт",
        withReserve: lathenPcs,
        purchaseQty: lathenPcs,
        category: "Обрешётка",
      });

      // Антисептик
      const antisepticLiters = Math.ceil(roofArea * 0.1);
      materials.push({
        name: "Антисептик для дерева (канистра 5 л)",
        quantity: roofArea * 0.1 / 5,
        unit: "канистр",
        withReserve: Math.ceil(roofArea * 0.1 / 5),
        purchaseQty: Math.ceil(roofArea * 0.1 / 5),
        category: "Защита",
      });

    } else {
      // ГКЛ
      const gklSheets = Math.ceil(roofArea * 1.1 / 3);
      materials.push({
        name: "ГКЛ влагостойкий ГКЛВ 12.5 мм (лист 1200×2500 мм)",
        quantity: roofArea * 1.1 / 3,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "ГКЛ",
      });

      const profileRows = Math.ceil(roofArea / 0.6);
      const profilePcs = Math.ceil(profileRows * 2.5 / 3);
      materials.push({
        name: "Профиль ПП 60×27 мм, 3 м (каркас для ГКЛ)",
        quantity: profileRows * 2.5 / 3,
        unit: "шт",
        withReserve: profilePcs,
        purchaseQty: profilePcs,
        category: "Профиль",
      });

      const puttyBags = Math.ceil(roofArea * 0.5 / 25);
      materials.push({
        name: "Шпаклёвка Knauf Фуген (мешок 25 кг)",
        quantity: roofArea * 0.5 / 25,
        unit: "мешков",
        withReserve: Math.max(1, puttyBags),
        purchaseQty: Math.max(1, puttyBags),
        category: "Шпаклёвка",
      });
    }

    if (insulationThicknessMm < 200) {
      warnings.push(`Толщина ${insulationThicknessMm} мм для жилой мансарды в Центральной России может быть недостаточной — рекомендуется 200 мм`);
    }
    if (withVapourBarrier === 0) {
      warnings.push("Без пароизоляции утеплитель быстро намокнет от конденсата и потеряет свойства — пароизоляция обязательна!");
    }
    warnings.push("Между утеплителем и кровлей необходим вентиляционный зазор 40–50 мм для отвода конденсата");

    const scenarios = buildNativeScenarios({
      id: "attic-main",
      title: "Attic main",
      exactNeed: roofArea * 1.05 / plateArea * layerCount,
      unit: "плит",
      packageSizes: [1],
      packageLabelPrefix: "attic-insulation-plate",
    });

    return {
      materials,
      totals: {
        roofArea,
        layerCount,
        insulationThicknessMm,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт утепления мансарды:**
- Слоёв утеплителя = толщина / толщину плиты
- Rockwool Лайт Баттс 100 мм: площадь × 1.05 / 0.6 м² × слоёв
- Мембрана и пароизоляция: площадь × 1.15 (нахлёст 15%)
  `,
  howToUse: [
    "Введите площадь кровельного ската",
    "Выберите толщину и тип утеплителя",
    "Выберите отделку и пароизоляцию",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какую толщину утеплителя брать для мансарды?",
      answer: "Толщина утеплителя для мансарды зависит от региона, конструкции крыши, типа утеплителя и того, будет ли помещение использоваться как полноценное жилое пространство круглый год. На практике для жилой мансарды часто рассматривают не менее 150–200 мм, но окончательный выбор лучше делать по теплотехническому расчёту и фактической схеме кровельного пирога, а не только по общему ориентиру из похожих домов, особенно если крыша имеет сложную форму и ограниченную высоту стропил для полноценного слоя утепления. Ошибка здесь часто возникает из-за того, что полезную толщину считают по стропилам, но забывают про вентиляционный зазор, реальную сборку узла и мостики холода по древесине, из-за чего итоговая теплоизоляция выходит слабее ожидаемой. Если высоты стропил не хватает, часто приходится добирать толщину перекрёстным слоем изнутри, а не просто мириться с недоутеплением. Толщину лучше выбирать не по привычке бригады, а по климату и целевому режиму проживания, потому что мансарда быстрее остальных зон реагирует на недоутепление. Её подбирают по региону, конструкции кровли и целевому режиму использования, потому что сезонная дача и тёплая мансарда для постоянного проживания требуют разного сопротивления теплопередаче. Её считают по региону, конструкции кровли и режиму эксплуатации, потому что сезонная мансарда и тёплое жилое помещение требуют разного сопротивления теплопередаче. В мансарде толщина особенно важна, потому что через скаты тепло уходит быстрее, чем через обычные вертикальные стены. Толщину здесь лучше проверять не по усреднённому совету, а по климату, высоте стропил и реальной схеме всего пирога."
    },
    {
      question: "Нужны ли пароизоляция и мембрана в мансарде?",
      answer: "Да, для утеплённой мансарды обычно нужны и пароизоляция со стороны помещения, и кровельная мембрана со стороны холода, потому что эти слои работают в разных узлах и решают разные задачи по влагообмену. Вместе они защищают утеплитель от намокания, снижения тепловых свойств, образования конденсата и ускоренного старения конструкции крыши, а отсутствие хотя бы одного из слоёв часто приводит к скрытым проблемам уже в первые сезоны эксплуатации, когда влага дольше всего держится внутри пирога, смачивает стропильную систему, утеплитель, крепёж, древесину обрешётки и ухудшает работу всего узла вентиляции подкровельного пространства, особенно если стыки плёнок выполнены без нормальной проклейки. На мансарде именно эти два слоя чаще всего определяют, будет ли утепление реально работать годами, а не только выглядеть правильным в разрезе проекта и сметы. В мансарде ошибка в одном из этих слоёв быстро бьёт и по утеплению, и по отделке, поэтому экономить на целостности пирога обычно дороже, чем на самом материале. Пароизоляцию ставят со стороны тёплого помещения, а диффузионную мембрану — со стороны кровли, иначе утеплитель быстро набирает влагу и теряет расчётную эффективность. Да, потому что одна защищает утеплитель от тёплого влажного воздуха изнутри, а другая помогает вывести влагу со стороны кровли без намокания слоя. Да, без правильного порядка слоёв утеплитель быстрее намокает, а древесина и отделка служат заметно меньше. На мансарде ошибка в этих слоях особенно дорогая, потому что исправлять её обычно приходится уже через вскрытие готовой отделки. В мансарде особенно важно не путать стороны укладки этих слоёв, потому что ошибка в одном месте потом раскрывается уже через сырость в утеплителе и отделке."
    }
  ],
};


