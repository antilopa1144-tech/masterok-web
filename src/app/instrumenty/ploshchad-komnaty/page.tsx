"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  calculateRoomArea,
  parseRoomDimension,
  type RoomShape,
} from "@/lib/tools/room-area";

interface ShapeOption {
  id: RoomShape;
  label: string;
  icon: string;
  desc: string;
}

const SHAPES: ShapeOption[] = [
  { id: "rect", label: "Прямоугольник", icon: "▭", desc: "Обычная комната" },
  { id: "lshape", label: "Г-образная", icon: "⌐", desc: "С угловым вырезом" },
  { id: "tshape", label: "Т-образная", icon: "⊤", desc: "Две зоны" },
  { id: "trapezoid", label: "Трапеция", icon: "⏢", desc: "Разные основания" },
  { id: "triangle", label: "Треугольник", icon: "△", desc: "Основание и высота" },
  { id: "circle", label: "Круг / сектор", icon: "○", desc: "По радиусу" },
];

type RoomWorkspaceStage = "parameters" | "layout" | "result";

const ROOM_WORKSPACE_STAGES: Array<{ value: RoomWorkspaceStage; label: string }> = [
  { value: "parameters", label: "Параметры" },
  { value: "layout", label: "План" },
  { value: "result", label: "Результат" },
];

