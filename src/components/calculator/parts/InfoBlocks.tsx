"use client";

import type { CalculatorDefinition } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
// ── Компонент экспертных советов ─────────────────────────────────────────────

export function ExpertTips({ tips }: { tips: NonNullable<CalculatorDefinition["expertTips"]> }) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <span>👷‍♂️</span> {CALCULATOR_UI_TEXT.expertTips}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{tip.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip.content}</p>
            {tip.author && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center text-[10px]">🏗️</div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-400">{tip.author}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Компонент FAQ ────────────────────────────────────────────────────────────

export function CalculatorFAQ({ faq }: { faq: NonNullable<CalculatorDefinition["faq"]> }) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.faqTitle}</h2>
      <div className="space-y-3">
        {faq.map((item, i) => (
          <details key={i} className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
              <span>{item.question}</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-700">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

