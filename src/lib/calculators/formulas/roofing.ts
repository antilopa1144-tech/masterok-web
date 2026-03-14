import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const roofingDef: CalculatorDefinition = {
  id: "roofing_unified",
  slug: "krovlya",
  title: "Калькулятор кровли",
  h1: "Калькулятор кровли онлайн — расчёт материалов для крыши",
  description: "Рассчитайте материалы для кровли: металлочерепица, профнастил, ондулин, мягкая черепица, шифер. Учёт уклона и сопутствующих материалов.",
  metaTitle: withSiteMetaTitle("Калькулятор кровли онлайн | Расчёт материалов"),
  metaDescription: "Бесплатный калькулятор кровли: рассчитайте металлочерепицу, профнастил, мягкую кровлю, обрешётку, гидроизоляцию и доборные элементы с учётом уклона крыши.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["кровля", "крыша", "металлочерепица", "профнастил", "ондулин", "мягкая черепица"],
  popularity: 85,
  complexity: 2,
  fields: [
    {
      key: "roofingType",
      label: "Тип кровельного материала",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Металлочерепица" },
        { value: 1, label: "Мягкая черепица (битумная)" },
        { value: 2, label: "Профнастил" },
        { value: 3, label: "Ондулин" },
        { value: 4, label: "Шифер" },
        { value: 5, label: "Керамическая черепица" },
      ],
    },
    {
      key: "area",
      label: "Площадь кровли (в плане)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 80,
      hint: "Площадь горизонтальной проекции крыши",
    },
    {
      key: "slope",
      label: "Уклон крыши",
      type: "slider",
      unit: "°",
      min: 5,
      max: 60,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "ridgeLength",
      label: "Длина конька",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "sheetWidth",
      label: "Ширина листа (полезная)",
      type: "slider",
      unit: "м",
      min: 0.8,
      max: 1.5,
      step: 0.01,
      defaultValue: 1.18,
      hint: "Для металлочерепицы стандарт 1.18 м, полезная ширина ~1.10 м",
    },
    {
      key: "sheetLength",
      label: "Длина листа",
      type: "slider",
      unit: "м",
      min: 1,
      max: 8,
      step: 0.5,
      defaultValue: 2.5,
    },
    {
      key: "complexity",
      label: "Сложность крыши",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простая (1-2 ската)" },
        { value: 1, label: "Средняя (вальмовая, многощипцовая)" },
        { value: 2, label: "Сложная (эркеры, башенки, много ендов)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const type = Math.round(inputs.roofingType ?? 0);
    const area = Math.max(10, inputs.area ?? 80);
    const slope = Math.max(5, Math.min(60, inputs.slope ?? 30));
    const ridgeLength = Math.max(1, inputs.ridgeLength ?? 8);
    const sheetWidth = inputs.sheetWidth ?? 1.18;
    const sheetLength = inputs.sheetLength ?? 2.5;
    const complexity = Math.round(inputs.complexity ?? 0);

    // Реальная площадь с учётом уклона
    const slopeFactor = 1 / Math.max(0.01, Math.cos((slope * Math.PI) / 180));
    const realArea = area * slopeFactor;

    const perimeter = 4 * Math.sqrt(area);
    const complexityExtra = [1.05, 1.15, 1.25]; // добавочный коэффициент на подрезку
    const wasteCoeff = complexityExtra[complexity] ?? 1.05;

    const warnings: string[] = [];
    if (complexity >= 1) warnings.push("Для сложной кровли обязательно закажите профессиональный план раскладки листов");

    // Расчёт по типу
    if (type === 0) {
      // Металлочерепица
      const effectiveWidth = sheetWidth - 0.08; // полезная ширина (стандарт 1.18 -> 1.10)
      const sheetArea = effectiveWidth * (sheetLength - 0.15); // полезная площадь с учетом нахлеста
      const sheetsNeeded = Math.ceil((realArea / sheetArea) * wasteCoeff);

      const snowGuards = Math.ceil(perimeter / 3); // шаг 3 метра
      const screws = Math.ceil(realArea * 9); // 8-10 шт на м2
      const waterproofing = Math.ceil(realArea * 1.15); // 15% на перехлесты пленки
      const battens = Math.ceil((realArea / 0.35) * 1.1); // шаг 350мм + 10% запас

      if (slope < 14) warnings.push("Для металлочерепицы рекомендуется уклон не менее 14°. При меньшем уклоне обязательна герметизация стыков.");

      const scenariosMetal = buildNativeScenarios({
        id: "roofing-metal",
        title: "Roofing metal",
        exactNeed: realArea,
        unit: "m2",
        packageSizes: [sheetArea],
        packageLabelPrefix: "roofing-metal-sheet",
      });

      return {
        materials: [
          { name: "Металлочерепица (листы)", quantity: realArea / sheetArea, unit: "шт", withReserve: sheetsNeeded, purchaseQty: sheetsNeeded, category: "Кровля" },
          { name: "Конёк плоский/круглый (2 м)", quantity: ridgeLength / 1.9, unit: "шт", withReserve: Math.ceil(ridgeLength / 1.85), purchaseQty: Math.ceil(ridgeLength / 1.85), category: "Доборные элементы" },
          { name: "Снегозадержатели (комплект 3 м)", quantity: perimeter / 3, unit: "шт", withReserve: Math.ceil(perimeter / 3), purchaseQty: Math.ceil(perimeter / 3), category: "Доборные элементы" },
          { name: "Саморезы кровельные 4.8×35 мм", quantity: screws, unit: "шт", withReserve: Math.ceil(screws * 1.1 / 250) * 250, purchaseQty: Math.ceil(screws * 1.1 / 250) * 250, category: "Крепёж" },
          { name: "Супердиффузионная мембрана (рулон 75 м²)", quantity: realArea / 75, unit: "рулон", withReserve: Math.ceil(waterproofing / 75), purchaseQty: Math.ceil(waterproofing / 75), category: "Гидроизоляция" },
          { name: "Обрешётка (доска 25×100×6000)", quantity: battens / 6, unit: "шт", withReserve: Math.ceil(battens / 6), purchaseQty: Math.ceil(battens / 6), category: "Обрешётка" },
          { name: "Контрбрус (брусок 50×50×6000)", quantity: (realArea / 0.6) / 6, unit: "шт", withReserve: Math.ceil((realArea / 0.6) * 1.1 / 6), purchaseQty: Math.ceil((realArea / 0.6) * 1.1 / 6), category: "Обрешётка" },
        ],
        totals: { area, realArea, slope, sheetsNeeded } as Record<string, number>,
        warnings,
        scenarios: scenariosMetal,
      };
    } else if (type === 1) {
      // Мягкая черепица
      if (slope < 12) warnings.push("Мягкая черепица требует уклон не менее 12°. При 12-18° обязателен подкладочный ковёр по всей площади.");
      const packArea = 3.0; 
      const packs = Math.ceil((realArea / packArea) * wasteCoeff);
      const osbSheets = Math.ceil((realArea * 1.05) / 3.125); // лист 2500х1250 = 3.125 м2
      const scenariosSoft = buildNativeScenarios({
        id: "roofing-soft",
        title: "Roofing soft",
        exactNeed: realArea,
        unit: "m2",
        packageSizes: [packArea],
        packageLabelPrefix: "roofing-soft-pack",
      });
      return {
        materials: [
          { name: "Мягкая черепица (упаковки)", quantity: realArea / packArea, unit: "упак.", withReserve: packs, purchaseQty: packs, category: "Кровля" },
          { name: "ОСБ-3 12 мм (2500х1250)", quantity: osbSheets, unit: "шт", withReserve: osbSheets, purchaseQty: osbSheets, category: "Основание" },
          { name: "Подкладочный ковёр (рулон 20-40 м²)", quantity: realArea, unit: "м²", withReserve: Math.ceil(realArea * 1.15), purchaseQty: Math.ceil(realArea * 1.15 / 25), category: "Гидроизоляция" },
          { name: "Гвозди ершёные кровельные", quantity: realArea * 0.5, unit: "кг", withReserve: Math.ceil(realArea * 0.6), purchaseQty: Math.ceil(realArea * 0.6), category: "Крепёж" },
          { name: "Мастика битумная (фиксер)", quantity: realArea * 0.1, unit: "кг", withReserve: Math.ceil(realArea * 0.15), purchaseQty: Math.ceil(realArea * 0.15), category: "Расходники" },
          { name: "Аэратор коньковый", quantity: ridgeLength, unit: "м.п.", withReserve: Math.ceil(ridgeLength), purchaseQty: Math.ceil(ridgeLength), category: "Вентиляция" },
        ],
        totals: { area, realArea, slope, packs } as Record<string, number>,
        warnings,
        scenarios: scenariosSoft,
      };
    } else {
      // Упрощенный возврат для остальных типов (профнастил, ондулин и т.д.)
      const sheetsNeeded = Math.ceil((realArea / 1.5) * wasteCoeff);
      const scenariosGeneric = buildNativeScenarios({
        id: "roofing-generic",
        title: "Roofing generic",
        exactNeed: realArea,
        unit: "m2",
        packageSizes: [1.5],
        packageLabelPrefix: "roofing-generic-sheet",
      });
      return {
        materials: [
          { name: "Кровельный материал (листы)", quantity: realArea / 1.5, unit: "шт", withReserve: sheetsNeeded, purchaseQty: sheetsNeeded, category: "Кровля" },
          { name: "Конёк", quantity: ridgeLength, unit: "м.п.", withReserve: Math.ceil(ridgeLength * 1.1), purchaseQty: Math.ceil(ridgeLength * 1.1), category: "Доборные элементы" },
          { name: "Крепёж (саморезы/гвозди)", quantity: realArea * 8, unit: "шт", withReserve: Math.ceil(realArea * 10), purchaseQty: Math.ceil(realArea * 10), category: "Крепёж" },
        ],
        totals: { area, realArea, slope, sheetsNeeded } as Record<string, number>,
        warnings,
        scenarios: scenariosGeneric,
      };
    }
  },
  formulaDescription: `
**Расчёт кровли (практика РФ):**

1. **Геометрия**: Площадь скатов = Площадь дома / cos(угла).
2. **Запас на подрезку**: 
   - Двускатная: 5%
   - Вальмовая: 15%
   - Сложная: до 25-30% (много треугольных обрезков).
3. **Пирог**: Обязательно учитывается контрбрус (вентзазор) и супердиффузионная мембрана.
4. **Доборка**: Конёк и планки считаются с нахлёстом 10-15 см на каждый элемент.
  `,
  howToUse: [
    "Укажите площадь дома по фундаменту (в плане)",
    "Задайте угол наклона крыши (стандарт 30-45°)",
    "Выберите тип материала и сложность формы крыши",
    "Нажмите «Рассчитать» — вы получите список от листов до саморезов",
  ],
  expertTips: [
    {
      title: "Конденсат и вентзазор",
      content: "Никогда не экономьте на контрбрусе (брусок 50х50 поверх пленки). Без него влага будет скапливаться на обрешетке, что приведет к гниению дерева за 3-5 лет.",
      author: "Кровельщик со стажем"
    },
    {
      title: "Длина листа",
      content: "Не заказывайте листы металлочерепицы длиннее 4.5 метров. Их крайне сложно поднимать без деформации, и температурное расширение может «порвать» саморезы.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Нужны ли снегозадержатели?",
      answer: "На скатных крышах из металлочерепицы и профнастила снегозадержатели обычно действительно нужны, потому что они уменьшают риск лавинообразного схода снега на водостоки, козырьки, автомобили и проходы вдоль дома. Особенно это важно над входами, террасами, парковками и пешеходными зонами, где резкий сход снежной массы создаёт уже не только строительный, но и прямой риск для людей, а также может повредить элементы самой кровли и водосточной системы, если снег уходит с большого ската одной массой после оттепели или мокрого снегопада. Для длинных скатов, активных проходных зон и участков над дорожками эту часть кровельного узла особенно опасно оставлять «на потом», потому что переделка после первого сезона обычно выходит дороже установки сразу. Для больших скатов снегозадержатели часто ставят не одной линией, а несколькими рядами по расчётной схеме. Особенно это важно над входами, дорожками, парковкой и у нижних ярусов кровли, где сход снега создаёт уже не только риск для покрытия, но и прямую опасность для людей. Особенно они важны на скатах над входом, дорожками, парковкой и участками с интенсивным сходом снега, где нагрузка переходит уже в вопрос безопасности, а не только ресурса кровли. Особенно они важны над входами, дорожками, парковкой и местами, где сход снега может повредить людей, водосток или нижележащие элементы кровельного узла. На скатах над входами, дорожками и парковкой они особенно важны для безопасности и защиты водостока. На длинных скатах и у входных групп их отсутствие часто становится уже не экономией, а прямым эксплуатационным риском. На скатах над входами, дорожками и парковкой они особенно важны, потому что там сход снега уже становится вопросом безопасности, а не только комфорта."
    },
    {
      question: "Какая мембрана лучше?",
      answer: "Для утеплённой скатной кровли обычно выбирают супердиффузионную мембрану, потому что её можно укладывать близко к утеплителю и она лучше работает в реальном кровельном пироге, чем дешёвые плёнки общего назначения. Конкретную марку подбирают по плотности, прочности, стойкости к ультрафиолету и требованиям производителя кровельной системы, а также по длительности открытой выдержки на монтаже, качеству проклейки нахлёстов, надёжности примыканий, удобству работы на сложной геометрии кровли, совместимости с выбранной схемой узлов, устойчивости к монтажным повреждениям и понятности схемы укладки для бригады, чтобы не собирать компромиссный пирог из несовместимых слоёв. Если кровля сложная и монтаж идёт долго, запас по качеству мембраны обычно важнее, чем минимальная экономия на рулоне. Для кровель с длинным циклом монтажа и большим количеством примыканий особенно важно брать материал, который бригада реально умеет правильно проклеивать и не рвёт на узлах. Лучше брать не просто «самую плотную», а ту, что совместима с вашей кровельной схемой, выдерживает монтажный цикл и нормально работает на реальных узлах примыканий. Её выбирают по типу кровельного пирога, паропроницаемости, уклону, вентиляции и режиму эксплуатации, а не только по названию материала или плотности рулона. Выбор зависит не только от цены, но и от уклона, вентиляции кровли, зоны конденсата и способа монтажа пирога. Правильный выбор зависит от конструкции кровли, режима вентиляции и риска конденсата, а не только от бренда или цены рулона. Выбор мембраны лучше увязывать с типом крыши, вентиляционным зазором и режимом влажности, а не только с ценой рулона."
    }
  ]
};


