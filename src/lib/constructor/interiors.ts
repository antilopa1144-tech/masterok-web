import { createRoom, createFloorTileSpec, ROOM_FURNISHINGS, MAX_FURNISHINGS_PER_ROOM, type ConstructorRoom, type FurnishingKind, type FurnishingInstance, type FurnishingDimensions, type FurnishingPosition, type RoomInterior, type RoomType, type Wall } from "./core";

export interface InteriorPreset {
  type: RoomType; name: string; description: string; widthMm: number; lengthMm: number;
  items: readonly FurnishingKind[]; optionalItems?: readonly FurnishingKind[];
}

/** Стартовые примеры, не строительные нормы и не рекомендуемые минимальные размеры. */
export const INTERIOR_PRESETS: readonly InteriorPreset[] = [
  { type: "living", name: "Гостиная", description: "Диван, журнальный стол и растение", widthMm: 3000, lengthMm: 4000, items: ROOM_FURNISHINGS.living },
  { type: "bathroom", name: "Ванная", description: "Ванна, стиралка, раковина и унитаз", widthMm: 2500, lengthMm: 2800, items: ROOM_FURNISHINGS.bathroom.filter((item) => item !== "shower"), optionalItems: ["shower"] },
  { type: "kitchen", name: "Кухня", description: "Гарнитур, холодильник и обеденный стол", widthMm: 3200, lengthMm: 4000, items: ROOM_FURNISHINGS.kitchen },
  { type: "bedroom", name: "Спальня", description: "Кровать, тумба и шкаф", widthMm: 3200, lengthMm: 4000, items: ROOM_FURNISHINGS.bedroom },
  { type: "office", name: "Кабинет", description: "Рабочий стол, кресло и шкаф", widthMm: 3000, lengthMm: 3500, items: ROOM_FURNISHINGS.office },
  { type: "hallway", name: "Прихожая", description: "Шкаф и консоль с зеркалом", widthMm: 2000, lengthMm: 3000, items: ROOM_FURNISHINGS.hallway },
  { type: "empty", name: "Без обстановки", description: "Только помещение и отделка", widthMm: 3000, lengthMm: 4000, items: ROOM_FURNISHINGS.empty },
];

interface FurnishingSpec {
  name: string; widthMm: number; depthMm: number; heightMm: number;
  walls: readonly Wall[]; preferred: number;
}

/** Габариты условных моделей для масштаба; пользователь выбирает реальные товары отдельно. */
export const FURNISHINGS: Record<FurnishingKind, FurnishingSpec> = {
  sofa: { name: "Диван", widthMm: 2050, depthMm: 880, heightMm: 790, walls: [1, 3, 2, 0], preferred: .55 },
  "coffee-table": { name: "Журнальный стол", widthMm: 940, depthMm: 660, heightMm: 440, walls: [], preferred: .5 },
  plant: { name: "Растение", widthMm: 420, depthMm: 420, heightMm: 1100, walls: [0, 3, 1, 2], preferred: .88 },
  bathtub: { name: "Ванна", widthMm: 1700, depthMm: 760, heightMm: 800, walls: [3, 0, 1, 2], preferred: .5 },
  shower: { name: "Душ", widthMm: 900, depthMm: 900, heightMm: 2100, walls: [3, 0, 1, 2], preferred: .15 },
  washer: { name: "Стиральная машина", widthMm: 600, depthMm: 700, heightMm: 870, walls: [0, 1, 2, 3], preferred: .82 },
  vanity: { name: "Раковина с зеркалом", widthMm: 700, depthMm: 540, heightMm: 1950, walls: [0, 1, 2, 3], preferred: .46 },
  toilet: { name: "Унитаз", widthMm: 400, depthMm: 690, heightMm: 850, walls: [1, 2, 0, 3], preferred: .7 },
  "towel-rail": { name: "Полотенцесушитель", widthMm: 500, depthMm: 160, heightMm: 1700, walls: [0, 3, 1, 2], preferred: .22 },
  "kitchen-unit": { name: "Кухонный гарнитур", widthMm: 2400, depthMm: 680, heightMm: 2180, walls: [0, 3, 1, 2], preferred: .43 },
  fridge: { name: "Холодильник", widthMm: 640, depthMm: 700, heightMm: 1880, walls: [0, 3, 1, 2], preferred: .9 },
  "dining-table": { name: "Обеденный стол со стульями", widthMm: 1400, depthMm: 1400, heightMm: 860, walls: [], preferred: .5 },
  bed: { name: "Кровать", widthMm: 1720, depthMm: 2180, heightMm: 1050, walls: [0, 3, 1, 2], preferred: .5 },
  nightstand: { name: "Прикроватная тумба", widthMm: 450, depthMm: 450, heightMm: 580, walls: [0, 3, 1, 2], preferred: .87 },
  wardrobe: { name: "Шкаф", widthMm: 1200, depthMm: 580, heightMm: 2150, walls: [3, 1, 2, 0], preferred: .76 },
  desk: { name: "Рабочий стол", widthMm: 1350, depthMm: 660, heightMm: 1250, walls: [0, 3, 1, 2], preferred: .46 },
  "office-chair": { name: "Рабочее кресло", widthMm: 640, depthMm: 640, heightMm: 1150, walls: [], preferred: .5 },
  console: { name: "Консоль с зеркалом", widthMm: 900, depthMm: 340, heightMm: 1900, walls: [3, 0, 1, 2], preferred: .5 },
};

