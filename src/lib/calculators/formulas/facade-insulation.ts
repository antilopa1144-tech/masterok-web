import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const facadeInsulationDef: CalculatorDefinition = {
  id: "insulation_mineral_wool",
  slug: "uteplenie-fasada-minvatoj",
  title: "Калькулятор утепления фасада минватой",
  h1: "Калькулятор утепления фасада минватой — расчёт материалов",
  description: "Рассчитайте количество минеральной ваты, клея, дюбелей и штукатурки для утепления фасада по системе СФТК (мокрый фасад).",
  metaTitle: withSiteMetaTitle("Калькулятор утепления фасада минватой | СФТК"),
  metaDescription: "Бесплатный калькулятор утепления фасада: рассчитайте минвату, клей, дюбели-грибки, армосетку, грунтовку и штукатурку для мокрого фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["утепление фасада", "минвата", "мокрый фасад", "СФТК", "ROCKWOOL"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь фасада (за вычетом проёмов)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 2000,
      step: 5,
      defaultValue: 100,
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм (Московская обл., тёплые регионы)" },
        { value: 80, label: "80 мм" },
        { value: 100, label: "100 мм (рекомендуется)" },
        { value: 120, label: "120 мм" },
        { value: 150, label: "150 мм (Сибирь, Урал)" },
        { value: 200, label: "200 мм (крайний север)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минвата фасадная (ROCKWOOL Fasrock, KNAUF)" },
        { value: 1, label: "ЭППС (пенополистирол, для нежилых зданий)" },
      ],
    },
    {
      key: "finishType",
      label: "Финишный слой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Декоративная штукатурка «короед»" },
        { value: 1, label: "Декоративная штукатурка «шуба»" },
        { value: 2, label: "Под покраску (тонкий слой)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(10, inputs.area ?? 100);
    const thickness = inputs.thickness ?? 100;
    const insulationType = Math.round(inputs.insulationType ?? 0);
    const finishType = Math.round(inputs.finishType ?? 0);

    const warnings: string[] = [];
    const materials = [];

    // Утеплитель
    const areaWithReserve = area * 1.05;

    if (insulationType === 0) {
      // Минвата фасадная, плиты 600×1200 мм = 0.72 м²
      const platesNeeded = Math.ceil(areaWithReserve / 0.72);
      materials.push({
        name: `Минвата фасадная ${thickness} мм (плита 600×1200 мм, 0.72 м²)`,
        quantity: areaWithReserve / 0.72,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Утеплитель",
      });
    } else {
      // ЭППС плиты 1200×600 мм = 0.72 м²
      const platesNeeded = Math.ceil(areaWithReserve / 0.72);
      materials.push({
        name: `ЭППС ${thickness} мм (плита 1200×600 мм, 0.72 м²)`,
        quantity: areaWithReserve / 0.72,
        unit: "плит",
        withReserve: platesNeeded,
        purchaseQty: platesNeeded,
        category: "Утеплитель",
      });
      warnings.push("ЭППС на фасаде не рекомендуется для жилых зданий — допустим только минвата (требование пожарных норм СП 2.13130)");
    }

    // Клей-пена или сухая клеевая смесь для минваты
    // Расход клея: 4 кг/м² (смесь Ceresit CT 180, Weber.Therm)
    const glueConsumption = insulationType === 0 ? 4 : 5; // кг/м²
    const totalGlueKg = area * glueConsumption;
    const glueBags = Math.ceil(totalGlueKg / 25);
    materials.push({
      name: `Клей для утеплителя (мешок 25 кг, расход ~${glueConsumption} кг/м²)`,
      quantity: totalGlueKg / 25,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Клей",
    });

    // Дюбели-грибки TERMOCLIP 10×(100+thickness) мм
    // 5–6 шт/м² для минваты, 4 шт/м² для ЭППС
    const dubelsPerM2 = insulationType === 0 ? 6 : 4;
    const dubelsTotal = Math.ceil(area * dubelsPerM2 * 1.05);
    materials.push({
      name: `Дюбель-грибок фасадный TERMOCLIP 10×${thickness + 60} мм`,
      quantity: area * dubelsPerM2,
      unit: "шт",
      withReserve: dubelsTotal,
      purchaseQty: dubelsTotal,
      category: "Крепёж",
    });

    // Базовый штукатурный слой + армосетка
    // Армосетка стеклотканевая 145 г/м², рулон 50 м²
    const meshArea = area * 1.15; // нахлёст 15%
    const meshRolls = Math.ceil(meshArea / 50);
    materials.push({
      name: "Сетка фасадная стеклотканевая 145 г/м² (рулон 50 м²)",
      quantity: meshArea / 50,
      unit: "рулонов",
      withReserve: meshRolls,
      purchaseQty: meshRolls,
      category: "Армирование",
    });

    // Клеевой состав для армировки (Ceresit CT 85, Weber.Therm Armat) ~4 кг/м²
    const armKg = area * 4;
    const armBags = Math.ceil(armKg / 25);
    materials.push({
      name: "Штукатурно-клеевой состав для армировки (мешок 25 кг, ~4 кг/м²)",
      quantity: armKg / 25,
      unit: "мешков",
      withReserve: armBags,
      purchaseQty: armBags,
      category: "Армирование",
    });

    // Грунтовка (Ceresit CT 16 или аналог) — 1 л на 4 м²
    const primerLiters = area / 4 * 1.1;
    const primerCans = Math.ceil(primerLiters / 10); // канистра 10 л
    materials.push({
      name: "Грунтовка адгезионная (канистра 10 л, ~0.25 л/м²)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    });

    // Декоративная штукатурка
    let plasterConsumption: number; // кг/м²
    let plasterName: string;
    switch (finishType) {
      case 0: plasterConsumption = 3.5; plasterName = "Декоративная штукатурка «короед» (мешок 25 кг, ~3.5 кг/м²)"; break;
      case 1: plasterConsumption = 4.5; plasterName = "Декоративная штукатурка «шуба» (мешок 25 кг, ~4.5 кг/м²)"; break;
      default: plasterConsumption = 2.5; plasterName = "Финишная штукатурка под покраску (мешок 25 кг, ~2.5 кг/м²)"; break;
    }
    const plasterKg = area * plasterConsumption;
    const plasterBags = Math.ceil(plasterKg / 25);
    materials.push({
      name: plasterName,
      quantity: plasterKg / 25,
      unit: "мешков",
      withReserve: plasterBags,
      purchaseQty: plasterBags,
      category: "Штукатурка",
    });

    // Профиль цокольный (стартовый) — погонные метры по периметру
    // Предполагаем периметр ≈ √(area) × 4 (упрощение)
    const perimeter = Math.sqrt(area) * 4;
    const profileLength = perimeter * 1.05;
    const profilePcs = Math.ceil(profileLength / 2); // профили по 2 м
    materials.push({
      name: "Профиль цокольный стартовый 2 м",
      quantity: profileLength / 2,
      unit: "шт",
      withReserve: profilePcs,
      purchaseQty: profilePcs,
      category: "Комплектующие",
    });

    if (thickness < 100) {
      warnings.push(`Толщина ${thickness} мм может не обеспечить нормативное сопротивление теплопередаче для жилых зданий — проверьте теплотехнический расчёт`);
    }
    if (area > 500) {
      warnings.push("При площади >500 м² рекомендуется разбить фасад на захватки и использовать леса с допуском нагрузки");
    }

    const scenarios = buildNativeScenarios({
      id: "facade-insulation-main",
      title: "Facade insulation main",
      exactNeed: areaWithReserve,
      unit: "м²",
      packageSizes: [1],
      packageLabelPrefix: "facade-insulation-m2",
    });

    return {
      materials,
      totals: { area, thickness } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт материалов для мокрого фасада (СФТК):**
- Утеплитель: площадь × 1.05 / 0.72 м² (плита 600×1200)
- Клей: ~4 кг/м² (мешки 25 кг)
- Дюбели-грибки: 6 шт/м² (минвата), 4 шт/м² (ЭППС)
- Армосетка: площадь × 1.15 (нахлёст)
- Штукатурка «короед»: ~3.5 кг/м²
  `,
  howToUse: [
    "Введите площадь фасада (без окон и дверей)",
    "Выберите толщину утеплителя",
    "Выберите тип утеплителя и финишный слой",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Что выбрать для утепления фасада: минвату или ЭППС?",
      answer: "Минвату чаще выбирают для паропроницаемых фасадов и систем, где важны негорючесть, работа стены на выход влаги и хорошая совместимость с минеральными штукатурными слоями. ЭППС подходит там, где особенно важны влагостойкость и высокая прочность, но требует правильно подобранного узла, аккуратной схемы монтажа и совместимости со всей фасадной системой, а не только с самим утеплителем, особенно в цокольных, приоконных и наиболее нагруженных зонах фасада, где материал испытывает больше влаги и механических нагрузок. Ошибка обычно возникает, когда утеплитель выбирают по одному свойству, не проверяя весь фасадный пирог, условия эксплуатации и схему выхода влаги из узла, а это потом бьёт уже по долговечности всей системы. На практике ЭППС чаще оправдан в цокольной и влажной зоне, а минвата — в основном фасадном поле, где важнее паропроницаемость и пожарная логика системы. На практике ЭППС чаще оправдан в цокольной и влажной зоне, а минвата — в основном фасадном поле, где важнее паропроницаемость и пожарная логика системы. Выбор всегда увязывают с паропроницаемостью стены, пожарными требованиями, типом фасадной системы и влажностным режимом узла, а не только с теплопроводностью. Минвату чаще выбирают там, где важны паропроницаемость и пожарные требования, а ЭППС — где критичны влагостойкость и высокая прочность, но решение всегда привязывают к системе фасада. Выбор зависит от паропроницаемости стены, пожарных требований, системы фасада и влажностного режима, а не только от цены. Тут важен не только коэффициент теплопроводности, но и вся система фасада: паропроницаемость, пожарные требования и тип отделки."
    },
    {
      question: "Сколько дюбелей-грибков нужно на фасад?",
      answer: "Обычно на фасад берут 4–6 дюбелей-грибков на 1 м², но точный расход зависит от типа утеплителя, высоты здания, прочности основания, ветровой нагрузки и требований конкретной фасадной системы, а не только от чистой площади. В угловых, приоконных, цокольных и ветровых зонах крепёж часто усиливают, поэтому среднюю норму всегда лучше проверять по реальному узлу утепления, а не считать её универсальной для всего фасада, особенно на верхних этажах, открытых фасадах с повышенной парусностью и в местах усиления вокруг проёмов. На практике именно углы, откосы, верхние зоны фасада и участки рядом с деформационными швами чаще всего требуют более осторожного подхода к крепежу, потому что там отрыв и трещины проявляются раньше всего. На слабом основании полезно сразу проверять не только количество, но и фактическую длину анкеровки дюбеля в несущем слое. На высотных и ветровых фасадах безопаснее сразу ориентироваться на схему крепления из системы производителя, а не на усреднённый минимум по плоскости. На фасадах выше одного этажа и в продуваемых местах схему крепления лучше проверять по ветровой зоне, а не оставлять только усреднённый базовый шаг. Количество зависит от высоты здания, ветровой зоны, типа основания, формата плит и схемы крепления, поэтому одинаковая площадь фасада может давать разный расход. На углах, по кромкам плит и в ветровых зонах крепёж обычно ставят чаще, чем на спокойной середине фасада. На углах здания, у проёмов и в ветровых зонах крепёж почти всегда ставят чаще, чем в середине фасада. Для тяжёлых фасадных систем и слабых оснований полезно заранее сверять крепёж не только по расходу, но и по допустимой вырывной нагрузке."
    }
  ],
};


