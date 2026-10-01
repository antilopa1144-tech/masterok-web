import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ConstructorRoom, FurnishingDimensions } from "@/lib/constructor/core";
import { interiorFor, layoutFurnishings } from "@/lib/constructor/interiors";
import { createFixture } from "./room-fixtures";

const FLOOR_Y = .023;
const SOFA_LENGTH = 2.05;
const SOFA_DEPTH = .88;

function fabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 192;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#dedad2"; context.fillRect(0, 0, 192, 192);
  for (let line = 0; line < 192; line += 6) {
    context.strokeStyle = line % 12 ? "rgba(104,96,86,.08)" : "rgba(255,255,255,.2)";
    context.lineWidth = 1; context.beginPath(); context.moveTo(0, line + .5); context.lineTo(192, line + .5); context.stroke();
    context.beginPath(); context.moveTo(line + .5, 0); context.lineTo(line + .5, 192); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 3);
  return texture;
}

function rounded(width: number, height: number, depth: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function addSofa(group: THREE.Group, position: THREE.Vector3, rotationY: number, fabric: THREE.Material, accent: THREE.Material, legMaterial: THREE.Material): THREE.Box3 {
  const sofa = new THREE.Group(); sofa.position.copy(position); sofa.rotation.y = rotationY;
  const base = rounded(SOFA_LENGTH, .18, SOFA_DEPTH, .08, fabric); base.position.y = FLOOR_Y + .24; sofa.add(base);
  const back = rounded(SOFA_LENGTH - .18, .32, .12, .06, fabric); back.position.set(0, FLOOR_Y + .51, SOFA_DEPTH / 2 - .12); sofa.add(back);
  for (const x of [-.68, 0, .68]) {
    const cushion = rounded(.61, .14, .64, .055, fabric); cushion.position.set(x, FLOOR_Y + .37, -.035); cushion.rotation.x = -.035; sofa.add(cushion);
    const backCushion = rounded(.59, .31, .105, .055, fabric); backCushion.position.set(x, FLOOR_Y + .59, .245); backCushion.rotation.x = -.16; sofa.add(backCushion);
  }
  for (const x of [-SOFA_LENGTH / 2 + .075, SOFA_LENGTH / 2 - .075]) {
    const arm = rounded(.15, .39, .79, .065, fabric); arm.position.set(x, FLOOR_Y + .45, -.005); sofa.add(arm);
  }
  const pillow = rounded(.28, .12, .27, .045, accent); pillow.position.set(.34, FLOOR_Y + .53, -.14); pillow.rotation.set(-.07, .2, .04); sofa.add(pillow);
  for (const x of [-SOFA_LENGTH / 2 + .16, SOFA_LENGTH / 2 - .16]) for (const z of [-SOFA_DEPTH / 2 + .14, SOFA_DEPTH / 2 - .14]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .18, 8), legMaterial); leg.position.set(x, FLOOR_Y + .09, z); leg.castShadow = true; sofa.add(leg);
  }
  group.add(sofa); sofa.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(sofa);
}

function addTable(group: THREE.Group, position: THREE.Vector3, wood: THREE.Material, legMaterial: THREE.Material) {
  const table = new THREE.Group(); table.position.copy(position);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .052, 48), wood); top.scale.z = .7; top.position.y = FLOOR_Y + .39; top.castShadow = true; top.receiveShadow = true; table.add(top);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, .34, 20), legMaterial); stem.position.y = FLOOR_Y + .2; stem.castShadow = true; table.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.25, .28, .026, 32), legMaterial); foot.position.y = FLOOR_Y + .018; foot.castShadow = true; table.add(foot);
  group.add(table);
}

function addPlant(group: THREE.Group, greens: readonly [THREE.Material, THREE.Material], pot: THREE.Material) {
  const plant = new THREE.Group();
  const planter = new THREE.Mesh(new THREE.CylinderGeometry(.15, .125, .29, 20), pot); planter.position.y = FLOOR_Y + .145; planter.castShadow = true; plant.add(planter);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: "#466043", roughness: .8, metalness: 0 });
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.073, .11, .043, .23); leafShape.quadraticCurveTo(.018, .35, 0, .4);
  leafShape.quadraticCurveTo(-.018, .35, -.043, .23); leafShape.quadraticCurveTo(-.073, .11, 0, 0);
  const leafGeometry = new THREE.ShapeGeometry(leafShape);
  const potTop = FLOOR_Y + .29;
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * Math.PI * 2 + .18;
    const height = .38 + (index % 3) * .065;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.009, .014, height, 7), stemMaterial);
    stem.position.set(Math.cos(angle) * .035, potTop + height / 2, Math.sin(angle) * .035); stem.rotation.z = Math.cos(angle) * .12; stem.castShadow = true; plant.add(stem);
  }
  for (let index = 0; index < 14; index++) {
    const angle = index / 14 * Math.PI * 2 + .11 * (index % 3);
    const height = potTop + .19 + (index % 4) * .055;
    const leaf = new THREE.Mesh(leafGeometry, greens[index % 2]);
    leaf.position.set(Math.cos(angle) * (.035 + (index % 3) * .018), height, Math.sin(angle) * (.035 + (index % 3) * .018));
    leaf.rotation.y = angle; leaf.rotation.z = .26 + (index % 5) * .03; leaf.rotation.x = Math.sin(angle) * .17;
    leaf.scale.set(.78 + (index % 3) * .1, .84 + (index % 4) * .055, 1); leaf.castShadow = true; leaf.receiveShadow = true; plant.add(leaf);
  }
  group.add(plant);
}

