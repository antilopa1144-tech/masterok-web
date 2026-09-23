import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  DocumentLineTotal,
  DocumentPrice,
  ProjectDocumentGeneratorOptions,
  ProjectDocumentInput,
  ProjectDocumentTotals,
} from './document-types';

export type { ProjectDocumentInput, ProjectDocumentTotals } from './document-types';

const BRAND_ORANGE: [number, number, number] = [234, 88, 12];
const BRAND_DARK: [number, number, number] = [23, 33, 43];
const MUTED: [number, number, number] = [93, 103, 113];
const RUB = '₽';
const MAX_DOCUMENT_LINES = 300;
const MAX_LAYOUTS = 5;
const MAX_TEXT_LENGTH = 4_000;
const MAX_PROJECT_NAME_LENGTH = 240;
const MAX_LINE_NAME_LENGTH = 512;
const MAX_SHORT_TEXT_LENGTH = 250;
const MAX_NOTES_PER_SECTION = 30;
const MAX_TOTAL_NOTE_CHARACTERS = 30_000;
const MAX_QUANTITY = 1_000_000_000;
const MAX_PRICE = 1_000_000_000_000;
const MAX_LINE_TOTAL = 1_000_000_000_000_000;
const MAX_LAYOUT_DATA_URL_LENGTH = 2_800_000;
const MAX_LAYOUT_PIXELS = 12_000_000;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNonNegative(value: unknown, label: string, maximum = MAX_QUANTITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) {
    throw new Error(`${label} must be a finite non-negative number not greater than ${maximum}`);
  }
  return value;
}

function lineTotal(key: string, quantity: number, price?: DocumentPrice): DocumentLineTotal {
  const safeQuantity = finiteNonNegative(quantity, `Quantity for ${key}`);
  if (!price) return { key, quantity: safeQuantity, priceKnown: false };
  const unitPrice = finiteNonNegative(price.amount, `Price for ${key}`, MAX_PRICE);
  return { key, quantity: safeQuantity, unitPrice, total: safeQuantity * unitPrice, priceKnown: true };
}

function requireText(value: unknown, label: string, maximum = MAX_TEXT_LENGTH): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  if (value.length > maximum) throw new Error(`${label} exceeds ${maximum} characters`);
}

function validateOptionalText(value: unknown, label: string, maximum = MAX_TEXT_LENGTH): void {
  if (value == null) return;
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  if (value.length > maximum) throw new Error(`${label} exceeds ${maximum} characters`);
}

function validateIsoDate(value: unknown): void {
  requireText(value, 'Document date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Document date must use YYYY-MM-DD');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Document date is invalid');
}

function validateOptionalStringArray(value: unknown, label: string): void {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > MAX_NOTES_PER_SECTION) throw new Error(`${label} must contain at most ${MAX_NOTES_PER_SECTION} items`);
  value.forEach((item, index) => requireText(item, `${label}[${index}]`));
}

function validateParty(value: unknown, label: string): void {
  if (value == null) return;
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  validateOptionalText(value.name, `${label}.name`, MAX_PROJECT_NAME_LENGTH);
  validateOptionalText(value.contact, `${label}.contact`, MAX_SHORT_TEXT_LENGTH);
  validateOptionalText(value.details, `${label}.details`, 2_000);
}

function validateOptionalRecord(value: unknown, label: string): asserts value is Record<string, unknown> | undefined {
  if (value != null && !isRecord(value)) throw new Error(`${label} must be an object`);
}

function validatePrice(price: unknown, label: string): void {
  if (!isRecord(price)) throw new Error(`${label} must be an object`);
  finiteNonNegative(price.amount, `${label}.amount`, MAX_PRICE);
  if (price.currency !== 'RUB') throw new Error(`${label}.currency must be RUB`);
  requireText(price.provenance, `${label}.provenance`, MAX_SHORT_TEXT_LENGTH);
}

function validateOptionalPrice(price: unknown, label: string): void {
  if (price != null) validatePrice(price, label);
}

function validateLineTotal(quantity: unknown, price: unknown, label: string): void {
  const safeQuantity = finiteNonNegative(quantity, `${label}.quantity`);
  if (price == null) return;
  if (!isRecord(price)) return;
  const safePrice = finiteNonNegative(price.amount, `${label}.unitPrice.amount`, MAX_PRICE);
  if (safeQuantity * safePrice > MAX_LINE_TOTAL) throw new Error(`${label} total exceeds ${MAX_LINE_TOTAL}`);
}

function validateProject(input: Record<string, unknown>): void {
  if (!isRecord(input.project)) throw new Error('project must be an object');
  requireText(input.project.id, 'Project id', MAX_SHORT_TEXT_LENGTH);
  requireText(input.project.name, 'Project name', MAX_PROJECT_NAME_LENGTH);
  validateIsoDate(input.project.documentDate);
  validateOptionalText(input.project.version, 'Project version', MAX_SHORT_TEXT_LENGTH);
}

