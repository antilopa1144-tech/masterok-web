"use client";

import { useState, useMemo } from "react";

interface MaterialType {
  id: string;
  name: string;
  icon: string;
  unit: string;
  consumptionPerM2: number;
  description: string;
  layers: number;
}

const MATERIALS: MaterialType[] = [
  { id: "paint-acrylic", name: "Краска акриловая", icon: "🎨", unit: "л", consumptionPerM2: 0.15, description: "0.12-0.18 л/м² на слой", layers: 2 },
  { id: "paint-latex", name: "Краска латексная", icon: "🎨", unit: "л", consumptionPerM2: 0.12, description: "0.10-0.14 л/м² на слой", layers: 2 },
  { id: "primer-deep", name: "Грунтовка глубокого проникновения", icon: "💧", unit: "л", consumptionPerM2: 0.15, description: "0.10-0.20 л/м²", layers: 1 },
  { id: "primer-contact", name: "Бетоноконтакт", icon: "💧", unit: "кг", consumptionPerM2: 0.30, description: "0.25-0.35 кг/м²", layers: 1 },
  { id: "putty-start", name: "Шпаклёвка стартовая", icon: "🪣", unit: "кг", consumptionPerM2: 1.5, description: "1.0-2.0 кг/м² слой 1мм", layers: 1 },
  { id: "putty-finish", name: "Шпаклёвка финишная", icon: "🪣", unit: "кг", consumptionPerM2: 0.8, description: "0.5-1.0 кг/м² слой 0.5мм", layers: 1 },
  { id: "plaster-gypsum", name: "Штукатурка гипсовая", icon: "🧱", unit: "кг", consumptionPerM2: 8.5, description: "8-9 кг/м² слой 10мм", layers: 1 },
  { id: "plaster-cement", name: "Штукатурка цементная", icon: "🧱", unit: "кг", consumptionPerM2: 16, description: "14-18 кг/м² слой 10мм", layers: 1 },
  { id: "tile-adhesive", name: "Плиточный клей", icon: "⬜", unit: "кг", consumptionPerM2: 4, description: "3-5 кг/м² зубчатый 8мм", layers: 1 },
  { id: "grout", name: "Затирка для плитки", icon: "🔲", unit: "кг", consumptionPerM2: 0.4, description: "0.3-0.5 кг/м²", layers: 1 },
  { id: "wallpaper-glue", name: "Клей обойный (разведённый)", icon: "📜", unit: "л", consumptionPerM2: 0.20, description: "0.15-0.25 л/м²", layers: 1 },
  { id: "self-leveling", name: "Наливной пол", icon: "🏗️", unit: "кг", consumptionPerM2: 16, description: "1.5-1.8 кг/м² на 1мм толщины (10мм слой)", layers: 1 },
  { id: "waterproof", name: "Гидроизоляция обмазочная", icon: "🛡️", unit: "кг", consumptionPerM2: 1.5, description: "1.0-2.0 кг/м² за 2 слоя", layers: 2 },
];

function formatArea(m2: number): string {
  if (m2 < 1) return `${(m2 * 10000).toFixed(0)} см²`;
  return `${m2.toFixed(1)} м²`;
}

export default function ReverseCalculator() {
  const [materialId, setMaterialId] = useState("paint-acrylic");
  const [amount, setAmount] = useState(5);
  const [layers, setLayers] = useState<number | null>(null);

  const material = MATERIALS.find((m) => m.id === materialId)!;
  const effectiveLayers = layers ?? material.layers;

  const result = useMemo(() => {
    const totalConsumption = material.consumptionPerM2 * effectiveLayers;
    const area = totalConsumption > 0 ? amount / totalConsumption : 0;
    // Convert to room equivalent
    const roomSide = Math.sqrt(area);
    return { area, roomSide, consumptionPerM2: totalConsumption };
  }, [material, amount, effectiveLayers]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="card p-6 space-y-5">
        {/* Material selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Материал
          </label>
          <select
            value={materialId}
            onChange={(e) => { setMaterialId(e.target.value); setLayers(null); }}
            className="input-field w-full"
          >
            {MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">{material.description}</p>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Сколько осталось ({material.unit})
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0.01, Number(e.target.value) || 0.01))}
            className="input-field text-lg w-32"
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mt-2">
            {[1, 2, 5, 10, 20, 25].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  amount === v
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {v} {material.unit}
              </button>
            ))}
          </div>
        </div>

        {/* Layers */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Количество слоёв
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((l) => (
              <button
                key={l}
                onClick={() => setLayers(l)}
                className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                  effectiveLayers === l
                    ? "border-accent-400 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="card overflow-hidden">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 border-b border-blue-200 dark:border-blue-800/40">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Хватит на
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {formatArea(result.area)}
          </p>
          {result.area >= 1 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Комната ~{result.roomSide.toFixed(1)} × {result.roomSide.toFixed(1)} м
            </p>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Расход на 1 м²</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {result.consumptionPerM2.toFixed(2)} {material.unit}/м²
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">В наличии</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {amount} {material.unit}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Слоёв</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {effectiveLayers}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        * Расход по средним нормам. Фактический расход зависит от основания, способа нанесения и толщины слоя.
      </p>
    </div>
  );
}
