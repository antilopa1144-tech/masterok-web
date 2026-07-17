/**
 * Раскрой обоев по стенам и рулонам.
 *
 * В отличие от площадного калькулятора этот модуль моделирует каждую полосу:
 * ширину крайних полотен, фазу рисунка и фактический расход рулона до следующей
 * точки совмещения. Формулы остаются вне React-компонентов.
 */

export type WallpaperMatchType = "free" | "straight" | "offset";

export interface WallpaperWallInput {
  id: string;
  name: string;
  lengthM: number;
}

export interface WallpaperLayoutInput {
  walls: WallpaperWallInput[];
  wallHeightM: number;
  rollWidthM: number;
  rollLengthM: number;
  matchType: WallpaperMatchType;
  rapportCm: number;
  offsetCm: number;
  trimAllowanceCm: number;
  reserveRolls: number;
}

export interface WallpaperStrip {
  id: string;
  wallId: string;
  wallName: string;
  wallIndex: number;
  indexOnWall: number;
  globalIndex: number;
  widthM: number;
  cutLengthM: number;
  patternPhaseCm: number;
  isEdge: boolean;
}

export interface WallpaperWallLayout {
  id: string;
  name: string;
  lengthM: number;
  strips: WallpaperStrip[];
  edgeStripWidthM: number;
}

export interface WallpaperRollCut {
  stripId: string;
  wallName: string;
  stripNumber: number;
  startM: number;
  alignmentWasteM: number;
  cutLengthM: number;
  patternPhaseCm: number;
}

export interface WallpaperRollPlan {
  index: number;
  cuts: WallpaperRollCut[];
  usedM: number;
  alignmentWasteM: number;
  remainderM: number;
  reusableRemainder: boolean;
}

export interface WallpaperLayoutResult {
  input: WallpaperLayoutInput;
  walls: WallpaperWallLayout[];
  rolls: WallpaperRollPlan[];
  perimeterM: number;
  wallAreaM2: number;
  stripCount: number;
  cutLengthM: number;
  stripsPerRollRange: { min: number; max: number };
  baseRolls: number;
  reserveRolls: number;
  purchaseRolls: number;
  wallpaperOnWallsM: number;
  trimWasteM: number;
  patternWasteM: number;
  rollRemainderM: number;
  reusableRemainderM: number;
  totalWasteM: number;
  wastePercent: number;
  warnings: string[];
  notes: string[];
}

export interface WallpaperMatchOption {
  value: WallpaperMatchType;
  label: string;
  shortLabel: string;
  description: string;
}

export const WALLPAPER_MATCH_OPTIONS: WallpaperMatchOption[] = [
  {
    value: "free",
    label: "Без подгонки",
    shortLabel: "Свободная",
    description: "Однотонные обои, фактура или вертикальная полоса — полотна режутся подряд.",
  },
  {
    value: "straight",
    label: "Прямая подгонка",
    shortLabel: "Прямая",
    description: "Рисунок соседних полотен совпадает на одной высоте. На этикетке указан один раппорт.",
  },
  {
    value: "offset",
    label: "Смещённая подгонка",
    shortLabel: "Смещённая",
    description: "Каждое второе полотно сдвигается. На этикетке обычно два числа, например 64/32 см.",
  },
];

export const WALLPAPER_ROLL_PRESETS = [
  { label: "0,53 × 10,05 м", widthM: 0.53, lengthM: 10.05 },
  { label: "1,06 × 10,05 м", widthM: 1.06, lengthM: 10.05 },
  { label: "1,06 × 25 м", widthM: 1.06, lengthM: 25 },
] as const;

const EPSILON = 1e-7;
const REUSABLE_REMAINDER_M = 1;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function positiveModulo(value: number, divisor: number): number {
  if (divisor <= EPSILON) return 0;
  return ((value % divisor) + divisor) % divisor;
}

export function normalizeWallpaperLayoutInput(input: WallpaperLayoutInput): WallpaperLayoutInput {
  const walls = input.walls
    .slice(0, 20)
    .map((wall, index) => ({
      id: wall.id || `wall-${index + 1}`,
      name: wall.name.trim() || `Стена ${index + 1}`,
      lengthM: round(clamp(wall.lengthM, 0.3, 50), 3),
    }));

  if (walls.length === 0) {
    walls.push({ id: "wall-1", name: "Стена 1", lengthM: 3 });
  }

  const rapportCm = round(clamp(input.rapportCm, 0, 150), 1);
  const matchType = rapportCm <= 0 ? "free" : input.matchType;
  const offsetCm = matchType === "offset"
    ? round(clamp(input.offsetCm || rapportCm / 2, 0.1, Math.max(0.1, rapportCm - 0.1)), 1)
    : 0;

  return {
    walls,
    wallHeightM: round(clamp(input.wallHeightM, 1.5, 6), 3),
    rollWidthM: round(clamp(input.rollWidthM, 0.4, 1.5), 3),
    rollLengthM: round(clamp(input.rollLengthM, 5, 50), 3),
    matchType,
    rapportCm,
    offsetCm,
    trimAllowanceCm: round(clamp(input.trimAllowanceCm, 0, 30), 1),
    reserveRolls: Math.round(clamp(input.reserveRolls, 0, 10)),
  };
}

