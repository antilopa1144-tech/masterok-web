import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { generateProjectPdf, generateProjectXlsx } from "../src/lib/commerce/documents";
import type { ProjectDocumentInput } from "../src/lib/commerce/document-types";

async function main() {
  await mkdir("output/monetization-documents", { recursive: true });
  await mkdir("public/samples", { recursive: true });
  const tiles = Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, col) =>
    `<rect x="${115 + col * 134}" y="${112 + row * 80}" width="129" height="75" fill="${(row + col) % 2 ? "#e9ecee" : "#f1f2f2"}" stroke="#cbd2d6" stroke-width="2"/>`,
  ).join("")).join("");
  const svg = `<svg width="900" height="540" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="540" fill="#ffffff"/>
    <text x="115" y="43" fill="#17212b" font-family="Arial" font-size="22" font-weight="bold">Условная раскладка пола</text>
    <text x="115" y="72" fill="#66727b" font-family="Arial" font-size="15">Иллюстрация оформления, не расчёт помещения</text>
    <line x1="115" y1="93" x2="780" y2="93" stroke="#ea580c" stroke-width="3"/>
    <rect x="109" y="106" width="680" height="333" fill="#fff" stroke="#17212b" stroke-width="5"/>
    ${tiles}
    <text x="115" y="485" fill="#66727b" font-family="Arial" font-size="16">Фактическая раскладка берётся из сохранённой схемы проекта.</text>
  </svg>`;
  const png = (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
  const input: ProjectDocumentInput = { project: { id: "demo-bathroom", name: "Санузел · демонстрационная смета", documentDate: "2026-09-22", version: "3" }, parties: { customer: { name: "Алексей Петров" }, contractor: { name: "Демонстрационный подрядчик" }, object: "Санузел, 5,2 м²" }, materials: [{ key: "tile", name: "Керамогранит 600×600", unit: "м²", quantity: 6, exactQuantity: 5.2, reservePercent: 10, packaging: "2 коробки × 3 м²", unitPrice: { amount: 1890, currency: "RUB", provenance: "демонстрационная цена" } }, { key: "glue", name: "Клей для плитки", unit: "кг", quantity: 50, exactQuantity: 42, packaging: "2 мешка × 25 кг", unitPrice: { amount: 32, currency: "RUB", provenance: "демонстрационная цена" } }], works: [{ key: "work", name: "Укладка плитки", unit: "м²", quantity: 5.2, unitPrice: { amount: 2200, currency: "RUB", provenance: "демонстрационная цена" } }], assumptions: ["Все цены демонстрационные; перед покупкой уточните их у поставщика."], layouts: [{ kind: "tile", title: "Условная раскладка пола", summary: "Иллюстрация оформления, не расчёт реального помещения.", sourceLabel: "Демонстрационная иллюстрация", image: { dataUrl: `data:image/png;base64,${png}`, width: 900, height: 540 } }] };
  const pdf = await generateProjectPdf(input);
  await writeFile("output/monetization-documents/masterok-client-demo.pdf", pdf);
  await writeFile("public/samples/masterok-project-pack-demo.pdf", pdf);
  await writeFile("output/monetization-documents/masterok-client-demo.xlsx", await generateProjectXlsx(input));
}
void main();
