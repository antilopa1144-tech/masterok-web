import { getCalculatorBySlug } from "@/lib/calculators";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import type { CalculatorField } from "@/lib/calculators/types";

const SKIP_FIELD_KEYS = new Set(["inputMode"]);

export interface CalculatorListItem {
  slug: string;
  title: string;
  categorySlug: string;
  tags: string[];
  popularity: number;
}

export function searchCalculators(query: string, limit = 8): CalculatorListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return ALL_CALCULATORS_META
      .slice()
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map(toListItem);
  }

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);

  const scored = ALL_CALCULATORS_META.map((meta) => {
    const hay = `${meta.title} ${meta.slug} ${meta.tags.join(" ")} ${meta.description}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (meta.slug.includes(token)) score += 8;
      if (meta.title.toLowerCase().includes(token)) score += 5;
      if (meta.tags.some((t) => t.toLowerCase().includes(token))) score += 3;
      if (hay.includes(token)) score += 1;
    }
    return { meta, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.meta.popularity - a.meta.popularity)
    .slice(0, limit)
    .map((s) => toListItem(s.meta));
}

function toListItem(meta: (typeof ALL_CALCULATORS_META)[number]): CalculatorListItem {
  return {
    slug: meta.slug,
    title: meta.title,
    categorySlug: meta.categorySlug,
    tags: meta.tags,
    popularity: meta.popularity,
  };
}

export function getCalculatorSchemaPayload(slug: string) {
  const def = getCalculatorBySlug(slug);
  if (!def) {
    return { error: `Калькулятор не найден: ${slug}` };
  }

  const fields = def.fields
    .filter((f) => !SKIP_FIELD_KEYS.has(f.key))
    .map((f) => fieldToSchema(f));

  return {
    slug: def.slug,
    title: def.title,
    categorySlug: def.categorySlug,
    formulaVersion: def.formulaVersion,
    fields,
    hints: [
      "Передай в run_calculator только известные числа; остальное подставится из defaultValue.",
      "Если пользователь дал размеры комнаты — проверь, есть ли поля length/width/height или area.",
      // ВАЖНО: у калькуляторов с переключателем режима (radio/select типа inputMode,
      // group bySize/byArea) значение из неактивной группы игнорируется формулой.
      "ВАЖНО: если есть поле-переключатель режима ввода (напр. inputMode с опциями «По размерам»/«По площади», поля сгруппированы через group bySize/byArea) — обязательно выстави сам переключатель под свои данные. Передаёшь area → поставь inputMode в значение опции «По площади». Передаёшь length/width → выбери «По размерам». Иначе формула возьмёт дефолт неактивной группы и вернёт не твою площадь.",
    ],
  };
}

function fieldToSchema(f: CalculatorField) {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    unit: f.unit,
    min: f.min,
    max: f.max,
    step: f.step,
    defaultValue: f.defaultValue,
    options: f.options?.map((o) => ({ value: o.value, label: o.label })),
    hint: f.hint,
    group: f.group,
  };
}

export function buildDefaultValuesFromFields(fields: CalculatorField[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const f of fields) {
    if (SKIP_FIELD_KEYS.has(f.key)) continue;
    values[f.key] = f.defaultValue;
  }
  return values;
}

export function mergeCalculatorValues(
  fields: CalculatorField[],
  partial: Record<string, number>,
): Record<string, number> {
  const allowed = new Set(fields.map((f) => f.key));
  const merged = buildDefaultValuesFromFields(fields);
  for (const [key, value] of Object.entries(partial)) {
    if (!allowed.has(key)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    merged[key] = value;
  }
  return merged;
}

export function calculatorPageUrl(siteOrigin: string, categorySlug: string, slug: string): string {
  const base = siteOrigin.replace(/\/$/, "");
  return `${base}/kalkulyatory/${categorySlug}/${slug}/`;
}
