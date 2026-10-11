"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { ConstructorRoom, RoomType } from "@/lib/constructor/core";
import { createInteriorRoom, presetFor } from "@/lib/constructor/interiors";
import { NumberField, TextField } from "./DraftFields";
import { RoomTypeIcon, RoomTypePicker } from "./RoomInteriorControls";
import styles from "./RoomCreationForm.module.css";
import common from "./constructor.module.css";

type Dimension = "widthMm" | "lengthMm" | "heightMm";

export default function RoomCreationForm({ existingNames, blocked, onCreate, onCancel, initialRoom, initialStep = "type", intent = "room" }: {
  existingNames: readonly string[];
  blocked: boolean;
  onCreate: (room: ConstructorRoom) => string | undefined;
  onCancel: () => void;
  initialRoom?: ConstructorRoom;
  initialStep?: "type" | "dimensions";
  intent?: "room" | "project";
}) {
  const [step, setStep] = useState<"type" | "dimensions">(initialStep);
  const [room, setRoom] = useState(() => initialRoom ?? createInteriorRoom("living", existingNames));
  const [edited, setEdited] = useState<Partial<Record<Dimension | "name", boolean>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLParagraphElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (body.current) body.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const onStatus = useCallback((id: string, message: string | null) => setDrafts((previous) => {
    if (previous[id] === message || (!message && !(id in previous))) return previous;
    const next = { ...previous }; if (message) next[id] = message; else delete next[id]; return next;
  }), []);
  const pending = Object.values(drafts)[0];
  const type = room.interior!.type;
  const chooseType = (nextType: RoomType) => {
    if (nextType === type) return;
    const next = createInteriorRoom(nextType, existingNames);
    for (const field of ["widthMm", "lengthMm", "heightMm"] as const) if (edited[field]) next[field] = room[field];
    if (edited.name) next.name = room.name;
    setRoom(next); setError("");
  };
  const setDimension = (field: Dimension, value: number) => {
    setRoom((current) => ({ ...current, [field]: value })); setEdited((current) => ({ ...current, [field]: true })); setError("");
  };

  return <div className={styles.form}>
    <ol className={styles.steps} aria-label={intent === "project" ? "Этапы создания проекта" : "Этапы добавления помещения"}>
      <li aria-current={step === "type" ? "step" : undefined}><span>1</span>Тип помещения</li>
      <li aria-current={step === "dimensions" ? "step" : undefined}><span>2</span>Ваши размеры</li>
    </ol>
    <div ref={body} className={styles.body}>
      {step === "type" ? <>
        <p ref={heading} tabIndex={-1} className={styles.intro}>Выберите обстановку. На следующем шаге задайте размеры своего помещения.</p>
        <RoomTypePicker value={type} onChange={chooseType} />
      </> : <>
        <div className={styles.selection}><RoomTypeIcon type={type} size={23} /><p ref={heading} tabIndex={-1}><strong>{presetFor(type).name}</strong></p><button type="button" onClick={() => setStep("type")} disabled={!!pending}><ArrowLeft size={16} />Изменить тип</button></div>
        <TextField label="Название помещения" value={room.name} onStatus={onStatus} onCommit={(name) => { setRoom((current) => ({ ...current, name })); setEdited((current) => ({ ...current, name: true })); setError(""); }} />
        <p className={styles.intro}>Укажите размеры внутри помещения. Двигайте ползунок или нажмите на значение для точного ввода.</p>
        <div className={styles.dimensions}>
          <NumberField label="Ширина" value={room.widthMm} min={300} max={30000} unit="мм" onStatus={onStatus} onCommit={(value) => setDimension("widthMm", value)} />
          <NumberField label="Длина" value={room.lengthMm} min={300} max={30000} unit="мм" onStatus={onStatus} onCommit={(value) => setDimension("lengthMm", value)} />
          <NumberField label="Высота" value={room.heightMm} min={500} max={6000} unit="мм" onStatus={onStatus} onCommit={(value) => setDimension("heightMm", value)} />
        </div>
        <p className={styles.note}>Двери, окна и отделку можно настроить в редакторе. Обстановка показана для масштаба и не входит в ведомость.</p>
      </>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
    <div className={styles.footer}>
      {step === "type"
        ? <button type="button" className={common.primaryButton} disabled={blocked} onClick={() => setStep("dimensions")}>Далее: размеры<ArrowRight size={18} /></button>
        : <button type="button" className={common.primaryButton} disabled={blocked || !!pending} onClick={() => { if (!pending) setError(onCreate(room) ?? ""); }}>{intent === "project" ? <ArrowRight size={18} /> : <Plus size={18} />}{intent === "project" ? "Открыть 3D-проект" : "Добавить помещение"}</button>}
      <button type="button" className={common.secondaryButton} onClick={onCancel}>Отмена</button>
      {pending && <p className={styles.pending} role="status">{pending}</p>}
    </div>
  </div>;
}
