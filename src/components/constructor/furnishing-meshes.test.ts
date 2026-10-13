import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { batchFurnishingMeshes } from "./furnishing-meshes";

describe("static furnishing batches", () => {
  it("preserves nested model bounds under rotation and custom scale", () => {
    const model = new THREE.Group(), inner = new THREE.Group();
    model.position.set(3, .02, -2); model.rotation.y = .7; model.scale.set(1.2, .8, .9);
    inner.rotation.x = .2; model.add(inner);
    const material = new THREE.MeshStandardMaterial();
    const first = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    const second = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 1, 8).toNonIndexed(), material);
    second.position.set(1, 1, 0); inner.add(first, second);
    const before = new THREE.Box3().setFromObject(model, true);
    batchFurnishingMeshes(model);
    const after = new THREE.Box3().setFromObject(model, true);
    expect(before.min.distanceTo(after.min)).toBeLessThan(.000001);
    expect(before.max.distanceTo(after.max)).toBeLessThan(.000001);
    let count = 0; model.traverse(o => { if (o instanceof THREE.Mesh) count++; });
    expect(count).toBe(1);
  });
  it("does not merge distinct materials or shadow policies", () => {
    const model = new THREE.Group(), material = new THREE.MeshStandardMaterial();
    const objects = [material, material, new THREE.MeshStandardMaterial()].map(m => new THREE.Mesh(new THREE.BoxGeometry(), m));
    objects[0].castShadow = true; model.add(...objects);
    batchFurnishingMeshes(model);
    expect(model.children).toHaveLength(3);
  });
});
