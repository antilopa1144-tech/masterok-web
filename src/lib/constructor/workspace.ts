import { createDefaultProject, ROOM_FURNISHINGS, ROOM_TYPES, validateProject, type ConstructorProject, type ConstructorRoom, type RoomType } from "./core";

export interface ConstructorVariant {
  id: string;
  name: string;
  rooms: ConstructorRoom[];
  savedAt: string;
}

export interface ConstructorWorkspace {
  format: "masterok-constructor";
  version: 5;
  project: ConstructorProject;
  variants: ConstructorVariant[];
}

export const MAX_PROJECT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_VARIANTS = 12;

export function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createWorkspace(): ConstructorWorkspace {
  return { format: "masterok-constructor", version: 5, project: createDefaultProject(), variants: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkProjectShape(value: unknown): asserts value is ConstructorProject {
  if (!isRecord(value) || value.schemaVersion !== 5 || !Array.isArray(value.rooms)) {
    throw new Error("Формат проекта не поддерживается. Нужен файл конструктора версии от 1 до 5.");
  }
  if (typeof value.id !== "string" || !value.id || value.id.length > 150
    || typeof value.name !== "string" || !value.name.trim() || value.name.length > 120
    || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))
    || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) {
    throw new Error("В файле повреждены название, идентификатор или дата проекта.");
  }
  for (const room of value.rooms) {
    if (!isRecord(room) || !isRecord(room.floor) || !Array.isArray(room.openings)
      || room.openings.some((opening: unknown) => !isRecord(opening))) {
      throw new Error("В файле повреждены помещения или параметры материалов.");
    }
  }
  const errors = validateProject(value as unknown as ConstructorProject);
  if (errors.length) throw new Error(errors.join(" "));
}

/** Decode a data file only; neither imported HTML nor code is ever executed. */
export function parseWorkspace(input: unknown): ConstructorWorkspace {
  if (!isRecord(input) || input.format !== "masterok-constructor" || ![1, 2, 3, 4, 5].includes(input.version as number)) {
    throw new Error("Выберите файл проекта «Конструктора Мастерок» (.masterok.json), версия от 1 до 5.");
  }
  // Upgrade a copy, including saved variants. Never silently drop newer wall data.
  if (input.version === 1) {
    if (!isRecord(input.project) || input.project.schemaVersion !== 1 || !Array.isArray(input.project.rooms) || !Array.isArray(input.variants)) throw new Error("В файле повреждены помещения или варианты проекта.");
    const migrateRoom = (room: unknown) => {
      if (!isRecord(room) || "wallTiles" in room || "continuousWallTiles" in room) throw new Error("В файле версии 1 повреждены параметры помещения.");
      return { ...room, wallTiles: [null, null, null, null], continuousWallTiles: false };
    };
    return parseWorkspace({ ...input, version: 2, project: { ...input.project, schemaVersion: 2, rooms: input.project.rooms.map(migrateRoom) }, variants: input.variants.map((variant: unknown) => {
      if (!isRecord(variant) || !Array.isArray(variant.rooms)) throw new Error("В файле повреждён сохранённый вариант отделки.");
      return { ...variant, rooms: variant.rooms.map(migrateRoom) };
    }) });
  }
  if (input.version === 2) {
    if (!isRecord(input.project) || input.project.schemaVersion !== 2 || !Array.isArray(input.project.rooms) || !Array.isArray(input.variants)) throw new Error("В файле повреждены помещения или варианты проекта.");
    const migrateRoom = (room: unknown) => {
      if (!isRecord(room) || !isRecord(room.floor) || "kind" in room.floor || "tile" in room.floor || "tileSupplies" in room) throw new Error("В файле версии 2 повреждены параметры пола или смесей.");
      return { ...room, floor: { ...room.floor } };
    };
    return parseWorkspace({ ...input, version: 3, project: { ...input.project, schemaVersion: 3, rooms: input.project.rooms.map(migrateRoom) }, variants: input.variants.map((variant: unknown) => {
      if (!isRecord(variant) || !Array.isArray(variant.rooms)) throw new Error("В файле повреждён сохранённый вариант отделки.");
      return { ...variant, rooms: variant.rooms.map(migrateRoom) };
    }) });
  }
  if (input.version === 3) {
    if (!isRecord(input.project) || input.project.schemaVersion !== 3 || !Array.isArray(input.project.rooms) || !Array.isArray(input.variants)) throw new Error("В файле повреждены помещения или варианты проекта.");
    const migrateRoom = (room: unknown) => {
      if (!isRecord(room) || (isRecord(room.interior) && "positions" in room.interior)) throw new Error("В файле версии 3 повреждена расстановка обстановки.");
      return { ...room };
    };
    return parseWorkspace({ ...input, version: 4, project: { ...input.project, schemaVersion: 4, rooms: input.project.rooms.map(migrateRoom) }, variants: input.variants.map((variant: unknown) => {
      if (!isRecord(variant) || !Array.isArray(variant.rooms)) throw new Error("В файле повреждён сохранённый вариант отделки.");
      return { ...variant, rooms: variant.rooms.map(migrateRoom) };
    }) });
  }
  if (input.version === 4) {
    if (!isRecord(input.project) || input.project.schemaVersion !== 4 || !Array.isArray(input.project.rooms) || !Array.isArray(input.variants)) throw new Error("В файле повреждены помещения или варианты проекта.");
    const migrateRoom = (room: unknown) => {
      if (!isRecord(room)) throw new Error("В файле версии 4 повреждено помещение.");
      if (room.interior === undefined) return { ...room };
      const interior = room.interior;
      if (!isRecord(interior) || !(ROOM_TYPES as readonly unknown[]).includes(interior.type) || !Array.isArray(interior.items)
        || interior.items.some((kind: unknown) => !(ROOM_FURNISHINGS[interior.type as RoomType] as readonly unknown[]).includes(kind))
        || new Set(interior.items).size !== interior.items.length
        || (interior.positions !== undefined && (!isRecord(interior.positions) || Object.keys(interior.positions).some((kind) => !(interior.items as unknown[]).includes(kind))))) {
        throw new Error("В файле версии 4 повреждены предметы или расстановка обстановки.");
      }
      const positions = interior.positions as Record<string, unknown> | undefined;
      return { ...room, interior: { type: interior.type, items: interior.items.map((kind: string) => ({ id: kind, kind, ...(positions && kind in positions ? { position: positions[kind] } : {}) })) } };
    };
    return parseWorkspace({ ...input, version: 5, project: { ...input.project, schemaVersion: 5, rooms: input.project.rooms.map(migrateRoom) }, variants: input.variants.map((variant: unknown) => {
      if (!isRecord(variant) || !Array.isArray(variant.rooms)) throw new Error("В файле повреждён сохранённый вариант отделки.");
      return { ...variant, rooms: variant.rooms.map(migrateRoom) };
    }) });
  }
  checkProjectShape(input.project);
  if (!Array.isArray(input.variants) || input.variants.length > MAX_VARIANTS) {
    throw new Error(`В проекте может быть не больше ${MAX_VARIANTS} вариантов.`);
  }
  const ids = new Set<string>();
  for (const variant of input.variants) {
    if (!isRecord(variant) || typeof variant.id !== "string" || !variant.id || variant.id.length > 150 || ids.has(variant.id)
      || typeof variant.name !== "string" || !variant.name.trim() || variant.name.length > 120
      || typeof variant.savedAt !== "string" || !Number.isFinite(Date.parse(variant.savedAt))) {
      throw new Error("В файле повреждён сохранённый вариант отделки.");
    }
    ids.add(variant.id);
    checkProjectShape({ ...input.project, rooms: variant.rooms });
  }
  // A round trip strips non-data prototypes before we keep an imported document.
  return JSON.parse(JSON.stringify(input)) as ConstructorWorkspace;
}

