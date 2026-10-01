import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { configureLaminateMaterial, LAMINATE_EDGE_PREVIEW } from "../../src/components/constructor/laminate-material";

function compile(direction: "width" | "length") {
  const material = new THREE.MeshStandardMaterial();
  configureLaminateMaterial(material, direction);
  const shader = { vertexShader: '#include <common>\n#include <uv_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>', uniforms: {} };
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return { material, shader };
}

describe("Readable, subtle laminate joints", () => {
  it("keeps a soft screen-space edge on the top of actual pieces, independently of cropped texture UVs", () => {
    const { shader, material } = compile("length");
    expect(shader.vertexShader).toContain('vPlankEdgeUv = uv;');
    expect(shader.vertexShader).toContain('step(0.5, normal.y)');
    expect(shader.fragmentShader).toContain('fwidth(vPlankEdgeUv)');
    expect(shader.fragmentShader).toContain('vPlankTop');
    expect(shader.fragmentShader).toContain('smoothstep');
    expect(LAMINATE_EDGE_PREVIEW.shade).toBeLessThanOrEqual(.3);
    expect(LAMINATE_EDGE_PREVIEW.pixelWidth).toBeLessThanOrEqual(1.5);
    material.dispose();
  });
  it.each(["width", "length"] as const)("preserves the %s crop for all maps and uses a distinct shader cache key", (direction) => {
    const { shader, material } = compile(direction);
    expect(shader.vertexShader).toContain(direction === "length" ? 'vec2(1.0 - uv.y, uv.x) * boardUv.xy + boardUv.zw' : 'vec2(uv.x, 1.0 - uv.y) * boardUv.xy + boardUv.zw');
    for (const map of ['vMapUv', 'vBumpMapUv', 'vRoughnessMapUv']) expect(shader.vertexShader).toContain(`${map} = plankUv;`);
    expect(material.customProgramCacheKey()).toBe(`constructor-plank-maps-v4-${direction}-1.4-0.26`);
    material.dispose();
  });
});
