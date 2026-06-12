"use client";

import { useState, useRef, useEffect } from "react";
import type { CalculatorField } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
// ── Компонент поля ввода ─────────────────────────────────────────────────────

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-accent-100 hover:text-accent-700 dark:hover:bg-accent-900/30 dark:hover:text-accent-400 transition-colors"
        aria-label="Подсказка"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700" />
        </div>
      )}
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {hint && <Tooltip text={hint} />}
    </span>
  );
}

// ── Переключатель Новичок / Профи ───────────────────────────────────────────

export function ExperienceModeToggle({
  mode,
  onChange,
}: {
  mode: "beginner" | "pro";
  onChange: (mode: "beginner" | "pro") => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange("beginner")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === "beginner"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Новичок
      </button>
      <button
        onClick={() => onChange("pro")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === "pro"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Профи
      </button>
    </div>
  );
}

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
        <label className="input-label"><FieldLabel label={field.label} hint={field.hint} /></label>
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
            aria-label={field.label}
          >
            {(() => {
              const opts = field.options ?? [];
              const groups = new Map<string, typeof opts>();
              const ungrouped: typeof opts = [];
              for (const opt of opts) {
                if (opt.optGroup) {
                  const g = groups.get(opt.optGroup) ?? [];
                  g.push(opt);
                  groups.set(opt.optGroup, g);
                } else {
                  ungrouped.push(opt);
                }
              }
              if (groups.size === 0) {
                return opts.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              }
              return (
                <>
                  {[...groups.entries()].map(([label, groupOpts]) => (
                    <optgroup key={label} label={label}>
                      {groupOpts.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                  {ungrouped.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </>
              );
            })()}
          </select>
        )}
      </div>
    );
  }

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel label={field.label} hint={field.hint} /></label>
        </div>
        <button
          onClick={() => onChange(value > 0 ? 0 : 1)}
          role="switch"
          aria-checked={value > 0}
          aria-label={field.label}
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
        <label className="input-label mb-0"><FieldLabel label={field.label} hint={field.hint} /></label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            className={`w-20 text-right text-base md:text-sm font-semibold border bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 min-h-[44px] md:min-h-[36px] focus:outline-none focus:ring-2 transition-colors ${
              isOutOfRange
                ? "text-red-600 border-red-300 focus:ring-red-500/30 focus:border-red-500"
                : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-accent-500/30 focus:border-accent-500"
            }`}
            aria-invalid={isOutOfRange}
            aria-label={field.label}
          />
          {field.unit && <span className="text-xs text-slate-400 dark:text-slate-400 w-8 shrink-0">{field.unit}</span>}
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
          aria-label={field.label}
          style={{ accentColor }}
        />
      )}
      {isOutOfRange && (
        <p className="mt-1 text-xs text-red-500">
          {CALCULATOR_UI_TEXT.allowedValues(min, max, field.unit)}
        </p>
      )}
      {/* hint shown via tooltip icon next to label */}
    </div>
  );
}

