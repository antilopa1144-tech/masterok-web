export type MaterialComparisonPriority = "budget" | "durability" | "diy";

export interface ComparableMaterial {
  name: string;
  durabilityYears: readonly [number, number];
  installDifficulty: 1 | 2 | 3;
}

export type MaterialComparisonRecommendation =
  | { kind: "none"; reason: string }
  | { kind: "needs-prices"; reason: string }
  | { kind: "tie"; reason: string }
  | { kind: "winner"; winnerName: string; reason: string };

function averageDurability(material: ComparableMaterial): number {
  return (material.durabilityYears[0] + material.durabilityYears[1]) / 2;
}

export function getMaterialComparisonRecommendation({
  first,
  second,
  priority,
  firstPrice,
  secondPrice,
}: {
  first: ComparableMaterial;
  second: ComparableMaterial;
  priority: MaterialComparisonPriority | null;
  firstPrice: number;
  secondPrice: number;
}): MaterialComparisonRecommendation {
  if (!priority) {
    return {
      kind: "none",
      reason: "Выберите главный приоритет — рекомендация появится без скрытого усреднения критериев.",
    };
  }

  if (priority === "budget") {
    if (firstPrice <= 0 || secondPrice <= 0) {
      return {
        kind: "needs-prices",
        reason: "Введите цену обоих материалов за одинаковую единицу — только тогда сравнение по бюджету будет честным.",
      };
    }
    if (firstPrice === secondPrice) {
      return { kind: "tie", reason: "По введённой цене варианты равны." };
    }

    const winner = firstPrice < secondPrice ? first : second;
    return {
      kind: "winner",
      winnerName: winner.name,
      reason: `Дешевле на ${Math.abs(firstPrice - secondPrice).toLocaleString("ru-RU")} ₽ за единицу площади.`,
    };
  }

  if (priority === "durability") {
    const firstAverage = averageDurability(first);
    const secondAverage = averageDurability(second);
    if (firstAverage === secondAverage) {
      return { kind: "tie", reason: "Средний ориентир срока службы у вариантов одинаковый." };
    }

    const winner = firstAverage > secondAverage ? first : second;
    return {
      kind: "winner",
      winnerName: winner.name,
      reason: `Средний ориентир срока службы выше на ${Math.abs(firstAverage - secondAverage)} лет.`,
    };
  }

  if (first.installDifficulty === second.installDifficulty) {
    return { kind: "tie", reason: "По сложности самостоятельного монтажа варианты равны." };
  }

  const winner = first.installDifficulty < second.installDifficulty ? first : second;
  return {
    kind: "winner",
    winnerName: winner.name,
    reason: "Монтаж проще выполнить своими руками.",
  };
}
