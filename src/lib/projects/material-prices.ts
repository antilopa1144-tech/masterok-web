import { getPrices, PRICE_SCOPES, setPrice } from "@/lib/userPrices";
import type { ProjectWithEntries } from "@/lib/storage/types";

export function materialPriceScopeForCalculator(slug: string): string {
  return `${PRICE_SCOPES.materials}:${slug}`;
}

/** Цена позиции: сначала из калькулятора, затем общая. */
export function resolveMaterialUnitPrice(
  materialName: string,
  scopedPrices: Record<string, number>,
  globalPrices: Record<string, number>,
): number {
  const scoped = scopedPrices[materialName];
  if (scoped !== undefined && scoped > 0) return scoped;
  const global = globalPrices[materialName];
  return global !== undefined && global > 0 ? global : 0;
}

/** Карта «название → актуальная цена» для всего проекта. */
export async function loadResolvedPriceMap(
  project: ProjectWithEntries,
): Promise<Record<string, number>> {
  const globalPrices = await getPrices(PRICE_SCOPES.materials);
  const resolved: Record<string, number> = { ...globalPrices };

  for (const entry of project.entries) {
    const scoped = await getPrices(materialPriceScopeForCalculator(entry.slug));
    for (const material of entry.materials) {
      const price = resolveMaterialUnitPrice(material.name, scoped, globalPrices);
      if (price > 0) resolved[material.name] = price;
    }
  }

  return resolved;
}

/** Записать цену в общий справочник и во все расчёты проекта с этой позицией. */
export async function setMaterialPriceForProject(
  project: ProjectWithEntries,
  materialName: string,
  value: number,
): Promise<void> {
  await setPrice(PRICE_SCOPES.materials, materialName, value);
  const slugs = new Set(
    project.entries
      .filter((e) => e.materials.some((m) => m.name === materialName))
      .map((e) => e.slug),
  );
  await Promise.all(
    [...slugs].map((slug) => setPrice(materialPriceScopeForCalculator(slug), materialName, value)),
  );
}
