import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalGreenhouse } from "../../../../engine/greenhouse";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE } from "../../../../engine/accuracy";
import greenhouseSpec from "../../../../configs/calculators/greenhouse-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const SHEET_WIDTH_M = 2.1;

const ROOF_LABELS: Record<number, string> = {
  0: "арочная оболочка",
  1: "двускатная оболочка",
};

const FOUNDATION_LABELS: Record<number, string> = {
  0: "анкеровка к грунту",
  1: "опора на деревянную раму",
  2: "свайное основание",
  3: "ленточное основание",
};

const formatRuNumber = (value: number, maximumFractionDigits = 3): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const snapPolycarbonate = (value: number): 4 | 6 | 8 | 10 => {
  if (value >= 9) return 10;
  if (value >= 7) return 8;
  if (value >= 5) return 6;
  return 4;
};

const snapSheetLength = (value: number): 6 | 12 => value >= 9 ? 12 : 6;

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

function getSemiEllipseGeometry(width: number, rise: number) {
  const horizontalSemiAxis = width / 2;
  const verticalSemiAxis = rise;
  const ramanujanH = (
    (horizontalSemiAxis - verticalSemiAxis) ** 2
    / (horizontalSemiAxis + verticalSemiAxis) ** 2
  );
  const fullEllipsePerimeter = Math.PI * (horizontalSemiAxis + verticalSemiAxis) * (
    1 + (3 * ramanujanH) / (10 + Math.sqrt(4 - 3 * ramanujanH))
  );
  const arcLength = fullEllipsePerimeter / 2;
  const endArea = Math.PI * horizontalSemiAxis * verticalSemiAxis / 2;

  return { horizontalSemiAxis, verticalSemiAxis, arcLength, endArea };
}

