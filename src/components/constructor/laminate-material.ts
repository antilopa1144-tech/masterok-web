import type * as THREE from "three";
import type { FloorSpec } from "@/lib/constructor/core";

/** Мягкий стык: 1,4 пикселя рендера (до 0,7 px экрана при DPR ≥ 2), затемнение до 26%. */
export const LAMINATE_EDGE_PREVIEW = { pixelWidth: 1.4, shade: .26 } as const;

/** Общий источник UV для карт и отдельный контур каждой реальной детали раскроя. */
export function configureLaminateMaterial(wood: THREE.MeshStandardMaterial, direction: FloorSpec["direction"]): void {
  wood.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 boardUv;\nvarying vec2 vPlankEdgeUv;\nvarying float vPlankTop;");
    const mapping = direction === "length" ? "vec2(1.0 - uv.y, uv.x)" : "vec2(uv.x, 1.0 - uv.y)";
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
vec2 plankUv = ${mapping} * boardUv.xy + boardUv.zw;
vPlankEdgeUv = uv;
vPlankTop = step(0.5, normal.y);
#ifdef USE_MAP
vMapUv = plankUv;
#endif
#ifdef USE_BUMPMAP
vBumpMapUv = plankUv;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = plankUv;
#endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vPlankEdgeUv;\nvarying float vPlankTop;");
    // Контур привязан к геометрии детали, а не к обрезанному фрагменту фотографии.
    // Затемняем собственный цвет дерева: рисунок остаётся виден, чёрной обводки нет.
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
vec2 plankEdgeDistance = min(vPlankEdgeUv, vec2(1.0) - vPlankEdgeUv);
vec2 plankEdgePixel = max(fwidth(vPlankEdgeUv) * ${LAMINATE_EDGE_PREVIEW.pixelWidth.toFixed(2)}, vec2(0.00001));
vec2 plankEdgeCoverage = vec2(1.0) - smoothstep(vec2(0.0), plankEdgePixel, plankEdgeDistance);
diffuseColor.rgb *= 1.0 - max(plankEdgeCoverage.x, plankEdgeCoverage.y) * vPlankTop * ${LAMINATE_EDGE_PREVIEW.shade.toFixed(2)};`);
  };
  wood.customProgramCacheKey = () => `constructor-plank-maps-v4-${direction}-${LAMINATE_EDGE_PREVIEW.pixelWidth}-${LAMINATE_EDGE_PREVIEW.shade}`;
}
