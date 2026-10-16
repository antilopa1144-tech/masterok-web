"use client";

import { useState } from "react";
import type { Checklist } from "@/lib/checklists";
import { trackChecklistExport } from "@/lib/analytics";

export default function PrintButton({ checklistSlug }: { checklistSlug: string }) {
  return (
    <button
      onClick={() => {
        trackChecklistExport(checklistSlug, "print");
        window.print();
      }}
      className="btn-secondary flex-1 text-center"
    >
      🖨 Распечатать
    </button>
  );
}

export function ExportChecklistPDF({ checklist }: { checklist: Checklist }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleExport = async () => {
    setBusy(true);
    setError("");
    try {
      const { jsPDF } = await import("jspdf");
      const { applyRobotoFont } = await import("@/lib/export");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      if (!await applyRobotoFont(doc)) throw new Error("Не загрузился шрифт для русского PDF. Проверьте соединение и повторите скачивание.");

      const margin = 15;
      let y = 20;
      const pageW = 210 - margin * 2;

      // Title
      doc.setFontSize(16);
      doc.setFont("Roboto", "bold");
      const titleLines = doc.splitTextToSize(checklist.title, pageW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 3;

      doc.setFontSize(9);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(120);
      doc.text(`${checklist.category} | ${checklist.duration} | getmasterok.ru`, margin, y);
      doc.setTextColor(0);
      y += 10;

      // Steps
      for (const step of checklist.steps) {
        const firstItemHeight = doc.splitTextToSize(step.items[0] ?? "", pageW - 8).length * 4.5;
        if (y + 6 + firstItemHeight > 280) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont("Roboto", "bold");
        doc.text(step.title, margin, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont("Roboto", "normal");

        for (const item of step.items) {
          const lines = doc.splitTextToSize(item, pageW - 8);
          if (y + lines.length * 4.5 > 280) {
            doc.addPage();
            y = 20;
          }
          // Checkbox
          doc.rect(margin, y - 3, 3.5, 3.5);
          doc.text(lines, margin + 6, y);
          y += lines.length * 4.5 + 1.5;
        }
        y += 4;
      }

      doc.save(`checklist-${checklist.slug}.pdf`);
      trackChecklistExport(checklist.slug, "pdf");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось скачать PDF. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
    <button
      onClick={handleExport}
      disabled={busy}
      className="btn-secondary min-h-11 text-center"
    >
      {busy ? "Подготовка PDF…" : "📄 Скачать PDF"}
    </button>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
