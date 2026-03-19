'use client';

import { useState } from 'react';
import { useEstimateExport, type Material } from '@/lib/export';
import CategoryIcon from '@/components/ui/CategoryIcon';
import type { CalculatorResult } from '@/lib/calculators/types';
import { CALCULATOR_UI_TEXT } from './uiText';
import { ACCURACY_MODE_LABELS } from '../../../engine/accuracy';

interface ExportButtonsProps {
  calculatorName: string;
  result: CalculatorResult;
}

export function ExportButtons({ calculatorName, result }: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const exportEstimate = useEstimateExport(calculatorName);

  const materials: Material[] = result.materials.map((m: { name: string; purchaseQty?: number; quantity: number; unit: string; waste?: number }) => ({
    name: m.name,
    quantity: m.purchaseQty ?? m.quantity,
    unit: m.unit,
    waste: m.waste ?? 0,
  }));

  const accuracyLabel = result.accuracyMode ? ACCURACY_MODE_LABELS[result.accuracyMode] : undefined;

  const handleExportPDF = () => {
    const exporter = exportEstimate(
      materials,
      result.totals,
      result.warnings,
      accuracyLabel
    );
    exporter.toPDF();
  };

  const handleExportExcel = () => {
    const exporter = exportEstimate(
      materials,
      result.totals,
      result.warnings,
      accuracyLabel
    );
    exporter.toExcel();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
      >
        <CategoryIcon icon="download" size={16} color="currentColor" />
        {CALCULATOR_UI_TEXT.export}
      </button>

      {isOpen && (
        <>
          {/* Затемнение фона */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Выпадающее меню */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
            <button
              onClick={() => {
                handleExportPDF();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <CategoryIcon icon="file-text" size={16} color="currentColor" />
              <div>
                <div className="font-medium">{CALCULATOR_UI_TEXT.exportPdfTitle}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{CALCULATOR_UI_TEXT.exportPdfDescription}</div>
              </div>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-700" />

            <button
              onClick={() => {
                handleExportExcel();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <CategoryIcon icon="sheet" size={16} color="currentColor" />
              <div>
                <div className="font-medium">{CALCULATOR_UI_TEXT.exportExcelTitle}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{CALCULATOR_UI_TEXT.exportExcelDescription}</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
