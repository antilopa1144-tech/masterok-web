import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { laminateDef } from "./calculators/formulas/laminate";
import { buildEstimatePdfDocument, exportToExcel, type EstimateData } from "./export";

afterEach(() => vi.unstubAllGlobals());

function estimate(step: number): EstimateData {
  const result = laminateDef.calculate({ inputMode: 1, area: 20, underlaySaleMode: 1, underlayWidth: 1.2, underlaySaleStep: step });
  return {
    calculatorName: "Ламинат — проверка подложки на отрез",
    date: "10.09.2026",
    materials: result.materials.map((m) => ({ ...m, quantity: m.purchaseQty ?? m.withReserve ?? m.quantity })),
  };
}

describe("laminate export purchase contract", () => {
  it("PDF table carries purchase metres, coverage and the cutting limitation", async () => {
    const fontBase64 = readFileSync(resolve("public/fonts/Roboto-Regular.ttf")).toString("base64");
    const pdf = await buildEstimatePdfDocument(estimate(1), { fontBase64 });
    const table = (pdf as unknown as { lastAutoTable: { body: Array<{ raw: unknown }> } }).lastAutoTable;
    const underlayRow = table.body.map((row) => row.raw).find((row) => JSON.stringify(row).includes("на отрез")) as string[];
    expect(underlayRow[1]).toBe("18 пог. м");
    expect(underlayRow[0]).toContain("21,6 м²");
    expect(underlayRow[0]).toContain("не схема раскроя");
    const bytes = Buffer.from(pdf.output("arraybuffer"));
    expect(bytes.length).toBeGreaterThan(1000);
    // Optional local visual evidence; normal test/CI runs never write artifacts.
    if (process.env.MASTEROK_EXPORT_QA_DIR) {
      mkdirSync(process.env.MASTEROK_EXPORT_QA_DIR, { recursive: true });
      writeFileSync(resolve(process.env.MASTEROK_EXPORT_QA_DIR, "laminate-cut.pdf"), bytes);
    }
  });

  it("CSV download preserves decimal purchase metres and the same specification", async () => {
    let downloaded: Blob | undefined;
    const click = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: (blob: Blob) => { downloaded = blob; return "blob:qa"; }, revokeObjectURL: vi.fn() });
    vi.stubGlobal("document", { createElement: () => ({ click, remove: vi.fn() }), body: { appendChild: vi.fn() } });
    await exportToExcel(estimate(0.1));
    expect(click).toHaveBeenCalledOnce();
    const csv = await downloaded!.text();
    const row = csv.split("\r\n").find((line) => line.includes("Подложка под ламинат — на отрез"))!;
    expect(row).toContain('"17,5";"пог. м"');
    expect(row).toContain("не схема раскроя");
    expect(row).toContain("Потребность с запасом: 21 м²");
  });
});
