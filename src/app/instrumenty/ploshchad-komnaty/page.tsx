"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calculateRoomArea,
  parseRoomDimension,
  type RoomAreaResult,
  type RoomShape,
} from "@/lib/tools/room-area";

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Площадь комнаты",
  pageTitle: "Калькулятор площади комнаты",
  pageDescription: "Рассчитайте площадь пола, периметр и площадь стен для помещений типовых форм.",
  defaultLengthUnit: "м",
  onlyFloorHint: "Без вычета окон и дверей. Оставьте 0, если нужна только площадь пола",
  shapeTitle: "Форма помещения",
  dimensionsTitle: "Размеры",
  calculate: "Рассчитать",
  resultTitle: "Результат",
  floorAreaLabel: "Площадь пола",
  perimeterLabel: "Периметр",
  wallAreaLabel: "Площадь стен",
} as const;

interface ShapeOption {
  id: RoomShape;
  label: string;
  icon: string;
  desc: string;
}

const SHAPES: ShapeOption[] = [
  { id: "rect", label: "Прямоугольник", icon: "▭", desc: "Стандартная прямоугольная комната" },
  { id: "lshape", label: "Г-образная", icon: "⌐", desc: "Прямоугольник с угловым вырезом" },
  { id: "tshape", label: "Т-образная", icon: "⊤", desc: "Перекладина и центральная стойка" },
  { id: "trapezoid", label: "Трапеция", icon: "⏢", desc: "Равнобедренная трапеция" },
  { id: "triangle", label: "Треугольник", icon: "△", desc: "Равнобедренный треугольник" },
  { id: "circle", label: "Круг / сектор", icon: "○", desc: "Круглая комната или сектор" },
];

