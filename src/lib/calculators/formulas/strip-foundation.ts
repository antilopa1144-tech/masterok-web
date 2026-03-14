import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const stripFoundationDef: CalculatorDefinition = {
  id: "strip_foundation",
  slug: "lentochnyy-fundament",
  title: "Калькулятор ленточного фундамента",
  h1: "Калькулятор ленточного фундамента — расчёт бетона и арматуры",
  description: "Рассчитайте объём бетона, количество арматуры и опалубки для ленточного фундамента дома.",
  metaTitle: withSiteMetaTitle("Калькулятор ленточного фундамента | Расчёт бетона"),
  metaDescription: "Бесплатный калькулятор ленточного фундамента: рассчитайте бетон, арматуру, опалубку и объём ленты по периметру и размерам фундамента.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["ленточный фундамент", "фундамент", "бетон", "арматура", "опалубка"],
  popularity: 80,
  complexity: 3,
  fields: [
    {
      key: "perimeter",
      label: "Периметр ленты (все стены)",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 40,
      hint: "Общая длина всех несущих стен с учётом внутренних",
    },
    {
      key: "width",
      label: "Ширина ленты",
      type: "slider",
      unit: "мм",
      min: 200,
      max: 600,
      step: 50,
      defaultValue: 400,
    },
    {
      key: "depth",
      label: "Глубина ленты (ниже уровня земли)",
      type: "slider",
      unit: "мм",
      min: 300,
      max: 2000,
      step: 50,
      defaultValue: 700,
    },
    {
      key: "aboveGround",
      label: "Высота над землёй (цоколь)",
      type: "slider",
      unit: "мм",
      min: 0,
      max: 600,
      step: 50,
      defaultValue: 300,
    },
    {
      key: "reinforcement",
      label: "Армирование",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "2 нитки Ø12 мм (лёгкие постройки)" },
        { value: 1, label: "4 нитки Ø12 мм (дом 1–2 этажа)" },
        { value: 2, label: "4 нитки Ø14 мм (тяжёлые конструкции)" },
        { value: 3, label: "6 ниток Ø12 мм (широкая лента)" },
      ],
    },
    {
      key: "deliveryMethod",
      label: "Способ заливки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Миксер (самослив)" },
        { value: 1, label: "Бетононасос (+0.5 м³ потери)" },
        { value: 2, label: "Вручную (замес на месте)" },
      ],
    },
  ],
  calculate(inputs) {
    const perimeter = Math.max(10, inputs.perimeter ?? 40);
    const widthMm = Math.max(200, inputs.width ?? 400);
    const depthMm = Math.max(300, inputs.depth ?? 700);
    const aboveMm = Math.max(0, inputs.aboveGround ?? 300);
    const reinforcement = Math.round(inputs.reinforcement ?? 1);
    const delivery = Math.round(inputs.deliveryMethod ?? 0);

    const widthM = widthMm / 1000;
    const totalHeightM = (depthMm + aboveMm) / 1000;

    // Объём бетона
    let volume = perimeter * widthM * totalHeightM;
    
    // Технологические потери
    let techLoss = 0;
    if (delivery === 1) techLoss = 0.5; // остаток в системе насоса
    
    const volumeWithReserve = (volume + techLoss) * 1.07; // 7% на усадку и недовоз

    // Арматура
    const rebarDiamMm = reinforcement === 2 ? 14 : 12;
    let rebarThreads = 4;
    if (reinforcement === 0) rebarThreads = 2;
    if (reinforcement === 3) rebarThreads = 6;

    // Продольные нитки (нахлест 30-40 диаметров ~ 10% длины)
    const longitudinalLength = perimeter * rebarThreads * 1.12;

    // Поперечные хомуты (шаг 300-400 мм)
    const clampStep = 0.4;
    const clampCount = Math.ceil(perimeter / clampStep);
    // Длина хомута: 2*(W-0.1) + 2*(H-0.1) + 0.3 (загибы)
    const clampPerimeter = 2 * (widthM - 0.1 + totalHeightM - 0.1) + 0.3; 
    const clampLength = clampCount * Math.max(0.8, clampPerimeter) * 1.05;

    const totalRebarLength = longitudinalLength + clampLength;
    const rebarWeightKg = longitudinalLength * (rebarDiamMm === 14 ? 1.21 : 0.888) + clampLength * 0.395; // Ø8 = 0.395 кг/м

    // Вязальная проволока: ~0.05 кг на соединение
    const connections = clampCount * rebarThreads;
    const wireKg = Math.ceil(connections * 0.05 * 1.1 * 10) / 10;

    // Опалубка (две стороны)
    const formworkArea = 2 * perimeter * (aboveMm / 1000 + 0.1); // цоколь + 10см в землю
    const boardsPcs = Math.ceil(formworkArea / (0.15 * 6)); // доска 150×25×6000 мм

    const warnings: string[] = [];
    if (depthMm < 600 && perimeter > 30) warnings.push("Глубина менее 600 мм рискованна для отапливаемого здания. Проверьте глубину промерзания грунта");
    if (widthMm < 300) warnings.push("Ширина ленты менее 300 мм не рекомендуется для несущих стен из кирпича или блоков");
    if (delivery === 1 && volume < 5) warnings.push("Заказ бетононасоса для объёма < 5 м³ экономически невыгоден");

    const materials = [
      { name: "Бетон М250 (В20)", quantity: volume, unit: "м³", withReserve: Math.ceil(volumeWithReserve * 10) / 10, purchaseQty: Math.ceil(volumeWithReserve * 10) / 10, category: "Бетон" },
      { name: `Арматура Ø${rebarDiamMm} мм (рабочая)`, quantity: longitudinalLength, unit: "м.п.", withReserve: Math.ceil(longitudinalLength), purchaseQty: Math.ceil(longitudinalLength), category: "Арматура" },
      { name: "Арматура Ø8 мм (хомуты)", quantity: clampLength, unit: "м.п.", withReserve: Math.ceil(clampLength), purchaseQty: Math.ceil(clampLength), category: "Арматура" },
      { name: "Вязальная проволока (отожженная)", quantity: wireKg, unit: "кг", withReserve: wireKg, purchaseQty: Math.ceil(wireKg), category: "Арматура" },
      { name: "Доска опалубки 25×150×6000 мм", quantity: boardsPcs, unit: "шт", withReserve: boardsPcs, purchaseQty: boardsPcs, category: "Опалубка" },
      { name: "Брус 50×50 мм (распорки/колья)", quantity: Math.ceil(perimeter / 2), unit: "шт", withReserve: Math.ceil(perimeter / 2), purchaseQty: Math.ceil(perimeter / 2), category: "Опалубка" },
      { name: "Саморезы по дереву 70-90 мм", quantity: boardsPcs * 4, unit: "шт", withReserve: boardsPcs * 4, purchaseQty: Math.ceil(boardsPcs * 4 / 100) * 100, category: "Опалубка" },
    ];

    if (delivery === 2) {
      const cementBags = Math.ceil(volumeWithReserve * 300 / 50);
      materials.push({ name: "Цемент М400 (мешки 50 кг)", quantity: cementBags, unit: "мешков", withReserve: cementBags, purchaseQty: cementBags, category: "Компоненты (замес)" });
    }

    const scenarios = buildNativeScenarios({
      id: "strip-foundation-main",
      title: "Strip foundation main",
      exactNeed: volumeWithReserve,
      unit: "м³",
      packageSizes: [0.1],
      packageLabelPrefix: "strip-foundation-concrete",
    });

    return {
      materials,
      totals: { perimeter, widthMm, totalHeightM, volume, rebarWeightKg },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт ленточного фундамента (нормы РФ):**

1. **Бетон**: Объём = Периметр × Ширина × Высота. Запас 7% учитывает усадку при вибрировании и погрешность приёмки.
2. **Арматура**: 
   - Продольная: нахлёст 12% (по 40 диаметров в местах стыка).
   - Хомуты: шаг 400 мм, защитный слой бетона 50 мм с каждой стороны.
3. **Опалубка**: Расчёт по площади боковых поверхностей цокольной части.

Рекомендуемая марка бетона: М250 (В20) и выше.
  `,
  howToUse: [
    "Введите полный периметр ленты (все несущие стены)",
    "Укажите ширину ленты (обычно на 100 мм шире стены)",
    "Задайте глубину залегания и высоту цоколя",
    "Выберите способ заливки (насос требует доп. объёма)",
    "Нажмите «Рассчитать» — получите полную смету материалов",
  ],
  expertTips: [
    {
      title: "Защитный слой",
      content: "Арматура не должна касаться земли или опалубки. Используйте пластиковые фиксаторы («стульчики» и «звёздочки»), чтобы обеспечить слой бетона 50 мм. Это защитит металл от коррозии.",
      author: "Иваныч, прораб"
    },
    {
      title: "Продухи в цоколе",
      content: "Не забудьте заложить гильзы для продухов (вентиляции подполья) и ввода коммуникаций (вода, канализация) до заливки бетона. Долбить готовый монолит — дорого и долго.",
      author: "Инженер-строитель"
    }
  ],
  faq: [
    {
      question: "Нужна ли подбетонка?",
      answer: "Для лёгких и средних частных домов подбетонка нужна не всегда: на практике часто хватает хорошо уплотнённой песчано-гравийной подушки и отсечки, чтобы цементное молочко не уходило в основание. Но если грунт сложный, основание нестабильное, требуется очень аккуратный монтаж арматурного каркаса или работы идут по более жёсткой проектной схеме, подбетонка может быть оправдана как отдельный подготовительный слой, который упрощает армирование и повышает предсказуемость бетонирования по всей длине ленты. Особенно полезна она там, где важно получить чистое и стабильное основание под арматуру, гидроизоляцию, фиксаторы и точную отметку по всей ленте без постоянной поправки по месту, потому что именно эти мелочи потом влияют на геометрию всей ленты. Если гидроизоляцию планируют клеить по основанию до основного бетонирования, подбетонка часто сильно упрощает этот узел. Она особенно полезна там, где нужно аккуратно собрать арматурный каркас и гидроизоляцию без работы по грязному или осыпающемуся основанию. Она особенно упрощает точную раскладку арматуры и гидроизоляции там, где важно собрать чистый и геометрически понятный узел без работы по рыхлому основанию. Она не всегда обязательна, но часто помогает выровнять основание, защитить арматурный каркас от загрязнения и обеспечить более аккуратную работу гидроизоляции и опалубки. Она не всегда обязательна, но на слабом или грязном основании заметно упрощает гидроизоляцию и армирование. На мокром или осыпающемся основании этот слой часто окупается именно удобством сборки и чистотой узла. Там, где важно аккуратно выставить фиксаторы и собрать гидроизоляцию без грязи, этот слой часто окупается именно удобством работ, а не только прочностью."
    },
    {
      question: "Когда можно снимать опалубку?",
      answer: "В тёплую погоду боковую опалубку обычно снимают через 3–5 дней, когда бетон уже держит форму и не крошится на кромках, но нагружать фундамент в этот момент ещё рано. Для дальнейших работ безопаснее ориентироваться не только на срок, а и на фактический набор прочности: основную прочность бетон набирает примерно за 28 суток, а рабочую — за 7–10 дней при температуре около +20 °C, если бетон нормально укрывали, не пересушили и не дали кромкам промёрзнуть или быстро испарить влагу в первые дни, иначе даже правильный срок не гарантирует нужную прочность кромки. В прохладную погоду и при медленном твердении сроки снятия опалубки обычно требуют ещё более осторожного подхода, потому что бетон снаружи может выглядеть крепким раньше, чем реально наберёт нужную прочность. Если на ленту сразу опирают тяжёлые элементы или начинают обратную засыпку, ориентироваться лучше уже на более консервативный набор прочности, а не на минимальный срок снятия щитов. Срок зависит не только от календаря, но и от температуры, влажности и фактического набора прочности, поэтому на холодной погоде ориентироваться только на пару суток рискованно. Это зависит от температуры, марки бетона, влажностного режима и нагрузки на конструкцию, поэтому ориентируются не только на дни, но и на фактический набор прочности. Ориентируются не только на срок, но и на температуру, влажность и фактический набор прочности бетона. Срок зависит от температуры и реального набора прочности бетона, поэтому просто считать дни без условий опасно. Срок зависит не только от календарных дней, но и от температуры, марки бетона и того, какую нагрузку лента получит сразу после распалубки."
    }
  ]
};


