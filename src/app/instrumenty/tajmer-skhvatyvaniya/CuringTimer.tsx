"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CuringPreset {
  id: string;
  category: string;
  name: string;
  icon: string;
  durationMinutes: number;
  description: string;
  tip: string;
}

const PRESETS: CuringPreset[] = [
  // Грунтовка
  { id: "primer-deep", category: "Грунтовка", name: "Грунтовка глубокого проникновения", icon: "💧", durationMinutes: 120, description: "2 часа при 20°C, нормальной влажности", tip: "Проверьте рукой — поверхность не должна быть липкой" },
  { id: "primer-contact", category: "Грунтовка", name: "Бетоноконтакт", icon: "💧", durationMinutes: 240, description: "4 часа. Полное высыхание — 12 часов", tip: "Бетоноконтакт должен стать сухим и шершавым на ощупь" },

  // Штукатурка
  { id: "plaster-gypsum", category: "Штукатурка", name: "Штукатурка гипсовая (Ротбанд)", icon: "🧱", durationMinutes: 60, description: "Схватывание 40-60 мин. Высыхание слоя 10мм — сутки", tip: "Не сушите тепловыми пушками — будут трещины" },
  { id: "plaster-cement", category: "Штукатурка", name: "Штукатурка цементная", icon: "🧱", durationMinutes: 120, description: "Схватывание 2 часа. Набор прочности — 7 дней", tip: "Первые 3 дня увлажняйте поверхность для набора прочности" },

  // Шпаклёвка
  { id: "putty-start", category: "Шпаклёвка", name: "Шпаклёвка стартовая", icon: "🪣", durationMinutes: 360, description: "6 часов между слоями при 20°C", tip: "Обязательна грунтовка между слоями шпаклёвки" },
  { id: "putty-finish", category: "Шпаклёвка", name: "Шпаклёвка финишная", icon: "🪣", durationMinutes: 240, description: "4 часа при слое до 2мм", tip: "Перед покраской шлифуйте при боковом свете" },

  // Стяжка
  { id: "screed-cement", category: "Стяжка", name: "Стяжка ЦПС (40-50 мм)", icon: "🏗️", durationMinutes: 1440, description: "Ходить — через сутки. Класть покрытие — через 28 дней", tip: "1 мм стяжки = 1 день высыхания. 50 мм = 50 дней" },
  { id: "self-leveling", category: "Стяжка", name: "Наливной пол", icon: "🏗️", durationMinutes: 360, description: "Ходить через 4-6 часов. Покрытие — через 7-14 дней", tip: "Не допускайте сквозняков первые сутки" },

  // Клей
  { id: "tile-adhesive", category: "Клей", name: "Плиточный клей", icon: "⬜", durationMinutes: 1440, description: "Схватывание 20 мин. Затирка — через сутки", tip: "Не ходите по свежей плитке! Используйте мостики" },
  { id: "wallpaper-glue", category: "Клей", name: "Обойный клей", icon: "📜", durationMinutes: 1440, description: "Полное высыхание — 24-48 часов", tip: "Не открывайте окна! Сквозняк — главный враг обоев" },

  // Затирка
  { id: "grout", category: "Затирка", name: "Затирка для плитки", icon: "🔲", durationMinutes: 30, description: "Замывка через 15-30 мин. Полная прочность — 72 часа", tip: "Замывайте влажной губкой по диагонали к шву" },

  // Краска
  { id: "paint-acrylic", category: "Краска", name: "Краска акриловая", icon: "🎨", durationMinutes: 120, description: "Сухая на ощупь — 1 час. Следующий слой — 2 часа", tip: "Второй слой наносите перпендикулярно первому" },
  { id: "paint-latex", category: "Краска", name: "Краска латексная", icon: "🎨", durationMinutes: 240, description: "Сухая — 2 часа. Следующий слой — 4 часа", tip: "Не наносите толстым слоем — будут подтёки" },

  // Гидроизоляция
  { id: "waterproof", category: "Гидроизоляция", name: "Мастика гидроизоляционная", icon: "🛡️", durationMinutes: 360, description: "Между слоями — 4-6 часов. 2 слоя обязательны!", tip: "Второй слой наносите поперёк первого" },

  // Собственный
  { id: "custom", category: "Другое", name: "Свой таймер", icon: "⏱️", durationMinutes: 60, description: "Установите нужное время вручную", tip: "" },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export default function CuringTimer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(60);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const preset = PRESETS.find((p) => p.id === selectedId);
  const totalSeconds = preset
    ? (preset.id === "custom" ? customMinutes : preset.durationMinutes) * 60
    : 0;

  const startTimer = useCallback(() => {
    if (!preset) return;
    setSecondsLeft(totalSeconds);
    setRunning(true);
    setCompleted(false);
  }, [preset, totalSeconds]);

  const stopTimer = useCallback(() => {
    setRunning(false);
    setSecondsLeft(0);
    setCompleted(false);
  }, []);

  // Flash document title when timer completes
  useEffect(() => {
    if (!completed) return;
    const originalTitle = document.title;
    let flash = true;
    const interval = setInterval(() => {
      document.title = flash ? "✅ Таймер завершён!" : originalTitle;
      flash = !flash;
    }, 1000);
    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
  }, [completed]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setCompleted(true);
          // Play notification sound
          try {
            audioRef.current?.play();
          } catch {}
          // Vibrate on mobile
          try {
            navigator.vibrate?.([200, 100, 200, 100, 200]);
          } catch {}
          // Send push notification (works even when tab is in background)
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Таймер завершён!", {
              body: `${preset?.name}: можно продолжать работу`,
              icon: "/favicon.ico",
              tag: "curing-timer",
              requireInteraction: true,
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, secondsLeft, preset]);

  // Request notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  // Group presets by category
  const categories = Array.from(new Set(PRESETS.map((p) => p.category)));

  return (
    <div className="max-w-2xl space-y-6">
      {/* Notification sound — generated 800Hz beep */}
      <audio ref={audioRef} preload="none" src="data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YToFAACAj56ssbu+wLy2rqKUhoB/gIaSnKiyw7zCwLqyqJ6SiIGAgISMlqCqtLzBwb67s6uhnZKIgoCAhIyWoKq0vMHBvruzoZ2SiIKAgISMlqCqtLzBwb67s6GdkoiCgICEjJagqrS8wcG+u7OhnZKIgoCAhIyWoKq0vMHBvruzoZ2SiIKAgISMlqCqtLzBwb67s6GdkoiCgA==" />

      {/* Material selector */}
      {!running && !completed && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Выберите материал
          </h2>

          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">{cat}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedId === p.id
                        ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom duration */}
          {selectedId === "custom" && (
            <div className="flex items-center gap-3 mt-3">
              <label className="text-sm text-slate-600 dark:text-slate-300">Минут:</label>
              <input
                type="number"
                min={1}
                max={14400}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="input-field w-24"
              />
              <span className="text-sm text-slate-400">= {formatDuration(customMinutes)}</span>
            </div>
          )}

          {/* Start button */}
          {preset && (
            <button
              onClick={startTimer}
              className="btn-primary w-full py-3 text-base"
            >
              Запустить — {formatDuration(preset.id === "custom" ? customMinutes : preset.durationMinutes)}
            </button>
          )}
        </div>
      )}

      {/* Running timer */}
      {running && (
        <div className="card p-8 text-center space-y-6">
          <div className="text-4xl">{preset?.icon}</div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{preset?.name}</p>

          {/* Circular-ish progress */}
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"
                className="text-accent-500"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatTime(secondsLeft)}
              </span>
              <span className="text-xs text-slate-400">осталось</span>
            </div>
          </div>

          {preset?.tip && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 text-left">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Совет:</span> {preset.tip}
              </p>
            </div>
          )}

          <button
            onClick={stopTimer}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
          >
            Отменить
          </button>
        </div>
      )}

      {/* Completed */}
      {completed && (
        <div className="card p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Готово!</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {preset?.name} — можно продолжать работу
          </p>
          {preset?.tip && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{preset.tip}</p>
          )}
          <button
            onClick={() => { setCompleted(false); setSelectedId(null); }}
            className="btn-primary px-6 py-2"
          >
            Новый таймер
          </button>
        </div>
      )}
    </div>
  );
}
