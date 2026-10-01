/** Чистый контракт первого сценария «Конструктора Мастерок». Все размеры — мм. */
export type Wall = 0 | 1 | 2 | 3;

export const ROOM_TYPES = ["living", "bathroom", "kitchen", "bedroom", "office", "hallway", "empty"] as const;
export type RoomType = typeof ROOM_TYPES[number];
export const FURNISHING_TYPES = ["sofa", "coffee-table", "plant", "bathtub", "shower", "washer", "vanity", "toilet", "towel-rail", "kitchen-unit", "fridge", "dining-table", "bed", "nightstand", "wardrobe", "desk", "office-chair", "console"] as const;
export type FurnishingKind = typeof FURNISHING_TYPES[number];
export const ROOM_FURNISHINGS: Record<RoomType, readonly FurnishingKind[]> = {
  living: ["sofa", "coffee-table", "plant"],
  bathroom: ["bathtub", "washer", "vanity", "toilet", "towel-rail", "shower"],
  kitchen: ["kitchen-unit", "fridge", "dining-table"],
  bedroom: ["bed", "nightstand", "wardrobe"],
  office: ["desk", "office-chair", "wardrobe", "plant"],
  hallway: ["wardrobe", "console"], empty: [],
};
/** Верхний левый угол габарита на плане, мм. Угол — поворот модели вокруг вертикальной оси. */
export interface FurnishingPosition { xMm: number; yMm: number; rotationDeg: 0 | 90 | 180 | 270 }
/** Технические пределы редактора, не размеры или нормы конкретных товаров. */
export const MAX_FURNISHINGS_PER_ROOM = 40;
export const MIN_FURNISHING_MM = 10;
export const MAX_FURNISHING_MM = 30_000;
export interface FurnishingDimensions { widthMm: number; depthMm: number; heightMm: number }
/** id уникален внутри помещения; размеры без dimensions берутся из стартовой модели. */
export interface FurnishingInstance {
  id: string;
  kind: FurnishingKind;
  dimensions?: FurnishingDimensions;
  position?: FurnishingPosition;
}
/** Визуальная обстановка. Предметы не вычитаются из площади отделки и не входят в закупку. */
export interface RoomInterior {
  type: RoomType;
  /** Экземпляры без сохранённой позиции размещаются автоматически. */
  items: FurnishingInstance[];
}

export interface Opening {
  id: string;
  type: "door" | "window";
  wall: Wall;
  offsetMm: number;
  widthMm: number;
  heightMm: number;
  sillMm: number;
}

export interface FloorSpec {
  /** Отсутствие kind в старых проектах означает ламинат. */
  kind?: "laminate" | "tile";
  /** Параметры плитки сохраняются при временном переключении на ламинат. */
  tile?: FloorTileSpec;
  materialKey: string;
  decor: "natural" | "light" | "grey" | "dark";
  boardLengthMm: number;
  boardWidthMm: number;
  boardsPerPack: number;
  packPriceRub: number;
  pattern: "third" | "half";
  direction: "width" | "length";
  expansionGapMm: number;
  kerfMm: number;
  reservePercent: number;
  reuseOffcuts: boolean;
  includeUnderlay: boolean;
  underlayRollAreaM2: number;
  underlayRollPriceRub: number;
  includePlinth: boolean;
  plinthLengthMm: number;
  plinthPiecePriceRub: number;
}

/** Встроенный образец — оформление, а не подтверждённый товар магазина. */
export interface WallTileSpec {
  materialKey: string;
  decor: "limestone" | "marble" | "graphite" | "microcement";
  tileWidthMm: number;
  tileHeightMm: number;
  orientation: "horizontal" | "vertical";
  jointMm: number;
  alignment: "edge" | "center";
  reservePercent: number;
  tilesPerPack: number;
  packPriceRub: number;
}

export interface FloorTileSpec extends WallTileSpec { edgeGapMm: number }

