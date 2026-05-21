"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import { packIdToScenario } from "@/lib/renovation-hub/context";
import { roomFloorLayoutHref } from "@/lib/room-master/tile-layout-link";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import { formatNumber } from "@/components/calculator/useCalculator";
import {
  DEFAULT_ROOM_DIMENSIONS,
  floorAreaM2,
  wallAreaM2,
  type RoomDimensions,
} from "@/lib/room-master/geometry";
import {
  getPackList,
  extraLinkHref,
  ROOM_PACKS,
  type RoomPackId,
} from "@/lib/room-master/packs";
import { runRoomPack, type PackRunResult } from "@/lib/room-master/run-pack";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";

const TILE_FLOOR_OPTIONS = [
  { value: 0, label: "300×300" },
  { value: 1, label: "450×450" },
  { value: 2, label: "600×600" },
];

const TILE_WALL_OPTIONS = [
  { value: 0, label: "200×300" },
  { value: 1, label: "250×400" },
  { value: 2, label: "300×600" },
];

function parsePackId(value: string | null): RoomPackId | null {
  if (value === "kitchen" || value === "room" || value === "bathroom") return value;
  return null;
}

export default function RoomMasterWizard() {
  const searchParams = useSearchParams();
  const [packId, setPackId] = useState<RoomPackId>("bathroom");

  useEffect(() => {
    const fromUrl = parsePackId(searchParams.get("pack"));
    if (fromUrl) setPackId(fromUrl);
  }, [searchParams]);
  const [dims, setDims] = useState<RoomDimensions>({ ...DEFAULT_ROOM_DIMENSIONS });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<PackRunResult | null>(null);

  const pack = ROOM_PACKS[packId];
  const floorM2 = useMemo(() => floorAreaM2(dims), [dims]);
  const wallM2 = useMemo(() => wallAreaM2(dims), [dims]);

  const setDim = (key: keyof RoomDimensions, value: number) => {
    setDims((prev) => ({ ...prev, [key]: value }));
    setRun(null);
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runRoomPack(packId, dims);
      setRun(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить расчёт");
      setRun(null);
    } finally {
      setLoading(false);
    }
  };

  const primaryMeta = getCalculatorMetaBySlug(
    pack.primarySteps[0]?.slug ?? "vannaya-komnata",
  );

  const scenarioId = packIdToScenario(packId);
  const layoutHref = roomFloorLayoutHref(dims);

  return (
    <div className="max-w-3xl space-y-6">
      <RenovationHubStrip scenarioId={scenarioId} packId={packId} showTileLayout compact />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Тип помещения">
        {getPackList().map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={packId === p.id}
            onClick={() => {
              setPackId(p.id);
              setRun(null);
              setError(null);
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              packId === p.id
                ? "bg-accent-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-accent-300"
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              {p.icon}
            </span>
            {p.title}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">{pack.subtitle}</p>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Размеры помещения
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              { key: "length" as const, label: "Длина", min: 1, max: 12, step: 0.1 },
              { key: "width" as const, label: "Ширина", min: 1, max: 12, step: 0.1 },
              { key: "height" as const, label: "Высота", min: 2, max: 3.5, step: 0.1 },
              { key: "doorWidth" as const, label: "Дверь", min: 0.6, max: 1.2, step: 0.1 },
            ] as const
          ).map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">{f.label}, м</span>
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={dims[f.key]}
                onChange={(e) => setDim(f.key, Number(e.target.value))}
                className="input-field mt-1 w-full"
              />
            </label>
          ))}
        </div>

        {packId === "bathroom" && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block">
              <span className="text-xs text-slate-500">Плитка пола</span>
              <select
                className="input-field mt-1 w-full"
                value={dims.floorTileSize}
                onChange={(e) => setDim("floorTileSize", Number(e.target.value))}
              >
                {TILE_FLOOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Плитка стен</span>
              <select
                className="input-field mt-1 w-full"
                value={dims.wallTileSize}
                onChange={(e) => setDim("wallTileSize", Number(e.target.value))}
              >
                {TILE_WALL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 sm:col-span-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={dims.hasWaterproofing === 1}
                onChange={(e) => setDim("hasWaterproofing", e.target.checked ? 1 : 0)}
                className="rounded border-slate-300"
              />
              Гидроизоляция пола и примыканий
            </label>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Пол {floorM2.toFixed(1)} м² · стены ≈ {wallM2.toFixed(1)} м² (минус дверной проём)
        </p>

        <button
          type="button"
          onClick={() => void handleCalculate()}
          disabled={loading}
          className="btn-primary w-full text-base"
        >
          {loading ? "Считаем пакет…" : "Посчитать закупку"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {run && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Сводка: {run.packTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {run.steps.map((s) => s.title).join(" + ")} — итог к покупке с запасом по каждому калькулятору
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end shrink-0">
                <SaveToProjectButton
                  calcId={`room-pack-${run.packId}`}
                  calcTitle={`Мой ремонт: ${run.packTitle}`}
                  slug={primaryMeta?.slug ?? run.steps[0].slug}
                  categorySlug={primaryMeta?.categorySlug ?? "otdelka"}
                  calendarScenarioId={scenarioId}
                  materials={run.merged.materials.map((m) => ({
                    name: m.name,
                    quantity: m.purchaseQty ?? m.withReserve ?? m.quantity,
                    unit: m.unit,
                    category: m.category,
                  }))}
                />
                <Link href={pack.fullCalculatorHref(dims)} className="text-xs font-medium text-accent-600 hover:underline no-underline">
                  Открыть детальный калькулятор →
                </Link>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {run.merged.materials.slice(0, 24).map((m, i) => (
                <li key={`${m.name}-${i}`} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span className="text-slate-800 dark:text-slate-200 min-w-0">{m.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0 tabular-nums">
                    {formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
            {run.merged.materials.length > 24 && (
              <p className="text-xs text-slate-400 mt-2">
                Ещё {run.merged.materials.length - 24} позиций — в детальном калькуляторе или в проекте
              </p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Уточнить отдельно
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(packId === "bathroom" || packId === "kitchen") && (
                <Link
                  href={layoutHref}
                  className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 p-3 hover:border-orange-300 transition-colors no-underline group"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-300">
                    🔲 Раскладка пола
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Схема укладки по размерам комнаты ({floorM2} м²)
                  </p>
                </Link>
              )}
              {pack.extraLinks.map((link) => (
                <Link
                  key={link.label}
                  href={extraLinkHref(link, dims)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-accent-300 dark:hover:border-accent-600 transition-colors no-underline group"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent-700 dark:group-hover:text-accent-400">
                    {link.label}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.reason}</p>
                </Link>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Цены материалов задайте в детальных калькуляторах или в смете проекта после сохранения.
          </p>
        </div>
      )}
    </div>
  );
}
