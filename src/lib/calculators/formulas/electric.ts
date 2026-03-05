import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";
export const electricDef: CalculatorDefinition = {
  id: "engineering_electrics",
  slug: "elektrika",
  title: "Калькулятор электропроводки",
  h1: "Калькулятор электропроводки онлайн — расчёт кабеля и автоматов",
  description: "Рассчитайте метраж кабеля, количество автоматических выключателей, УЗО и розеток для квартиры или дома.",
  metaTitle: "Калькулятор электропроводки | Расчёт кабеля ВВГнг — Мастерок",
  metaDescription: "Бесплатный калькулятор электропроводки: рассчитайте метраж кабеля ВВГнг, автоматы, УЗО и дифавтоматы по количеству комнат и площади.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["электропроводка", "кабель ВВГнг", "автоматы", "УЗО", "розетки", "электрика"],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "apartmentArea",
      label: "Площадь квартиры / дома",
      type: "slider",
      unit: "м²",
      min: 20,
      max: 500,
      step: 5,
      defaultValue: 60,
    },
    {
      key: "roomsCount",
      label: "Количество комнат",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2.4,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "wiringType",
      label: "Тип разводки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Скрытая (в штробах / стяжке)" },
        { value: 1, label: "Открытая (в кабель-канале)" },
      ],
    },
    {
      key: "hasKitchen",
      label: "Есть кухня с электроплитой",
      type: "switch",
      defaultValue: 1,
      hint: "Требует отдельной линии 380В или 220В/32А",
    },
    {
      key: "reserve",
      label: "Запас кабеля",
      type: "slider",
      unit: "%",
      min: 5,
      max: 30,
      step: 5,
      defaultValue: 15,
      hint: "На спуски к розеткам, петли в коробках и ошибки монтажа",
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(20, inputs.apartmentArea ?? 60);
    const rooms = Math.max(1, Math.round(inputs.roomsCount ?? 3));
    const height = Math.max(2.4, inputs.ceilingHeight ?? 2.7);
    const hasKitchen = (inputs.hasKitchen ?? 1) > 0;
    const reserve = (inputs.reserve ?? 15) / 100;

    // Группы: освещение (1.5 мм²), розетки (2.5 мм²), сплит-системы (2.5 мм²), плита (4 или 6 мм²)
    const lightingGroups = rooms + 1; // по комнате + общий коридор
    const outletGroups = rooms + 2;   // по комнате + кухня + ванная
    const acGroups = Math.ceil(rooms / 2);

    // Эмпирическая формула прораба: 
    // Кабель 3х2.5 ≈ Площадь * 1.5 (для розеток)
    // Кабель 3х1.5 ≈ Площадь * 1.0 (для света)
    const distFromPanel = Math.sqrt(area) * 1.5; 
    
    const cable15length = area * 1.1 + (lightingGroups * height);
    const cable25length = area * 1.6 + (outletGroups * height * 1.5);
    const cable6length = hasKitchen ? (distFromPanel + height) * 1.2 : 0;

    // Щиток: автоматы
    const breakersCount = lightingGroups + outletGroups + acGroups + (hasKitchen ? 1 : 0);
    const uzoCount = Math.ceil(outletGroups / 2) + (hasKitchen ? 1 : 0) + 1; // + общее УЗО

    // Гофра / кабель-канал
    const conduitLength = Math.ceil((cable15length + cable25length + cable6length) * 0.8); // не всё в гофре

    // Розетки и выключатели
    const outletsCount = Math.ceil(area * 0.6) + (rooms * 2); // ~0.6 розетки/м² + по 2 у кроватей
    const switchesCount = rooms + 2; // по одному на комнату + проходные

    const warnings: string[] = [];
    if (area > 100) warnings.push("Для площади > 100 м² рекомендуется трёхфазный ввод 380В (15 кВт)");
    if (hasKitchen) warnings.push("Линия на электроплиту: ВВГнг-LS 3×6 мм² с автоматом 32А и УЗО 40А/30мА");
    warnings.push("Все розетки в ванной и на кухне должны быть защищены УЗО с током утечки 10-30 мА");

    const totalCableNeed = cable15length + cable25length + cable6length;
    const scenarios = buildNativeScenarios({
      id: "electric-cable",
      title: "Electric cable",
      exactNeed: totalCableNeed,
      unit: "м.п.",
      packageSizes: [50],
      packageLabelPrefix: "electric-cable-roll",
    });

    return {
      materials: [
        {
          name: "Кабель ВВГнг-LS 3×1.5 (освещение)",
          quantity: cable15length,
          unit: "м.п.",
          withReserve: Math.ceil(cable15length * (1 + reserve)),
          purchaseQty: Math.ceil(cable15length * (1 + reserve) / 50) * 50, // бухты по 50м
          category: "Кабель",
        },
        {
          name: "Кабель ВВГнг-LS 3×2.5 (розетки)",
          quantity: cable25length,
          unit: "м.п.",
          withReserve: Math.ceil(cable25length * (1 + reserve)),
          purchaseQty: Math.ceil(cable25length * (1 + reserve) / 50) * 50, // бухты по 50м
          category: "Кабель",
        },
        ...(hasKitchen ? [{
          name: "Кабель ВВГнг-LS 3×6 (плита/варочная)",
          quantity: cable6length,
          unit: "м.п.",
          withReserve: Math.ceil(cable6length * 1.1),
          purchaseQty: Math.ceil(cable6length * 1.1),
          category: "Кабель",
        }] : []),
        {
          name: "Щит распределительный (навесной/встраиваемый)",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Щиток",
        },
        {
          name: "Автоматический выключатель (10А/16А)",
          quantity: breakersCount,
          unit: "шт",
          withReserve: breakersCount + 2,
          purchaseQty: breakersCount + 2,
          category: "Щиток",
        },
        {
          name: "УЗО / Дифавтомат (30мА)",
          quantity: uzoCount,
          unit: "шт",
          withReserve: uzoCount,
          purchaseQty: uzoCount,
          category: "Щиток",
        },
        {
          name: "Розетки (внутренние, с заземлением)",
          quantity: outletsCount,
          unit: "шт",
          withReserve: Math.ceil(outletsCount * 1.05),
          purchaseQty: Math.ceil(outletsCount * 1.05),
          category: "Механизмы",
        },
        {
          name: "Выключатели (1-клавишные/2-клавишные)",
          quantity: switchesCount,
          unit: "шт",
          withReserve: Math.ceil(switchesCount * 1.05),
          purchaseQty: Math.ceil(switchesCount * 1.05),
          category: "Механизмы",
        },
        {
          name: "Подрозетники (стаканы)",
          quantity: outletsCount + switchesCount,
          unit: "шт",
          withReserve: Math.ceil((outletsCount + switchesCount) * 1.1),
          purchaseQty: Math.ceil((outletsCount + switchesCount) * 1.1),
          category: "Монтаж",
        },
        {
          name: "Гофра ПВХ Ø20 мм с протяжкой",
          quantity: conduitLength,
          unit: "м.п.",
          withReserve: conduitLength,
          purchaseQty: Math.ceil(conduitLength / 50) * 50,
          category: "Защита кабеля",
        },
        {
          name: "Гипс/алебастр (для фиксации подрозетников)",
          quantity: Math.ceil((outletsCount + switchesCount) / 5),
          unit: "кг",
          withReserve: Math.ceil((outletsCount + switchesCount) / 5),
          purchaseQty: Math.ceil((outletsCount + switchesCount) / 5),
          category: "Монтаж",
        },
      ],
      totals: {
        area,
        cable15length: Math.ceil(cable15length),
        cable25length: Math.ceil(cable25length),
        breakersCount,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт электропроводки (опыт монтажа):**

1. **Метраж кабеля**: 
   - Розетки: S_пола × 1.6 + спуски к каждой точке.
   - Свет: S_пола × 1.1 + спуски к выключателям.
2. **Запас**: 15% — необходимый минимум на петли в подрозетниках, распаечных коробках и щите.
3. **Автоматы**: 1 группа на 1 комнату (свет) + 1 группа на 1 комнату (розетки) + мощные потребители (кухня, СМА, кондиционеры).
4. **Защита**: УЗО обязательно на все «мокрые» группы и розеточные сети.
  `,
  howToUse: [
    "Введите общую площадь объекта",
    "Укажите количество жилых комнат",
    "Выберите наличие электроплиты (влияет на вводной кабель)",
    "Укажите запас (рекомендуем 15-20% для новичков)",
    "Нажмите «Рассчитать» — получите список материалов для чернового монтажа",
  ],
  expertTips: [
    {
      title: "Маркировка кабеля",
      content: "Используйте только кабель с маркировкой LS (Low Smoke) — он не поддерживает горение и не выделяет ядовитый дым. ВВГнг-LS — золотой стандарт для жилых помещений.",
      author: "Электрик 5 разряда"
    },
    {
      title: "Распаечные коробки",
      content: "Если планируете натяжные потолки, делайте распаечные коробки за ними, но используйте только сварку или опрессовку гильзами (ГМЛ). Ваго (Wago) в необслуживаемых местах — риск.",
      author: "Мастер-монтажник"
    }
  ],
  faq: [
    {
      question: "Зачем нужно УЗО?",
      answer: "УЗО спасает жизнь при утечке тока (например, если повреждена изоляция в стиральной машине). Автомат защищает только кабель от перегрузки и КЗ."
    },
    {
      question: "Можно ли класть кабель без гофры?",
      answer: "В штробах под штукатурку — можно. За подвесными потолками и в деревянных домах — только в негорючей гофре или металлической трубе."
    }
  ]
};
