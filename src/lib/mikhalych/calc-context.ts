import type { CalculatorField, CalculatorResult } from "@/lib/calculators/types";
import { HIDDEN_TOTALS, TOTAL_LABELS } from "@/components/calculator/totalsDisplay";

const SKIP_FIELD_KEYS = new Set(["inputMode"]);

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("ru-RU");
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function materialQty(m: CalculatorResult["materials"][number]): number {
  return m.purchaseQty ?? m.withReserve ?? m.quantity;
}

function formatMaterialLine(m: CalculatorResult["materials"][number]): string {
  const qty = materialQty(m);
  const cat = m.category ? `[${m.category}] ` : "";
  let line = `${cat}${m.name}: ${formatQty(qty)} ${m.unit}`;
  const exact = m.quantity;
  if (
    (m.purchaseQty !== undefined || m.withReserve !== undefined) &&
    Math.abs(qty - exact) > 0.001
  ) {
    line += ` (расчёт ${formatQty(exact)})`;
  }
  if (m.subtitle) line += ` — ${m.subtitle}`;
  return line;
}

function formatTotals(totals: CalculatorResult["totals"]): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(totals)) {
    if (HIDDEN_TOTALS.has(key) || !Number.isFinite(value) || value === 0) continue;
    const label = TOTAL_LABELS[key] ?? key;
    lines.push(`${label}: ${formatQty(value)}`);
  }
  return lines.join("; ");
}

export interface MikhalychCalcContextInput {
  calculatorTitle: string;
  calculatorSlug: string;
  fields: CalculatorField[];
  values: Record<string, number>;
  result: CalculatorResult;
  companionSlugs?: string[];
}

/** Полный текстовый контекст расчёта для Михалыча (все материалы и итоги). */
export function buildMikhalychCalcContext(input: MikhalychCalcContextInput): string {
  const { calculatorTitle, calculatorSlug, fields, values, result } = input;

  const paramLines = fields
    .filter((f) => !SKIP_FIELD_KEYS.has(f.key))
    .map((f) => {
      const v = values[f.key] ?? f.defaultValue;
      const opt = f.options?.find((o) => o.value === v);
      const display = opt ? `${opt.label} (${v})` : formatQty(v);
      return `${f.label}: ${display}${f.unit ? ` ${f.unit}` : ""}`;
    });

  const materialLines = result.materials.map(formatMaterialLine);
  const totalsLine = formatTotals(result.totals);
  const warnings =
    result.warnings.length > 0
      ? `\nПредупреждения калькулятора:\n${result.warnings.map((w) => `— ${w}`).join("\n")}`
      : "";

  const notes =
    result.practicalNotes && result.practicalNotes.length > 0
      ? `\nПрактические заметки:\n${result.practicalNotes.map((n) => `— ${n}`).join("\n")}`
      : "";

  const banner = result.materialListBanner ? `\nБаннер: ${result.materialListBanner}` : "";

  const companions =
    input.companionSlugs && input.companionSlugs.length > 0
      ? `\nСмежные калькуляторы на сайте: ${input.companionSlugs.join(", ")}.`
      : "";

  return [
    `Калькулятор: «${calculatorTitle}» (slug: ${calculatorSlug}).`,
    "",
    "ПАРАМЕТРЫ:",
    ...paramLines.map((p) => `• ${p}`),
    "",
    `МАТЕРИАЛЫ (${result.materials.length} позиций, полный список):`,
    ...materialLines.map((m) => `• ${m}`),
    "",
    totalsLine ? `ИТОГИ: ${totalsLine}` : "",
    result.accuracyExplanation
      ? `Режим точности: ${result.accuracyExplanation.modeLabel}, множитель ×${result.accuracyExplanation.combinedMultiplier.toFixed(2)}`
      : "",
    warnings,
    notes,
    banner,
    companions,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Стабильный хэш для кэша ответа (без crypto в старых браузерах — djb2). */
export function hashMikhalychCalcContext(context: string): string {
  let h = 5381;
  for (let i = 0; i < context.length; i++) {
    h = (h * 33) ^ context.charCodeAt(i);
  }
  return `h${(h >>> 0).toString(36)}`;
}
