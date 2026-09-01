import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import drainageSpec from "../../../../configs/calculators/drainage-canonical.v1.json";

const WEB_FORMULA_VERSION = "drainage-web-route-v1";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const round = (value: number, digits = 6): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundUpToStep = (value: number, step: number): number =>
  value > 0 ? round(Math.ceil((value - Number.EPSILON) / step) * step, 6) : 0;

const formatRuNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

export const drainageDef: CalculatorDefinition = {
  id: "engineering_drainage",
  slug: "drenazh-uchastka",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор дренажа участка",
  h1: "Калькулятор дренажа — материалы по проектной трассе",
  description: "Рассчитайте трубу по фактической длине проектной трассы, а песок, щебень, геотекстиль, колодцы и фитинги добавляйте только по явно заданным параметрам.",
  metaTitle: withSiteMetaTitle("Калькулятор дренажа: труба и материалы"),
  metaDescription: "Бесплатный калькулятор дренажа: рассчитайте трубу по проектной трассе и заданные материалы по фактической фасовке, сечению и ведомости.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["дренаж", "дренаж участка", "дренажная труба", "материалы дренажа", "расчёт дренажа"],
  popularity: 55,
  complexity: 3,
  fields: [
    {
      key: "pipeLengthM",
      label: "Суммарная длина трубы по проектной трассе",
      type: "slider",
      unit: "м",
      min: 5,
      max: 2000,
      step: 1,
      defaultValue: 40,
      hint: "Сложите фактические длины магистрали и всех ветвей. Калькулятор не достраивает «ёлочку», кольцо или боковые отводы по скрытому коэффициенту.",
      fullWidth: true,
    },
    {
      key: "pipeDiameterMm",
      label: "Наружный диаметр выбранной трубы",
      type: "number",
      unit: "мм",
      min: 50,
      max: 1000,
      step: 1,
      defaultValue: 110,
      hint: "Перенесите размер фактического изделия. Диаметр, жёсткость, перфорация и фильтр должны быть выбраны расчётом и документацией системы.",
    },
    {
      key: "pipeReservePercent",
      label: "Ваш запас трубы",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0% — длина проектной трассы" },
        { value: 3, label: "3%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
      ],
      hint: "Выберите после проверки подрезки, соединений и пригодности остатков. Скрытый запас и отдельный MAX-множитель не добавляются.",
    },
    {
      key: "pipeSaleStepM",
      label: "Шаг продажи или длина неделимой бухты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.1,
      defaultValue: 1,
      hint: "Введите фактический минимальный шаг отгрузки: 1 м при продаже на отрез или полную длину бухты/отрезка, если упаковка неделима.",
      fullWidth: true,
    },
    {
      key: "layersEnabled",
      label: "Добавить песчаный слой и щебёночную обсыпку",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — сечение проектом ещё не задано" },
        { value: 1, label: "Да — введу проектные размеры" },
      ],
      hint: "Калькулятор не назначает ширину траншеи, толщину подготовки и размеры обсыпки. Включайте блок только по принятому сечению.",
      fullWidth: true,
    },
    {
      key: "sandLayerWidthM",
      label: "Ширина песчаного слоя",
      type: "number",
      unit: "м",
      min: 0,
      max: 10,
      step: 0.01,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Проектная ширина слоя в поперечном сечении. Ноль исключает песок из ведомости.",
    },
    {
      key: "sandLayerThicknessMm",
      label: "Толщина песчаного слоя",
      type: "number",
      unit: "мм",
      min: 0,
      max: 2000,
      step: 1,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Проектная толщина слоя. Калькулятор не подставляет универсальные 100 мм.",
    },
    {
      key: "sandPurchaseFactor",
      label: "Коэффициент закупочного объёма песка",
      type: "number",
      min: 1,
      max: 2,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "1,00 — геометрический объём. Иное значение вводите по проекту, поставщику и способу уплотнения.",
    },
    {
      key: "gravelEnvelopeWidthM",
      label: "Ширина щебёночной обсыпки",
      type: "number",
      unit: "м",
      min: 0,
      max: 10,
      step: 0.01,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Полная проектная ширина прямоугольного контура щебня вокруг трубы.",
    },
    {
      key: "gravelEnvelopeHeightM",
      label: "Полная высота щебёночной обсыпки",
      type: "number",
      unit: "м",
      min: 0,
      max: 10,
      step: 0.01,
      defaultValue: 0,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Высота проектного контура щебня. Из его площади вычитается круглое сечение введённой трубы.",
    },
    {
      key: "gravelPurchaseFactor",
      label: "Коэффициент закупочного объёма щебня",
      type: "number",
      min: 1,
      max: 2,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Задаётся явно по проекту и условиям поставки; универсальный коэффициент не применяется.",
    },
    {
      key: "bulkSaleStepM3",
      label: "Шаг заказа сыпучих материалов",
      type: "number",
      unit: "м³",
      min: 0.01,
      max: 50,
      step: 0.01,
      defaultValue: 0.1,
      hideIf: { key: "layersEnabled", op: "eq", value: 0 },
      hint: "Минимальный шаг отгрузки поставщика. Каждый объём округляется вверх отдельно.",
      fullWidth: true,
    },
    {
      key: "geotextileEnabled",
      label: "Добавить геотекстиль",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема полотна не задана" },
        { value: 1, label: "Да — введу развёрнутую ширину и рулон" },
      ],
      hint: "Наличие, класс и фильтрующие свойства материала определяет проект. Здесь считается только площадь по принятой схеме полотна.",
      fullWidth: true,
    },
    {
      key: "geotextileDevelopedWidthM",
      label: "Развёрнутая ширина полотна на 1 м трассы",
      type: "number",
      unit: "м",
      min: 0,
      max: 20,
      step: 0.01,
      defaultValue: 0,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Длина поперечного развёрнутого контура по вашей схеме, включая стороны и верх. Нахлёсты задаются отдельным запасом.",
    },
    {
      key: "geotextileReservePercent",
      label: "Запас геотекстиля на нахлёсты и края",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
        { value: 30, label: "30%" },
      ],
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Выберите по фактической ширине рулона, раскрою, стыкам и заворотам. Риск грунтовых вод не умножает площадь автоматически.",
    },
    {
      key: "geotextileRollM2",
      label: "Площадь выбранного рулона",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20000,
      step: 0.1,
      defaultValue: 50,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Фактическая площадь неделимого рулона. Продажу отрезом проверяйте по правилам поставщика.",
    },
    {
      key: "projectItemsEnabled",
      label: "Добавить колодцы и фасонные части из проекта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — ведомость узлов не задана" },
        { value: 1, label: "Да — введу готовые количества" },
      ],
      hint: "Колодцы назначают по поворотам, перепадам, соединениям, обслуживанию и выпуску. Калькулятор не угадывает их по общей длине.",
      fullWidth: true,
    },
    {
      key: "inspectionWellCount",
      label: "Смотровые колодцы по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Готовое количество из схемы трассы без автоматического шага.",
    },
    {
      key: "collectorWellCount",
      label: "Приёмные или коллекторные колодцы по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Введите только предусмотренные проектом точки сбора, перекачки или выпуска.",
    },
    {
      key: "teeCount",
      label: "Тройники по схеме",
      type: "number",
      unit: "шт",
      min: 0,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Количество реальных ответвлений с учётом совместимости фитингов выбранной системы.",
    },
    {
      key: "elbowCount",
      label: "Отводы по схеме",
      type: "number",
      unit: "шт",
      min: 0,
      max: 5000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Количество фактических поворотов, где проектом предусмотрен отдельный фитинг.",
    },
  ],
  calculate(inputs) {
    const pipeLengthM = clamp(Number(inputs.pipeLengthM ?? 40), 5, 2000);
    const pipeDiameterMm = clamp(Number(inputs.pipeDiameterMm ?? 110), 50, 1000);
    const pipeReservePercent = clamp(Number(inputs.pipeReservePercent ?? 0), 0, 15);
    const pipeSaleStepM = clamp(Number(inputs.pipeSaleStepM ?? 1), 0.1, 1000);
    const pipeReservedM = pipeLengthM * (1 + pipeReservePercent / 100);
    const pipePurchaseLots = pipeReservedM > 0
      ? Math.ceil((pipeReservedM - Number.EPSILON) / pipeSaleStepM)
      : 0;
    const pipePurchaseM = round(pipePurchaseLots * pipeSaleStepM, 6);
    const pipeLeftoverM = round(Math.max(0, pipePurchaseM - pipeReservedM), 6);

    const layersEnabled = clampInteger(Number(inputs.layersEnabled ?? 0), 0, 1);
    const sandLayerWidthM = clamp(Number(inputs.sandLayerWidthM ?? 0), 0, 10);
    const sandLayerThicknessMm = clamp(Number(inputs.sandLayerThicknessMm ?? 0), 0, 2000);
    const sandPurchaseFactor = clamp(Number(inputs.sandPurchaseFactor ?? 1), 1, 2);
    const gravelEnvelopeWidthM = clamp(Number(inputs.gravelEnvelopeWidthM ?? 0), 0, 10);
    const gravelEnvelopeHeightM = clamp(Number(inputs.gravelEnvelopeHeightM ?? 0), 0, 10);
    const gravelPurchaseFactor = clamp(Number(inputs.gravelPurchaseFactor ?? 1), 1, 2);
    const bulkSaleStepM3 = clamp(Number(inputs.bulkSaleStepM3 ?? 0.1), 0.01, 50);
    const sandGeometricM3 = layersEnabled === 1
      ? pipeLengthM * sandLayerWidthM * sandLayerThicknessMm / 1000
      : 0;
    const sandPurchaseNeedM3 = sandGeometricM3 * sandPurchaseFactor;
    const sandPurchaseM3 = roundUpToStep(sandPurchaseNeedM3, bulkSaleStepM3);
    const pipeCrossSectionM2 = Math.PI * (pipeDiameterMm / 1000) ** 2 / 4;
    const gravelEnvelopeCrossSectionM2 = gravelEnvelopeWidthM * gravelEnvelopeHeightM;
    const gravelNetCrossSectionM2 = layersEnabled === 1
      ? Math.max(0, gravelEnvelopeCrossSectionM2 - pipeCrossSectionM2)
      : 0;
    const gravelGeometricM3 = pipeLengthM * gravelNetCrossSectionM2;
    const gravelPurchaseNeedM3 = gravelGeometricM3 * gravelPurchaseFactor;
    const gravelPurchaseM3 = roundUpToStep(gravelPurchaseNeedM3, bulkSaleStepM3);

    const geotextileEnabled = clampInteger(Number(inputs.geotextileEnabled ?? 0), 0, 1);
    const geotextileDevelopedWidthM = clamp(Number(inputs.geotextileDevelopedWidthM ?? 0), 0, 20);
    const geotextileReservePercent = clamp(Number(inputs.geotextileReservePercent ?? 0), 0, 30);
    const geotextileRollM2 = clamp(Number(inputs.geotextileRollM2 ?? 50), 0.1, 20000);
    const geotextileCleanM2 = geotextileEnabled === 1
      ? pipeLengthM * geotextileDevelopedWidthM
      : 0;
    const geotextileReservedM2 = geotextileCleanM2 * (1 + geotextileReservePercent / 100);
    const geotextileRolls = geotextileReservedM2 > 0
      ? Math.ceil((geotextileReservedM2 - Number.EPSILON) / geotextileRollM2)
      : 0;

    const projectItemsEnabled = clampInteger(Number(inputs.projectItemsEnabled ?? 0), 0, 1);
    const inspectionWellCount = projectItemsEnabled === 1
      ? clampInteger(Number(inputs.inspectionWellCount ?? 0), 0, 1000)
      : 0;
    const collectorWellCount = projectItemsEnabled === 1
      ? clampInteger(Number(inputs.collectorWellCount ?? 0), 0, 1000)
      : 0;
    const teeCount = projectItemsEnabled === 1
      ? clampInteger(Number(inputs.teeCount ?? 0), 0, 5000)
      : 0;
    const elbowCount = projectItemsEnabled === 1
      ? clampInteger(Number(inputs.elbowCount ?? 0), 0, 5000)
      : 0;

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const materials: MaterialResult[] = [
      {
        name: `Дренажная труба Ø${formatRuNumber(pipeDiameterMm)} мм — проектная длина`,
        quantity: round(pipeLengthM, 6),
        unit: "м",
        withReserve: round(pipeReservedM, 6),
        purchaseQty: pipePurchaseM,
        category: "Трубопровод",
        subtitle: pipeSaleStepM > 1
          ? `${pipePurchaseLots} ${pluralRu(pipePurchaseLots, "неделимая партия", "неделимые партии", "неделимых партий")} × ${formatRuNumber(pipeSaleStepM)} м; остаток ${formatRuNumber(pipeLeftoverM)} м.`
          : `${formatRuNumber(pipeReservedM)} м с явным запасом ${formatRuNumber(pipeReservePercent)}%; округление вверх с шагом ${formatRuNumber(pipeSaleStepM)} м.`,
        highlight: true,
      },
    ];

    if (sandPurchaseM3 > 0) {
      materials.push({
        name: "Песок — заданный слой",
        quantity: round(sandGeometricM3, 6),
        unit: "м³",
        withReserve: round(sandPurchaseNeedM3, 6),
        purchaseQty: sandPurchaseM3,
        category: "Заданное сечение",
        subtitle: `${formatRuNumber(pipeLengthM)} × ${formatRuNumber(sandLayerWidthM)} × ${formatRuNumber(sandLayerThicknessMm / 1000, 3)} м = ${formatRuNumber(sandGeometricM3)} м³; коэффициент ${formatRuNumber(sandPurchaseFactor)}, шаг ${formatRuNumber(bulkSaleStepM3)} м³.`,
      });
    }

    if (gravelPurchaseM3 > 0) {
      materials.push({
        name: "Щебень — заданная обсыпка",
        quantity: round(gravelGeometricM3, 6),
        unit: "м³",
        withReserve: round(gravelPurchaseNeedM3, 6),
        purchaseQty: gravelPurchaseM3,
        category: "Заданное сечение",
        subtitle: `Сечение ${formatRuNumber(gravelEnvelopeWidthM)} × ${formatRuNumber(gravelEnvelopeHeightM)} м минус труба Ø${formatRuNumber(pipeDiameterMm)} мм; коэффициент ${formatRuNumber(gravelPurchaseFactor)}, шаг ${formatRuNumber(bulkSaleStepM3)} м³.`,
      });
    }

    if (geotextileRolls > 0) {
      materials.push({
        name: `Геотекстиль — рулон ${formatRuNumber(geotextileRollM2)} м²`,
        quantity: round(geotextileReservedM2 / geotextileRollM2, 6),
        unit: "рулонов",
        withReserve: round(geotextileReservedM2 / geotextileRollM2, 6),
        purchaseQty: geotextileRolls,
        category: "Полотно по схеме",
        subtitle: `${formatRuNumber(pipeLengthM)} м × ${formatRuNumber(geotextileDevelopedWidthM)} м = ${formatRuNumber(geotextileCleanM2)} м²; с запасом ${formatRuNumber(geotextileReservePercent)}% — ${formatRuNumber(geotextileReservedM2)} м².`,
      });
    }

    const pushDiscrete = (name: string, count: number, category: string): void => {
      if (count <= 0) return;
      materials.push({
        name,
        quantity: count,
        unit: "шт",
        withReserve: count,
        purchaseQty: count,
        category,
        subtitle: "Количество перенесено из проектной схемы без автоматического шага или запаса.",
      });
    };

    pushDiscrete("Смотровые колодцы по проекту", inspectionWellCount, "Проектные узлы");
    pushDiscrete("Приёмные или коллекторные колодцы по проекту", collectorWellCount, "Проектные узлы");
    pushDiscrete(`Тройники Ø${formatRuNumber(pipeDiameterMm)} мм по схеме`, teeCount, "Фасонные части");
    pushDiscrete(`Отводы Ø${formatRuNumber(pipeDiameterMm)} мм по схеме`, elbowCount, "Фасонные части");

    const scenario: CalculatorScenario = {
      exact_need: round(pipeReservedM, 6),
      purchase_quantity: pipePurchaseM,
      leftover: pipeLeftoverM,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `project_pipe_length_m:${round(pipeLengthM, 6)}`,
        `pipe_diameter_mm:${round(pipeDiameterMm, 3)}`,
        `pipe_sale_step_m:${round(pipeSaleStepM, 6)}`,
        `pipe_reserve_percent:${round(pipeReservePercent, 3)}`,
        "route_geometry_not_inferred:true",
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: round(pipeReservePercent, 3),
      },
      buy_plan: {
        package_label: "pipe-sale-lot",
        package_size: round(pipeSaleStepM, 6),
        packages_count: pipePurchaseLots,
        unit: "м",
      },
    };

    const warnings = [
      "Это закупочная ведомость по уже принятой трассе, а не проект дренажа. Приток воды, гидравлика, отметки, уклоны, грунты, гидрогеология, глубина, промерзание, устойчивость основания, выпуск и обслуживание автоматически не рассчитываются.",
      `Диаметр Ø${formatRuNumber(pipeDiameterMm)} мм перенесён из ввода и не подбирается калькулятором. Проверьте пропускную способность, кольцевую жёсткость, перфорацию, фильтр и совместимые фитинги по проекту и документации системы.`,
      `Запас трубы ${formatRuNumber(pipeReservePercent)}% применяется один раз. MIN/REC/MAX и режим точности не добавляют скрытые множители.`,
      "Суммарная длина должна уже включать все магистрали и ветви. Общая цифра не показывает отдельные уклоны, повороты, перепады, соединения и пригодность остатков между участками.",
      "Точку выпуска, возможность самотёка или перекачки, защиту здания и допустимость сброса нужно подтвердить проектом и применимыми требованиями до закупки.",
    ];

    if (layersEnabled === 1 && sandGeometricM3 === 0 && gravelEnvelopeCrossSectionM2 === 0) {
      warnings.push("Блок сечения включён, но размеры слоёв не заданы: песок и щебень не добавлены в ведомость.");
    }
    if (layersEnabled === 1 && gravelEnvelopeCrossSectionM2 > 0 && gravelEnvelopeCrossSectionM2 <= pipeCrossSectionM2) {
      warnings.push("Введённое прямоугольное сечение обсыпки не больше круглого сечения трубы, поэтому объём щебня принят равным 0. Проверьте ширину и высоту.");
    }
    if (layersEnabled === 1 && (sandGeometricM3 > 0 || gravelGeometricM3 > 0)) {
      warnings.push("Объёмы сыпучих материалов получены только из постоянного введённого сечения. Изменение глубины, расширения у колодцев, приямки, локальные узлы и неодинаковая геометрия трассы не учтены.");
    }
    if (geotextileEnabled === 1 && geotextileDevelopedWidthM === 0) {
      warnings.push("Геотекстиль включён, но развёрнутая ширина полотна равна 0: материал не добавлен в ведомость.");
    }
    if (geotextileEnabled === 1 && geotextileDevelopedWidthM > 0) {
      warnings.push("Рулоны геотекстиля рассчитаны по площади. Реальный раскрой, стыки, завороты, направление полотна, класс и фильтрующая совместимость требуют отдельной схемы.");
    }
    if (projectItemsEnabled === 1 && inspectionWellCount + collectorWellCount + teeCount + elbowCount === 0) {
      warnings.push("Блок проектных узлов включён, но все количества равны 0: колодцы и фасонные части не добавлены.");
    }

    return {
      materials,
      totals: {
        pipeLengthM: round(pipeLengthM, 6),
        pipeDiameterMm: round(pipeDiameterMm, 3),
        pipeReservePercent: round(pipeReservePercent, 3),
        pipeSaleStepM: round(pipeSaleStepM, 6),
        pipeReservedM: round(pipeReservedM, 6),
        pipePurchaseLots,
        pipePurchaseM,
        pipeLeftoverM,
        layersEnabled,
        sandLayerWidthM: round(sandLayerWidthM, 6),
        sandLayerThicknessMm: round(sandLayerThicknessMm, 3),
        sandPurchaseFactor: round(sandPurchaseFactor, 3),
        sandGeometricM3: round(sandGeometricM3, 6),
        sandPurchaseNeedM3: round(sandPurchaseNeedM3, 6),
        sandPurchaseM3,
        pipeCrossSectionM2: round(pipeCrossSectionM2, 6),
        gravelEnvelopeWidthM: round(gravelEnvelopeWidthM, 6),
        gravelEnvelopeHeightM: round(gravelEnvelopeHeightM, 6),
        gravelEnvelopeCrossSectionM2: round(gravelEnvelopeCrossSectionM2, 6),
        gravelNetCrossSectionM2: round(gravelNetCrossSectionM2, 6),
        gravelPurchaseFactor: round(gravelPurchaseFactor, 3),
        gravelGeometricM3: round(gravelGeometricM3, 6),
        gravelPurchaseNeedM3: round(gravelPurchaseNeedM3, 6),
        gravelPurchaseM3,
        bulkSaleStepM3: round(bulkSaleStepM3, 6),
        geotextileEnabled,
        geotextileDevelopedWidthM: round(geotextileDevelopedWidthM, 6),
        geotextileReservePercent: round(geotextileReservePercent, 3),
        geotextileRollM2: round(geotextileRollM2, 6),
        geotextileCleanM2: round(geotextileCleanM2, 6),
        geotextileReservedM2: round(geotextileReservedM2, 6),
        geotextileRolls,
        projectItemsEnabled,
        inspectionWellCount,
        collectorWellCount,
        teeCount,
        elbowCount,
        minExactNeed: round(pipeReservedM, 6),
        recExactNeed: round(pipeReservedM, 6),
        maxExactNeed: round(pipeReservedM, 6),
        minPurchase: pipePurchaseM,
        recPurchase: pipePurchaseM,
        maxPurchase: pipePurchaseM,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: drainageSpec.calculator_id,
      practicalNotes: [
        `Проектная суммарная длина трубы: ${formatRuNumber(pipeLengthM)} м.`,
        `С явным запасом ${formatRuNumber(pipeReservePercent)}% требуется ${formatRuNumber(pipeReservedM)} м.`,
        `При шаге продажи ${formatRuNumber(pipeSaleStepM)} м к покупке ${formatRuNumber(pipePurchaseM)} м; остаток относительно потребности ${formatRuNumber(pipeLeftoverM)} м.`,
        "До заказа разбейте ведомость по отдельным участкам трассы и сверьте каждый узел, отметку, выпуск и товарную совместимость.",
      ],
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет закупку: учитываются только явные проектные размеры, запас, коэффициенты, фасовки и количества."],
      },
      summaryCards: [
        {
          icon: "↝",
          label: "Трасса по проекту",
          value: formatRuNumber(pipeLengthM),
          unit: "м",
          hint: "включая все введённые ветви",
          tone: "violet",
        },
        {
          icon: "+",
          label: "Труба с вашим запасом",
          value: formatRuNumber(pipeReservedM),
          unit: "м",
          hint: `${formatRuNumber(pipeReservePercent)}%, применяется один раз`,
          tone: "slate",
        },
        {
          icon: "◉",
          label: "Труба к покупке",
          value: formatRuNumber(pipePurchaseM),
          unit: "м",
          hint: `${pipePurchaseLots} × ${formatRuNumber(pipeSaleStepM)} м`,
          tone: "amber",
        },
      ],
      materialListBanner: "Ведомость содержит трубу и только те слои, полотна и узлы, которые вы явно включили по проекту. Гидравлика и схема дренажа автоматически не назначаются.",
    };
  },
  formulaDescription: `
**Закупочный расчёт дренажа по принятой трассе:**
- Труба с запасом = суммарная проектная длина × (1 + выбранный запас / 100).
- Труба к покупке = округление вверх до фактического шага продажи или длины неделимой бухты.
- Песок = длина × введённая ширина × введённая толщина × коэффициент закупочного объёма.
- Щебень = длина × (ширина контура × высота контура − площадь круглого сечения трубы) × введённый коэффициент.
- Геотекстиль = длина × развёрнутая ширина полотна × (1 + выбранный запас / 100); рулоны округляются вверх по фактической площади.
- Колодцы, тройники и отводы переносятся готовыми количествами из проекта.
- MIN/REC/MAX совпадают: скрытых ветвей, запасов и полевых множителей нет.
  `,
  howToUse: [
    "Возьмите суммарную длину трубы из принятой схемы со всеми ветвями",
    "Перенесите наружный диаметр фактической трубы",
    "Выберите явный запас после разбивки трассы на товарные отрезки",
    "Укажите шаг продажи или длину неделимой бухты",
    "Сыпучие слои включайте только по проектному поперечному сечению",
    "Для геотекстиля введите развёрнутую ширину полотна, запас по раскрою и площадь рулона",
    "Колодцы и фитинги добавьте готовыми количествами из схемы узлов",
    "Используйте итог для закупки, а гидравлику, отметки и выпуск подтвердите проектом",
  ],
  expertTips: [
    {
      title: "Общая длина не создаёт схему",
      content: "Сложите все ветви из проекта, но перед покупкой разбейте их на отдельные участки: остаток одной бухты не всегда пригоден для следующего участка без лишнего соединения.",
      author: "Мастерок",
    },
    {
      title: "Сечение задают исходные условия",
      content: "Грунты, вода, приток, отметки и защита сооружений определяют схему, диаметр, уклон, слои и выпуск. Площадной пресет не заменяет эти данные.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Какую длину трубы вводить?",
      answer: "Введите сумму уже намеченных участков магистрали и всех ветвей. Калькулятор не умножает длину для «ёлочки» и не достраивает кольцевой или пристенный маршрут без схемы.",
    },
    {
      question: "Как выбрать диаметр и уклон дренажной трубы?",
      answer: "Их выбирают по расчётному притоку, пропускной способности, длинам отдельных участков, отметкам, допустимому выпуску и характеристикам трубы. Ввод диаметра в этой форме нужен для товарной подписи и вычитания сечения трубы из заданной щебёночной обсыпки, но не является гидравлическим подбором.",
    },
    {
      question: "Как посчитать щебень вокруг трубы?",
      answer: "Введите проектные ширину и полную высоту прямоугольного контура обсыпки. Калькулятор вычтет круглое наружное сечение трубы, умножит чистую площадь сечения на длину и затем применит только ваш коэффициент закупочного объёма.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Труба по фактической проектной трассе</h2>
<p>Калькулятор не превращает одну длину в условную «ёлочку». Пользователь вводит уже суммированные длины магистрали и всех ветвей. Явный запас применяется один раз, после чего потребность округляется вверх до фактического шага продажи или длины неделимой бухты.</p>
<p><strong>L<sub>покупки</sub> = ceil((L × (1 + r / 100)) / p) × p</strong>, где <strong>L</strong> — суммарная проектная длина, <strong>r</strong> — выбранный запас, <strong>p</strong> — шаг продажи.</p>

<h2>Сыпучие материалы по заданному сечению</h2>
<p>Песчаный слой считается по введённым ширине и толщине. Для щебня задаётся полный прямоугольный контур обсыпки, из площади которого вычитается круглое наружное сечение трубы. Коэффициенты закупочного объёма и шаг отгрузки вводятся явно. Модель не подставляет универсальную траншею и не учитывает расширения у колодцев, приямки и изменение глубины по трассе.</p>

<h2>Геотекстиль, колодцы и фитинги</h2>
<p>Площадь геотекстиля равна длине трассы, умноженной на развёрнутую ширину полотна по принятому поперечному сечению. Нахлёсты и края задаются отдельным запасом, рулоны — фактической площадью. Колодцы, тройники и отводы переносятся готовыми количествами из проектной схемы: общая длина не раскрывает повороты, перепады, соединения и условия обслуживания.</p>

<h2>Почему результат не является проектом дренажа</h2>
<p>Для выбора схемы, диаметра, перфорации, фильтра, кольцевой жёсткости, отметок, уклонов, глубины, обсыпки, водоприёмника и способа выпуска нужны гидрогеология, грунты, приток воды, защита сооружений и допустимые условия сброса. Калькулятор выполняет прозрачную закупочную математику только после принятия этих решений.</p>

<h2>Первичные нормативные источники</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/e1b05b3c-a2e5-419b-b4c1-d7e07aa7e3ce" rel="noopener noreferrer">СП 104.13330.2016 «Инженерная защита территории от затопления и подтопления»</a> распространяется на проектирование систем и сооружений инженерной защиты.</li>
  <li><a href="https://protect.gost.ru/sp/details/cf3b6ea5-c63b-4aa4-9dd3-4295fcaef945" rel="noopener noreferrer">СП 32.13330.2018 «Канализация. Наружные сети и сооружения»</a> устанавливает правила проектирования наружных систем водоотведения; его требования нельзя свести к выбору диаметра по одной общей длине.</li>
  <li><a href="https://protect.gost.ru/gost/details/a1c13ac5-d59f-4397-b221-634f686375f3" rel="noopener noreferrer">ГОСТ Р 54475-2011</a> распространяется на полимерные трубы со структурированной стенкой и фасонные части для безнапорной наружной канализации, дренажа и водоотведения.</li>
  <li><a href="https://protect.gost.ru/sp/details/990885bc-664d-4329-b54c-5aa3d581c20d" rel="noopener noreferrer">СП 250.1325800.2016 «Здания и сооружения. Защита от подземных вод»</a> задаёт базовые принципы проектных решений для защиты заглублённых частей сооружений.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько дренажной трубы покупать на трассу 40 м?",
        answer: "<p>При проектной длине 40 м и запасе 0% потребность равна <strong>40 м</strong>. С явным запасом 5% получится <strong>42 м</strong>. При продаже на отрез шагом 1 м к покупке будет 42 м; при неделимой бухте 50 м — одна бухта, то есть <strong>50 м</strong>, с остатком 8 м относительно расчётной потребности.</p>",
      },
      {
        question: "Можно ли рассчитать схему дренажа только по площади участка?",
        answer: "<p>Нет. Нужны рельеф и отметки, грунты и гидрогеология, источник и расчётный приток воды, защищаемые сооружения, водоприёмник и допустимый выпуск. После принятия схемы калькулятор помогает собрать закупочную ведомость по её фактическим длинам и сечениям.</p>",
      },
      {
        question: "Почему колодцы не добавляются через каждые 50 м автоматически?",
        answer: "<p>Колодцы зависят не только от общей длины, но и от отдельных прямых участков, поворотов, перепадов, соединений, промывки, выпуска и оборудования. Введите готовое количество из проектной схемы — калькулятор не будет угадывать узлы по одному метражу.</p>",
      },
    ],
  },
};
