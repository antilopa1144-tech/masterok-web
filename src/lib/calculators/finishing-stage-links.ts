export const PLASTER_FINISHING_TRANSFER_FROM = "shtukaturka";
export const PUTTY_FINISHING_TRANSFER_FROM = "shpaklevka";

export type PuttyFinishTarget = "gruntovka" | "kraska" | "oboi";

export interface PuttyFinishLink {
  target: PuttyFinishTarget;
  title: string;
  description: string;
  href: string;
}

type Totals = Record<string, unknown> | null | undefined;

function readArea(totals: Totals, key: string, max: number): number | null {
  const value = Number(totals?.[key]);
  if (!Number.isFinite(value) || value < 1 || value > max) return null;
  return Math.round(value * 1000) / 1000;
}

export function buildPuttyHrefFromPlasterResult(totals: Totals): string | null {
  const area = readArea(totals, "netArea", 500);
  if (area === null) return null;

  const params = new URLSearchParams({
    from: PLASTER_FINISHING_TRANSFER_FROM,
    inputMode: "1",
    area: String(area),
    surface: "0",
  });
  return `/kalkulyatory/otdelka/shpaklevka/?${params.toString()}`;
}

export function buildFinishLinksFromPuttyResult(totals: Totals, surface: number | undefined): PuttyFinishLink[] {
  // Шпаклёвка умеет считать потолок и стены + потолок. В обои такую площадь
  // переносить нельзя, поэтому финишная ветка доступна только для стен.
  if (Number(surface) !== 0) return [];

  const area = readArea(totals, "wallArea", 1000);
  if (area === null) return [];

  const links: PuttyFinishLink[] = [];
  if (area <= 500) {
    const primerParams = new URLSearchParams({
      from: PUTTY_FINISHING_TRANSFER_FROM,
      area: String(area),
      surfaceType: "1",
      primerType: "0",
    });
    links.push({
      target: "gruntovka",
      title: "1. Грунтовка",
      description: "Закрепить подготовленное основание",
      href: `/kalkulyatory/otdelka/gruntovka/?${primerParams.toString()}`,
    });
  }

  const paintParams = new URLSearchParams({
    from: PUTTY_FINISHING_TRANSFER_FROM,
    area: String(area),
    surfaceType: "0",
    surfacePrep: "0",
  });
  links.push({
    target: "kraska",
    title: "2А. Краска",
    description: "После грунтования рассчитать покрытие",
    href: `/kalkulyatory/otdelka/kraska/?${paintParams.toString()}`,
  });

  const wallpaperParams = new URLSearchParams({
    from: PUTTY_FINISHING_TRANSFER_FROM,
    inputMode: "1",
    area: String(area),
    openingsArea: "0",
  });
  links.push({
    target: "oboi",
    title: "2Б. Обои",
    description: "Уточнить высоту, проёмы и рулон",
    href: `/kalkulyatory/otdelka/oboi/?${wallpaperParams.toString()}`,
  });

  return links;
}
