import { afterEach, describe, expect, it } from "vitest";
import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { createFurnishingHighlight, FURNISHING_HIGHLIGHT_COLORS, setFurnishingHighlightWarning } from "../../src/components/constructor/furnishing-highlight";

const resources: Array<{ dispose: () => void }> = [];
afterEach(() => { resources.splice(0).forEach((resource) => resource.dispose()); });

function furnishing(id: string, size: [number, number, number] = [1, 2, 3]) {
  const item = new Group(), model = new Group();
  item.userData.furnishingId = id;
  model.name = "furnishing-model";
  const geometry = new BoxGeometry(...size), material = new MeshBasicMaterial();
  resources.push(geometry, material);
  model.add(new Mesh(geometry, material)); item.add(model);
  return { item, model };
}

function highlight(content: Group, id: string) {
  const result = createFurnishingHighlight(content, id);
  if (result) resources.push(result.geometry, result.material);
  return result;
}

describe("Furnishing selection in 3D", () => {
  it("switches warning brackets without modifying model materials or their geometry", () => {
    const content = new Group(), { item, model } = furnishing("washer"); content.add(item);
    const frame = highlight(content, "washer")!, geometry = frame.geometry;
    const modelMaterial = (model.children[0] as Mesh<BoxGeometry, MeshBasicMaterial>).material, originalColor = modelMaterial.color.clone();
    const selection = new Group().add(frame, model);
    setFurnishingHighlightWarning(selection, true);
    expect(frame.material.color).toEqual(new Color(FURNISHING_HIGHLIGHT_COLORS.warning));
    expect(frame.material.linewidth).toBe(3);
    expect(modelMaterial.color).toEqual(originalColor); expect(frame.geometry).toBe(geometry);
    setFurnishingHighlightWarning(selection, false);
    expect(frame.material.color).toEqual(new Color(FURNISHING_HIGHLIGHT_COLORS.selected));
    expect(frame.material.linewidth).toBe(2.5);
  });

  it("selects the exact instance without including another instance or its decorative rug", () => {
    const content = new Group(), first = furnishing("first"), second = furnishing("second");
    first.item.add(new Group().add(second.item));
    second.item.position.x = 5;
    const rug = furnishing("rug", [10, .01, 10]).model;
    rug.name = "decorative-rug"; first.item.add(rug);
    content.add(first.item);
    const bounds = highlight(content, "first")!.geometry.boundingBox!;
    expect(bounds.min.x).toBeCloseTo(-.512); expect(bounds.max.x).toBeCloseTo(.512);
    const otherBounds = highlight(content, "second")!.geometry.boundingBox!;
    expect(otherBounds.min.x).toBeCloseTo(4.488); expect(otherBounds.max.x).toBeCloseTo(5.512);
  });

  it("follows parent translation, quarter-turn rotation and resized model before a render", () => {
    const content = new Group(), { item, model } = furnishing("washer");
    content.position.set(4, 1, -2); item.position.x = 1; item.rotation.y = Math.PI / 2;
    model.scale.set(2, .5, 1); content.add(item);
    const bounds = highlight(content, "washer")!.geometry.boundingBox!;
    [3.488, .488, -3.012].forEach((value, axis) => expect(bounds.min.getComponent(axis)).toBeCloseTo(value));
    [6.512, 1.512, -.988].forEach((value, axis) => expect(bounds.max.getComponent(axis)).toBeCloseTo(value));
  });

  it("updates after moving and resizing without changing the previous highlight", () => {
    const content = new Group(), { item, model } = furnishing("washer"); content.add(item);
    const before = highlight(content, "washer")!;
    item.position.z = 3; model.scale.x = 2;
    const after = highlight(content, "washer")!;
    expect(after.geometry.boundingBox!.max.x).toBeCloseTo(1.012);
    expect(after.geometry.boundingBox!.min.z).toBeCloseTo(1.488);
    expect(before.geometry.boundingBox!.max.x).toBeCloseTo(.512);
    expect(before.geometry.boundingBox!.min.z).toBeCloseTo(-1.512);
  });

  it("does not highlight a missing, hidden or unrendered item", () => {
    const content = new Group(), { item } = furnishing("washer"); content.add(item);
    expect(highlight(content, "missing")).toBeNull();
    content.visible = false;
    expect(highlight(content, "washer")).toBeNull();
    const empty = new Group(); empty.userData.furnishingId = "empty";
    const model = new Group(); model.name = "furnishing-model"; empty.add(model);
    expect(highlight(empty, "empty")).toBeNull();
  });

  it("does not intercept clicks on the selected item", () => {
    const content = new Group(), { item } = furnishing("washer"); content.add(item);
    const frame = highlight(content, "washer")!;
    const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    expect(ray.intersectObject(frame)).toEqual([]);
  });
});
