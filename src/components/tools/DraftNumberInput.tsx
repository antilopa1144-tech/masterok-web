"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  formatDecimalValue,
  isDecimalDraft,
  normalizeDecimalDraft,
  parseDecimalDraft,
} from "@/components/calculator/parts/numericInput";

interface DraftNumberInputProps {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  integerOnly?: boolean;
  className?: string;
  containerClassName?: string;
  onChange: (value: number) => void;
}

function formatBound(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
}

function getValidationError(
  rawValue: string,
  min: number,
  max: number,
  integerOnly: boolean,
): string {
  const parsed = parseDecimalDraft(rawValue);
  if (parsed == null) return `Введите значение от ${formatBound(min)} до ${formatBound(max)}.`;
  if (parsed < min || parsed > max) return `Допустимо от ${formatBound(min)} до ${formatBound(max)}.`;
  if (integerOnly && !Number.isInteger(parsed)) return "Введите целое число.";
  return "";
}

export default function DraftNumberInput({
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  integerOnly = step >= 1,
  className = "input-field min-w-0 w-full",
  containerClassName = "min-w-0",
  onChange,
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState(() => formatDecimalValue(value));
  const [error, setError] = useState("");
  const editingRef = useRef(false);

  useEffect(() => {
    if (editingRef.current) return;
    const nextDraft = formatDecimalValue(value);
    setDraft(nextDraft);
    setError(getValidationError(nextDraft, min, max, integerOnly));
  }, [integerOnly, max, min, value]);

  const validate = (rawValue: string): number | null => {
    const nextError = getValidationError(rawValue, min, max, integerOnly);
    setError(nextError);
    if (nextError) return null;
    const parsed = parseDecimalDraft(rawValue);
    return parsed!;
  };

  return (
    <div className={containerClassName}>
      <input
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        type="text"
        inputMode={integerOnly ? "numeric" : "decimal"}
        value={draft}
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
            const restoredDraft = formatDecimalValue(value);
            setDraft(restoredDraft);
            setError(getValidationError(restoredDraft, min, max, integerOnly));
          }
        }}
      />
      {error && (
        <p role="alert" className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400">
          {error} Расчёт пока использует последнее допустимое значение.
        </p>
      )}
    </div>
  );
}
