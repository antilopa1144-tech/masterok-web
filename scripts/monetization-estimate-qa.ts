/** Reproducible, synthetic document QA using real calculator results. No market prices. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { tileDef } from "../src/lib/calculators/formulas/tile";
import { laminateDef } from "../src/lib/calculators/formulas/laminate";
import { paintDef } from "../src/lib/calculators/formulas/paint";
import type { CalculatorDefinition } from "../src/lib/calculators/types";
import { toStoredMaterial } from "../src/lib/commerce/material-snapshot";
import { buildDocumentTotals, generateProjectPdf, generateProjectXlsx } from "../src/lib/commerce/documents";
import type { ProjectDocumentInput } from "../src/lib/commerce/document-types";
import { aggregateProcurementLines } from "../src/lib/projects/procurement";
import type { StoredProjectEntry } from "../src/lib/storage/types";

const OUT = "output/monetization-qa";
const DATE = "2026-09-23";
const TEST_PRICE = "Условная цена для проверки арифметики; не предложение магазина";

function entry(definition: CalculatorDefinition, label: string, overrides: Record<string, number>): StoredProjectEntry {
  const values = Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue]));
  const materials = definition.calculate({ ...values, ...overrides }).materials.map((material, index) => ({
    ...toStoredMaterial(material), id: `${label}:${index}`,
  }));
  return { id: label, projectId: "qa", calcId: definition.id, calcTitle: definition.title,
    slug: definition.slug, categorySlug: definition.categorySlug, label, materials, ts: Date.now() };
}

function makeDocument(name: string, entries: StoredProjectEntry[], priced: boolean): ProjectDocumentInput {
  const lines = aggregateProcurementLines(entries);
  const materials: ProjectDocumentInput["materials"] = lines.map((line, index) => ({
    key: line.key, name: line.name,
    ...(line.subtitles?.length ? { subtitle: line.subtitles.join(" · ") } : {}),
    unit: line.unit, quantity: line.quantity,
    ...(line.baseUnit === line.unit && line.exactQuantity !== undefined ? { exactQuantity: line.exactQuantity } : {}),
    ...(line.purchaseHint ? { packaging: line.purchaseHint } : {}),
    ...(priced || index % 2 === 0 ? { unitPrice: { amount: 100 + index * 25, currency: "RUB", provenance: TEST_PRICE } } : {}),
  }));
  return {
    project: { id: `qa-${name}`, name, documentDate: DATE, version: "1" },
    parties: { customer: { name: "Тестовый заказчик" }, contractor: { name: "Тестовый мастер" }, object: name },
    materials,
    works: [{ key: "work", name: "Работы по проекту (условный тест)", unit: "м²", quantity: 5.2,
      ...(priced ? { unitPrice: { amount: 1000, currency: "RUB", provenance: TEST_PRICE } } : {}) }],
    assumptions: ["Это сценарий проверки документов, а не замер реального объекта.",
      "Размеры заданы для проверки калькулятора. Все указанные цены условные, наличие и поставщик не проверялись."],
  };
}

async function verifyCase(slug: string, input: ProjectDocumentInput) {
  const totals = buildDocumentTotals(input);
  const pdf = await generateProjectPdf(input);
  const xlsx = await generateProjectXlsx(input);
  await Promise.all([writeFile(`${OUT}/${slug}.pdf`, pdf), writeFile(`${OUT}/${slug}.xlsx`, xlsx)]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(xlsx) as never);
  assert.equal(workbook.getWorksheet("Обзор")?.getCell("B10").result, totals.knownGrandTotal);
  assert.equal(workbook.getWorksheet("Смета")?.getCell(`G${input.materials.length + 7}`).result, totals.materialsKnownTotal);
  assert.equal(workbook.getWorksheet("Закупка")?.getCell("D6").value, input.materials[0]?.quantity);
  assert.equal(workbook.getWorksheet("Обзор")?.getCell("A12").value,
    totals.hasUnknownPrices ? "Есть позиции без цены: они не включены в итог." : "Все позиции имеют указанную цену.");
  return { slug, entries: input.materials.length, knownGrandTotal: totals.knownGrandTotal,
    missingPrices: input.materials.filter((line) => !line.unitPrice).length + (input.works ?? []).filter((line) => !line.unitPrice).length,
    pdfBytes: pdf.length, xlsxBytes: xlsx.length };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const bathroom = makeDocument("Тест · санузел 2,6 × 2,0 м", [entry(tileDef, "Пол санузла", { length: 2.6, width: 2 })], true);
  const apartment = makeDocument("Тест · квартира, три зоны", [
    entry(tileDef, "Плитка · санузел", { length: 2.6, width: 2 }),
    entry(laminateDef, "Ламинат · комната", { length: 5.2, width: 3.8 }),
    entry(paintDef, "Краска · стены", {}),
  ], true);
  const partial = makeDocument("Тест · закупка с неизвестными ценами", [
    entry(tileDef, "Плитка · кухня", { length: 4.2, width: 3.1 }),
    entry(laminateDef, "Ламинат · комната", { length: 4.6, width: 3.4 }),
  ], false);
  const report = [];
  for (const [slug, input] of [["bathroom", bathroom], ["apartment", apartment], ["partial", partial]] as const) {
    report.push(await verifyCase(slug, input));
  }
  await writeFile(`${OUT}/report.json`, JSON.stringify({ date: DATE, note: TEST_PRICE, scenarios: report }, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void main();
