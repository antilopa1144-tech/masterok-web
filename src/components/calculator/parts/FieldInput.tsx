"use client";

import { useState, useRef, useEffect, useId } from "react";
import type { CalculatorField } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
import {
  finalizeDecimalDraft,
  formatDecimalValue,
  isDecimalDraft,
  normalizeDecimalDraft,
  parseDecimalDraft,
} from "./numericInput";
// ── Компонент поля ввода ─────────────────────────────────────────────────────

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="-my-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold leading-none text-slate-500 transition-colors hover:bg-accent-100 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-400 dark:hover:bg-accent-900/30 dark:hover:text-accent-400"
        aria-label="Подсказка"
        aria-expanded={open}
        aria-controls={tooltipId}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>?</span>
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-lg sm:left-1/2 sm:-translate-x-1/2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {text}
          <div className="absolute left-3 top-full -mt-px h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white sm:left-1/2 sm:-translate-x-1/2 dark:border-slate-700 dark:bg-slate-800" />
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
        type="button"
        onClick={() => onChange("beginner")}
        aria-pressed={mode === "beginner"}
        className={`min-h-11 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === "beginner"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Новичок
      </button>
      <button
        type="button"
        onClick={() => onChange("pro")}
        aria-pressed={mode === "pro"}
        className={`min-h-11 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
  const [draftValue, setDraftValue] = useState(() => formatDecimalValue(value));
  const isEditing = useRef(false);
  const inputId = `calculator-field-${field.key}`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    if (!isEditing.current) setDraftValue(formatDecimalValue(value));
  }, [value]);

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
                type="button"
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
          type="button"
          onClick={() => onChange(value > 0 ? 0 : 1)}
          role="switch"
          aria-checked={value > 0}
          aria-label={field.label}
          className="relative h-11 w-12 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
        >
          <span
            className={`absolute inset-x-0 top-2 h-7 rounded-full transition-colors ${value > 0 ? "" : "bg-slate-200 dark:bg-slate-700"}`}
            style={value > 0 ? { backgroundColor: accentColor } : {}}
            aria-hidden
          />
          <span className={`absolute left-0.5 top-2.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform dark:bg-slate-100 ${value > 0 ? "translate-x-5" : ""}`} aria-hidden />
        </button>
      </div>
    );
  }

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const draftNumber = Number(normalizeDecimalDraft(draftValue));
  const hasDraftNumber = draftValue !== "" && Number.isFinite(draftNumber);
  const isOutOfRange = hasDraftNumber
    ? draftNumber < min || draftNumber > max
    : !Number.isFinite(value) || value < min || value > max;
  const isFractional = field.integerOnly && hasDraftNumber && !Number.isInteger(draftNumber);
  const isInvalidValue = isOutOfRange || isFractional;
  const errorMessage = isFractional
    ? `Введите целое число от ${min} до ${max}${field.unit ? ` ${field.unit}` : ""}`
    : Number.isFinite(value)
      ? CALCULATOR_UI_TEXT.allowedValues(min, max, field.unit)
      : "Введите числовое значение";

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={inputId} className="input-label mb-0"><FieldLabel label={field.label} hint={field.hint} /></label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            id={inputId}
            inputMode={field.integerOnly ? "numeric" : "decimal"}
            value={draftValue}
            onFocus={() => {
              isEditing.current = true;
            }}
            onChange={(e) => {
              const nextDraft = normalizeDecimalDraft(e.target.value);
              if (!isDecimalDraft(nextDraft)) return;

              setDraftValue(nextDraft);
              const parsed = parseDecimalDraft(nextDraft);
              if (parsed !== null) {
                onChange(parsed);
              }
            }}
            onBlur={() => {
              isEditing.current = false;
              const finalized = finalizeDecimalDraft(draftValue, value);
              setDraftValue(formatDecimalValue(finalized));
              if (finalized !== value) onChange(finalized);
            }}
            className={`w-20 text-right text-base md:text-sm font-semibold border bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 min-h-[44px] md:min-h-[36px] focus:outline-none focus:ring-2 transition-colors ${
              isInvalidValue
                ? "text-red-600 border-red-300 focus:ring-red-500/30 focus:border-red-500"
                : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-accent-500/30 focus:border-accent-500"
            }`}
            aria-invalid={isInvalidValue}
            aria-describedby={isInvalidValue ? errorId : undefined}
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
          aria-describedby={isInvalidValue ? errorId : undefined}
          style={{ accentColor }}
        />
      )}
      {isInvalidValue && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" aria-live="polite">
          {errorMessage}
        </p>
      )}
      {/* hint shown via tooltip icon next to label */}
    </div>
  );
}