export function presetFor(type: RoomType): InteriorPreset { return INTERIOR_PRESETS.find((preset) => preset.type === type)!; }
export function defaultInterior(type: RoomType): RoomInterior { return { type, items: presetFor(type).items.map((kind) => ({ id: kind, kind })) }; }
export function interiorFor(room: ConstructorRoom): RoomInterior { return room.interior ?? defaultInterior("living"); }

export function dimensionsFor(item: FurnishingInstance): FurnishingDimensions {
  const dimensions = item.dimensions ?? FURNISHINGS[item.kind];
  return { widthMm: dimensions.widthMm, depthMm: dimensions.depthMm, heightMm: dimensions.heightMm };
}
export function furnishingName(room: ConstructorRoom, id: string, shortName?: string): string {
  const items = interiorFor(room).items, item = items.find((value) => value.id === id);
  if (!item) return "Предмет";
  const same = items.filter((value) => value.kind === item.kind);
  return `${shortName ?? FURNISHINGS[item.kind].name}${same.length > 1 ? ` ${same.findIndex((value) => value.id === id) + 1}` : ""}`;
}

export function createInteriorRoom(type: RoomType, existingNames: readonly string[]): ConstructorRoom {
  const preset = presetFor(type); const title = type === "empty" ? "Комната" : preset.name;
  let name = title; let index = 2;
  while (existingNames.includes(name)) name = `${title} ${index++}`;
  const room = { ...createRoom(name), widthMm: preset.widthMm, lengthMm: preset.lengthMm, interior: defaultInterior(type) };
  if (type === "bathroom") room.floor = { ...room.floor, kind: "tile", tile: createFloorTileSpec() };
  return room;
}

export interface FurnishingPlacement {
  id: string; kind: FurnishingKind; dimensions: FurnishingDimensions; wall?: Wall; rotation: number;
  centerXmm: number; centerYmm: number;
  xMm: number; yMm: number; widthMm: number; depthMm: number;
}
export interface FurnishingLayout { placements: FurnishingPlacement[]; omitted: string[] }

export function positionForPlacement(item: FurnishingPlacement): FurnishingPosition {
  return { xMm: Math.round(item.xMm * 1e6) / 1e6, yMm: Math.round(item.yMm * 1e6) / 1e6, rotationDeg: ((Math.round(item.rotation * 180 / Math.PI) % 360 + 360) % 360) as FurnishingPosition["rotationDeg"] };
}

