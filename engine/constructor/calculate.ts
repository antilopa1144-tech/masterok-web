import type {
  BoardPiece, ConstructorProject, ConstructorRoom, FloorSpec, Opening,
  ProjectCalculation, PurchaseLine, RoomCalculation, SourceBoard, WallTileSpec, FloorTileCalculation,
} from "./model";
import { calculateWallTiles, estimateWallTileCells, validateWallTileSpec, MAX_CELLS_PER_WALL } from "./tiling";
import { MAX_FURNISHINGS_PER_ROOM, MIN_FURNISHING_MM, MAX_FURNISHING_MM, ROOM_FURNISHINGS, ROOM_TYPES } from "./model";
import { calculateFloorTiles, estimateFloorTileCells, validateFloorTileSpec } from "./floor-tiles";
import { calculateTileSupplies, validateTileSupplies } from "./tile-supplies";

export * from "./model";

const MAX_DIMENSION_MM = 30_000;
const MAX_ROOMS = 100;
const MAX_OPENINGS_PER_ROOM = 100;
const MAX_PIECES_PER_ROOM = 8_000;
const MAX_PIECES_PER_PROJECT = 25_000;
const MAX_STRING_ID_LENGTH = 150;
const MAX_NAME_LENGTH = 120;
const MAX_PRICE_RUB = 10_000_000;
const MAX_BOARDS_PER_PACK = 1_000;
const EPSILON = 0.000_001;

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function createDefaultProject(): ConstructorProject {
  const timestamp = nowIso();
  return {
    schemaVersion: 5, id: id("project"), name: "Новый проект", createdAt: timestamp, updatedAt: timestamp,
    rooms: [createRoom()],
  };
}

export function createRoom(name = "Комната 1"): ConstructorRoom {
  return {
      id: id("room"), name, widthMm: 3000, lengthMm: 4000, heightMm: 2700, openings: [],
      wallTiles: [null, null, null, null], continuousWallTiles: false,
      floor: {
        materialKey: "Ламинат", decor: "natural", boardLengthMm: 1285, boardWidthMm: 192,
        boardsPerPack: 8, packPriceRub: 0, pattern: "third", direction: "length",
        expansionGapMm: 10, kerfMm: 3, reservePercent: 5, reuseOffcuts: true,
        includeUnderlay: false, underlayRollAreaM2: 10, underlayRollPriceRub: 0,
        includePlinth: false, plinthLengthMm: 2500, plinthPiecePriceRub: 0,
      },
  };
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown) => finite(value) && value > 0;
const nonNegative = (value: unknown) => finite(value) && value >= 0;
const error = (errors: string[], condition: boolean, message: string) => { if (!condition) errors.push(message); };
const textWithin = (value: unknown, limit: number, allowEmpty = false) => typeof value === "string" && value.length <= limit && (allowEmpty || value.trim().length > 0);

function validateOpening(opening: Opening, index: number, errors: string[]): void {
  const label = `Проём ${index + 1}`;
  error(errors, opening && textWithin(opening.id, MAX_STRING_ID_LENGTH), `${label}: id — непустая строка до ${MAX_STRING_ID_LENGTH} символов.`);
  error(errors, opening && (opening.type === "door" || opening.type === "window"), `${label}: неизвестный тип.`);
  error(errors, opening && [0, 1, 2, 3].includes(opening.wall), `${label}: стена должна быть от 0 до 3.`);
  for (const [field, value] of Object.entries({ offsetMm: opening?.offsetMm, widthMm: opening?.widthMm, heightMm: opening?.heightMm, sillMm: opening?.sillMm })) {
    error(errors, field === "offsetMm" || field === "sillMm" ? nonNegative(value) : positive(value), `${label}: ${field} должно быть корректным числом.`);
  }
}

