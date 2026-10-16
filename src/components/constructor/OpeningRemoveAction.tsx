"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import styles from "./OpeningRemoveAction.module.css";

type OpeningRemoveActionProps = {
  name: string;
  index: number;
  disabled: boolean;
  onRemove: () => void;
};

/** Compact, reversible confirmation kept inside an opening card. */
export default function OpeningRemoveAction({ name, index, disabled, onRemove }: OpeningRemoveActionProps) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmationLabelId = useId();
  const removalName = `${name.charAt(0).toLocaleLowerCase("ru-RU")}${name.slice(1)}`;

  useEffect(() => {
    if (confirming && !disabled) cancelButton.current?.focus({ preventScroll: true });
  }, [confirming, disabled]);

  const cancel = () => {
    setConfirming(false);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  };

  if (confirming && !disabled) {
    return <div className={styles.confirmation} role="group" aria-labelledby={confirmationLabelId}>
      <p><strong id={confirmationLabelId}>Удалить {removalName}?</strong><span>План и ведомость материалов пересчитаются.</span></p>
      <div className={styles.actions}>
        <button className={styles.removeButton} type="button" disabled={disabled} onClick={() => {
          if (disabled) return;
          onRemove();
        }}>Удалить {removalName}</button>
        <button ref={cancelButton} className={styles.cancelButton} type="button" onClick={cancel}>Отмена</button>
      </div>
    </div>;
  }

  return <button ref={trigger} className={styles.trigger} type="button" aria-label={`Удалить проём ${index}`} disabled={disabled} onClick={() => {
    if (!disabled) setConfirming(true);
  }}>
    <Trash2 size={16} aria-hidden="true" />
  </button>;
}
