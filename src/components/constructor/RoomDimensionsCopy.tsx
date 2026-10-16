import { useId, useRef, useState } from "react";
import { Copy } from "lucide-react";
import type { ConstructorRoom } from "@/lib/constructor/core";
import { roomDimensionsText } from "@/lib/constructor/room-dimensions-text";
import styles from "./constructor.module.css";

export default function RoomDimensionsCopy({ room, disabled }: { room: ConstructorRoom; disabled: boolean }) {
  const text = roomDimensionsText(room);
  // Discard an old success message or fallback snapshot when dimensions change.
  return <CopyAction key={text} text={text} disabled={disabled} />;
}

function CopyAction({ text, disabled }: { text: string; disabled: boolean }) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "manual">("idle");
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("manual");
    }
  }
  return <div className={styles.purchaseCopy}>
    <button type="button" className={styles.secondaryButton} disabled={disabled || state === "copying"} aria-describedby={`${id}-hint`} onClick={() => void copy()}><Copy size={17} aria-hidden="true" />{state === "copying" ? "Копируем…" : "Скопировать размеры"}</button>
    <p id={`${id}-hint`} className={styles.hint}>Эта комната и её проёмы текстом — для сообщения мастеру.</p>
    {state === "copied" && <p role="status" className={styles.hint}>Размеры комнаты скопированы. Вставьте их в сообщение.</p>}
    {state === "manual" && <>
      <p role="alert" className={styles.hint}>Браузер не разрешил копирование. Выделите текст ниже и скопируйте его через меню устройства.</p>
      <label htmlFor={id}>Размеры выбранной комнаты</label>
      <textarea id={id} ref={field} value={text} readOnly rows={6} />
      <button type="button" className={styles.secondaryButton} disabled={disabled} onClick={() => { field.current?.focus(); field.current?.select(); }}>Выделить весь текст</button>
    </>}
  </div>;
}