function validateMaterials(value: unknown): void {
  if (!Array.isArray(value) || value.length > MAX_DOCUMENT_LINES) throw new Error(`materials must contain at most ${MAX_DOCUMENT_LINES} items`);
  const keys = new Set<string>();
  value.forEach((line, index) => {
    if (!isRecord(line)) throw new Error(`materials[${index}] must be an object`);
    requireText(line.key, `materials[${index}].key`, MAX_SHORT_TEXT_LENGTH);
    if (keys.has(line.key)) throw new Error(`Material key ${line.key} is duplicated`);
    keys.add(line.key);
    requireText(line.name, `materials[${index}].name`, MAX_LINE_NAME_LENGTH);
    requireText(line.unit, `materials[${index}].unit`, MAX_SHORT_TEXT_LENGTH);
    validateOptionalText(line.subtitle, `materials[${index}].subtitle`, MAX_TEXT_LENGTH);
    validateOptionalText(line.packaging, `materials[${index}].packaging`, MAX_TEXT_LENGTH);
    finiteNonNegative(line.quantity, `materials[${index}].quantity`);
    if (line.exactQuantity != null) finiteNonNegative(line.exactQuantity, `materials[${index}].exactQuantity`);
    if (line.reservePercent != null) finiteNonNegative(line.reservePercent, `materials[${index}].reservePercent`, 100);
    validateOptionalPrice(line.unitPrice, `materials[${index}].unitPrice`);
    validateLineTotal(line.quantity, line.unitPrice, `materials[${index}]`);
  });
}

function validateWorks(value: unknown): void {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > MAX_DOCUMENT_LINES) throw new Error(`works must contain at most ${MAX_DOCUMENT_LINES} items`);
  const keys = new Set<string>();
  value.forEach((line, index) => {
    if (!isRecord(line)) throw new Error(`works[${index}] must be an object`);
    requireText(line.key, `works[${index}].key`, MAX_SHORT_TEXT_LENGTH);
    if (keys.has(line.key)) throw new Error(`Work key ${line.key} is duplicated`);
    keys.add(line.key);
    requireText(line.name, `works[${index}].name`, MAX_LINE_NAME_LENGTH);
    requireText(line.unit, `works[${index}].unit`, MAX_SHORT_TEXT_LENGTH);
    finiteNonNegative(line.quantity, `works[${index}].quantity`);
    validateOptionalPrice(line.unitPrice, `works[${index}].unitPrice`);
    validateLineTotal(line.quantity, line.unitPrice, `works[${index}]`);
  });
}

function validatePngLayout(dataUrl: unknown, declaredWidth: unknown, declaredHeight: unknown): void {
  requireText(dataUrl, 'Layout image data URL', MAX_LAYOUT_DATA_URL_LENGTH);
  const safeWidth = finiteNonNegative(declaredWidth, 'Layout image width', MAX_LAYOUT_PIXELS);
  const safeHeight = finiteNonNegative(declaredHeight, 'Layout image height', MAX_LAYOUT_PIXELS);
  if (!Number.isInteger(safeWidth) || !Number.isInteger(safeHeight)) throw new Error('Layout image dimensions must be integers');
  if (dataUrl.length > MAX_LAYOUT_DATA_URL_LENGTH) {
    throw new Error('Layout image exceeds the document image size limit');
  }
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('Layout image must be a base64 PNG data URL');
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length < 24 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new Error('Layout image is not a real PNG');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width * height > MAX_LAYOUT_PIXELS) {
    throw new Error('Layout image dimensions exceed the document pixel limit');
  }
  if (declaredWidth !== width || declaredHeight !== height) {
    throw new Error('Layout image dimensions do not match PNG metadata');
  }
}

/**
 * Bounded validation for endpoint adapters before PDF/XLSX allocation.
 * The endpoint remains responsible for authorisation and its 3 MB request cap.
 */
