import { useId, useRef, useState } from "react";
import { Copy } from "lucide-react";
import type { ConstructorProject, ProjectCalculation } from "@/lib/constructor/core";
import { purchaseText } from "@/lib/constructor/purchase-text";
import styles from "./constructor.module.css";

export default function PurchaseCopy({ project, result, disabled }: {
  project: ConstructorProject;
  result: ProjectCalculation;
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "manual">("idle");
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  async function copy() {
    const value = purchaseText(project, result);
    setText(value);
    setState("copying");
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("manual");
    }
  }
  return <div className={styles.purchaseCopy}>
    <button type="button" className={styles.secondaryButton} disabled={disabled || state === "copying"} aria-describedby={`${id}-hint`} onClick={() => void copy()}><Copy size={17} aria-hidden="true" />{state === "copying" ? "Копируем…" : "Скопировать список"}</button>
    <p id={`${id}-hint`} className={styles.hint}>Весь проект текстом — для сообщения мастеру или продавцу.</p>
    {state === "copied" && <p role="status" className={styles.hint}>Список всего проекта скопирован. Вставьте его в сообщение.</p>}
    {state === "manual" && <>
      <p role="alert" className={styles.hint}>Браузер не разрешил копирование. Выделите текст ниже и скопируйте его через меню устройства.</p>
      <label htmlFor={id}>Список материалов всего проекта</label>
      <textarea id={id} ref={field} value={text} readOnly rows={6} />
      <button type="button" className={styles.secondaryButton} onClick={() => { field.current?.focus(); field.current?.select(); }}>Выделить весь текст</button>
    </>}
  </div>;
}
