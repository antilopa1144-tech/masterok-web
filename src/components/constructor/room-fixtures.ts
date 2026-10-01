import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { FurnishingKind } from "@/lib/constructor/core";

type Material = THREE.MeshStandardMaterial;
function block(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, radius = .014) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3)), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function cylinder(g: THREE.Group, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function pipe(g: THREE.Group, a: [number, number, number], b: [number, number, number], radius: number, material: THREE.Material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), vector = end.clone().sub(start);
  const mesh = cylinder(g, radius, vector.length(), 0, 0, 0, material);
  mesh.position.copy(start.add(end).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize()); return mesh;
}
function roundedShape(w: number, d: number, r: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -d / 2); shape.lineTo(w / 2 - r, -d / 2); shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r); shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2); shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r); shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return shape;
}
function rim(g: THREE.Group, w: number, d: number, innerW: number, innerD: number, h: number, x: number, y: number, z: number, material: THREE.Material) {
  const shape = roundedShape(w, d, Math.min(w, d) * .17);
  const inner = roundedShape(innerW, innerD, Math.min(innerW, innerD) * .24);
  shape.holes.push(new THREE.Path(inner.getPoints(16)));
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 16 }), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}

/** Детали условных предметов. Локальная задняя грань +Z, лицевая грань -Z. */
export function createFixture(kind: FurnishingKind, fabric?: THREE.Material): THREE.Group {
  const g = new THREE.Group(); g.name = kind;
  const cache = new Map<string, Material>();
  const material = (name: string, color: string, roughness = .65, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => {
    if (!cache.has(name)) cache.set(name, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
    return cache.get(name)!;
  };
  const ceramic = () => material("ceramic", "#faf9f5", .2);
  const inner = () => material("inner", "#e2e7e5", .29);
  const chrome = () => material("chrome", "#c8d1d3", .18, .95);
  const wood = () => material("wood", "#ba9676", .63);
  const sage = () => material("sage", "#8f9e90", .63);
  const dark = () => material("dark", "#26363a", .47, .12);
  const glass = () => material("glass", "#b8dae0", .13, .16, { transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide });
  const textile = () => fabric ?? material("textile", "#e5e1d9", .92);
  const faucet = (x: number, y: number, z: number) => {
    cylinder(g, .022, .17, x, y + .085, z, chrome());
    pipe(g, [x, y + .17, z], [x, y + .17, z - .12], .015, chrome());
    pipe(g, [x, y + .17, z - .12], [x, y + .13, z - .12], .012, chrome());
    block(g, .055, .012, .03, x, y + .185, z, chrome(), .005);
  };
  const mirror = (w: number, h: number, y: number, z: number) => {
    block(g, w + .025, h + .025, .026, 0, y, z, material("mirror-frame", "#f3e8d4", .4, 0, { emissive: "#ead8b7", emissiveIntensity: .25 }));
    block(g, w, h, .009, 0, y, z - .02, material("mirror", "#b3c4c5", .14, .88), .012);
  };
  if (kind === "washer") {
    block(g, .6, .81, .6, 0, .435, 0, ceramic(), .035);
    block(g, .56, .12, .018, 0, .752, -.302, inner());
    block(g, .185, .05, .013, -.17, .761, -.314, ceramic(), .005);
    block(g, .095, .037, .008, .183, .767, -.316, dark(), .004);
    const dial = cylinder(g, .029, .02, .075, .76, -.322, chrome()); dial.rotation.x = Math.PI / 2;
    block(g, .043, .013, .009, .184, .767, -.322, material("display", "#79b8bc", .3, 0, { emissive: "#79b8bc", emissiveIntensity: .25 }), .003);
    const drum = cylinder(g, .18, .018, 0, .412, -.306, dark()); drum.rotation.x = Math.PI / 2;
    const door = new THREE.Mesh(new THREE.TorusGeometry(.198, .022, 12, 56), chrome()); door.position.set(0, .412, -.322); door.castShadow = true; g.add(door);
    const seal = new THREE.Mesh(new THREE.TorusGeometry(.17, .013, 10, 48), dark()); seal.position.set(0, .412, -.331); g.add(seal);
    const window = new THREE.Mesh(new THREE.SphereGeometry(.169, 32, 20), material("washer-glass", "#5e7c85", .13, .32));
    window.scale.z = .22; window.position.set(0, .412, -.326); window.castShadow = true; g.add(window);
    for (const x of [-.23, .23]) for (const z of [-.22, .22]) cylinder(g, .027, .035, x, .0175, z, dark());
    g.position.z = .03;
  } else if (kind === "bathtub") {
    // Открытая чаша с бортом, дном и отдельными стенками вместо сплошного белого блока.
    block(g, 1.58, .1, .67, 0, .09, 0, ceramic(), .065);
    for (const z of [-.337, .337]) block(g, 1.64, .42, .078, 0, .32, z, ceramic(), .045);
    for (const x of [-.785, .785]) block(g, .13, .42, .68, x, .32, 0, ceramic(), .045);
    block(g, 1.42, .07, .54, 0, .21, 0, inner(), .1);
    rim(g, 1.7, .76, 1.43, .55, .065, 0, .5, 0, ceramic());
    rim(g, 1.45, .58, 1.36, .49, .19, 0, .30, 0, inner());
    cylinder(g, .027, .006, -.46, .249, 0, chrome()); faucet(.53, .565, .29);
  } else if (kind === "vanity") {
    block(g, .66, .44, .47, 0, .46, 0, wood(), .022);
    for (const y of [.355, .555]) block(g, .635, .18, .015, 0, y, -.242, wood(), .01);
    for (const y of [.42, .62]) block(g, .25, .012, .015, 0, y, -.256, chrome(), .004);
    block(g, .7, .035, .5, 0, .7, 0, ceramic());
    block(g, .49, .025, .30, 0, .742, -.03, inner(), .06);
    rim(g, .55, .37, .45, .27, .052, 0, .744, -.02, ceramic());
    faucet(0, .72, .2); mirror(.58, .77, 1.48, .224);
    for (const x of [-.23, .23]) cylinder(g, .014, .23, x, .115, .13, dark());
  } else if (kind === "toilet") {
    block(g, .26, .30, .43, 0, .17, -.075, ceramic(), .09);
    const bowl = cylinder(g, .18, .18, 0, .35, -.07, ceramic()); bowl.scale.z = 1.34;
    block(g, .30, .025, .37, 0, .40, -.10, inner(), .1);
    rim(g, .4, .50, .25, .35, .035, 0, .43, -.095, ceramic());
    block(g, .36, .38, .18, 0, .60, .23, ceramic(), .04);
    block(g, .38, .027, .19, 0, .804, .23, ceramic()); cylinder(g, .019, .006, 0, .824, .23, chrome());
  } else if (kind === "shower") {
    block(g, .89, .07, .89, 0, .035, 0, ceramic(), .035);
    rim(g, .9, .9, .8, .8, .04, 0, .07, 0, ceramic());
    for (const x of [-.43, .43]) for (const z of [-.43, .43]) pipe(g, [x, .1, z], [x, 2.04, z], .012, chrome());
    block(g, .86, 1.87, .007, 0, 1.03, -.43, glass(), .003);
    block(g, .007, 1.87, .86, -.43, 1.03, 0, glass(), .003);
    pipe(g, [-.43, 2.04, -.43], [.43, 2.04, -.43], .013, chrome());
    pipe(g, [-.43, 2.04, -.43], [-.43, 2.04, .43], .013, chrome());
    pipe(g, [0, .95, .38], [0, 1.93, .38], .014, chrome()); pipe(g, [0, 1.93, .38], [0, 1.93, .06], .014, chrome());
    cylinder(g, .105, .018, 0, 1.92, .06, chrome()); block(g, .12, .035, .04, 0, 1.08, .35, chrome());
    pipe(g, [.3, .92, -.43], [.3, 1.17, -.43], .011, chrome());
  } else if (kind === "towel-rail") {
    for (const x of [-.23, .23]) pipe(g, [x, .58, .035], [x, 1.64, .035], .016, chrome());
    for (let i = 0; i < 8; i++) pipe(g, [-.23, .61 + i * .14, .02], [.23, .61 + i * .14, .02], .013, chrome());
    block(g, .30, .44, .025, .055, 1.03, -.005, textile(), .008);
  } else if (kind === "kitchen-unit") {
    block(g, 2.38, .79, .6, 0, .475, 0, wood());
    block(g, 2.3, .085, .50, 0, .058, .018, dark());
    block(g, 2.4, .045, .64, 0, .902, 0, material("countertop", "#d3d1c5", .35));
    for (const x of [-.9, -.3, .3, .9]) {
      block(g, .57, .745, .018, x, .475, -.308, sage()); block(g, .18, .012, .02, x, .79, -.327, chrome(), .003);
      block(g, .58, .66, .33, x, 1.80, .137, ceramic()); block(g, .55, .63, .014, x, 1.80, -.036, ceramic());
    }
    block(g, .59, .018, .46, -.6, .936, -.04, dark());
    for (const x of [-.77, -.43]) for (const z of [-.14, .06]) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(.065, .004, 6, 28), chrome()); coil.rotation.x = Math.PI / 2; coil.position.set(x, .948, z); g.add(coil);
    }
    block(g, .45, .016, .34, .64, .936, -.03, dark()); rim(g, .50, .38, .42, .30, .012, .64, .94, -.03, chrome()); faucet(.64, .929, .19);
  } else if (kind === "fridge") {
    block(g, .64, 1.82, .65, 0, .94, 0, ceramic(), .03);
    for (const [height, y] of [[1.20, 1.24], [.53, .345]]) block(g, .60, height, .019, 0, y, -.337, inner(), .01);
    for (const y of [.65, 1.01]) block(g, .022, .25, .025, -.235, y, -.359, chrome(), .006);
    g.position.z = .022;
  } else if (kind === "bed") {
    block(g, 1.72, .24, 2.14, 0, .26, 0, wood(), .04);
    block(g, 1.64, .22, 2.03, 0, .48, -.015, textile(), .055);
    block(g, 1.72, .91, .10, 0, .575, 1.03, sage(), .03);
    for (const x of [-.57, 0, .57]) block(g, .55, .80, .035, x, .575, .968, sage(), .018);
    block(g, 1.63, .075, 1.43, 0, .61, -.33, material("duvet", "#c8b49b", .96), .038);
    for (const x of [-.42, .42]) block(g, .64, .14, .39, x, .635, .72, textile(), .065);
    for (const x of [-.68, .68]) for (const z of [-.83, .83]) block(g, .055, .15, .055, x, .075, z, dark());
  } else if (kind === "nightstand") {
    block(g, .45, .42, .42, 0, .33, 0, wood(), .02);
    block(g, .42, .29, .018, 0, .34, -.218, sage()); block(g, .15, .009, .02, 0, .41, -.222, chrome(), .003);
    for (const x of [-.16, .16]) for (const z of [-.16, .16]) block(g, .025, .12, .025, x, .06, z, dark());
    g.position.z = .008;
  } else if (kind === "wardrobe") {
    block(g, 1.20, 2.09, .52, 0, 1.07, 0, wood(), .018);
    for (const x of [-.295, .295]) block(g, .582, 2.02, .022, x, 1.09, -.265, ceramic());
    for (const x of [-.045, .045]) block(g, .012, .25, .02, x, 1.08, -.285, dark(), .004);
    g.position.z = .005;
  } else if (kind === "console") {
    block(g, .90, .045, .34, 0, .855, 0, wood());
    block(g, .86, .16, .30, 0, .745, 0, sage());
    for (const x of [-.37, .37]) for (const z of [-.12, .12]) block(g, .025, .66, .025, x, .33, z, dark());
    mirror(.64, .74, 1.47, .13);
  } else if (kind === "desk") {
    block(g, 1.35, .04, .66, 0, .75, 0, wood());
    for (const x of [-.58, .58]) for (const z of [-.245, .245]) block(g, .035, .73, .035, x, .365, z, dark());
    cylinder(g, .07, .04, 0, .79, .13, dark()); pipe(g, [0, .8, .14], [0, .95, .14], .02, dark());
    block(g, .50, .30, .023, 0, 1.07, .14, dark()); block(g, .45, .25, .006, 0, 1.07, .122, material("screen", "#819fa7", .4, 0, { emissive: "#667e86", emissiveIntensity: .12 }));
    block(g, .32, .013, .12, 0, .784, -.12, inner());
  } else if (kind === "office-chair") {
    cylinder(g, .045, .38, 0, .23, 0, chrome());
    for (let i = 0; i < 5; i++) {
      const angle = i / 5 * Math.PI * 2, x = Math.sin(angle) * .28, z = Math.cos(angle) * .28;
      pipe(g, [0, .09, 0], [x, .045, z], .016, dark()); cylinder(g, .028, .04, x, .032, z, dark());
    }
    block(g, .54, .08, .51, 0, .46, 0, textile(), .035);
    block(g, .48, .56, .055, 0, .83, .235, sage(), .025);
    for (const x of [-.3, .3]) { pipe(g, [x, .46, .1], [x, .65, .1], .012, chrome()); block(g, .035, .025, .30, x, .66, -.015, dark()); }
  } else if (kind === "dining-table") {
    block(g, 1.16, .045, .72, 0, .76, 0, wood(), .1);
    for (const x of [-.47, .47]) for (const z of [-.25, .25]) pipe(g, [x, .03, z], [x * .88, .74, z * .85], .025, dark());
    for (const z of [-.47, .47]) {
      block(g, .43, .045, .40, 0, .46, z, textile(), .03);
      block(g, .43, .38, .025, 0, .64, z + Math.sign(z) * .16, sage());
      for (const x of [-.16, .16]) for (const dz of [-.145, .145]) pipe(g, [x, .025, z + dz], [x * .9, .44, z + dz * .9], .014, dark());
    }
  }
  return g;
}
