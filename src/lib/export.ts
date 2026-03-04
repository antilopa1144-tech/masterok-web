import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
}

/**
 * Экспорт сметы в PDF
 */
export function exportToPDF(data: EstimateData): void {
  const doc = new jsPDF();
  
  // Заголовок
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('Мастерок — Смета материалов', 14, 22);
  
  // Информация о калькуляторе
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Калькулятор: ${data.calculatorName}`, 14, 32);
  doc.text(`Дата расчёта: ${data.date}`, 14, 38);
  
  // Таблица материалов
  const tableData = data.materials.map((m) => [
    m.name,
    `${m.quantity} ${m.unit}`,
    m.waste ? `+${Math.round(m.waste * 100)}%` : '—',
  ]);
  
  autoTable(doc, {
    startY: 45,
    head: [['Материал', 'Количество', 'Запас']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] }, // accent-500
    styles: { fontSize: 10 },
  });
  
  // Итоги (если есть)
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
  
  // Предупреждения (если есть)
  if (data.warnings && data.warnings.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // red-600
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
  
  // Футер
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Мастерок — getmasterok.ru | Страница ${i} из ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Сохранение
  const filename = `smeta-${data.calculatorName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Экспорт сметы в Excel (XLSX)
 */
export function exportToExcel(data: EstimateData): void {
  // Создаем книгу
  const wb = XLSX.utils.book_new();
  
  // Данные для первого листа
  const wsData = [
    ['Мастерок — Смета материалов'],
    [''],
    ['Калькулятор:', data.calculatorName],
    ['Дата расчёта:', data.date],
    [''],
    ['Материалы:'],
  ];
  
  // Заголовки таблицы
  wsData.push(['Материал', 'Количество', 'Ед. изм.', 'Запас (%)']);
  
  // Материалы
  data.materials.forEach((m) => {
    wsData.push([
      m.name,
      String(m.quantity),
      m.unit,
      m.waste ? String(Math.round(m.waste * 100)) : '0',
    ]);
  });
  
  // Итоги
  if (data.totals && Object.keys(data.totals).length > 0) {
    wsData.push(['']);
    wsData.push(['Итого:']);
    Object.entries(data.totals).forEach(([key, value]) => {
      wsData.push([key, typeof value === 'number' ? value.toFixed(2) : value]);
    });
  }
  
  // Предупреждения
  if (data.warnings && data.warnings.length > 0) {
    wsData.push(['']);
    wsData.push(['Важно:']);
    data.warnings.forEach((w) => {
      wsData.push([`• ${w}`]);
    });
  }
  
  // Создаем лист
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Настройка ширины колонок
  ws['!cols'] = [
    { wch: 30 }, // Материал
    { wch: 12 }, // Количество
    { wch: 10 }, // Ед. изм.
    { wch: 12 }, // Запас
  ];
  
  // Объединение ячеек для заголовка
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  
  // Добавляем лист в книгу
  XLSX.utils.book_append_sheet(wb, ws, 'Смета');
  
  // Сохранение
  const filename = `smeta-${data.calculatorName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Хук для экспорта сметы
 */
export function useEstimateExport(calculatorName: string) {
  const exportEstimate = (
    materials: Material[],
    totals?: Record<string, number>,
    warnings?: string[]
  ) => {
    const data: EstimateData = {
      calculatorName,
      date: new Date().toLocaleDateString('ru-RU'),
      materials,
      totals,
      warnings,
    };
    
    return {
      toPDF: () => exportToPDF(data),
      toExcel: () => exportToExcel(data),
    };
  };
  
  return exportEstimate;
}