/** Расход по выбранному товару для всех плиточных поверхностей комнаты. */
export interface TileSupplySpec {
  materialKey: string;
  consumptionKgM2: number;
  reservePercent: number;
  packageKg: number;
  packagePriceRub: number;
}
export interface TileSupplies { adhesive?: TileSupplySpec; grout?: TileSupplySpec }

/** Координата Y идёт от пола вверх, X — по часовой стрелке вдоль стены. */
export interface TileRect { xMm: number; yMm: number; widthMm: number; heightMm: number }
export interface WallTileCell extends TileRect {
  id: string;
  row: number;
  column: number;
  fragments: TileRect[];
  isCut: boolean;
}
export interface WallTileCalculation {
  roomId: string;
  wall: Wall;
  widthMm: number;
  heightMm: number;
  netAreaM2: number;
  coveredAreaM2: number;
  cells: WallTileCell[];
  baseTiles: number;
  cutTiles: number;
  reserveTiles: number;
  /** Вся площадь исходных плиток, не уложенная на стену, включая потери при резке. */
  unlaidAreaM2: number;
  warnings: string[];
}
export type FloorTileCalculation = Omit<WallTileCalculation, "wall">;

export interface ConstructorRoom {
  id: string;
  name: string;
  /** Отсутствует в старых файлах: отображается прежний пример гостиной. */
  interior?: RoomInterior;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  openings: Opening[];
  floor: FloorSpec;
  wallTiles: [WallTileSpec | null, WallTileSpec | null, WallTileSpec | null, WallTileSpec | null];
  continuousWallTiles: boolean;
  tileSupplies?: TileSupplies;
}

export interface ConstructorProject {
  schemaVersion: 5;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rooms: ConstructorRoom[];
}

export interface BoardPiece {
  id: string;
  row: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  sourceBoardId: string;
  /** Координата и длина детали вдоль исходной доски, мм. */
  sourceStartMm: number;
  sourceLengthMm: number;
  /** Ширина детали после продольного реза, мм. */
  sourceWidthMm: number;
  /** Положение детали относительно заводских торцов исходной доски. */
  end: "whole" | "start" | "end" | "single";
  isCut: boolean;
}

export interface SourceBoard {
  id: string;
  pieceIds: string[];
  residualLengthMm: number;
  offcuts: Array<{ lengthMm: number; widthMm: number; areaM2: number; reason: string }>;
  kerfAreaM2: number;
}

export interface RoomCalculation {
  roomId: string;
  areaM2: number;
  coveredAreaM2: number;
  perimeterMm: number;
  plinthNeededMm: number;
  pieces: BoardPiece[];
  sourceBoards: SourceBoard[];
  baseBoards: number;
  reserveBoards: number;
  neededBoards: number;
  offcutAreaM2: number;
  kerfAreaM2: number;
  warnings: string[];
  walls: WallTileCalculation[];
  floorTiles?: FloorTileCalculation;
}

export interface PurchaseLine {
  id: string;
  name: string;
  detail: string;
  unit: string;
  quantity: number;
  unitPriceRub: number;
  totalPriceRub: number;
  roomIds: string[];
  basis: string;
  /** Явное условие оценки общей стоимости при разных ценах одного товара по комнатам. */
  priceNote?: string;
  kind?: "laminate" | "wall-tile" | "floor-tile" | "tile-adhesive" | "tile-grout";
  baseTiles?: number;
  reserveTiles?: number;
  roundedTiles?: number;
  purchasedTiles?: number;
  packSurplusTiles?: number;
  surfaces?: Array<{ roomId: string; wall: Wall }>;
  floorRoomIds?: string[];
  exactNeedKg?: number;
  reserveKg?: number;
  neededKg?: number;
  purchasedKg?: number;
  packSurplusKg?: number;
  /** Поля заполнены только для закупки напольного покрытия. */
  baseBoards?: number;
  reserveBoards?: number;
  roundedBoards?: number;
  purchasedBoards?: number;
  packSurplusBoards?: number;
  purchasedAreaM2?: number;
}

export interface ProjectCalculation {
  rooms: RoomCalculation[];
  purchases: PurchaseLine[];
  totalCostRub: number;
}
