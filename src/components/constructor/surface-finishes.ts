import * as THREE from "three";

export function createJoineryMaterial(): THREE.MeshStandardMaterial {
  const width = 256, height = 128, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const grain = Math.sin(y * .9 + Math.sin(x * .024) * 2.8 + Math.sin(x * .08 + y * .035) * .7);
    const shade = grain * 8 + Math.sin(y * .17 + x * .007) * 6;
    data.set([185 + shade, 146 + shade, 101 + shade], (y * width + x) * 4);
    data[(y * width + x) * 4 + 3] = 255;
  }
  const map = new THREE.DataTexture(data, width, height);
  map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true; map.needsUpdate = true;
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: .57, envMapIntensity: .7 });
}

/** Small deterministic relief, shared within one room and disposed with its materials. */
export function createMineralRelief(): THREE.DataTexture {
  const size = 64, data = new Uint8Array(size * size * 4);
  let seed = 4817;
  for (let pixel = 0; pixel < size * size; pixel++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 112 + (seed >>> 27);
    data.set([value, value, value, 255], pixel * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(8, 8);
  texture.needsUpdate = true;
  return texture;
}

/** Local contact shade, not an extra shadow-casting light or a postprocessing pass. */
export function createContactShade(): THREE.DataTexture {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.max(0, Math.abs((x + .5) / size - .5) - .22);
    const dy = Math.max(0, Math.abs((y + .5) / size - .5) - .22);
    const opacity = .22 * Math.exp(-(dx * dx + dy * dy) / .014);
    data.set([39, 34, 28, Math.round(opacity * 255)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
