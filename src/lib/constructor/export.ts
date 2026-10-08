import { calculateProject, type ConstructorRoom, type RoomCalculation, type Wall } from "./core";
import { decorFor, formatMoney, formatNumber, planSvg } from "./presentation";
import { tileDecorFor, wallSvg } from "./wall-presentation";
import { reviewWallCuts } from "./wall-cuts";
import { serializeWorkspace, type ConstructorWorkspace } from "./workspace";
import { floorExportText } from "./floor-presentation";
import { summarizeFinish } from "./comparison";
import { purchaseCostText } from "./purchase-presentation";

const safeName = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, "-").slice(0, 100) || "проект";

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  // Safari may consume the object URL after the click's event loop.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportProjectFile(workspace: ConstructorWorkspace) {
  downloadFile(new Blob([serializeWorkspace(workspace)], { type: "application/json;charset=utf-8" }), `${safeName(workspace.project.name)}.masterok.json`);
}

export async function svgToPng(svg: string, width = 1600, height = 1400): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Не удалось подготовить изображение схемы.")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не поддерживает экспорт изображения.");
    context.fillStyle = "#f5f7fa"; context.fillRect(0, 0, width, height);
    const ratio = Math.min(width / image.width, height / image.height);
    context.drawImage(image, (width - image.width * ratio) / 2, (height - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export async function exportRoomPng(room: ConstructorRoom, calculation: RoomCalculation, sceneImage?: string, exampleInterior = false, wall?: Wall) {
  const floorText = floorExportText(room, calculation);
  const wallCalculation = calculation.walls.find((item) => item.wall === wall);
  const wallSpec = wall === undefined ? null : room.wallTiles[wall];
  const plan = sceneImage ?? await svgToPng(wall === undefined ? planSvg(room, calculation, { numbers: true, furnished: exampleInterior }) : wallSvg(room, wall, wallCalculation, { numbers: true }));
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Изображение не загрузилось.")); image.src = plan; });
  const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 1400;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#f5f7fa"; context.fillRect(0, 0, 1600, 1400);
  context.fillStyle = "#172033"; context.font = "600 36px Arial"; context.fillText(`Мастерок · ${room.name}`, 64, 68, 1450);
  context.font = "24px Arial"; context.fillStyle = "#64748b";
  context.fillText(wall === undefined ? `${formatNumber(room.widthMm)} × ${formatNumber(room.lengthMm)} мм · ${floorText.title}` : `Стена ${wall + 1} · ${formatNumber(wall % 2 === 0 ? room.widthMm : room.lengthMm)} × ${formatNumber(room.heightMm)} мм · ${wallSpec ? tileDecorFor(wallSpec.decor).name : "Без облицовки"}`, 64, 112, 1450);
  const scale = Math.min(1500 / image.width, 1100 / image.height);
  context.drawImage(image, (1600 - image.width * scale) / 2, 145 + (1100 - image.height * scale) / 2, image.width * scale, image.height * scale);
  context.fillStyle = "#172033";
  context.fillText(wall === undefined ? floorText.shortSummary : wallCalculation ? `${formatNumber(wallCalculation.coveredAreaM2)} м² плитки · ${wallCalculation.baseTiles} исходных шт. · ${wallCalculation.cutTiles} с подрезкой · резерв ${wallSpec!.reservePercent}%` : "Плитка на эту стену не назначена.", 64, 1300, 1460);
  context.fillStyle = "#64748b"; context.font = "20px Arial";
  context.fillText(wall === undefined ? floorText.shortParameters : wallSpec ? `Плитка ${wallSpec.tileWidthMm} × ${wallSpec.tileHeightMm} мм; шов ${wallSpec.jointMm} мм; ${wallSpec.alignment === "center" ? "по центру" : "от края и пола"}; обрезки не используются повторно.` : "Размеры проёмов соответствуют проекту.", 64, 1346, 1460);
  if (wall === undefined && calculation.walls.length) { context.font = "18px Arial"; context.fillText(`Стены: ${formatNumber(calculation.walls.reduce((sum, item) => sum + item.coveredAreaM2, 0))} м² плитки, ${calculation.walls.reduce((sum, item) => sum + item.baseTiles, 0)} исходных шт. до резерва и упаковок.`, 64, 1326, 1460); }
  if (wall === undefined && exampleInterior) { context.font = "16px Arial"; context.fillText("Обстановка показана для примера и масштаба. Предметы интерьера не входят в ведомость материалов.", 64, 1377, 1460); }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG не создан.")), "image/png"));
  downloadFile(blob, `${safeName(room.name)}-${wall === undefined ? sceneImage ? "3D" : "план" : `стена-${wall + 1}`}.png`);
}

function cutPageImage(room: ConstructorRoom, calculation: RoomCalculation, start: number): string {
  const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 1850;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff"; context.fillRect(0, 0, 1400, 1850);
  context.fillStyle = "#172033"; context.font = "600 32px Arial"; context.fillText(`${room.name} · карты реза`, 36, 45, 1300);
  context.font = "22px Arial"; context.fillStyle = "#64748b";
  context.fillText(`Исходная доска ${room.floor.boardLengthMm} × ${room.floor.boardWidthMm} мм; пропил ${room.floor.kerfMm} мм.`, 36, 82, 1300);
  const pieceMap = new Map(calculation.pieces.map((piece, index) => [piece.id, { ...piece, number: index + 1 }]));
  calculation.sourceBoards.slice(start, start + 22).forEach((board, index) => {
    const y = 130 + index * 73;
    context.fillStyle = "#172033"; context.font = "20px Arial"; context.fillText(`Доска ${start + index + 1}`, 36, y + 25);
    const x = 185; const barWidth = 1100; const barHeight = 40;
    context.fillStyle = "#e4e8ec"; context.fillRect(x, y, barWidth, barHeight);
    board.pieceIds.forEach((id) => {
      const piece = pieceMap.get(id)!;
      const px = x + piece.sourceStartMm / room.floor.boardLengthMm * barWidth;
      const pw = piece.sourceLengthMm / room.floor.boardLengthMm * barWidth;
      const ph = piece.sourceWidthMm / room.floor.boardWidthMm * barHeight;
      context.fillStyle = decorFor(room.floor.decor).color; context.fillRect(px, y, pw, ph);
      context.fillStyle = room.floor.decor === "dark" ? "#fff" : "#30251c"; context.font = "18px Arial";
      if (pw > 70) context.fillText(`${formatNumber(piece.sourceLengthMm)}`, px + 5, y + Math.min(ph - 4, 26), Math.max(20, pw - 10));
    });
    context.fillStyle = "#64748b"; context.font = "17px Arial";
    const copy = board.pieceIds.map((id) => { const p = pieceMap.get(id)!; return `деталь ${p.number}, ряд ${p.row + 1}: ${formatNumber(p.sourceLengthMm)} × ${formatNumber(p.sourceWidthMm)}`; }).join("; ");
    context.fillText(copy, x, y + 60, 1120);
  });
  context.font = "18px Arial";
  context.fillText("Серым показаны остатки и удалённый пропил. Дополнительный резерв не раскраивается.", 36, 1798, 1320);
  return canvas.toDataURL("image/png");
}

async function pdfFont(): Promise<string> {
  const response = await fetch("/fonts/Roboto-Regular.ttf");
  if (!response.ok) throw new Error("Не загрузился шрифт для русского PDF. Повторите экспорт при доступном соединении.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.slice(offset, offset + 16384));
  return btoa(binary);
}

export async function exportConstructorPdf(workspace: ConstructorWorkspace) {
  const result = calculateProject(workspace.project);
  const cost = summarizeFinish(workspace.project, result).cost;
  const pages = result.rooms.reduce((count, room, index) => count + 1 + room.walls.length + Math.ceil(room.sourceBoards.length / 22) + Math.ceil(workspace.project.rooms[index].openings.length / 30), 1);
  if (pages > 150) throw new Error("Для этого проекта PDF превысит 150 страниц. Экспортируйте файл проекта и XLSX или разделите проект на части.");
  const [{ jsPDF }, { default: autoTable }, font] = await Promise.all([import("jspdf"), import("jspdf-autotable"), pdfFont()]);
  const document = new jsPDF();
  document.addFileToVFS("Roboto.ttf", font);
  document.addFont("Roboto.ttf", "Roboto", "normal"); document.addFont("Roboto.ttf", "Roboto", "bold");
  document.setFont("Roboto", "normal");
  document.setFontSize(11); document.text(`Мастерок · Конструктор · ${new Date().toLocaleDateString("ru-RU")}`, 14, 16);
  document.setFontSize(16);
  const title = document.splitTextToSize(workspace.project.name, 182);
  document.text(title, 14, 26);
  autoTable(document, {
    startY: 31 + title.length * 7,
    head: [["Материал и основание расчёта", "Купить", "Цена", "Сумма"]],
    body: result.purchases.map((line) => [
      `${line.name}\n${line.detail}\n${line.basis}${line.purchasedBoards !== undefined ? `\nВ упаковках ${line.purchasedBoards} досок (${formatNumber(line.purchasedAreaM2!)} м²); остаток округления ${line.packSurplusBoards} досок.` : ""}`,
      `${line.quantity} ${line.unit}`, line.unitPriceRub ? formatMoney(line.unitPriceRub) : "Не задана", line.unitPriceRub ? formatMoney(line.totalPriceRub) : "Не задана",
    ]),
    styles: { font: "Roboto", fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [234, 88, 12] },
    columnStyles: { 0: { cellWidth: 116 }, 1: { cellWidth: 22 }, 2: { cellWidth: 22 }, 3: { cellWidth: 22 } },
    margin: { left: 14, right: 14, bottom: 18 },
  });
  let y = ((document as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;
  const notes = [
    `${purchaseCostText(cost).label}: ${purchaseCostText(cost).value}.${cost.hasPrices && (cost.missingLines || cost.unconfiguredMixtures) ? " Стоимость проекта неполная." : ""}`,
    "Товар и цены задаёт пользователь. Резерв и округление выполняются после объединения совместимых помещений.",
    ...(cost.unconfiguredMixtures ? ["Выбранные смеси без указанного расхода не включены в ведомость. Введите расход в кг/м² по выбранному товару или отключите смесь."] : []),
    ...(result.purchases.some((line) => line.unitPriceRub > 0 && line.priceNote) ? ["Для одинакового товара с разными ценами использована максимальная введённая цена. Уточните цену общей закупки перед заказом."] : []),
    "Проверьте крайние детали и монтажные ограничения по инструкции покрытия. Карты показывают найденный допустимый раскрой, без гарантии минимального расхода.",
    "Подложка и плинтус рассчитаны по площади и суммарной длине; их собственный раскрой не рассчитан.",
    ...(result.rooms.some((room) => room.walls.length || room.floorTiles) ? ["Плитка: одна исходная плитка на занятую ячейку раскладки; обрезки повторно не используются. Неуложенная площадь включает потери при резке. Откосы и ниши не включены. Клей и затирка добавляются отдельно по расходу выбранного товара."] : []),
  ];
  document.setFontSize(9);
  for (const note of notes) {
    for (const line of document.splitTextToSize(note, 182)) {
      if (y > 278) { document.addPage(); y = 18; }
      document.text(line, 14, y); y += 4.5;
    }
    y += 3;
  }
  for (let index = 0; index < workspace.project.rooms.length; index++) {
    const room = workspace.project.rooms[index]; const calculated = result.rooms[index];
    document.addPage(); document.setFontSize(15); document.setTextColor(23, 32, 51);
    const roomTitle = document.splitTextToSize(room.name, 182); document.text(roomTitle, 14, 20);
    document.setFontSize(10);
    const floorText = floorExportText(room, calculated);
    const parameters = `${room.widthMm} × ${room.lengthMm} × ${room.heightMm} мм; ${floorText.parameters}`;
    const parameterLines = document.splitTextToSize(parameters, 180);
    const parameterY = Math.max(34, 24 + roomTitle.length * 7);
    document.text(parameterLines, 14, parameterY);
    const imageY = parameterY + parameterLines.length * 5 + 6;
    const imageHeight = Math.min(159.25, 235 - imageY); const imageWidth = imageHeight * 1600 / 1400;
    document.addImage(await svgToPng(planSvg(room, calculated, { numbers: true }), 1600, 1400), "PNG", (210 - imageWidth) / 2, imageY, imageWidth, imageHeight, undefined, "FAST");
    const summary = floorText.summary;
    document.text(document.splitTextToSize(summary, 180), 14, 248);
    for (const wall of calculated.walls) {
      const spec = room.wallTiles[wall.wall]!;
      document.addPage(); document.setFontSize(14);
      document.text(document.splitTextToSize(`${room.name} · стена ${wall.wall + 1}`, 182), 14, 20);
      document.setFontSize(9);
      const details = document.splitTextToSize(`${spec.materialKey} · ${tileDecorFor(spec.decor).name}. Плитка ${spec.tileWidthMm} × ${spec.tileHeightMm} мм; ${spec.orientation === "horizontal" ? "горизонтально" : "вертикально"}; шов ${spec.jointMm} мм; ${spec.alignment === "center" ? "по центру" : "от края и пола"}; резерв ${spec.reservePercent}%; ${spec.tilesPerPack} шт./уп.\n${room.continuousWallTiles ? "Сетка продолжается через углы по часовой стрелке; замыкание 4 → 1 проверьте отдельно." : "Старт этой стены независимый."}`, 182);
      document.text(details, 14, 36);
      const wallImageY = 40 + details.length * 4.5;
      document.addImage(await svgToPng(wallSvg(room, wall.wall, wall, { numbers: true }), 1600, 1400), "PNG", 14, wallImageY, 182, 159.25, undefined, "FAST");
      document.text(document.splitTextToSize(`Без проёмов ${formatNumber(wall.netAreaM2)} м²; плитки без швов ${formatNumber(wall.coveredAreaM2)} м².\nПо раскладке ${wall.baseTiles} исходных плиток, ${wall.cutTiles} с подрезкой; резерв до округления ${formatNumber(wall.reserveTiles)} шт.\nНеуложенная часть ${formatNumber(wall.unlaidAreaM2, 3)} м², включая потери при резке. Обрезки не используются повторно.\nНомера относятся к исходным плиткам этой стены. Размеры каждой части указаны в XLSX. Откосы и ниши не включены. Клей и затирка добавляются отдельно по расходу выбранного товара.`, 182), 14, Math.max(238, wallImageY + 165));
    }
    if (room.openings.length) {
      document.addPage(); document.setFontSize(13);
      const openingTitle = document.splitTextToSize(`${room.name} · проёмы`, 182); document.text(openingTitle, 14, 20);
      autoTable(document, {
        startY: 27 + openingTitle.length * 6, head: [["Тип", "Стена", "Отступ, мм", "Ширина, мм", "Высота, мм", "Низ, мм"]],
        body: room.openings.map((o) => [o.type === "door" ? "Дверь" : "Окно", o.wall + 1, o.offsetMm, o.widthMm, o.heightMm, o.sillMm]),
        styles: { font: "Roboto", fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [234, 88, 12] }, margin: { bottom: 18 },
      });
    }
    for (let start = 0; start < calculated.sourceBoards.length; start += 22) {
      document.addPage(); document.addImage(cutPageImage(room, calculated, start), "PNG", 10, 10, 190, 251, undefined, "FAST");
      // Give the UI an opportunity to update its export status for longer projects.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }
  const pageCount = document.getNumberOfPages();
  if (pageCount > 150) throw new Error("PDF превысил 150 страниц. Разделите проект или скачайте XLSX и файл проекта.");
  for (let page = 1; page <= pageCount; page++) {
    document.setPage(page); document.setFont("Roboto", "normal"); document.setFontSize(8); document.setTextColor(120, 130, 140);
    document.text(`Мастерок · getmasterok.ru · стр. ${page} из ${pageCount}`, 14, 289);
  }
  document.save(`${safeName(workspace.project.name)}.pdf`);
}

export async function exportConstructorXlsx(workspace: ConstructorWorkspace) {
  const result = calculateProject(workspace.project);
  const cost = summarizeFinish(workspace.project, result).cost;
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook(); workbook.creator = "Мастерок"; workbook.created = new Date();
  const purchases = workbook.addWorksheet("К покупке");
  purchases.columns = [
    { header: "Материал", key: "name", width: 28 }, { header: "Характеристики", key: "detail", width: 45 },
    { header: "Количество", key: "quantity", width: 15 }, { header: "Единица", key: "unit", width: 12 },
    { header: "Цена, ₽", key: "unitPriceRub", width: 15 }, { header: "Сумма, ₽", key: "totalPriceRub", width: 16 },
    { header: "Помещения", key: "roomNames", width: 28 }, { header: "Основание расчёта", key: "basis", width: 80 },
    { header: "Доски по раскрою, шт.", key: "baseBoards", width: 22 }, { header: "Резерв до округления, шт.", key: "reserveBoards", width: 22 },
    { header: "Потребность после округления, шт.", key: "roundedBoards", width: 22 }, { header: "Доски в упаковках, шт.", key: "purchasedBoards", width: 22 },
    { header: "Остаток от упаковок, шт.", key: "packSurplusBoards", width: 22 }, { header: "Купленная площадь, м²", key: "purchasedAreaM2", width: 22 },
    { header: "Условие оценки цены", key: "priceNote", width: 70 },
    { header: "Плитки по раскладке, шт.", key: "baseTiles", width: 22 }, { header: "Резерв плитки до округления, шт.", key: "reserveTiles", width: 22 },
    { header: "Потребность плитки после округления, шт.", key: "roundedTiles", width: 22 }, { header: "Плитки в упаковках, шт.", key: "purchasedTiles", width: 22 },
    { header: "Плитки сверх потребности, шт.", key: "packSurplusTiles", width: 22 },
    { header: "Поверхности", key: "surfaceNames", width: 40 },
    { header: "Смесь без запаса, кг", key: "exactNeedKg", width: 22 },
    { header: "Доп. запас, кг", key: "reserveKg", width: 22 },
    { header: "Смесь с запасом, кг", key: "neededKg", width: 22 },
    { header: "К покупке, кг", key: "purchasedKg", width: 22 },
    { header: "Остаток упаковок, кг", key: "packSurplusKg", width: 22 },
  ];
  for (const line of result.purchases) purchases.addRow({ ...line, surfaceNames: [...(line.floorRoomIds?.map((id) => `${workspace.project.rooms.find((room) => room.id === id)?.name}, пол`) ?? []), ...(line.surfaces?.map((surface) => `${workspace.project.rooms.find((room) => room.id === surface.roomId)?.name}, стена ${surface.wall + 1}`) ?? [])].join("; "), unitPriceRub: line.unitPriceRub || "Не задана", totalPriceRub: line.unitPriceRub ? line.totalPriceRub : "Не задана", roomNames: line.roomIds.map((id) => workspace.project.rooms.find((room) => room.id === id)?.name).join(", ") });
  purchases.addRow([purchaseCostText(cost).label, "", "", "", "", cost.hasPrices ? result.totalCostRub : "Цены не заданы"]);
  const parameters = workbook.addWorksheet("Исходные данные");
  parameters.addRow(["Проект", workspace.project.name]); parameters.addRow(["Дата", workspace.project.updatedAt]);
  parameters.addRow(["Помещение", "Ширина, мм", "Длина, мм", "Высота, мм", "Товар", "Декор", "Длина доски, мм", "Ширина доски, мм", "Досок/уп.", "Цена/уп., ₽", "Рисунок", "Направление", "Зазор, мм", "Пропил, мм", "Резерв, %", "Обрезки", "Подложка", "м²/рул.", "Цена/рул., ₽", "Плинтус", "Длина планки, мм", "Цена/шт., ₽"]);
  for (const room of workspace.project.rooms) { const f = room.floor; if (f.kind === "tile") continue; parameters.addRow([room.name, room.widthMm, room.lengthMm, room.heightMm, f.materialKey, decorFor(f.decor).name, f.boardLengthMm, f.boardWidthMm, f.boardsPerPack, f.packPriceRub, f.pattern === "third" ? "1/3" : "1/2", f.direction === "width" ? "Вдоль ширины" : "Вдоль длины", f.expansionGapMm, f.kerfMm, f.reservePercent, f.reuseOffcuts ? "Да" : "Нет", f.includeUnderlay ? "Да" : "Нет", f.underlayRollAreaM2, f.underlayRollPriceRub, f.includePlinth ? "Да" : "Нет", f.plinthLengthMm, f.plinthPiecePriceRub]); }
  const rooms = workbook.addWorksheet("Расчёт помещений");
  rooms.addRow(["Помещение", "Площадь, м²", "Покрытие, м²", "Детали, шт.", "Исходный материал, шт.", "Резерв до округления, шт.", "Неуложенная часть, м²", "Пропил ламината, м²", "Периметр без дверей, мм", "Покрытие"]);
  result.rooms.forEach((r, i) => rooms.addRow([workspace.project.rooms[i].name, r.areaM2, r.coveredAreaM2, r.floorTiles?.cells.length ?? r.pieces.length, r.floorTiles?.baseTiles ?? r.baseBoards, r.floorTiles?.reserveTiles ?? r.reserveBoards, r.floorTiles?.unlaidAreaM2 ?? r.offcutAreaM2, r.kerfAreaM2, r.plinthNeededMm, r.floorTiles ? "Плитка" : "Ламинат"]));
  const cuts = workbook.addWorksheet("Детали и раскрой");
  cuts.addRow(["Помещение", "Исходная доска", "Деталь", "Ряд", "Длина детали, мм", "Ширина детали, мм", "Начало на доске, мм", "X на плане, мм", "Y на плане, мм", "Заводской торец"]);
  result.rooms.forEach((r, i) => {
    const sourceNumbers = new Map(r.sourceBoards.map((board, number) => [board.id, number + 1]));
    r.pieces.forEach((p, number) => cuts.addRow([workspace.project.rooms[i].name, sourceNumbers.get(p.sourceBoardId), number + 1, p.row + 1, p.sourceLengthMm, p.sourceWidthMm, p.sourceStartMm, p.xMm, p.yMm, { start: "Правый", end: "Левый", whole: "Оба", single: "Оба; продольный рез" }[p.end]]));
  });
  const openings = workbook.addWorksheet("Проёмы");
  const wallParameters = workbook.addWorksheet("Параметры плитки");
  wallParameters.addRow(["Помещение", "Стена", "Товар", "Образец", "Ширина плитки, мм", "Высота плитки, мм", "Ориентация", "Шов, мм", "Старт", "Через углы", "Запас, %", "шт./уп.", "Цена/уп., ₽"]);
  const wallResults = workbook.addWorksheet("Расчёт стен");
  wallResults.addRow(["Помещение", "Стена", "Ширина, мм", "Высота, мм", "Без проёмов, м²", "Плитка без швов, м²", "Исходные плитки, шт.", "С подрезкой, шт.", "Резерв до округления, шт.", "Неуложенная часть, м²"]);
  const wallCuts = workbook.addWorksheet("Детали плитки");
  wallCuts.addRow(["Помещение", "Стена", "Исходная плитка", "Ряд", "Колонка", "Прямоугольный участок", "X, мм", "Y от пола, мм", "Ширина, мм", "Высота, мм", "Подрезка"]);
  const cutReview = workbook.addWorksheet("Подрезки плитки");
  cutReview.addRow(["Помещение", "Стена", "Исходная плитка", "Часть после выреза", "Всего частей этой плитки", "X габарита, мм", "Y габарита от пола, мм", "Ширина габарита, мм", "Высота габарита, мм", "Меньшая сторона габарита, мм", "Форма", "Площадь части, м²"]);
  cutReview.autoFilter = { from: "A1", to: "L1" };
  result.rooms.forEach((calculated, index) => reviewWallCuts(calculated.walls).forEach((entry) => entry.parts.forEach((part, partIndex) => cutReview.addRow([workspace.project.rooms[index].name, entry.wall + 1, entry.tileNumber, partIndex + 1, entry.parts.length, part.bounds.xMm, part.bounds.yMm, part.bounds.widthMm, part.bounds.heightMm, Math.min(part.bounds.widthMm, part.bounds.heightMm), part.rectangular ? "Прямоугольная" : "Фигурная; размеры — габариты", part.areaM2]))));
  result.rooms.forEach((calculated, index) => calculated.walls.forEach((wall) => {
    const room = workspace.project.rooms[index], spec = room.wallTiles[wall.wall]!;
    wallParameters.addRow([room.name, wall.wall + 1, spec.materialKey, tileDecorFor(spec.decor).name, spec.tileWidthMm, spec.tileHeightMm, spec.orientation === "horizontal" ? "Горизонтально" : "Вертикально", spec.jointMm, spec.alignment === "center" ? "По центру" : "От края и пола", room.continuousWallTiles ? "Да" : "Нет", spec.reservePercent, spec.tilesPerPack, spec.packPriceRub]);
    wallResults.addRow([room.name, wall.wall + 1, wall.widthMm, wall.heightMm, wall.netAreaM2, wall.coveredAreaM2, wall.baseTiles, wall.cutTiles, wall.reserveTiles, wall.unlaidAreaM2]);
    wall.cells.forEach((cell, tileIndex) => cell.fragments.forEach((p, part) => wallCuts.addRow([room.name, wall.wall + 1, tileIndex + 1, cell.row + 1, cell.column + 1, part + 1, p.xMm, p.yMm, p.widthMm, p.heightMm, cell.isCut ? "Да" : "Нет"])));
  }));
  const floorParameters = workbook.addWorksheet("Плиточный пол");
  floorParameters.addRow(["Помещение", "Ширина, мм", "Длина, мм", "Товар", "Образец", "Ширина плитки, мм", "Длина плитки, мм", "Направление", "Шов, мм", "Зазор у стен, мм", "Старт", "Запас, %", "шт./уп.", "Цена/уп., ₽", "Укладка со швами, м²", "Самой плитки, м²", "Исходные плитки", "С подрезкой", "Неуложенная часть, м²"]);
  const floorCuts = workbook.addWorksheet("Детали плиточного пола");
  floorCuts.addRow(["Помещение", "Исходная плитка", "Ряд", "Колонка", "X на плане, мм", "Y на плане, мм", "Ширина детали, мм", "Длина детали, мм", "Подрезка"]);
  result.rooms.forEach((calculated, index) => {
    const floor = calculated.floorTiles; if (!floor) return;
    const room = workspace.project.rooms[index], spec = room.floor.tile!;
    floorParameters.addRow([room.name, room.widthMm, room.lengthMm, spec.materialKey, tileDecorFor(spec.decor).name, spec.tileWidthMm, spec.tileHeightMm, spec.orientation === "horizontal" ? "Вдоль ширины" : "Вдоль длины", spec.jointMm, spec.edgeGapMm, spec.alignment === "center" ? "По центру" : "От края", spec.reservePercent, spec.tilesPerPack, spec.packPriceRub, floor.netAreaM2, floor.coveredAreaM2, floor.baseTiles, floor.cutTiles, floor.unlaidAreaM2]);
    floor.cells.forEach((cell, number) => cell.fragments.forEach((p) => floorCuts.addRow([room.name, number + 1, cell.row + 1, cell.column + 1, p.xMm, p.yMm, p.widthMm, p.heightMm, cell.isCut ? "Да" : "Нет"])));
  });
  const mixtures = workbook.addWorksheet("Клей и затирка");
  mixtures.addRow(["Помещение", "Смесь", "Товар", "Расход, кг/м²", "Доп. запас, %", "Масса уп., кг", "Цена/уп., ₽", "Состояние"]);
  workspace.project.rooms.forEach((room) => (["adhesive", "grout"] as const).forEach((kind) => {
    const spec = room.tileSupplies?.[kind]; if (spec) mixtures.addRow([room.name, kind === "adhesive" ? "Клей" : "Затирка", spec.materialKey, spec.consumptionKgM2, spec.reservePercent, spec.packageKg, spec.packagePriceRub, spec.consumptionKgM2 === 0 ? "Расход не задан; не входит в закупку" : "По указанному расходу для плиточных поверхностей"]);
  }));
  openings.addRow(["Помещение", "Тип", "Стена", "Отступ от начала, мм", "Ширина, мм", "Высота, мм", "Низ, мм"]);
  workspace.project.rooms.forEach((room) => room.openings.forEach((o) => openings.addRow([room.name, o.type === "door" ? "Дверь" : "Окно", o.wall + 1, o.offsetMm, o.widthMm, o.heightMm, o.sillMm])));
  const notes = workbook.addWorksheet("Принятые условия");
  notes.addRow(["Условие", "Описание"]);
  notes.addRow(["Резерв и упаковки", "Совместимые комнаты объединяются до округления до досок и упаковок. Цены вводит пользователь; цена не разделяет одинаковый товар."]);
  notes.addRow(["Оценка стоимости", "При разных ценах одинакового товара для общей закупки взята максимальная введённая цена. Если все цены нулевые, цена считается не заданной и стоимость позиции не включается в сумму."]);
  notes.addRow(["Раскрой", "Сохраняются противоположные заводские торцы. Средние обрезки и продольные полосы не переиспользуются; минимум отхода не гарантируется."]);
  notes.addRow(["Подложка и плинтус", "По площади покрытия и суммарной длине с вычитанием дверей; собственный раскрой не рассчитан."]);
  notes.addRow(["Плитка", "Одна исходная плитка на занятую ячейку. Части вокруг проёма сохраняют номер одной плитки. Обрезки не используются повторно; неуложенная часть включает потери при резке. Откосы и ниши не включены. Клей и затирка добавляются отдельно по расходу выбранного товара."]);
  notes.addRow(["Клей и затирка", "Площадь укладки со швами × указанный расход в кг/м²; затем дополнительный запас и объединение одинакового товара перед округлением до упаковок. Запас и упаковки плитки не увеличивают площадь для смеси. Выбранная смесь без расхода не включается в ведомость."]);
  notes.addRow(["Подрезки плитки", "Лист «Подрезки плитки» объединяет связанные прямоугольные участки в одну часть. Размеры фигурной части — её габариты; ширину перемычек и вырезы проверяют на развёртке. Допустимость реза не оценивается. Лист «Детали плитки» содержит прямоугольные участки видимой поверхности; их внутренние границы не являются швами или отдельными деталями."]);
  notes.addRow(["Продолжение через углы", "Общие параметры и горизонтальная фаза сетки для четырёх стен. Подрезки в разных стенах считаются отдельными исходными плитками; замыкание стен 4 и 1 проверяется отдельно."]);
  result.rooms.forEach((r, i) => r.warnings.forEach((warning) => notes.addRow([workspace.project.rooms[i].name, warning])));
  workbook.eachSheet((sheet) => {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    if (sheet !== purchases) sheet.columns.forEach((column) => { column.width = 23; });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
    sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeName(workspace.project.name)}.xlsx`);
}
