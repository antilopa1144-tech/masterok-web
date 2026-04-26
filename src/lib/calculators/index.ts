import type { CalculatorDefinition } from "./types";
import { concreteDef } from "./formulas/concrete";
import { brickDef } from "./formulas/brick";
import { roofingDef } from "./formulas/roofing";
import { tileDef } from "./formulas/tile";
import { laminateDef } from "./formulas/laminate";
import { wallpaperDef } from "./formulas/wallpaper";
import { screedDef } from "./formulas/screed";
import { paintDef } from "./formulas/paint";
import { insulationDef } from "./formulas/insulation";
import { drywallDef } from "./formulas/drywall";
import { stripFoundationDef } from "./formulas/strip-foundation";
import { warmFloorDef } from "./formulas/warm-floor";
import { plasterDef } from "./formulas/plaster";
import { primerDef } from "./formulas/primer";
import { puttyDef } from "./formulas/putty";
import { linoleumDef } from "./formulas/linoleum";
import { aeratedConcreteDef } from "./formulas/aerated-concrete";
import { guttersDef } from "./formulas/gutters";
import { tileGroutDef } from "./formulas/tile-grout";
import { tileAdhesiveDef } from "./formulas/tile-adhesive";
import { parquetDef } from "./formulas/parquet";
import { selfLevelingDef } from "./formulas/self-leveling";
import { sidingDef } from "./formulas/siding";
import { electricDef } from "./formulas/electric";
import { fenceDef } from "./formulas/fence";
import { decorPlasterDef } from "./formulas/decor-plaster";
// Потолки
import { ceilingStretchDef } from "./formulas/ceiling-stretch";
import { ceilingRailDef } from "./formulas/ceiling-rail";
import { ceilingCassetteDef } from "./formulas/ceiling-cassette";
import { ceilingInsulationDef } from "./formulas/ceiling-insulation";
// Стены (новые)
import { gypsumBoardDef } from "./formulas/gypsum-board";
import { wallPanelsDef } from "./formulas/wall-panels";
import { partitionsDef } from "./formulas/partitions";
// Фундамент (новые)
import { foundationSlabDef } from "./formulas/foundation-slab";
import { blindAreaDef } from "./formulas/blind-area";
import { basementDef } from "./formulas/basement";
// Фасад (новые)
import { terraceDef } from "./formulas/terrace";
import { facadeInsulationDef } from "./formulas/facade-insulation";
import { facadeBrickDef } from "./formulas/facade-brick";
import { facadePanelsDef } from "./formulas/facade-panels";
import { stairsDef } from "./formulas/stairs";
// Инженерные (новые)
import { heatingDef } from "./formulas/heating";
import { ventilationDef } from "./formulas/ventilation";
// Внутренняя отделка (новые)
import { waterproofingDef } from "./formulas/waterproofing";
import { doorsDef } from "./formulas/doors";
import { windowsDef } from "./formulas/windows";
import { slopesDef } from "./formulas/slopes";
import { soundInsulationDef } from "./formulas/sound-insulation";
import { balconyDef } from "./formulas/balcony";
import { atticDef } from "./formulas/attic";
// Новые калькуляторы (10 шт)
import { fastenersDef } from "./formulas/fasteners";
import { foamBlocksDef } from "./formulas/foam-blocks";
import { brickworkDef } from "./formulas/brickwork";
import { rebarDef } from "./formulas/rebar";
import { bathroomDef } from "./formulas/bathroom";
import { drywallCeilingDef } from "./formulas/drywall-ceiling";
import { warmFloorPipesDef } from "./formulas/warm-floor-pipes";
import { sewageDef } from "./formulas/sewage";
import { frameHouseDef } from "./formulas/frame-house";
import { softRoofingDef } from "./formulas/soft-roofing";
import { decorStoneDef } from "./formulas/decor-stone";
import { drainageDef } from "./formulas/drainage";

export const ALL_CALCULATORS: CalculatorDefinition[] = [
  // Фундамент
  concreteDef,
  stripFoundationDef,
  foundationSlabDef,
  blindAreaDef,
  basementDef,
  rebarDef,
  // Стены
  brickDef,
  drywallDef,
  gypsumBoardDef,
  aeratedConcreteDef,
  foamBlocksDef,
  brickworkDef,
  frameHouseDef,
  plasterDef,
  wallPanelsDef,
  partitionsDef,
  // Полы
  tileDef,
  tileGroutDef,
  tileAdhesiveDef,
  laminateDef,
  parquetDef,
  linoleumDef,
  screedDef,
  selfLevelingDef,
  warmFloorDef,
  // Потолки
  ceilingStretchDef,
  ceilingRailDef,
  ceilingCassetteDef,
  ceilingInsulationDef,
  drywallCeilingDef,
  // Кровля
  roofingDef,
  guttersDef,
  softRoofingDef,
  // Фасад/утепление
  insulationDef,
  facadeInsulationDef,
  sidingDef,
  facadePanelsDef,
  facadeBrickDef,
  decorPlasterDef,
  decorStoneDef,
  fenceDef,
  terraceDef,
  stairsDef,
  // Инженерные системы
  electricDef,
  heatingDef,
  ventilationDef,
  warmFloorPipesDef,
  sewageDef,
  drainageDef,
  // Внутренняя отделка
  wallpaperDef,
  paintDef,
  primerDef,
  puttyDef,
  waterproofingDef,
  doorsDef,
  windowsDef,
  slopesDef,
  soundInsulationDef,
  balconyDef,
  atticDef,
  bathroomDef,
  fastenersDef,
];

// Поиск по slug (URL)
export const getCalculatorBySlug = (slug: string): CalculatorDefinition | undefined =>
  ALL_CALCULATORS.find((c) => c.slug === slug);

// Поиск по id
export const getCalculatorById = (id: string): CalculatorDefinition | undefined =>
  ALL_CALCULATORS.find((c) => c.id === id);

// Калькуляторы по категории
export const getCalculatorsByCategory = (categoryId: string): CalculatorDefinition[] =>
  ALL_CALCULATORS.filter((c) => c.category === categoryId);

// Топ популярных
export const getPopularCalculators = (limit = 8): CalculatorDefinition[] =>
  [...ALL_CALCULATORS].sort((a, b) => b.popularity - a.popularity).slice(0, limit);

export type { CalculatorDefinition };
