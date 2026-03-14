import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";
export const electricDef: CalculatorDefinition = {
  id: "engineering_electrics",
  slug: "elektrika",
  title: "Калькулятор электропроводки",
  h1: "Калькулятор электропроводки онлайн — расчёт кабеля и автоматов",
  description: "Рассчитайте метраж кабеля, количество автоматических выключателей, УЗО и розеток для квартиры или дома.",
  metaTitle: withSiteMetaTitle("Калькулятор электропроводки | Расчёт кабеля ВВГнг"),
  metaDescription: "Бесплатный калькулятор электропроводки: рассчитайте кабель ВВГнг, автоматы, УЗО, дифавтоматы и розеточные группы для квартиры или дома по площади и количеству комнат.",
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
      answer: "УЗО нужно не для защиты кабеля, а прежде всего для защиты человека и снижения риска пожара при утечке тока, когда часть тока уходит не по нормальной цепи, а через корпус прибора, влажную конструкцию или человека. Автоматический выключатель при этом решает другую задачу: он отключает линию при перегрузке и коротком замыкании, поэтому в нормальной схеме автомат и УЗО не заменяют друг друга, а работают вместе, особенно на розеточных и мокрых группах, где риск утечки и прямого контакта с влагой выше всего. На практике отсутствие УЗО чаще всего становится заметно именно в тех узлах, где обычный автомат формально не видит опасную утечку и не отключает линию вовремя, хотя нагрузка по току ещё кажется нормальной. То есть автомат защищает линию, а УЗО — человека и сам узел эксплуатации там, где опасность возникает без явного короткого замыкания и где ошибка стоит особенно дорого. УЗО защищает не провод, а человека и риск утечки тока, поэтому его задача дополняет автомат, а не заменяет его. УЗО особенно важно в мокрых зонах, на уличных линиях и там, где человек может оказаться частью аварийной цепи ещё до срабатывания автомата по перегрузке. Оно защищает не проводку от перегрузки, а человека и конструкцию от утечки тока, поэтому работает в паре с автоматом, а не вместо него. Оно защищает не линию от перегрузки, а человека и влажные зоны от опасных токов утечки. Оно спасает от опасных токов утечки и особенно важно на влажных участках, где одного автомата недостаточно. Для мокрых зон и линий с повышенным риском утечки это уже не опция комфорта, а базовый элемент электробезопасности."
    },
    {
      question: "Можно ли класть кабель без гофры?",
      answer: "Это зависит от способа прокладки и материала конструкций: в штробе под штукатуркой кабель нередко укладывают без гофры, если это допускает проект и правила монтажа, но за подвесными потолками, в пустотах и особенно в деревянных конструкциях требования жёстче. Поэтому гофра нужна не «всегда по привычке», а там, где требуется дополнительная механическая защита, сменяемость линии или соблюдение норм пожарной безопасности, потому что ошибка в этом узле потом плохо исправляется без вскрытия отделки. Если трассу в будущем могут дорабатывать, рядом есть риск механического повреждения или проводка идёт в скрытой полости, гофра обычно даёт более безопасный и ремонтопригодный вариант. Для скрытых и труднодоступных участков это особенно важно, потому что цена переделки потом значительно выше стоимости самой защиты на этапе монтажа. Даже там, где правила допускают открытую прокладку без гофры, по факту часто выгоднее сразу закладывать защиту ради замены, понятной трассы и меньшего риска механического повреждения. В деревянных конструкциях, скрытых полостях и местах возможной замены линии гофра или труба особенно важны, потому что они упрощают ремонт и снижают риск повреждения изоляции. В негорючих открытых зонах это иногда допускается схемой монтажа, но в скрытых полостях, дереве и местах возможной замены линии защита кабеля обычно намного важнее экономии. Это зависит от основания и способа монтажа, но в большинстве бытовых сценариев защита кабеля сильно упрощает ремонт и замену. Решение здесь зависит не от привычки, а от типа основания, способа прокладки и требований к ремонтопригодности линии."
    }
  ]
};