export function validateProjectDocumentInput(input: unknown): asserts input is ProjectDocumentInput {
  if (!isRecord(input)) throw new Error('Document input must be an object');
  validateProject(input);
  validateMaterials(input.materials);
  validateWorks(input.works);
  if ((input.materials as unknown[]).length + (Array.isArray(input.works) ? input.works.length : 0) > MAX_DOCUMENT_LINES) {
    throw new Error(`Document has more than ${MAX_DOCUMENT_LINES} material and work lines`);
  }
  validateOptionalStringArray(input.assumptions, 'assumptions');
  validateOptionalStringArray(input.terms, 'terms');
  const assumptions = input.assumptions as string[] | undefined;
  const terms = input.terms as string[] | undefined;
  const totalNoteCharacters = [...(assumptions ?? []), ...(terms ?? [])].reduce((sum, note) => sum + note.length, 0);
  if (totalNoteCharacters > MAX_TOTAL_NOTE_CHARACTERS) throw new Error(`Document notes exceed ${MAX_TOTAL_NOTE_CHARACTERS} characters`);
  if (input.parties != null) {
    if (!isRecord(input.parties)) throw new Error('parties must be an object');
    validateParty(input.parties.customer, 'parties.customer');
    validateParty(input.parties.contractor, 'parties.contractor');
    validateOptionalText(input.parties.object, 'parties.object', 1_000);
    validateOptionalText(input.parties.notes, 'parties.notes', MAX_TEXT_LENGTH);
  }
  if (input.delivery != null) {
    if (!isRecord(input.delivery)) throw new Error('delivery must be an object');
    validateOptionalPrice(input.delivery.amount, 'delivery.amount');
    validateOptionalText(input.delivery.note, 'delivery.note', MAX_TEXT_LENGTH);
    if (input.delivery.amount == null && input.delivery.note == null) throw new Error('delivery needs an amount or a note');
  }
  if (input.monetaryReserve != null) {
    if (!isRecord(input.monetaryReserve)) throw new Error('monetaryReserve must be an object');
    // Percent is descriptive metadata for an explicitly entered reserve amount;
    // it is never applied again and therefore cannot double-count the reserve.
    validatePrice(input.monetaryReserve.amount, 'monetaryReserve.amount');
    if (input.monetaryReserve.percent != null) finiteNonNegative(input.monetaryReserve.percent, 'monetaryReserve.percent', 100);
    validateOptionalText(input.monetaryReserve.note, 'monetaryReserve.note', MAX_TEXT_LENGTH);
  }
  if (input.layouts != null) {
    if (!Array.isArray(input.layouts) || input.layouts.length > MAX_LAYOUTS) throw new Error(`layouts must contain at most ${MAX_LAYOUTS} items`);
    input.layouts.forEach((layout, index) => {
      if (!isRecord(layout)) throw new Error(`layouts[${index}] must be an object`);
      if (layout.kind !== 'tile' && layout.kind !== 'laminate') throw new Error(`layouts[${index}].kind is not supported`);
      requireText(layout.title, `layouts[${index}].title`, MAX_LINE_NAME_LENGTH);
      requireText(layout.summary, `layouts[${index}].summary`, MAX_TEXT_LENGTH);
      validateOptionalText(layout.sourceLabel, `layouts[${index}].sourceLabel`, MAX_SHORT_TEXT_LENGTH);
      if (layout.image != null) {
        if (!isRecord(layout.image)) throw new Error(`layouts[${index}].image must be an object`);
        validatePngLayout(layout.image.dataUrl, layout.image.width, layout.image.height);
      }
    });
  }
}

/** Calculates only from supplied prices. A missing price is never interpreted as zero. */
export function buildDocumentTotals(input: ProjectDocumentInput): ProjectDocumentTotals {
  validateProjectDocumentInput(input);
  const materials = input.materials.map((line) => lineTotal(line.key, line.quantity, line.unitPrice));
  const works = (input.works ?? []).map((line) => lineTotal(line.key, line.quantity, line.unitPrice));
  const materialsKnownTotal = materials.reduce((sum, line) => sum + (line.total ?? 0), 0);
  const worksKnownTotal = works.reduce((sum, line) => sum + (line.total ?? 0), 0);
  const deliveryKnownTotal = input.delivery?.amount ? finiteNonNegative(input.delivery.amount.amount, 'Delivery price') : 0;
  const monetaryReserveKnownTotal = input.monetaryReserve?.amount
    ? finiteNonNegative(input.monetaryReserve.amount.amount, 'Monetary reserve')
    : 0;
  const hasUnknownPrices = materials.some((line) => !line.priceKnown)
    || works.some((line) => !line.priceKnown)
    || Boolean(input.delivery && !input.delivery.amount && !input.delivery.note)
    || Boolean(input.monetaryReserve && !input.monetaryReserve.amount && !input.monetaryReserve.note);
  return {
    materials,
    works,
    materialsKnownTotal,
    worksKnownTotal,
    deliveryKnownTotal,
    monetaryReserveKnownTotal,
    knownGrandTotal: materialsKnownTotal + worksKnownTotal + deliveryKnownTotal + monetaryReserveKnownTotal,
    hasUnknownPrices,
  };
}

function number(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value);
}

function money(price?: DocumentPrice): string {
  return price ? `${number(price.amount)} ${RUB}` : 'Цена не указана';
}