function buildWallStrips(
  walls: WallpaperWallInput[],
  rollWidthM: number,
  cutLengthM: number,
  matchType: WallpaperMatchType,
  rapportCm: number,
  offsetCm: number,
): WallpaperWallLayout[] {
  let globalIndex = 0;

  return walls.map((wall, wallIndex) => {
    const count = Math.max(1, Math.ceil(wall.lengthM / rollWidthM - EPSILON));
    const excessM = Math.max(0, count * rollWidthM - wall.lengthM);
    const edgeWidthM = count === 1 ? wall.lengthM : rollWidthM - excessM / 2;

    const strips = Array.from({ length: count }, (_, indexOnWall) => {
      const isEdge = count === 1 || indexOnWall === 0 || indexOnWall === count - 1;
      const widthM = isEdge ? edgeWidthM : rollWidthM;
      const patternPhaseCm = matchType === "offset" && globalIndex % 2 === 1 ? offsetCm : 0;
      const strip: WallpaperStrip = {
        id: `${wall.id}-strip-${indexOnWall + 1}`,
        wallId: wall.id,
        wallName: wall.name,
        wallIndex,
        indexOnWall,
        globalIndex,
        widthM: round(widthM, 4),
        cutLengthM,
        patternPhaseCm,
        isEdge,
      };
      globalIndex += 1;
      return strip;
    });

    return {
      id: wall.id,
      name: wall.name,
      lengthM: wall.lengthM,
      strips,
      edgeStripWidthM: round(edgeWidthM, 3),
    };
  });
}

function alignmentWasteFor(
  usedM: number,
  targetPhaseCm: number,
  matchType: WallpaperMatchType,
  rapportCm: number,
): number {
  if (matchType === "free" || rapportCm <= 0) return 0;
  const rapportM = rapportCm / 100;
  const targetPhaseM = targetPhaseCm / 100;
  return positiveModulo(targetPhaseM - positiveModulo(usedM, rapportM), rapportM);
}

interface MutableRoll {
  cuts: WallpaperRollCut[];
  usedM: number;
  alignmentWasteM: number;
}

/**
 * Best-fit раскрой: каждое полотно кладём в уже открытый рулон, где после
 * выравнивания рисунка останется меньше всего материала. Если не помещается —
 * открываем следующий рулон. Полотна маркируются, поэтому резать их можно не в
 * порядке наклейки.
 */
function buildRollPlans(
  strips: WallpaperStrip[],
  rollLengthM: number,
  matchType: WallpaperMatchType,
  rapportCm: number,
): WallpaperRollPlan[] {
  const rolls: MutableRoll[] = [];

  for (const strip of strips) {
    let bestRollIndex = -1;
    let bestRemainder = Number.POSITIVE_INFINITY;
    let bestAlignmentWaste = 0;

    for (let index = 0; index < rolls.length; index += 1) {
      const roll = rolls[index];
      const alignmentWasteM = alignmentWasteFor(
        roll.usedM,
        strip.patternPhaseCm,
        matchType,
        rapportCm,
      );
      const nextUsedM = roll.usedM + alignmentWasteM + strip.cutLengthM;
      if (nextUsedM <= rollLengthM + EPSILON) {
        const remainder = rollLengthM - nextUsedM;
        if (remainder < bestRemainder) {
          bestRollIndex = index;
          bestRemainder = remainder;
          bestAlignmentWaste = alignmentWasteM;
        }
      }
    }

    if (bestRollIndex < 0) {
      const alignmentWasteM = alignmentWasteFor(0, strip.patternPhaseCm, matchType, rapportCm);
      rolls.push({ cuts: [], usedM: 0, alignmentWasteM: 0 });
      bestRollIndex = rolls.length - 1;
      bestAlignmentWaste = alignmentWasteM;
    }

    const roll = rolls[bestRollIndex];
    const startM = roll.usedM + bestAlignmentWaste;
    roll.cuts.push({
      stripId: strip.id,
      wallName: strip.wallName,
      stripNumber: strip.indexOnWall + 1,
      startM: round(startM, 4),
      alignmentWasteM: round(bestAlignmentWaste, 4),
      cutLengthM: strip.cutLengthM,
      patternPhaseCm: strip.patternPhaseCm,
    });
    roll.usedM = startM + strip.cutLengthM;
    roll.alignmentWasteM += bestAlignmentWaste;
  }

  return rolls.map((roll, index) => {
    const remainderM = Math.max(0, rollLengthM - roll.usedM);
    return {
      index: index + 1,
      cuts: roll.cuts,
      usedM: round(roll.usedM, 4),
      alignmentWasteM: round(roll.alignmentWasteM, 4),
      remainderM: round(remainderM, 4),
      reusableRemainder: remainderM >= REUSABLE_REMAINDER_M,
    };
  });
}