export function serializeWorkspace(workspace: ConstructorWorkspace): string {
  parseWorkspace(workspace);
  const text = JSON.stringify(workspace, null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_FILE_BYTES) {
    throw new Error("Проект превышает 4 МБ. Удалите лишние сохранённые варианты или разделите помещения между проектами, затем скачайте файл.");
  }
  return text;
}

export function importWorkspaceFile(text: string): ConstructorWorkspace {
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_FILE_BYTES) {
    throw new Error("Файл слишком большой. Максимальный размер проекта — 4 МБ.");
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Файл не читается как JSON. Выберите скачанную резервную копию проекта."); }
  const workspace = parseWorkspace(value);
  const now = new Date().toISOString();
  // Import is a copy and cannot overwrite an existing local project by its ID.
  return { ...workspace, project: { ...workspace.project, id: newId("import"), updatedAt: now } };
}

export async function readWorkspaceFile(file: Pick<File, "size" | "text">): Promise<ConstructorWorkspace> {
  if (file.size > MAX_PROJECT_FILE_BYTES) {
    throw new Error("Файл слишком большой. Максимальный размер проекта — 4 МБ.");
  }
  let text: string;
  try { text = await file.text(); }
  catch { throw new Error("Не удалось прочитать файл. Сохраните его на устройство и выберите снова."); }
  return importWorkspaceFile(text);
}

export interface WorkspaceHistory {
  present: ConstructorWorkspace;
  past: ConstructorWorkspace[];
  future: ConstructorWorkspace[];
}

export function commitWorkspace(history: WorkspaceHistory, next: ConstructorWorkspace): WorkspaceHistory {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  const present = { ...next, project: { ...next.project, updatedAt: new Date().toISOString() } };
  return { present, past: [...history.past.slice(-49), history.present], future: [] };
}

export function undoWorkspace(history: WorkspaceHistory): WorkspaceHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return { present: previous, past: history.past.slice(0, -1), future: [history.present, ...history.future] };
}

export function redoWorkspace(history: WorkspaceHistory): WorkspaceHistory {
  const next = history.future[0];
  if (!next) return history;
  return { present: next, past: [...history.past, history.present], future: history.future.slice(1) };
}
