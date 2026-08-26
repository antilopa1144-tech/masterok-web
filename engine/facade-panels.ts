import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  FacadePanelsCanonicalSpec,
} from "./canonical";
import type { ScenarioBundle } from "./scenarios";
import { roundDisplay } from "./units";
import { getInputDefault } from "./spec-helpers";

interface FacadePanelsInputs {
  inputMode?: number;
  area?: number;
  houseLength?: number;
  houseWidth?: number;
  wallLength?: number;
  wallHeight?: number;
  openingsArea?: number;
  panelType?: number;
  panelUsefulArea?: number;
  reservePercent?: number;
  needProfile?: number;
  profileStep?: number;
  profilePieceLength?: number;
  fastenersPerPanel?: number;
  needInsulation?: number;
  insulationPackArea?: number;
  externalCorners?: number;
  cornerPieceLength?: number;
  starterPieceLength?: number;
}

const finiteOr = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Number(value) : fallback;

const positiveOr = (value: number | undefined, fallback: number) =>
  Math.max(0.000001, finiteOr(value, fallback));

export function computeCanonicalFacadePanels(
  spec: FacadePanelsCanonicalSpec,
  inputs: FacadePanelsInputs,
  _factorTable?: FactorTable,
): CanonicalCalculatorResult {
  const inputMode = Math.round(finiteOr(inputs.inputMode, getInputDefault(spec, "inputMode", 1))) === 0 ? 0 : 1;
  const houseLength = positiveOr(inputs.houseLength, getInputDefault(spec, "houseLength", 10));
  const houseWidth = positiveOr(inputs.houseWidth, getInputDefault(spec, "houseWidth", 10));
  const wallHeight = positiveOr(inputs.wallHeight, getInputDefault(spec, "wallHeight", 3));
  const perimeter = positiveOr(inputs.wallLength, 2 * (houseLength + houseWidth));
  const openingsArea = Math.max(0, finiteOr(inputs.openingsArea, getInputDefault(spec, "openingsArea", 10)));
  const grossArea = inputMode === 0 ? perimeter * wallHeight : positiveOr(inputs.area, getInputDefault(spec, "area", 100));
  const netArea = inputMode === 0 ? Math.max(0, grossArea - openingsArea) : grossArea;

  const panelType = Math.max(0, Math.min(6, Math.round(finiteOr(inputs.panelType, 0))));
  const panelUsefulArea = positiveOr(inputs.panelUsefulArea, getInputDefault(spec, "panelUsefulArea", 0.84));
  const reservePercent = Math.max(0, Math.min(30, finiteOr(inputs.reservePercent, getInputDefault(spec, "reservePercent", 10))));
  const maxReservePercent = Math.max(reservePercent, spec.material_rules.max_reserve_percent);

  const exactPanelsMin = netArea / panelUsefulArea;
  const exactPanelsRec = exactPanelsMin * (1 + reservePercent / 100);
  const exactPanelsMax = exactPanelsMin * (1 + maxReservePercent / 100);

  const scenarioFor = (exactNeed: number, reserve: number) => {
    const purchase = Math.ceil(exactNeed);
    return {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: purchase,
      leftover: roundDisplay(purchase - exactNeed, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `panelType:${panelType}`,
        `panelUsefulArea:${panelUsefulArea}`,
        `reservePercent:${reserve}`,
      ],
      key_factors: { reserve_percent: reserve },
      buy_plan: {
        package_label: "панель",
        package_size: 1,
        packages_count: purchase,
        unit: "шт",
      },
    };
  };

  const scenarios: ScenarioBundle = {
    MIN: scenarioFor(exactPanelsMin, 0),
    REC: scenarioFor(exactPanelsRec, reservePercent),
    MAX: scenarioFor(exactPanelsMax, maxReservePercent),
  };

  const panelsCount = scenarios.REC.purchase_quantity;
  const panelsArea = panelsCount * panelUsefulArea;
  const needProfile = Math.round(finiteOr(inputs.needProfile, getInputDefault(spec, "needProfile", 1))) === 1;
  const profileStep = positiveOr(inputs.profileStep, getInputDefault(spec, "profileStep", 0.4));
  const profilePieceLength = positiveOr(inputs.profilePieceLength, getInputDefault(spec, "profilePieceLength", 3));
  const profileRuns = needProfile ? Math.ceil(perimeter / profileStep) : 0;
  const profileLength = profileRuns * wallHeight;
  const profilePieces = needProfile ? Math.ceil(profileLength / profilePieceLength) : 0;

  const fastenersPerPanel = Math.max(0, finiteOr(inputs.fastenersPerPanel, getInputDefault(spec, "fastenersPerPanel", 0)));
  const fasteners = Math.ceil(panelsCount * fastenersPerPanel);
  const needInsulation = Math.round(finiteOr(inputs.needInsulation, getInputDefault(spec, "needInsulation", 0))) === 1;
  const insulationPackArea = positiveOr(inputs.insulationPackArea, getInputDefault(spec, "insulationPackArea", 5.76));
  const insulationPacks = needInsulation ? Math.ceil(netArea / insulationPackArea) : 0;
  const insulationPurchaseArea = insulationPacks * insulationPackArea;

  const externalCorners = Math.max(0, Math.round(finiteOr(inputs.externalCorners, getInputDefault(spec, "externalCorners", 4))));
  const cornerPieceLength = positiveOr(inputs.cornerPieceLength, getInputDefault(spec, "cornerPieceLength", 3));
  const starterPieceLength = positiveOr(inputs.starterPieceLength, getInputDefault(spec, "starterPieceLength", 3));
  const cornersCount = Math.ceil(externalCorners * wallHeight / cornerPieceLength);
  const startersCount = Math.ceil(perimeter / starterPieceLength);

  const panelName = spec.material_rules.panel_type_labels[String(panelType)] ?? "Фасадные панели";
  const materials: CanonicalMaterialResult[] = [
    {
      name: panelName,
      subtitle: `Полезная площадь одной панели ${roundDisplay(panelUsefulArea, 3)} м²; запас ${roundDisplay(reservePercent, 1)}% применён один раз`,
      quantity: roundDisplay(exactPanelsRec, 6),
      unit: "шт",
      withReserve: roundDisplay(exactPanelsRec, 6),
      purchaseQty: panelsCount,
      category: "Облицовка",
    },
  ];

  if (profilePieces > 0) {
    materials.push({
      name: `Профиль/рейка по ${roundDisplay(profilePieceLength, 2)} м`,
      subtitle: `Расчётная длина ${roundDisplay(profileLength, 2)} м при шаге ${roundDisplay(profileStep, 2)} м; шаг и сечение сверьте с системой`,
      quantity: roundDisplay(profileLength, 6),
      unit: "м",
      withReserve: roundDisplay(profileLength, 6),
      purchaseQty: roundDisplay(profilePieces * profilePieceLength, 6),
      category: "Подсистема",
      packageInfo: { count: profilePieces, size: profilePieceLength, packageUnit: "шт" },
    });
  }
  if (fasteners > 0) {
    materials.push({
      name: "Крепёж панелей",
      subtitle: `${roundDisplay(fastenersPerPanel, 1)} шт. на панель по паспорту выбранной системы`,
      quantity: fasteners,
      unit: "шт",
      withReserve: fasteners,
      purchaseQty: fasteners,
      category: "Крепёж",
    });
  }
  if (needInsulation) {
    materials.push({
      name: "Фасадный утеплитель",
      subtitle: `В упаковке ${roundDisplay(insulationPackArea, 2)} м²; марку и крепление выбирают по проекту фасада`,
      quantity: roundDisplay(netArea, 6),
      unit: "м²",
      withReserve: roundDisplay(insulationPurchaseArea, 6),
      purchaseQty: roundDisplay(insulationPurchaseArea, 6),
      category: "Утепление",
      packageInfo: { count: insulationPacks, size: insulationPackArea, packageUnit: "упак." },
    });
  }
  if (cornersCount > 0) {
    materials.push({ name: "Наружные угловые элементы", quantity: cornersCount, unit: "шт", withReserve: cornersCount, purchaseQty: cornersCount, category: "Доборные элементы" });
  }
  if (startersCount > 0) {
    materials.push({ name: "Стартовые элементы", quantity: startersCount, unit: "шт", withReserve: startersCount, purchaseQty: startersCount, category: "Доборные элементы" });
  }

  const warnings: string[] = [];
  if (netArea <= 0) warnings.push("Площадь проёмов должна быть меньше общей площади стен");
  if (netArea > spec.warnings_rules.large_area_threshold_m2) warnings.push("Для большого фасада закажите раскрой и спецификацию у поставщика системы");
  if (fastenersPerPanel === 0) warnings.push("Крепёж не добавлен: укажите расход из паспорта выбранной фасадной системы");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      inputMode,
      houseLength,
      houseWidth,
      wallLength: perimeter,
      wallHeight,
      openingsArea,
      grossArea: roundDisplay(grossArea, 6),
      wallArea: roundDisplay(netArea, 6),
      area: roundDisplay(netArea, 6),
      panelType,
      panelUsefulArea,
      reservePercent,
      panelsArea: roundDisplay(panelsArea, 6),
      panelsCount,
      panels: panelsCount,
      profileLength: roundDisplay(profileLength, 6),
      profilePieces,
      fasteners,
      insulationArea: roundDisplay(needInsulation ? netArea : 0, 6),
      insulationPacks,
      insulationPurchaseArea: roundDisplay(insulationPurchaseArea, 6),
      cornersCount,
      startersCount,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      "Полезную площадь панели, расход крепежа, шаг и длину профиля возьмите из паспорта конкретной фасадной системы.",
      "Это оценка закупки по площади, а не схема раскладки: швы, углы, примыкания и раскрой нужно проверить по фасадам здания.",
      "Подсистема, анкеры и утепление требуют проверки основания, ветровой нагрузки и проектного решения.",
    ],
    scenarios,
  };
}
