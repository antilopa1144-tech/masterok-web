export const INSULATION_FACADE_TRANSFER_FROM = "uteplenie";

export type FacadeCladdingSource = "sayding" | "fasadnye-paneli";
export type FacadeSystemTarget = "uteplenie-fasada-minvatoj" | FacadeCladdingSource;

export interface FacadeSystemLink {
  target: FacadeSystemTarget;
  title: string;
  description: string;
  href: string;
}

type Totals = Record<string, unknown> | null | undefined;

function readNumber(totals: Totals, key: string): number | null {
  const value = Number(totals?.[key]);
  return Number.isFinite(value) ? value : null;
}

function readArea(totals: Totals, key: string, max = 500): number | null {
  const value = readNumber(totals, key);
  if (value === null || value < 1 || value > max) return null;
  return Math.round(value * 1000) / 1000;
}

export function buildFacadeSystemLinksFromInsulationResult(totals: Totals): FacadeSystemLink[] {
  if (readNumber(totals, "application") !== 0) return [];

  const area = readArea(totals, "area");
  const mountSystem = readNumber(totals, "mountSystem");
  if (area === null || (mountSystem !== 0 && mountSystem !== 1)) return [];

  if (mountSystem === 0) {
    const productForm = readNumber(totals, "productForm");
    const insulationType = readNumber(totals, "insulationType");
    const thickness = readNumber(totals, "thickness");

    // Детальный калькулятор мокрого фасада поддерживает только плиты минваты
    // и ЭППС толщиной 50–200 мм. Другую систему нельзя молча подменять.
    if (
      area < 10
      || productForm !== 0
      || (insulationType !== 0 && insulationType !== 1)
      || thickness === null
      || thickness < 50
      || thickness > 200
    ) {
      return [];
    }

    const params = new URLSearchParams({
      from: INSULATION_FACADE_TRANSFER_FROM,
      area: String(area),
      thickness: String(Math.round(thickness)),
      insulationType: String(insulationType),
    });
    return [{
      target: "uteplenie-fasada-minvatoj",
      title: "Детальный мокрый фасад",
      description: "Клей, дюбели, сетка и штукатурка",
      href: `/kalkulyatory/fasad/uteplenie-fasada-minvatoj/?${params.toString()}`,
    }];
  }

  const links: FacadeSystemLink[] = [];
  if (area >= 10) {
    const sidingParams = new URLSearchParams({
      from: INSULATION_FACADE_TRANSFER_FROM,
      facadeArea: String(area),
      openingsArea: "0",
    });
    links.push({
      target: "sayding",
      title: "Сайдинг",
      description: "Типовые панели и комплектующие",
      href: `/kalkulyatory/fasad/sayding/?${sidingParams.toString()}`,
    });
  }

  const panelsParams = new URLSearchParams({
    from: INSULATION_FACADE_TRANSFER_FROM,
    inputMode: "1",
    area: String(area),
  });
  links.push({
    target: "fasadnye-paneli",
    title: "Фасадные панели",
    description: "Паспортные размеры и подсистема",
    href: `/kalkulyatory/fasad/fasadnye-paneli/?${panelsParams.toString()}`,
  });

  return links;
}

export function buildInsulationHrefFromFacadeResult(
  source: FacadeCladdingSource,
  totals: Totals,
): string | null {
  const area = readArea(totals, source === "sayding" ? "netArea" : "area");
  if (area === null) return null;

  const params = new URLSearchParams({
    from: source,
    application: "0",
    area: String(area),
    mountSystem: "1",
  });
  return `/kalkulyatory/fasad/uteplenie/?${params.toString()}`;
}
