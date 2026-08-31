"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { CURING_PRESETS, isCuringPresetId } from "@/lib/curing-timer/presets";
import {
  formatTimerCountdown,
  formatTimerDuration,
  getRemainingSeconds,
  getTimerProgress,
  parseCustomMinutes,
} from "@/lib/curing-timer/timing";
import {
  buildCalculatorHrefForCuringPreset,
  CURING_TIMER_TOOL_SLUG,
  getCalculatorLinkForCuringPreset,
  readCuringTimerTransfer,
} from "@/lib/tools/curing-timer-links";
import {
  trackToolModeChange,
  trackToolPresetSelect,
  trackToolRelatedClick,
} from "@/lib/analytics";

type TimerStatus = "setup" | "running" | "paused" | "completed";

const DEFAULT_PRESET_ID = "primer-deep";

function formatFinishTime(deadlineMs: number): string {
  const deadline = new Date(deadlineMs);
  const today = new Date();
  const isToday = deadline.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat(
    "ru-RU",
    isToday
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  ).format(deadline);
}

export default function CuringTimer() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(DEFAULT_PRESET_ID);
  const [activeCategory, setActiveCategory] = useState(CURING_PRESETS[0].category);
  const [customMinutesInput, setCustomMinutesInput] = useState("60");
  const [status, setStatus] = useState<TimerStatus>("setup");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState(0);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  const categories = useMemo(() => Array.from(new Set(CURING_PRESETS.map((preset) => preset.category))), []);
  const selectedPreset = CURING_PRESETS.find((preset) => preset.id === selectedId) ?? CURING_PRESETS[0];
  const visiblePresets = CURING_PRESETS.filter((preset) => preset.category === activeCategory);
  const customDuration = parseCustomMinutes(customMinutesInput);
  const selectedMinutes = selectedPreset.id === "custom" ? customDuration.minutes : selectedPreset.durationMinutes;
  const canStart = selectedMinutes !== null;
  const progress = getTimerProgress(timerTotalSeconds, secondsLeft);
  const transfer = useMemo(() => readCuringTimerTransfer(searchParams), [searchParams]);
  const relatedCalculator = getCalculatorLinkForCuringPreset(selectedPreset.id);
  const relatedCalculatorHref = buildCalculatorHrefForCuringPreset(selectedPreset.id);
  const hasActiveTransfer = transfer?.presetId === selectedPreset.id;
  const { markStarted } = useToolAnalytics(
    CURING_TIMER_TOOL_SLUG,
    resultRef,
    status !== "setup",
  );

  useEffect(() => {
    const fromUrl = searchParams.get("preset");
    if (fromUrl && isCuringPresetId(fromUrl)) {
      const fromUrlPreset = CURING_PRESETS.find((preset) => preset.id === fromUrl);
      if (fromUrlPreset) {
        setSelectedId(fromUrlPreset.id);
        setActiveCategory(fromUrlPreset.category);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const signalCompletion = useCallback(() => {
    setStatus("completed");
    setDeadlineMs(null);
    setSecondsLeft(0);
    void audioRef.current?.play().catch(() => undefined);
    navigator.vibrate?.([200, 100, 200, 100, 200]);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Таймер завершён!", {
        body: `${selectedPreset.name}: проверьте поверхность перед продолжением работ`,
        icon: "/favicon.ico",
        tag: "curing-timer",
        requireInteraction: true,
      });
    }
  }, [selectedPreset.name]);

  useEffect(() => {
    if (status !== "running" || deadlineMs === null) return;

    const updateRemaining = () => {
      const remaining = getRemainingSeconds(deadlineMs);
      setSecondsLeft(remaining);
      if (remaining === 0) signalCompletion();
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 500);
    return () => window.clearInterval(interval);
  }, [deadlineMs, signalCompletion, status]);

  useEffect(() => {
    if (status !== "completed") return;
    trackToolModeChange(CURING_TIMER_TOOL_SLUG, "completed");
    const originalTitle = document.title;
    let flash = true;
    const interval = window.setInterval(() => {
      document.title = flash ? "✅ Таймер завершён!" : originalTitle;
      flash = !flash;
    }, 1000);
    return () => {
      window.clearInterval(interval);
      document.title = originalTitle;
    };
  }, [status]);

  const selectCategory = (category: string) => {
    markStarted("category");
    setActiveCategory(category);
    const firstPreset = CURING_PRESETS.find((preset) => preset.category === category);
    if (firstPreset) {
      setSelectedId(firstPreset.id);
      trackToolPresetSelect(CURING_TIMER_TOOL_SLUG, "material", firstPreset.id);
    }
    trackToolModeChange(CURING_TIMER_TOOL_SLUG, category);
  };

  const selectPreset = (presetId: string) => {
    markStarted("preset");
    setSelectedId(presetId);
    trackToolPresetSelect(CURING_TIMER_TOOL_SLUG, "material", presetId);
  };

  const startTimer = () => {
    if (selectedMinutes === null) return;
    markStarted("timer_start");
    const totalSeconds = selectedMinutes * 60;
    setTimerTotalSeconds(totalSeconds);
    setSecondsLeft(totalSeconds);
    setDeadlineMs(Date.now() + totalSeconds * 1000);
    setStatus("running");
    trackToolModeChange(CURING_TIMER_TOOL_SLUG, "started");
  };

  const pauseTimer = () => {
    if (deadlineMs !== null) setSecondsLeft(getRemainingSeconds(deadlineMs));
    setDeadlineMs(null);
    setStatus("paused");
  };

  const resumeTimer = () => {
    if (secondsLeft <= 0) return signalCompletion();
    setDeadlineMs(Date.now() + secondsLeft * 1000);
    setStatus("running");
  };

  const resetTimer = () => {
    setStatus("setup");
    setDeadlineMs(null);
    setSecondsLeft(0);
    setTimerTotalSeconds(0);
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const phase = status === "completed" ? 3 : status === "setup" ? 1 : 2;

  return (
    <div className="max-w-4xl space-y-4">
      <audio ref={audioRef} preload="none" src="data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YToFAACAj56ssbu+wLy2rqKUhoB/gIaSnKiyw7zCwLqyqJ6SiIGAgISMlqCqtLzBwb67s6uhnZKIgoCAhIyWoKq0vMHBvruzoZ2SiIKAgISMlqCqtLzBwb67s6GdkoiCgICEjJagqrS8wcG+u7OhnZKIgoCAhIyWoKq0vMHBvruzoZ2SiIKAgISMlqCqtLzBwb67s6GdkoiCgA==" />

      <nav className="card grid grid-cols-3 overflow-hidden p-1" aria-label="Этапы таймера">
        {["Материал", "Таймер", "Готово"].map((label, index) => {
          const step = index + 1;
          return (
            <div key={label} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold sm:text-sm ${phase === step ? "bg-accent-600 text-white shadow-sm" : phase > step ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
              <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${phase === step ? "bg-white/20" : phase > step ? "bg-emerald-100 dark:bg-emerald-950" : "bg-slate-100 dark:bg-slate-800"}`} aria-hidden="true">
                {phase > step ? "✓" : step}
              </span>
              {label}
            </div>
          );
        })}
      </nav>

      {status === "setup" && (
        <div className="space-y-4">
          {hasActiveTransfer && relatedCalculator && (
            <div
              className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200"
              data-testid="curing-timer-transfer-banner"
            >
              <p className="font-semibold">Тип материала выбран из расчёта</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-800/80 dark:text-sky-300/80">
                Из «{relatedCalculator.calculatorTitle}» перенесён только тип материала. Время не рассчитано по толщине, температуре или конкретному продукту, а таймер ещё не запущен.
              </p>
            </div>
          )}
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Категория материала">
            <div className="flex min-w-max gap-2">
              {categories.map((category) => (
                <button key={category} type="button" role="tab" aria-selected={activeCategory === category} onClick={() => selectCategory(category)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${activeCategory === category ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950" : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="card p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">Шаг 1 · материал</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Что сейчас сохнет?</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Показываем только выбранную категорию — без длинного списка.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {visiblePresets.map((preset) => {
                  const selected = selectedId === preset.id;
                  return (
                    <button key={preset.id} type="button" aria-pressed={selected} onClick={() => selectPreset(preset.id)} className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? "border-accent-400 bg-accent-50 shadow-sm ring-1 ring-accent-200 dark:border-accent-500 dark:!bg-slate-800 dark:ring-accent-800" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-slate-600"}`}>
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-xl ${selected ? "bg-white shadow-sm dark:!bg-slate-900" : "bg-slate-100 dark:bg-slate-800"}`} aria-hidden="true">{preset.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{preset.name}</span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{formatTimerDuration(preset.durationMinutes)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedPreset.id === "custom" && (
                <label className="mt-4 block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Продолжительность в минутах</span>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="number" inputMode="numeric" min={1} max={14400} step={1} value={customMinutesInput} onChange={(event) => { markStarted("value_input"); setCustomMinutesInput(event.target.value); }} aria-invalid={customDuration.error !== null} aria-describedby={customDuration.error ? "custom-duration-error" : "custom-duration-hint"} className="input-field min-h-12 w-32" />
                    {customDuration.minutes !== null && <span id="custom-duration-hint" className="text-sm font-semibold text-slate-600 dark:text-slate-300">{formatTimerDuration(customDuration.minutes)}</span>}
                  </div>
                  {customDuration.error && <span id="custom-duration-error" className="mt-2 block text-xs font-medium text-red-600 dark:text-red-400">{customDuration.error}</span>}
                </label>
              )}
            </section>

            <aside className="card overflow-hidden lg:sticky lg:top-6">
              <div className="border-b border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 dark:border-amber-800/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Паспорт таймера</p>
                <div className="mt-3 flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-800" aria-hidden="true">{selectedPreset.icon}</span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold leading-snug text-slate-950 dark:text-white">{selectedPreset.name}</h2>
                    <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{selectedMinutes === null ? "—" : formatTimerDuration(selectedMinutes)}</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Готов к запуску</span>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Следующее действие</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{selectedPreset.description}</p>
                </div>
                {selectedPreset.tip && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <span className="font-bold">Проверка мастера:</span> {selectedPreset.tip}
                  </div>
                )}
                <button type="button" onClick={startTimer} disabled={!canStart} className="btn-primary min-h-12 w-full text-base">Запустить таймер →</button>
                <p className="text-[11px] leading-relaxed text-slate-400">Время ориентировочное. Перед следующим этапом проверьте инструкцию производителя и состояние поверхности.</p>
                {relatedCalculator && relatedCalculatorHref && (
                  <Link
                    href={relatedCalculatorHref}
                    onClick={() => trackToolRelatedClick(CURING_TIMER_TOOL_SLUG, relatedCalculator.calculatorSlug)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 no-underline hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-200"
                    data-testid="curing-timer-calculator-link"
                  >
                    {hasActiveTransfer ? "Вернуться к расчёту материала" : "Рассчитать количество материала"}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {(status === "running" || status === "paused") && (
        <section ref={resultRef} className="card overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-5 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">{status === "paused" ? "Таймер на паузе" : "Идёт выдержка"}</p>
                  <h2 className="mt-1 text-lg font-bold sm:text-xl">{selectedPreset.icon} {selectedPreset.name}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status === "paused" ? "bg-slate-700 text-slate-200" : "bg-emerald-400/15 text-emerald-300"}`}>{status === "paused" ? "Приостановлен" : "В работе"}</span>
              </div>

              <div className="py-10 text-center sm:py-12">
                <p className="font-mono text-6xl font-bold tracking-tight tabular-nums sm:text-7xl">{formatTimerCountdown(secondsLeft)}</p>
                <p className="mt-2 text-sm text-slate-400">осталось до проверки</p>
                {status === "running" && deadlineMs !== null && <p className="mt-1 text-xs font-semibold text-amber-300">Ориентир: {formatFinishTime(deadlineMs)}</p>}
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Ход таймера" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={status === "paused" ? resumeTimer : pauseTimer} className="min-h-12 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-50">{status === "paused" ? "Продолжить" : "Пауза"}</button>
                <button type="button" onClick={resetTimer} className="min-h-12 rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10">Сбросить</button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Что будет дальше</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{selectedPreset.description}</p>
              </div>
              {selectedPreset.tip && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200"><span className="font-bold">Перед продолжением:</span> {selectedPreset.tip}</div>}
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Сигнал по готовности</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Звук и вибрация сработают в открытой вкладке.</p>
                {notificationPermission === "default" && <button type="button" onClick={enableNotifications} className="mt-2 min-h-11 text-left text-xs font-bold text-accent-700 hover:text-accent-800 dark:text-accent-300">Включить системное уведомление →</button>}
                {notificationPermission === "granted" && <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Системное уведомление включено</p>}
                {notificationPermission === "denied" && <p className="mt-2 text-xs text-slate-500">Уведомления запрещены в настройках браузера.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {status === "completed" && (
        <section ref={resultRef} className="card overflow-hidden" role="status">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 text-center dark:from-emerald-950/30 dark:via-slate-900 dark:to-amber-950/20 sm:p-8">
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-500/20">✓</div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Выдержка завершена</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Пора проверить поверхность</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">{selectedPreset.name}: таймер закончен, но фактическая готовность зависит от температуры, влажности, толщины слоя и инструкции на упаковке.</p>
            {selectedPreset.tip && <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-amber-200 bg-white/80 p-4 text-left text-sm text-amber-900 dark:border-amber-800/50 dark:bg-slate-900/70 dark:text-amber-200"><span className="font-bold">Проверка мастера:</span> {selectedPreset.tip}</div>}
            <div className="mx-auto mt-6 grid max-w-lg gap-2 sm:grid-cols-2">
              <button type="button" onClick={startTimer} className="btn-primary min-h-12">Повторить таймер</button>
              <button type="button" onClick={resetTimer} className="btn-secondary min-h-12">Выбрать другой материал</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
