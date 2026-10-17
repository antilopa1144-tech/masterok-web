"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  trackChecklistProgress,
  trackChecklistStart,
  type ChecklistProgressMilestone,
} from "@/lib/analytics";
import type { Checklist } from "@/lib/checklists";
import styles from "./checklist.module.css";
import { copyText } from "@/lib/clipboard";
import { buildChecklistRemainingText } from "@/lib/checklist-export";
import {
  checklistItemKey,
  getChecklistMilestonesToReport,
  getChecklistItemKeys,
  loadChecklistProgress,
  saveChecklistProgress,
} from "@/lib/checklist-progress";

export default function InteractiveChecklist({ checklist }: { checklist: Checklist }) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return <InteractiveChecklistSession key={`${checklist.slug}:${hydrated}`} checklist={checklist} hydrated={hydrated} />;
}

function InteractiveChecklistSession({ checklist, hydrated }: { checklist: Checklist; hydrated: boolean }) {
  const allKeys = useMemo(() => getChecklistItemKeys(checklist), [checklist]);
  const validKeys = useMemo(() => new Set(allKeys), [allKeys]);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    () => hydrated ? loadChecklistProgress(checklist.slug, validKeys) : new Set(),
  );
  const [expandedStep, setExpandedStep] = useState<number | null>(() => {
    const saved = hydrated ? loadChecklistProgress(checklist.slug, validKeys) : new Set<string>();
    const firstIncomplete = checklist.steps.findIndex((step, stepIndex) =>
      step.items.some((_, itemIndex) => !saved.has(checklistItemKey(stepIndex, itemIndex))),
    );
    return firstIncomplete >= 0 ? firstIncomplete : Math.max(0, checklist.steps.length - 1);
  });
  const startedRef = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);
  const showAllRef = useRef<HTMLButtonElement>(null);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ text: string; copied: boolean } | null>(null);
  const reportedMilestonesRef = useRef<Set<ChecklistProgressMilestone>>(new Set());

  const totalItems = allKeys.length;
  const completedItems = checkedKeys.size;
  const remainingItems = totalItems - completedItems;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const remainingText = useMemo(() => buildChecklistRemainingText(checklist, checkedKeys), [checklist, checkedKeys]);
  const currentCopyResult = copyResult?.text === remainingText ? copyResult : null;

  const copyRemaining = async () => {
    if (!remainingText || copying) return;
    setCopying(true);
    const copied = await copyText(remainingText);
    setCopyResult({ text: remainingText, copied });
    setCopying(false);
  };

  const toggleItem = (stepIndex: number, itemIndex: number) => {
    const focused = document.activeElement;
    const key = checklistItemKey(stepIndex, itemIndex);
    const next = new Set(checkedKeys);
    setCopyResult(null);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckedKeys(next);
    saveChecklistProgress(checklist.slug, next);
    if (!startedRef.current) {
      startedRef.current = true;
      reportedMilestonesRef.current = new Set(
        getChecklistMilestonesToReport(checkedKeys.size, totalItems, new Set()),
      );
      trackChecklistStart(checklist.slug);
    }
    for (const milestone of getChecklistMilestonesToReport(
      next.size,
      totalItems,
      reportedMilestonesRef.current,
    )) {
      reportedMilestonesRef.current.add(milestone);
      trackChecklistProgress(checklist.slug, milestone);
    }

    const stepComplete = checklist.steps[stepIndex].items.every((_, index) =>
      next.has(checklistItemKey(stepIndex, index)),
    );
    if (stepComplete && stepIndex < checklist.steps.length - 1) setExpandedStep(stepIndex + 1);
    if (onlyRemaining && focused instanceof HTMLInputElement) {
      requestAnimationFrame(() => {
        const inputs = Array.from(listRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? []);
        const after = inputs.slice(inputs.indexOf(focused) + 1);
        const nextInput = [...after, ...inputs].find(input => !input.checked);
        (nextInput ?? showAllRef.current)?.focus({ preventScroll: true });
      });
    }
  };

  const resetProgress = () => {
    if (!window.confirm("Сбросить все отметки в этом чек-листе?")) return;
    const next = new Set<string>();
    setExpandedStep(0);
    setOnlyRemaining(false);
    setCopyResult(null);
    setCheckedKeys(next);
    saveChecklistProgress(checklist.slug, next);
  };

  return (
    <div className={`space-y-4 ${styles.checklist}`}>
      <section className="card overflow-hidden print:hidden" aria-label="Прогресс чек-листа">
        <div className="border-b border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-accent-50 p-4 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-accent-950/20 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Паспорт работ</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{checklist.categoryIcon} {checklist.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Отметки сохраняются только в этом браузере.</p>
            </div>
            <div className="shrink-0 text-right" aria-live="polite">
              <p className="text-3xl font-bold text-slate-950 dark:text-white">{progress}%</p>
              <p className="text-[10px] text-slate-500">{completedItems} из {totalItems}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800" role="progressbar" aria-label="Выполнение чек-листа" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 sm:p-5">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Этапы</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{checklist.steps.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Готово</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Осталось</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{remainingItems}</p>
          </div>
        </div>
      </section>

      <div className="print:hidden">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Показать пункты чек-листа">
          <button ref={showAllRef} type="button" disabled={!hydrated} aria-pressed={!onlyRemaining} onClick={() => setOnlyRemaining(false)} className={styles.filter}>Все пункты · {totalItems}</button>
          <button type="button" disabled={!hydrated} aria-pressed={onlyRemaining} onClick={() => setOnlyRemaining(true)} className={styles.filter}>Только оставшиеся · {remainingItems}</button>
        </div>
        {onlyRemaining && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{remainingItems ? `Осталось проверить: ${remainingItems}. Открыты все незавершённые этапы.` : "Все пункты проверены. Чтобы изменить отметку, покажите все пункты."}</p>}
        <button type="button" disabled={!hydrated || !remainingItems || copying} onClick={copyRemaining} className={`${styles.filter} mt-3 w-full text-left disabled:cursor-default disabled:opacity-50 sm:w-auto`} aria-describedby="remaining-copy-help">{copying ? "Копируем…" : "Скопировать оставшиеся проверки"}</button>
        <p id="remaining-copy-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">Действия из всех этапов для заметок или сообщения мастеру. Количества материалов берите из ведомости.</p>
        {currentCopyResult?.copied && <p role="status" aria-label="Результат копирования" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Скопировано. Вставьте список в заметку или сообщение.</p>}
        {currentCopyResult && !currentCopyResult.copied && <div className="mt-3">
          <p role="alert" className="mb-2 text-sm text-slate-600 dark:text-slate-300">Браузер не разрешил копирование. Выделите текст ниже и скопируйте вручную.</p>
          <label className="block text-sm font-semibold" htmlFor="remaining-copy-text">Оставшиеся проверки для копирования</label>
          <textarea id="remaining-copy-text" readOnly rows={8} value={remainingText} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        </div>}
      </div>

      <ol ref={listRef} aria-label="Этапы проверки" aria-busy={!hydrated} className={`space-y-3 transition-opacity ${hydrated ? "opacity-100" : "opacity-70"}`}>
        {checklist.steps.map((step, stepIndex) => {
          const checkedInStep = step.items.filter((_, itemIndex) => checkedKeys.has(checklistItemKey(stepIndex, itemIndex))).length;
          const stepComplete = checkedInStep === step.items.length;
          const expanded = onlyRemaining || expandedStep === stepIndex;
          return (
            <li key={step.title} className={`card overflow-hidden transition-opacity ${styles.step} ${onlyRemaining && stepComplete ? "hidden" : ""} ${stepComplete ? "opacity-75" : ""}`}>
              <button type="button" disabled={onlyRemaining} onClick={() => setExpandedStep(expanded ? -1 : stepIndex)} aria-expanded={expanded} className="flex min-h-16 w-full items-center gap-3 p-3 text-left sm:p-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${stepComplete ? "bg-emerald-500 text-white" : "bg-accent-100 text-accent-700 dark:bg-accent-950/50 dark:text-accent-300"}`}>{stepComplete ? "✓" : stepIndex + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold leading-snug sm:text-base ${stepComplete ? "text-slate-500 line-through" : "text-slate-900 dark:text-slate-100"}`}>{step.title.replace(/^\d+\.\s*/, "")}</span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-400">{checkedInStep} из {step.items.length} выполнено</span>
                </span>
                <span className={`text-lg text-slate-400 transition-transform sm:hidden ${expanded ? "rotate-180" : ""} ${onlyRemaining ? "hidden" : ""}`} aria-hidden="true">⌄</span>
              </button>

              <div className={`${styles.items} ${expanded ? "block" : "hidden"} border-t border-slate-100 px-3 pb-3 dark:border-slate-700 sm:px-5 sm:pb-5`}>
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {step.items.map((item, itemIndex) => {
                    const key = checklistItemKey(stepIndex, itemIndex);
                    const checked = checkedKeys.has(key);
                    return (
                      <li key={key} className={`${styles.item} ${onlyRemaining && checked ? "hidden" : ""}`}>
                        <label className="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-sm leading-snug text-slate-700 dark:text-slate-200">
                          <input type="checkbox" checked={checked} disabled={!hydrated} onChange={() => toggleItem(stepIndex, itemIndex)} className="mt-0.5 size-5 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-500/30 disabled:cursor-wait" />
                          <span className={checked ? "text-slate-400 line-through" : ""}>{item}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {completedItems > 0 && (
        <div className="flex justify-end print:hidden">
          <button type="button" onClick={resetProgress} className="min-h-11 text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Сбросить отметки</button>
        </div>
      )}
    </div>
  );
}
