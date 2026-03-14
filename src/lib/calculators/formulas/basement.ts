import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const basementDef: CalculatorDefinition = {
  id: "foundation_basement",
  slug: "podval-fundamenta",
  title: "Калькулятор подвала и цоколя",
  h1: "Калькулятор подвала и цокольного этажа — расчёт материалов",
  description: "Рассчитайте бетон, арматуру, гидроизоляцию и утепление для строительства подвала или цокольного этажа.",
  metaTitle: withSiteMetaTitle("Калькулятор подвала | Цокольный этаж"),
  metaDescription: "Бесплатный калькулятор подвала: рассчитайте бетон, арматуру, гидроизоляцию стен и пола, утепление ЭППС для цокольного этажа.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["подвал", "цоколь", "цокольный этаж", "гидроизоляция подвала", "фундамент"],
  popularity: 48,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Длина подвала",
      type: "slider",
      unit: "м",
      min: 3,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "width",
      label: "Ширина подвала",
      type: "slider",
      unit: "м",
      min: 3,
      max: 20,
      step: 0.5,
      defaultValue: 6,
    },
    {
      key: "depth",
      label: "Глубина (высота стен подвала)",
      type: "slider",
      unit: "м",
      min: 1.5,
      max: 4,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "wallThickness",
      label: "Толщина стен подвала",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (монолит, до 2 м глубины)" },
        { value: 200, label: "200 мм (монолит, стандарт)" },
        { value: 250, label: "250 мм (монолит, более 3 м)" },
        { value: 300, label: "300 мм (монолит, глубокий подвал)" },
      ],
    },
    {
      key: "floorThickness",
      label: "Толщина плиты пола",
      type: "select",
      defaultValue: 150,
      options: [
        { value: 100, label: "100 мм (минимум)" },
        { value: 150, label: "150 мм (стандарт)" },
        { value: 200, label: "200 мм (нагруженный пол)" },
      ],
    },
    {
      key: "waterproofType",
      label: "Тип гидроизоляции",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Обмазочная (мастика 2 слоя)" },
        { value: 1, label: "Оклеечная (рулонная) + обмазка" },
        { value: 2, label: "Проникающая (Пенетрон, Кальматрон)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const length = Math.max(3, inputs.length ?? 8);
    const width = Math.max(3, inputs.width ?? 6);
    const depth = Math.max(1.5, inputs.depth ?? 2.5);
    const wallThicknessMm = inputs.wallThickness ?? 200;
    const floorThicknessMm = inputs.floorThickness ?? 150;
    const waterproofType = Math.round(inputs.waterproofType ?? 1);

    const wallThickness = wallThicknessMm / 1000;
    const floorThickness = floorThicknessMm / 1000;

    const floorArea = length * width;
    const wallPerimeter = 2 * (length + width);
    const wallArea = wallPerimeter * depth;

    const warnings: string[] = [];
    const materials = [];

    // Бетон для плиты пола
    const floorVolume = floorArea * floorThickness;
    const floorConcreteM3 = Math.ceil(floorVolume * 1.05 * 10) / 10;
    materials.push({
      name: "Бетон М300 (В22.5) для плиты пола",
      quantity: floorVolume,
      unit: "м³",
      withReserve: floorConcreteM3,
      purchaseQty: floorConcreteM3,
      category: "Бетон",
    });

    // Бетон для стен подвала
    const wallVolume = wallArea * wallThickness;
    const wallConcreteM3 = Math.ceil(wallVolume * 1.03 * 10) / 10;
    materials.push({
      name: "Бетон М350 (В25) для стен подвала",
      quantity: wallVolume,
      unit: "м³",
      withReserve: wallConcreteM3,
      purchaseQty: wallConcreteM3,
      category: "Бетон",
    });

    // Арматура для плиты пола А500С ∅12 мм
    // Сетка 200×200 мм, 2 сетки = масса ≈ 22 кг/м²
    const floorRebarKg = floorArea * 22;
    const floorRebarT = Math.ceil(floorRebarKg / 1000 * 10) / 10;
    materials.push({
      name: "Арматура А500С ∅12 мм для плиты пола (сетка 200×200 мм, 2 ряда)",
      quantity: floorRebarKg / 1000,
      unit: "т",
      withReserve: floorRebarT,
      purchaseQty: floorRebarT,
      category: "Арматура",
    });

    // Арматура для стен ∅12 мм, сетка 200×200 мм
    const wallRebarKg = wallArea * 18; // 2 сетки по 9 кг/м²
    const wallRebarT = Math.ceil(wallRebarKg / 1000 * 10) / 10;
    materials.push({
      name: "Арматура А500С ∅12 мм для стен (сетка 200×200 мм, 2 ряда)",
      quantity: wallRebarKg / 1000,
      unit: "т",
      withReserve: wallRebarT,
      purchaseQty: wallRebarT,
      category: "Арматура",
    });

    // Проволока вязальная
    const wireKg = Math.ceil((floorRebarKg + wallRebarKg) * 0.01);
    materials.push({
      name: "Проволока вязальная ∅0.8–1.2 мм",
      quantity: (floorRebarKg + wallRebarKg) * 0.01,
      unit: "кг",
      withReserve: wireKg,
      purchaseQty: wireKg,
      category: "Арматура",
    });

    // Щебень для подготовки под плиту (150 мм)
    const gravelM3 = Math.ceil(floorArea * 0.15 * 1.1 * 10) / 10;
    materials.push({
      name: "Щебень фракция 20–40 мм (подготовка под фундамент 150 мм)",
      quantity: floorArea * 0.15,
      unit: "м³",
      withReserve: gravelM3,
      purchaseQty: gravelM3,
      category: "Основание",
    });

    // Песок (100 мм)
    const sandM3 = Math.ceil(floorArea * 0.1 * 1.1 * 10) / 10;
    materials.push({
      name: "Песок строительный (подсыпка 100 мм)",
      quantity: floorArea * 0.1,
      unit: "м³",
      withReserve: sandM3,
      purchaseQty: sandM3,
      category: "Основание",
    });

    // Опалубка для стен (фанера 18 мм или несъёмная из ЦСП)
    const formworkArea = wallArea * 2 * 1.15; // 2 стороны + запас
    const formworkSheets = Math.ceil(formworkArea / 2.88); // лист фанеры 1200×2400 = 2.88 м²
    materials.push({
      name: "Фанера ФСФ 18 мм (лист 1200×2400 мм) для опалубки",
      quantity: formworkArea / 2.88,
      unit: "листов",
      withReserve: formworkSheets,
      purchaseQty: formworkSheets,
      category: "Опалубка",
    });

    // Гидроизоляция
    switch (waterproofType) {
      case 0: {
        // Обмазочная мастика
        const masticKg = (wallArea + floorArea) * 2 * 1.5; // 1.5 кг/м² за слой × 2 слоя
        const masticBuckets = Math.ceil(masticKg / 20);
        materials.push({
          name: "Мастика битумно-полимерная (ведро 20 кг, ~1.5 кг/м² × 2 слоя)",
          quantity: masticKg / 20,
          unit: "вёдер",
          withReserve: masticBuckets,
          purchaseQty: masticBuckets,
          category: "Гидроизоляция",
        });
        break;
      }
      case 1: {
        // Рулонная + обмазка
        const rollArea = (wallArea + floorArea) * 1.15;
        const rollCount = Math.ceil(rollArea / 10 * 2); // рулон 10 м², 2 слоя
        materials.push({
          name: "Гидроизоляция рулонная (Технониколь, рулон 10 м², 2 слоя)",
          quantity: rollArea / 10 * 2,
          unit: "рулонов",
          withReserve: rollCount,
          purchaseQty: rollCount,
          category: "Гидроизоляция",
        });
        const masticKgBase = (wallArea + floorArea) * 1.5;
        const masticBucketsBase = Math.ceil(masticKgBase / 20);
        materials.push({
          name: "Праймер битумный / мастика под рулонную (ведро 20 кг)",
          quantity: masticKgBase / 20,
          unit: "вёдер",
          withReserve: masticBucketsBase,
          purchaseQty: masticBucketsBase,
          category: "Гидроизоляция",
        });
        break;
      }
      case 2: {
        // Проникающая
        const penKg = (wallArea + floorArea) * 0.4 * 1.1; // ~0.4 кг/м²
        const penBags = Math.ceil(penKg / 10); // мешки 10 кг
        materials.push({
          name: "Гидроизоляция проникающая Пенетрон/Кальматрон (мешок 10 кг, ~0.4 кг/м²)",
          quantity: penKg / 10,
          unit: "мешков",
          withReserve: penBags,
          purchaseQty: penBags,
          category: "Гидроизоляция",
        });
        break;
      }
    }

    // ЭППС утепление снаружи стен (рекомендуется 50–100 мм)
    const eppsPlattes = Math.ceil(wallArea * 1.05 / 0.72);
    materials.push({
      name: "ЭППС 50–100 мм для утепления стен снаружи (плита 1200×600 мм)",
      quantity: wallArea * 1.05 / 0.72,
      unit: "плит",
      withReserve: eppsPlattes,
      purchaseQty: eppsPlattes,
      category: "Утеплитель",
    });

    // Геотекстиль: защита гидроизоляции и утеплителя от грунта (по наружным стенам)
    const geotextileArea = wallArea * 1.15; // reserve 15% на нахлёсты
    const geotextileRolls = Math.ceil(geotextileArea / 50); // 1 рулон = 50 м²
    materials.push({
      name: "Геотекстиль 200 г/м² (защита гидроизоляции, рулон 50 м²)",
      quantity: wallArea,
      unit: "рулон",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Гидроизоляция",
    });

    // Дренажная мембрана (профилированная): защита стен от давления грунта
    const membranArea = wallArea * 1.1; // reserve 10%
    const membranRolls = Math.ceil(membranArea / 20); // 1 рулон ≈ 20 м²
    materials.push({
      name: "Мембрана дренажная профилированная (рулон 20 м²)",
      quantity: wallArea,
      unit: "рулонов",
      withReserve: membranRolls,
      purchaseQty: membranRolls,
      category: "Дренаж",
    });

    // Вентиляция подвала: продухи (гильзы) и вытяжная труба
    // По СП 54.13330 — площадь продухов ≥ 1/400 площади подвала
    // Минимум 2 продуха на противоположных стенах, обычно 4–6 шт
    const ventCount = Math.max(4, Math.ceil(floorArea / 10)); // 1 продух на 10 м²
    materials.push({
      name: "Труба ПВХ ∅110 мм (гильзы для продухов, 0.3 м)",
      quantity: ventCount,
      unit: "шт",
      withReserve: ventCount,
      purchaseQty: ventCount,
      category: "Вентиляция",
    });
    materials.push({
      name: "Решётки вентиляционные 150×150 мм",
      quantity: ventCount,
      unit: "шт",
      withReserve: ventCount,
      purchaseQty: ventCount,
      category: "Вентиляция",
    });

    if (depth > 3) {
      warnings.push(`Глубина подвала ${depth} м — обязателен расчёт давления грунта на стены и проверка толщины ${wallThicknessMm} мм (рекомендуется ≥250 мм)`);
    }
    if (waterproofType === 0) {
      warnings.push("Только обмазочная гидроизоляция рекомендуется при уровне грунтовых вод ниже пола подвала на ≥1 м. Иначе — рулонная или проникающая");
    }
    warnings.push("Для подвала обязательна ливневая и дренажная система вокруг фундамента");

    const scenarios = buildNativeScenarios({
      id: "basement-main",
      title: "Basement main",
      exactNeed: floorVolume + wallVolume,
      unit: "м³",
      packageSizes: [0.1],
      packageLabelPrefix: "basement-concrete",
    });

    return {
      materials,
      totals: {
        floorArea,
        wallArea,
        floorVolume,
        wallVolume,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт подвала:**
- Бетон пола: длина × ширина × толщина
- Бетон стен: периметр × глубина × толщина
- Арматура пола: ~22 кг/м² (сетка ∅12, 200×200, 2 ряда)
- Арматура стен: ~18 кг/м²
- Гидроизоляция: вся поверхность стен и пол
  `,
  howToUse: [
    "Введите размеры и глубину подвала",
    "Выберите толщину стен и пола",
    "Выберите тип гидроизоляции",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Нужна ли гидроизоляция пола и стен подвала одновременно?",
      answer: "Да, для подвала обычно одновременно защищают и стены, и плиту пола, потому что влага и капиллярный подсос воздействуют на конструкцию сразу с нескольких направлений, а не только через боковые поверхности. Тип гидроизоляции выбирают по уровню грунтовых вод, дренажу участка, типу грунта и режиму эксплуатации подвала, а неполная защита только одной из плоскостей часто оставляет слабое место в самом уязвимом узле, через которое потом и начинается основное намокание и постепенное разрушение отделки. Особенно опасно экономить на стыке пола и стены, вводах коммуникаций и холодных швах, потому что именно эти узлы чаще всего первыми показывают протечки и высолы, даже если остальные плоскости выполнены аккуратно. Если подвал планируется как тёплое или отделанное помещение, экономия на одном из направлений гидроизоляции почти всегда выходит дороже ещё до завершения первого сезона, когда доступ к узлам уже закрыт отделкой. Да, потому что в подвале слабое место почти всегда находится в примыкании и стыке конструкций, а раздельная защита пола и стен редко работает как полноценный единый контур. В большинстве случаев да, потому что вода и капиллярная влага работают по узлам примыкания как единая система, и защита только одной поверхности даёт слабое место в шве. Если отсечь только одну плоскость, влага обычно находит соседний слабый узел и проблема возвращается. Да, потому что вода редко давит только в одну плоскость, и слабый стык быстро делает частичную защиту бесполезной. Разрыв между этими слоями обычно и даёт самый неприятный путь влаге в зоне примыкания стены и пола."
    },
    {
      question: "Какую толщину стен подвала выбирать?",
      answer: "Толщина стен подвала зависит не только от площади, но и от глубины заглубления, нагрузки от здания, уровня грунтовых вод, типа грунта и схемы армирования, потому что стены работают под постоянным давлением грунта и влаги. Для полностью заглублённых подвалов решение лучше принимать по расчёту конструктора, а не выбирать стену только по общему правилу или по аналогии с цоколем, особенно если на стены дополнительно действует вода без нормального дренажа, есть подпор по рельефу и давление грунта растёт неравномерно по периметру здания. Чем слабее дренаж и выше вода, тем опаснее выбирать толщину стен «по соседнему объекту» без расчёта и проверки всей схемы гидроизоляции, потому что запас по стене и по влаге здесь работает вместе, а не по отдельности. Для подвала с тяжёлым домом сверху и наружным давлением грунта вопрос толщины стены всегда лучше рассматривать вместе с армированием и схемой опирания перекрытий. Если подвал работает не только как холодное техпомещение, но и как полноценный эксплуатируемый этаж, к толщине стены обычно добавляются более жёсткие требования по влаге, теплу и жёсткости. Её выбирают по нагрузке грунта, высоте засыпки, материалу стены, гидроизоляции и схеме перекрытия, а не по одному “типовому” числу для всех подвалов. Экономия на толщине особенно опасна при высоком давлении грунта и наличии тяжёлых перекрытий сверху. Здесь критична не только геометрия, но и боковое давление грунта, вода и тип перекрытия над подвалом. Для подвала ошибка по толщине почти всегда тянет за собой не только бетон, но и арматуру, гидроизоляцию и теплотехнику. Её всегда лучше увязывать с давлением грунта, уровнем воды, высотой засыпки и типом перекрытия, а не только с площадью подвала."
    }
  ],
};