function fmtM(n: number): string {
  if (isNaN(n) || n <= 0) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function NumInput({
  label,
  value,
  onChange,
  unit = UI_TEXT.defaultLengthUnit,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={0}
          step={0.01}
          className="input-field flex-1"
          placeholder="0"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400 w-6 shrink-0">{unit}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function PloshadKomnatyPage() {
  const [shape, setShape] = useState<RoomShape>("rect");
  const [wallHeight, setWallHeight] = useState("2.7");
  const [result, setResult] = useState<RoomAreaResult | null>(null);

  // Поля по форме
  const [a, setA] = useState("5");
  const [b, setB] = useState("4");
  const [c, setC] = useState("2");
  const [d, setD] = useState("2");

  const calculate = () => {
    setResult(calculateRoomArea({
      shape,
      a: parseRoomDimension(a),
      b: parseRoomDimension(b),
      c: parseRoomDimension(c),
      d: parseRoomDimension(d),
      wallHeight: parseRoomDimension(wallHeight),
    }));
  };

  const shapeChange = (s: RoomShape) => {
    setShape(s);
    setResult(null);
  };

  return (
    <div className="page-container py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        {UI_TEXT.pageTitle}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        {UI_TEXT.pageDescription}
      </p>

      {/* Выбор формы */}
      <div className="card p-5 mb-5">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{UI_TEXT.shapeTitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => shapeChange(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                shape === s.id
                  ? "border-accent-400 bg-accent-50 text-accent-700"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <span className="text-lg leading-none">{s.icon}</span>
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-slate-400 dark:text-slate-400 leading-tight hidden sm:block">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SVG Схема */}
      <div className="card p-5 mb-5 flex justify-center">
        <ShapeSVG shape={shape} />
      </div>

      {/* Параметры */}
      <div className="card p-5 mb-5">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">{UI_TEXT.dimensionsTitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shape === "rect" && (
            <>
              <NumInput label="Длина комнаты (A)" value={a} onChange={setA} />
              <NumInput label="Ширина комнаты (B)" value={b} onChange={setB} />
            </>
          )}
          {shape === "lshape" && (
            <>
              <NumInput label="Длина большого прямоугольника (A)" value={a} onChange={setA} />
              <NumInput label="Ширина большого прямоугольника (B)" value={b} onChange={setB} />
              <NumInput label="Ширина выреза (C)" value={c} onChange={setC} />
              <NumInput label="Длина выреза (D)" value={d} onChange={setD} />
            </>
          )}
          {shape === "tshape" && (
            <>
              <NumInput label="Длина перекладины (A)" value={a} onChange={setA} />
              <NumInput label="Глубина перекладины (B)" value={b} onChange={setB} />
              <NumInput label="Ширина стойки (C)" value={c} onChange={setC} />
              <NumInput label="Длина стойки (D)" value={d} onChange={setD} />
            </>
          )}
          {shape === "trapezoid" && (
            <>
              <NumInput label="Основание A" value={a} onChange={setA} />
              <NumInput label="Основание B" value={b} onChange={setB} />
              <NumInput label="Высота трапеции" value={c} onChange={setC} />
            </>
          )}
          {shape === "triangle" && (
            <>
              <NumInput label="Основание" value={a} onChange={setA} />
              <NumInput label="Высота" value={b} onChange={setB} />
            </>
          )}
          {shape === "circle" && (
            <>
              <NumInput label="Радиус" value={a} onChange={setA} />
              <NumInput label="Угол сектора (0 или 360 = полный круг)" value={b} onChange={setB} unit="°" />
            </>
          )}

          {/* Высота стен */}
          <NumInput
            label="Высота стен (для расчёта площади стен)"
            value={wallHeight}
            onChange={setWallHeight}
            hint={UI_TEXT.onlyFloorHint}
          />
        </div>

        <button onClick={calculate} className="btn-primary w-full mt-5">{UI_TEXT.calculate}</button>
      </div>

      {/* Результат */}
      {result && (
        result.error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {result.error}
          </div>
        ) : (
          <div className="result-card">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">{UI_TEXT.resultTitle}</h3>
            <div className="grid grid-cols-2 gap-3">
              <ResultItem label={UI_TEXT.floorAreaLabel} value={fmtM(result.floorArea)} unit="м²" />
              <ResultItem label={UI_TEXT.perimeterLabel} value={fmtM(result.perimeter)} unit="м" />
              {result.wallArea !== undefined && result.wallArea > 0 && (
                <ResultItem label={UI_TEXT.wallAreaLabel} value={fmtM(result.wallArea)} unit="м²" />
              )}
            </div>
            {result.notes && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{result.notes}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

function ResultItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-accent-50 dark:bg-slate-800 rounded-xl p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {value} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

// SVG-схема выбранной формы
function ShapeSVG({ shape }: { shape: RoomShape }) {
  const W = 200, H = 120;
  const stroke = "#475569";
  const fill = "#f1f5f9";
  const dimColor = "#f97316";
  const textStyle = { fontSize: 11, fill: dimColor, fontFamily: "system-ui" };

  switch (shape) {
    case "rect":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <rect x={30} y={15} width={140} height={90} fill={fill} stroke={stroke} strokeWidth={2} />
          <text x={100} y={8} textAnchor="middle" style={textStyle}>A</text>
          <text x={22} y={65} textAnchor="middle" style={textStyle}>B</text>
        </svg>
      );
    case "lshape":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <polygon points="20,10 150,10 150,60 90,60 90,110 20,110" fill={fill} stroke={stroke} strokeWidth={2} />
          <text x={85} y={8} textAnchor="middle" style={textStyle}>A</text>
          <text x={12} y={65} textAnchor="middle" style={textStyle}>B</text>
          <text x={120} y={75} textAnchor="middle" style={{ ...textStyle, fill: "#94a3b8" }}>C×D</text>
        </svg>
      );
    case "tshape":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <polygon points="10,10 190,10 190,50 130,50 130,110 70,110 70,50 10,50" fill={fill} stroke={stroke} strokeWidth={2} />
          <text x={100} y={8} textAnchor="middle" style={textStyle}>A</text>
          <text x={194} y={33} textAnchor="middle" style={textStyle}>B</text>
          <text x={100} y={118} textAnchor="middle" style={textStyle}>C</text>
          <text x={136} y={82} textAnchor="middle" style={textStyle}>D</text>
        </svg>
      );
    case "trapezoid":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <polygon points="20,100 180,100 150,20 50,20" fill={fill} stroke={stroke} strokeWidth={2} />
          <text x={100} y={115} textAnchor="middle" style={textStyle}>A</text>
          <text x={100} y={16} textAnchor="middle" style={textStyle}>B</text>
          <text x={185} y={65} style={textStyle}>h</text>
        </svg>
      );
    case "triangle":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <polygon points="100,10 180,110 20,110" fill={fill} stroke={stroke} strokeWidth={2} />
          <line x1={100} y1={10} x2={100} y2={110} stroke={dimColor} strokeWidth={1} strokeDasharray="4 3" />
          <text x={100} y={118} textAnchor="middle" style={textStyle}>основание</text>
          <text x={108} y={65} style={textStyle}>h</text>
        </svg>
      );
    case "circle":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <circle cx={100} cy={60} r={50} fill={fill} stroke={stroke} strokeWidth={2} />
          <line x1={100} y1={60} x2={150} y2={60} stroke={dimColor} strokeWidth={2} />
          <text x={125} y={55} textAnchor="middle" style={textStyle}>r</text>
        </svg>
      );
  }
}
