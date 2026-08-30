import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  WarmFloorPipesCanonicalSpec,
} from "./canonical";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface WarmFloorPipesInputs {
  calculationMode?: number;
  layoutAreaM2?: number;
  pipeSpacingMm?: number;
  connectionLengthM?: number;
  projectTotalPipeLengthM?: number;
  circuitCount?: number;
  longestCircuitLengthM?: number;
  maxCircuitLengthM?: number;
  coilLengthM?: number;
  collectorCount?: number;
  manifoldOutletCount?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const whole = (value: number, min: number, max: number) =>
  Math.round(clamp(value, min, max));

export function computeCanonicalWarmFloorPipes(
  spec: WarmFloorPipesCanonicalSpec,
  inputs: WarmFloorPipesInputs,
): CanonicalCalculatorResult {
  const calculationMode = whole(
    inputs.calculationMode ?? getInputDefault(spec, "calculationMode", 0),
    0,
    1,
  );
  const layoutAreaM2 = clamp(
    inputs.layoutAreaM2 ?? getInputDefault(spec, "layoutAreaM2", 15),
    0.1,
    500,
  );
  const pipeSpacingMm = clamp(
    inputs.pipeSpacingMm ?? getInputDefault(spec, "pipeSpacingMm", 150),
    50,
    500,
  );
  const connectionLengthM = clamp(
    inputs.connectionLengthM ?? getInputDefault(spec, "connectionLengthM", 0),
    0,
    1000,
  );
  const projectTotalPipeLengthM = clamp(
    inputs.projectTotalPipeLengthM ??
      getInputDefault(spec, "projectTotalPipeLengthM", 0),
    0,
    10000,
  );
  const circuitCount = whole(
    inputs.circuitCount ?? getInputDefault(spec, "circuitCount", 0),
    0,
    100,
  );
  const longestCircuitLengthM = clamp(
    inputs.longestCircuitLengthM ??
      getInputDefault(spec, "longestCircuitLengthM", 0),
    0,
    1000,
  );
  const maxCircuitLengthM = clamp(
    inputs.maxCircuitLengthM ?? getInputDefault(spec, "maxCircuitLengthM", 0),
    0,
    1000,
  );
  const coilLengthM = clamp(
    inputs.coilLengthM ?? getInputDefault(spec, "coilLengthM", 0),
    0,
    5000,
  );
  const collectorCount = whole(
    inputs.collectorCount ?? getInputDefault(spec, "collectorCount", 0),
    0,
    20,
  );
  const manifoldOutletCount = whole(
    inputs.manifoldOutletCount ??
      getInputDefault(spec, "manifoldOutletCount", 0),
    0,
    200,
  );

  const fieldPipeLengthM =
    calculationMode === 0
      ? layoutAreaM2 / (pipeSpacingMm / 1000)
      : 0;
  const exactPipeLengthM =
    calculationMode === 0
      ? fieldPipeLengthM + connectionLengthM
      : projectTotalPipeLengthM;
  const requiredCoilCount =
    coilLengthM > 0 && exactPipeLengthM > 0
      ? Math.ceil(exactPipeLengthM / coilLengthM)
      : 0;
  const purchasePipeLengthM =
    coilLengthM > 0
      ? requiredCoilCount * coilLengthM
      : exactPipeLengthM;
  const leftoverPipeLengthM = Math.max(
    0,
    purchasePipeLengthM - exactPipeLengthM,
  );
  const averageCircuitLengthM =
    circuitCount > 0 ? exactPipeLengthM / circuitCount : 0;

  const meterUnit = spec.packaging_rules.meter_unit;
  const coilUnit = spec.packaging_rules.coil_unit;
  const materials: CanonicalMaterialResult[] = [
    {
      name:
        calculationMode === 0
          ? "Труба для водяного тёплого пола — предварительная геометрия"
          : "Труба для водяного тёплого пола по проектной ведомости",
      quantity: roundDisplay(exactPipeLengthM, 6),
      unit: meterUnit,
      withReserve: roundDisplay(purchasePipeLengthM, 6),
      purchaseQty: roundDisplay(purchasePipeLengthM, 6),
      ...(coilLengthM > 0
        ? {
            packageInfo: {
              count: requiredCoilCount,
              size: roundDisplay(coilLengthM, 6),
              packageUnit: coilUnit,
            },
          }
        : {}),
      category: "Основное",
    },
  ];

  if (collectorCount > 0) {
    materials.push({
      name:
        manifoldOutletCount > 0
          ? `Коллектор по проектной ведомости — всего ${manifoldOutletCount} выходов`
          : "Коллектор по проектной ведомости",
      quantity: collectorCount,
      unit: spec.packaging_rules.piece_unit,
      withReserve: collectorCount,
      purchaseQty: collectorCount,
      category: "Управление",
    });
  }

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    acc[scenario] = {
      exact_need: roundDisplay(exactPipeLengthM, 6),
      purchase_quantity: roundDisplay(purchasePipeLengthM, 6),
      leftover: roundDisplay(leftoverPipeLengthM, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `calculationMode:${calculationMode}`,
        "no_hidden_reserve",
        coilLengthM > 0 ? "coil_length_from_user" : "purchase_by_meter",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label:
          coilLengthM > 0 ? "water-floor-pipe-coil" : "water-floor-pipe-meter",
        package_size: coilLengthM > 0 ? roundDisplay(coilLengthM, 6) : 1,
        packages_count:
          coilLengthM > 0
            ? requiredCoilCount
            : Math.ceil(exactPipeLengthM),
        unit: coilLengthM > 0 ? coilUnit : meterUnit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const warnings = [
    "Калькулятор не назначает шаг трубы и не проверяет теплоотдачу, температуру поверхности, гидравлику, насос, балансировку или источник тепла.",
    "ЭППС, демпферная лента, крепёж, арматура коллектора и стяжка не добавлены: состав конструкции пола и ведомость материалов берутся из проекта.",
  ];
  if (calculationMode === 0) {
    warnings.push(
      "Предварительный режим оценивает геометрическую длину по фактической площади раскладки и шагу из проекта; повороты, краевые зоны и трассы учитывайте планом.",
    );
  } else if (projectTotalPipeLengthM <= 0) {
    warnings.push(
      "Введите суммарную длину всех контуров из проектной ведомости.",
    );
  }
  if (circuitCount <= 0) {
    warnings.push(
      "Число контуров не введено — средняя и фактическая длина петель не проверяются.",
    );
  } else if (longestCircuitLengthM <= 0) {
    warnings.push(
      "Показана только средняя длина: для гидравлической проверки нужна длина самого длинного контура.",
    );
  }
  if (maxCircuitLengthM > 0 && longestCircuitLengthM <= 0) {
    warnings.push(
      "Введён предельный размер контура, но не введена длина самой длинной петли.",
    );
  } else if (
    maxCircuitLengthM > 0 &&
    longestCircuitLengthM > maxCircuitLengthM
  ) {
    warnings.push(
      "Самый длинный контур превышает предел из проекта или документации выбранной системы.",
    );
  }
  if (coilLengthM > 0) {
    warnings.push(
      "Округление по общей длине до бухт не проверяет план раскроя непрерывных контуров и отсутствие соединений в конструкции пола.",
    );
    if (longestCircuitLengthM > coilLengthM) {
      warnings.push(
        "Самый длинный контур больше одной выбранной бухты — такой комплект не обеспечивает непрерывную петлю.",
      );
    }
  }
  if (manifoldOutletCount > 0 && collectorCount <= 0) {
    warnings.push(
      "Выходы коллектора введены без количества самих коллекторов.",
    );
  }
  if (circuitCount > 0 && manifoldOutletCount > 0 && manifoldOutletCount < circuitCount) {
    warnings.push(
      "Введённых выходов коллектора меньше числа контуров по ведомости.",
    );
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      calculationMode,
      layoutAreaM2: roundDisplay(layoutAreaM2, 3),
      pipeSpacingMm: roundDisplay(pipeSpacingMm, 3),
      fieldPipeLengthM: roundDisplay(fieldPipeLengthM, 3),
      connectionLengthM: roundDisplay(connectionLengthM, 3),
      projectTotalPipeLengthM: roundDisplay(projectTotalPipeLengthM, 3),
      exactPipeLengthM: roundDisplay(exactPipeLengthM, 3),
      circuitCount,
      averageCircuitLengthM: roundDisplay(averageCircuitLengthM, 3),
      longestCircuitLengthM: roundDisplay(longestCircuitLengthM, 3),
      maxCircuitLengthM: roundDisplay(maxCircuitLengthM, 3),
      coilLengthM: roundDisplay(coilLengthM, 3),
      requiredCoilCount,
      purchasePipeLengthM: roundDisplay(purchasePipeLengthM, 3),
      leftoverPipeLengthM: roundDisplay(leftoverPipeLengthM, 3),
      collectorCount,
      manifoldOutletCount,
      minExactNeed: roundDisplay(exactPipeLengthM, 6),
      recExactNeed: roundDisplay(exactPipeLengthM, 6),
      maxExactNeed: roundDisplay(exactPipeLengthM, 6),
      minPurchase: roundDisplay(purchasePipeLengthM, 6),
      recPurchase: roundDisplay(purchasePipeLengthM, 6),
      maxPurchase: roundDisplay(purchasePipeLengthM, 6),
    },
    warnings,
    practicalNotes: [
      "Сохраните план каждого контура с его длиной, шагом, зоной обслуживания и привязкой к выходу коллектора.",
      "Материалы конструкции пола считайте по проектным слоям отдельными калькуляторами стяжки и утепления.",
    ],
    scenarios,
  };
}
