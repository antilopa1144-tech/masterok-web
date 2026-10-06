"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ConstructorRoom, FurnishingPosition, RoomCalculation } from "@/lib/constructor/core";
import { decorFor, formatNumber } from "@/lib/constructor/presentation";
import styles from "./constructor.module.css";
import { createPlankMaps, createWoodCanvas, loadWoodCanvas, PLANK_VARIANTS } from "./wood-texture";
import { buildFurnishings } from "./room-furnishings";
import { addFloorTileMesh, addWallTileMesh } from "./wall-tile-mesh";
import { furnishingName, interiorFor } from "@/lib/constructor/interiors";
import { tileGroutColor } from "@/lib/constructor/tile-materials";
import { configureLaminateMaterial } from "./laminate-material";
import { createSurfaceHighlight, type SelectedSurface } from "./surface-highlight";
import { createFurnishingHighlight } from "./furnishing-highlight";
import { attachFurnishingDrag } from "./furnishing-drag";

interface Runtime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  content: THREE.Group;
  selection: THREE.Group;
  render: () => void;
  reset: (direction?: THREE.Vector3) => void;
  roomId?: string;
  size?: string;
  allWalls: boolean;
}

function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    const cancelTextureLoad = object.userData.cancelTextureLoad as (() => void) | undefined;
    cancelTextureLoad?.();
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
      materials.add(material);
      const mapped = material as THREE.MeshStandardMaterial;
      for (const key of ["map", "bumpMap", "roughnessMap", "normalMap", "alphaMap"] as const) {
        if (mapped[key]) textures.add(mapped[key]);
      }
    });
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  group.clear();
}

function canvasTexture(canvas: HTMLCanvasElement, anisotropy: number, color = false) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.anisotropy = anisotropy;
  return texture;
}

function label(text: string, position: THREE.Vector3, width: number) {
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 200;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(255,255,255,.95)";
  context.beginPath(); context.roundRect(0, 0, 1024, 200, 36); context.fill();
  context.fillStyle = "#172033"; context.font = "500 88px Arial"; context.textAlign = "center"; context.textBaseline = "middle";
  context.fillText(text, 512, 104);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, toneMapped: false }));
  sprite.position.copy(position); sprite.scale.set(width, width / 5.12, 1); sprite.renderOrder = 10;
  return sprite;
}

function addBox(group: THREE.Group, dimensions: [number, number, number], position: [number, number, number], material: THREE.Material | THREE.Material[], wall?: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position); mesh.receiveShadow = true; mesh.castShadow = true;
  if (wall !== undefined) mesh.userData.wall = wall;
  group.add(mesh);
  return mesh;
}

function addContactShadow(group: THREE.Group, width: number, length: number) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
  gradient.addColorStop(0, "rgba(47,54,58,.20)"); gradient.addColorStop(.52, "rgba(47,54,58,.08)"); gradient.addColorStop(1, "rgba(47,54,58,0)");
  context.fillStyle = gradient; context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width + .9, length + .9), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.151; shadow.renderOrder = -1;
  shadow.userData.ignoreCameraFit = true;
  group.add(shadow);
}

function curtainGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 32, 6);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index); const y = position.getY(index);
    const fullness = 1 + (1 - (y / height + .5)) * .1;
    position.setXYZ(index, x * fullness, y, Math.sin((x / width + .5) * Math.PI * 10) * .019);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildRoom(group: THREE.Group, room: ConstructorRoom, calculation: RoomCalculation, furnished: boolean, anisotropy: number, render: () => void) {
  const w = room.widthMm / 1000; const l = room.lengthMm / 1000; const h = room.heightMm / 1000;
  const decor = decorFor(room.floor.decor);
  const base = new THREE.MeshStandardMaterial({ color: "#aab1b5", roughness: 1, metalness: 0 });
  addContactShadow(group, w, l);
  addBox(group, [w + 0.22, 0.14, l + 0.22], [0, -0.08, 0], base);

  let textureLoadCancelled = false;
  group.userData.cancelTextureLoad = () => { textureLoadCancelled = true; };
  if (calculation.floorTiles) {
    addFloorTileMesh(group, room, calculation.floorTiles, anisotropy, render, () => textureLoadCancelled);
  } else {

  const maps = createPlankMaps(createWoodCanvas(decor));
  const texture = canvasTexture(maps.color, anisotropy, true);
  const relief = canvasTexture(maps.relief, anisotropy);
  const matte = canvasTexture(maps.roughness, anisotropy);
  const wood = new THREE.MeshStandardMaterial({ map: texture, bumpMap: relief, roughnessMap: matte, bumpScale: .004, roughness: .86, metalness: 0, envMapIntensity: .7 });
  configureLaminateMaterial(wood, room.floor.direction);
  loadWoodCanvas(decor).then((loadedCanvas) => {
    if (textureLoadCancelled) return;
    const loadedMaps = createPlankMaps(loadedCanvas);
    for (const [target, source] of [[texture, loadedMaps.color], [relief, loadedMaps.relief], [matte, loadedMaps.roughness]] as const) {
      target.image = source; target.needsUpdate = true;
    }
    render();
  });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const boardUvs = new Float32Array(calculation.pieces.length * 4);
  geometry.setAttribute("boardUv", new THREE.InstancedBufferAttribute(boardUvs, 4));
  const boards = new THREE.InstancedMesh(geometry, wood, calculation.pieces.length);
  const sourceIndices = new Map(calculation.sourceBoards.map((board, index) => [board.id, index]));
  const matrix = new THREE.Matrix4(); const scale = new THREE.Vector3(); const position = new THREE.Vector3(); const rotation = new THREE.Quaternion();
  calculation.pieces.forEach((piece, index) => {
    position.set((piece.xMm + piece.widthMm / 2) / 1000 - w / 2, 0.013, (piece.yMm + piece.heightMm / 2) / 1000 - l / 2);
    // Тонкий физический шов подчёркивает каждую реальную деталь без изменения её расчётной геометрии.
    scale.set(Math.max(0.0001, piece.widthMm / 1000 - 0.0014), 0.019, Math.max(0.0001, piece.heightMm / 1000 - 0.0014));
    matrix.compose(position, rotation, scale); boards.setMatrixAt(index, matrix);
    const sourceIndex = sourceIndices.get(piece.sourceBoardId) ?? 0;
    boardUvs.set([piece.sourceLengthMm / room.floor.boardLengthMm / PLANK_VARIANTS, piece.sourceWidthMm / room.floor.boardWidthMm, (sourceIndex % PLANK_VARIANTS + piece.sourceStartMm / room.floor.boardLengthMm) / PLANK_VARIANTS, 0], index * 4);
    const color = new THREE.Color("#ffffff").multiplyScalar(.96 + (sourceIndex * 19 % 9) / 120);
    boards.setColorAt(index, color);
  });
  boards.instanceMatrix.needsUpdate = true;
  if (boards.instanceColor) boards.instanceColor.needsUpdate = true;
  boards.receiveShadow = true; boards.userData.floor = true;
  group.add(boards);
  }

  const wallMaterials = [
    new THREE.MeshStandardMaterial({ color: "#ede9e1", roughness: .96, metalness: 0, envMapIntensity: .45 }),
    new THREE.MeshStandardMaterial({ color: "#f3f0e9", roughness: .96, metalness: 0, envMapIntensity: .45 }),
  ];
  const wallCapMaterial = new THREE.MeshStandardMaterial({ color: "#ddd7ce", roughness: .84, metalness: 0 });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#f9faf9", roughness: .54, metalness: 0 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#e8e4dc", roughness: .7, metalness: 0 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: "#c9e6ea", transparent: true, opacity: .42, roughness: .08, metalness: 0, transmission: .08, thickness: .02 });
  const plinthMaterial = new THREE.MeshStandardMaterial({ color: "#f0ede6", roughness: .58, metalness: 0 });
  const curtainMaterial = furnished && ["living", "bedroom", "office"].includes(interiorFor(room).type) ? new THREE.MeshStandardMaterial({ color: "#d4cabb", roughness: .98, side: THREE.DoubleSide, envMapIntensity: .45 }) : undefined;
  for (let wall = 0; wall < 4; wall++) {
    const wallSpec = room.wallTiles[wall];
    // Grout belongs to the interior face; the wall's cut edges keep their finish.
    const wallMaterial = wallSpec ? Array.from({ length: 6 }, (_, face) => face === [4, 1, 5, 0][wall]
      ? new THREE.MeshStandardMaterial({ color: tileGroutColor(wallSpec.decor), roughness: .96, metalness: 0, envMapIntensity: .45 })
      : wallMaterials[wall % 2]) : wallMaterials[wall % 2];
    const horizontal = wall === 0 || wall === 2;
    const length = horizontal ? w : l;
    const openings = room.openings.filter((opening) => opening.wall === wall);
    const xs = [...new Set([0, length, ...openings.flatMap((opening) => [opening.offsetMm / 1000, (opening.offsetMm + opening.widthMm) / 1000])])].sort((a, b) => a - b);
    const ys = [...new Set([0, h, ...openings.flatMap((opening) => [opening.sillMm / 1000, (opening.sillMm + opening.heightMm) / 1000])])].sort((a, b) => a - b);
    const locate = (along: number, height: number): [number, number, number] => {
      if (wall === 0) return [along - w / 2, height, -l / 2 - 0.05];
      if (wall === 1) return [w / 2 + 0.05, height, along - l / 2];
      if (wall === 2) return [w / 2 - along, height, l / 2 + 0.05];
      return [-w / 2 - 0.05, height, l / 2 - along];
    };
    // Поверхностные элементы стоят по внутренней грани стены, а не в её центре.
    // Небольшое пересечение с основанием исключает просвет, лицевая часть выступает в комнату.
    const locateInside = (along: number, height: number, inset = .018): [number, number, number] => {
      if (wall === 0) return [along - w / 2, height, -l / 2 + inset];
      if (wall === 1) return [w / 2 - inset, height, along - l / 2];
      if (wall === 2) return [w / 2 - along, height, l / 2 - inset];
      return [-w / 2 + inset, height, l / 2 - along];
    };
    for (let x = 0; x < xs.length - 1; x++) for (let y = 0; y < ys.length - 1; y++) {
      const cx = (xs[x] + xs[x + 1]) / 2; const cy = (ys[y] + ys[y + 1]) / 2;
      if (openings.some((opening) => cx > opening.offsetMm / 1000 && cx < (opening.offsetMm + opening.widthMm) / 1000 && cy > opening.sillMm / 1000 && cy < (opening.sillMm + opening.heightMm) / 1000)) continue;
      addBox(group, horizontal ? [xs[x + 1] - xs[x], ys[y + 1] - ys[y], 0.1] : [0.1, ys[y + 1] - ys[y], xs[x + 1] - xs[x]], locate(cx, cy), wallMaterial, wall);
    }
    addBox(group, horizontal ? [length + .02, .032, .125] : [.125, .032, length + .02], locateInside(length / 2, h + .005, .002), wallCapMaterial, wall);
    const tileCalculation = calculation.walls.find((item) => item.wall === wall);
    if (tileCalculation) addWallTileMesh(group, room, tileCalculation, anisotropy, render, () => textureLoadCancelled);
    openings.filter((opening) => opening.type === "window").forEach((opening) => {
      const ow = opening.widthMm / 1000; const oh = opening.heightMm / 1000;
      const ox = (opening.offsetMm + opening.widthMm / 2) / 1000; const oy = (opening.sillMm + opening.heightMm / 2) / 1000;
      addBox(group, horizontal ? [ow, oh, 0.02] : [0.02, oh, ow], locateInside(ox, oy, .012), glassMaterial, wall);
      for (const side of [-1, 1]) {
        addBox(group, horizontal ? [0.055, oh + .05, 0.07] : [0.07, oh + .05, 0.055], locateInside(ox + side * (ow / 2 - 0.025), oy), frameMaterial, wall);
        addBox(group, horizontal ? [ow + .05, 0.055, 0.07] : [0.07, 0.055, ow + .05], locateInside(ox, oy + side * (oh / 2 - 0.025)), frameMaterial, wall);
      }
      addBox(group, horizontal ? [.032, oh, .065] : [.065, oh, .032], locateInside(ox, oy), frameMaterial, wall);
      addBox(group, horizontal ? [ow + .09, .035, .12] : [.12, .035, ow + .09], locateInside(ox, opening.sillMm / 1000 - .015, .028), trimMaterial, wall);
      if (curtainMaterial && oh >= .6 && h >= 1.3) {
        const top = Math.min(h - .08, (opening.sillMm + opening.heightMm) / 1000 + .16);
        const left = Math.max(.08, opening.offsetMm / 1000 - .14);
        const right = Math.min(length - .08, (opening.offsetMm + opening.widthMm) / 1000 + .14);
        const panelWidth = Math.min(.36, (right - left) * .23);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, right - left + .06, 8), trimMaterial);
        rail.rotation[horizontal ? "z" : "x"] = Math.PI / 2; rail.position.set(...locateInside((left + right) / 2, top + .018, .1));
        rail.userData.wall = wall; rail.userData.ignoreCameraFit = true; group.add(rail);
        for (const center of [left + panelWidth / 2, right - panelWidth / 2]) {
          const curtain = new THREE.Mesh(curtainGeometry(panelWidth, top - .045), curtainMaterial);
          curtain.position.set(...locateInside(center, (top + .045) / 2, .1));
          if (!horizontal) curtain.rotation.y = Math.PI / 2;
          curtain.castShadow = true; curtain.receiveShadow = true; curtain.userData.wall = wall; curtain.userData.ignoreCameraFit = true;
          group.add(curtain);
        }
        if (opening.sillMm >= 450) {
          const rw = Math.min(1.15, ow * .78); const rh = Math.min(.42, opening.sillMm / 1000 - .16);
          addBox(group, horizontal ? [rw, rh, .045] : [.045, rh, rw], locateInside(ox, rh / 2 + .12, .065), frameMaterial, wall);
          for (let rib = 0; rib < 10; rib++) addBox(group, horizontal ? [.025, rh, .065] : [.065, rh, .025], locateInside(ox - rw / 2 + rw * (rib + .5) / 10, rh / 2 + .12, .096), frameMaterial, wall);
        }
      }
    });
    openings.filter((opening) => opening.type === "door").forEach((opening) => {
      const ow = opening.widthMm / 1000; const oh = opening.heightMm / 1000;
      const ox = (opening.offsetMm + opening.widthMm / 2) / 1000; const oy = oh / 2;
      for (const side of [-1, 1]) addBox(group, horizontal ? [.065, oh + .06, .075] : [.075, oh + .06, .065], locateInside(ox + side * (ow / 2 + .01), oy), trimMaterial, wall);
      addBox(group, horizontal ? [ow + .15, .065, .075] : [.075, .065, ow + .15], locateInside(ox, oh + .025), trimMaterial, wall);
    });
    if (room.floor.includePlinth) {
      const doors = openings.filter((opening) => opening.type === "door").sort((a, b) => a.offsetMm - b.offsetMm);
      let start = 0;
      const addPlinth = (from: number, to: number) => {
        if (to - from <= .01) return;
        const center = (from + to) / 2;
        addBox(group, horizontal ? [to - from, .075, .028] : [.028, .075, to - from], locateInside(center, .038, .017), plinthMaterial, wall);
      };
      doors.forEach((door) => { const from = door.offsetMm / 1000; addPlinth(start, from); start = (door.offsetMm + door.widthMm) / 1000; });
      addPlinth(start, length);
    }
  }
  if (furnished) group.add(buildFurnishings(room));
  const labelWidth = Math.max(w, l) * 0.3;
  group.add(label(`${formatNumber(room.widthMm)} мм`, new THREE.Vector3(0, 0.05, l / 2 + 0.4), labelWidth));
  group.add(label(`${formatNumber(room.lengthMm)} мм`, new THREE.Vector3(w / 2 + 0.55, 0.05, 0), labelWidth));
}

