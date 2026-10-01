"use client";

import { useEffect, useId, useState } from "react";
import styles from "./constructor.module.css";

export type DraftStatus = (id: string, message: string | null) => void;

export { default as NumberField } from "./NumberSliderField";

export function TextField({ label, value, onCommit, onStatus, compact = false }: {
  label: string; value: string; onCommit: (value: string) => void; onStatus: DraftStatus; compact?: boolean;
}) {
  const id = useId(); const [draft, setDraft] = useState(value); const [error, setError] = useState("");
  useEffect(() => { setDraft(value); setError(""); onStatus(id, null); }, [value, id, onStatus]);
  useEffect(() => () => onStatus(id, null), [id, onStatus]);
  const apply = () => {
    if (!draft.trim()) { setError("Введите название."); onStatus(id, `${label}: введите название.`); return; }
    const next = draft.trim(); onStatus(id, null); setError(""); setDraft(next); if (next !== value) onCommit(next);
  };
  return <label className={compact ? styles.compactField : styles.field} htmlFor={id}>
    {!compact && <span>{label}</span>}<input id={id} aria-label={label} type="text" value={draft} maxLength={120} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => { setDraft(event.target.value); onStatus(id, `${label}: завершите ввод.`); }}
      onBlur={apply} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } if (event.key === "Escape") { setDraft(value); setError(""); onStatus(id, null); } }} />
    {error && <small id={`${id}-error`} className={styles.fieldError}>{error}</small>}
  </label>;
}