export function placementForPosition(item: FurnishingInstance, position: FurnishingPosition): FurnishingPlacement {
  const spec = dimensionsFor(item), rotated = position.rotationDeg === 90 || position.rotationDeg === 270;
  const widthMm = rotated ? spec.depthMm : spec.widthMm, depthMm = rotated ? spec.widthMm : spec.depthMm;
  return { id: item.id, kind: item.kind, dimensions: spec, rotation: position.rotationDeg * Math.PI / 180, xMm: position.xMm, yMm: position.yMm,
    widthMm, depthMm, centerXmm: position.xMm + widthMm / 2, centerYmm: position.yMm + depthMm / 2 };
}

/** Ограничение жеста границами комнаты. Сохранённые позиции при изменении размеров не сдвигаем. */
export function clampFurnishingPosition(room: ConstructorRoom, id: string, position: FurnishingPosition): FurnishingPosition {
  const instance = interiorFor(room).items.find((item) => item.id === id);
  if (!instance) return position;
  const item = placementForPosition(instance, position);
  return { ...position, xMm: Math.max(0, Math.min(position.xMm, room.widthMm - item.widthMm)), yMm: Math.max(0, Math.min(position.yMm, room.lengthMm - item.depthMm)) };
}

/** Поворот вокруг центра; у края комнаты предмет сдвигается ровно настолько, чтобы остаться внутри. */
export function rotatedFurnishingPosition(room: ConstructorRoom, item: FurnishingPlacement): FurnishingPosition {
  const position = { ...positionForPlacement(item), rotationDeg: ((positionForPlacement(item).rotationDeg + 90) % 360) as FurnishingPosition["rotationDeg"] };
  const instance = interiorFor(room).items.find((value) => value.id === item.id)!;
  const next = placementForPosition(instance, position);
  return clampFurnishingPosition(room, item.id, { ...position, xMm: item.centerXmm - next.widthMm / 2, yMm: item.centerYmm - next.depthMm / 2 });
}

/** Первое ручное действие фиксирует видимую расстановку, чтобы соседние предметы не прыгали при перетаскивании. */
export function frozenInterior(room: ConstructorRoom): RoomInterior {
  const interior = interiorFor(room);
  const placed = new Map(layoutFurnishings(room).placements.map((item) => [item.id, item]));
  return { ...interior, items: interior.items.map((item) => item.position || !placed.has(item.id) ? { ...item } : { ...item, position: positionForPlacement(placed.get(item.id)!) }) };
}
export function interiorWithPosition(room: ConstructorRoom, id: string, position: FurnishingPosition): RoomInterior {
  if (!interiorFor(room).items.some((item) => item.id === id)) return interiorFor(room);
  const interior = frozenInterior(room);
  return { ...interior, items: interior.items.map((item) => item.id === id ? { ...item, position: { ...position } } : item) };
}
/** Сохранённый угол и левый верхний угол габарита остаются на месте; слишком большой предмет не ужимаем. */
export function interiorWithDimensions(room: ConstructorRoom, id: string, dimensions?: FurnishingDimensions): RoomInterior {
  const interior = frozenInterior(room);
  return { ...interior, items: interior.items.map((item) => {
    if (item.id !== id) return item;
    const next = { ...item }; if (dimensions) next.dimensions = { ...dimensions }; else delete next.dimensions;
    return next;
  }) };
}
/** Соседи остаются на местах, новый экземпляр ищет свободное место автоматически. */
export function interiorWithAddedItem(room: ConstructorRoom, item: FurnishingInstance): RoomInterior {
  const interior = interiorFor(room);
  if (interior.items.length >= MAX_FURNISHINGS_PER_ROOM || interior.items.some((value) => value.id === item.id) || !ROOM_FURNISHINGS[interior.type].includes(item.kind)) return interior;
  const frozen = frozenInterior(room);
  return { ...frozen, items: [...frozen.items, structuredClone(item)] };
}
export function interiorWithoutItem(room: ConstructorRoom, id: string): RoomInterior {
  const interior = frozenInterior(room);
  return { ...interior, items: interior.items.filter((item) => item.id !== id) };
}

