import {
  clampLayoutInput,
  normalizeTileLayoutStart,
  type LayoutMode,
  type TileStartMode,
} from "./tile-layout";
import {
  DEFAULT_TILE_PACK_AREA_M2,
  estimateTilesPerBoxFromArea,
  isValidTilePackArea,
  isValidTilesPerBox,
  type TilePackagingSource,
} from "./tile-layout-purchase";

export type TileProjectSurfaceView = "wall" | "floor";
export type TileProjectPresentationMode = "room" | "drawing";
export type TileVisualFinish = "limestone" | "marble" | "concrete" | "graphite";
export type TileLightingPreset = "daylight" | "warm" | "contrast";
export type TileTextureSource = "preset" | "custom";

export interface TileLayoutProjectState {
  name: string;
  surfaceW: number;
  surfaceH: number;
  tileW: number;
  tileH: number;
  groutMm: number;
  reservePercent: number;
  packAreaM2: number;
  tilesPerBox: number;
  packagingSource: TilePackagingSource;
  hasOpening: boolean;
  openingW: number;
  openingH: number;
  openingOffsetLeft: number;
  layoutMode: LayoutMode;
  startMode: TileStartMode;
  startOffsetXmm: number;
  startOffsetYmm: number;
  surfaceView: TileProjectSurfaceView;
  presentationMode: TileProjectPresentationMode;
  visualFinish: TileVisualFinish;
  lightingPreset: TileLightingPreset;
  groutColor: string;
  textureSource: TileTextureSource;
  textureScalePercent: number;
  textureRotationDeg: 0 | 90 | 180 | 270;
  customTextureDataUrl: string | null;
}

export interface SavedTileLayoutProject extends TileLayoutProjectState {
  id: string;
  updatedAt: string;
  version: 1;
}

interface TileLayoutProjectStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PROJECT_QUERY_MARKER = "tileProject";
const PROJECT_QUERY_VERSION = "1";
const PROJECT_PATH = "/instrumenty/raskladka-plitki/";
const MAX_SAVED_PROJECTS = 20;

export const TILE_LAYOUT_PROJECTS_STORAGE_KEY = "masterok:tile-layout-projects:v1";

const VALID_LAYOUT_MODES: LayoutMode[] = ["straight", "offset-half", "offset-third", "diagonal"];
const VALID_VISUAL_FINISHES: TileVisualFinish[] = ["limestone", "marble", "concrete", "graphite"];
const VALID_LIGHTING_PRESETS: TileLightingPreset[] = ["daylight", "warm", "contrast"];
const VALID_TEXTURE_ROTATIONS = [0, 90, 180, 270] as const;
const DEFAULT_GROUT_COLOR = "#d4d0c8";
const MAX_CUSTOM_TEXTURE_DATA_URL_LENGTH = 180_000;

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "Новая раскладка";
  return value.trim().slice(0, 80) || "Новая раскладка";
}

function isLayoutMode(value: unknown): value is LayoutMode {
  return typeof value === "string" && VALID_LAYOUT_MODES.includes(value as LayoutMode);
}

function isVisualFinish(value: unknown): value is TileVisualFinish {
  return typeof value === "string" && VALID_VISUAL_FINISHES.includes(value as TileVisualFinish);
}

function isLightingPreset(value: unknown): value is TileLightingPreset {
  return typeof value === "string" && VALID_LIGHTING_PRESETS.includes(value as TileLightingPreset);
}

function normalizeGroutColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_GROUT_COLOR;
}

function normalizeTextureRotation(value: unknown): 0 | 90 | 180 | 270 {
  const parsed = finiteNumber(value, 0);
  return VALID_TEXTURE_ROTATIONS.includes(parsed as 0 | 90 | 180 | 270)
    ? parsed as 0 | 90 | 180 | 270
    : 0;
}

function normalizeCustomTextureDataUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_CUSTOM_TEXTURE_DATA_URL_LENGTH) return null;
  return /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value) ? value : null;
}