function safeText(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  // Formula injection affects spreadsheets, but the same visible marker helps
  // distinguish imported values. XLSX writer applies the protection separately.
  return trimmed;
}

function spreadsheetText(value: string | undefined): string {
  const text = safeText(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

async function resolveRobotoBase64(options: ProjectDocumentGeneratorOptions): Promise<string> {
  if (options.fontBase64) return options.fontBase64;
  return (await readFile(join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'))).toString('base64');
}

function textLines(value: string | undefined, fallback = '—'): string {
  return safeText(value) || fallback;
}

/** Builds the project PDF entirely server-side. Access checks belong to the calling endpoint. */
export async function generateProjectPdf(
  input: ProjectDocumentInput,
  options: ProjectDocumentGeneratorOptions = {},
): Promise<Uint8Array> {
  validateProjectDocumentInput(input);
  const [{ jsPDF }, autoTableModule, fontBase64] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    resolveRobotoBase64(options),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');

  const totals = buildDocumentTotals(input);
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;
  const header = (title: string, subtitle?: string) => {
    doc.setFillColor(...BRAND_ORANGE);
    doc.rect(margin, y, 7, 1.4, 'F');
    doc.setFont('Roboto', 'bold'); doc.setFontSize(9); doc.setTextColor(...BRAND_DARK);
    doc.text('Мастерок', margin + 10, y + 1.4);
    if (subtitle) { doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(subtitle, pageWidth - margin, y + 1.4, { align: 'right' }); }
    doc.setDrawColor(211, 216, 220); doc.setLineWidth(.25); doc.line(margin, y + 5, pageWidth - margin, y + 5);
    y += 15;
    doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text(title, margin, y); y += 7;
  };
  const ensureSpace = (height: number) => { if (y + height > pageHeight - 18) { doc.addPage(); y = margin; } };
  const section = (title: string) => {
    ensureSpace(13);
    doc.setDrawColor(211, 216, 220); doc.setLineWidth(.25); doc.line(margin, y - 3, pageWidth - margin, y - 3);
    doc.setFont('Roboto', 'bold'); doc.setFontSize(12); doc.setTextColor(...BRAND_DARK);
    doc.text(title, margin, y + 3); y += 10;
  };

  header('Смета проекта', `${input.project.documentDate}  /  версия ${input.project.version ?? '1'}`);
  doc.setFont('Roboto', 'bold'); doc.setFontSize(20); doc.setTextColor(...BRAND_DARK);
  const projectTitle = doc.splitTextToSize(textLines(input.project.name), pageWidth - margin * 2); doc.text(projectTitle, margin, y); y += projectTitle.length * 8;
  doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  const shortId = input.project.id.length > 48 ? `${input.project.id.slice(0, 20)}…${input.project.id.slice(-12)}` : input.project.id;
  doc.text(`Проект: ${shortId}`, margin, y); y += 7;

  const partyRows = [
    ['Заказчик', textLines(input.parties?.customer?.name), textLines(input.parties?.customer?.contact)],
    ['Подрядчик', textLines(input.parties?.contractor?.name), textLines(input.parties?.contractor?.contact)],
    ['Объект', textLines(input.parties?.object), ''],
  ];
  autoTable(doc, { startY: y, body: partyRows, theme: 'plain', margin: { left: margin, right: margin },
    styles: { font: 'Roboto', fontSize: 8.5, cellPadding: 1.7, lineColor: [228, 228, 228], lineWidth: .1 },
    // A4 printable width is 182 mm (210 - 14 mm margins on each side).
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 1: { cellWidth: 99 }, 2: { cellWidth: 55 } },
  });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;
  ensureSpace(30);
  doc.setDrawColor(...BRAND_DARK); doc.setLineWidth(.55); doc.line(margin, y, pageWidth - margin, y);
  doc.setFillColor(...BRAND_ORANGE); doc.rect(margin, y + 6, 1.4, 12, 'F');
  doc.setFont('Roboto', 'bold'); doc.setFontSize(10); doc.setTextColor(...BRAND_DARK);
  doc.text('Итого по указанным ценам', margin + 5, y + 13);
  doc.setFontSize(21); doc.text(`${number(totals.knownGrandTotal)} ${RUB}`, pageWidth - margin, y + 14, { align: 'right' });
  doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(totals.hasUnknownPrices ? 'Позиции без цены не включены в итог.' : 'Итог по введённым ценам; проверьте их перед закупкой.', margin + 5, y + 23);
  y += 32;

  section('Смета');
  const materialRows = input.materials.map((line, index) => [
    String(index + 1), safeText(line.name),
    `${number(line.quantity)} ${safeText(line.unit)}`,
    money(line.unitPrice),
    line.unitPrice ? `${number(line.quantity * line.unitPrice.amount)} ${RUB}` : 'Не рассчитано',
  ]);
  autoTable(doc, { startY: y, head: [['№', 'Материал', 'Кол-во', 'Цена', 'Сумма']], body: materialRows, theme: 'striped', margin: { left: margin, right: margin },
    styles: { font: 'Roboto', fontSize: 8, cellPadding: 2, valign: 'middle', lineColor: [220, 220, 220], lineWidth: .1 },
    headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: BRAND_DARK, textColor: 255 },
    alternateRowStyles: { fillColor: [246, 247, 248] },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 72 }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 36, halign: 'right' }, 4: { cellWidth: 38, halign: 'right' } },
  });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 6;
  ensureSpace(24);
  autoTable(doc, { startY: y, body: [
    ['Материалы по указанным ценам', `${number(totals.materialsKnownTotal)} ${RUB}`],
    ['Работы по указанным ценам', `${number(totals.worksKnownTotal)} ${RUB}`],
    ['Доставка', input.delivery?.amount ? money(input.delivery.amount) : (input.delivery?.note || 'Не указана')],
    ['Денежный резерв', input.monetaryReserve?.amount ? money(input.monetaryReserve.amount) : (input.monetaryReserve?.note || 'Не указан')],
    ['Итого по указанным ценам', `${number(totals.knownGrandTotal)} ${RUB}`],
  ], theme: 'plain', margin: { left: pageWidth - margin - 82, right: margin }, styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.3 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 53 }, 1: { halign: 'right', cellWidth: 29 } }, });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;

  ensureSpace(28);
  section('Закупочный список');
  doc.setFont('Roboto', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text('Количество сформировано по сохранённым данным проекта', margin, y); y += 5;
  autoTable(doc, { startY: y, head: [['Материал', 'Точная потребность', 'К покупке', 'Упаковка / запас', 'Цена']], body: input.materials.map((line) => [
    `${safeText(line.name)}${line.subtitle ? `\n${safeText(line.subtitle)}` : ''}`,
    line.exactQuantity == null ? 'Не указана' : `${number(line.exactQuantity)} ${safeText(line.unit)}`,
    `${number(line.quantity)} ${safeText(line.unit)}`,
    [line.packaging, line.reservePercent == null ? undefined : `Запас ${number(line.reservePercent)} %`].filter(Boolean).join('\n') || '—',
    money(line.unitPrice),
  ]), theme: 'striped', margin: { left: margin, right: margin }, styles: { font: 'Roboto', fontSize: 8, cellPadding: 1.3, lineColor: [220, 220, 220], lineWidth: .1 }, headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: BRAND_DARK, textColor: 255 }, alternateRowStyles: { fillColor: [246, 247, 248] }, columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 31, halign: 'right' }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 33 }, 4: { cellWidth: 24, halign: 'right' } }, });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;

  if (input.works?.length) {
    // Keep a short works table with the following conditions instead of
    // leaving an almost empty last page containing conditions alone.
    ensureSpace(50);
    section('Работы');
    autoTable(doc, { startY: y, head: [['Работа', 'Объём', 'Цена', 'Сумма']], body: input.works.map((line) => [safeText(line.name), `${number(line.quantity)} ${safeText(line.unit)}`, money(line.unitPrice), line.unitPrice ? `${number(line.quantity * line.unitPrice.amount)} ${RUB}` : 'Не рассчитано']), theme: 'striped', margin: { left: margin, right: margin }, styles: { font: 'Roboto', fontSize: 8, cellPadding: 2 }, headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: BRAND_DARK, textColor: 255 }, alternateRowStyles: { fillColor: [246, 247, 248] }, columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 28, halign: 'right' }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 33, halign: 'right' } } });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;
  }

  ensureSpace(25);
  section('Условия и допущения');
  const notes = [
    ...(input.assumptions ?? []),
    ...(input.terms ?? []),
    ...(input.parties?.contractor?.details ? [`Реквизиты исполнителя: ${input.parties.contractor.details}`] : []),
    ...(input.parties?.customer?.details ? [`Сведения заказчика: ${input.parties.customer.details}`] : []),
    ...(input.parties?.notes ? [input.parties.notes] : []),
    ...(totals.hasUnknownPrices ? ['Итог включает только строки с указанной ценой. Строки без цены не считаются бесплатными.'] : []),
  ];
  if (notes.length) {
    autoTable(doc, { startY: y, body: notes.map((note, index) => [`${index + 1}.`, safeText(note)]), theme: 'plain', margin: { left: margin, right: margin }, styles: { font: 'Roboto', fontSize: 9, cellPadding: 2, valign: 'top' }, columnStyles: { 0: { cellWidth: 10, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - margin * 2 - 10 } } });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 8;
  } else { doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text('Допущения и условия не указаны.', margin, y); y += 9; }

  for (const layout of input.layouts ?? []) {
    ensureSpace(45); section(layout.kind === 'tile' ? 'Раскладка плитки' : 'Раскладка ламината');
    autoTable(doc, { startY: y, body: [[safeText(layout.title)], [safeText(layout.summary)]], theme: 'plain', margin: { left: margin, right: margin, bottom: 18 }, styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' } });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 4;
    if (layout.image?.dataUrl.startsWith('data:image/png') && layout.image.width > 0 && layout.image.height > 0) {
      const maxW = pageWidth - margin * 2; const maxH = 112; const ratio = layout.image.width / layout.image.height;
      const imageW = Math.min(maxW, maxH * ratio); const imageH = imageW / ratio;
      ensureSpace(imageH + 5); doc.addImage(layout.image.dataUrl, 'PNG', margin, y, imageW, imageH, undefined, 'FAST'); y += imageH + 5;
    }
    if (layout.sourceLabel) { doc.setFontSize(7.5); doc.setTextColor(...MUTED); const sourceLines = doc.splitTextToSize(`Источник: ${safeText(layout.sourceLabel)}`, pageWidth - margin * 2); ensureSpace(sourceLines.length * 4 + 3); doc.text(sourceLines, margin, y); y += sourceLines.length * 4 + 3; }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    if (page > 1) { doc.setFillColor(...BRAND_ORANGE); doc.rect(margin, 10, 7, 1.4, 'F'); }
    doc.setDrawColor(211, 216, 220); doc.setLineWidth(.25); doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('Roboto', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('Мастерок · Смета проекта', margin, pageHeight - 8);
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

function moneyFormula(quantityCell: string, priceCell: string): string {
  return `=IF(${priceCell}="","",${quantityCell}*${priceCell})`;
}

/** Builds an XLSX with only supplied prices; strings that look like formulas are escaped. */
export async function generateProjectXlsx(input: ProjectDocumentInput): Promise<Uint8Array> {
  validateProjectDocumentInput(input);
  const totals = buildDocumentTotals(input);
  const exceljsModule = await import('exceljs');
  // Vite exposes named exports in tests; Node's server-side ESM bridge exposes
  // this CommonJS package under default.
  const ExcelJS = (exceljsModule.default ?? exceljsModule) as typeof import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Мастерок'; workbook.created = new Date();
  const orange = 'EA580C'; const lightOrange = 'FFF1E8'; const border = { style: 'thin' as const, color: { argb: 'FFE4E4E7' } };
  const styleHeader = (sheet: import('exceljs').Worksheet, title: string, columns = 8) => {
    const lastColumn = String.fromCharCode(64 + columns); sheet.mergeCells(`A1:${lastColumn}1`); const cell = sheet.getCell('A1'); cell.value = title; cell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orange } }; cell.alignment = { vertical: 'middle' }; sheet.getRow(1).height = 28;
    sheet.getCell('A2').value = 'Проект'; sheet.getCell('B2').value = spreadsheetText(input.project.name); sheet.getCell('A3').value = 'Дата'; sheet.getCell('B3').value = spreadsheetText(input.project.documentDate);
    sheet.getCell('A4').value = 'Версия'; sheet.getCell('B4').value = spreadsheetText(input.project.version ?? '1');
    [2, 3, 4].forEach((row) => { sheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF334155' } }; });
    sheet.pageSetup = { printTitlesRow: '1:5', orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .25, right: .25, top: .4, bottom: .4, header: .15, footer: .15 } };
    sheet.headerFooter.oddFooter = `&CМастерок · ${input.project.name.replace(/&/g, '&&')} · Страница &P из &N`;
  };
  const addTableHeader = (sheet: import('exceljs').Worksheet, row: number, labels: string[]) => {
    labels.forEach((label, index) => { const cell = sheet.getCell(row, index + 1); cell.value = label; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orange } }; cell.alignment = { wrapText: true, vertical: 'middle' }; });
  };
  const formatTable = (sheet: import('exceljs').Worksheet, from: number, to: number, columns: number) => { for (let r = from; r <= to; r++) for (let c = 1; c <= columns; c++) { const cell = sheet.getCell(r, c); cell.border = { top: border, bottom: border, left: border, right: border }; cell.alignment = { wrapText: true, vertical: 'top' }; } };

  const overview = workbook.addWorksheet('Обзор', { views: [{ state: 'frozen', ySplit: 4 }] }); styleHeader(overview, 'Мастерок · обзор сметы', 3);
  overview.getCell('A6').value = 'Материалы по указанным ценам'; overview.getCell('B6').value = { formula: "='Смета'!G" + (input.materials.length + 7), result: totals.materialsKnownTotal };
  overview.getCell('A7').value = 'Работы по указанным ценам'; overview.getCell('B7').value = { formula: input.works?.length ? "=SUM('Работы'!F6:F" + (input.works.length + 5) + ")" : "=0", result: totals.worksKnownTotal };
  overview.getCell('A8').value = 'Доставка'; overview.getCell('B8').value = { formula: `IF('Исходные данные'!B10="","Не указана",'Исходные данные'!B10)`, result: input.delivery?.amount?.amount ?? "Не указана" };
  overview.getCell('A9').value = 'Денежный резерв'; overview.getCell('B9').value = { formula: `IF('Исходные данные'!B11="","Не указан",'Исходные данные'!B11)`, result: input.monetaryReserve?.amount?.amount ?? "Не указан" };
  overview.getCell('A10').value = 'Итого по указанным ценам'; overview.getCell('B10').value = { formula: '=SUM(B6:B9)', result: totals.knownGrandTotal };
  overview.getCell('A12').value = totals.hasUnknownPrices ? 'Есть позиции без цены: они не включены в итог.' : 'Все позиции имеют указанную цену.';
  overview.getCell('A10').font = { bold: true, size: 14, color: { argb: 'FF9A3412' } }; overview.getCell('B10').font = { bold: true, size: 14, color: { argb: 'FF9A3412' } };
  overview.columns = [{ width: 42 }, { width: 22 }, { width: 36 }]; for (let row = 6; row <= 10; row++) { overview.getCell(`A${row}`).font = { bold: row === 10 }; overview.getCell(`B${row}`).numFmt = '#,##0.00 [$₽-ru-RU]'; } overview.mergeCells('A12:C12'); overview.getCell('A12').alignment = { wrapText: true }; overview.pageSetup.orientation = 'portrait';
  const estimate = workbook.addWorksheet('Смета', { views: [{ state: 'frozen', ySplit: 5 }] }); styleHeader(estimate, 'Мастерок · смета'); addTableHeader(estimate, 5, ['№', 'Материал', 'Спецификация', 'Ед.', 'Кол-во', 'Цена, ₽', 'Сумма, ₽', 'Источник цены']);
  input.materials.forEach((line, i) => { const row = i + 6; estimate.getRow(row).values = [i + 1, spreadsheetText(line.name), spreadsheetText(line.subtitle), spreadsheetText(line.unit), line.quantity, line.unitPrice?.amount ?? '', { formula: moneyFormula(`E${row}`, `F${row}`), result: line.unitPrice ? line.quantity * line.unitPrice.amount : "" }, spreadsheetText(line.unitPrice?.provenance)]; });
  const materialEnd = input.materials.length + 5; const totalRow = materialEnd + 2; estimate.getCell(`F${totalRow}`).value = 'Итого по указанным ценам'; estimate.getCell(`G${totalRow}`).value = { formula: input.materials.length ? `=SUM(G6:G${materialEnd})` : "=0", result: totals.materialsKnownTotal }; estimate.getRow(totalRow).font = { bold: true }; estimate.getRow(totalRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightOrange } }; formatTable(estimate, 5, materialEnd, 8);
  estimate.columns = [{ width: 6 }, { width: 35 }, { width: 42 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 18 }, { width: 28 }];
  estimate.autoFilter = { from: 'A5', to: `H${materialEnd}` };
  ['F', 'G'].forEach((col) => { for (let r = 6; r <= totalRow; r++) estimate.getCell(`${col}${r}`).numFmt = '#,##0.00 [$₽-ru-RU]'; });

  const purchase = workbook.addWorksheet('Закупка', { views: [{ state: 'frozen', ySplit: 5 }] }); styleHeader(purchase, 'Закупочный список'); addTableHeader(purchase, 5, ['Материал', 'Спецификация', 'Точная потребность', 'К покупке', 'Ед.', 'Запас, %', 'Упаковка', 'Цена']);
  input.materials.forEach((line, i) => purchase.getRow(i + 6).values = [spreadsheetText(line.name), spreadsheetText(line.subtitle), line.exactQuantity ?? '', line.quantity, spreadsheetText(line.unit), line.reservePercent ?? '', spreadsheetText(line.packaging), line.unitPrice?.amount ?? '']); formatTable(purchase, 5, input.materials.length + 5, 8); purchase.columns = [{ width: 35 }, { width: 42 }, { width: 20 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 28 }, { width: 16 }];
  purchase.autoFilter = { from: 'A5', to: `H${input.materials.length + 5}` };
  for (let r = 6; r <= input.materials.length + 5; r++) purchase.getCell(`H${r}`).numFmt = '#,##0.00 [$₽-ru-RU]';

  const works = workbook.addWorksheet('Работы', { views: [{ state: 'frozen', ySplit: 5 }] }); styleHeader(works, 'Работы', 7); addTableHeader(works, 5, ['№', 'Работа', 'Ед.', 'Объём', 'Цена, ₽', 'Сумма, ₽', 'Источник цены']);
  (input.works ?? []).forEach((line, i) => { const row = i + 6; works.getRow(row).values = [i + 1, spreadsheetText(line.name), spreadsheetText(line.unit), line.quantity, line.unitPrice?.amount ?? '', { formula: moneyFormula(`D${row}`, `E${row}`), result: line.unitPrice ? line.quantity * line.unitPrice.amount : "" }, spreadsheetText(line.unitPrice?.provenance)]; }); const worksEnd = (input.works?.length ?? 0) + 5; formatTable(works, 5, Math.max(5, worksEnd), 7); works.columns = [{ width: 6 }, { width: 45 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 18 }, { width: 28 }];
  works.autoFilter = { from: 'A5', to: `G${Math.max(5, worksEnd)}` };
  for (let r = 6; r <= worksEnd; r++) { works.getCell(`E${r}`).numFmt = '#,##0.00 [$₽-ru-RU]'; works.getCell(`F${r}`).numFmt = '#,##0.00 [$₽-ru-RU]'; }

  const source = workbook.addWorksheet('Исходные данные'); styleHeader(source, 'Исходные данные', 4); source.addRow([]); source.addRow(['Заказчик', spreadsheetText(input.parties?.customer?.name), spreadsheetText(input.parties?.customer?.contact), spreadsheetText(input.parties?.customer?.details)]); source.addRow(['Подрядчик', spreadsheetText(input.parties?.contractor?.name), spreadsheetText(input.parties?.contractor?.contact), spreadsheetText(input.parties?.contractor?.details)]); source.addRow(['Объект', spreadsheetText(input.parties?.object)]); source.addRow(['Заметки', spreadsheetText(input.parties?.notes)]); source.addRow(['Доставка', input.delivery?.amount?.amount ?? '', spreadsheetText(input.delivery?.note), spreadsheetText(input.delivery?.amount?.provenance)]); source.addRow(['Денежный резерв', input.monetaryReserve?.amount?.amount ?? '', input.monetaryReserve?.percent ?? '', spreadsheetText(input.monetaryReserve?.note)]); source.addRow([]); source.addRow(['Допущения']); (input.assumptions ?? []).forEach((value) => source.addRow([spreadsheetText(value)])); source.addRow([]); source.addRow(['Условия']); (input.terms ?? []).forEach((value) => source.addRow([spreadsheetText(value)])); source.addRow([]); source.addRow(['Сохранённые раскладки']); (input.layouts ?? []).forEach((layout) => source.addRow([layout.kind === 'tile' ? 'Плитка' : 'Ламинат', spreadsheetText(layout.title), spreadsheetText(layout.summary), spreadsheetText(layout.sourceLabel)])); source.columns = [{ width: 24 }, { width: 48 }, { width: 32 }, { width: 36 }]; source.eachRow((row) => row.eachCell((cell) => { cell.alignment = { wrapText: true, vertical: 'top' }; }));
  const layouts = input.layouts?.filter((layout) => layout.image?.dataUrl.startsWith('data:image/png;base64,')) ?? [];
  if (layouts.length) {
    const sheet = workbook.addWorksheet('Раскладки'); styleHeader(sheet, 'Сохранённые раскладки', 2); sheet.columns = [{ width: 28 }, { width: 68 }];
    let row = 6;
    for (const layout of layouts) {
      sheet.getCell(`A${row}`).value = layout.kind === 'tile' ? 'Раскладка плитки' : 'Раскладка ламината'; sheet.getCell(`B${row}`).value = spreadsheetText(layout.title); sheet.getRow(row).font = { bold: true }; row += 1;
      sheet.getCell(`A${row}`).value = spreadsheetText(layout.summary); sheet.mergeCells(`A${row}:B${row}`); sheet.getCell(`A${row}`).alignment = { wrapText: true }; row += 2;
      const imageId = workbook.addImage({ base64: layout.image!.dataUrl.slice('data:image/png;base64,'.length), extension: 'png' });
      const scale = Math.min(600 / layout.image!.width, 360 / layout.image!.height, 1);
      const width = Math.round(layout.image!.width * scale); const height = Math.round(layout.image!.height * scale); // Two-cell anchors avoid ExcelJS 4's invalid editAs attribute on oneCellAnchor.
      sheet.addImage(imageId, { tl: { col: 0, row }, br: { col: width <= 201 ? width / 201 : 1 + (width - 201) / 481, row: row + height / 20 }, editAs: 'oneCell' } as import('exceljs').ImageRange & { editAs: string }); row += Math.ceil(height / 20) + 2;
    }
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