function validateFloor(floor: FloorSpec, errors: string[]): void {
  error(errors, floor && (floor.kind === undefined || floor.kind === "laminate" || floor.kind === "tile"), "Пол: неизвестный тип покрытия.");
  if (floor?.tile !== undefined) errors.push(...validateFloorTileSpec(floor.tile));
  if (floor?.kind === "tile" && !floor.tile) errors.push("Пол: задайте параметры плитки.");
  error(errors, floor && textWithin(floor.materialKey, MAX_STRING_ID_LENGTH), "Пол: materialKey — непустая строка до 150 символов.");
  error(errors, floor && ["natural", "light", "grey", "dark"].includes(floor.decor), "Пол: неизвестный декор.");
  error(errors, floor && ["third", "half"].includes(floor.pattern), "Пол: неизвестный рисунок.");
  error(errors, floor && ["width", "length"].includes(floor.direction), "Пол: неизвестное направление.");
  error(errors, floor && finite(floor.boardLengthMm) && floor.boardLengthMm >= 100 && floor.boardLengthMm <= 3000, "Пол: boardLengthMm должно быть от 100 до 3000 мм.");
  error(errors, floor && finite(floor.boardWidthMm) && floor.boardWidthMm >= 40 && floor.boardWidthMm <= 600, "Пол: boardWidthMm должно быть от 40 до 600 мм.");
  error(errors, floor && Number.isInteger(floor.boardsPerPack) && floor.boardsPerPack >= 1 && floor.boardsPerPack <= MAX_BOARDS_PER_PACK, `Пол: boardsPerPack должно быть целым числом от 1 до ${MAX_BOARDS_PER_PACK}.`);
  error(errors, floor && finite(floor.underlayRollAreaM2) && floor.underlayRollAreaM2 >= 0.1 && floor.underlayRollAreaM2 <= 1_000, "Пол: underlayRollAreaM2 должно быть от 0,1 до 1000 м².");
  error(errors, floor && finite(floor.plinthLengthMm) && floor.plinthLengthMm >= 100 && floor.plinthLengthMm <= 5_000, "Пол: plinthLengthMm должно быть от 100 до 5000 мм.");
  for (const [field, value] of Object.entries({
    packPriceRub: floor?.packPriceRub, underlayRollPriceRub: floor?.underlayRollPriceRub, plinthPiecePriceRub: floor?.plinthPiecePriceRub,
  })) error(errors, nonNegative(value), `Пол: ${field} должно быть неотрицательным числом.`);
  error(errors, floor && finite(floor.packPriceRub) && floor.packPriceRub <= MAX_PRICE_RUB, `Пол: packPriceRub не больше ${MAX_PRICE_RUB} руб.`);
  error(errors, floor && finite(floor.underlayRollPriceRub) && floor.underlayRollPriceRub <= MAX_PRICE_RUB, `Пол: underlayRollPriceRub не больше ${MAX_PRICE_RUB} руб.`);
  error(errors, floor && finite(floor.plinthPiecePriceRub) && floor.plinthPiecePriceRub <= MAX_PRICE_RUB, `Пол: plinthPiecePriceRub не больше ${MAX_PRICE_RUB} руб.`);
  error(errors, floor && finite(floor.expansionGapMm) && floor.expansionGapMm >= 0 && floor.expansionGapMm <= 100, "Пол: expansionGapMm должно быть от 0 до 100 мм.");
  error(errors, floor && finite(floor.kerfMm) && floor.kerfMm >= 0 && floor.kerfMm <= 20, "Пол: kerfMm должно быть от 0 до 20 мм.");
  error(errors, floor && finite(floor.reservePercent) && floor.reservePercent >= 0 && floor.reservePercent <= 100, "Пол: reservePercent должно быть от 0 до 100.");
  error(errors, floor && typeof floor.reuseOffcuts === "boolean", "Пол: reuseOffcuts должен быть true или false.");
  error(errors, floor && typeof floor.includeUnderlay === "boolean", "Пол: includeUnderlay должен быть true или false.");
  error(errors, floor && typeof floor.includePlinth === "boolean", "Пол: includePlinth должен быть true или false.");
}