/** Нормализует только состояние проекта; расчёт плитки остаётся в tile-layout.ts. */
export function normalizeTileLayoutProjectState(
  input: Partial<TileLayoutProjectState>,
): TileLayoutProjectState {
  const surfaceW = clampLayoutInput(finiteNumber(input.surfaceW, 2500), "surface");
  const surfaceH = clampLayoutInput(finiteNumber(input.surfaceH, 2600), "surface");
  const tileW = clampLayoutInput(finiteNumber(input.tileW, 600), "tile");
  const tileH = clampLayoutInput(finiteNumber(input.tileH, 300), "tile");
  const openingW = Math.min(
    Math.max(finiteNumber(input.openingW, 900), 100),
    surfaceW,
  );
  const openingH = Math.min(
    Math.max(finiteNumber(input.openingH, 2100), 100),
    surfaceH,
  );
  const openingOffsetLeft = Math.min(
    Math.max(finiteNumber(input.openingOffsetLeft, 1300), 0),
    Math.max(surfaceW - openingW, 0),
  );
  const packAreaM2 = finiteNumber(input.packAreaM2, DEFAULT_TILE_PACK_AREA_M2);
  const normalizedPackAreaM2 = isValidTilePackArea(packAreaM2)
    ? packAreaM2
    : DEFAULT_TILE_PACK_AREA_M2;
  const requestedTilesPerBox = finiteNumber(input.tilesPerBox, Number.NaN);
  const packagingSource: TilePackagingSource = input.packagingSource === "label"
    && isValidTilesPerBox(requestedTilesPerBox)
    ? "label"
    : "estimated";
  const tilesPerBox = packagingSource === "label"
    ? requestedTilesPerBox
    : estimateTilesPerBoxFromArea(tileW, tileH, normalizedPackAreaM2);
  const surfaceView: TileProjectSurfaceView = input.surfaceView === "floor" ? "floor" : "wall";
  const start = normalizeTileLayoutStart({
    mode: input.startMode ?? "edge",
    offsetXmm: finiteNumber(input.startOffsetXmm, tileW / 2),
    offsetYmm: finiteNumber(input.startOffsetYmm, tileH / 2),
  }, tileW, tileH);
  const customTextureDataUrl = normalizeCustomTextureDataUrl(input.customTextureDataUrl);

  return {
    name: normalizeName(input.name),
    surfaceW,
    surfaceH,
    tileW,
    tileH,
    groutMm: clampLayoutInput(finiteNumber(input.groutMm, 2), "grout"),
    reservePercent: clampLayoutInput(finiteNumber(input.reservePercent, 10), "reserve"),
    packAreaM2: normalizedPackAreaM2,
    tilesPerBox,
    packagingSource,
    hasOpening: surfaceView === "wall" && input.hasOpening !== false,
    openingW,
    openingH,
    openingOffsetLeft,
    layoutMode: isLayoutMode(input.layoutMode) ? input.layoutMode : "straight",
    startMode: start.mode,
    startOffsetXmm: start.offsetXmm,
    startOffsetYmm: start.offsetYmm,
    surfaceView,
    presentationMode: input.presentationMode === "drawing" ? "drawing" : "room",
    visualFinish: isVisualFinish(input.visualFinish) ? input.visualFinish : "limestone",
    lightingPreset: isLightingPreset(input.lightingPreset) ? input.lightingPreset : "daylight",
    groutColor: normalizeGroutColor(input.groutColor),
    textureSource: input.textureSource === "custom" && customTextureDataUrl ? "custom" : "preset",
    textureScalePercent: Math.min(Math.max(Math.round(finiteNumber(input.textureScalePercent, 100)), 70), 180),
    textureRotationDeg: normalizeTextureRotation(input.textureRotationDeg),
    customTextureDataUrl,
  };
}

export function buildTileLayoutProjectHref(input: Partial<TileLayoutProjectState>): string {
  const project = normalizeTileLayoutProjectState(input);
  const params = new URLSearchParams();
  params.set(PROJECT_QUERY_MARKER, PROJECT_QUERY_VERSION);
  params.set("name", project.name);
  params.set("surfaceW", String(Math.round(project.surfaceW)));
  params.set("surfaceH", String(Math.round(project.surfaceH)));
  params.set("tileW", String(Math.round(project.tileW)));
  params.set("tileH", String(Math.round(project.tileH)));
  params.set("groutMm", String(project.groutMm));
  params.set("reservePercent", String(project.reservePercent));
  params.set("packAreaM2", String(project.packAreaM2));
  params.set("tilesPerBox", String(project.tilesPerBox));
  params.set("packagingSource", project.packagingSource);
  params.set("surfaceView", project.surfaceView);
  params.set("presentationMode", project.presentationMode);
  params.set("finish", project.visualFinish);
  params.set("light", project.lightingPreset);
  params.set("groutColor", project.groutColor.slice(1));
  params.set("textureScale", String(project.textureScalePercent));
  params.set("textureRotation", String(project.textureRotationDeg));
  params.set("layoutMode", project.layoutMode);
  params.set("startMode", project.startMode);
  params.set("startOffsetXmm", String(project.startOffsetXmm));
  params.set("startOffsetYmm", String(project.startOffsetYmm));
  params.set("hasOpening", project.hasOpening ? "1" : "0");
  if (project.hasOpening) {
    params.set("openingW", String(Math.round(project.openingW)));
    params.set("openingH", String(Math.round(project.openingH)));
    params.set("openingOffsetLeft", String(Math.round(project.openingOffsetLeft)));
  }
  return `${PROJECT_PATH}?${params.toString()}`;
}

