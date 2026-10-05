export type LayoutMaterial = "laminate" | "tile";
export type LayoutSearchParams = Record<string, string | string[] | undefined>;

const tileInputKeys = [
  "tileProject", "surfaceW", "surfaceH", "tileW", "tileH", "groutMm", "reservePercent",
  "packAreaM2", "tilesPerBox", "packagingSource", "surfaceView", "surfaceSource",
  "presentationMode", "finish", "light", "groutColor", "textureScale", "textureRotation",
  "layoutMode", "startMode", "startOffsetXmm", "startOffsetYmm", "hasOpening",
  "openingW", "openingH", "openingOffsetLeft",
];

/** Existing calculation/share links must keep their original inputs and renderer. */
export function isClassicLayoutEntry(material: LayoutMaterial, params: LayoutSearchParams): boolean {
  const workspace = params.workspace;
  if ((Array.isArray(workspace) ? workspace[0] : workspace) === "classic") return true;
  const keys = material === "laminate" ? ["surfaceW", "surfaceH", "mode"] : tileInputKeys;
  return keys.some((key) => params[key] !== undefined);
}

export function classicLayoutHref(material: LayoutMaterial): string {
  return `/instrumenty/${material === "laminate" ? "raskladka-laminata" : "raskladka-plitki"}/?workspace=classic`;
}
