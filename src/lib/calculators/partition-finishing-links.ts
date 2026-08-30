export const PARTITION_FINISHING_TRANSFER_FROM = "peregorodki-iz-blokov";

export type PartitionFinishingTarget = "gruntovka" | "shtukaturka" | "shpaklevka";

export interface PartitionFinishingLink {
  target: PartitionFinishingTarget;
  title: string;
  description: string;
  href: string;
}

interface PartitionDimensions {
  length?: number;
  height?: number;
}

const TARGETS: Array<{
  target: PartitionFinishingTarget;
  path: string;
  title: string;
  description: string;
  params: Record<string, number>;
}> = [
  {
    target: "gruntovka",
    path: "/kalkulyatory/otdelka/gruntovka/",
    title: "1. Грунтовка",
    description: "Подготовить впитывающее основание",
    params: { surfaceType: 0, primerType: 0 },
  },
  {
    target: "shtukaturka",
    path: "/kalkulyatory/steny/shtukaturka/",
    title: "2. Штукатурка",
    description: "Рассчитать базовое выравнивание",
    params: { inputMode: 1, openingsArea: 0 },
  },
  {
    target: "shpaklevka",
    path: "/kalkulyatory/otdelka/shpaklevka/",
    title: "3. Шпаклёвка",
    description: "Рассчитать подготовку после выравнивания",
    params: { inputMode: 1, surface: 0 },
  },
];

function roundArea(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function getPartitionFinishingArea({ length, height }: PartitionDimensions): number | null {
  const safeLength = Number(length);
  const safeHeight = Number(height);
  if (!Number.isFinite(safeLength) || !Number.isFinite(safeHeight)) return null;

  // Отделывают обе стороны перегородки. Проёмы исходный калькулятор не собирает,
  // поэтому их нельзя вычитать автоматически.
  const area = roundArea(safeLength * safeHeight * 2);
  return area >= 1 && area <= 500 ? area : null;
}

export function buildPartitionFinishingLinks(input: PartitionDimensions): PartitionFinishingLink[] {
  const area = getPartitionFinishingArea(input);
  if (area === null) return [];

  return TARGETS.map((target) => {
    const params = new URLSearchParams({
      from: PARTITION_FINISHING_TRANSFER_FROM,
      area: String(area),
    });
    for (const [key, value] of Object.entries(target.params)) {
      params.set(key, String(value));
    }

    return {
      target: target.target,
      title: target.title,
      description: target.description,
      href: `${target.path}?${params.toString()}`,
    };
  });
}