export function validateProject(project: ConstructorProject): string[] {
  const errors: string[] = [];
  error(errors, project && project.schemaVersion === 5, "Поддерживается только schemaVersion 5; старые проекты открываются через миграцию.");
  error(errors, project && textWithin(project.id, MAX_STRING_ID_LENGTH), `Проект: id — непустая строка до ${MAX_STRING_ID_LENGTH} символов.`);
  error(errors, project && textWithin(project.name, MAX_NAME_LENGTH), `Проект: name — непустая строка до ${MAX_NAME_LENGTH} символов.`);
  error(errors, project && typeof project.createdAt === "string" && !Number.isNaN(Date.parse(project.createdAt)), "Проект: неверный createdAt.");
  error(errors, project && typeof project.updatedAt === "string" && !Number.isNaN(Date.parse(project.updatedAt)), "Проект: неверный updatedAt.");
  error(errors, project && Array.isArray(project.rooms) && project.rooms.length <= MAX_ROOMS, `Проект: не более ${MAX_ROOMS} комнат.`);
  if (!project || !Array.isArray(project.rooms)) return errors;
  let estimatedProjectPieces = 0;
  const roomIds = new Set<string>();
  project.rooms.forEach((room, index) => {
    const label = `Комната ${index + 1}`;
    error(errors, room && textWithin(room.id, MAX_STRING_ID_LENGTH), `${label}: id — непустая строка до ${MAX_STRING_ID_LENGTH} символов.`);
    error(errors, room && textWithin(room.name, MAX_NAME_LENGTH), `${label}: name — непустая строка до ${MAX_NAME_LENGTH} символов.`);
    if (room?.interior !== undefined) {
      const interior = room.interior;
      error(errors, interior !== null && typeof interior === "object" && !Array.isArray(interior)
        && (ROOM_TYPES as readonly unknown[]).includes(interior.type)
        && !("positions" in interior)
        && Array.isArray(interior.items) && interior.items.length <= MAX_FURNISHINGS_PER_ROOM
        && interior.items.every((item) => item !== null && typeof item === "object" && !Array.isArray(item)
          && typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id)
          && (ROOM_FURNISHINGS[interior.type] as readonly unknown[]).includes(item.kind))
        && new Set(interior.items.map((item) => item.id)).size === interior.items.length,
      `${label}: повреждены тип помещения или список предметов обстановки.`);
      if (interior && Array.isArray(interior.items)) for (const item of interior.items) {
        if (!item || typeof item !== "object") continue;
        if (item.dimensions !== undefined) {
          const dimensions = item.dimensions;
          error(errors, dimensions !== null && typeof dimensions === "object" && !Array.isArray(dimensions)
            && [dimensions.widthMm, dimensions.depthMm, dimensions.heightMm].every((value) => finite(value) && value >= MIN_FURNISHING_MM && value <= MAX_FURNISHING_MM),
          `${label}: габариты предмета должны быть от ${MIN_FURNISHING_MM} до ${MAX_FURNISHING_MM} мм.`);
        }
        if (item.position !== undefined) {
          const position = item.position;
          error(errors, position !== null && typeof position === "object" && !Array.isArray(position)
            && finite(position.xMm) && position.xMm >= 0 && position.xMm <= MAX_DIMENSION_MM
            && finite(position.yMm) && position.yMm >= 0 && position.yMm <= MAX_DIMENSION_MM
            && [0, 90, 180, 270].includes(position.rotationDeg),
          `${label}: повреждены координаты или поворот предметов обстановки.`);
        }
      }
    }
    if (room?.id && roomIds.has(room.id)) errors.push(`${label}: id комнаты ${room.id} повторяется.`);
    if (room?.id) roomIds.add(room.id);
    for (const [field, value] of Object.entries({ widthMm: room?.widthMm, lengthMm: room?.lengthMm, heightMm: room?.heightMm })) {
      const minimum = field === "heightMm" ? 500 : 300;
      const maximum = field === "heightMm" ? 6000 : MAX_DIMENSION_MM;
      error(errors, finite(value) && value >= minimum && value <= maximum, `${label}: ${field} должно быть в диапазоне ${minimum}–${maximum} мм.`);
    }
    error(errors, room && Array.isArray(room.openings) && room.openings.length <= MAX_OPENINGS_PER_ROOM, `${label}: не более ${MAX_OPENINGS_PER_ROOM} проёмов.`);
    if (room && Array.isArray(room.openings)) {
      const openingIds = new Set<string>();
      room.openings.forEach((opening, openingIndex) => {
        validateOpening(opening, openingIndex, errors);
        if (opening?.id && openingIds.has(opening.id)) errors.push(`${label}: id проёма ${opening.id} повторяется.`);
        if (opening?.id) openingIds.add(opening.id);
        const wallLength = opening?.wall === 0 || opening?.wall === 2 ? room.widthMm : room.lengthMm;
        if (positive(wallLength) && nonNegative(opening?.offsetMm) && positive(opening?.widthMm)) {
          error(errors, opening.offsetMm + opening.widthMm <= wallLength, `${label}: проём ${openingIndex + 1} выходит за границы стены.`);
        }
        if (positive(room.heightMm) && nonNegative(opening?.sillMm) && positive(opening?.heightMm)) {
          error(errors, opening.sillMm + opening.heightMm <= room.heightMm, `${label}: проём ${openingIndex + 1} выходит за высоту комнаты.`);
        }
        if (opening?.type === "door") error(errors, opening.sillMm === 0, `${label}: у двери sillMm должен быть 0.`);
      });
      for (let first = 0; first < room.openings.length; first++) for (let second = first + 1; second < room.openings.length; second++) {
        const a = room.openings[first]; const b = room.openings[second];
        if (a?.wall !== b?.wall || !nonNegative(a?.offsetMm) || !nonNegative(b?.offsetMm) || !positive(a?.widthMm) || !positive(b?.widthMm) || !nonNegative(a?.sillMm) || !nonNegative(b?.sillMm) || !positive(a?.heightMm) || !positive(b?.heightMm)) continue;
        const overlapAlongWall = a.offsetMm < b.offsetMm + b.widthMm && b.offsetMm < a.offsetMm + a.widthMm;
        const overlapVertically = a.sillMm < b.sillMm + b.heightMm && b.sillMm < a.sillMm + a.heightMm;
        error(errors, !(overlapAlongWall && overlapVertically), `${label}: проёмы ${first + 1} и ${second + 1} пересекаются.`);
      }
    }
    validateFloor(room?.floor, errors);
    if (room?.tileSupplies !== undefined) errors.push(...validateTileSupplies(room.tileSupplies));
    error(errors, room && Array.isArray(room.wallTiles) && room.wallTiles.length === 4, `${label}: нужны параметры отделки четырёх стен.`);
    error(errors, room && typeof room.continuousWallTiles === "boolean", `${label}: continuousWallTiles должен быть true или false.`);
    if (Array.isArray(room?.wallTiles) && room.wallTiles.length === 4) {
      room.wallTiles.forEach((spec, wall) => {
        if (spec === null) return;
        const tileErrors = validateWallTileSpec(spec, `${label}, стена ${wall + 1}`);
        errors.push(...tileErrors);
        if (!tileErrors.length) {
          const count = estimateWallTileCells(room, wall as 0 | 1 | 2 | 3);
          estimatedProjectPieces += count;
          error(errors, count <= MAX_CELLS_PER_WALL, `${label}, стена ${wall + 1}: раскладка превысит лимит ${MAX_CELLS_PER_WALL} плиток. Увеличьте формат или уменьшите стену.`);
        }
      });
      if (room.continuousWallTiles) {
        const keys = room.wallTiles.map((spec) => spec ? JSON.stringify([spec.tileWidthMm, spec.tileHeightMm, spec.orientation, spec.jointMm, spec.alignment, spec.decor, spec.materialKey]) : "");
        error(errors, !!keys[0] && keys.every((key) => key === keys[0]), `${label}: для продолжения рисунка через углы назначьте одинаковую плитку, формат, шов и старт на все четыре стены.`);
      }
    }
    if (room?.floor?.kind === "tile" && room.floor.tile && !validateFloorTileSpec(room.floor.tile).length) {
      const count = estimateFloorTileCells(room); estimatedProjectPieces += count;
      error(errors, room.widthMm > 2 * room.floor.tile.edgeGapMm && room.lengthMm > 2 * room.floor.tile.edgeGapMm, `${label}: зазор оставляет нулевую площадь плиточного пола.`);
      error(errors, count <= MAX_CELLS_PER_WALL, `${label}: плиточный пол превысит лимит ${MAX_CELLS_PER_WALL} плиток. Увеличьте формат или уменьшите комнату.`);
    } else if (room?.floor && room.floor.kind !== "tile" && positive(room.widthMm) && positive(room.lengthMm) && positive(room.floor.boardLengthMm) && positive(room.floor.boardWidthMm)) {
      const usableAlong = (room.floor.direction === "width" ? room.widthMm : room.lengthMm) - 2 * room.floor.expansionGapMm;
      const usableAcross = (room.floor.direction === "width" ? room.lengthMm : room.widthMm) - 2 * room.floor.expansionGapMm;
      const estimate = usableAlong > 0 && usableAcross > 0 ? Math.ceil(usableAcross / room.floor.boardWidthMm) * (Math.ceil(usableAlong / room.floor.boardLengthMm) + 2) : 0;
      estimatedProjectPieces += estimate;
      error(errors, usableAlong > 0 && usableAcross > 0, `${label}: зазор оставляет нулевую площадь укладки.`);
      error(errors, estimate <= MAX_PIECES_PER_ROOM, `${label}: раскладка превысит лимит ${MAX_PIECES_PER_ROOM} деталей.`);
    }
  });
  error(errors, estimatedProjectPieces <= MAX_PIECES_PER_PROJECT, `Проект: раскладка превысит общий лимит ${MAX_PIECES_PER_PROJECT} деталей.`);
  // Cell count alone does not bound clipping with many narrow openings. Check the
  // bounded geometry before accepting a file or producing any purchase quantities.
  if (!errors.length) project.rooms.forEach((room) => {
    if (!room.openings.length) return;
    ([0, 1, 2, 3] as const).forEach((wall) => {
      try { calculateWallTiles(room, wall); }
      catch (cause) { errors.push(`${room.name}, стена ${wall + 1}: ${cause instanceof Error ? cause.message : "Слишком сложная раскладка."} Увеличьте формат плитки или уменьшите число проёмов.`); }
    });
  });
  return errors;
}

