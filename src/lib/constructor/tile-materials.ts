import type { WallTileSpec } from "./core";

export const TILE_DECORS = [
  { id: "limestone", name: "Бежевый камень", color: "#d4c5ad", light: "#dbceb9" },
  { id: "marble", name: "Белый мрамор", color: "#efefec", light: "#f5f5f2" },
  { id: "graphite", name: "Графит", color: "#535557", light: "#5b5d5f" },
  { id: "microcement", name: "Микроцемент", color: "#b8b4ae", light: "#bebab4" },
] as const;
export const tileDecorFor = (id: WallTileSpec["decor"]) => TILE_DECORS.find((decor) => decor.id === id) ?? TILE_DECORS[0];

/** Контрастная затирка для предпросмотра; цвет не входит в расчёт расхода. */
export const tileGroutColor = (id: WallTileSpec["decor"]) => id === "graphite" ? "#b5b0a6" : "#62696d";
