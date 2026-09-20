import type { RoomDimensions } from "./geometry";
import { perimeterM } from "./geometry";
import { calcHref, type CalcRef } from "@/lib/tools/config";

export type RoomPackId = "bathroom" | "kitchen" | "room";

export interface PackCalcStep {
  slug: string;
  categorySlug: string;
  title: string;
  buildInputs: (d: RoomDimensions) => Record<string, number>;
}

export interface RoomPackConfig {
  id: RoomPackId;
  title: string;
  subtitle: string;
  icon: string;
  /** Основной калькулятор пакета (один комплексный или первый из цепочки). */
  primarySteps: PackCalcStep[];
  /** Дополнительные расчёты по соседним этапам — только ссылки, без дублирования формул. */
  extraLinks: Array<{
    ref: CalcRef;
    label: string;
    reason: string;
    buildParams: (d: RoomDimensions) => URLSearchParams;
  }>;
  fullCalculatorHref: (d: RoomDimensions) => string;
}

function roomSizeParams(d: RoomDimensions): URLSearchParams {
  const p = new URLSearchParams();
  p.set("length", String(d.length));
  p.set("width", String(d.width));
  p.set("height", String(d.height));
  p.set("doorWidth", String(d.doorWidth));
  return p;
}

const FLOOR_TILE_DIMENSIONS: Record<number, [number, number]> = {
  0: [300, 300],
  1: [450, 450],
  2: [600, 600],
};

const WALL_TILE_DIMENSIONS: Record<number, [number, number]> = {
  0: [200, 300],
  1: [250, 400],
  2: [300, 600],
};

function bathroomTileInputs(d: RoomDimensions): Record<string, number> {
  const [floorTileWidthMm, floorTileHeightMm] = FLOOR_TILE_DIMENSIONS[d.floorTileSize] ?? FLOOR_TILE_DIMENSIONS[0];
  const [wallTileWidthMm, wallTileHeightMm] = WALL_TILE_DIMENSIONS[d.wallTileSize] ?? WALL_TILE_DIMENSIONS[0];
  return {
    floorTileWidthMm,
    floorTileHeightMm,
    wallTileWidthMm,
    wallTileHeightMm,
  };
}

