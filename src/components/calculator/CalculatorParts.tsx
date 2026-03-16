"use client";

import type { CalculatorResult, CalculatorField, CalculatorDefinition } from "@/lib/calculators/types";
import { formatNumber, type HistoryEntry } from "./useCalculator";
import { HIDDEN_TOTALS, TOTAL_LABELS, TOTAL_UNITS } from "./totalsDisplay";
import { CALCULATOR_UI_TEXT } from "./uiText";

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
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{tip.author}</span>
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

// ── Компонент поля ввода ─────────────────────────────────────────────────────

export function FieldInput({
  field, value, onChange, accentColor,
}: {
  field: CalculatorField;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  if (field.type === "select" || field.type === "radio") {
    const isRadio = field.type === "radio";
    return (
      <div>
        <label className="input-label">{field.label}</label>
        {isRadio ? (
          <div className="flex gap-2 flex-wrap">
            {field.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] ${
                  value === opt.value
                    ? "border-transparent text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                }`}
                style={value === opt.value ? { backgroundColor: accentColor } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {field.hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</label>
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{field.hint}</p>}
        </div>
        <button
          onClick={() => onChange(value > 0 ? 0 : 1)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            value > 0 ? "" : "bg-slate-200 dark:bg-slate-700"
          }`}
          style={value > 0 ? { backgroundColor: accentColor } : {}}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-slate-100 rounded-full shadow-sm transition-transform ${value > 0 ? "translate-x-5" : ""}`} />
        </button>
      </div>
    );
  }

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const isOutOfRange = value < min || value > max;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="input-label mb-0">{field.label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            className={`w-20 text-right text-sm font-semibold border bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-2 transition-colors ${
              isOutOfRange
                ? "text-red-600 border-red-300 focus:ring-red-500/30 focus:border-red-500"
                : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-accent-500/30 focus:border-accent-500"
            }`}
            aria-invalid={isOutOfRange}
          />
          {field.unit && <span className="text-xs text-slate-400 dark:text-slate-500 w-8 shrink-0">{field.unit}</span>}
        </div>
      </div>
      {field.type === "slider" && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="range-slider"
          style={{ accentColor }}
        />
      )}
      {isOutOfRange && (
        <p className="mt-1 text-xs text-red-500">
          {CALCULATOR_UI_TEXT.allowedValues(min, max, field.unit)}
        </p>
      )}
      {!isOutOfRange && field.hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
    </div>
  );
}

// ── Список материалов ────────────────────────────────────────────────────────

export function MaterialList({ materials }: { materials: CalculatorResult["materials"] }) {
  const groups: Record<string, typeof materials> = {};
  for (const m of materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName}>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mb-2">{groupName}</p>
          <div className="space-y-2">
            {items.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 leading-snug">{m.name}</span>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)}{" "}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{m.unit}</span>
                  </div>
                  {m.withReserve && m.withReserve !== m.quantity && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {CALCULATOR_UI_TEXT.withoutReserve}: {formatNumber(m.quantity)} {m.unit}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Итоговое значение ────────────────────────────────────────────────────────

export function TotalItem({ name, value }: { name: string; value: number }) {
  if (HIDDEN_TOTALS.has(name)) return null;
  const label = TOTAL_LABELS[name] ?? name;
  const unit = TOTAL_UNITS[name] ?? "";
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {formatNumber(value)}
        {unit && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}


// ── {CALCULATOR_UI_TEXT.scenariosTitle} ───────────────────────────────────────────────────

function ScenarioBlock({ result }: { result: CalculatorResult }) {
  if (!result.scenarios) return null;

  const scenarios = [
    { key: "MIN", title: "MIN" },
    { key: "REC", title: "REC" },
    { key: "MAX", title: "MAX" },
  ] as const;

  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {CALCULATOR_UI_TEXT.scenariosTitle}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const item = result.scenarios?.[s.key];
          if (!item) return null;

          return (
            <div key={s.key} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.title}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {CALCULATOR_UI_TEXT.scenarioLabels.need}: <span className="font-semibold">{formatNumber(item.exact_need)}</span>
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {CALCULATOR_UI_TEXT.scenarioLabels.buy}: <span className="font-semibold">{formatNumber(item.purchase_quantity)}</span>
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {CALCULATOR_UI_TEXT.scenarioLabels.leftover}: <span className="font-semibold">{formatNumber(item.leftover)}</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {CALCULATOR_UI_TEXT.scenarioLabels.plan}: {item.buy_plan.package_label}
              </p>
            </div>
          );
        })}
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
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
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
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {entry.result.materials.slice(0, 2).map(
              (m) => `${formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)} ${m.unit}`
            ).join(", ")}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Вспомогательная функция: скопировать список материалов ───────────────────

function copyMaterialsAsText(materials: CalculatorResult["materials"]): void {
  const lines = materials.map((m) => {
    const qty = m.purchaseQty ?? m.withReserve ?? m.quantity;
    return `• ${m.name}: ${formatNumber(qty)} ${m.unit}`;
  });
  const text = `${CALCULATOR_UI_TEXT.copyMaterialsHeading}\n\n${lines.join("\n")}`;
  void navigator.clipboard.writeText(text);
}

// ── Практические советы прораба ──────────────────────────────────────────────

function PracticalNotes({ notes }: { notes: string[] }) {
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

// ── Блок результата (warnings + materials + totals + share) ──────────────────

export function ResultBlock({
  result,
  shareState,
  onShare,
}: {
  result: CalculatorResult;
  shareState: "idle" | "copied";
  onShare: () => void;
}) {
  return (
    <div className="space-y-4 slide-up">
      {result.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 dark:bg-amber-950/30 dark:border-amber-900/60">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <span className="shrink-0">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Карточка результатов */}
      <div className="result-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.materialsListTitle}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyMaterialsAsText(result.materials)}
              className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 px-3 py-2 sm:py-1.5 rounded-lg transition-colors"
              title={CALCULATOR_UI_TEXT.copyForMessengerTitle}
            >
              📋 <span className="hidden sm:inline">{CALCULATOR_UI_TEXT.copy}</span>
            </button>
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-xs bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 text-accent-700 dark:text-accent-300 px-3 py-2 sm:py-1.5 rounded-lg transition-colors"
              title={CALCULATOR_UI_TEXT.shareLinkTitle}
            >
              {shareState === "copied" ? "✓" : "🔗"} <span className="hidden sm:inline">{shareState === "copied" ? CALCULATOR_UI_TEXT.copied : CALCULATOR_UI_TEXT.share}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center text-xs bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 text-accent-700 dark:text-accent-300 px-3 py-2 sm:py-1.5 rounded-lg transition-colors"
              title={CALCULATOR_UI_TEXT.printTitle}
            >
              🖨 <span className="hidden sm:inline ml-1.5">{CALCULATOR_UI_TEXT.print}</span>
            </button>
          </div>
        </div>

        <MaterialList materials={result.materials} />

        {result.practicalNotes && result.practicalNotes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <PracticalNotes notes={result.practicalNotes} />
          </div>
        )}
      </div>

      {/* Итоги */}
      {result.scenarios && (<ScenarioBlock result={result} />)}

      {Object.keys(result.totals).length > 0 && (
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {CALCULATOR_UI_TEXT.total}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.totals).map(([key, val]) => (
              <TotalItem key={key} name={key} value={val} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