export const greenhouseDef: CalculatorDefinition = {
  id: "facade_greenhouse",
  slug: "teplitsa-iz-polikarbonata",
  title: "Калькулятор теплицы из поликарбоната",
  h1: "Калькулятор теплицы из поликарбоната — площадь и листы",
  description: "Рассчитайте площадь покрытия арочной или двускатной теплицы и теоретический минимум листов поликарбоната с явным запасом на раскрой.",
  metaTitle: withSiteMetaTitle("Калькулятор теплицы из поликарбоната"),
  metaDescription: "Бесплатный калькулятор теплицы из поликарбоната: рассчитайте площадь арочной или двускатной оболочки и минимум листов 2,1×6/12 м с выбранным запасом.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["теплица", "поликарбонат", "теплица из поликарбоната", "площадь теплицы", "расчёт листов"],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина теплицы",
      type: "slider",
      unit: "м",
      min: 2,
      max: 12,
      step: 0.5,
      defaultValue: 6,
      hint: "Наружный габарит вдоль конька или арки.",
    },
    {
      key: "width",
      label: "Ширина теплицы",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 2, label: "2 м" },
        { value: 3, label: "3 м" },
        { value: 4, label: "4 м" },
        { value: 5, label: "5 м" },
        { value: 6, label: "6 м" },
      ],
    },
    {
      key: "height",
      label: "Высота в коньке / вершине арки",
      type: "slider",
      unit: "м",
      min: 1.8,
      max: 3,
      step: 0.1,
      defaultValue: 2.1,
      hint: "Для арки это стрела подъёма от основания до вершины; она действительно участвует в геометрии.",
      fullWidth: true,
    },
    {
      key: "roofType",
      label: "Форма покрытия",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Арочная — полуэллипс по ширине и высоте" },
        { value: 1, label: "Двускатная — прямые стены и два ската" },
      ],
      fullWidth: true,
    },
    {
      key: "wallHeight",
      label: "Высота прямой боковой стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 2.8,
      step: 0.1,
      defaultValue: 1.5,
      hint: "Только для двускатной формы. Должна быть минимум на 0,1 м ниже конька.",
      hideIf: { key: "roofType", op: "eq", value: 0 },
    },
    {
      key: "polycarbonateThickness",
      label: "Толщина выбранного поликарбоната",
      type: "select",
      defaultValue: 6,
      options: [
        { value: 4, label: "4 мм" },
        { value: 6, label: "6 мм" },
        { value: 8, label: "8 мм" },
        { value: 10, label: "10 мм" },
      ],
      hint: "Толщина используется только в названии позиции. Пригодность листа подтверждают паспортом производителя и расчётом каркаса.",
      fullWidth: true,
    },
    {
      key: "sheetLength",
      label: "Длина выбранного листа шириной 2,1 м",
      type: "select",
      unit: "м",
      defaultValue: 6,
      options: [
        { value: 6, label: "6 м" },
        { value: 12, label: "12 м" },
      ],
      hint: "Калькулятор делит площадь на полный формат листа. Фактическое число подтверждается картой раскроя.",
    },
    {
      key: "cuttingReservePct",
      label: "Запас на раскрой",
      type: "select",
      unit: "%",
      defaultValue: 10,
      options: [
        { value: 0, label: "0% — только чистая площадь" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
      ],
      hint: "Это ваш явный запас, а не норматив. Сложность раскладки калькулятор автоматически не угадывает.",
    },
    {
      key: "archStep",
      label: "Фактический шаг поперечных рам / дуг",
      type: "select",
      defaultValue: 0.65,
      options: [
        { value: 0.5, label: "0,50 м" },
        { value: 0.65, label: "0,65 м" },
        { value: 1, label: "1,00 м" },
      ],
      hint: "Нужен только для геометрического числа рам. Допустимый шаг берите из паспорта системы или проекта для своих снеговых и ветровых нагрузок.",
      fullWidth: true,
    },
    {
      key: "doorCount",
      label: "Дверных комплектов по вашей схеме",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 комплект" },
        { value: 2, label: "2 комплекта" },
      ],
      hint: "Размер, профиль, петли, ручки и усиление проёма калькулятор не назначает.",
    },
    {
      key: "ventCount",
      label: "Форточек по вашей схеме",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      hint: "Количество вводится пользователем. Площадь проветривания и автоматика не рассчитываются.",
    },
    {
      key: "foundationType",
      label: "Выбранная опорная схема — только для напоминания",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Анкеровка к грунту" },
        { value: 1, label: "Деревянная опорная рама" },
        { value: 2, label: "Свайное основание" },
        { value: 3, label: "Ленточное основание" },
      ],
      hint: "Размеры, материалы, глубина, защита от пучения и узел крепления каркаса здесь не рассчитываются.",
      fullWidth: true,
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalGreenhouse(
      greenhouseSpec as any,
      inputs,
      defaultFactorTables.factors as any,
    );
    const accuracyMode = canonical.accuracyMode ?? DEFAULT_ACCURACY_MODE;

    const length = clamp(Number(inputs.length ?? 6), 2, 12);
    const width = clamp(Number(inputs.width ?? 3), 2, 6);
    const height = clamp(Number(inputs.height ?? 2.1), 1.8, 3);
    const roofType = clampInteger(Number(inputs.roofType ?? 0), 0, 1);
    const requestedWallHeight = clamp(Number(inputs.wallHeight ?? 1.5), 0.5, 2.8);
    const wallHeight = Math.min(requestedWallHeight, height - 0.1);
    const polycarbonateThickness = snapPolycarbonate(Number(inputs.polycarbonateThickness ?? 6));
    const sheetLength = snapSheetLength(Number(inputs.sheetLength ?? 6));
    const cuttingReservePct = clamp(Number(inputs.cuttingReservePct ?? 10), 0, 20);
    const archStep = clamp(Number(inputs.archStep ?? 0.65), 0.5, 1);
    const doorCount = clampInteger(Number(inputs.doorCount ?? 2), 1, 2);
    const ventCount = clampInteger(Number(inputs.ventCount ?? 2), 0, 6);
    const foundationType = clampInteger(Number(inputs.foundationType ?? 1), 0, 3);

    let shellArea = 0;
    let crossSectionBoundaryM = 0;
    let endArea = 0;
    let horizontalSemiAxisM = 0;
    let verticalSemiAxisM = 0;
    let slopeLengthM = 0;

    if (roofType === 0) {
      const geometry = getSemiEllipseGeometry(width, height);
      crossSectionBoundaryM = geometry.arcLength;
      endArea = geometry.endArea;
      horizontalSemiAxisM = geometry.horizontalSemiAxis;
      verticalSemiAxisM = geometry.verticalSemiAxis;
      shellArea = geometry.arcLength * length + 2 * geometry.endArea;
    } else {
      const ridgeRise = height - wallHeight;
      slopeLengthM = Math.sqrt((width / 2) ** 2 + ridgeRise ** 2);
      crossSectionBoundaryM = 2 * wallHeight + 2 * slopeLengthM;
      endArea = width * wallHeight + width * ridgeRise / 2;
      shellArea = (2 * wallHeight + 2 * slopeLengthM) * length + 2 * endArea;
    }

    const sheetArea = SHEET_WIDTH_M * sheetLength;
    const shellAreaWithReserve = shellArea * (1 + cuttingReservePct / 100);
    const exactSheetNeed = shellAreaWithReserve / sheetArea;
    const polySheets = Math.ceil(exactSheetNeed);
    const transverseFrameCount = Math.ceil(length / archStep) + 1;
    const leftoverSheetEquivalent = polySheets - exactSheetNeed;

    const materials: MaterialResult[] = [
      {
        name: `Поликарбонат ${polycarbonateThickness} мм, лист ${formatRuNumber(SHEET_WIDTH_M)} × ${sheetLength} м — минимум по площади`,
        quantity: round(exactSheetNeed),
        unit: "листа по площади",
        withReserve: round(exactSheetNeed),
        purchaseQty: polySheets,
        category: "Предварительное покрытие",
        subtitle: `${formatRuNumber(shellArea)} м² × ${formatRuNumber(1 + cuttingReservePct / 100, 2)} / ${formatRuNumber(sheetArea)} м² = ${formatRuNumber(exactSheetNeed)} листа; округление вверх даёт ${polySheets}. Карта раскроя, направление каналов, стыки и допустимый радиус изгиба могут увеличить заказ`,
        highlight: true,
      },
      {
        name: `Поперечные рамы / дуги с шагом не более ${formatRuNumber(archStep)} м — геометрический ориентир`,
        quantity: transverseFrameCount,
        unit: "шт",
        withReserve: transverseFrameCount,
        purchaseQty: transverseFrameCount,
        category: "Контроль схемы",
        subtitle: `ceil(${formatRuNumber(length)} / ${formatRuNumber(archStep)}) + 1 = ${transverseFrameCount}. Сечение, продольные связи, узлы и несущая способность не рассчитаны`,
      },
      {
        name: "Дверной комплект по выбранной системе",
        quantity: doorCount,
        unit: "шт",
        withReserve: doorCount,
        purchaseQty: doorCount,
        category: "Введено пользователем",
        subtitle: `Количество ${doorCount} введено пользователем. Размеры, профиль обрамления, петли, ручки и усиление проёма не рассчитаны`,
      },
    ];

    if (ventCount > 0) {
      materials.push({
        name: "Форточка по выбранной системе",
        quantity: ventCount,
        unit: "шт",
        withReserve: ventCount,
        purchaseQty: ventCount,
        category: "Введено пользователем",
        subtitle: `Количество ${ventCount} введено пользователем. Размер, расположение, автоматика и требуемая площадь проветривания не рассчитаны`,
      });
    }

    const scenario: CalculatorScenario = {
      exact_need: round(exactSheetNeed, 6),
      purchase_quantity: polySheets,
      leftover: round(leftoverSheetEquivalent, 6),
      assumptions: [
        `formula_version:${canonical.formulaVersion}`,
        `roof_type:${roofType}`,
        `sheet_width_m:${SHEET_WIDTH_M}`,
        `sheet_length_m:${sheetLength}`,
        `cutting_reserve_pct:${cuttingReservePct}`,
        "layout_not_calculated:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: `polycarbonate-${polycarbonateThickness}mm-${sheetLength}m-sheet`,
        package_size: 1,
        packages_count: polySheets,
        unit: "лист",
      },
    };

    const warnings = [
      roofType === 0
        ? `Арочная оболочка рассчитана как полуэллипс по ширине ${formatRuNumber(width)} м и фактической высоте ${formatRuNumber(height)} м. Это предварительная геометрическая модель, а не проверка профиля заводской дуги.`
        : `Двускатная оболочка рассчитана по ширине ${formatRuNumber(width)} м, высоте стен ${formatRuNumber(wallHeight)} м и коньку ${formatRuNumber(height)} м. Свесы, фронтонные доборы и узлы примыкания не включены.`,
      `Теоретический минимум по площади — ${polySheets} ${pluralRu(polySheets, "лист", "листа", "листов")}, но это не готовая карта раскроя. Раскладка должна учитывать направление каналов, стыки на опорах, допустимый радиус изгиба, температурные зазоры и размеры выбранной панели.`,
      "Толщина поликарбоната и шаг поперечных рам не подтверждают несущую способность. Снеговые и ветровые нагрузки, их сочетания, прогибы, сечение профиля, продольные связи и узлы проверяются по паспорту системы или проекту для места установки.",
      `Выбрана опорная схема «${FOUNDATION_LABELS[foundationType]}», но фундамент, анкеровка, пучение грунта, коррозия и узел крепления каркаса не рассчитаны и в ведомость не включены.`,
      "Профиль каркаса, прогоны, соединители, термошайбы, саморезы, ленты, торцевые и соединительные профили автоматически не назначаются: их количество зависит от карты листов и технической документации конкретной системы.",
      "MIN/REC/MAX и режим точности не меняют геометрию или число листов скрытыми коэффициентами. В расчёте действует только явно выбранный запас на раскрой.",
    ];

    if (roofType === 1 && requestedWallHeight >= height) {
      warnings.push(`Высота боковой стены должна быть ниже высоты в коньке. В расчёте ограничено до ${formatRuNumber(wallHeight)} м; исправьте исходный размер перед заказом.`);
    }

    if (sheetLength === 12) {
      warnings.push("12-метровые листы требуют заранее проверить наличие, транспорт, разгрузку, хранение и допустимую схему монтажа у выбранного производителя.");
    }

    if (ventCount === 0) {
      warnings.push("Форточки не выбраны. Калькулятор не проверяет воздухообмен и защиту растений от перегрева — схему проветривания нужно определить отдельно.");
    }

    const practicalNotes = [
      `Геометрия: ${ROOF_LABELS[roofType]}.`,
      `Чистая площадь оболочки: ${formatRuNumber(shellArea)} м²; с выбранным запасом ${formatRuNumber(cuttingReservePct)}%: ${formatRuNumber(shellAreaWithReserve)} м².`,
      `Формат листа модели: ${formatRuNumber(SHEET_WIDTH_M)} × ${sheetLength} м (${formatRuNumber(sheetArea)} м²).`,
      `Поперечных рам по введённому максимальному шагу: ${transverseFrameCount}; металлопрокат и продольные связи не рассчитаны.`,
      "Для наружного применения выбирайте панели с защитой от ультрафиолетового излучения и соблюдайте ориентацию стороны по маркировке производителя.",
    ];

    return {
      materials,
      totals: {
        length: round(length),
        width: round(width),
        height: round(height),
        roofType,
        wallHeight: round(wallHeight),
        polycarbonateThickness,
        sheetWidth: SHEET_WIDTH_M,
        sheetLength,
        sheetArea: round(sheetArea),
        cuttingReservePct: round(cuttingReservePct),
        archStep: round(archStep),
        doorCount,
        ventCount,
        foundationType,
        polyArea: round(shellArea),
        polyAreaWithReserve: round(shellAreaWithReserve),
        polySheets,
        exactSheetNeed: round(exactSheetNeed, 6),
        archCount: transverseFrameCount,
        transverseFrameCount,
        archLengthM: round(crossSectionBoundaryM),
        endArea: round(endArea),
        horizontalSemiAxisM: round(horizontalSemiAxisM),
        verticalSemiAxisM: round(verticalSemiAxisM),
        slopeLengthM: round(slopeLengthM),
        minExactNeed: round(exactSheetNeed, 6),
        recExactNeed: round(exactSheetNeed, 6),
        maxExactNeed: round(exactSheetNeed, 6),
        minPurchase: polySheets,
        recPurchase: polySheets,
        maxPurchase: polySheets,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: canonical.accuracyExplanation?.modeLabel ?? ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет геометрию, число рам или число листов; применяется только выбранный запас на раскрой."],
      },
      summaryCards: [
        {
          icon: "📐",
          label: "Площадь оболочки",
          value: formatRuNumber(shellArea),
          unit: "м²",
          hint: `${ROOF_LABELS[roofType]}, без скрытого запаса`,
          tone: "violet",
        },
        {
          icon: "▱",
          label: "Минимум по площади",
          value: String(polySheets),
          unit: pluralRu(polySheets, "лист", "листа", "листов"),
          hint: `${formatRuNumber(SHEET_WIDTH_M)} × ${sheetLength} м, запас ${formatRuNumber(cuttingReservePct)}%; нужна карта раскроя`,
          tone: "amber",
        },
        {
          icon: "⚠",
          label: "Каркас и основание",
          value: "По проекту",
          hint: "Нагрузки, профиль, узлы и фундамент не рассчитаны",
          tone: "slate",
        },
      ],
      hidePrimaryMaterialBadge: true,
      materialListBanner: "Предварительная ведомость покрытия и введённых комплектов. Не используйте её как спецификацию каркаса, крепежа или фундамента.",
    };
  },
  formulaDescription: `
**Предварительный расчёт покрытия теплицы:**
- Арочная форма моделируется полуэллипсом по фактическим ширине и высоте, а не скрытым полуцилиндром.
- Двускатная форма использует явную высоту боковой стены, длину ската и площадь двух торцов.
- Площадь с запасом = площадь оболочки × (1 + выбранный запас / 100).
- Теоретический минимум листов = ceil(площадь с запасом / (2,1 × выбранная длина листа)).
- MIN/REC/MAX совпадают: конструктивные элементы нельзя менять общими коэффициентами отходов.
- ГОСТ Р 56712-2015 распространяется на многослойные поликарбонатные панели, включая покрытия теплиц; пригодность конкретной панели определяют её технические характеристики.
- СП 20.13330.2016 и ГОСТ 27751-2014 требуют учитывать нагрузки, сочетания и предельные состояния. Калькулятор не заменяет проверку каркаса и основания.
  `,
  howToUse: [
    "Введите наружные длину, ширину и фактическую высоту теплицы",
    "Выберите арочную или двускатную форму; для двускатной укажите высоту прямой стены",
    "Укажите толщину и длину уже выбранного листа — калькулятор не подбирает их по снеговому району",
    "Выберите явный запас на раскрой; скрытый процент не добавляется",
    "Укажите фактический шаг рам только для проверки их геометрического количества",
    "Введите количество дверей и форточек по своей схеме и выберите опорную схему для напоминания о границах",
    "Используйте число листов как минимум по площади и подтвердите его картой раскроя и паспортом системы",
  ],
  faq: [
    {
      question: "Почему число листов называется минимумом по площади?",
      answer: "Деление общей площади на площадь листа не знает раскладку, направление каналов, места стыков, допустимый изгиб и остатки конкретных деталей. Поэтому целое число листов нужно подтвердить картой раскроя.",
    },
    {
      question: "Подбирает ли калькулятор толщину поликарбоната и шаг дуг по снегу?",
      answer: "Нет. Толщина сама по себе не определяет несущую способность. Нужны характеристики выбранной панели, снеговые и ветровые нагрузки, геометрия и сечение каркаса, продольные связи, узлы и условия опирания.",
    },
    {
      question: "Почему нет профиля, термошайб и фундамента?",
      answer: "Их нельзя достоверно получить из одних габаритов. Профиль и основание требуют расчёта нагрузок, а крепёж и комплектующие — карты листов и монтажной документации конкретной системы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор теплицы из поликарбоната</h2>
<p>Калькулятор определяет геометрическую площадь покрытия арочной или двускатной теплицы и переводит её в <strong>теоретический минимум листов</strong> выбранного формата 2,1×6 или 2,1×12 м. Запас на раскрой задаётся пользователем явно.</p>
<p>Это не проект каркаса и не готовая закупочная спецификация. Результат не назначает профиль, прогоны, соединительные узлы, крепёж, ленты, торцевые профили, анкеры и фундамент.</p>

<h2>Арочная теплица: ширина и высота участвуют в расчёте</h2>
<p>Арка моделируется верхней половиной эллипса с полуосями <strong>a = W / 2</strong> и <strong>b = H</strong>. Длина дуги оценивается устойчивой формулой Рамануджана для половины периметра эллипса, а площадь одного торца равна <strong>π × a × b / 2</strong>. Площадь оболочки:</p>
<p><strong>S = длина дуги × L + 2 × площадь торца</strong></p>
<p>Так высота реальной арки не игнорируется, а оболочка остаётся внутри введённой ширины. Модель всё равно нужно сверить с геометрией заводской дуги: круговая, составная, стрельчатая или с прямыми боковинами форма требует фактической длины профиля или карты деталей.</p>

<h2>Двускатная теплица</h2>
<p>Для двускатной формы пользователь вводит высоту прямой стены. Длина одного ската:</p>
<p><strong>a = √((W / 2)² + (H − h<sub>стены</sub>)²)</strong></p>
<p>Площадь включает две боковые стены, два ската и два торца. Свесы, нахлёсты, фронтонные доборы и примыкания в чистую геометрию не входят.</p>

<h2>Как получено число листов</h2>
<p><strong>S<sub>запас</sub> = S × (1 + p / 100)</strong></p>
<p><strong>n<sub>по площади</sub> = S<sub>запас</sub> / (2,1 × длина листа)</strong></p>
<p><strong>n<sub>минимум</sub> = ⌈n<sub>по площади</sub>⌉</strong></p>
<p>Это нижняя оценка по общей площади. Перед заказом нужна карта раскроя с направлением внутренних каналов, опиранием стыков, допустимым радиусом холодного изгиба, температурными зазорами и реальными размерами выбранной панели.</p>

<h2>Почему калькулятор не обещает несущую способность</h2>
<p><a href="https://protect.gost.ru/sp/details/bac9e1fe-45f1-401b-8e32-949f4ee27821" target="_blank" rel="noopener noreferrer">СП 20.13330.2016 с изменениями № 1–6</a> устанавливает требования к назначению нагрузок, воздействий и их сочетаний. <a href="https://protect.gost.ru/gost/details/e4eba4be-53ab-4df2-ac3e-2bf10c2bea35" target="_blank" rel="noopener noreferrer">ГОСТ 27751-2014</a> задаёт общие принципы надёжности конструкций и расчёта по предельным состояниям.</p>
<p>Связка «толщина листа + шаг дуг» без снегового и ветрового района, характеристик панели, сечения профиля, связей, узлов и основания не доказывает безопасность. Поэтому шаг в форме используется только для геометрического числа поперечных рам.</p>

<h2>Требования к выбранному поликарбонату</h2>
<p><a href="https://protect.gost.ru/gost/details/8ba9e398-b5af-461e-9667-6c49ddc6eb8f" target="_blank" rel="noopener noreferrer">ГОСТ Р 56712-2015 «Панели многослойные из поликарбоната. Технические условия»</a> распространяется в том числе на покрытия парников и теплиц. Для наружных ограждающих конструкций стандарт предусматривает применение панелей с защитой от ультрафиолетового облучения.</p>
<p>Толщина 4, 6, 8 или 10 мм в калькуляторе — характеристика уже выбранной панели, а не автоматическая рекомендация. Проверяйте паспорт, структуру, массу на квадратный метр, минимальный радиус изгиба, условия опирания и монтажную инструкцию производителя.</p>

<h2>Что остаётся за пределами расчёта</h2>
<table>
  <thead><tr><th>Часть системы</th><th>Какие данные нужны</th></tr></thead>
  <tbody>
    <tr><td>Каркас</td><td>Нагрузки, марка и сечение профиля, геометрия дуг, продольные связи, узлы и расчёт прогибов.</td></tr>
    <tr><td>Крепление панелей</td><td>Карта листов, опоры стыков, инструкция панели, температурные зазоры и выбранные комплектующие.</td></tr>
    <tr><td>Основание</td><td>Грунты, пучение, отметки, коррозионная защита, ветровой отрыв и узел крепления каркаса.</td></tr>
    <tr><td>Проветривание</td><td>Культуры, сезон, объём, расположение проёмов, требуемый воздухообмен и автоматика.</td></tr>
  </tbody>
</table>
`,
    faq: [
      {
        question: "Можно ли сразу покупать рассчитанное число листов?",
        answer: "<p>Только после карты раскроя. Калькулятор округляет общую площадь до целых листов, но не размещает детали на листе и не проверяет ориентацию каналов, стыки, радиус изгиба и полезный остаток.</p>",
      },
      {
        question: "Почему высота влияет на арочную теплицу?",
        answer: "<p>Теплица шириной 3 м и высотой 2,1 м не является полуцилиндром радиусом 1,5 м. Калькулятор использует полуэллипс с горизонтальной полуосью W/2 и вертикальной полуосью H, поэтому обе величины влияют на длину дуги модели и площадь торца.</p>",
      },
      {
        question: "Как выбрать толщину листа и шаг каркаса?",
        answer: "<p>По паспорту совместимой системы и расчёту для места установки. Нужны снеговые и ветровые нагрузки, свойства панели, сечение и шаг рам, продольные связи, узлы, опирание и основание. Одна толщина листа безопасность не подтверждает.</p>",
      },
      {
        question: "Что означает запас на раскрой?",
        answer: "<p>Это выбранная пользователем прибавка к чистой геометрической площади. Она не является нормативом и не заменяет раскладку. Если карта листов уже готова, можно выбрать 0% и сравнить её с чистой площадью.</p>",
      },
    ],
  },
};
