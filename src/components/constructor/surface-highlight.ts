import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { ConstructorRoom, Wall } from "@/lib/constructor/core";

export type SelectedSurface = "floor" | Wall | null;
type RoomSize = Pick<ConstructorRoom, "widthMm" | "lengthMm" | "heightMm">;

export function createSurfaceHighlight(room: RoomSize, surface: Exclude<SelectedSurface, null>) {
  const w = room.widthMm / 1000, l = room.lengthMm / 1000, h = room.heightMm / 1000;
  // Selection is an overlay of the whole surface, including openings and hidden walls.
  // It does not participate in material geometry, picking or camera fitting.
  const points = surface === "floor"
    ? [-w / 2, .027, -l / 2, w / 2, .027, -l / 2, w / 2, .027, l / 2, -w / 2, .027, l / 2]
    : surface === 0 ? [-w / 2, 0, -l / 2, w / 2, 0, -l / 2, w / 2, h, -l / 2, -w / 2, h, -l / 2]
    : surface === 1 ? [w / 2, 0, -l / 2, w / 2, 0, l / 2, w / 2, h, l / 2, w / 2, h, -l / 2]
    : surface === 2 ? [w / 2, 0, l / 2, -w / 2, 0, l / 2, -w / 2, h, l / 2, w / 2, h, l / 2]
    : [-w / 2, 0, l / 2, -w / 2, 0, -l / 2, -w / 2, h, -l / 2, -w / 2, h, l / 2];
  const geometry = new LineGeometry();
  geometry.setPositions([...points, ...points.slice(0, 3)]);
  const outline = new Line2(geometry, new LineMaterial({ color: "#f97316", linewidth: 2.5, depthTest: surface === "floor", depthWrite: false, toneMapped: false }));
  outline.renderOrder = 20;
  outline.userData.ignoreCameraFit = true;
  outline.raycast = () => {};
  return outline;
}
