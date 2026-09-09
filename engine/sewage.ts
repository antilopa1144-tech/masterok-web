import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  SewageCanonicalSpec,
} from "./canonical";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface SewageInputs {
  calculationMode?: number;
  equivalentResidents?: number;
  wastewaterPerResidentL?: number;
  projectDailyFlowM3?: number;
  selectedWorkingVolumeM3?: number;
  selectedChamberCount?: number;
  naturalTreatmentStatus?: number;
  groundwaterStatus?: number;
  pipeLengthM?: number;
  pipeSectionLengthM?: number;
  inspectionWellCount?: number;
  fittingCount?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const whole = (value: number, min: number, max: number) =>
  Math.round(clamp(value, min, max));

export function computeCanonicalSewage(
  spec: SewageCanonicalSpec,
  inputs: SewageInputs,
): CanonicalCalculatorResult {
  const calculationMode = whole(
    inputs.calculationMode ?? getInputDefault(spec, "calculationMode", 0),
    0,
    1,
  );
  const equivalentResidents = whole(
    inputs.equivalentResidents ??
      getInputDefault(spec, "equivalentResidents", 4),
    1,
    100,
  );
  const wastewaterPerResidentL = clamp(
    inputs.wastewaterPerResidentL ??
      getInputDefault(spec, "wastewaterPerResidentL", 200),
    1,
    2000,
  );
  const projectDailyFlowM3 = clamp(
    inputs.projectDailyFlowM3 ??
      getInputDefault(spec, "projectDailyFlowM3", 0.8),
    0.001,
    100,
  );
  const selectedWorkingVolumeM3 = clamp(
    inputs.selectedWorkingVolumeM3 ??
      getInputDefault(spec, "selectedWorkingVolumeM3", 0),
    0,
    1000,
  );
  const selectedChamberCount = whole(
    inputs.selectedChamberCount ??
      getInputDefault(spec, "selectedChamberCount", 0),
    0,
    3,
  );
  const naturalTreatmentStatus = whole(
    inputs.naturalTreatmentStatus ??
      getInputDefault(spec, "naturalTreatmentStatus", 0),
    0,
    2,
  );
  const groundwaterStatus = whole(
    inputs.groundwaterStatus ??
      getInputDefault(spec, "groundwaterStatus", 0),
    0,
    2,
  );
  const pipeLengthM = clamp(
    inputs.pipeLengthM ?? getInputDefault(spec, "pipeLengthM", 0),
    0,
    1000,
  );
  const pipeSectionLengthM = clamp(
    inputs.pipeSectionLengthM ??
      getInputDefault(spec, "pipeSectionLengthM", 0),
    0,
    30,
  );
  const inspectionWellCount = whole(
    inputs.inspectionWellCount ??
      getInputDefault(spec, "inspectionWellCount", 0),
    0,
    100,
  );
  const fittingCount = whole(
    inputs.fittingCount ?? getInputDefault(spec, "fittingCount", 0),
    0,
    1000,
  );

  const dailyFlowM3 =
    calculationMode === 0
      ? (equivalentResidents * wastewaterPerResidentL) / 1000
      : projectDailyFlowM3;
  const retentionRule =
    spec.normative_formula.retention_rules.find(
      (rule) => equivalentResidents <= rule.max_equivalent_residents,
    ) ?? spec.normative_formula.retention_rules.at(-1);
  const chamberRule =
    spec.normative_formula.chamber_rules.find(
      (rule) => equivalentResidents <= rule.max_equivalent_residents,
    ) ?? spec.normative_formula.chamber_rules.at(-1);

  if (!retentionRule || !chamberRule) {
    throw new Error("[sewage] В canonical-спеке не заданы правила объёма или камер");
  }

  const retentionMultiplier = retentionRule.daily_flow_multiplier;
  const minimumChamberCount = chamberRule.minimum_chambers;
  const minimumWorkingVolumeM3 = dailyFlowM3 * retentionMultiplier;
  const volumeShortfallM3 =
    selectedWorkingVolumeM3 > 0
      ? Math.max(0, minimumWorkingVolumeM3 - selectedWorkingVolumeM3)
      : 0;
  const volumeMarginM3 =
    selectedWorkingVolumeM3 > 0
      ? Math.max(0, selectedWorkingVolumeM3 - minimumWorkingVolumeM3)
      : 0;
  const verifiedWorkingVolumeM3 =
    selectedWorkingVolumeM3 >= minimumWorkingVolumeM3
      ? selectedWorkingVolumeM3
      : minimumWorkingVolumeM3;

  const pipeSections =
    pipeLengthM > 0 && pipeSectionLengthM > 0
      ? Math.ceil(pipeLengthM / pipeSectionLengthM)
      : 0;
  const purchasePipeLengthM =
    pipeSections > 0 ? pipeSections * pipeSectionLengthM : pipeLengthM;
  const pipeLeftoverM = Math.max(0, purchasePipeLengthM - pipeLengthM);
  const materials: CanonicalMaterialResult[] = [];

  if (selectedWorkingVolumeM3 > 0) {
    materials.push({
      name: "Выбранная система септика по проекту или паспорту",
      subtitle: `Рабочий объём: ${roundDisplay(selectedWorkingVolumeM3, 3)} м³`,
      quantity: 1,
      unit: spec.packaging_rules.system_unit,
      withReserve: 1,
      purchaseQty: 1,
      category: "Выбранная система",
    });
  }
  if (pipeLengthM > 0) {
    materials.push({
      name:
        pipeSectionLengthM > 0
          ? `Труба наружной канализации по проектной трассе, отрезок ${roundDisplay(pipeSectionLengthM, 3)} м`
          : "Труба наружной канализации по проектной трассе",
      quantity: roundDisplay(pipeLengthM, 6),
      unit: spec.packaging_rules.meter_unit,
      withReserve: roundDisplay(purchasePipeLengthM, 6),
      purchaseQty: roundDisplay(purchasePipeLengthM, 6),
      ...(pipeSections > 0
        ? {
            packageInfo: {
              count: pipeSections,
              size: roundDisplay(pipeSectionLengthM, 6),
              packageUnit: spec.packaging_rules.pipe_section_unit,
            },
          }
        : {}),
      category: "Проектная трасса",
    });
  }
  if (inspectionWellCount > 0) {
    materials.push({
      name: "Смотровой колодец по проектной ведомости",
      quantity: inspectionWellCount,
      unit: spec.packaging_rules.piece_unit,
      withReserve: inspectionWellCount,
      purchaseQty: inspectionWellCount,
      category: "Проектная трасса",
    });
  }
  if (fittingCount > 0) {
    materials.push({
      name: "Фасонные части по проектной ведомости",
      quantity: fittingCount,
      unit: spec.packaging_rules.piece_unit,
      withReserve: fittingCount,
      purchaseQty: fittingCount,
      category: "Проектная трасса",
    });
  }

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    acc[scenario] = {
      exact_need: roundDisplay(minimumWorkingVolumeM3, 6),
      purchase_quantity: roundDisplay(verifiedWorkingVolumeM3, 6),
      leftover: roundDisplay(
        verifiedWorkingVolumeM3 - minimumWorkingVolumeM3,
        6,
      ),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `calculationMode:${calculationMode}`,
        `equivalentResidents:${equivalentResidents}`,
        "no_hidden_reserve",
      ],
      key_factors: {
        field_multiplier: 1,
        retention_multiplier: retentionMultiplier,
      },
      buy_plan: {
        package_label: "septic-working-volume",
        package_size: roundDisplay(verifiedWorkingVolumeM3, 6),
        packages_count: 1,
        unit: spec.packaging_rules.volume_unit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const warnings = [
    "Септик выполняет только предварительную механическую очистку: обработанный сток требует последующей очистки по обоснованной проектной схеме.",
    "Калькулятор не назначает конструкцию сооружения, санитарные разрывы, уклон и отметки трассы, вентиляцию, защиту от всплытия или способ сброса.",
  ];
  if (calculationMode === 0) {
    warnings.push(
      "Суточный объём на одного ЭЧЖ введён пользователем; стартовые 200 л/сут не заменяют расчёт фактического водоотведения.",
    );
  }
  if (selectedWorkingVolumeM3 <= 0) {
    warnings.push(
      "Рабочий объём выбранной системы не введён — показан только минимальный расчётный объём.",
    );
  } else if (volumeShortfallM3 > 0) {
    warnings.push(
      `Рабочий объём выбранной системы меньше расчётного минимума на ${roundDisplay(volumeShortfallM3, 3)} м³.`,
    );
  }
  if (selectedChamberCount <= 0) {
    warnings.push(
      "Количество камер выбранной системы не введено и не проверено.",
    );
  } else if (selectedChamberCount < minimumChamberCount) {
    warnings.push(
      `В выбранной системе ${selectedChamberCount} камер(ы), а для ${equivalentResidents} ЭЧЖ расчётное правило требует не менее ${minimumChamberCount}.`,
    );
  }
  if (naturalTreatmentStatus === 0) {
    warnings.push(
      "Пригодность грунта и схема последующей очистки не подтверждены изысканиями и проектом.",
    );
  } else if (naturalTreatmentStatus === 2) {
    warnings.push(
      "Естественная почвенная доочистка не подтверждена — требуется отдельное инженерное решение.",
    );
  }
  if (groundwaterStatus === 0) {
    warnings.push(
      "Расчётный сезонный уровень грунтовых вод не проверен.",
    );
  } else if (groundwaterStatus === 2) {
    warnings.push(
      "Высокий или сезонно высокий уровень грунтовых вод требует отдельной проверки конструкции и способа доочистки.",
    );
  }
  if (pipeSectionLengthM > 0 && pipeLengthM <= 0) {
    warnings.push(
      "Длина товарного отрезка трубы введена без длины проектной трассы.",
    );
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      calculationMode,
      equivalentResidents,
      wastewaterPerResidentL: roundDisplay(wastewaterPerResidentL, 3),
      projectDailyFlowM3: roundDisplay(projectDailyFlowM3, 3),
      dailyFlowM3: roundDisplay(dailyFlowM3, 3),
      retentionMultiplier: roundDisplay(retentionMultiplier, 3),
      minimumWorkingVolumeM3: roundDisplay(minimumWorkingVolumeM3, 3),
      selectedWorkingVolumeM3: roundDisplay(selectedWorkingVolumeM3, 3),
      verifiedWorkingVolumeM3: roundDisplay(verifiedWorkingVolumeM3, 3),
      volumeShortfallM3: roundDisplay(volumeShortfallM3, 3),
      volumeMarginM3: roundDisplay(volumeMarginM3, 3),
      minimumChamberCount,
      selectedChamberCount,
      naturalTreatmentStatus,
      groundwaterStatus,
      pipeLengthM: roundDisplay(pipeLengthM, 3),
      pipeSectionLengthM: roundDisplay(pipeSectionLengthM, 3),
      pipeSections,
      purchasePipeLengthM: roundDisplay(purchasePipeLengthM, 3),
      pipeLeftoverM: roundDisplay(pipeLeftoverM, 3),
      inspectionWellCount,
      fittingCount,
      minExactNeed: roundDisplay(minimumWorkingVolumeM3, 6),
      recExactNeed: roundDisplay(minimumWorkingVolumeM3, 6),
      maxExactNeed: roundDisplay(minimumWorkingVolumeM3, 6),
      minPurchase: roundDisplay(verifiedWorkingVolumeM3, 6),
      recPurchase: roundDisplay(verifiedWorkingVolumeM3, 6),
      maxPurchase: roundDisplay(verifiedWorkingVolumeM3, 6),
    },
    warnings,
    practicalNotes: [
      "Сверьте расчётный суточный приток, залповые сбросы, рабочий объём и ограничения выбранного изделия с проектом и паспортом производителя.",
      "Проверьте геологию, сезонный уровень грунтовых вод, санитарные ограничения участка и законный способ последующей очистки или отвода.",
      "Трубы и штучные позиции появляются только из введённой проектной ведомости; скрытого запаса и автоматически назначенных фитингов нет.",
    ],
    scenarios,
  };
}
