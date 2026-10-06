import { Box3, Vector3, type Object3D } from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export const FURNISHING_HIGHLIGHT_COLORS = { selected: "#f97316", warning: "#ef4444" };

/** Change only selection brackets, without tinting the furnishing's materials. */
export function setFurnishingHighlightWarning(highlight: Object3D, warning: boolean) {
  highlight.traverse((object) => {
    if (object instanceof LineSegments2 && object.userData.furnishingHighlight) {
      object.material.color.set(warning ? FURNISHING_HIGHLIGHT_COLORS.warning : FURNISHING_HIGHLIGHT_COLORS.selected);
      object.material.linewidth = warning ? 3 : 2.5;
    }
  });
}

/** Selection brackets follow the rendered model, excluding decorative rugs. */
export function createFurnishingHighlight(content: Object3D, id: string) {
  let model: Object3D | undefined;
  content.traverseVisible((object) => {
    if (object.userData.furnishingId === id) model = object.getObjectByName("furnishing-model");
  });
  if (!model) return null;
  model.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(model, true);
  if (bounds.isEmpty()) return null;
  // A small visual offset keeps the brackets clear of the model's surfaces.
  bounds.expandByScalar(.012);
  const size = bounds.getSize(new Vector3());
  const corner = Math.min(size.x, size.y, size.z, .6) * .22;
  const positions: number[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = [x, y, z];
    for (let axis = 0; axis < 3; axis++) {
      const end = [...point];
      end[axis] += point[axis] === bounds.min.getComponent(axis) ? corner : -corner;
      positions.push(...point, ...end);
    }
  }
  const geometry = new LineSegmentsGeometry().setPositions(positions);
  const outline = new LineSegments2(geometry, new LineMaterial({ color: FURNISHING_HIGHLIGHT_COLORS.selected, linewidth: 2.5, depthTest: true, depthWrite: false, toneMapped: false }));
  outline.renderOrder = 20;
  outline.userData.ignoreCameraFit = true;
  outline.userData.furnishingHighlight = true;
  outline.raycast = () => {};
  return outline;
}
