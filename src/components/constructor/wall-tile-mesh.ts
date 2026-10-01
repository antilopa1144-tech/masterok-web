import * as THREE from "three";
import type { ConstructorRoom, FloorTileCalculation, WallTileCalculation, WallTileSpec } from "@/lib/constructor/core";
import { tileGroutColor } from "@/lib/constructor/tile-materials";

/** Draw clipped fragments without adding artificial seams inside the same tile. */
function addTileMesh(group: THREE.Group, spec: WallTileSpec, calculation: FloorTileCalculation, anisotropy: number, render: () => void, cancelled: () => boolean,
  rotation: THREE.Quaternion, position: (x: number, y: number) => THREE.Vector3, floor: boolean, wall?: number) {
  const fragments = calculation.cells.flatMap((cell) => cell.fragments.map((fragment) => ({ cell, fragment })));
  if (!fragments.length) return;
  const map = new THREE.TextureLoader().load(`/images/tile-textures/${spec.decor}.webp`, (loaded) => {
    if (cancelled()) { loaded.dispose(); return; }
    loaded.colorSpace = THREE.SRGBColorSpace; loaded.anisotropy = anisotropy; loaded.needsUpdate = true; render();
  });
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  const material = new THREE.MeshStandardMaterial({ map, roughness: spec.decor === "marble" ? .4 : .78, metalness: 0, envMapIntensity: .55 });
  const showJoints = spec.jointMm > 0;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\nattribute vec4 tileUv;${showJoints ? "\nvarying vec2 vTileSurfaceUv;" : ""}`);
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
vec2 surfaceUv = ${floor ? "vec2(uv.x, 1.0 - uv.y)" : "uv"} * tileUv.xy + tileUv.zw;
${showJoints ? "vTileSurfaceUv = surfaceUv;" : ""}
#ifdef USE_MAP
vMapUv = ${spec.orientation === "vertical" ? "vec2(surfaceUv.y, 1.0 - surfaceUv.x)" : "surfaceUv"};
#endif`);
    if (showJoints) {
      shader.uniforms.tileJointColor = { value: new THREE.Color(tileGroutColor(spec.decor)) };
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vTileSurfaceUv;\nuniform vec3 tileJointColor;");
      // Subpixel joints need a soft edge in screen space. Source-tile UVs keep
      // internal fragment boundaries around openings free of artificial seams.
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
vec2 tileEdgeDistance = min(vTileSurfaceUv, vec2(1.0) - vTileSurfaceUv);
vec2 tileEdgePixel = max(fwidth(vTileSurfaceUv) * 0.85, vec2(0.00001));
vec2 tileEdgeCoverage = vec2(1.0) - smoothstep(vec2(0.0), tileEdgePixel, tileEdgeDistance);
diffuseColor.rgb = mix(diffuseColor.rgb, tileJointColor, max(tileEdgeCoverage.x, tileEdgeCoverage.y) * 0.65);`);
    }
  };
  material.customProgramCacheKey = () => `constructor-tile-v2-${floor ? "floor" : "wall"}-${spec.orientation}-${showJoints ? "joints" : "butt"}`;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const uvs = new Float32Array(fragments.length * 4);
  geometry.setAttribute("tileUv", new THREE.InstancedBufferAttribute(uvs, 4));
  const mesh = new THREE.InstancedMesh(geometry, material, fragments.length);
  const matrix = new THREE.Matrix4();
  fragments.forEach(({ cell, fragment: p }, index) => {
    const x = (p.xMm + p.widthMm / 2) / 1000, y = (p.yMm + p.heightMm / 2) / 1000;
    matrix.compose(position(x, y), rotation, new THREE.Vector3(p.widthMm / 1000, p.heightMm / 1000, 1));
    mesh.setMatrixAt(index, matrix);
    uvs.set([p.widthMm / cell.widthMm, p.heightMm / cell.heightMm, (p.xMm - cell.xMm) / cell.widthMm, (p.yMm - cell.yMm) / cell.heightMm], index * 4);
    // Deterministic shade variation remains common to all fragments of the same source tile.
    mesh.setColorAt(index, new THREE.Color("#ffffff").multiplyScalar(.97 + ((cell.row * 7 + cell.column * 13) % 7) / 230));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true; if (floor) mesh.userData.floor = true; else mesh.userData.wall = wall; group.add(mesh);
}

export function addWallTileMesh(group: THREE.Group, room: ConstructorRoom, calculation: WallTileCalculation, anisotropy: number, render: () => void, cancelled: () => boolean) {
  const spec = room.wallTiles[calculation.wall]; if (!spec) return;
  const width = room.widthMm / 1000, length = room.lengthMm / 1000, wall = calculation.wall;
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), [0, -Math.PI / 2, Math.PI, Math.PI / 2][wall]);
  addTileMesh(group, spec, calculation, anisotropy, render, cancelled, rotation, (x, y) => {
    const positions = [[x - width / 2, y, -length / 2 + .011], [width / 2 - .011, y, x - length / 2], [width / 2 - x, y, length / 2 - .011], [-width / 2 + .011, y, length / 2 - x]];
    return new THREE.Vector3(...positions[wall] as [number, number, number]);
  }, false, wall);
}

export function addFloorTileMesh(group: THREE.Group, room: ConstructorRoom, calculation: FloorTileCalculation, anisotropy: number, render: () => void, cancelled: () => boolean) {
  const spec = room.floor.tile; if (!spec) return;
  const width = room.widthMm / 1000, length = room.lengthMm / 1000;
  const grout = new THREE.Mesh(new THREE.BoxGeometry(width, .012, length), new THREE.MeshStandardMaterial({ color: tileGroutColor(spec.decor), roughness: .95 }));
  grout.position.y = .005; grout.userData.floor = true; grout.receiveShadow = true; group.add(grout);
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  addTileMesh(group, spec, calculation, anisotropy, render, cancelled, rotation, (x, y) => new THREE.Vector3(x - width / 2, .023, y - length / 2), true);
}
