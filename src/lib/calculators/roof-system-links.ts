export const ROOFING_TRANSFER_FROM = "krovlya";
export const SOFT_ROOFING_TRANSFER_FROM = "myagkaya-krovlya";
export const GUTTERS_TRANSFER_FROM = "vodostok";

export type RoofSystemTarget = typeof SOFT_ROOFING_TRANSFER_FROM | typeof GUTTERS_TRANSFER_FROM | typeof ROOFING_TRANSFER_FROM;

export interface RoofSystemLink {
  target: RoofSystemTarget;
  title: string;
  description: string;
  href: string;
}

export interface RoofingProjectInputs {
  ridgeProjectM?: number;
  eavesProjectM?: number;
  valleyProjectM?: number;
}

type Totals = Record<string, unknown> | null | undefined;

function readNumber(source: Totals | RoofingProjectInputs, key: string): number | null {
  const value = Number(source?.[key as keyof typeof source]);
  return Number.isFinite(value) ? value : null;
}

function readArea(totals: Totals, key: string, max: number): number | null {
  const value = readNumber(totals, key);
  if (value === null || value < 10 || value > max) return null;
  return Math.round(value * 1000) / 1000;
}

function buildGuttersHref(source: typeof ROOFING_TRANSFER_FROM | typeof SOFT_ROOFING_TRANSFER_FROM, area: number): string {
  const params = new URLSearchParams({
    from: source,
    roofArea: String(area),
  });
  return `/kalkulyatory/krovlya/vodostok/?${params.toString()}`;
}

export function buildRoofingLinksFromRoofingResult(
  totals: Totals,
  projectInputs: RoofingProjectInputs,
): RoofSystemLink[] {
  const area = readArea(totals, "selectedSlopeAreaM2", 1000);
  if (area === null) return [];

  const links: RoofSystemLink[] = [];
  const roofingType = readNumber(totals, "roofingType");
  const roofAreaMode = readNumber(totals, "roofAreaMode");

  if (roofingType === 1 && area <= 500 && (roofAreaMode === 0 || roofAreaMode === 1)) {
    const params = new URLSearchParams({
      from: ROOFING_TRANSFER_FROM,
      roofArea: String(area),
    });

    let isCompatible = true;
    if (roofAreaMode === 1) {
      const slope = readNumber(totals, "slopeDeg");
      if (slope === null || slope < 12 || slope > 60) {
        isCompatible = false;
      } else {
        params.set("slope", String(slope));
      }
    }

    const projectFields: Array<[keyof RoofingProjectInputs, string, number]> = [
      ["ridgeProjectM", "ridgeLength", 50],
      ["eavesProjectM", "eaveLength", 100],
      ["valleyProjectM", "valleyLength", 30],
    ];
    for (const [sourceKey, targetKey, max] of projectFields) {
      const value = readNumber(projectInputs, sourceKey);
      if (value === null) continue;
      if (value < 0 || value > max) {
        isCompatible = false;
        break;
      }
      params.set(targetKey, String(value));
    }

    if (isCompatible) {
      links.push({
        target: SOFT_ROOFING_TRANSFER_FROM,
        title: "Детальный расчёт мягкой кровли",
        description: "Черепица, ковёр, ОСП и доборные элементы",
        href: `/kalkulyatory/krovlya/myagkaya-krovlya/?${params.toString()}`,
      });
    }
  }

  links.push({
    target: GUTTERS_TRANSFER_FROM,
    title: "Водосточная система",
    description: "Проверить пропускную способность по площади",
    href: buildGuttersHref(ROOFING_TRANSFER_FROM, area),
  });
  return links;
}

export function buildRoofingLinksFromSoftRoofingResult(totals: Totals): RoofSystemLink[] {
  const area = readArea(totals, "roofArea", 500);
  if (area === null) return [];

  const roofingParams = new URLSearchParams({
    from: SOFT_ROOFING_TRANSFER_FROM,
    roofAreaMode: "0",
    projectSlopeAreaM2: String(area),
    roofingType: "1",
  });
  const lengths: Array<[string, string]> = [
    ["ridgeLength", "ridgeProjectM"],
    ["eaveLength", "eavesProjectM"],
    ["valleyLength", "valleyProjectM"],
  ];
  for (const [sourceKey, targetKey] of lengths) {
    const value = readNumber(totals, sourceKey);
    if (value !== null && value >= 0) roofingParams.set(targetKey, String(value));
  }

  return [
    {
      target: ROOFING_TRANSFER_FROM,
      title: "Полная ведомость кровли",
      description: "Покрытие и проектные позиции по фасовкам",
      href: `/kalkulyatory/krovlya/krovlya/?${roofingParams.toString()}`,
    },
    {
      target: GUTTERS_TRANSFER_FROM,
      title: "Водосточная система",
      description: "Проверить пропускную способность по площади",
      href: buildGuttersHref(SOFT_ROOFING_TRANSFER_FROM, area),
    },
  ];
}

export function buildRoofingHrefFromGuttersResult(totals: Totals): string | null {
  const area = readArea(totals, "roofArea", 1000);
  if (area === null) return null;

  const params = new URLSearchParams({
    from: GUTTERS_TRANSFER_FROM,
    roofAreaMode: "0",
    projectSlopeAreaM2: String(area),
  });
  return `/kalkulyatory/krovlya/krovlya/?${params.toString()}`;
}
