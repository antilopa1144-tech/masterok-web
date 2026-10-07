"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL } from "@/lib/constructor/entry";
import styles from "./constructor-entry.module.css";

export default function ConstructorImportAction() {
  const router = useRouter();
  const hintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setReady(true); return () => pending.current?.abort(); }, []);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);

  const openFile = async (file: File) => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError("");
    try {
      // File validation and storage code are only needed after choosing a file.
      const { importAndSaveWorkspace } = await import("@/lib/constructor/import");
      controller.signal.throwIfAborted();
      const id = await importAndSaveWorkspace(file, controller.signal);
      if (!controller.signal.aborted) router.push(`${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(id)}`);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Не удалось открыть проект. Выберите файл ещё раз.");
      pending.current = null;
      setBusy(false);
    }
  };

  return <div className={styles.importAction}>
    <button type="button" className={styles.importButton} disabled={!ready || busy} aria-describedby={hintId} onClick={() => fileInput.current?.click()}>
      {busy ? <LoaderCircle size={18} aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
      {busy ? "Открываем проект…" : "Открыть файл проекта"}
    </button>
    <input ref={fileInput} type="file" hidden accept=".json,.masterok.json,application/json" aria-label="Файл проекта конструктора" onChange={(event) => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (file) void openFile(file);
    }} />
    <p id={hintId} className={styles.importHint}>Файл .masterok.json, до 4 МБ. Откроется отдельная копия.</p>
    {busy && <span className="sr-only" role="status">Проверяем и сохраняем проект в этом браузере.</span>}
    {error && <p ref={errorMessage} tabIndex={-1} role="alert" className={styles.importError}>{error}</p>}
  </div>;
}