export default function RoomScene({ room, calculation, allWalls, furnished, resetToken, selectedSurface, selectedFurnishing, movingFurnishing, onPosition, onGesture, onExitMove, onSelect, onCapture, onFallback, onControls }: {
  room: ConstructorRoom; calculation: RoomCalculation; allWalls: boolean; furnished: boolean; resetToken: number;
  selectedSurface: SelectedSurface;
  selectedFurnishing?: string;
  movingFurnishing?: string;
  onPosition: (id: string, position: FurnishingPosition) => void;
  onGesture: (active: boolean) => void;
  onExitMove: () => void;
  onSelect: (surface: "floor" | "interior" | number, id?: string) => void;
  onCapture: (capture: (() => string) | null) => void;
  onFallback: () => void;
  onControls?: (actions: { zoomIn: () => void; zoomOut: () => void; topView: () => void } | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime>();
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const controlsRef = useRef(onControls); controlsRef.current = onControls;
  const moveRef = useRef({ id: movingFurnishing, onPosition, onGesture, onExitMove }); moveRef.current = { id: movingFurnishing, onPosition, onGesture, onExitMove };
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { setError("3D недоступно в этом браузере. План, раскрой и расчёты продолжают работать."); return; }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Трёхмерная модель комнаты. Перетаскивайте для вращения, используйте два пальца для масштаба.");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, .04);
    scene.environment = environmentTarget.texture; scene.environmentIntensity = .25;
    environment.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 250);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.minPolarAngle = 0.08; controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 1; controls.maxDistance = 70; controls.target.set(0, 0.5, 0);
    scene.add(new THREE.HemisphereLight("#f8fbff", "#b8afa2", 1.15));
    const fill = new THREE.DirectionalLight("#e7efff", .8); fill.position.set(4, 5, 4); scene.add(fill);
    const sun = new THREE.DirectionalLight("#fff1df", 2.5);
    sun.position.set(3, 8, 4); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.00015; sun.shadow.normalBias = 0.018;
    scene.add(sun);
    const grid = new THREE.GridHelper(80, 80, "#ffffff", "#ffffff"); grid.position.y = -0.15;
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true; gridMaterial.opacity = .16;
    scene.add(grid);
    const content = new THREE.Group(); scene.add(content);
    const selection = new THREE.Group(); scene.add(selection);
    let frame = 0; let stopped = false;
    const updateWalls = () => {
      const offset = camera.position.clone().sub(controls.target);
      const hidden = [offset.z < -.02, offset.x > .02, offset.z > .02, offset.x < -.02];
      content.traverse((object) => {
        const wall = object.userData.wall as number | undefined;
        if (wall !== undefined) object.visible = !!runtime.current?.allWalls || !hidden[wall];
      });
    };
    const render = () => {
      if (stopped || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; if (!stopped) { updateWalls(); renderer.render(scene, camera); } });
    };
    const updateGridTheme = () => { gridMaterial.color.set(getComputedStyle(element).getPropertyValue("--c-line").trim() || "#dce3eb"); render(); };
    updateGridTheme();
    const themeObserver = new MutationObserver(updateGridTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    const reset = (direction = new THREE.Vector3(1.1, 1.3, 1.6).normalize()) => {
      const bounds = new THREE.Box3();
      // Box3 includes invisible meshes, so omit the decorative shadow explicitly.
      content.children.forEach((object) => { if (!object.userData.ignoreCameraFit) bounds.expandByObject(object); });
      if (bounds.isEmpty()) return;
      const size = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, 3);
      controls.target.set(0, Math.min(0.5, size * 0.08), 0);
      direction.normalize();
      camera.position.copy(controls.target).add(direction); camera.lookAt(controls.target);
      const rotation = camera.quaternion.clone().invert();
      const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); const tanX = tanY * camera.aspect;
      let distance = 1;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(controls.target).applyQuaternion(rotation);
        distance = Math.max(distance, point.z + Math.max(Math.abs(point.x) / tanX, Math.abs(point.y) / tanY));
      }
      controls.maxDistance = Math.max(70, distance * 3);
      camera.position.copy(controls.target).addScaledVector(direction, distance * 1.08); controls.update(); render();
    };
    runtime.current = { renderer, scene, camera, controls, sun, content, selection, render, reset, allWalls: false };
    const zoom = (factor: number) => {
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
      if (offset.lengthSq() < 1e-8) offset.set(1, 1, 1);
      camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance);
      controls.update(); render();
    };
    controlsRef.current?.({ zoomIn: () => zoom(.82), zoomOut: () => zoom(1.22), topView: () => reset(new THREE.Vector3(0, 1, .005)) });
    controls.addEventListener("change", render);
    const resize = new ResizeObserver(() => {
      if (!element.clientWidth || !element.clientHeight) return;
      // Supersample even on a 1x display; bound the buffer for large screens and high-DPI phones.
      renderer.setPixelRatio(Math.max(1, Math.min(Math.max(window.devicePixelRatio, 2), 3, Math.sqrt(8_000_000 / (element.clientWidth * element.clientHeight)))));
      renderer.setSize(element.clientWidth, element.clientHeight);
      const aspect = element.clientWidth / element.clientHeight; const changed = Math.abs(camera.aspect - aspect) > .05;
      camera.aspect = aspect; camera.updateProjectionMatrix();
      if (changed && content.children.length) reset(); else render();
    }); resize.observe(element);
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
    const pointerUp = (event: PointerEvent) => {
      if (moveRef.current.id) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      for (const { object } of raycaster.intersectObjects(content.children, true)) {
        let ancestor: THREE.Object3D | null = object;
        let visible = true, furniture: string | undefined;
        while (ancestor) { if (!ancestor.visible) visible = false; if (ancestor.userData.furnishingId) furniture = ancestor.userData.furnishingId as string; ancestor = ancestor.parent; }
        if (!visible) continue;
        if (furniture) { selectRef.current("interior", furniture); break; }
        if (object.userData.floor || object.userData.wall !== undefined) { selectRef.current(object.userData.floor ? "floor" : object.userData.wall); break; }
      }
    };
    const lost = (event: Event) => { event.preventDefault(); setError("Браузер остановил 3D. Откройте план, чтобы продолжить работу и сохранить проект."); };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    onCapture(() => { updateWalls(); renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); });
    setReady(true);
    return () => {
      stopped = true; cancelAnimationFrame(frame); resize.disconnect(); themeObserver.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeGroup(content); disposeGroup(selection); grid.geometry.dispose(); (grid.material as THREE.Material).dispose();
      environmentTarget.dispose(); sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      runtime.current = undefined; onCapture(null); controlsRef.current?.(null);
    };
  }, [onCapture]);

  useEffect(() => {
    const current = runtime.current;
    if (!current || !ready) return;
    disposeGroup(current.content); buildRoom(current.content, room, calculation, furnished, Math.min(16, current.renderer.capabilities.getMaxAnisotropy()), current.render);
    const extent = Math.max(room.widthMm, room.lengthMm, room.heightMm) / 1000;
    current.sun.position.set(-extent * .35, extent * 1.4, -extent * 1.1);
    const shadow = current.sun.shadow.camera;
    shadow.left = shadow.bottom = -extent * 1.15; shadow.right = shadow.top = extent * 1.15;
    shadow.far = extent * 5; shadow.updateProjectionMatrix();
    const size = `${room.widthMm}/${room.lengthMm}/${room.heightMm}`;
    if (current.roomId !== room.id || current.size !== size) { current.roomId = room.id; current.size = size; current.reset(); }
    current.render();
  }, [room, calculation, furnished, ready]);

  useEffect(() => {
    const current = runtime.current;
    if (!current || !ready) return;
    disposeGroup(current.selection);
    let selectionLabel = "";
    if (selectedSurface !== null) {
      current.selection.add(createSurfaceHighlight(room, selectedSurface));
      selectionLabel = selectedSurface === "floor" ? " Выбран пол." : ` Выбрана стена ${selectedSurface + 1}.`;
    } else if (furnished && selectedFurnishing) {
      const highlight = createFurnishingHighlight(current.content, selectedFurnishing);
      if (highlight) {
        current.selection.add(highlight);
        selectionLabel = ` Выбран предмет: ${furnishingName(room, selectedFurnishing)}.`;
      }
    }
    current.renderer.domElement.setAttribute("aria-label", `Трёхмерная модель комнаты.${selectionLabel} ${movingFurnishing ? "Перетаскивайте выбранный предмет. Стрелки — сдвиг, Escape — отмена." : "Перетаскивайте для вращения, используйте два пальца для масштаба."}`);
    current.render();
  }, [selectedSurface, selectedFurnishing, movingFurnishing, room, calculation, furnished, ready]);

  useEffect(() => {
    const current = runtime.current;
    if (!current || !ready || !movingFurnishing) return;
    current.controls.enabled = false;
    const dispose = attachFurnishingDrag({ canvas: current.renderer.domElement, camera: current.camera, content: current.content, selection: current.selection, room, id: movingFurnishing, render: current.render,
      onPosition: (id, position) => moveRef.current.onPosition(id, position), onGesture: (active) => moveRef.current.onGesture(active), onExit: () => moveRef.current.onExitMove() });
    return () => { dispose(); current.controls.enabled = true; };
  }, [room, movingFurnishing, ready, resetToken]);

  useEffect(() => {
    if (!runtime.current) return;
    runtime.current.allWalls = allWalls; runtime.current.render();
  }, [allWalls, ready]);

  useEffect(() => { runtime.current?.reset(); }, [resetToken]);

  return <><div className={styles.scene} ref={host} data-testid="constructor-3d" />{error && <div className={styles.sceneError} role="status"><p>{error}</p><button type="button" onClick={onFallback}>Перейти к плану</button></div>}</>;
}
