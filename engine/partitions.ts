import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  PartitionsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── inputs ─── */

interface PartitionsInputs {
  length?: number;
  height?: number;
  thickness?: number;
  blockType?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalPartitions(
  spec: PartitionsCanonicalSpec,
  inputs: PartitionsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);
  const rules = spec.material_rules;

  const length = Math.max(1, Math.min(50, inputs.length ?? getInputDefault(spec, "length", 5)));
  const height = Math.max(2, Math.min(4, inputs.height ?? getInputDefault(spec, "height", 2.7)));
  const blockType = Math.max(0, Math.min(2, Math.round(inputs.blockType ?? getInputDefault(spec, "blockType", 0))));
  const requestedThickness = Math.max(75, Math.min(200, Math.round(inputs.thickness ?? getInputDefault(spec, "thickness", 100))));
  const thickness = blockType === 2 && requestedThickness === 75 ? 80 : requestedThickness;

  /* ─── formulas ─── */
  const wallArea = length * height;
  const dims = rules.block_dims[String(blockType)] ?? rules.block_dims["0"];
  const blockArea = (dims[0] / 1000) * (dims[1] / 1000);
  const blocks = Math.ceil(wallArea / blockArea * rules.block_reserve);

  // Клей для ячеистых блоков / гипсовый монтажный клей для ПГП.
  const glueBags = blockType !== 2
    ? Math.ceil(wallArea * (rules.glue_rate[String(blockType)] ?? 0) / rules.glue_bag)
    : 0;
  const gypsumBags = blockType === 2
    ? Math.ceil(wallArea * rules.gypsum_milk_rate / rules.gypsum_bag)
    : 0;

  // Линейное армирование относится к кладке из ячеистых блоков.
  // ПГП связывают с основанием по системе производителя; универсальной сетки в каждом ряду нет.
  const armRows = blockType === 2 ? 0 : Math.ceil(height / rules.mesh_interval);
  const meshLen = blockType === 2 ? 0 : length * armRows * rules.mesh_reserve;
  const meshRolls = blockType === 2 ? 0 : Math.ceil(meshLen / rules.mesh_roll);

  // Foam
  const foamBottles = Math.ceil((length + height * 2) / rules.foam_per_perim);

  // Primer (both sides)
  const primer = Math.ceil(wallArea * 2 * rules.primer_l_per_m2 * rules.primer_reserve / rules.primer_can);

  // Sealing tape
  const sealTape = Math.ceil((length * 2 + height * 2) * rules.seal_tape_reserve);