const EDGE_MM = 100;
const ITEM_GAP_MM = 70;
const OPENING_GAP_MM = 140;
const DOOR_DEPTH_MM = 850;
type Rect = Pick<FurnishingPlacement, "xMm" | "yMm" | "widthMm" | "depthMm">;
function intersects(a: Rect, b: Rect, gap = 0) {
  return a.xMm < b.xMm + b.widthMm + gap && a.xMm + a.widthMm + gap > b.xMm
    && a.yMm < b.yMm + b.depthMm + gap && a.yMm + a.depthMm + gap > b.yMm;
}
function wallPlacement(room: ConstructorRoom, item: FurnishingInstance, wall: Wall, center: number): FurnishingPlacement {
  const spec = dimensionsFor(item); const inset = spec.depthMm / 2 + EDGE_MM;
  const centerXmm = wall === 0 ? center : wall === 1 ? room.widthMm - inset : wall === 2 ? room.widthMm - center : inset;
  const centerYmm = wall === 0 ? inset : wall === 1 ? center : wall === 2 ? room.lengthMm - inset : room.lengthMm - center;
  const widthMm = wall % 2 ? spec.depthMm : spec.widthMm;
  const depthMm = wall % 2 ? spec.widthMm : spec.depthMm;
  return { id: item.id, kind: item.kind, dimensions: spec, wall, rotation: [Math.PI, Math.PI / 2, 0, -Math.PI / 2][wall], centerXmm, centerYmm, widthMm, depthMm, xMm: centerXmm - widthMm / 2, yMm: centerYmm - depthMm / 2 };
}
function openingRects(room: ConstructorRoom): Rect[] {
  return room.openings.map((opening) => {
    const depth = opening.type === "door" ? DOOR_DEPTH_MM : OPENING_GAP_MM + EDGE_MM;
    const along = opening.widthMm + OPENING_GAP_MM * 2; const offset = opening.offsetMm - OPENING_GAP_MM;
    if (opening.wall === 0) return { xMm: offset, yMm: 0, widthMm: along, depthMm: depth };
    if (opening.wall === 1) return { xMm: room.widthMm - depth, yMm: offset, widthMm: depth, depthMm: along };
    if (opening.wall === 2) return { xMm: room.widthMm - offset - along, yMm: room.lengthMm - depth, widthMm: along, depthMm: depth };
    return { xMm: 0, yMm: room.lengthMm - offset - along, widthMm: depth, depthMm: along };
  });
}

