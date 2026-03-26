"use client";

import type { Checklist } from "@/lib/checklists";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary flex-1 text-center"
    >
      🖨 Распечатать
    </button>
  );
}

export function ExportChecklistPDF({ checklist }: { checklist: Checklist }) {
  const handleExport = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 15;
    let y = 20;
    const pageW = 210 - margin * 2;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(checklist.title, margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`${checklist.category} | ${checklist.duration} | getmasterok.ru`, margin, y);
    doc.setTextColor(0);
    y += 10;

    // Steps
    for (const step of checklist.steps) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(step.title, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      for (const item of step.items) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        // Checkbox
        doc.rect(margin, y - 3, 3.5, 3.5);
        const lines = doc.splitTextToSize(item, pageW - 8);
        doc.text(lines, margin + 6, y);
        y += lines.length * 4.5 + 1.5;
      }
      y += 4;
    }

    doc.save(`checklist-${checklist.slug}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      className="btn-secondary flex-1 text-center"
    >
      📄 Скачать PDF
    </button>
  );
}