function fmtM(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function isNegative(value: string): boolean {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed < 0;
}

function NumInput({
  label,
  value,
  onChange,
  unit = "м",
  hint,
  allowZero = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
  allowZero?: boolean;
}) {
  const invalid = isNegative(value) || (!allowZero && parseRoomDimension(value) === 0);
  const errorId = `${label.replace(/\W+/g, "-")}-error`;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-300">{label}</span>
      <span className={`flex min-h-11 items-center rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-accent-200 dark:bg-slate-950 ${
        invalid
          ? "border-red-300 dark:border-red-800"
          : "border-stone-200 focus-within:border-accent-400 dark:border-slate-700"
      }`}>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={0}
          step={0.01}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-semibold text-slate-950 outline-none dark:text-white"
          placeholder={allowZero ? "0" : "0,00"}
        />
        <span className="border-l border-stone-100 px-3 text-xs font-semibold text-stone-400 dark:border-slate-800 dark:text-slate-500">{unit}</span>
      </span>
      {invalid && (
        <span id={errorId} className="mt-1 block text-xs text-red-600 dark:text-red-300">
          {allowZero ? "Укажите 0 или больше" : "Введите значение больше 0"}
        </span>
      )}
      {hint && !invalid && <span className="mt-1 block text-xs leading-relaxed text-stone-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}

export default function PloshadKomnatyPage() {
  const [activeStage, setActiveStage] = useState<RoomWorkspaceStage>("layout");
  const [shape, setShape] = useState<RoomShape>("rect");
  const [wallHeight, setWallHeight] = useState("2.7");
  const [a, setA] = useState("5");
  const [b, setB] = useState("4");
  const [c, setC] = useState("2");
  const [d, setD] = useState("2");

  const result = useMemo(
    () => calculateRoomArea({
      shape,
      a: parseRoomDimension(a),
      b: parseRoomDimension(b),
      c: parseRoomDimension(c),
      d: parseRoomDimension(d),
      wallHeight: parseRoomDimension(wallHeight),
    }),
    [a, b, c, d, shape, wallHeight],
  );
  const selectedShape = SHAPES.find((item) => item.id === shape) ?? SHAPES[0];
  const hasInputError = isNegative(wallHeight) || result.error !== undefined;
  const roomMasterHref = useMemo(() => {
    const params = new URLSearchParams({ pack: "room" });
    if (shape === "rect" && !hasInputError) {
      params.set("length", a);
      params.set("width", b);
      params.set("height", wallHeight || "0");
    }
    return `/instrumenty/moy-remont/?${params}`;
  }, [a, b, hasInputError, shape, wallHeight]);

  return (
    <div className="page-container max-w-6xl py-4 sm:py-6 md:py-8">
      <nav className="sr-only items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 sm:not-sr-only sm:mb-5 sm:flex">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">Инструменты</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Площадь комнаты</span>
      </nav>

      <div className="mb-4 max-w-3xl sm:mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Геометрия помещения</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white md:text-3xl">Площадь комнаты</h1>
        <p className="mt-2 hidden text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:block md:text-base">
          Выберите форму и укажите размеры — план, площадь пола, стен и периметр обновятся сразу.
        </p>
      </div>

      <nav className="sticky top-16 z-20 mb-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf9]/95 shadow-[0_10px_32px_rgba(62,45,31,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:hidden" aria-label="Этапы расчёта площади комнаты">
        {ROOM_WORKSPACE_STAGES.map((stage, index) => {
          const isActive = stage.value === activeStage;
          return (
            <button key={stage.value} type="button" aria-current={isActive ? "step" : undefined} onClick={() => setActiveStage(stage.value)} className={`relative flex min-h-14 items-center justify-center gap-2 px-2 py-2 text-xs font-semibold transition-colors ${isActive ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "text-stone-500 hover:bg-stone-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              <span className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${isActive ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-300"}`}>{index + 1}</span>
              {stage.label}
              {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600" />}
            </button>
          );
        })}
      </nav>

      <section className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)_280px]" aria-label="Рабочая область расчёта">
        <div className={`order-2 space-y-4 lg:order-1 lg:block ${activeStage === "parameters" ? "block" : "hidden"}`}>
          <div className="card border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Шаг 1</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Форма комнаты</h2>
              </div>
              <span className="text-xs text-stone-400">6 вариантов</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Форма помещения">
              {SHAPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={shape === item.id}
                  onClick={() => setShape(item.id)}
                  className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${
                    shape === item.id
                      ? "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold"><span className="text-lg leading-none" aria-hidden>{item.icon}</span>{item.label}</span>
                  <span className="mt-0.5 hidden text-[10px] text-stone-400 sm:block lg:hidden xl:block">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Шаг 2</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Размеры в метрах</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
              {shape === "rect" && <><NumInput label="Длина A" value={a} onChange={setA} /><NumInput label="Ширина B" value={b} onChange={setB} /></>}
              {shape === "lshape" && <><NumInput label="Длина A" value={a} onChange={setA} /><NumInput label="Ширина B" value={b} onChange={setB} /><NumInput label="Вырез C" value={c} onChange={setC} /><NumInput label="Вырез D" value={d} onChange={setD} /></>}
              {shape === "tshape" && <><NumInput label="Перекладина A" value={a} onChange={setA} /><NumInput label="Глубина B" value={b} onChange={setB} /><NumInput label="Стойка C" value={c} onChange={setC} /><NumInput label="Длина D" value={d} onChange={setD} /></>}
              {shape === "trapezoid" && <><NumInput label="Основание A" value={a} onChange={setA} /><NumInput label="Основание B" value={b} onChange={setB} /><NumInput label="Высота C" value={c} onChange={setC} /></>}
              {shape === "triangle" && <><NumInput label="Основание A" value={a} onChange={setA} /><NumInput label="Высота B" value={b} onChange={setB} /></>}
              {shape === "circle" && <><NumInput label="Радиус" value={a} onChange={setA} /><NumInput label="Угол сектора" value={b} onChange={setB} unit="°" allowZero hint="0 или 360 — полный круг" /></>}
              <div className="col-span-2 lg:col-span-1 xl:col-span-2">
                <NumInput label="Высота стен" value={wallHeight} onChange={setWallHeight} allowZero hint="0 — если нужна только площадь пола" />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
              Пересчитывается автоматически
            </p>
          </div>
          <button type="button" onClick={() => setActiveStage("result")} className="btn-primary min-h-12 w-full justify-center text-sm lg:hidden">Посмотреть результат →</button>
        </div>

        <div className={`order-1 overflow-hidden rounded-3xl border border-stone-200 bg-[#f4efe5] shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:order-2 lg:block ${activeStage === "layout" ? "block" : "hidden"}`}>
          <div className="flex items-center justify-between border-b border-white/70 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">План помещения</p>
              <p className="mt-0.5 text-sm font-bold text-stone-900 dark:text-white">{selectedShape.label}</p>
            </div>
            <span className="rounded-full border border-white bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-stone-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Вид сверху</span>
          </div>
          <div className="relative flex min-h-[245px] items-center justify-center overflow-hidden p-5 sm:min-h-[320px]">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(120,113,108,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,113,108,.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative w-full max-w-lg"><ShapeSVG shape={shape} /></div>
          </div>
          <div className="grid grid-cols-3 border-t border-white/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/50" aria-live="polite">
            <PlanMetric label="Пол" value={hasInputError ? "—" : `${fmtM(result.floorArea)} м²`} />
            <PlanMetric label="Периметр" value={hasInputError ? "—" : `${fmtM(result.perimeter)} м`} />
            <PlanMetric label="Стены" value={hasInputError || !result.wallArea ? "—" : `${fmtM(result.wallArea)} м²`} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/50 lg:hidden">
            <button type="button" onClick={() => setActiveStage("parameters")} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Изменить размеры</button>
            <button type="button" onClick={() => setActiveStage("result")} className="min-h-11 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800">Подробный результат</button>
          </div>
        </div>

        <div className={`order-3 card overflow-hidden border-stone-200 bg-[#fffdf9] p-0 dark:border-slate-700 dark:bg-slate-900 lg:block ${activeStage === "result" ? "block" : "hidden"}`}>
          <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 to-amber-50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-amber-950/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Паспорт помещения</p>
            <div className="mt-2 flex items-start justify-between gap-3 lg:block">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">{selectedShape.label}</h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{a || "—"} × {b || "—"} м · стены {wallHeight || "0"} м</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold lg:mt-3 lg:inline-flex ${hasInputError ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
                {hasInputError ? "Нужно исправить" : "Расчёт готов"}
              </span>
            </div>
          </div>

          {hasInputError ? (
            <div role="alert" className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {isNegative(wallHeight) ? "Высота стен не может быть отрицательной." : result.error}
            </div>
          ) : (
            <div className="p-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Площадь пола</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{fmtM(result.floorArea)} <span className="text-lg font-semibold text-stone-500 dark:text-slate-400">м²</span></p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <ResultItem label="Периметр" value={fmtM(result.perimeter)} unit="м" />
                <ResultItem label="Площадь стен" value={result.wallArea ? fmtM(result.wallArea) : "—"} unit="м²" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-slate-400">Площадь стен дана без вычета окон и дверей. Проёмы и запас учитываются в профильном калькуляторе.</p>
              {result.notes && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">{result.notes}</p>}
            </div>
          )}

          <div className="border-t border-stone-100 p-4 dark:border-slate-800">
            <p className="text-xs font-semibold text-stone-700 dark:text-slate-300">Следующий шаг</p>
            {hasInputError ? (
              <p className="mt-2 rounded-xl bg-stone-100 px-3 py-3 text-xs leading-relaxed text-stone-500 dark:bg-slate-950 dark:text-slate-400">Исправьте размеры — после этого откроются калькуляторы закупки.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                <Link href={roomMasterHref} className="btn-primary min-h-11 justify-center text-sm no-underline">Собрать материалы →</Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/kalkulyatory/poly/laminat/" className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-3 text-center text-xs font-semibold text-stone-700 no-underline hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Для пола</Link>
                  <Link href="/kalkulyatory/otdelka/oboi/" className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-3 text-center text-xs font-semibold text-stone-700 no-underline hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Для стен</Link>
                </div>
              </div>
            )}
            <button type="button" onClick={() => setActiveStage("parameters")} className="mt-3 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 lg:hidden">← Изменить размеры</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-slate-800">
      <p className="text-[10px] text-stone-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function ResultItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-[10px] text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{value} <span className="text-xs font-medium text-stone-400">{unit}</span></p>
    </div>
  );
}

function ShapeSVG({ shape }: { shape: RoomShape }) {
  const stroke = "#57534e";
  const fill = "url(#floor)";
  const dimColor = "#c2410c";
  const textStyle = { fontSize: 10, fontWeight: 700, fill: dimColor, fontFamily: "system-ui" };
  const shared = { fill, stroke, strokeWidth: 2.5, filter: "url(#shadow)" };
  const defs = (
    <defs>
      <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffdf8" /><stop offset="1" stopColor="#ded6c9" /></linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#78716c" floodOpacity=".22" /></filter>
    </defs>
  );

  switch (shape) {
    case "rect":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План прямоугольной комнаты">{defs}<rect x="32" y="25" width="156" height="100" rx="2" {...shared} /><path d="M32 50H188M32 75H188M32 100H188M58 25V125M84 25V125M110 25V125M136 25V125M162 25V125" stroke="#a8a29e" strokeOpacity=".22" strokeWidth=".7" /><text x="110" y="18" textAnchor="middle" style={textStyle}>A · длина</text><text x="21" y="78" textAnchor="middle" transform="rotate(-90 21 78)" style={textStyle}>B · ширина</text></svg>;
    case "lshape":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План Г-образной комнаты">{defs}<polygon points="24,20 188,20 188,78 112,78 112,132 24,132" {...shared} /><text x="105" y="14" textAnchor="middle" style={textStyle}>A</text><text x="15" y="78" textAnchor="middle" transform="rotate(-90 15 78)" style={textStyle}>B</text><text x="151" y="98" textAnchor="middle" style={textStyle}>вырез C × D</text></svg>;
    case "tshape":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План Т-образной комнаты">{defs}<polygon points="16,22 204,22 204,70 144,70 144,132 76,132 76,70 16,70" {...shared} /><text x="110" y="15" textAnchor="middle" style={textStyle}>A</text><text x="210" y="49" style={textStyle}>B</text><text x="110" y="144" textAnchor="middle" style={textStyle}>C</text><text x="151" y="103" style={textStyle}>D</text></svg>;
    case "trapezoid":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План комнаты в форме трапеции">{defs}<polygon points="24,127 196,127 164,25 56,25" {...shared} /><text x="110" y="142" textAnchor="middle" style={textStyle}>A</text><text x="110" y="18" textAnchor="middle" style={textStyle}>B</text><line x1="164" y1="25" x2="164" y2="127" stroke={dimColor} strokeDasharray="4 4" /><text x="171" y="79" style={textStyle}>C</text></svg>;
    case "triangle":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План треугольной комнаты">{defs}<polygon points="110,18 198,130 22,130" {...shared} /><line x1="110" y1="18" x2="110" y2="130" stroke={dimColor} strokeDasharray="4 4" /><text x="110" y="144" textAnchor="middle" style={textStyle}>A · основание</text><text x="118" y="78" style={textStyle}>B</text></svg>;
    case "circle":
      return <svg className="h-auto w-full" viewBox="0 0 220 150" role="img" aria-label="План круглой комнаты">{defs}<circle cx="110" cy="75" r="58" {...shared} /><line x1="110" y1="75" x2="168" y2="75" stroke={dimColor} strokeWidth="2" /><text x="139" y="68" textAnchor="middle" style={textStyle}>радиус</text></svg>;
  }
}
