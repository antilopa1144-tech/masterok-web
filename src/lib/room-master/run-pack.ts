import type { CalculatorResult } from "@/lib/calculators/types";
import { getCalculateFn } from "@/lib/calculators/registry";
import type { RoomDimensions } from "./geometry";
import { ROOM_PACKS, type RoomPackId } from "./packs";

export interface PackStepResult {
  slug: string;
  title: string;
  result: CalculatorResult;
}

export interface PackRunResult {
  packId: RoomPackId;
  packTitle: string;
  steps: PackStepResult[];
  merged: CalculatorResult;
}

function prefixMaterialName(stepTitle: string, name: string): string {
  return `[${stepTitle}] ${name}`;
}

export function mergePackResults(
  packTitle: string,
  steps: PackStepResult[],
): CalculatorResult {
  const materials = steps.flatMap((step) =>
    step.result.materials.map((m) => ({
      ...m,
      name: prefixMaterialName(step.title, m.name),
      category: m.category ? `${step.title} · ${m.category}` : step.title,
    })),
  );

  const totals: CalculatorResult["totals"] = {};
  for (const step of steps) {
    if (step.result.totals) {
      Object.assign(totals, step.result.totals);
    }
  }

  const warnings = steps.flatMap((s) => s.result.warnings ?? []);
  const practicalNotes = steps.flatMap((s) => s.result.practicalNotes ?? []);

  return {
    materials,
    totals,
    warnings: warnings.length > 0 ? warnings : undefined,
    practicalNotes: practicalNotes.length > 0 ? practicalNotes : undefined,
  };
}

export async function runRoomPack(
  packId: RoomPackId,
  dimensions: RoomDimensions,
  accuracyMode: "basic" | "realistic" | "professional" = "realistic",
): Promise<PackRunResult> {
  const pack = ROOM_PACKS[packId];
  const steps: PackStepResult[] = [];

  for (const step of pack.primarySteps) {
    const fn = await getCalculateFn(step.slug);
    if (!fn) {
      throw new Error(`Калькулятор не найден: ${step.slug}`);
    }
    const inputs = step.buildInputs(dimensions);
    const result = fn({ ...inputs, accuracyMode: accuracyMode as unknown as number });
    steps.push({ slug: step.slug, title: step.title, result });
  }

  return {
    packId,
    packTitle: pack.title,
    steps,
    merged: mergePackResults(pack.title, steps),
  };
}
