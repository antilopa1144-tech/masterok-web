import { SITE_NAME, SITE_URL } from '@/lib/site';
import { CALCULATOR_UI_TEXT } from '@/components/calculator/uiText';
import {
  TOTAL_LABELS,
  HIDDEN_TOTALS,
  INTEGER_TOTAL_KEYS,
  WEIGHT_KG_TOTAL_KEYS,
  TOTAL_UNITS,
  TOTAL_LABEL_FORMS,
} from '@/components/calculator/totalsDisplay';
import { pluralizeRu } from '@/lib/format/pluralize';
import { formatWeightParts } from '@/lib/format/weight';

export interface Material {
  name: string;
  /** Спецификация для закупки: тип, размер, назначение и условия выбора. */
  subtitle?: string;
  quantity: number;
  unit: string;
  waste?: number;
  /** Раздел сметы (как на экране) */
  category?: string;
}

export interface PdfVisual {
  title: string;
  dataUrl: string;
  aspectRatio: number;
}

export interface PdfPassportSummary {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  metrics: Array<{ label: string; value: string }>;
  procurement: string;
  related: string[];
}

export interface EstimateData {
  calculatorName: string;
  date: string;
  materials: Material[];
  totals?: Record<string, number>;
  warnings?: string[];
  accuracyModeLabel?: string;
  visuals?: PdfVisual[];
  passport?: PdfPassportSummary;
}

const EXPORT_TITLE = `${SITE_NAME} — смета материалов`;
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const CSV_SEPARATOR = ';';

const PDF_ORANGE: [number, number, number] = [234, 88, 12];
const PDF_MUTED: [number, number, number] = [80, 80, 80];

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function csvCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(CSV_SEPARATOR);
}

function binaryToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Подключает Roboto из /public для корректной кириллицы в PDF */
async function applyRobotoFont(
  doc: import('jspdf').jsPDF,
  fontBase64?: string,
): Promise<boolean> {
  try {
    let base64 = fontBase64;
    if (!base64) {
      const res = await fetch('/fonts/Roboto-Regular.ttf');
      if (!res.ok) return false;
      base64 = binaryToBase64(new Uint8Array(await res.arrayBuffer()));
    }
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    // В public пока хранится одно начертание. Регистрируем тот же файл и для
    // bold, иначе jsPDF переключается на встроенный шрифт без кириллицы.
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');
    return true;
  } catch {
    return false;
  }
}