export const ROOM_PACKS: Record<RoomPackId, RoomPackConfig> = {
  bathroom: {
    id: "bathroom",
    title: "Ванная",
    subtitle: "Плитка пола и стен — клей, затирка и подготовка считаются отдельно",
    icon: "🚿",
    primarySteps: [
      {
        slug: "vannaya-komnata",
        categorySlug: "otdelka",
        title: "Комплекс ванной",
        buildInputs: (d) => ({
          length: d.length,
          width: d.width,
          height: d.height,
          ...bathroomTileInputs(d),
          hasWaterproofing: d.hasWaterproofing,
          doorWidth: d.doorWidth,
        }),
      },
    ],
    extraLinks: [
      {
        ref: { slug: "styazhka", categorySlug: "poly" },
        label: "Стяжка пола",
        reason: "Черновое основание под плитку",
        buildParams: (d) => {
          const p = roomSizeParams(d);
          p.set("inputMode", "0");
          return p;
        },
      },
      {
        ref: { slug: "teplyy-pol", categorySlug: "inzhenernye" },
        label: "Тёплый пол",
        reason: "Под плитку в зоне без мебели",
        buildParams: (d) => {
          const p = new URLSearchParams();
          p.set("inputMode", "1");
          p.set("area", String(Math.max(1, d.length * d.width * 0.6)));
          return p;
        },
      },
      {
        ref: { slug: "raskladka-plitki", categorySlug: "instrumenty" },
        label: "Раскладка плитки",
        reason: "Схема укладки и подрезка",
        buildParams: () => new URLSearchParams(),
      },
    ],
    fullCalculatorHref: (d) => {
      const p = roomSizeParams(d);
      for (const [key, value] of Object.entries(bathroomTileInputs(d))) {
        p.set(key, String(value));
      }
      p.set("hasWaterproofing", String(d.hasWaterproofing));
      p.set("from", "moy-remont");
      return `${calcHref({ slug: "vannaya-komnata", categorySlug: "otdelka" })}?${p}`;
    },
  },
  kitchen: {
    id: "kitchen",
    title: "Кухня",
    subtitle: "Стяжка и ламинат по размерам — остальное уточните отдельными калькуляторами",
    icon: "🍳",
    primarySteps: [
      {
        slug: "styazhka",
        categorySlug: "poly",
        title: "Стяжка",
        buildInputs: (d) => ({
          inputMode: 0,
          length: d.length,
          width: d.width,
        }),
      },
      {
        slug: "laminat",
        categorySlug: "poly",
        title: "Ламинат",
        buildInputs: (d) => ({
          inputMode: 0,
          length: d.length,
          width: d.width,
        }),
      },
    ],
    extraLinks: [
      {
        ref: { slug: "plitka", categorySlug: "poly" },
        label: "Фартук (плитка)",
        reason: "Зона между столешницей и шкафами",
        buildParams: (d) => {
          const p = new URLSearchParams();
          p.set("inputMode", "1");
          p.set("area", String(Math.max(2, d.length * 1.2)));
          p.set("tileWidth", "300");
          p.set("tileHeight", "600");
          return p;
        },
      },
      {
        ref: { slug: "kraska", categorySlug: "otdelka" },
        label: "Краска стен",
        reason: "Площадь стен без фартука — ориентир",
        buildParams: (d) => {
          const p = new URLSearchParams();
          const wall = 2 * (d.length + d.width) * d.height - d.doorWidth * 2.1;
          p.set("area", String(Math.round(Math.max(1, wall - d.length * 1.2) * 10) / 10));
          p.set("coats", "2");
          return p;
        },
      },
    ],
    fullCalculatorHref: (d) => {
      const p = roomSizeParams(d);
      p.set("inputMode", "0");
      p.set("from", "moy-remont");
      return `${calcHref({ slug: "laminat", categorySlug: "poly" })}?${p}`;
    },
  },
  room: {
    id: "room",
    title: "Комната",
    subtitle: "Ламинат на пол и краска на стены по размерам",
    icon: "🛋️",
    primarySteps: [
      {
        slug: "laminat",
        categorySlug: "poly",
        title: "Ламинат",
        buildInputs: (d) => ({
          inputMode: 0,
          length: d.length,
          width: d.width,
        }),
      },
      {
        slug: "kraska",
        categorySlug: "otdelka",
        title: "Краска",
        buildInputs: (d) => {
          const doorH = Math.min(d.height, 2.1);
          const wall = 2 * (d.length + d.width) * d.height - d.doorWidth * doorH;
          return {
            area: Math.round(wall * 10) / 10,
            coats: 2,
            surfaceType: 0,
          };
        },
      },
    ],
    extraLinks: [
      {
        ref: { slug: "styazhka", categorySlug: "poly" },
        label: "Стяжка",
        reason: "Выравнивание пола перед покрытием",
        buildParams: (d) => {
          const p = roomSizeParams(d);
          p.set("inputMode", "0");
          return p;
        },
      },
      {
        ref: { slug: "oboi", categorySlug: "otdelka" },
        label: "Обои",
        reason: "Альтернатива покраске стен",
        buildParams: (d) => {
          const p = new URLSearchParams();
          p.set("perimeter", String(Math.round(perimeterM(d) * 10) / 10));
          p.set("height", String(d.height));
          p.set("doors", "1");
          return p;
        },
      },
    ],
    fullCalculatorHref: (d) => {
      const p = roomSizeParams(d);
      p.set("inputMode", "0");
      p.set("from", "moy-remont");
      return `${calcHref({ slug: "laminat", categorySlug: "poly" })}?${p}`;
    },
  },
};

export function getPackList(): RoomPackConfig[] {
  return [ROOM_PACKS.bathroom, ROOM_PACKS.kitchen, ROOM_PACKS.room];
}

export function extraLinkHref(
  link: RoomPackConfig["extraLinks"][number],
  d: RoomDimensions,
): string {
  const base =
    link.ref.slug === "raskladka-plitki"
      ? "/instrumenty/raskladka-plitki/"
      : calcHref(link.ref);
  const qs = link.buildParams(d).toString();
  return qs ? `${base}?${qs}` : base;
}
