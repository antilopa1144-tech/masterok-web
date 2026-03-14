import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";
export const warmFloorDef: CalculatorDefinition = {
  id: "warm_floor",
  slug: "teplyy-pol",
  title: "Калькулятор тёплого пола",
  h1: "Калькулятор тёплого пола онлайн — расчёт греющего кабеля и мата",
  description: "Рассчитайте длину греющего кабеля или площадь нагревательного мата для тёплого пола под плитку, ламинат и другие покрытия.",
  metaTitle: withSiteMetaTitle("Калькулятор тёплого пола | Расчёт кабеля и мата"),
  metaDescription: "Бесплатный калькулятор тёплого пола: рассчитайте нагревательные маты или кабель, терморегулятор и мощность с учётом полезной площади и расстановки мебели.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["тёплый пол", "греющий кабель", "нагревательный мат", "терморегулятор"],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "roomArea",
      label: "Площадь помещения",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
    },
    {
      key: "furnitureArea",
      label: "Площадь под мебелью",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 2,
      hint: "Под стационарной мебелью тёплый пол не укладывается",
    },
    {
      key: "heatingType",
      label: "Тип системы",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нагревательный мат (под плитку)" },
        { value: 1, label: "Греющий кабель (в стяжку)" },
        { value: 2, label: "Водяной тёплый пол" },
      ],
    },
    {
      key: "powerDensity",
      label: "Удельная мощность",
      type: "select",
      defaultValue: 150,
      options: [
        { value: 100, label: "100 Вт/м² — дополнительный обогрев" },
        { value: 150, label: "150 Вт/м² — основной обогрев (рекомендуется)" },
        { value: 200, label: "200 Вт/м² — ванная, санузел" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const roomArea = Math.max(1, inputs.roomArea ?? 10);
    const furnitureArea = Math.max(0, inputs.furnitureArea ?? 2);
    const type = Math.round(inputs.heatingType ?? 0);
    const powerDensity = inputs.powerDensity ?? 150;

    const heatingArea = Math.max(0, roomArea - furnitureArea);
    const totalPowerW = heatingArea * powerDensity;
    const totalPowerKW = totalPowerW / 1000;

    const warnings: string[] = [];
    if (totalPowerKW > 3.5) warnings.push(`Мощность ${totalPowerKW.toFixed(1)} кВт требует отдельного автомата и проводки`);
    if (heatingArea / roomArea < 0.5) warnings.push("Менее 50% площади под обогревом — тёплый пол будет малоэффективным");

    if (type === 0) {
      // Нагревательный мат (стандартный размер 2 м²)
      const matsTotal = Math.ceil(heatingArea / 2.0);

      // Теплоотражающая подложка (фольгированный пенополиэтилен) — предотвращает потери тепла вниз
      const insulationArea = Math.ceil(heatingArea * 1.1);

      const scenarios = buildNativeScenarios({
        id: "warm-floor-mat",
        title: "Warm floor mat",
        exactNeed: heatingArea,
        unit: "м²",
        packageSizes: [2],
        packageLabelPrefix: "warm-floor-mat",
      });

      return {
        materials: [
          { name: `Нагревательный мат ${powerDensity} Вт/м² (2 м²)`, quantity: heatingArea / 2.0, unit: "шт", withReserve: matsTotal, purchaseQty: matsTotal, category: "Греющий элемент" },
          { name: "Терморегулятор с датчиком", quantity: 1, unit: "шт", withReserve: 1, purchaseQty: 1, category: "Управление" },
          { name: "Гофротрубка для датчика Ø16 мм", quantity: 1, unit: "м", withReserve: 1, purchaseQty: 1, category: "Монтаж" },
          { name: "Теплоотражающая подложка (рулон 25 м²)", quantity: insulationArea / 25, unit: "рулонов", withReserve: Math.max(1, Math.ceil(insulationArea / 25)), purchaseQty: Math.max(1, Math.ceil(insulationArea / 25)), category: "Теплоизоляция" },
          { name: "Плиточный клей эластичный (мешки 25 кг)", quantity: Math.ceil(heatingArea * 5 / 25), unit: "мешков", withReserve: Math.ceil(heatingArea * 5 / 25), purchaseQty: Math.ceil(heatingArea * 5 / 25), category: "Клей" },
        ],
        totals: { roomArea, heatingArea, totalPowerW, totalPowerKW } as Record<string, number>,
        warnings,
        scenarios,
      };
    } else if (type === 1) {
      // Греющий кабель в стяжку
      const cableStep = 0.15; // шаг 150 мм
      const cableLength = Math.ceil((heatingArea / cableStep) * 1.05);

      // Утеплитель ЭПС под кабель — 30 мм (предотвращает потери тепла вниз)
      const insulArea2 = Math.ceil(heatingArea * 1.1);

      const scenarios = buildNativeScenarios({
        id: "warm-floor-cable",
        title: "Warm floor cable",
        exactNeed: cableLength,
        unit: "м.п.",
        packageSizes: [1],
        packageLabelPrefix: "warm-floor-cable",
      });

      return {
        materials: [
          { name: `Греющий кабель ${powerDensity} Вт/м²`, quantity: cableLength, unit: "м.п.", withReserve: cableLength, purchaseQty: cableLength, category: "Греющий элемент" },
          { name: "Монтажная лента (рулон 25 м)", quantity: cableLength / 25, unit: "рулонов", withReserve: Math.ceil(cableLength / 25), purchaseQty: Math.ceil(cableLength / 25), category: "Монтаж" },
          { name: "Терморегулятор с датчиком", quantity: 1, unit: "шт", withReserve: 1, purchaseQty: 1, category: "Управление" },
          { name: "Утеплитель ЭПС 30 мм (лист 1200×600)", quantity: insulArea2 / 0.72, unit: "листов", withReserve: Math.ceil(insulArea2 / 0.72), purchaseQty: Math.ceil(insulArea2 / 0.72), category: "Теплоизоляция" },
          { name: "Стяжка поверх кабеля (~40 мм, ЦПС мешки 50 кг)", quantity: heatingArea * 0.04 * 2000 / 50, unit: "мешков", withReserve: Math.ceil(heatingArea * 0.04 * 2000 / 50), purchaseQty: Math.ceil(heatingArea * 0.04 * 2000 / 50), category: "Стяжка" },
        ],
        totals: { roomArea, heatingArea, totalPowerW, totalPowerKW, cableLength } as Record<string, number>,
        warnings,
        scenarios,
      };
    } else {
      // Водяной тёплый пол
      const pipeStep = 0.15;
      const pipeLength = Math.ceil((heatingArea / pipeStep) * 1.05);

      warnings.push("Водяной тёплый пол требует согласования с управляющей компанией в МКД");

      const scenarios = buildNativeScenarios({
        id: "warm-floor-water",
        title: "Warm floor water",
        exactNeed: pipeLength,
        unit: "м.п.",
        packageSizes: [1],
        packageLabelPrefix: "warm-floor-pipe",
      });

      return {
        materials: [
          { name: "Труба PE-Xa Ø16 мм", quantity: pipeLength, unit: "м.п.", withReserve: pipeLength, purchaseQty: pipeLength, category: "Труба" },
          { name: "Коллектор (на 1 контур)", quantity: 1, unit: "шт", withReserve: 1, purchaseQty: 1, category: "Коллектор" },
          { name: "Утеплитель под трубы (Ø32 мм)", quantity: pipeLength, unit: "м.п.", withReserve: pipeLength, purchaseQty: pipeLength, category: "Утеплитель" },
          { name: "Арматурная сетка 150×150", quantity: heatingArea * 1.05, unit: "м²", withReserve: Math.ceil(heatingArea * 1.05), purchaseQty: Math.ceil(heatingArea * 1.05), category: "Армирование" },
        ],
        totals: { roomArea, heatingArea, totalPowerW, pipeLength } as Record<string, number>,
        warnings,
        scenarios,
      };
    }
  },
  formulaDescription: `
**Расчёт тёплого пола:**

Рабочая площадь = Площадь_помещения − Площадь_мебели
Мощность = Рабочая_площадь × Удельная_мощность (Вт/м²)

Рекомендуемая мощность:
- 100–120 Вт/м² — дополнительный обогрев
- 150–180 Вт/м² — основной источник тепла
- 200 Вт/м² — ванная, санузел (кафель)

Шаг укладки кабеля: 100–200 мм (зависит от мощности кабеля)
  `,
  howToUse: [
    "Введите площадь помещения",
    "Укажите площадь под мебелью (тёплый пол там не нужен)",
    "Выберите тип системы (мат — проще монтаж, кабель — гибче)",
    "Задайте нужную мощность на 1 м²",
    "Нажмите «Рассчитать» — получите греющие элементы и сопутствующие материалы",
  ],
faq: [
    {
      question: "Нужно ли вычитать мебель из площади тёплого пола?",
      answer: "Да, стационарную мебель, сантехнику и участки без нормальной теплоотдачи обычно исключают из расчёта, потому что под ними тепло не уходит в помещение так, как на открытом полу. Это помогает избежать локального перегрева системы, лишнего расхода кабеля или матов, завышенной установленной мощности и неправильной оценки реальной рабочей площади обогрева, особенно в небольших комнатах с плотной расстановкой мебели, где ошибка даже на нескольких квадратных метрах заметно меняет подбор комплекта, шаг укладки и стоимость системы. Чем плотнее расстановка мебели, тем важнее считать не всю площадь комнаты, а реальную открытую зону обогрева, включая будущую встроенную мебель, которую потом не сдвинешь. Если этот момент пропустить, система может оказаться не только дороже, но и менее надёжной в самых нагруженных местах пола, где отвод тепла ограничен сильнее всего. Под стационарной мебелью и техникой контур обычно не ведут, потому что там тепло хуже работает в помещении и при этом создаёт лишнюю нагрузку на сам узел пола. Особенно это важно под встроенной мебелью, ванной, душевыми поддонами и крупной техникой, где нагрев либо бесполезен, либо нежелателен по условиям эксплуатации. Особенно это важно для встроенной мебели без ножек, сантехники, техники и других зон, где тепло не работает в помещение, а кабель или мат получают лишнюю тепловую нагрузку. Да, под стационарной мебелью и тяжёлыми предметами кабель или трубы обычно не укладывают. План расстановки мебели лучше зафиксировать до покупки комплекта, иначе перерасчёт потом легко превращается в лишний материал. Особенно это важно для стационарной мебели без ножек, где тепло хуже отводится и кабель или мат работают в менее комфортном режиме."
    },
    {
      question: "Что выбрать: нагревательный мат или кабель?",
      answer: "Нагревательный мат удобнее и быстрее укладывать на ровное основание под плитку, когда важны простой монтаж, минимальная толщина системы и предсказуемая схема укладки без сложной настройки. Кабель даёт больше гибкости по шагу укладки, позволяет точнее обходить мебель и сложные зоны и чаще выбирается, когда нужно подстроить систему под конкретную тепловую нагрузку помещения, толщину стяжки и нестандартную геометрию пола, а не просто быстро закрыть открытую площадь и уложиться в минимальную высоту пирога пола. Ошибка обычно возникает, когда мат выбирают для сложной геометрии, где система кабеля была бы заметно удобнее и точнее по раскладке, особенно вдоль обходов и узких полос. Если заранее не учесть форму помещения и тип чистового покрытия, экономия на более простом варианте потом часто превращается в неудобную раскладку и локальный перегрев отдельных зон. Мат удобнее на готовых ровных основаниях, а кабель полезнее там, где нужно гибко обходить зоны и подстраивать шаг укладки под геометрию помещения. Мат удобнее, когда нужно быстро уложиться в готовый слой, а кабель выигрывает там, где важна гибкость схемы и работа с нестандартной геометрией пола. Мат чаще удобнее для тонких конструкций и быстрого монтажа, а кабель даёт больше свободы по шагу укладки и толщине слоя в нестандартных зонах. Мат удобнее на готовом основании, а кабель выгоднее там, где нужно гибко настроить раскладку и шаг. Мат удобнее на готовом основании, а кабель выгоднее там, где нужна гибкая раскладка и собственная толщина стяжки. Маты удобнее там, где важна скорость и малая толщина, а кабель — где нужна более гибкая схема укладки и настройка шага."
    }
  ],
};