function formatNumberPdf(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString('ru-RU')
    : n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function pdfTotalRows(totals: Record<string, number> | undefined): [string, string][] {
  if (!totals) return [];
  return Object.entries(totals)
    .filter(
      ([key, value]) =>
        key in TOTAL_LABELS &&
        !HIDDEN_TOTALS.has(key) &&
        Number.isFinite(value) &&
        value !== 0
    )
    .map(([key, value]) => {
      const isInteger = INTEGER_TOTAL_KEYS.has(key);
      const isWeightKg = WEIGHT_KG_TOTAL_KEYS.has(key);
      const displayValue = isInteger ? Math.ceil(value) : value;
      const labelForms = TOTAL_LABEL_FORMS[key];
      const label = labelForms
        ? pluralizeRu(displayValue, labelForms)
        : (TOTAL_LABELS[key] ?? key);
      let unit = TOTAL_UNITS[key] ?? '';
      let formattedValue: string;
      if (isWeightKg && value > 0 && value < 1) {
        const [wVal, wUnit] = formatWeightParts(value);
        formattedValue = wVal;
        unit = wUnit;
      } else {
        formattedValue = formatNumberPdf(displayValue);
      }
      return [label, `${formattedValue}${unit ? ` ${unit}` : ''}`];
    });
}

function groupMaterialsByCategory(materials: Material[]): [string, Material[]][] {
  const groups: Record<string, Material[]> = {};
  for (const m of materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return Object.entries(groups);
}

export async function buildEstimatePdfDocument(
  data: EstimateData,
  options: { fontBase64?: string } = {},
): Promise<import('jspdf').jsPDF> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const hasRoboto = await applyRobotoFont(doc, options.fontBase64);
  if (!hasRoboto) {
    doc.setFont('helvetica', 'normal');
  }

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFontSize(11);
  doc.setTextColor(PDF_MUTED[0], PDF_MUTED[1], PDF_MUTED[2]);
  doc.text(SITE_NAME + ' — ' + SITE_HOST, margin, y);
  y += 6;

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(data.calculatorName, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(PDF_MUTED[0], PDF_MUTED[1], PDF_MUTED[2]);
  doc.text(`Дата: ${data.date}`, margin, y);
  y += 5;
  if (data.accuracyModeLabel) {
    doc.text(`Режим точности: ${data.accuracyModeLabel}`, margin, y);
    y += 5;
  }
  y += 3;

  const visuals = data.visuals
    ?.filter((visual) => visual.dataUrl.startsWith('data:image/png') && visual.aspectRatio > 0)
    .slice(0, 2);
  if (visuals && visuals.length > 0) {
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Схема раскладки', margin, y);
    y += 6;

    const gap = 5;
    const cardWidth = visuals.length === 1
      ? Math.min(112, pageW - margin * 2)
      : (pageW - margin * 2 - gap) / 2;
    const cardHeight = 58;
    const imageMaxWidth = cardWidth - 4;
    const imageMaxHeight = 47;

    visuals.forEach((visual, index) => {
      const x = margin + index * (cardWidth + gap);
      const imageWidth = Math.min(imageMaxWidth, imageMaxHeight * visual.aspectRatio);
      const imageHeight = imageWidth / visual.aspectRatio;
      const imageX = x + (cardWidth - imageWidth) / 2;
      const imageY = y + 8;

      doc.setDrawColor(220, 224, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(8.5);
      doc.setTextColor(PDF_MUTED[0], PDF_MUTED[1], PDF_MUTED[2]);
      doc.text(visual.title, x + cardWidth / 2, y + 5, { align: 'center' });
      doc.addImage(visual.dataUrl, 'PNG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST');
    });

    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    y += cardHeight + 7;
  }

  if (data.passport) {
    const passport = data.passport;
    const cardHeight = 49;
    if (y + cardHeight > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(225, 228, 233);
    doc.setFillColor(252, 252, 251);
    doc.roundedRect(margin, y, pageW - margin * 2, cardHeight, 2.5, 2.5, 'FD');

    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_ORANGE[0], PDF_ORANGE[1], PDF_ORANGE[2]);
    doc.text(passport.eyebrow.toUpperCase(), margin + 4, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(25, 25, 25);
    doc.text(passport.title, margin + 4, y + 10);
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(PDF_MUTED[0], PDF_MUTED[1], PDF_MUTED[2]);
    doc.text(doc.splitTextToSize(passport.subtitle, pageW - margin * 2 - 48)[0], margin + 4, y + 14.5);

    const badgeWidth = Math.min(43, Math.max(25, doc.getTextWidth(passport.badge) + 7));
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(pageW - margin - badgeWidth - 4, y + 4, badgeWidth, 6, 2, 2, 'F');
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(4, 120, 87);
    doc.text(passport.badge, pageW - margin - badgeWidth / 2 - 4, y + 7.9, { align: 'center' });

    const metrics = passport.metrics.slice(0, 4);
    const metricGap = 2;
    const metricWidth = (pageW - margin * 2 - 8 - metricGap * (metrics.length - 1)) / metrics.length;
    metrics.forEach((metric, index) => {
      const x = margin + 4 + index * (metricWidth + metricGap);
      doc.setFillColor(247, 248, 250);
      doc.roundedRect(x, y + 18, metricWidth, 11, 1.5, 1.5, 'F');
      doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(120, 120, 120);
      doc.text(metric.label.toUpperCase(), x + 2, y + 21.8);
      doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(25, 25, 25);
      doc.text(metric.value, x + 2, y + 27);
    });

    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(55, 55, 55);
    doc.text(doc.splitTextToSize(passport.procurement, pageW - margin * 2 - 8)[0], margin + 4, y + 34);
    passport.related.slice(0, 2).forEach((item, index) => {
      doc.setTextColor(index === 0 ? 146 : 4, index === 0 ? 64 : 120, index === 0 ? 14 : 87);
      const line = doc.splitTextToSize(item, pageW - margin * 2 - 8)[0];
      doc.text(line, margin + 4, y + 39 + index * 4);
    });
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    y += cardHeight + 7;
  }

  type Row = (string | { content: string; colSpan: number; styles?: Record<string, unknown> })[];
  const tableBody: Row[] = [];

  for (const [groupName, items] of groupMaterialsByCategory(data.materials)) {
    tableBody.push([
      {
        content: groupName.toUpperCase(),
        colSpan: 3,
        styles: {
          fontStyle: 'bold',
          fillColor: [243, 244, 246],
          textColor: 40,
        },
      },
    ]);
    for (const m of items) {
      const wasteLabel = m.waste ? `+${Math.round(m.waste * 100)} %` : '—';
      tableBody.push([
        m.subtitle ? `${m.name}\n${m.subtitle}` : m.name,
        `${formatNumberPdf(m.quantity)} ${m.unit}`.trim(),
        wasteLabel,
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Наименование', 'Количество', 'Запас']],
    body: tableBody as import('jspdf-autotable').RowInput[],
    theme: 'plain',
    styles: {
      font: hasRoboto ? 'Roboto' : 'helvetica',
      fontSize: 9,
      cellPadding: 1.8,
      textColor: 20,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      font: hasRoboto ? 'Roboto' : 'helvetica',
      fontStyle: 'bold',
      fillColor: PDF_ORANGE,
      textColor: 255,
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: pageW - margin * 2 - 52 },
      1: { halign: 'right', cellWidth: 32 },
      2: { halign: 'center', cellWidth: 20 },
    },
    margin: { left: margin, right: margin },
  });

  const lastY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  let finalY = (typeof lastY === 'number' ? lastY : y) + 10;

  const totalsRows = pdfTotalRows(data.totals);
  if (totalsRows.length > 0) {
    if (finalY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      finalY = margin;
    }
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.text('Параметры расчёта', margin, finalY);
    finalY += 6;
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    autoTable(doc, {
      startY: finalY,
      body: totalsRows,
      theme: 'plain',
      styles: {
        font: hasRoboto ? 'Roboto' : 'helvetica',
        fontSize: 9,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: pageW - margin * 2 - 45 },
        1: { halign: 'right', cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
    });
    const ny = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    finalY = (typeof ny === 'number' ? ny : finalY) + 10;
  }

  if (data.warnings && data.warnings.length > 0) {
    if (finalY > doc.internal.pageSize.getHeight() - 28) {
      doc.addPage();
      finalY = margin;
    }
    doc.setFontSize(11);
    doc.setTextColor(180, 40, 40);
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.text('Важно', margin, finalY);
    finalY += 5;
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    for (const warning of data.warnings) {
      const lines = doc.splitTextToSize(`• ${warning}`, pageW - margin * 2);
      for (const line of lines) {
        if (finalY > doc.internal.pageSize.getHeight() - 12) {
          doc.addPage();
          finalY = margin;
        }
        doc.text(line, margin, finalY);
        finalY += 4;
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(hasRoboto ? 'Roboto' : 'helvetica', 'normal');
    const footer = `${SITE_NAME} — ${SITE_HOST} · стр. ${i} из ${pageCount}`;
    doc.text(footer, margin, doc.internal.pageSize.getHeight() - 8);
  }

  return doc;
}

export async function exportToPDF(data: EstimateData): Promise<void> {
  const doc = await buildEstimatePdfDocument(data);
  const filename = `smeta-${safeFilenamePart(data.calculatorName)}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export async function exportToExcel(data: EstimateData): Promise<void> {
  const rows: unknown[][] = [
    [EXPORT_TITLE],
    [''],
    ['Калькулятор:', data.calculatorName],
    ['Дата расчёта:', data.date],
    ...(data.accuracyModeLabel ? [['Режим точности:', data.accuracyModeLabel]] : []),
    [''],
    ['Материалы:'],
  ];

  rows.push(['Раздел', 'Материал', 'Спецификация', 'Количество', 'Ед. изм.', 'Запас (%)']);

  for (const [cat, items] of groupMaterialsByCategory(data.materials)) {
    for (const m of items) {
      rows.push([
        cat,
        m.name,
        m.subtitle ?? '',
        String(m.quantity),
        m.unit,
        m.waste ? String(Math.round(m.waste * 100)) : '0',
      ]);
    }
  }

  const totalsData = pdfTotalRows(data.totals);
  if (totalsData.length > 0) {
    rows.push(['']);
    rows.push(['Параметры расчёта:']);
    totalsData.forEach(([label, val]) => {
      rows.push([label, val]);
    });
  }

  if (data.warnings && data.warnings.length > 0) {
    rows.push(['']);
    rows.push(['Важно:']);
    data.warnings.forEach((w) => {
      rows.push([`• ${w}`]);
    });
  }

  const csv = [`sep=${CSV_SEPARATOR}`, ...rows.map(csvRow)].join('\r\n');
  const filename = `smeta-${safeFilenamePart(data.calculatorName)}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), filename);
}

export function useEstimateExport(calculatorName: string) {
  const exportEstimate = (
    materials: Material[],
    totals?: Record<string, number>,
    warnings?: string[],
    accuracyModeLabel?: string,
    visuals?: PdfVisual[],
    passport?: PdfPassportSummary,
  ) => {
    const data: EstimateData = {
      calculatorName,
      date: new Date().toLocaleDateString('ru-RU'),
      materials,
      totals,
      warnings,
      accuracyModeLabel,
      visuals,
      passport,
    };

    return {
      toPDF: () => exportToPDF(data),
      toExcel: () => exportToExcel(data),
    };
  };

  return exportEstimate;
}
