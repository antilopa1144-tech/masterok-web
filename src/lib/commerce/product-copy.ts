/** One customer-facing name for the single-project purchase and its receipt. */
export const PROJECT_ESTIMATE_NAME = "Смета проекта в PDF и XLSX";

export function savedLayoutsLabel(count: number): string {
  const lastTwo = count % 100;
  const word = lastTwo >= 11 && lastTwo <= 14
    ? "сохранённых схем"
    : count % 10 === 1
      ? "сохранённая схема"
      : count % 10 >= 2 && count % 10 <= 4
        ? "сохранённые схемы"
        : "сохранённых схем";
  return `${count} ${word}`;
}
