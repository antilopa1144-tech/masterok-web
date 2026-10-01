import type { decorFor } from "@/lib/constructor/presentation";

const loadedCanvases = new Map<ReturnType<typeof decorFor>["id"], Promise<HTMLCanvasElement>>();
const sourceFor = { natural: "natural-oak", light: "white-oak", grey: "white-oak", dark: "walnut" } as const;
export const PLANK_VARIANTS = 4;

/** Фактура одной доски: разные полосы исходного образца, рельеф и матовость. */
export function createPlankMaps(sample: HTMLCanvasElement) {
  const color = document.createElement("canvas"); color.width = 1024 * PLANK_VARIANTS; color.height = 256;
  const context = color.getContext("2d")!;
  const stripHeight = Math.round(sample.height * .2);
  for (let index = 0; index < PLANK_VARIANTS; index++) {
    const fromY = Math.round((sample.height - stripHeight) * index / (PLANK_VARIANTS - 1));
    context.drawImage(sample, 0, fromY, sample.width, stripHeight, index * 1024, 0, 1024, 256);
  }
  const relief = document.createElement("canvas"); relief.width = color.width; relief.height = 128;
  const reliefContext = relief.getContext("2d")!;
  reliefContext.drawImage(color, 0, 0, relief.width, relief.height);
  const pixels = reliefContext.getImageData(0, 0, relief.width, relief.height);
  const roughness = document.createElement("canvas"); roughness.width = relief.width; roughness.height = relief.height;
  const roughnessContext = roughness.getContext("2d")!;
  const roughnessPixels = roughnessContext.createImageData(roughness.width, roughness.height);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const luminance = pixels.data[offset] * .2126 + pixels.data[offset + 1] * .7152 + pixels.data[offset + 2] * .0722;
    // Это визуальные карты поверхности; значения не участвуют в расходе материалов.
    const height = Math.round(100 + luminance * .24);
    const matte = Math.round(178 + luminance * .14);
    pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = height;
    roughnessPixels.data[offset] = roughnessPixels.data[offset + 1] = roughnessPixels.data[offset + 2] = matte;
    roughnessPixels.data[offset + 3] = 255;
  }
  reliefContext.putImageData(pixels, 0, 0); roughnessContext.putImageData(roughnessPixels, 0, 0);
  return { color, relief, roughness };
}

/**
 * Небольшая детерминированная текстура древесины для досок и образцов материала.
 * Волокно идёт вдоль горизонтальной оси canvas: карта раскроя сопоставляет её с
 * реальной длинной доски, а не со случайной полосой на полу.
 */
export function createWoodCanvas(decor: ReturnType<typeof decorFor>, width = 2048, height = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  let state = 0x6d2b79f5;
  const random = () => { state |= 0; state = state + 0x6d2b79f5 | 0; let value = Math.imul(state ^ state >>> 15, 1 | state); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
  context.fillStyle = decor.color; context.fillRect(0, 0, width, height);
  const wash = context.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, decor.light); wash.addColorStop(.18, decor.color); wash.addColorStop(.78, decor.color); wash.addColorStop(1, decor.dark);
  context.globalAlpha = .32; context.fillStyle = wash; context.fillRect(0, 0, width, height);

  // Длинные волокна слегка сходятся и расходятся, поэтому не выглядят как набор одинаковых полос.
  for (let index = 0; index < Math.max(280, Math.floor(width / 3)); index++) {
    const y = random() * height;
    const amplitude = 3 + random() * 20;
    const drift = (random() - .5) * 44;
    context.strokeStyle = random() > .54 ? decor.dark : decor.light;
    context.globalAlpha = .025 + random() * .13;
    context.lineWidth = .3 + random() * 2.1;
    context.beginPath(); context.moveTo(-30, y);
    context.bezierCurveTo(width * .23, y + drift, width * .61, y - drift * .7 + amplitude, width + 30, y + drift * .22);
    context.stroke();
  }
  // Редкие сучки и завихрения привязаны к текстуре, а не повторяются на каждой доске одинаково.
  for (let index = 0; index < 12; index++) {
    const x = width * (.08 + random() * .84); const y = height * (.14 + random() * .72);
    const rx = 14 + random() * 38; const ry = 3 + random() * 10;
    context.save(); context.translate(x, y); context.rotate((random() - .5) * .24);
    for (let ring = 0; ring < 4; ring++) {
      context.strokeStyle = ring % 2 ? decor.light : decor.dark;
      context.globalAlpha = .06 + ring * .025; context.lineWidth = 1 + ring * .55;
      context.beginPath(); context.ellipse(0, 0, rx + ring * 5, ry + ring * 2.3, 0, 0, Math.PI * 2); context.stroke();
    }
    context.restore();
  }
  context.globalAlpha = 1;
  return canvas;
}

/** Загружает локальный образец и нормализует его волокно вдоль горизонтали canvas. */
export function loadWoodCanvas(decor: ReturnType<typeof decorFor>): Promise<HTMLCanvasElement> {
  const cached = loadedCanvases.get(decor.id);
  if (cached) return cached;
  const promise = new Promise<HTMLCanvasElement>((resolve) => {
    const fallback = () => resolve(createWoodCanvas(decor));
    if (typeof Image === "undefined") { fallback(); return; }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 2048; canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) { fallback(); return; }
      context.save();
      if (decor.id === "grey") context.filter = "grayscale(.92) saturate(.28) brightness(.82) contrast(.9)";
      if (decor.id === "light" || decor.id === "grey") {
        context.translate(0, canvas.height); context.rotate(-Math.PI / 2);
        context.drawImage(image, 0, 0, canvas.height, canvas.width);
      } else context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.restore();
      resolve(canvas);
    };
    image.onerror = fallback;
    image.src = `/images/laminate-textures/${sourceFor[decor.id]}.webp`;
  });
  loadedCanvases.set(decor.id, promise);
  return promise;
}
