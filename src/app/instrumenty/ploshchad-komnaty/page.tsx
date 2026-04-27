"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Площадь комнаты",
  pageTitle: "Калькулятор площади комнаты",
  pageDescription: "Рассчитайте площадь пола, периметр и площадь стен для помещений любой формы.",
  defaultLengthUnit: "м",
  onlyFloorHint: "Оставьте 0, если нужна только площадь пола",
  shapeTitle: "Форма помещения",
  dimensionsTitle: "Размеры",
  calculate: "Рассчитать",
  resultTitle: "Результат",
  floorAreaLabel: "Площадь пола",
  perimeterLabel: "Периметр",
  wallAreaLabel: "Площадь стен",
  lshapeNotes: "Периметр — приближённый. Уточните по чертежу.",
  tshapeNotes: "Площадь трёх секций. Периметр — приближённый.",
  triangleNotes: "Периметр — для равнобедренного треугольника.",
} as const;

type ShapeType = "rect" | "lshape" | "tshape" | "trapezoid" | "triangle" | "circle";

interface ShapeOption {
  id: ShapeType;
  label: string;
  icon: string;
  desc: string;
}

const SHAPES: ShapeOption[] = [
  { id: "rect", label: "Прямоугольник", icon: "▭", desc: "Стандартная прямоугольная комната" },
  { id: "lshape", label: "Г-образная", icon: "⌐", desc: "Два прямоугольника (Г-форма)" },
  { id: "tshape", label: "Т-образная", icon: "⊤", desc: "Три секции (Т-форма)" },
  { id: "trapezoid", label: "Трапеция", icon: "⏢", desc: "Одна пара параллельных сторон" },
  { id: "triangle", label: "Треугольник", icon: "△", desc: "Любой треугольник по основанию и высоте" },
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

interface Result {
  floorArea: number;
  perimeter: number;
  wallArea?: number;
  notes?: string;
}

export default function PloshadKomnatyPage() {
  const [shape, setShape] = useState<ShapeType>("rect");
  const [wallHeight, setWallHeight] = useState("2.7");
  const [result, setResult] = useState<Result | null>(null);

  // Поля по форме
  const [a, setA] = useState("5");
  const [b, setB] = useState("4");
  const [c, setC] = useState("2");
  const [d, setD] = useState("2");
  const [e, setE] = useState("2");
  const [f, setF] = useState("1.5");

  const n = useCallback((v: string) => parseFloat(v.replace(",", ".")) || 0, []);

  const calculate = useCallback(() => {
    const h = n(wallHeight);
    let floor = 0;
    let perim = 0;
    let notes: string | undefined;

    switch (shape) {
      case "rect": {
        const A = n(a), B = n(b);
        floor = A * B;
        perim = 2 * (A + B);
        break;
      }
      case "lshape": {
        // Г-образная: большой прямоугольник A×B минус вырез C×D
        const A = n(a), B = n(b), C = n(c), D = n(d);
        floor = A * B - C * D;
        perim = 2 * (A + B); // приближение
        notes = UI_TEXT.lshapeNotes;
        break;
      }
      case "tshape": {
        // Т-образная: центральная часть A×B + два боковых крыла C×D и E×F
        const A = n(a), B = n(b), C = n(c), D = n(d), E = n(e), F = n(f);
        floor = A * B + C * D + E * F;
        perim = 2 * (A + B + C + D); // приближение
        notes = UI_TEXT.tshapeNotes;
        break;
      }
      case "trapezoid": {
        // Трапеция: (a+b)/2 * h, где a,b — параллельные стороны, h — высота
        const A = n(a), B = n(b), H = n(c);
        floor = ((A + B) / 2) * H;
        perim = A + B + 2 * Math.sqrt(((A - B) / 2) ** 2 + H ** 2);
        break;
      }
      case "triangle": {
        // Треугольник: 0.5 * основание * высота
        const base = n(a), height = n(b);
        floor = 0.5 * base * height;
        perim = base + 2 * Math.sqrt((base / 2) ** 2 + height ** 2); // равнобедренный
        notes = UI_TEXT.triangleNotes;
        break;
      }
      case "circle": {
        // Круг: π*r², или сектор: π*r²*angle/360
        const r = n(a), angle = n(b);
        const isFullCircle = angle >= 360 || n(b) === 0;
        const theta = isFullCircle ? 360 : angle;
        floor = Math.PI * r * r * (theta / 360);
        perim = isFullCircle
          ? 2 * Math.PI * r
          : 2 * r + (2 * Math.PI * r * theta / 360);
        break;
      }
    }

    const wallArea = h > 0 ? perim * h : undefined;
    setResult({ floorArea: floor, perimeter: perim, wallArea, notes });
  }, [shape, a, b, c, d, e, f, wallHeight, n]);

  const shapeChange = (s: ShapeType) => {
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
              <NumInput label="Длина центральной части (A)" value={a} onChange={setA} />
              <NumInput label="Ширина центральной части (B)" value={b} onChange={setB} />
              <NumInput label="Длина левого крыла (C)" value={c} onChange={setC} />
              <NumInput label="Ширина левого крыла (D)" value={d} onChange={setD} />
              <NumInput label="Длина правого крыла (E)" value={e} onChange={setE} />
              <NumInput label="Ширина правого крыла (F)" value={f} onChange={setF} />
            </>
          )}
          {shape === "trapezoid" && (
            <>
              <NumInput label="Основание a (длинная сторона)" value={a} onChange={setA} />
              <NumInput label="Основание b (короткая сторона)" value={b} onChange={setB} />
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
function ShapeSVG({ shape }: { shape: ShapeType }) {
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
          <text x={100} y={85} textAnchor="middle" style={textStyle}>B</text>
        </svg>
      );
    case "trapezoid":
      return (
        <svg width={W} height={H} viewBox="0 0 200 120">
          <polygon points="20,100 180,100 150,20 50,20" fill={fill} stroke={stroke} strokeWidth={2} />
          <text x={100} y={115} textAnchor="middle" style={textStyle}>a</text>
          <text x={100} y={16} textAnchor="middle" style={textStyle}>b</text>
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
