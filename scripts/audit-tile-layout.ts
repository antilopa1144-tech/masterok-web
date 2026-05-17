/**
 * Аудит расчётов раскладки плитки.
 * Запуск: npx tsx scripts/audit-tile-layout.ts
 */

import {
  calculateTileLayout,
  countCellsInGrid,
  type TileLayoutResult,
} from "../src/lib/tools/tile-layout";

function countGridTypes(r: TileLayoutResult, grout = 2) {
  let whole = 0;
  let cut = 0;
  let corner = 0;
  for (const row of r.tileGrid) {
    for (const cell of row) {
      if (cell.type === "whole") whole++;
      else if (cell.type === "corner") corner++;
      else cut++;
    }
  }
  return { whole, cut, corner, cells: whole + cut + corner };
}

function rowWidthMm(row: TileLayoutResult["tileGrid"][0], grout: number) {
  return row.reduce((s, c, i) => s + c.widthMm + (i < row.length - 1 ? grout : 0), 0);
}

let failed = 0;
function fail(msg: string) {
  console.error("FAIL:", msg);
  failed++;
}
function ok(msg: string) {
  console.log("OK:", msg);
}

console.log("\n=== Аудит раскладки плитки ===\n");

{
  const r = calculateTileLayout(1700, 2500, 300, 600, 2, "straight");
  const cells = countCellsInGrid(r.tileGrid);
  if (cells !== r.totalTiles) fail(`прямая: grid ${cells} vs total ${r.totalTiles}`);
  else ok(`прямая ванная: ${r.totalTiles} плиток`);
  if (r.cutRight !== 188) fail(`прямая cutRight ожидали 188, got ${r.cutRight}`);
  else ok("прямая: подрезка справа 188 мм");
}

{
  const r = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-half");
  const cells = countCellsInGrid(r.tileGrid);
  if (cells !== r.totalTiles) {
    fail(`offset 1/2: grid ${cells} ≠ totalTiles ${r.totalTiles}`);
  } else ok(`offset 1/2: grid = totalTiles=${r.totalTiles}`);
  const maxCols = Math.max(...r.tileGrid.map((row) => row.length));
  if (r.cols !== maxCols) fail(`offset 1/2: cols=${r.cols}, макс. в ряду=${maxCols}`);
  else ok("offset 1/2: cols согласованы");
}

{
  const grout = 2;
  const r = calculateTileLayout(1700, 2500, 300, 600, grout, "offset-half");
  for (let ri = 0; ri < r.tileGrid.length; ri++) {
    const w = rowWidthMm(r.tileGrid[ri], grout);
    if (Math.abs(w - 1700) > 2) fail(`offset ряд ${ri}: ширина ${w} мм`);
  }
  ok("offset 1/2: ширина рядов ≈ поверхности");
}

{
  const r = calculateTileLayout(250, 250, 300, 600, 2, "straight");
  if (r.totalTiles < 1) fail("250×250: нет плиток");
  else ok(`250×250: ${r.totalTiles} плиток`);
}

{
  const s = calculateTileLayout(3000, 4000, 600, 600, 2, "straight");
  const d = calculateTileLayout(3000, 4000, 600, 600, 2, "diagonal");
  const gridCells = countCellsInGrid(d.tileGrid);
  if (d.totalTiles !== gridCells) {
    fail(`диагональ: схема ${gridCells} ≠ счётчик ${d.totalTiles}`);
  } else ok(`диагональ: схема и счётчик совпадают (${d.totalTiles} шт)`);
  if (d.purchaseReserveTiles <= 0) fail("диагональ: нет purchaseReserveTiles");
  else ok(`диагональ: запас к закупке +${d.purchaseReserveTiles} шт (итого ${d.totalTiles + d.purchaseReserveTiles})`);
  if (d.totalTiles !== s.totalTiles) fail("диагональ: схема должна совпадать с прямой по числу ячеек");
  else ok("диагональ: та же сетка, что у прямой укладки");
}

{
  const r = calculateTileLayout(1200, 2400, 600, 600, 0, "straight");
  if (countCellsInGrid(r.tileGrid) !== r.totalTiles) fail("grout=0: рассинхрон");
  else ok(`grout=0: ${r.totalTiles} плит`);
}

{
  const h = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-half");
  const t = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-third");
  const hFirst = h.tileGrid[1]?.[0]?.widthMm ?? 0;
  const tFirst = t.tileGrid[1]?.[0]?.widthMm ?? 0;
  if (hFirst === tFirst) fail("offset 1/2 и 1/3: одинаковая первая подрезка");
  else ok(`offset: 1/2=${hFirst}мм, 1/3=${tFirst}мм`);
}

console.log(failed === 0 ? "\n✅ Проверки пройдены\n" : `\n❌ Найдено проблем: ${failed}\n`);
process.exit(failed > 0 ? 1 : 0);