/** Подгоняем общий габарит, включая выступающие детали, и ставим низ модели на уровень пола. */
export function fitFurnishingModel(model: THREE.Group, dimensions: FurnishingDimensions): void {
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;
  model.scale.set(dimensions.widthMm / 1000 / size.x, dimensions.heightMm / 1000 / size.y, dimensions.depthMm / 1000 / size.z);
  model.position.set(-center.x * model.scale.x, -bounds.min.y * model.scale.y, -center.z * model.scale.z);
}

/** Габаритные модели обстановки не входят в расчёты материалов. */
export function buildFurnishings(room: ConstructorRoom): THREE.Group {
  const group = new THREE.Group(); group.name = "decorative-furnishings"; group.userData.ignoreCameraFit = true;
  const layout = layoutFurnishings(room);
  if (!layout.placements.length) return group;
  let fabric: THREE.MeshStandardMaterial | undefined;
  const getFabric = () => {
    if (!fabric) { const map = fabricTexture(); fabric = new THREE.MeshStandardMaterial({ color: "#e5e1d9", map, bumpMap: map, bumpScale: .006, roughness: .92 }); }
    return fabric;
  };
  for (const placement of layout.placements) {
    const item = new THREE.Group(), model = new THREE.Group(); item.name = placement.kind; model.name = "furnishing-model"; item.userData.furnishingKind = placement.kind; item.userData.furnishingId = placement.id;
    const instance = interiorFor(room).items.find((value) => value.id === placement.id)!;
    if (placement.kind === "sofa") {
      addSofa(model, new THREE.Vector3(0, -FLOOR_Y, 0), 0, getFabric(), new THREE.MeshStandardMaterial({ color: "#bc684d", roughness: .83 }), new THREE.MeshStandardMaterial({ color: "#625e57", roughness: .48, metalness: .08 }));
    } else if (placement.kind === "coffee-table") {
      addTable(model, new THREE.Vector3(0, -FLOOR_Y, 0), new THREE.MeshStandardMaterial({ color: "#a7774f", roughness: .56 }), new THREE.MeshStandardMaterial({ color: "#625e57", roughness: .48, metalness: .08 }));
      const rotated = Math.abs(Math.sin(placement.rotation)) > .5;
      const availableX = 2 * Math.min(placement.centerXmm, room.widthMm - placement.centerXmm) / 1000 - .15;
      const availableZ = 2 * Math.min(placement.centerYmm, room.lengthMm - placement.centerYmm) / 1000 - .15;
      const width = Math.min(1.9, rotated ? availableZ : availableX), depth = Math.min(1.3, rotated ? availableX : availableZ);
      if (width > .1 && depth > .1) {
        const rug = rounded(width, .012, depth, .035, new THREE.MeshStandardMaterial({ color: "#c9c3b8", map: getFabric().map, roughness: 1 }));
        rug.position.y = .007; item.add(rug);
      }
    } else if (placement.kind === "plant") {
      const greens: readonly [THREE.Material, THREE.Material] = [new THREE.MeshStandardMaterial({ color: "#4f704f", roughness: .72, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: "#78956e", roughness: .7, side: THREE.DoubleSide })];
      addPlant(model, greens, new THREE.MeshStandardMaterial({ color: "#d6d0c4", roughness: .74 }));
      model.children[0].position.y = -FLOOR_Y;
    } else {
      // Лёгкий материал без карты для предметов без текстиля.
      const needsFabric = ["bed", "office-chair", "dining-table", "towel-rail"].includes(placement.kind);
      model.add(createFixture(placement.kind, needsFabric ? getFabric() : undefined));
    }
    if (instance.dimensions) fitFurnishingModel(model, instance.dimensions);
    item.add(model);
    item.position.set((placement.centerXmm - room.widthMm / 2) / 1000, FLOOR_Y, (placement.centerYmm - room.lengthMm / 2) / 1000);
    item.rotation.y = placement.rotation;
    group.add(item);
  }
  group.userData.layout = layout;
  return group;
}
