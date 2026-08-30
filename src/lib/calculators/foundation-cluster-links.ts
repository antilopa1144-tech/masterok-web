export const CONCRETE_CALCULATOR_PATH = "/kalkulyatory/fundament/beton/";

const FOUNDATION_CONCRETE_SOURCES = {
  "lentochnyy-fundament": {
    label: "ленточного фундамента",
    volumeKey: "vol",
    reserveKey: "reserve",
  },
  "plitnyj-fundament": {
    label: "плитного фундамента",
    volumeKey: "concreteM3",
    reserveKey: "concreteReservePercent",
  },
} as const;

export type FoundationConcreteSource = keyof typeof FOUNDATION_CONCRETE_SOURCES;

function isFoundationConcreteSource(source: string): source is FoundationConcreteSource {
  return source in FOUNDATION_CONCRETE_SOURCES;
}

function roundTransferValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function getFoundationConcreteSourceLabel(source: string | null): string | null {
  if (!source || !isFoundationConcreteSource(source)) return null;
  return FOUNDATION_CONCRETE_SOURCES[source].label;
}

/** Передаёт уже рассчитанный чистый объём, не дублируя формулу фундамента. */
export function buildConcreteCalculatorHrefFromFoundationResult(
  source: string,
  totals: Record<string, number> | undefined,
): string | null {
  if (!totals || !isFoundationConcreteSource(source)) return null;

  const config = FOUNDATION_CONCRETE_SOURCES[source];
  const volume = Number(totals[config.volumeKey]);
  if (!Number.isFinite(volume) || volume < 0.1 || volume > 100) {
    return CONCRETE_CALCULATOR_PATH;
  }

  const params = new URLSearchParams();
  params.set("from", source);
  params.set("inputMode", "0");
  params.set("concreteVolume", String(roundTransferValue(volume)));

  const reserve = Number(totals[config.reserveKey]);
  if (Number.isFinite(reserve) && reserve >= 0 && reserve <= 20) {
    params.set("reserve", String(roundTransferValue(reserve)));
  }

  return `${CONCRETE_CALCULATOR_PATH}?${params.toString()}`;
}
