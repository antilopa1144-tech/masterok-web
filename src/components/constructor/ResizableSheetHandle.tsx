"use client";

import { useRef } from "react";
import styles from "./constructor.module.css";

const bounds = () => ({ min: 300, max: Math.max(300, Math.min(700, window.innerHeight * .76, window.innerHeight - 230)) });
const clamp = (value: number) => { const { min, max } = bounds(); return Math.max(min, Math.min(max, value)); };

export default function ResizableSheetHandle({ expanded, onResize, onToggle }: {
  expanded: boolean;
  onResize: (height: number) => void;
  onToggle: () => void;
}) {
  const drag = useRef<{ pointer: number; y: number; height: number } | null>(null);
  const moved = useRef(false);
  return <button type="button" className={styles.sheetHandle} aria-label="Изменить высоту панели"
    title="Перетащите вверх или вниз. Стрелки клавиатуры тоже меняют высоту."
    aria-expanded={expanded}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const sheet = event.currentTarget.closest("aside");
      if (!sheet) return;
      drag.current = { pointer: event.pointerId, y: event.clientY, height: sheet.getBoundingClientRect().height };
      moved.current = false; event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      const delta = current.y - event.clientY;
      if (Math.abs(delta) > 4) moved.current = true;
      if (moved.current) onResize(clamp(current.height + delta));
    }}
    onPointerUp={(event) => {
      if (drag.current?.pointer !== event.pointerId) return;
      drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; moved.current = false; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onClick={() => { if (moved.current) { moved.current = false; return; } onToggle(); }}
    onKeyDown={(event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const height = event.currentTarget.closest("aside")?.getBoundingClientRect().height ?? 450;
      onResize(clamp(event.key === "Home" ? bounds().min : event.key === "End" ? bounds().max : height + (event.key === "ArrowUp" ? 40 : -40)));
    }}><span /></button>;
}
