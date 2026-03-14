import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const ventilationDef: CalculatorDefinition = {
  id: "engineering_ventilation",
  slug: "ventilyaciya",
  title: "Калькулятор вентиляции",
  h1: "Калькулятор вентиляции — расчёт воздухообмена и каналов",
  description: "Рассчитайте требуемый воздухообмен, сечение вентиляционных каналов и диаметр вентилятора для квартиры, дома или офиса.",
  metaTitle: withSiteMetaTitle("Калькулятор вентиляции | Воздухообмен, каналы"),
  metaDescription: "Бесплатный калькулятор вентиляции: рассчитайте воздухообмен, воздуховоды и вентиляторы для квартиры или частного дома по нормам СП 54.13330.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["вентиляция", "воздухообмен", "вентилятор", "воздуховод", "приточная вентиляция"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "totalArea",
      label: "Общая площадь помещений",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 1000,
      step: 5,
      defaultValue: 80,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "select",
      defaultValue: 270,
      options: [
        { value: 250, label: "2.5 м" },
        { value: 270, label: "2.7 м (стандарт)" },
        { value: 300, label: "3.0 м" },
        { value: 350, label: "3.5 м" },
      ],
    },
    {
      key: "buildingType",
      label: "Тип здания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Квартира (жилая)" },
        { value: 1, label: "Частный дом (жилой)" },
        { value: 2, label: "Офис/коммерческое" },
        { value: 3, label: "Производственное/складское" },
      ],
    },
    {
      key: "peopleCount",
      label: "Количество постоянных жильцов/сотрудников",
      type: "slider",
      unit: "чел",
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "ductType",
      label: "Тип воздуховода",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Круглый ∅100–160 мм (спирально-навивной)" },
        { value: 1, label: "Прямоугольный 200×100 мм" },
        { value: 2, label: "Гибкий гофрированный ∅125 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const totalArea = Math.max(10, inputs.totalArea ?? 80);
    const ceilingHeightMm = inputs.ceilingHeight ?? 270;
    const buildingType = Math.round(inputs.buildingType ?? 0);
    const peopleCount = Math.max(1, Math.round(inputs.peopleCount ?? 3));
    const ductType = Math.round(inputs.ductType ?? 0);

    const ceilingH = ceilingHeightMm / 1000;
    const volume = totalArea * ceilingH;

    // Нормы воздухообмена по СП 54.13330 и СП 118.13330
    // Кратность воздухообмена
    const exchangeRates = [1.5, 2.0, 3.0, 5.0][buildingType]; // крат/час
    const airByVolume = volume * exchangeRates; // м³/час

    // Норма по людям: 30 м³/час на человека (СП 54.13330)
    const airByPeople = peopleCount * 30; // 30 м³/час/чел (жилые помещения)
    const requiredAirflow = Math.max(airByVolume, airByPeople);
    const requiredAirflowRounded = Math.ceil(requiredAirflow / 50) * 50;

    const warnings: string[] = [];
    const materials = [];

    // Вентилятор
    // Запас по производительности 20%
    const fanCapacity = Math.ceil(requiredAirflowRounded * 1.2 / 50) * 50;
    const fanDiameter = fanCapacity <= 300 ? 100 : fanCapacity <= 500 ? 125 : fanCapacity <= 800 ? 150 : 200;
    materials.push({
      name: `Вентилятор канальный ∅${fanDiameter} мм (~${fanCapacity} м³/ч)`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Вентилятор",
    });

    // Воздуховоды
    // Длина основной магистрали ≈ √(area) × 2 + 15% ответвления
    const mainDuctLength = Math.sqrt(totalArea) * 2.5 * 1.15;
    const ductPcs = Math.ceil(mainDuctLength / 3); // секции по 3 м

    const ductNames = [
      `Воздуховод круглый оцинкованный ∅${fanDiameter} мм (секция 3 м)`,
      "Воздуховод прямоугольный 200×100 мм (секция 3 м)",
      "Гофра гибкая ∅125 мм (бухта 10 м)",
    ];

    if (ductType <= 1) {
      materials.push({
        name: ductNames[ductType],
        quantity: mainDuctLength / 3,
        unit: "шт",
        withReserve: ductPcs,
        purchaseQty: ductPcs,
        category: "Воздуховод",
      });
    } else {
      const hoflaBuhtas = Math.ceil(mainDuctLength / 10);
      materials.push({
        name: ductNames[2],
        quantity: mainDuctLength / 10,
        unit: "бухт",
        withReserve: hoflaBuhtas,
        purchaseQty: hoflaBuhtas,
        category: "Воздуховод",
      });
    }

    // Фасонные части (отводы 90°, тройники, переходники)
    const fittingsCount = Math.ceil(ductPcs * 0.5 * 1.1);
    materials.push({
      name: `Отвод 90° ∅${fanDiameter} мм / тройник`,
      quantity: ductPcs * 0.5,
      unit: "шт",
      withReserve: fittingsCount,
      purchaseQty: fittingsCount,
      category: "Фасонные части",
    });

    // Решётки вентиляционные
    const grateCount = Math.ceil(totalArea / 15) + 1; // 1 решётка на 15 м² + 1 входная
    materials.push({
      name: `Решётка вентиляционная 150×150 мм (или круглый диффузор ∅${fanDiameter} мм)`,
      quantity: grateCount,
      unit: "шт",
      withReserve: grateCount,
      purchaseQty: grateCount,
      category: "Решётки",
    });

    // Хомуты и крепёж
    const clampsCount = Math.ceil(ductPcs * 2 * 1.1);
    materials.push({
      name: `Хомут крепёжный ∅${fanDiameter} мм с шпилькой`,
      quantity: ductPcs * 2,
      unit: "шт",
      withReserve: clampsCount,
      purchaseQty: clampsCount,
      category: "Крепёж",
    });

    // Шумоглушитель (для жилых помещений)
    if (buildingType <= 1) {
      materials.push({
        name: `Шумоглушитель цилиндрический ∅${fanDiameter} мм`,
        quantity: 1,
        unit: "шт",
        withReserve: 1,
        purchaseQty: 1,
        category: "Шумоглушение",
      });
    }

    if (requiredAirflow > 2000) {
      warnings.push("Производительность >2000 м³/ч — рекомендуется проектирование системы специалистом");
    }
    if (buildingType === 0 && peopleCount > 6) {
      warnings.push("Для квартиры с >6 жильцами стандартной вытяжной вентиляции недостаточно — нужна приточно-вытяжная установка");
    }
    warnings.push(`Расчётный воздухообмен: ${requiredAirflowRounded} м³/ч (кратность ${exchangeRates}×/ч + 60 м³/ч/чел)`);

    const scenarios = buildNativeScenarios({
      id: "ventilation-main",
      title: "Ventilation main",
      exactNeed: requiredAirflowRounded,
      unit: "м³/ч",
      packageSizes: [50],
      packageLabelPrefix: "ventilation-airflow",
    });

    return {
      materials,
      totals: {
        requiredAirflow: requiredAirflowRounded,
        volume,
        exchangeRate: exchangeRates,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт вентиляции по СП 54.13330:**
- Воздухообмен = max(Объём × Кратность, Люди × 60 м³/ч)
- Кратность: квартира 1.5×, дом 2×, офис 3×/ч
- Воздуховод: диаметр по производительности вентилятора
  `,
  howToUse: [
    "Введите площадь и высоту потолков",
    "Выберите тип здания и количество жильцов",
    "Выберите тип воздуховода",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Как понять, какой воздухообмен нужен помещению?",
      answer: "Воздухообмен обычно считают либо по объёму помещения и кратности, либо по числу людей, если такой расчёт даёт более жёсткое требование и лучше отражает реальную нагрузку на систему. Для жилых комнат, кухонь, санузлов, офисов и технических помещений нормы различаются, поэтому правильный расход воздуха зависит не только от площади, но и от назначения помещения, влажности, числа пользователей и режима эксплуатации, а ориентироваться только на квадратные метры почти всегда недостаточно, особенно в кухнях, санузлах и помещениях с нерегулярной, но очень интенсивной пиковой нагрузкой, повышенным выделением влаги, запахов и кратковременным ростом CO2 или температуры. Проще всего ошибиться там, где помещение кажется небольшим, но фактическая влажностная и тепловая нагрузка у него высокая. Если есть сомнение между двумя вариантами, ориентироваться лучше на более жёсткий режим для влаги и запахов, а затем уже балансировать шум и энергопотребление оборудованием. Если помещение влажное, жаркое или используется неравномерно, ориентироваться только на площадь почти всегда ошибочно: критичнее именно пик фактической нагрузки на воздух. Его считают по назначению комнаты, числу людей, влажности, тепловыделению и санитарным требованиям, а не только по площади или объёму помещения. Ориентироваться только на площадь нельзя: решающими бывают люди, влага, оборудование и режим использования помещения. Для точного выбора учитывают людей, влагу, оборудование и режим работы комнаты, а не только её площадь. Ориентир берут не по ощущению духоты, а по назначению помещения, числу людей, влажности и реальному режиму работы."
    },
    {
      question: "Как выбрать диаметр воздуховода?",
      answer: "Диаметр воздуховода подбирают по требуемой производительности, длине трассы, числу поворотов и допустимой скорости воздуха в канале, потому что все эти параметры влияют на сопротивление системы и уровень шума. Если канал слишком маленький, растут шум и потери по производительности, а слишком большой воздуховод усложняет монтаж и часто не даёт ощутимой практической выгоды, особенно в тесных помещениях и при ограниченном месте под разводку, где каждый лишний размер канала сразу конфликтует с отделкой и инженерией. На практике хороший диаметр — это баланс между тишиной, пропускной способностью и реальной возможностью уложить трассу без конфликта с остальными системами, а не просто самый крупный канал, который получилось купить. Важно отдельно считать магистраль и отводы, потому что диаметр главного канала и подключений к решёткам часто различается. Важно отдельно считать магистраль и отводы, потому что диаметр главного канала и подключений к решёткам часто различается. Диаметр подбирают не только по расходу воздуха, но и по допустимой скорости, шуму и длине трассы, иначе система может работать формально правильно, но раздражающе громко. Его подбирают по расчётному расходу воздуха, длине трассы, шуму, скорости потока и сопротивлению системы, а не только по удобству монтажа. Слишком маленький диаметр даёт шум и потери тяги, а слишком большой усложняет монтаж без реальной выгоды. Нужный диаметр определяют по расходу воздуха, длине трассы и шуму, а не по принципу «чем больше, тем лучше». Диаметр подбирают не по привычке, а по расходу воздуха, шуму и допустимой скорости в конкретной ветке системы."
    }
  ],
};


