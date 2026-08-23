import { describe, expect, it } from "vitest";
import {
  buildTileLayoutProjectHref,
  deleteSavedTileLayoutProject,
  parseTileLayoutProjectSearchParams,
  readSavedTileLayoutProjects,
  saveTileLayoutProject,
  TILE_LAYOUT_PROJECTS_STORAGE_KEY,
  type TileLayoutProjectState,
} from "./tile-layout-project";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const project: TileLayoutProjectState = {
  name: "Ванная — стена у двери",
  surfaceW: 2500,
  surfaceH: 2600,
  tileW: 600,
  tileH: 300,
  groutMm: 2,
  reservePercent: 10,
  packAreaM2: 1.8,
  tilesPerBox: 10,
  packagingSource: "label",
  hasOpening: true,
  openingW: 900,
  openingH: 2100,
  openingOffsetLeft: 1300,
  layoutMode: "offset-half",
  startMode: "custom",
  startOffsetXmm: 120,
  startOffsetYmm: 80,
  surfaceView: "wall",
  presentationMode: "drawing",
  visualFinish: "marble",
  lightingPreset: "warm",
  groutColor: "#b8b2aa",
  textureSource: "preset",
  textureScalePercent: 125,
  textureRotationDeg: 90,
  customTextureDataUrl: null,
};

describe("tile layout project", () => {
  it("восстанавливает все параметры из ссылки", () => {
    const href = buildTileLayoutProjectHref(project);
    const parsed = parseTileLayoutProjectSearchParams(new URL(href, "https://getmasterok.ru").searchParams);

    expect(parsed).toEqual(project);
    expect(href).toContain("tileProject=1");
    expect(href).toContain("openingOffsetLeft=1300");
    expect(href).toContain("startMode=custom");
    expect(href).toContain("tilesPerBox=10");
    expect(href).toContain("packagingSource=label");
    expect(href).toContain("finish=marble");
    expect(href).toContain("light=warm");
    expect(href).toContain("groutColor=b8b2aa");
    expect(href).toContain("textureScale=125");
    expect(href).toContain("textureRotation=90");
  });

  it("старую ссылку без количества штук открывает как оценку, а не этикетку", () => {
    const params = new URLSearchParams({
      tileProject: "1",
      surfaceW: "2500",
      surfaceH: "2600",
      tileW: "600",
      tileH: "300",
      packAreaM2: "1.44",
    });
    const parsed = parseTileLayoutProjectSearchParams(params);

    expect(parsed?.tilesPerBox).toBe(8);
    expect(parsed?.packagingSource).toBe("estimated");
    expect(parsed?.visualFinish).toBe("limestone");
    expect(parsed?.lightingPreset).toBe("daylight");
    expect(parsed?.groutColor).toBe("#d4d0c8");
    expect(parsed?.textureSource).toBe("preset");
    expect(parsed?.textureScalePercent).toBe(100);
    expect(parsed?.textureRotationDeg).toBe(0);
  });

  it("заменяет неизвестный визуальный материал безопасным вариантом", () => {
    const normalized = parseTileLayoutProjectSearchParams(new URLSearchParams({
      tileProject: "1",
      surfaceW: "2500",
      surfaceH: "2600",
      finish: "neon-glass",
    }));

    expect(normalized?.visualFinish).toBe("limestone");
    expect(normalized?.lightingPreset).toBe("daylight");
  });

  it("сохраняет, обновляет и удаляет именованный проект", () => {
    const storage = memoryStorage();
    const first = saveTileLayoutProject(storage, project, {
      id: "bathroom-wall",
      now: new Date("2026-08-22T10:00:00.000Z"),
    });
    expect(first.created).toBe(true);
    expect(readSavedTileLayoutProjects(storage)).toHaveLength(1);

    const updated = saveTileLayoutProject(storage, { ...project, surfaceW: 3100 }, {
      id: "bathroom-wall",
      now: new Date("2026-08-22T11:00:00.000Z"),
    });
    expect(updated.created).toBe(false);
    expect(updated.projects).toHaveLength(1);
    expect(updated.project.surfaceW).toBe(3100);

    expect(deleteSavedTileLayoutProject(storage, "bathroom-wall")).toEqual([]);
    expect(storage.getItem(TILE_LAYOUT_PROJECTS_STORAGE_KEY)).toBe("[]");
  });

  it("хранит безопасную пользовательскую текстуру локально, но не добавляет её в ссылку", () => {
    const customTextureDataUrl = `data:image/webp;base64,${"a".repeat(80)}`;
    const storage = memoryStorage();
    const saved = saveTileLayoutProject(storage, {
      ...project,
      textureSource: "custom",
      customTextureDataUrl,
    }, { id: "custom-tile", now: new Date("2026-08-22T12:00:00.000Z") });

    expect(saved.project.textureSource).toBe("custom");
    expect(saved.project.customTextureDataUrl).toBe(customTextureDataUrl);
    expect(buildTileLayoutProjectHref(saved.project)).not.toContain("data%3Aimage");

    const linked = parseTileLayoutProjectSearchParams(
      new URL(buildTileLayoutProjectHref(saved.project), "https://getmasterok.ru").searchParams,
    );
    expect(linked?.textureSource).toBe("preset");
    expect(linked?.customTextureDataUrl).toBeNull();
  });

  it("отбрасывает небезопасную текстуру и нормализует визуальные параметры", () => {
    const normalized = saveTileLayoutProject(memoryStorage(), {
      ...project,
      groutColor: "red",
      textureSource: "custom",
      customTextureDataUrl: "javascript:alert(1)",
      textureScalePercent: 999,
      textureRotationDeg: 45 as 0,
    }, { id: "unsafe" }).project;

    expect(normalized.groutColor).toBe("#d4d0c8");
    expect(normalized.textureSource).toBe("preset");
    expect(normalized.customTextureDataUrl).toBeNull();
    expect(normalized.textureScalePercent).toBe(180);
    expect(normalized.textureRotationDeg).toBe(0);
  });

  it("не ломает страницу повреждённым localStorage", () => {
    const storage = memoryStorage();
    storage.setItem(TILE_LAYOUT_PROJECTS_STORAGE_KEY, "{broken");
    expect(readSavedTileLayoutProjects(storage)).toEqual([]);
  });
});
