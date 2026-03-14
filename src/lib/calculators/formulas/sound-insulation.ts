import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const soundInsulationDef: CalculatorDefinition = {
  id: "insulation_sound",
  slug: "zvukoizolyaciya",
  title: "Калькулятор звукоизоляции",
  h1: "Калькулятор звукоизоляции стен и пола — расчёт материалов",
  description: "Рассчитайте количество звукоизоляционных материалов (ЗИПС, Rockwool Акустик, виброизол) для стен, пола или потолка.",
  metaTitle: withSiteMetaTitle("Калькулятор звукоизоляции | Стены, пол, потолок"),
  metaDescription: "Бесплатный калькулятор звукоизоляции: рассчитайте ЗИПС панели, минвату, виброизол и гипсокартон для звукоизоляции стен, пола и потолка.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["звукоизоляция", "шумоизоляция", "ЗИПС", "Rockwool Акустик", "виброизол"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь обрабатываемой поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 25,
    },
    {
      key: "surface",
      label: "Тип поверхности",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стена (между соседями)" },
        { value: 1, label: "Пол (от соседей снизу)" },
        { value: 2, label: "Потолок (от соседей сверху)" },
      ],
    },
    {
      key: "systemType",
      label: "Система звукоизоляции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Базовая (ГКШП + акустическая вата)" },
        { value: 1, label: "ЗИПС панели (каркасная система)" },
        { value: 2, label: "Плавающий пол (стяжка на виброизоле)" },
        { value: 3, label: "Акустический подвесной потолок" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 25);
    const surface = Math.round(inputs.surface ?? 0);
    const systemType = Math.round(inputs.systemType ?? 0);

    const warnings: string[] = [];
    const materials = [];

    const areaWithReserve = area * 1.1;

    if (systemType === 0) {
      // Базовая система: ГКЛ + Rockwool Акустик Баттс
      // Акустическая вата (плиты 600×1000×50 мм = 0.6 м²)
      const woolPlates = Math.ceil(areaWithReserve / 0.6);
      materials.push({
        name: "Rockwool Акустик Баттс 50 мм (плита 600×1000 мм, 0.6 м²)",
        quantity: areaWithReserve / 0.6,
        unit: "плит",
        withReserve: woolPlates,
        purchaseQty: woolPlates,
        category: "Изоляция",
      });

      // Два слоя ГКШП 12.5 мм (гипсокартон шумопоглощающий)
      const gklSheets = Math.ceil(areaWithReserve * 2 / 3); // лист 3 м²
      materials.push({
        name: "ГКЛ 12.5 мм (лист 1200×2500 мм, 2 слоя)",
        quantity: areaWithReserve * 2 / 3,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "ГКЛ",
      });

      // Профиль ПП 60×27 через каждые 600 мм
      const profileLengthM = (area / 0.6) * 3 * 1.1; // рядов × длина × запас
      const profilePcs = Math.ceil(profileLengthM / 3);
      materials.push({
        name: "Профиль ПП 60×27 мм, 3 м (стойки каркаса)",
        quantity: profileLengthM / 3,
        unit: "шт",
        withReserve: profilePcs,
        purchaseQty: profilePcs,
        category: "Профиль",
      });

      // Виброподвесы для стен (каркас не должен касаться стены)
      const vibroCount = Math.ceil(area * 2 * 1.05); // 2 шт/м²
      materials.push({
        name: "Виброподвес прямой (шумоизолирующий)",
        quantity: area * 2,
        unit: "шт",
        withReserve: vibroCount,
        purchaseQty: vibroCount,
        category: "Виброзащита",
      });

      // Звукоизоляционная лента под профили
      const vibrotapeLength = Math.ceil(profileLengthM * 1.1);
      materials.push({
        name: "Лента виброакустическая самоклеящаяся (рулон 30 м)",
        quantity: profileLengthM / 30,
        unit: "рулонов",
        withReserve: Math.ceil(profileLengthM / 30),
        purchaseQty: Math.ceil(profileLengthM / 30),
        category: "Виброзащита",
      });

      // Саморезы
      const screwsPacks = Math.ceil(gklSheets * 25 / 200);
      materials.push({
        name: "Саморез ТН 3.5×25 мм (пачка 200 шт)",
        quantity: gklSheets * 25 / 200,
        unit: "пачек",
        withReserve: screwsPacks,
        purchaseQty: screwsPacks,
        category: "Крепёж",
      });

    } else if (systemType === 1) {
      // ЗИПС панели (готовые сэндвич-системы)
      const zipsPanelArea = 0.6 * 1.2; // 0.72 м² (600×1200 мм)
      const zipsPanels = Math.ceil(areaWithReserve / zipsPanelArea);
      materials.push({
        name: "ЗИПС панель (600×1200 мм, ~60 дБ)",
        quantity: areaWithReserve / zipsPanelArea,
        unit: "шт",
        withReserve: zipsPanels,
        purchaseQty: zipsPanels,
        category: "ЗИПС",
      });

      // Дюбели для ЗИПС
      const zipsDubels = Math.ceil(zipsPanels * 6 * 1.05);
      materials.push({
        name: "Дюбель-гвоздь 6×40 мм для крепления ЗИПС",
        quantity: zipsPanels * 6,
        unit: "шт",
        withReserve: zipsDubels,
        purchaseQty: zipsDubels,
        category: "Крепёж",
      });

      // ГКЛ поверх ЗИПС (финишный слой)
      const gklSheets = Math.ceil(areaWithReserve / 3);
      materials.push({
        name: "ГКЛ 12.5 мм поверх ЗИПС (лист 1200×2500 мм)",
        quantity: areaWithReserve / 3,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "ГКЛ",
      });

    } else if (systemType === 2) {
      // Плавающий пол
      const vibrorolls = Math.ceil(areaWithReserve / 20); // рулон 20 м²
      materials.push({
        name: "Виброизол (звукоизоляционный мат) рулон 20 м²",
        quantity: areaWithReserve / 20,
        unit: "рулонов",
        withReserve: vibrorolls,
        purchaseQty: vibrorolls,
        category: "Виброзащита",
      });

      // Демпферная лента по периметру
      const perimeterEst = Math.sqrt(area) * 4;
      const demfLength = Math.ceil(perimeterEst * 1.1);
      materials.push({
        name: "Демпферная лента 100×10 мм (рулон 25 м)",
        quantity: perimeterEst / 25,
        unit: "рулонов",
        withReserve: Math.ceil(perimeterEst / 25),
        purchaseQty: Math.ceil(perimeterEst / 25),
        category: "Виброзащита",
      });

      // Стяжка
      const screedKg = area * 0.05 * 1800; // 50 мм × 1800 кг/м³
      const screedBags = Math.ceil(screedKg / 50);
      materials.push({
        name: "ЦПС или наливной пол (мешок 50 кг, стяжка 50 мм)",
        quantity: screedKg / 50,
        unit: "мешков",
        withReserve: screedBags,
        purchaseQty: screedBags,
        category: "Стяжка",
      });

      warnings.push("Стяжка плавающего пола не должна касаться стен — демпферная лента обязательна по всему периметру");

    } else {
      // Акустический подвесной потолок
      const woolPlates = Math.ceil(areaWithReserve / 0.6);
      materials.push({
        name: "Rockwool Акустик Баттс 100 мм (плита 600×1000 мм)",
        quantity: areaWithReserve / 0.6,
        unit: "плит",
        withReserve: woolPlates,
        purchaseQty: woolPlates,
        category: "Изоляция",
      });

      const vibroSuspCount = Math.ceil(area * 1.5 * 1.05); // 1.5 шт/м²
      materials.push({
        name: "Виброподвес для потолка (антивибрационный)",
        quantity: area * 1.5,
        unit: "шт",
        withReserve: vibroSuspCount,
        purchaseQty: vibroSuspCount,
        category: "Виброзащита",
      });

      const gklSheets2 = Math.ceil(areaWithReserve * 2 / 3);
      materials.push({
        name: "ГКЛ 12.5 мм (лист 1200×2500 мм, 2 слоя)",
        quantity: areaWithReserve * 2 / 3,
        unit: "листов",
        withReserve: gklSheets2,
        purchaseQty: gklSheets2,
        category: "ГКЛ",
      });
    }

    // Герметик акриловый для заделки швов: 1 туба на 20 м.п.
    const perimeterEst2 = Math.sqrt(area) * 4;
    // Длина швов: по периметру + по стыкам листов ≈ периметр × 2
    const jointLength = perimeterEst2 * 2;
    const sealantTubes = Math.ceil(jointLength / 20);
    materials.push({
      name: "Герметик акриловый звукоизоляционный (310 мл, туба)",
      quantity: jointLength / 20,
      unit: "шт",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Герметик",
    });

    // Уплотнительная лента (по периметру стены × 2 — верх и низ / боковые примыкания)
    const sealTapeLength = perimeterEst2 * 2;
    const sealTapeWithReserve = Math.ceil(sealTapeLength * 1.1);
    const sealTapeRolls = Math.ceil(sealTapeWithReserve / 30); // рулон 30 м
    materials.push({
      name: "Уплотнительная лента самоклеящаяся (рулон 30 м)",
      quantity: sealTapeLength,
      unit: "м.п.",
      withReserve: sealTapeWithReserve,
      purchaseQty: sealTapeRolls,
      category: "Примыкания",
    });

    if (systemType <= 1 && surface === 0) {
      warnings.push("Звукоизоляция стены уменьшит площадь комнаты — учитывайте толщину системы (от 70 до 150 мм)");
    }
    warnings.push("Для эффективной звукоизоляции все зазоры и стыки должны быть тщательно заделаны акустическим герметиком");

    const scenarios = buildNativeScenarios({
      id: "sound-insulation-main",
      title: "Sound insulation main",
      exactNeed: areaWithReserve,
      unit: "м²",
      packageSizes: [1],
      packageLabelPrefix: "sound-insulation-m2",
    });

    return {
      materials,
      totals: { area } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт звукоизоляции (базовая система):**
- Акустическая вата: площадь × 1.10 / 0.6 м² (плита)
- ГКЛ 2 слоя: площадь × 2 × 1.10 / 3 м² (лист)
- Виброподвесы: ~2 шт/м²
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип поверхности и систему изоляции",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Достаточно ли одного слоя звукоизоляции для стены?",
      answer: "Одного слоя звукоизоляции достаточно далеко не всегда, потому что итоговый эффект зависит от исходной стены, типа шума и того, насколько система разрывает жёсткие связи между конструкциями. Для заметного результата обычно считают не только вату, но и каркас, многослойную обшивку, акустический герметик и правильные примыкания без звуковых мостиков, иначе один слой материала сам по себе часто даёт результат слабее ожидаемого, особенно против ударного и структурного шума в многоквартирном доме, где звук легко уходит через стыки плит, коробки розеток, инженерные проходки, примыкания к потолку и сопряжения со смежными конструкциями, а не только через саму плоскость стены. Ошибка здесь чаще всего в том, что «один слой» считают готовой системой, хотя у шума почти всегда находится обходной путь. Если источник шума жёсткий и регулярный, лучше сразу проектировать систему как многослойный узел, а не надеяться, что один материал перекроет все пути передачи звука. В квартирах реальный результат обычно даёт не одиночный материал, а правильно собранный многослойный узел без жёстких мостиков по примыканиям и коробкам. Не всегда, потому что итоговый эффект зависит не только от толщины материала, но и от каркаса, развязки, герметизации швов и того, какой именно шум нужно гасить. Один слой редко даёт заметный результат без правильного каркаса, развязки и герметизации всех примыканий. Обычно нет: без многослойного узла и герметизации примыканий эффект одного слоя оказывается заметно ниже ожиданий. Один слой редко решает задачу сам по себе, если не закрыты примыкания, каркас и общая масса системы."
    },
    {
      question: "Почему при звукоизоляции важен акустический герметик?",
      answer: "Даже небольшие щели, непроклеенные стыки и жёсткие примыкания заметно снижают эффективность звукоизоляционной системы, поэтому швы обычно обязательно заполняют акустическим герметиком уже на этапе сборки конструкции. Он важен не меньше, чем листы, профиль и вата, потому что именно через неплотности, подсосы и жёсткие швы звук чаще всего проходит быстрее, чем через сам изоляционный слой, и на практике именно эти мелочи чаще всего съедают ожидаемый эффект, даже если основные материалы выбраны правильно и смонтированы по схеме, а все остальные расходы уже понесены полностью, включая дорогую многослойную обшивку и разобщённый каркас. Особенно критичны места вокруг розеток, коробок и примыканий к потолку и полу. В таких узлах герметик фактически добирает ту герметичность контура, без которой даже хорошая звукоизоляционная схема начинает работать заметно хуже расчёта и ожиданий. Без него даже хороший пирог теряет часть эффекта на стыках и примыканиях, потому что звук уходит через щели быстрее, чем через сам материал в плоскости стены. Без него даже хороший каркас и вата теряют часть эффекта на примыканиях и щелях, потому что звук проходит не только через площадь конструкции, но и через неплотные узлы. Он нужен, чтобы не оставить жёсткие щели в примыканиях, через которые звук проходит даже при хорошем каркасе, вате и многослойной обшивке. Без него даже хороший пирог теряет эффективность на щелях, примыканиях и проходах коммуникаций. Экономия именно на герметике часто даёт самый дешёвый, но самый обидный провал по итоговому эффекту всей системы. Именно поэтому герметик обычно считают не второстепенной мелочью, а обязательной частью всей системы, как и листы или вату."
    }
  ],
};






