import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../engine/constructor/calculate";
import { calculateFloorTiles, createFloorTileSpec } from "../../engine/constructor/floor-tiles";
import { TILE_DECORS } from "../../src/lib/constructor/tile-materials";
import { addFloorTileMesh } from "../../src/components/constructor/wall-tile-mesh";

afterEach(() => vi.restoreAllMocks());

const luminance = (color: THREE.Color) => .2126 * color.r + .7152 * color.g + .0722 * color.b;

describe("Constructor tile joint visibility", () => {
  it.each(TILE_DECORS)("keeps grout distinct from both $id tile shades", (decor) => {
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockReturnValue(new THREE.Texture());
    const room = createDefaultProject().rooms[0];
    room.floor.kind = "tile"; room.floor.tile = { ...createFloorTileSpec(), decor: decor.id };
    const group = new THREE.Group();
    addFloorTileMesh(group, room, calculateFloorTiles(room), 1, () => {}, () => false);
    const base = group.children.find((object) => object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh)) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    expect(base).toBeDefined();
    const grout = luminance(base.material.color);
    for (const shade of [decor.color, decor.light]) {
      const tile = luminance(new THREE.Color(shade));
      // A preview contrast floor, not a requirement for real grout products.
      const contrast = (Math.max(tile, grout) + .05) / (Math.min(tile, grout) + .05);
      expect(contrast).toBeGreaterThanOrEqual(2);
    }
  });
});
