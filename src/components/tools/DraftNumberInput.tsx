"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  formatDecimalValue,
  isDecimalDraft,
  normalizeDecimalDraft,
  parseDecimalDraft,
} from "@/components/calculator/parts/numericInput";

interface DraftNumberInputProps {
  id?: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  integerOnly?: boolean;
  emptyWhenZero?: boolean;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  compactError?: string;
  onChange: (value: number) => void;
}

function formatBound(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
}

function formatDraftValue(value: number, emptyWhenZero: boolean): string {
  return emptyWhenZero && value === 0 ? "" : formatDecimalValue(value);
}

function getValidationError(
  rawValue: string,
  min: number,
  max: number,
  integerOnly: boolean,
  emptyWhenZero: boolean,
): string {
  if (emptyWhenZero && rawValue === "") return "";
  const parsed = parseDecimalDraft(rawValue);
  if (parsed == null) return `Введите значение от ${formatBound(min)} до ${formatBound(max)}.`;
  if (parsed < min || parsed > max) return `Допустимо от ${formatBound(min)} до ${formatBound(max)}.`;
  if (integerOnly && !Number.isInteger(parsed)) return "Введите целое число.";
  return "";
}

export default function DraftNumberInput({
  id,
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  integerOnly = step >= 1,
  emptyWhenZero = false,
  placeholder,
  className = "input-field min-w-0 w-full",
  containerClassName = "min-w-0",
  compactError,
  onChange,
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState(() => formatDraftValue(value, emptyWhenZero));
  const [error, setError] = useState("");
  const editingRef = useRef(false);

  useEffect(() => {
    if (editingRef.current) return;
    const nextDraft = formatDraftValue(value, emptyWhenZero);
    setDraft(nextDraft);
    setError(getValidationError(nextDraft, min, max, integerOnly, emptyWhenZero));
  }, [emptyWhenZero, integerOnly, max, min, value]);

  const validate = (rawValue: string): number | null => {
    const nextError = getValidationError(rawValue, min, max, integerOnly, emptyWhenZero);
    setError(nextError);
    if (nextError) return null;
    if (emptyWhenZero && rawValue === "") return 0;
    const parsed = parseDecimalDraft(rawValue);
    return parsed!;
  };

  return (
    <div className={containerClassName}>
      <input
        id={id}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        title={error ? `${error} Расчёт пока использует последнее допустимое значение.` : undefined}
        type="text"
        inputMode={integerOnly ? "numeric" : "decimal"}
        value={draft}
        placeholder={placeholder}
        className={className}
        onFocus={() => { editingRef.current = true; }}
        onChange={(event) => {
          const nextDraft = normalizeDecimalDraft(event.target.value);
          if (!isDecimalDraft(nextDraft)) return;
          setDraft(nextDraft);
          const parsed = validate(nextDraft);
          if (parsed != null) onChange(parsed);
        }}
        onBlur={() => {
          editingRef.current = false;
          const parsed = validate(draft);
          if (parsed == null) {
            const restoredDraft = formatDraftValue(value, emptyWhenZero);
            setDraft(restoredDraft);
            setError(getValidationError(restoredDraft, min, max, integerOnly, emptyWhenZero));
          }
        }}
      />
      {error && (
        <p role="alert" className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400">
          {compactError ?? `${error} Расчёт пока использует последнее допустимое значение.`}
        </p>
      )}
    </div>
  );
}
