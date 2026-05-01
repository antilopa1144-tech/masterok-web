import { SITE_NAME, SITE_URL } from '@/lib/site';

export interface Material {
  name: string;
  quantity: number;
  unit: string;
  waste?: number;
}

interface EstimateData {
  calculatorName: string;
  date: string;
  materials: Material[];
  totals?: Record<string, number>;
  warnings?: string[];
  accuracyModeLabel?: string;
}

const EXPORT_TITLE = `${SITE_NAME} — Смета материалов`;
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const CSV_SEPARATOR = ';';

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

export async function exportToPDF(data: EstimateData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(EXPORT_TITLE, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Калькулятор: ${data.calculatorName}`, 14, 32);
  doc.text(`Дата расчёта: ${data.date}`, 14, 38);
  if (data.accuracyModeLabel) {
    doc.text(`Режим точности: ${data.accuracyModeLabel}`, 14, 44);
  }

  const tableData = data.materials.map((m) => [
    m.name,
    `${m.quantity} ${m.unit}`,
    m.waste ? `+${Math.round(m.waste * 100)}%` : '—',
  ]);

  autoTable(doc, {
    startY: data.accuracyModeLabel ? 51 : 45,
    head: [['Материал', 'Количество', 'Запас']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 10 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (data.totals && Object.keys(data.totals).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Итого:', 14, finalY);
    finalY += 7;

    const totalsData = Object.entries(data.totals).map(([key, value]) => [
      key.charAt(0).toUpperCase() + key.slice(1),
      typeof value === 'number' ? value.toFixed(2) : String(value),
    ]);

    autoTable(doc, {
      startY: finalY,
      body: totalsData,
      theme: 'plain',
      styles: { fontSize: 10 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (data.warnings && data.warnings.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text('Важно:', 14, finalY);
    finalY += 7;

    doc.setFontSize(10);
    doc.setTextColor(100);
    data.warnings.forEach((warning) => {
      const splitText = doc.splitTextToSize(`• ${warning}`, 180);
      doc.text(splitText, 14, finalY);
      finalY += splitText.length * 5;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${SITE_NAME} — ${SITE_HOST} | Страница ${i} из ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const filename = `smeta-${data.calculatorName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  rows.push(['Материал', 'Количество', 'Ед. изм.', 'Запас (%)']);

  data.materials.forEach((m) => {
    rows.push([
      m.name,
      String(m.quantity),
      m.unit,
      m.waste ? String(Math.round(m.waste * 100)) : '0',
    ]);
  });

  if (data.totals && Object.keys(data.totals).length > 0) {
    rows.push(['']);
    rows.push(['Итого:']);
    Object.entries(data.totals).forEach(([key, value]) => {
      rows.push([key, typeof value === 'number' ? value.toFixed(2) : value]);
    });
  }

  if (data.warnings && data.warnings.length > 0) {
    rows.push(['']);
    rows.push(['Важно:']);
    data.warnings.forEach((w) => {
      rows.push([`• ${w}`]);
    });
  }

  const csv = [
    `sep=${CSV_SEPARATOR}`,
    ...rows.map(csvRow),
  ].join('\r\n');
  const filename = `smeta-${safeFilenamePart(data.calculatorName)}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), filename);
}

export function useEstimateExport(calculatorName: string) {
  const exportEstimate = (
    materials: Material[],
    totals?: Record<string, number>,
    warnings?: string[],
    accuracyModeLabel?: string
  ) => {
    const data: EstimateData = {
      calculatorName,
      date: new Date().toLocaleDateString('ru-RU'),
      materials,
      totals,
      warnings,
      accuracyModeLabel,
    };

    return {
      toPDF: () => void exportToPDF(data),
      toExcel: () => void exportToExcel(data),
    };
  };

  return exportEstimate;
}
