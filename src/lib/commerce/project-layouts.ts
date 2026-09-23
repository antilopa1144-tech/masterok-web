import type { ProjectDocumentLayout } from './document-types';

export const PROJECT_LAYOUTS_STORAGE_KEY = 'masterok:project-layouts:v1';
export const MAX_PROJECT_LAYOUTS = 5;
export const MAX_LAYOUT_DATA_URL_LENGTH = 2_800_000;
export const MAX_LAYOUT_PIXELS = 12_000_000;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export interface ProjectLayoutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ProjectLayoutDraft {
  kind: ProjectDocumentLayout['kind'];
  title: string;
  summary: string;
  /** Current in-page SVG rendered by the tool; external image uploads are not accepted. */
  imageDataUrl?: string;
  sourceLabel: string;
  sourceFingerprint: string;
}

interface StoredProjectLayout extends ProjectDocumentLayout {
  id: string;
  projectId: string;
  sourceFingerprint: string;
  savedAt: number;
}

type LayoutStore = Record<string, StoredProjectLayout[]>;

function parseStore(storage: ProjectLayoutStorage): LayoutStore {
  try {
    const raw = storage.getItem(PROJECT_LAYOUTS_STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as LayoutStore : {};
  } catch {
    return {};
  }
}

function text(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} не заполнено`);
  if (normalized.length > 4_000) throw new Error(`${label} слишком длинное`);
  return normalized;
}

function parsePng(dataUrl: string): { dataUrl: string; width: number; height: number } {
  if (dataUrl.length > MAX_LAYOUT_DATA_URL_LENGTH) throw new Error('Схема слишком велика для сохранения в проекте');
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('Можно сохранить только PNG, созданный этой раскладкой');
  const binary = atob(match[1]);
  if (binary.length < 24 || !PNG_SIGNATURE.every((value, index) => binary.charCodeAt(index) === value)) {
    throw new Error('Не удалось проверить PNG-схему');
  }
  const bytes = (offset: number) => (binary.charCodeAt(offset) * 16_777_216)
    + (binary.charCodeAt(offset + 1) * 65_536)
    + (binary.charCodeAt(offset + 2) * 256)
    + binary.charCodeAt(offset + 3);
  const width = bytes(16);
  const height = bytes(20);
  if (width < 1 || height < 1 || width * height > MAX_LAYOUT_PIXELS) {
    throw new Error('Схема слишком велика для сохранения в проекте');
  }
  return { dataUrl, width, height };
}

function toDocumentLayout(layout: StoredProjectLayout): ProjectDocumentLayout {
  return {
    kind: layout.kind,
    title: layout.title,
    summary: layout.summary,
    ...(layout.image ? { image: layout.image } : {}),
    sourceLabel: layout.sourceLabel,
  };
}

/** Only layouts attached to this exact project are returned to the document generator. */
export function getProjectLayouts(projectId: string): ProjectDocumentLayout[];
export function getProjectLayouts(storage: ProjectLayoutStorage, projectId: string): ProjectDocumentLayout[];
export function getProjectLayouts(
  storageOrProjectId: ProjectLayoutStorage | string,
  optionalProjectId?: string,
): ProjectDocumentLayout[] {
  const storage = typeof storageOrProjectId === 'string'
    ? (typeof window === 'undefined' ? null : window.localStorage)
    : storageOrProjectId;
  const projectId = typeof storageOrProjectId === 'string' ? storageOrProjectId : optionalProjectId;
  if (!storage || !projectId) return [];
  return (parseStore(storage)[projectId] ?? [])
    .filter((layout) => layout && layout.projectId === projectId)
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(toDocumentLayout);
}

/**
 * Adds a user-visible layout snapshot to one project. The same source fingerprint
 * updates its prior snapshot, preventing repeated clicks from consuming the limit.
 */
export function saveProjectLayout(
  storage: ProjectLayoutStorage,
  projectId: string,
  draft: ProjectLayoutDraft,
  now = Date.now(),
): ProjectDocumentLayout[] {
  const safeProjectId = text(projectId, 'Проект');
  const title = text(draft.title, 'Название схемы');
  const summary = text(draft.summary, 'Описание схемы');
  const sourceLabel = text(draft.sourceLabel, 'Версия схемы');
  const sourceFingerprint = text(draft.sourceFingerprint, 'Отпечаток схемы');
  const image = draft.imageDataUrl ? parsePng(draft.imageDataUrl) : undefined;
  const store = parseStore(storage);
  const current = (store[safeProjectId] ?? []).filter((layout) => layout?.projectId === safeProjectId);
  const previous = current.find((layout) => layout.sourceFingerprint === sourceFingerprint);
  if (!previous && current.length >= MAX_PROJECT_LAYOUTS) {
    throw new Error(`В проекте можно сохранить не более ${MAX_PROJECT_LAYOUTS} схем`);
  }
  const saved: StoredProjectLayout = {
    id: previous?.id ?? `layout-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: safeProjectId,
    kind: draft.kind,
    title,
    summary,
    ...(image ? { image } : {}),
    sourceLabel,
    sourceFingerprint,
    savedAt: now,
  };
  store[safeProjectId] = [saved, ...current.filter((layout) => layout.id !== saved.id)];
  try {
    storage.setItem(PROJECT_LAYOUTS_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    const message = error instanceof Error && /quota|space|storage/i.test(error.message)
      ? 'В хранилище браузера не хватает места для схемы. Удалите старые схемы или освободите место.'
      : 'Браузер не смог сохранить схему в проекте.';
    throw new Error(message);
  }
  return getProjectLayouts(storage, safeProjectId);
}
