import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Copy, Share2 } from "lucide-react";
import type { ConstructorProject, ProjectCalculation } from "@/lib/constructor/core";
import { purchaseText } from "@/lib/constructor/purchase-text";
import styles from "./constructor.module.css";

const subscribe = () => () => {};
const supportsShare = () => typeof navigator.share === "function";
const serverSupportsShare = () => false;

export default function PurchaseCopy({ project, result, disabled }: {
  project: ConstructorProject;
  result: ProjectCalculation;
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "manual" | "sharing" | "shared" | "cancelled" | "share-error">("idle");
  const canShare = useSyncExternalStore(subscribe, supportsShare, serverSupportsShare);
  const busy = state === "copying" || state === "sharing";
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
  async function share() {
    const value = purchaseText(project, result);
    setText(value);
    setState("sharing");
    try {
      // Keep the call within the user's click; no project URL or file is sent.
      await navigator.share({ title: `Мастерок · ${project.name}`, text: value });
      setState("shared");
    } catch (error) {
      setState(error instanceof Error && error.name === "AbortError" ? "cancelled" : "share-error");
    }
  }
  return <div className={styles.purchaseCopy}>
    <div className={styles.purchaseCopyActions}>
      {canShare && <button type="button" className={styles.secondaryButton} disabled={disabled || busy} aria-describedby={`${id}-hint`} onClick={() => void share()}><Share2 size={17} aria-hidden="true" />{state === "sharing" ? "Открываем меню…" : "Поделиться списком"}</button>}
      <button type="button" className={styles.secondaryButton} disabled={disabled || busy} aria-describedby={`${id}-hint`} onClick={() => void copy()}><Copy size={17} aria-hidden="true" />{state === "copying" ? "Копируем…" : "Скопировать список"}</button>
    </div>
    <p id={`${id}-hint`} className={styles.hint}>Весь проект текстом: материалы, количества и заданные цены. {canShare ? "Приложение и получателя выберете сами." : "Для сообщения мастеру или продавцу."}</p>
    {state === "copied" && <p role="status" className={styles.hint}>Список всего проекта скопирован. Вставьте его в сообщение.</p>}
    {state === "shared" && <p role="status" className={styles.hint}>Список передан в меню «Поделиться». Проверьте отправку в выбранном приложении.</p>}
    {state === "cancelled" && <p role="status" className={styles.hint}>Отправка отменена или нет доступных приложений. Можно скопировать список.</p>}
    {(state === "manual" || state === "share-error") && <>
      <p role="alert" className={styles.hint}>{state === "share-error" ? "Не удалось открыть меню «Поделиться». Скопируйте список кнопкой выше или выделите текст ниже." : "Браузер не разрешил копирование. Выделите текст ниже и скопируйте его через меню устройства."}</p>
      <label htmlFor={id}>Список материалов всего проекта</label>
      <textarea id={id} ref={field} value={text} readOnly rows={6} />
      <button type="button" className={styles.secondaryButton} onClick={() => { field.current?.focus(); field.current?.select(); }}>Выделить весь текст</button>
    </>}
  </div>;
}