export function parseTileLayoutProjectSearchParams(
  params: Pick<URLSearchParams, "get">,
): TileLayoutProjectState | null {
  if (params.get(PROJECT_QUERY_MARKER) !== PROJECT_QUERY_VERSION) return null;
  const surfaceW = Number(params.get("surfaceW"));
  const surfaceH = Number(params.get("surfaceH"));
  if (!Number.isFinite(surfaceW) || !Number.isFinite(surfaceH) || surfaceW <= 0 || surfaceH <= 0) {
    return null;
  }

  return normalizeTileLayoutProjectState({
    name: params.get("name") ?? undefined,
    surfaceW,
    surfaceH,
    tileW: Number(params.get("tileW")),
    tileH: Number(params.get("tileH")),
    groutMm: Number(params.get("groutMm")),
    reservePercent: Number(params.get("reservePercent")),
    packAreaM2: Number(params.get("packAreaM2")),
    tilesPerBox: Number(params.get("tilesPerBox")),
    packagingSource: params.get("packagingSource") === "label" ? "label" : "estimated",
    surfaceView: params.get("surfaceView") === "floor" ? "floor" : "wall",
    presentationMode: params.get("presentationMode") === "drawing" ? "drawing" : "room",
    visualFinish: isVisualFinish(params.get("finish"))
      ? params.get("finish") as TileVisualFinish
      : undefined,
    lightingPreset: isLightingPreset(params.get("light"))
      ? params.get("light") as TileLightingPreset
      : undefined,
    groutColor: params.get("groutColor") ? `#${params.get("groutColor")}` : undefined,
    textureScalePercent: params.get("textureScale") == null ? undefined : Number(params.get("textureScale")),
    textureRotationDeg: params.get("textureRotation") == null
      ? undefined
      : Number(params.get("textureRotation")) as 0 | 90 | 180 | 270,
    // Пользовательское изображение намеренно не передаётся в ссылке.
    textureSource: "preset",
    customTextureDataUrl: null,
    layoutMode: isLayoutMode(params.get("layoutMode"))
      ? params.get("layoutMode") as LayoutMode
      : "straight",
    startMode: params.get("startMode") === "center" || params.get("startMode") === "custom"
      ? params.get("startMode") as TileStartMode
      : "edge",
    startOffsetXmm: Number(params.get("startOffsetXmm")),
    startOffsetYmm: Number(params.get("startOffsetYmm")),
    hasOpening: params.get("hasOpening") === "1",
    openingW: Number(params.get("openingW")),
    openingH: Number(params.get("openingH")),
    openingOffsetLeft: Number(params.get("openingOffsetLeft")),
  });
}

export function readSavedTileLayoutProjects(
  storage: TileLayoutProjectStorage,
): SavedTileLayoutProject[] {
  try {
    const raw = storage.getItem(TILE_LAYOUT_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .filter((item) => typeof item.id === "string" && typeof item.updatedAt === "string")
      .map((item) => ({
        ...normalizeTileLayoutProjectState(item),
        id: String(item.id),
        updatedAt: String(item.updatedAt),
        version: 1 as const,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SAVED_PROJECTS);
  } catch {
    return [];
  }
}

export function saveTileLayoutProject(
  storage: TileLayoutProjectStorage,
  input: Partial<TileLayoutProjectState>,
  options: { id?: string; now?: Date } = {},
): { project: SavedTileLayoutProject; projects: SavedTileLayoutProject[]; created: boolean } {
  const existing = readSavedTileLayoutProjects(storage);
  const id = options.id || `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const created = !existing.some((project) => project.id === id);
  const project: SavedTileLayoutProject = {
    ...normalizeTileLayoutProjectState(input),
    id,
    updatedAt: (options.now ?? new Date()).toISOString(),
    version: 1,
  };
  const projects = [project, ...existing.filter((item) => item.id !== id)].slice(0, MAX_SAVED_PROJECTS);
  storage.setItem(TILE_LAYOUT_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  return { project, projects, created };
}

export function deleteSavedTileLayoutProject(
  storage: TileLayoutProjectStorage,
  id: string,
): SavedTileLayoutProject[] {
  const projects = readSavedTileLayoutProjects(storage).filter((project) => project.id !== id);
  storage.setItem(TILE_LAYOUT_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  return projects;
}
