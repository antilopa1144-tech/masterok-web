import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const sewageDef: CalculatorDefinition = {
  id: "sewage",
  slug: "septik",
  title: "Калькулятор септика",
  h1: "Калькулятор септика онлайн — расчёт объёма и материалов",
  description: "Рассчитайте объём септика, количество бетонных колец, труб и сопутствующих материалов для автономной канализации.",
  metaTitle: withSiteMetaTitle("Калькулятор септика | Расчёт объёма и бетонных колец"),
  metaDescription: "Бесплатный калькулятор септика: рассчитайте объём по количеству жильцов, бетонные кольца, трубы, щебень и геотекстиль для автономной канализации частного дома.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["септик", "канализация", "бетонные кольца", "автономная канализация"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "residents",
      label: "Количество проживающих",
      type: "slider",
      unit: "чел",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
      hint: "Норма водоотведения — 200 литров/сутки на человека (СП 30.13330)",
    },
    {
      key: "septikType",
      label: "Тип септика",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Из бетонных колец (КС 10-9)" },
        { value: 1, label: "Пластиковый заводской" },
        { value: 2, label: "Из еврокубов (IBC-контейнеры)" },
      ],
    },
    {
      key: "chambersCount",
      label: "Количество камер",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 камера — минимальная очистка" },
        { value: 2, label: "2 камеры — стандарт (рекомендуется)" },
        { value: 3, label: "3 камеры — максимальная очистка" },
      ],
      hint: "2–3 камеры обеспечивают лучшую очистку стоков",
    },
    {
      key: "pipeLength",
      label: "Длина трубопровода от дома",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 10,
      hint: "Расстояние от дома до септика (мин. 5 м по СанПиН)",
    },
    {
      key: "groundType",
      label: "Тип грунта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Песок — хорошая фильтрация" },
        { value: 1, label: "Суглинок — средняя фильтрация" },
        { value: 2, label: "Глина — плохая фильтрация" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const residents = Math.max(1, Math.round(inputs.residents ?? 4));
    const septikType = Math.round(inputs.septikType ?? 0);
    const chambersCount = Math.max(1, Math.min(3, Math.round(inputs.chambersCount ?? 2)));
    const pipeLength = Math.max(1, inputs.pipeLength ?? 10);
    const groundType = Math.round(inputs.groundType ?? 0);

    // Суточный объём стоков: 200 л/сут на человека (СП 30.13330)
    // Use integer arithmetic (liters) to avoid floating-point rounding issues
    const dailyVolumeLiters = residents * 200;
    const dailyVolume = dailyVolumeLiters / 1000; // м³/сут
    // Трёхсуточный запас (СП 32.13330)
    const totalVolumeLiters = dailyVolumeLiters * 3;
    const totalVolume = totalVolumeLiters / 1000;
    const volumePerChamber = totalVolume / chambersCount;

    const materials: import("../types").MaterialResult[] = [];
    const warnings: string[] = [];

    // --- Тип септика ---
    if (septikType === 0) {
      // Бетонные кольца КС 10-9: Ø наружный 1160 мм, Ø внутренний 1000 мм, h=890 мм
      // Рабочий объём одного кольца ≈ 0.71 м³
      const ringVolume = 0.71;
      const ringsPerChamber = Math.ceil(volumePerChamber / ringVolume);
      const totalRings = ringsPerChamber * chambersCount;

      materials.push(
        {
          name: "Кольцо бетонное КС 10-9 (Ø1000, h=890 мм)",
          quantity: totalRings,
          unit: "шт",
          withReserve: totalRings,
          purchaseQty: totalRings,
          category: "Бетонные изделия",
        },
        {
          name: "Днище КЦД-10 (плита донная Ø1200 мм)",
          quantity: chambersCount,
          unit: "шт",
          withReserve: chambersCount,
          purchaseQty: chambersCount,
          category: "Бетонные изделия",
        },
        {
          name: "Крышка КЦП 1-10 (плита перекрытия Ø1200 мм)",
          quantity: chambersCount,
          unit: "шт",
          withReserve: chambersCount,
          purchaseQty: chambersCount,
          category: "Бетонные изделия",
        },
        {
          name: "Люк полимерно-песчаный (или чугунный)",
          quantity: chambersCount,
          unit: "шт",
          withReserve: chambersCount,
          purchaseQty: chambersCount,
          category: "Бетонные изделия",
        },
        {
          name: "Кольцо уплотнительное (герметик межкольцевой)",
          quantity: totalRings,
          unit: "шт",
          withReserve: totalRings,
          purchaseQty: totalRings,
          category: "Герметизация",
        },
      );
    } else if (septikType === 1) {
      // Пластиковый заводской септик
      materials.push(
        {
          name: `Септик пластиковый (объём от ${totalVolumeLiters} л)`,
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Септик",
        },
        {
          name: "Песок для обсыпки (подушка + обратная засыпка)",
          quantity: Math.round(totalVolume * 0.5 * 100) / 100,
          unit: "м³",
          withReserve: Math.ceil(totalVolume * 0.5),
          purchaseQty: Math.ceil(totalVolume * 0.5),
          category: "Засыпка",
        },
      );
    } else {
      // Еврокубы (IBC ~1000 л, рабочий объём ~800 л = 0.8 м³)
      const eurocubes = Math.ceil(totalVolume / 0.8);
      materials.push(
        {
          name: "Еврокуб IBC 1000 л (рабочий объём ~800 л)",
          quantity: eurocubes,
          unit: "шт",
          withReserve: eurocubes,
          purchaseQty: eurocubes,
          category: "Септик",
        },
      );
    }

    // --- Общие материалы (трубопровод) ---
    // Трубы ПВХ канализационные 110 мм (секции по 3 м)
    const pipeSections = Math.ceil(pipeLength * 1.05 / 3);
    materials.push(
      {
        name: "Труба канализационная ПВХ Ø110 мм (3 м)",
        quantity: Math.round(pipeLength / 3 * 100) / 100,
        unit: "шт",
        withReserve: pipeSections,
        purchaseQty: pipeSections,
        category: "Трубы",
      },
      {
        name: "Отвод канализационный Ø110 мм (45°/90°)",
        quantity: 3,
        unit: "шт",
        withReserve: 3,
        purchaseQty: 3,
        category: "Фитинги",
      },
      {
        name: "Тройник канализационный Ø110 мм",
        quantity: 2,
        unit: "шт",
        withReserve: 2,
        purchaseQty: 2,
        category: "Фитинги",
      },
    );

    // --- Щебень для фильтрации (зависит от грунта) ---
    const gravelVolumes: Record<number, number> = { 0: 0, 1: 2, 2: 4 };
    const gravelVolume = gravelVolumes[groundType] ?? 0;
    if (gravelVolume > 0) {
      materials.push({
        name: "Щебень фракция 20–40 мм (для фильтрационного поля)",
        quantity: gravelVolume,
        unit: "м³",
        withReserve: gravelVolume,
        purchaseQty: gravelVolume,
        category: "Фильтрация",
      });
    }

    // --- Геотекстиль (для суглинка и глины) ---
    if (groundType >= 1) {
      const geotextileArea = Math.ceil(totalVolume * 2);
      materials.push({
        name: "Геотекстиль (плотность 200 г/м²)",
        quantity: totalVolume * 2,
        unit: "м²",
        withReserve: geotextileArea,
        purchaseQty: geotextileArea,
        category: "Фильтрация",
      });
    }

    // --- Предупреждения ---
    if (groundType === 2) {
      warnings.push("Глинистый грунт: фильтрация затруднена. Рекомендуется дренажный тоннель или поле фильтрации с подсыпкой");
    }
    if (residents > 10) {
      warnings.push("Для > 10 человек рекомендуется станция биологической очистки (ЛОС) вместо септика");
    }
    if (chambersCount === 1) {
      warnings.push("Однокамерный септик — минимальная очистка. Рекомендуется 2–3 камеры");
    }

    const scenarios = buildNativeScenarios({
      id: "sewage-main",
      title: "Sewage main",
      exactNeed: totalVolume,
      unit: "м³",
      packageSizes: [0.1],
      packageLabelPrefix: "sewage-volume",
    });

    return {
      materials,
      totals: {
        residents,
        dailyVolume: Math.round(dailyVolume * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        volumePerChamber: Math.round(volumePerChamber * 100) / 100,
        chambersCount,
        pipeLength,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт септика по СП 32.13330 и СП 30.13330:**

Суточный объём = Количество_жильцов × 200 л/сут
Объём септика = Суточный_объём × 3 (трёхсуточный запас)

**Бетонные кольца КС 10-9:**
- Ø внутренний 1000 мм, высота 890 мм
- Объём одного кольца ≈ 0.71 м³
- Каждая камера: днище + кольца + крышка + люк

**Минимальные расстояния (СанПиН 2.1.4.1110):**
- От дома — 5 м
- От колодца — 30–50 м
- От забора — 2 м
  `,
  howToUse: [
    "Укажите количество проживающих",
    "Выберите тип септика (бетонные кольца — самый популярный)",
    "Укажите количество камер (2 — стандарт)",
    "Задайте длину трубопровода от дома до септика",
    "Выберите тип грунта на участке",
    "Нажмите «Рассчитать» — получите полный перечень материалов",
  ],
faq: [
    {
      question: "Сколько камер нужно для септика частного дома?",
      answer: "Для большинства частных домов с постоянным проживанием стандартным решением считают двухкамерный септик, потому что он даёт более стабильное отстаивание стоков и лучше работает в бытовом режиме, чем однокамерная ёмкость. При большом водоразборе, большом числе жильцов, наличии нескольких санузлов и более высоких требованиях к очистке обычно рассматривают уже трёхкамерную схему или даже другой тип локальной очистки, чтобы не перегружать систему на пиковом сливе и не терять эффективность в периоды максимального использования воды, особенно если часть сбросов приходится на ванну, стиральную машину, кухню и сезонный приезд гостей одновременно. Чем выше неравномерность водоразбора по дням и сезонам, тем важнее не занижать схему очистки. Если на участке высокий УГВ или мало места под фильтрацию, вопрос количества камер лучше сразу увязывать с типом всей системы, а не рассматривать отдельно. Для постоянного проживания и заметного расхода воды двух- и трёхкамерные схемы обычно работают стабильнее, потому что дают более предсказуемое отстаивание и меньшую нагрузку на доочистку. Это зависит от расхода стоков, схемы очистки и требований участка: при небольшой сезонной нагрузке хватает более простой схемы, а для постоянного проживания часто нужна многоступенчатая. При сезонном проживании и малом расходе избыточный объём тоже не всегда выгоден, если система плохо работает в полупустом режиме. Количество камер выбирают по объёму стоков и режиму проживания, а не по одному универсальному правилу для всех домов. Решение здесь обычно упирается в режим проживания, объём стоков и схему доочистки, а не только в абстрактное число камер."
    },
    {
      question: "Как выбрать объём септика?",
      answer: "Объём септика обычно выбирают по числу проживающих, суточному водопотреблению и трёхсуточному запасу, чтобы система успевала нормально отстаивать стоки и не работала на пределе даже в пиковые дни. Чем больше жильцов, сантехники, ванн, стиральных и посудомоечных машин, тем больше должна быть рабочая ёмкость септика и тем внимательнее нужно подбирать не только общий объём, но и количество камер и тип доочистки, особенно если дом используется постоянно, а не сезонно и на участок приходятся залповые сбросы воды и нерегулярные пиковые нагрузки в выходные. Ошибка по объёму обычно быстрее всего проявляется именно на залповых сбросах и в сезон пиковой нагрузки на систему, когда септик начинает работать без необходимого запаса по времени отстаивания. Если дом заселяется неравномерно, полезно считать объём ещё и с поправкой на самые загруженные выходные, а не только на средний будний день. Для дома с ваннами, гостевыми заездами или несколькими санузлами безопаснее ориентироваться на пик пользования, а не на усреднённый расход, иначе система быстро упрётся в залповый режим. Его привязывают к числу пользователей, режиму проживания, суточному расходу воды и интервалу обслуживания, а не только к “типовому” объёму для площади дома. Его привязывают к числу пользователей, режиму проживания, суточному расходу воды и интервалу обслуживания, а не только к площади дома или рекламному объёму. Объём выбирают по числу пользователей, режиму проживания и запасу на пиковые сбросы, а не только по площади дома. Ошибка здесь быстрее всего проявляется не на бумаге, а в режиме пикового сброса и реальной частоте обслуживания."
    }
  ],
};