type EndKind = "start" | "end";
interface PendingEnd { piece: BoardPiece; kind: EndKind; rowHeight: number; }

function m2(mm2: number): number { return mm2 / 1_000_000; }

function warningsFor(): string[] {
  return ["Торцевые остатки учтены консервативно: средние замковые детали и продольные полосы не используются повторно. Зазор и пропил взяты из параметров проекта; требования производителя к монтажу проверьте в инструкции покрытия."];
}

export function calculateRoom(room: ConstructorRoom): RoomCalculation {
  const errors = validateProject({ schemaVersion: 5, id: "room-check", name: "Проверка комнаты", createdAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z", rooms: [room] });
  if (errors.length > 0) throw new Error(errors.join(" "));

  const { floor } = room;
  const walls = ([0, 1, 2, 3] as const).flatMap((wall) => { const calculated = calculateWallTiles(room, wall); return calculated ? [calculated] : []; });
  const supplyWarnings = (["adhesive", "grout"] as const).flatMap((kind) => room.tileSupplies?.[kind]?.consumptionKgM2 === 0
    ? [`${kind === "adhesive" ? "Клей" : "Затирка"}: укажите расход выбранного товара в кг/м². До этого смесь не добавляется в закупку.`] : []);
  if (floor.kind === "tile") {
    const floorTiles = calculateFloorTiles(room);
    const perimeterMm = 2 * (room.widthMm + room.lengthMm);
    const doorWidth = room.openings.filter((opening) => opening.type === "door").reduce((sum, opening) => sum + opening.widthMm, 0);
    return { roomId: room.id, areaM2: m2(room.widthMm * room.lengthMm), coveredAreaM2: floorTiles.coveredAreaM2,
      perimeterMm, plinthNeededMm: Math.max(0, perimeterMm - doorWidth), pieces: [], sourceBoards: [], baseBoards: 0,
      reserveBoards: 0, neededBoards: 0, offcutAreaM2: 0, kerfAreaM2: 0, floorTiles, walls, warnings: [...floorTiles.warnings, ...supplyWarnings] };
  }
  const along = floor.direction === "width" ? room.widthMm : room.lengthMm;
  const across = floor.direction === "width" ? room.lengthMm : room.widthMm;
  const usableAlong = along - 2 * floor.expansionGapMm;
  const usableAcross = across - 2 * floor.expansionGapMm;
  const rowCount = Math.ceil(usableAcross / floor.boardWidthMm);
  const pieces: BoardPiece[] = [];
  const pending: PendingEnd[] = [];
  let pieceNumber = 0;
  const addPiece = (row: number, logicalX: number, logicalY: number, length: number, rowHeight: number, end?: EndKind): void => {
    const xMm = floor.direction === "width" ? floor.expansionGapMm + logicalX : floor.expansionGapMm + logicalY;
    const yMm = floor.direction === "width" ? floor.expansionGapMm + logicalY : floor.expansionGapMm + logicalX;
    const piece: BoardPiece = {
      id: `${room.id}-piece-${pieceNumber++}`, row, xMm, yMm,
      widthMm: floor.direction === "width" ? length : rowHeight,
      heightMm: floor.direction === "width" ? rowHeight : length,
      sourceBoardId: "", sourceStartMm: 0, sourceLengthMm: length, sourceWidthMm: rowHeight,
      end: end ?? (Math.abs(rowHeight - floor.boardWidthMm) > EPSILON ? "single" : "whole"),
      isCut: Math.abs(length - floor.boardLengthMm) > EPSILON || Math.abs(rowHeight - floor.boardWidthMm) > EPSILON,
    };
    pieces.push(piece);
    if (end) pending.push({ piece, kind: end, rowHeight });
  };

  for (let row = 0; row < rowCount; row++) {
    const logicalY = row * floor.boardWidthMm;
    const rowHeight = Math.min(floor.boardWidthMm, usableAcross - logicalY);
    const fraction = floor.pattern === "half" ? (row % 2) / 2 : (row % 3) / 3;
    const lead = Math.min(usableAlong, fraction * floor.boardLengthMm);
    let x = 0;
    if (lead > EPSILON) { addPiece(row, x, logicalY, lead, rowHeight, "start"); x += lead; }
    while (x < usableAlong - EPSILON) {
      const length = Math.min(floor.boardLengthMm, usableAlong - x);
      const isFinal = x + length >= usableAlong - EPSILON;
      addPiece(row, x, logicalY, length, rowHeight, isFinal && length < floor.boardLengthMm - EPSILON ? "end" : undefined);
      x += length;
    }
  }

  const sources: SourceBoard[] = [];
  const sourceFor = (entries: PendingEnd[], cutEnds: boolean): void => {
    const source: SourceBoard = { id: `${room.id}-board-${sources.length + 1}`, pieceIds: entries.map((entry) => entry.piece.id), residualLengthMm: 0, offcuts: [], kerfAreaM2: 0 };
    entries.forEach((entry) => {
      const length = floor.direction === "width" ? entry.piece.widthMm : entry.piece.heightMm;
      entry.piece.sourceBoardId = source.id;
      entry.piece.sourceLengthMm = length;
      entry.piece.sourceWidthMm = entry.rowHeight;
      entry.piece.end = cutEnds ? entry.kind : entry.piece.end;
      entry.piece.sourceStartMm = cutEnds && entry.kind === "start" ? floor.boardLengthMm - length : 0;
    });
    const rowHeight = entries[0].rowHeight;
    const usedLength = entries.reduce((sum, entry) => sum + (floor.direction === "width" ? entry.piece.widthMm : entry.piece.heightMm), 0);
    const requestedCrossKerf = cutEnds ? entries.length * floor.kerfMm : 0;
    const availableCrossCut = Math.max(0, floor.boardLengthMm - usedLength);
    // Полотно сохраняет заданную ширину, но материал теряется лишь в части
    // полосы реза, которая пересекается с заготовкой у её края.
    const effectiveCrossKerf = Math.min(requestedCrossKerf, availableCrossCut);
    const remainingWidth = Math.max(0, floor.boardWidthMm - rowHeight);
    const effectiveLongitudinalKerf = Math.min(floor.kerfMm, remainingWidth);
    const longitudinalKerf = effectiveLongitudinalKerf * floor.boardLengthMm;
    const crossKerf = effectiveCrossKerf * rowHeight;
    source.kerfAreaM2 = m2(longitudinalKerf + crossKerf);
    const remainingLength = Math.max(0, floor.boardLengthMm - usedLength - effectiveCrossKerf);
    source.residualLengthMm = remainingLength;
    if (remainingLength > EPSILON) source.offcuts.push({ lengthMm: remainingLength, widthMm: rowHeight, areaM2: m2(remainingLength * rowHeight), reason: "торцевой остаток; не используется как средняя замковая деталь" });
    if (rowHeight < floor.boardWidthMm - EPSILON) source.offcuts.push({ lengthMm: floor.boardLengthMm, widthMm: Math.max(0, remainingWidth - effectiveLongitudinalKerf), areaM2: m2(floor.boardLengthMm * Math.max(0, remainingWidth - effectiveLongitudinalKerf)), reason: "продольная полоса; повторно не используется" });
    sources.push(source);
  };

  // Целые доски и продольно подрезанные полные детали не делят с другими деталями.
  const pendingPieceIds = new Set(pending.map((entry) => entry.piece.id));
  for (const piece of pieces.filter((item) => !pendingPieceIds.has(item.id))) sourceFor([{ piece, kind: "start", rowHeight: floor.direction === "width" ? piece.heightMm : piece.widthMm }], false);

  const byHeight = new Map<number, PendingEnd[]>();
  pending.forEach((entry) => byHeight.set(entry.rowHeight, [...(byHeight.get(entry.rowHeight) ?? []), entry]));
  for (const entries of byHeight.values()) {
    const starts = entries.filter((entry) => entry.kind === "start").sort((a, b) => (floor.direction === "width" ? a.piece.widthMm : a.piece.heightMm) - (floor.direction === "width" ? b.piece.widthMm : b.piece.heightMm));
    const ends = entries.filter((entry) => entry.kind === "end");
    for (const start of starts) {
      let best = -1;
      let bestLength = -Infinity;
      const startLength = floor.direction === "width" ? start.piece.widthMm : start.piece.heightMm;
      for (let i = 0; i < ends.length; i++) {
        const endLength = floor.direction === "width" ? ends[i].piece.widthMm : ends[i].piece.heightMm;
        if (startLength + endLength + 2 * floor.kerfMm <= floor.boardLengthMm + EPSILON && endLength > bestLength) { best = i; bestLength = endLength; }
      }
      if (floor.reuseOffcuts && best >= 0) sourceFor([start, ends.splice(best, 1)[0]], true);
      else sourceFor([start], true);
    }
    ends.forEach((end) => sourceFor([end], true));
  }

  const offcutAreaM2 = sources.flatMap((source) => source.offcuts).reduce((sum, cut) => sum + cut.areaM2, 0);
  const kerfAreaM2 = sources.reduce((sum, source) => sum + source.kerfAreaM2, 0);
  const areaM2 = m2(room.widthMm * room.lengthMm);
  const coveredAreaM2 = m2(usableAlong * usableAcross);
  const perimeterMm = 2 * (room.widthMm + room.lengthMm);
  const doorWidthMm = room.openings.filter((opening) => opening.type === "door").reduce((sum, opening) => sum + opening.widthMm, 0);
  const baseBoards = sources.length;
  const reserveBoards = baseBoards * floor.reservePercent / 100;
  const warnings = warningsFor();
  if (pending.length > 0) warnings.push("В раскладке есть подрезанные крайние детали. Их допустимую длину и смещение стыков проверьте по инструкции выбранной коллекции.");
  if (pieces.some((piece) => piece.sourceWidthMm < floor.boardWidthMm - EPSILON)) warnings.push("В раскладке есть узкий крайний ряд; продольная полоса от него не используется повторно.");
  if (!floor.reuseOffcuts) warnings.push("Повторное использование противоположных торцевых деталей отключено параметром проекта.");
  return {
    roomId: room.id, areaM2, coveredAreaM2, perimeterMm, plinthNeededMm: Math.max(0, perimeterMm - doorWidthMm), pieces, sourceBoards: sources,
    baseBoards, reserveBoards, neededBoards: baseBoards + reserveBoards, offcutAreaM2, kerfAreaM2,
    walls, warnings: [...warnings, ...supplyWarnings],
  };
}

interface Group { rooms: ConstructorRoom[]; calculations: RoomCalculation[]; }
const grouped = (rooms: ConstructorRoom[], calculations: RoomCalculation[], key: (room: ConstructorRoom) => string): Group[] => {
  const groups = new Map<string, Group>();
  rooms.forEach((room, index) => { const groupKey = key(room); const group = groups.get(groupKey) ?? { rooms: [], calculations: [] }; group.rooms.push(room); group.calculations.push(calculations[index]); groups.set(groupKey, group); });
  return [...groups.values()];
};
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function groupPrice(rooms: ConstructorRoom[], field: "packPriceRub" | "underlayRollPriceRub" | "plinthPiecePriceRub", unit: string) {
  const prices = rooms.map((room) => room.floor[field]); const price = Math.max(...prices);
  const missing = prices.some((value) => value === 0);
  const note = price === 0
    ? "Цена не задана; стоимость этой позиции не включена в сумму."
    : new Set(prices).size > 1
    ? `${missing ? "В части помещений цена не задана. " : ""}Цены в помещениях отличаются; для оценки общей закупки использована максимальная введённая цена ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price)} ₽/${unit}.`
    : "";
  return { price, note };
}

/** Decimal percentages are rounded once, without a tolerance that could erase a real reserve. */
function ceilTileReserve(surfaces: Array<{ baseTiles: number; reservePercent: number }>): number {
  const parts = surfaces.map(({ baseTiles, reservePercent }) => {
    const [decimal, exponent = "0"] = String(reservePercent).split("e");
    const fractionDigits = decimal.split(".")[1]?.length ?? 0;
    return { numerator: BigInt(decimal.replace(".", "")) * BigInt(baseTiles), scale: fractionDigits - Number(exponent) };
  });
  const scale = Math.max(0, ...parts.map((part) => part.scale));
  const maxPower = Math.max(scale, ...parts.map((part) => scale - part.scale));
  const powers = [BigInt(1)];
  for (let index = 1; index <= maxPower; index++) powers.push(powers[index - 1] * BigInt(10));
  const denominator = BigInt(100) * powers[scale];
  const numerator = parts.reduce((sum, part) => sum + part.numerator * powers[scale - part.scale], BigInt(0));
  return Number((numerator + denominator - BigInt(1)) / denominator);
}

export function calculateProject(project: ConstructorProject): ProjectCalculation {
  const validationErrors = validateProject(project);
  if (validationErrors.length > 0) throw new Error(validationErrors.join(" "));
  const rooms = project.rooms.map(calculateRoom);
  const purchases: PurchaseLine[] = [];
  let number = 0;
  const add = (line: Omit<PurchaseLine, "id">) => {
    if (!Number.isFinite(line.quantity) || !Number.isInteger(line.quantity) || line.quantity < 0 || !Number.isFinite(line.unitPriceRub) || !Number.isFinite(line.totalPriceRub) || (line.purchasedAreaM2 !== undefined && !Number.isFinite(line.purchasedAreaM2))) {
      throw new Error(`Некорректная закупка: ${line.name}.`);
    }
    purchases.push({ id: `purchase-${++number}`, ...line });
  };
  type Surface = { room: ConstructorRoom; spec: WallTileSpec; calculated: FloorTileCalculation; wall?: 0 | 1 | 2 | 3 };
  const tileGroups = new Map<string, Surface[]>();
  rooms.forEach((calculated, index) => {
    const room = project.rooms[index];
    const surfaces: Surface[] = calculated.walls.map((wall) => ({ room, spec: room.wallTiles[wall.wall]!, calculated: wall, wall: wall.wall }));
    if (calculated.floorTiles) surfaces.push({ room, spec: room.floor.tile!, calculated: calculated.floorTiles });
    surfaces.forEach((surface) => {
    const { spec, calculated: tile } = surface; if (!tile.baseTiles) return;
    const key = JSON.stringify([spec.materialKey, spec.decor, spec.tileWidthMm, spec.tileHeightMm, spec.tilesPerPack]);
    const group = tileGroups.get(key) ?? []; group.push(surface); tileGroups.set(key, group);
  }); });
  tileGroups.forEach((group) => {
    const spec = group[0].spec;
    const baseTiles = group.reduce((sum, { calculated }) => sum + calculated.baseTiles, 0);
    const reserveTiles = group.reduce((sum, { calculated }) => sum + calculated.reserveTiles, 0);
    const roundedTiles = baseTiles + ceilTileReserve(group.map(({ spec, calculated }) => ({ baseTiles: calculated.baseTiles, reservePercent: spec.reservePercent })));
    const packs = Math.ceil(roundedTiles / spec.tilesPerPack);
    const purchasedTiles = packs * spec.tilesPerPack;
    const prices = group.map(({ spec }) => spec.packPriceRub);
    const price = Math.max(...prices);
    const priceNote = price === 0 ? "Цена не задана; стоимость этой позиции не включена в сумму." : new Set(prices).size > 1 ? `${prices.some((value) => value === 0) ? "В части поверхностей цена не задана. " : ""}Цены поверхностей отличаются; для оценки общей закупки использована максимальная введённая цена ${new Intl.NumberFormat("ru-RU").format(price)} ₽/упак.` : undefined;
    const decorName = { limestone: "Бежевый камень", marble: "Белый мрамор", graphite: "Графит", microcement: "Микроцемент" }[spec.decor];
    const floorRoomIds = [...new Set(group.filter((surface) => surface.wall === undefined).map(({ room }) => room.id))];
    const hasWalls = group.some((surface) => surface.wall !== undefined);
    add({ kind: hasWalls ? "wall-tile" : "floor-tile", name: spec.materialKey === "Плитка" ? `Плитка для ${floorRoomIds.length ? hasWalls ? "пола и стен" : "пола" : "стен"}` : `Плитка · ${spec.materialKey}`, detail: `${decorName}, ${spec.tileWidthMm} × ${spec.tileHeightMm} мм, ${spec.tilesPerPack} шт./уп.`, unit: "упак.", quantity: packs,
      unitPriceRub: price, totalPriceRub: money(packs * price), priceNote,
      roomIds: [...new Set(group.map(({ room }) => room.id))], surfaces: group.flatMap(({ room, wall }) => wall === undefined ? [] : [{ roomId: room.id, wall }]), floorRoomIds,
      baseTiles, reserveTiles, roundedTiles, purchasedTiles, packSurplusTiles: purchasedTiles - roundedTiles,
      purchasedAreaM2: m2(purchasedTiles * spec.tileWidthMm * spec.tileHeightMm),
      basis: `${baseTiles} исходных плиток по раскладке + ${reserveTiles.toFixed(2).replace(".", ",")} плитки резерва; округлено после объединения поверхностей: ${roundedTiles} шт., ${packs} упак. (${purchasedTiles} шт.; избыток упаковки ${purchasedTiles - roundedTiles} шт.). Обрезки не используются повторно.${priceNote ? ` ${priceNote}` : ""}` });
  });
  const laminateRooms = project.rooms.filter((room) => room.floor.kind !== "tile");
  const laminateCalculations = rooms.filter((_, index) => project.rooms[index].floor.kind !== "tile");
  grouped(laminateRooms, laminateCalculations, (room) => JSON.stringify([room.floor.materialKey, room.floor.decor, room.floor.boardLengthMm, room.floor.boardWidthMm, room.floor.boardsPerPack]))
    .forEach(({ rooms: groupRooms, calculations }) => {
      const floor = groupRooms[0].floor;
      const base = calculations.reduce((sum, calculation) => sum + calculation.baseBoards, 0);
      const reserve = calculations.reduce((sum, calculation) => sum + calculation.reserveBoards, 0);
      const boards = Math.ceil(base + reserve - EPSILON);
      const packs = Math.ceil(boards / floor.boardsPerPack);
      const purchasedBoards = packs * floor.boardsPerPack;
      const purchasedAreaM2 = m2(purchasedBoards * floor.boardLengthMm * floor.boardWidthMm);
      const decorLabel: Record<FloorSpec["decor"], string> = { natural: "Натуральный", light: "Светлый", grey: "Серый", dark: "Тёмный дуб" };
      const materialName = floor.materialKey === "Ламинат" ? "Ламинат" : `Ламинат · ${floor.materialKey}`;
      const price = groupPrice(groupRooms, "packPriceRub", "упак.");
      add({ kind: "laminate", name: materialName, detail: `${decorLabel[floor.decor]}, ${floor.boardLengthMm}×${floor.boardWidthMm} мм, ${floor.boardsPerPack} шт./уп.`, unit: "упак.", quantity: packs, unitPriceRub: price.price, totalPriceRub: money(packs * price.price), priceNote: price.note || undefined, roomIds: groupRooms.map((room) => room.id), baseBoards: base, reserveBoards: reserve, roundedBoards: boards, purchasedBoards, packSurplusBoards: purchasedBoards - boards, purchasedAreaM2, basis: `${base} досок по раскрою + ${reserve.toFixed(2).replace(".", ",")} доски резерва; округлено один раз: ${boards} досок, затем ${packs} упак. (${purchasedBoards} досок; избыток упаковки ${purchasedBoards - boards} шт.).${price.note ? ` ${price.note}` : ""}` });
    });
  grouped(laminateRooms.filter((room) => room.floor.includeUnderlay), laminateCalculations.filter((_, index) => laminateRooms[index].floor.includeUnderlay), (room) => String(room.floor.underlayRollAreaM2))
    .forEach(({ rooms: groupRooms, calculations }) => { const floor = groupRooms[0].floor; const area = calculations.reduce((sum, calculation) => sum + calculation.coveredAreaM2, 0); const rolls = Math.ceil(area / floor.underlayRollAreaM2 - EPSILON); const price = groupPrice(groupRooms, "underlayRollPriceRub", "рул."); add({ name: "Подложка", detail: `рулон ${floor.underlayRollAreaM2} м²`, unit: "рул.", quantity: rolls, unitPriceRub: price.price, totalPriceRub: money(rolls * price.price), priceNote: price.note || undefined, roomIds: groupRooms.map((room) => room.id), basis: `${area.toFixed(3).replace(".", ",")} м² по площади покрытия; раскрой подложки не рассчитан, ${rolls} рул.${price.note ? ` ${price.note}` : ""}` }); });
  grouped(laminateRooms.filter((room) => room.floor.includePlinth), laminateCalculations.filter((_, index) => laminateRooms[index].floor.includePlinth), (room) => String(room.floor.plinthLengthMm))
    .forEach(({ rooms: groupRooms, calculations }) => { const floor = groupRooms[0].floor; const length = calculations.reduce((sum, calculation) => sum + calculation.plinthNeededMm, 0); const pieces = Math.ceil(length / floor.plinthLengthMm - EPSILON); const price = groupPrice(groupRooms, "plinthPiecePriceRub", "шт."); add({ name: "Плинтус", detail: `планка ${floor.plinthLengthMm} мм`, unit: "шт.", quantity: pieces, unitPriceRub: price.price, totalPriceRub: money(pieces * price.price), priceNote: price.note || undefined, roomIds: groupRooms.map((room) => room.id), basis: `${length} мм по суммарной длине; раскрой планок не рассчитан, округлено до ${pieces} целых планок.${price.note ? ` ${price.note}` : ""}` }); });
  calculateTileSupplies(project.rooms, rooms).forEach(add);
  return { rooms, purchases, totalCostRub: money(purchases.reduce((sum, line) => sum + line.totalPriceRub, 0)) };
}
