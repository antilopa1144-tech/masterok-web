"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Minus, Pencil, Plus } from "lucide-react";
import { controlNumberText, parseNumberControl, sliderNumber, sliderPosition, SLIDER_TICKS, stepNumber } from "@/lib/constructor/number-control";
import type { DraftStatus } from "./DraftFields";
import styles from "./NumberSliderField.module.css";

export default function NumberSliderField({ label, value, min = 0, max = 30_000, integer = false, unit, onCommit, onStatus, zeroLabel, emptyValue }: {
  label: string; value: number; min?: number; max?: number; integer?: boolean; unit?: string;
  onCommit: (value: number) => void; onStatus: DraftStatus; zeroLabel?: string; emptyValue?: number;
}) {
  const id = useId(), bounds = { min, max, integer, unit, emptyValue };
  const [shown, setShown] = useState(value), shownRef = useRef(value);
  const [active, setActive] = useState(false), start = useRef<number | null>(null);
  const pointer = useRef<number | null>(null), ignorePointer = useRef(false);
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(String(value)), [error, setError] = useState("");
  const exact = useRef<HTMLInputElement>(null), readout = useRef<HTMLButtonElement>(null), skipExactBlur = useRef(false);
  useEffect(() => {
    shownRef.current = value; setShown(value); setDraft(String(value)); setError(""); setEditing(false); setActive(false); start.current = null; pointer.current = null; ignorePointer.current = false; onStatus(id, null);
  }, [value, id, onStatus]);
  useEffect(() => () => onStatus(id, null), [id, onStatus]);
  useEffect(() => { if (editing) { exact.current?.focus(); exact.current?.select(); } }, [editing]);
  const show = (next: number) => { shownRef.current = next; setShown(next); };
  const begin = () => {
    if (start.current !== null) return;
    start.current = shownRef.current; setActive(true); onStatus(id, `${label}: завершите перемещение ползунка.`);
  };
  const finish = () => {
    if (start.current === null) return;
    start.current = null; setActive(false); onStatus(id, null);
    if (shownRef.current !== value) onCommit(shownRef.current);
  };
  const cancel = () => {
    show(start.current ?? value); start.current = null; setActive(false); onStatus(id, null);
  };
  const commitStep = (direction: number) => {
    const next = stepNumber(shownRef.current, direction, bounds); show(next); onStatus(id, null);
    if (next !== value) onCommit(next);
  };
  const applyExact = () => {
    if (skipExactBlur.current) { skipExactBlur.current = false; return false; }
    const next = parseNumberControl(draft, bounds);
    if (next === null) {
      const message = `Введите ${integer ? "целое " : ""}число от ${controlNumberText(min)} до ${controlNumberText(max)}${unit ? ` ${unit.replace(/\.$/, "")}` : ""}.`;
      setError(message); onStatus(id, `${label}: ${message}`); return false;
    }
    show(next); setDraft(String(next)); setError(""); setEditing(false); onStatus(id, null);
    if (next !== value) onCommit(next);
    return true;
  };
  const position = sliderPosition(shown, bounds), text = zeroLabel && shown === 0 ? zeroLabel : controlNumberText(shown);
  return <div className={styles.numberField} role="group" aria-label={label} data-number-control data-editing={editing || undefined} data-adjusting={active || undefined}>
    <div className={styles.heading}>
      <label htmlFor={editing ? `${id}-exact` : id}>{label}</label>
      {editing ? <div className={`${styles.exactWrap} ${error ? styles.invalid : ""}`}>
        <input ref={exact} id={`${id}-exact`} type="text" inputMode={integer ? "numeric" : "decimal"} value={draft} aria-label={label} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : `${id}-hint`} onChange={(event) => {
          setDraft(event.target.value); setError(""); onStatus(id, `${label}: примените точное значение клавишей Enter или выйдите из поля.`);
        }} onBlur={applyExact} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); if (applyExact()) requestAnimationFrame(() => readout.current?.focus()); }
          if (event.key === "Escape") {
            event.preventDefault(); skipExactBlur.current = true; event.currentTarget.blur(); setEditing(false); setDraft(String(value)); setError(""); onStatus(id, null);
            requestAnimationFrame(() => readout.current?.focus());
          }
        }} />{unit && <span>{unit}</span>}
      </div> : <button ref={readout} type="button" className={styles.readout} aria-label={`Точное значение: ${label}`} title="Нажмите, чтобы ввести точное значение" disabled={active} onClick={() => {
        skipExactBlur.current = false; setDraft(emptyValue !== undefined && value === emptyValue ? "" : String(value)); setEditing(true);
      }}><strong>{text}</strong>{unit && !(zeroLabel && shown === 0) && <span>{unit}</span>}<Pencil size={12} aria-hidden="true" /></button>}
    </div>
    <div className={styles.trackRow}>
      <button type="button" className={styles.step} aria-label={`Уменьшить: ${label}`} disabled={editing || active || shown <= min} onClick={() => commitStep(-1)}><Minus size={16} aria-hidden="true" /></button>
      <input id={id} className={styles.range} type="range" min={0} max={SLIDER_TICKS} step="any" value={position} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.max(min, Math.min(max, shown))} aria-valuetext={`${text}${unit && !(zeroLabel && shown === 0) ? ` ${unit}` : ""}`} aria-describedby={`${id}-hint`} disabled={editing || max <= min} style={{ "--number-progress": `${position / SLIDER_TICKS * 100}%` } as CSSProperties}
        onPointerDown={(event) => { pointer.current = event.pointerId; ignorePointer.current = false; begin(); event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={() => { pointer.current = null; if (!ignorePointer.current) finish(); }}
        onPointerCancel={() => { cancel(); pointer.current = null; ignorePointer.current = true; }}
        onLostPointerCapture={() => { if (pointer.current !== null) { cancel(); pointer.current = null; ignorePointer.current = true; } }}
        onBlur={() => { finish(); if (pointer.current !== null) ignorePointer.current = true; }}
        onChange={(event) => {
          if (ignorePointer.current) return;
          const next = sliderNumber(Number(event.target.value), bounds);
          if (next === shownRef.current) return;
          if (pointer.current === null && start.current === null) { show(next); if (next !== value) onCommit(next); return; }
          begin(); show(next);
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey) return;
          if (event.key === "Escape") { event.preventDefault(); cancel(); if (pointer.current !== null) ignorePointer.current = true; return; }
          const direction = ["ArrowRight", "ArrowUp", "PageUp"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowDown", "PageDown"].includes(event.key) ? -1 : 0;
          if (!direction && event.key !== "Home" && event.key !== "End") return;
          event.preventDefault(); ignorePointer.current = false; begin();
          const multiplier = event.shiftKey || event.key.startsWith("Page") ? 10 : event.altKey && !integer ? .1 : 1;
          show(event.key === "Home" ? min : event.key === "End" ? max : stepNumber(shownRef.current, direction, bounds, multiplier));
        }} onKeyUp={(event) => { if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) finish(); }} />
      <button type="button" className={styles.step} aria-label={`Увеличить: ${label}`} disabled={editing || active || shown >= max} onClick={() => commitStep(1)}><Plus size={16} aria-hidden="true" /></button>
    </div>
    <span id={`${id}-hint`} className={styles.srOnly}>От {controlNumberText(min)} до {controlNumberText(max)}{unit ? ` ${unit.replace(/\.$/, "")}` : ""}. Стрелки — точный шаг, Shift — десять шагов, Home и End — границы. Нажмите на значение для точного ввода. Изменение применяется при отпускании ползунка; Escape отменяет перемещение.</span>
    {error && <small id={`${id}-error`} className={styles.error}>{error}</small>}
  </div>;
}
