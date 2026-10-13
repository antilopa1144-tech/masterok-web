import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Keep each movable model, but submit its static parts in batches per material. */
export function batchFurnishingMeshes(model: THREE.Group): void {
  model.updateWorldMatrix(true, true);
  const inverse = model.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh[]>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh) return;
    // Transparent panes must retain per-object back-to-front sorting.
    if (object.material.transparent) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    const batch = batches.get(key) ?? []; batch.push(object); batches.set(key, batch);
  });
  const retired = new Set<THREE.BufferGeometry>();
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      return geometry;
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(part => part.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, meshes[0].material);
    mesh.castShadow = meshes[0].castShadow; mesh.receiveShadow = meshes[0].receiveShadow;
    meshes.forEach(part => { part.removeFromParent(); retired.add(part.geometry); });
    model.add(mesh);
  }
  // Some primitives (e.g. leaves) share geometry with an unbatched part.
  model.traverse(object => { if (object instanceof THREE.Mesh) retired.delete(object.geometry); });
  retired.forEach(geometry => geometry.dispose());
}