  /* ─── scenarios ─── */
  const blocksRaw = blocks;
  const blocksAdj = Math.ceil(blocks * accuracyMult);
  const packageOptions = [{
    size: 1,
    label: "partition-block",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(blocksAdj * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `blockType:${blockType}`,
        `thickness:${thickness}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const recScenario = scenarios.REC;
  const blockNames: Record<number, string> = {
    0: `Газобетонные перегородочные блоки D500 ${dims[0]}×${dims[1]}×${thickness} мм`,
    1: `Пенобетонные перегородочные блоки D600 ${dims[0]}×${dims[1]}×${thickness} мм`,
    2: `Гипсовые пазогребневые плиты ${dims[0]}×${dims[1]}×${thickness} мм`,
  };

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: blockNames[blockType],
      subtitle: blockType === 2
        ? "Для влажного режима выбирайте гидрофобизированные ПГП по паспорту изделия. Прочность, огнестойкость, звукоизоляцию и допустимые размеры перегородки калькулятор не определяет."
        : `Обозначение ${blockType === 0 ? "D500" : "D600"} — фиксированный ярлык текущей модели, а не подтверждение свойства выбранного товара. Расчёт использует лицевую грань 625×250 мм; плотность, класс прочности, влажностный режим и допустимые размеры выбирайте по проекту и паспорту блока.`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
  ];

  if (glueBags > 0) {
    materials.push({
      name: `Клей для тонкошовной кладки ячеистых блоков, мешок ${rules.glue_bag} кг`,
      subtitle: `Предварительная оценка по фиксированным ${rules.glue_rate[String(blockType)] ?? 0} кг/м² и мешку ${rules.glue_bag} кг. Толщина перегородки и шва расход не меняет; фактическое значение берите из техкарты выбранной смеси.`,
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Кладка",
    });
  }

  if (gypsumBags > 0) {
    materials.push({
      name: `Гипсовый монтажный клей для пазогребневых плит, мешок ${rules.gypsum_bag} кг`,
      subtitle: `Предварительная оценка по фиксированным ${rules.gypsum_milk_rate} кг/м² и мешку ${rules.gypsum_bag} кг. Фактический расход и пригодность состава берите из инструкции системы ПГП.`,
      quantity: gypsumBags,
      unit: "мешков",
      withReserve: gypsumBags,
      purchaseQty: gypsumBags,
      category: "Кладка",
    });
  }

  if (meshRolls > 0) {
    materials.push({
      name: `Армирующая лента для кладки ячеистых блоков, рулон ${rules.mesh_roll} м`,
      subtitle: `Справочная позиция модели: одна линия через ${rules.mesh_interval} м по высоте, 5% к длине и рулон ${rules.mesh_roll} м. Необходимость, материал, сечение, шаг и зоны усиления задаёт проект или техническое решение производителя.`,
      quantity: meshRolls,
      unit: "рулонов",
      withReserve: meshRolls,
      purchaseQty: meshRolls,
      category: "Армирование",
    });
  }

  materials.push(
    {
      name: `Профессиональная полиуретановая монтажная пена, баллон ${rules.foam_can} мл`,
      subtitle: `Справочная позиция модели: один баллон на каждые ${rules.foam_per_perim} м суммы верха и двух боковых примыканий. Тип узла, размер зазора, допустимый материал заполнения и фактический выход пены задают проект и инструкция системы.`,
      quantity: foamBottles,
      unit: "шт",
      withReserve: foamBottles,
      purchaseQty: foamBottles,
      category: "Монтаж",
    },
    {
      ...buildPrimerMaterial(wallArea * 2 * rules.primer_l_per_m2, { reserveFactor: rules.primer_reserve, category: "Грунтовка" }),
      subtitle: `Предварительная оценка для двух сторон по ${rules.primer_l_per_m2} л/м² и запасу 15%. Необходимость, число слоёв, совместимость и паспортный расход зависят от основания и последующей отделки.`,
    },
    {
      name: "Упругая лента для примыкания перегородки",
      subtitle: "Справочная длина по полному периметру перегородки с 10% запаса. Материал, расположение и необходимость ленты зависят от проектного узла примыкания и требований к звукоизоляции.",
      quantity: sealTape,
      unit: "м",
      withReserve: sealTape,
      purchaseQty: sealTape,
      category: "Монтаж",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (height > spec.warnings_rules.high_wall_threshold_m) {
    warnings.push("Высота перегородки превышает типовой диапазон — размеры, связи и армирование должен проверить конструктор");
  }
  if (blockType === 2 && ![80, 100].includes(thickness)) {
    warnings.push("Для гипсовых пазогребневых плит типовые толщины — 80 и 100 мм; выберите фактически доступный формат");
  }
  warnings.push("Калькулятор предназначен только для ненесущих межкомнатных перегородок");

  const practicalNotes: string[] = [];
  practicalNotes.push("Площадь считается как длина × высота без вычета дверей и других проёмов: их геометрия в форме отсутствует");
  practicalNotes.push("Фиксированные 5% на блоки, расходы клея и грунтовки, лента через 0,75 м, пена и упругая лента — допущения текущей модели, а не универсальные нормы");
  practicalNotes.push("Связи со стенами, армирование зон проёмов и верхний деформационный зазор выполняют по проекту и альбому решений производителя");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      height: roundDisplay(height, 3),
      thickness,
      requestedThickness,
      blockType,
      wallArea: roundDisplay(wallArea, 3),
      blockArea: roundDisplay(blockArea, 6),
      blocks,
      glueBags,
      gypsumBags,
      armRows,
      meshLen: roundDisplay(meshLen, 3),
      meshRolls,
      foamBottles,
      primer,
      sealTape,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(blocksRaw, "generic", accuracyMode).explanation,
  };
}
