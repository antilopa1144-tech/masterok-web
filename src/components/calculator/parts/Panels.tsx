"use client";

import { useState } from "react";
import type { CalculatorResult } from "@/lib/calculators/types";
import { formatNumber, type HistoryEntry } from "../useCalculator";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { addFeedback } from "@/lib/storage/feedback";
import type { AccuracyMode } from "../../../../engine/accuracy";
// ── Обратная связь по реальному расходу ──────────────────────────────────────

export function FeedbackPanel({
  calculatorSlug,
  primaryMaterial,
  accuracyMode,
}: {
  calculatorSlug: string;
  primaryMaterial?: { name: string; purchaseQty?: number; unit: string };
  accuracyMode?: AccuracyMode;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isReturningUser] = useState(() => {
    try {
      const key = `masterok-calc-visited-${calculatorSlug}`;
      const visited = localStorage.getItem(key);
      if (visited) return true;
      localStorage.setItem(key, Date.now().toString());
      return false;
    } catch {
      return false;
    }
  });

  if (!primaryMaterial || submitted) {
    if (submitted) {
      return (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/60 rounded-xl px-4 py-3 text-xs text-green-700 dark:text-green-300">
          {CALCULATOR_UI_TEXT.feedbackThanks}
        </div>
      );
    }
    return null;
  }

  // Don't show to first-time visitors
  if (!isReturningUser) return null;

  const handleSubmit = () => {
    if (!value.trim()) return;
    // Store feedback in localStorage for now (can be sent to backend later)
    void addFeedback({
      calculator: calculatorSlug,
      material: primaryMaterial.name,
      calculated: primaryMaterial.purchaseQty,
      actual: parseFloat(value),
      unit: primaryMaterial.unit,
      mode: accuracyMode,
    });
    setSubmitted(true);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
        {CALCULATOR_UI_TEXT.feedbackTitle}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-400 shrink-0 max-w-[120px] truncate">
          {primaryMaterial.name}:
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={CALCULATOR_UI_TEXT.feedbackPlaceholder}
          className="flex-1 text-base md:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 min-h-[44px] md:min-h-[36px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <span className="text-xs text-slate-400 dark:text-slate-400">{primaryMaterial.unit}</span>
        <button
          onClick={handleSubmit}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors shrink-0"
        >
          {CALCULATOR_UI_TEXT.feedbackSubmit}
        </button>
      </div>
    </div>
  );
}

// ── Панель истории ───────────────────────────────────────────────────────────

export function HistoryPanel({
  calcHistory,
  onRestore,
}: {
  calcHistory: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1 border border-slate-200 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
        {CALCULATOR_UI_TEXT.pastCalculations}
      </p>
      {calcHistory.map((entry) => (
        <button
          key={entry.ts}
          onClick={() => onRestore(entry)}
          className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
            {new Date(entry.ts).toLocaleString("ru-RU", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
            {entry.calcTitle}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400 truncate">
            {entry.result.materials.slice(0, 2).map(
              (m) => `${formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)} ${m.unit}`
            ).join(", ")}
          </span>
        </button>
      ))}
    </div>
  );
}


// ── Практические советы прораба ──────────────────────────────────────────────

export function PracticalNotes({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">💡</span>
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Совет прораба</span>
      </div>
      {notes.map((note, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          <span className="shrink-0 mt-0.5">•</span>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}