/** Ручные позиции сохраняем; оставшиеся образцы размещаем без пересечений и масштабирования моделей. */
export function layoutFurnishings(room: ConstructorRoom): FurnishingLayout {
  const placements: FurnishingPlacement[] = []; const omitted: string[] = []; const openings = openingRects(room);
  const interior = interiorFor(room);
  const allowed = [...presetFor(interior.type).items, ...(presetFor(interior.type).optionalItems ?? [])];
  const items = allowed.flatMap((kind) => interior.items.filter((item) => item.kind === kind));
  for (const item of items) if (item.position) placements.push(placementForPosition(item, item.position));
  const fits = (item: FurnishingPlacement) => item.xMm >= EDGE_MM - .001 && item.yMm >= EDGE_MM - .001
    && item.xMm + item.widthMm <= room.widthMm - EDGE_MM + .001 && item.yMm + item.depthMm <= room.lengthMm - EDGE_MM + .001
    && !openings.some((opening) => intersects(item, opening)) && !placements.some((other) => intersects(item, other, ITEM_GAP_MM));
  for (const item of items) {
    if (item.position) continue;
    const kind = item.kind, dimensions = dimensionsFor(item), spec = { ...FURNISHINGS[kind], ...dimensions }; let placement: FurnishingPlacement | undefined;
    if (room.heightMm >= spec.heightMm + 30) {
      for (const wall of spec.walls) {
        const length = wall % 2 ? room.lengthMm : room.widthMm;
        const minimum = EDGE_MM + spec.widthMm / 2, maximum = length - minimum;
        if (minimum > maximum) continue;
        const target = Math.max(minimum, Math.min(maximum, length * spec.preferred));
        const centers = [target, minimum, maximum];
        // Проверяем границы свободных промежутков: шаг сетки сам по себе пропускает узкие допустимые места.
        for (const other of [...placements, ...openings]) {
          let from = wall % 2 ? other.yMm : other.xMm;
          let to = from + (wall % 2 ? other.depthMm : other.widthMm);
          if (wall >= 2) { const oldFrom = from; from = length - to; to = length - oldFrom; }
          centers.push(from - ITEM_GAP_MM - spec.widthMm / 2, to + ITEM_GAP_MM + spec.widthMm / 2);
        }
        for (let center = minimum; center <= maximum; center += 100) centers.push(center);
        centers.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
        placement = centers.filter((center) => center >= minimum && center <= maximum).map((center) => wallPlacement(room, item, wall, center)).find(fits);
        if (placement) break;
      }
      if (!spec.walls.length) {
        const related = placements.find((item) => item.kind === (kind === "coffee-table" ? "sofa" : "desk"));
        const centers: Array<[number, number]> = [];
        if (related && related.wall !== undefined && kind !== "dining-table") {
          const distance = (related.dimensions.depthMm + spec.depthMm) / 2 + (kind === "coffee-table" ? 280 : 180);
          const dx = related.wall === 1 ? -distance : related.wall === 3 ? distance : 0;
          const dy = related.wall === 0 ? distance : related.wall === 2 ? -distance : 0;
          centers.push([related.centerXmm + dx, related.centerYmm + dy]);
        }
        for (const y of [.5, .68, .35, .8, .2]) for (const x of [.5, .7, .3, .8, .2]) centers.push([room.widthMm * x, room.lengthMm * y]);
        const rotation = (related?.rotation ?? 0) + (kind === "office-chair" && related ? Math.PI : 0);
        const rotated = Math.abs(Math.sin(rotation)) > .5;
        const widthMm = rotated ? spec.depthMm : spec.widthMm, depthMm = rotated ? spec.widthMm : spec.depthMm;
        placement = centers.map(([centerXmm, centerYmm]) => ({ id: item.id, kind, dimensions, rotation, centerXmm, centerYmm, widthMm, depthMm, xMm: centerXmm - widthMm / 2, yMm: centerYmm - depthMm / 2 })).find(fits);
      }
    }
    if (placement) placements.push(placement); else omitted.push(item.id);
  }
  return { placements, omitted };
}

export interface FurnishingIssue { id: string; kind: FurnishingKind; code: "overlap" | "opening" | "bounds" | "height"; message: string }
/** Подсказки относятся к габаритам образцов и условным зонам авторасстановки, а не к монтажным нормативам. */
export function furnishingIssues(room: ConstructorRoom, layout = layoutFurnishings(room)): FurnishingIssue[] {
  const issues: FurnishingIssue[] = [], openings = openingRects(room);
  for (const item of layout.placements) {
    const name = furnishingName(room, item.id), reference = { id: item.id, kind: item.kind };
    if (item.xMm < 0 || item.yMm < 0 || item.xMm + item.widthMm > room.widthMm + .001 || item.yMm + item.depthMm > room.lengthMm + .001) {
      issues.push({ ...reference, code: "bounds", message: `${name}: габарит выходит за пределы комнаты. Измените координаты, габариты или поверните предмет.` });
    }
    if (item.dimensions.heightMm > room.heightMm) issues.push({ ...reference, code: "height", message: `${name}: модель выше потолка. Проверьте высоту предмета или комнаты.` });
    for (let index = 0; index < openings.length; index++) if (intersects(item, openings[index])) {
      const opening = room.openings[index];
      issues.push({ ...reference, code: "opening", message: `${name}: в условной зоне ${opening.type === "door" ? "двери" : "окна"} на стене ${opening.wall + 1}. Проверьте свободное место у проёма.` });
    }
    for (const other of layout.placements) if (item !== other && intersects(item, other)) {
      issues.push({ ...reference, code: "overlap", message: `${name}: пересекается с предметом «${furnishingName(room, other.id)}». Передвиньте один из предметов.` });
    }
  }
  return issues;
}