function buildWarnings(
  input: WallpaperLayoutInput,
  walls: WallpaperWallLayout[],
  cutLengthM: number,
  rolls: WallpaperRollPlan[],
): string[] {
  const warnings: string[] = [];
  if (cutLengthM > input.rollLengthM + EPSILON) {
    warnings.push("Высота полотна с припуском больше длины рулона — из такого рулона нельзя получить целую полосу.");
  }
  if (input.matchType !== "free" && input.rapportCm >= 50) {
    warnings.push("Крупный раппорт заметно увеличивает потери на совмещение. Перепроверьте оба числа на этикетке рулона.");
  }
  if (input.matchType === "offset" && input.offsetCm >= input.rapportCm - EPSILON) {
    warnings.push("Смещение должно быть меньше полного раппорта.");
  }
  const narrowEdges = walls.filter((wall) => wall.edgeStripWidthM < Math.min(0.15, input.rollWidthM * 0.3));
  if (narrowEdges.length > 0) {
    warnings.push("На одной из стен получаются узкие крайние полотна. Перед раскроем сместите стартовую линию, чтобы углы были симметричнее.");
  }
  if (rolls.some((roll) => roll.cuts.length === 1) && rolls.length > 1) {
    warnings.push("В последнем рулоне получается только одна полоса. Особенно важно купить все рулоны одной партии.");
  }
  return warnings;
}

export function calculateWallpaperLayout(rawInput: WallpaperLayoutInput): WallpaperLayoutResult {
  const input = normalizeWallpaperLayoutInput(rawInput);
  const cutLengthM = round(input.wallHeightM + input.trimAllowanceCm / 100, 4);
  const walls = buildWallStrips(
    input.walls,
    input.rollWidthM,
    cutLengthM,
    input.matchType,
    input.rapportCm,
    input.offsetCm,
  );
  const strips = walls.flatMap((wall) => wall.strips);
  const rolls = cutLengthM <= input.rollLengthM + EPSILON
    ? buildRollPlans(strips, input.rollLengthM, input.matchType, input.rapportCm)
    : [];
  const perimeterM = input.walls.reduce((sum, wall) => sum + wall.lengthM, 0);
  const wallAreaM2 = perimeterM * input.wallHeightM;
  const wallpaperOnWallsM = strips.length * input.wallHeightM;
  const trimWasteM = strips.length * (input.trimAllowanceCm / 100);
  const patternWasteM = rolls.reduce((sum, roll) => sum + roll.alignmentWasteM, 0);
  const rollRemainderM = rolls.reduce((sum, roll) => sum + roll.remainderM, 0);
  const reusableRemainderM = rolls.reduce(
    (sum, roll) => sum + (roll.reusableRemainder ? roll.remainderM : 0),
    0,
  );
  const baseRolls = rolls.length;
  const appliedReserveRolls = baseRolls > 0 ? input.reserveRolls : 0;
  const purchaseRolls = baseRolls + appliedReserveRolls;
  const totalWasteM = trimWasteM + patternWasteM + rollRemainderM;
  const openedMaterialM = baseRolls * input.rollLengthM;
  const wastePercent = openedMaterialM > 0 ? (totalWasteM / openedMaterialM) * 100 : 0;
  const cutsPerRoll = rolls.map((roll) => roll.cuts.length);

  return {
    input,
    walls,
    rolls,
    perimeterM: round(perimeterM, 3),
    wallAreaM2: round(wallAreaM2, 2),
    stripCount: strips.length,
    cutLengthM,
    stripsPerRollRange: {
      min: cutsPerRoll.length > 0 ? Math.min(...cutsPerRoll) : 0,
      max: cutsPerRoll.length > 0 ? Math.max(...cutsPerRoll) : 0,
    },
    baseRolls,
    reserveRolls: appliedReserveRolls,
    purchaseRolls,
    wallpaperOnWallsM: round(wallpaperOnWallsM, 2),
    trimWasteM: round(trimWasteM, 2),
    patternWasteM: round(patternWasteM, 2),
    rollRemainderM: round(rollRemainderM, 2),
    reusableRemainderM: round(reusableRemainderM, 2),
    totalWasteM: round(totalWasteM, 2),
    wastePercent: round(wastePercent, 1),
    warnings: buildWarnings(input, walls, cutLengthM, rolls),
    notes: [
      "Полосы на каждой стене сбалансированы: крайние полотна подрезаются симметрично, чтобы не оставлять узкую полосу в одном углу.",
      "Окна и двери не вычитаются из рулонов автоматически: полотно обычно заводят на проём и подрезают на месте.",
      "Резервный рулон не включён в процент отхода — он остаётся закрытым для брака или будущего ремонта.",
    ],
  };
}

export function buildRectangleWalls(widthM: number, lengthM: number): WallpaperWallInput[] {
  const width = round(clamp(widthM, 0.3, 50), 3);
  const length = round(clamp(lengthM, 0.3, 50), 3);
  return [
    { id: "wall-1", name: "Стена 1", lengthM: width },
    { id: "wall-2", name: "Стена 2", lengthM: length },
    { id: "wall-3", name: "Стена 3", lengthM: width },
    { id: "wall-4", name: "Стена 4", lengthM: length },
  ];
}
