"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import { formatNumber } from "@/components/calculator/useCalculator";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calendarHref, packIdToScenario } from "@/lib/renovation-hub/context";
import {
  DEFAULT_ROOM_DIMENSIONS,
  ROOM_MEASURE_LIMITS,
  floorAreaM2,
  parseRoomMeasure,
  validateRoomMeasures,
  wallAreaM2,
  type RoomDimensions,
  type RoomMeasureKey,
} from "@/lib/room-master/geometry";
import {
  extraLinkHref,
  getPackList,
  ROOM_PACKS,
  type RoomPackId,
} from "@/lib/room-master/packs";
import { runRoomPack, type PackRunResult } from "@/lib/room-master/run-pack";
import { roomFloorLayoutHref } from "@/lib/room-master/tile-layout-link";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import type { MaterialResult } from "@/lib/calculators/types";
import {
  buildRenovationCostHrefFromRoom,
  RENOVATION_COST_TOOL_SLUG,
  ROOM_MASTER_TOOL_SLUG,
} from "@/lib/tools/room-master-to-renovation-cost";
import { trackToolModeChange, trackToolRelatedClick } from "@/lib/analytics";

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

const MEASURE_FIELDS: Array<{ key: RoomMeasureKey; label: string; shortLabel: string; step: number }> = [
  { key: "length", label: "Длина комнаты", shortLabel: "Длина", step: 0.1 },
  { key: "width", label: "Ширина комнаты", shortLabel: "Ширина", step: 0.1 },
  { key: "height", label: "Высота стен", shortLabel: "Высота", step: 0.1 },
  { key: "doorWidth", label: "Ширина двери", shortLabel: "Дверь", step: 0.1 },
];

type MeasureDrafts = Record<RoomMeasureKey, string>;
type MobileStage = "parameters" | "result";

function parsePackId(value: string | null): RoomPackId | null {
  if (value === "kitchen" || value === "room" || value === "bathroom") return value;
  return null;
}

function defaultDrafts(): MeasureDrafts {
  return {
    length: String(DEFAULT_ROOM_DIMENSIONS.length),
    width: String(DEFAULT_ROOM_DIMENSIONS.width),
    height: String(DEFAULT_ROOM_DIMENSIONS.height),
    doorWidth: String(DEFAULT_ROOM_DIMENSIONS.doorWidth),
  };
}

function getPrimaryMaterials(run: PackRunResult): MaterialResult[] {
  const perStep = run.steps.length === 1 ? 4 : 2;
  return run.steps
    .flatMap((step) => run.merged.materials.filter((item) => item.name.startsWith(`[${step.title}]`)).slice(0, perStep))
    .slice(0, 4);
}

function materialName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "");
}

function purchaseValue(material: MaterialResult): string {
  return `${formatNumber(material.purchaseQty ?? material.withReserve ?? material.quantity)} ${material.unit}`;
}

export default function RoomMasterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [packId, setPackId] = useState<RoomPackId>("bathroom");
  const [drafts, setDrafts] = useState<MeasureDrafts>(defaultDrafts);
  const [floorTileSize, setFloorTileSize] = useState(DEFAULT_ROOM_DIMENSIONS.floorTileSize);
  const [wallTileSize, setWallTileSize] = useState(DEFAULT_ROOM_DIMENSIONS.wallTileSize);
  const [hasWaterproofing, setHasWaterproofing] = useState(DEFAULT_ROOM_DIMENSIONS.hasWaterproofing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<PackRunResult | null>(null);
  const [mobileStage, setMobileStage] = useState<MobileStage>("parameters");

  useEffect(() => {
    const fromUrl = parsePackId(searchParams.get("pack"));
    if (fromUrl) setPackId(fromUrl);

    setDrafts((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of Object.keys(next) as RoomMeasureKey[]) {
        const value = searchParams.get(key);
        if (value !== null) {
          next[key] = value;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [searchParams]);

  const measures = useMemo(
    () => ({
      length: parseRoomMeasure(drafts.length),
      width: parseRoomMeasure(drafts.width),
      height: parseRoomMeasure(drafts.height),
      doorWidth: parseRoomMeasure(drafts.doorWidth),
    }),
    [drafts],
  );
  const validationErrors = useMemo(() => validateRoomMeasures(measures), [measures]);
  const isValid = Object.keys(validationErrors).length === 0;
  const dims: RoomDimensions = useMemo(
    () => ({ ...measures, floorTileSize, wallTileSize, hasWaterproofing }),
    [floorTileSize, hasWaterproofing, measures, wallTileSize],
  );
  const floorM2 = isValid ? floorAreaM2(dims) : null;
  const wallM2 = isValid ? wallAreaM2(dims) : null;
  const pack = ROOM_PACKS[packId];
  const primaryMeta = getCalculatorMetaBySlug(pack.primarySteps[0]?.slug ?? "vannaya-komnata");
  const scenarioId = packIdToScenario(packId);
  const layoutHref = isValid ? roomFloorLayoutHref(dims) : "/instrumenty/raskladka-plitki/";
  const renovationCostHref = floorM2 === null
    ? null
    : buildRenovationCostHrefFromRoom({ areaM2: floorM2, packId });
  const primaryMaterials = useMemo(() => (run ? getPrimaryMaterials(run) : []), [run]);
  const { markStarted, selectMode } = useToolAnalytics(
    ROOM_MASTER_TOOL_SLUG,
    resultRef,
    Boolean(run),
  );

  const resetResult = () => {
    setRun(null);
    setError(null);
    setMobileStage("parameters");
  };

  const setDraft = (key: RoomMeasureKey, value: string) => {
    markStarted("surface_size");
    setDrafts((current) => ({ ...current, [key]: value }));
    resetResult();
  };

  const choosePack = (nextPack: RoomPackId) => {
    if (nextPack === packId) return;
    selectMode(`pack:${nextPack}`);
    setPackId(nextPack);
    resetResult();
    const params = new URLSearchParams(searchParams.toString());
    params.set("pack", nextPack);
    router.replace(`/instrumenty/${ROOM_MASTER_TOOL_SLUG}/?${params}`, { scroll: false });
  };

  const handleCalculate = async () => {
    markStarted("surface_size");
    if (!isValid) {
      setError("Проверьте размеры помещения перед расчётом.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runRoomPack(packId, dims);
      setRun(result);
      setMobileStage("result");
      window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setRun(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={workspaceRef} className="max-w-6xl scroll-mt-20 space-y-4">
      <div className="grid grid-cols-2 rounded-2xl border border-stone-200 bg-white p-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 lg:hidden" aria-label="Этап расчёта">
        <button type="button" onClick={() => setMobileStage("parameters")} className={`min-h-10 rounded-xl font-semibold ${mobileStage === "parameters" ? "bg-accent-600 text-white shadow-sm" : "text-stone-500 dark:text-slate-400"}`}>1 · Параметры</button>
        <button type="button" onClick={() => run && setMobileStage("result")} disabled={!run} className={`min-h-10 rounded-xl font-semibold ${mobileStage === "result" ? "bg-accent-600 text-white shadow-sm" : "text-stone-500 disabled:opacity-40 dark:text-slate-400"}`}>2 · Закупка</button>
      </div>

      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Тип помещения">
        {getPackList().map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={packId === item.id}
            onClick={() => choosePack(item.id)}
            className={`min-h-14 rounded-2xl border px-2 py-2.5 text-center text-sm font-semibold transition sm:px-4 ${
              packId === item.id
                ? "border-accent-500 bg-accent-600 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-700 hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            <span className="mr-1" aria-hidden>{item.icon}</span>{item.title}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${mobileStage === "result" ? "hidden" : "block"} order-2 card border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 lg:order-1 lg:block sm:p-5`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-accent-700 dark:text-accent-300">Шаг 1</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Размеры помещения</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-slate-400">{pack.subtitle}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {MEASURE_FIELDS.map((field) => {
              const limits = ROOM_MEASURE_LIMITS[field.key];
              const fieldError = validationErrors[field.key];
              const errorId = `${field.key}-error`;
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-300">{field.shortLabel}</span>
                  <span className={`flex min-h-11 items-center rounded-xl border bg-white dark:bg-slate-950 ${fieldError ? "border-red-300 dark:border-red-800" : "border-stone-200 focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-100 dark:border-slate-700"}`}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={limits.min}
                      max={limits.max}
                      step={field.step}
                      value={drafts[field.key]}
                      onChange={(event) => setDraft(field.key, event.target.value)}
                      aria-label={`${field.label}, м`}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? errorId : undefined}
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-bold text-slate-950 outline-none dark:text-white"
                    />
                    <span className="border-l border-stone-100 px-2.5 text-xs font-semibold text-stone-400 dark:border-slate-800">м</span>
                  </span>
                  {fieldError && <span id={errorId} className="mt-1 block text-[11px] leading-tight text-red-600 dark:text-red-300">{fieldError}</span>}
                </label>
              );
            })}
          </div>

          {packId === "bathroom" && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 dark:border-slate-800">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-300">Плитка пола</span>
                <select className="input-field w-full" value={floorTileSize} onChange={(event) => { const value = Number(event.target.value); markStarted("material_size"); trackToolModeChange(ROOM_MASTER_TOOL_SLUG, `floor-tile:${value}`); setFloorTileSize(value); resetResult(); }}>
                  {TILE_FLOOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-300">Плитка стен</span>
                <select className="input-field w-full" value={wallTileSize} onChange={(event) => { const value = Number(event.target.value); markStarted("material_size"); trackToolModeChange(ROOM_MASTER_TOOL_SLUG, `wall-tile:${value}`); setWallTileSize(value); resetResult(); }}>
                  {TILE_WALL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="col-span-2 flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <input type="checkbox" checked={hasWaterproofing === 1} onChange={(event) => { const enabled = event.target.checked; markStarted("preset"); trackToolModeChange(ROOM_MASTER_TOOL_SLUG, `waterproofing:${enabled ? "on" : "off"}`); setHasWaterproofing(enabled ? 1 : 0); resetResult(); }} className="size-4 rounded border-slate-300" />
                Гидроизоляция пола
              </label>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

          <button type="button" onClick={() => void handleCalculate()} disabled={loading || !isValid} className="btn-primary mt-5 min-h-12 w-full justify-center text-base disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Собираем ведомость…" : "Получить закупку →"}
          </button>
          <p className="mt-2 text-center text-[11px] text-stone-400 dark:text-slate-500">Реальные упаковки и запас берутся из профильных калькуляторов</p>
        </aside>

        <main className="min-w-0 order-1 lg:order-2">
          {!run || mobileStage === "parameters" ? (
            <RoomPreview packId={packId} floorM2={floorM2} wallM2={wallM2} drafts={drafts} />
          ) : null}

          {run && (
            <div className={`${mobileStage === "parameters" ? "hidden" : "block"} min-w-0 lg:block`}>
              <section ref={resultRef} className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
                <div className="border-b border-accent-100 bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 p-4 dark:border-accent-900/40 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-emerald-950/20 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-accent-700 dark:text-accent-300">Паспорт закупки</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{pack.icon} {run.packTitle}</h2>
                      <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">{drafts.length} × {drafts.width} × {drafts.height} м · {run.merged.materials.length} позиций</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Готово к закупке</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <ResultMetric label="Пол" value={`${floorM2?.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} м²`} />
                    <ResultMetric label="Стены" value={`${wallM2?.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} м²`} />
                    <ResultMetric label="Разделов" value={String(run.steps.length)} />
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Основная закупка</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">С чего начать</h3>
                    </div>
                    <span className="text-xs text-stone-400">с запасом</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {primaryMaterials.map((material, index) => (
                      <div key={`${material.name}-${index}`} className="grid min-h-20 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800 dark:text-slate-200">{materialName(material.name)}</p>
                          {material.subtitle && <p className="mt-1 truncate text-[10px] text-stone-400">{material.subtitle}</p>}
                        </div>
                        <p className="rounded-lg bg-accent-50 px-2 py-1.5 text-right text-sm font-bold tabular-nums text-accent-800 dark:bg-accent-950/30 dark:text-accent-200">{purchaseValue(material)}</p>
                      </div>
                    ))}
                  </div>

                  <details className="mt-4 rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-stone-700 dark:text-slate-200">
                      Полная ведомость <span className="text-xs font-medium text-stone-400">{run.merged.materials.length} позиций ↓</span>
                    </summary>
                    <ul className="divide-y divide-stone-100 border-t border-stone-100 px-4 dark:divide-slate-800 dark:border-slate-800">
                      {run.merged.materials.map((material, index) => (
                        <li key={`${material.name}-${index}`} className="flex justify-between gap-3 py-3 text-sm">
                          <span className="min-w-0 text-stone-700 dark:text-slate-300">{materialName(material.name)}</span>
                          <span className="shrink-0 font-bold tabular-nums text-slate-950 dark:text-white">{purchaseValue(material)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <SaveToProjectButton
                      calcId={`room-pack-${run.packId}`}
                      calcTitle={`Мой ремонт: ${run.packTitle}`}
                      slug={primaryMeta?.slug ?? run.steps[0].slug}
                      categorySlug={primaryMeta?.categorySlug ?? "otdelka"}
                      calendarScenarioId={scenarioId}
                      materials={run.merged.materials.map((material) => ({
                        name: material.name,
                        quantity: material.purchaseQty ?? material.withReserve ?? material.quantity,
                        unit: material.unit,
                        category: material.category,
                      }))}
                    />
                    <Link href={pack.fullCalculatorHref(dims)} onClick={() => trackToolRelatedClick(ROOM_MASTER_TOOL_SLUG, `calculator:${pack.primarySteps[0]?.slug ?? packId}`)} className="min-h-11 rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-semibold text-stone-700 no-underline hover:border-accent-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Уточнить расчёт →</Link>
                  </div>
                </div>
              </section>

              <section className="mt-4 card border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Соседние этапы</h3>
                  <Link
                    href={calendarHref(scenarioId)}
                    onClick={() => trackToolRelatedClick(ROOM_MASTER_TOOL_SLUG, "kalendar-remonta")}
                    className="text-xs font-semibold text-accent-700 no-underline dark:text-accent-300"
                  >
                    Календарь →
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {renovationCostHref && (
                    <Link
                      href={renovationCostHref}
                      onClick={() => trackToolRelatedClick(ROOM_MASTER_TOOL_SLUG, RENOVATION_COST_TOOL_SLUG)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm font-semibold text-emerald-900 no-underline hover:border-emerald-400 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"
                      data-testid="renovation-cost-link"
                    >
                      💰 Черновая стоимость<span className="mt-0.5 block text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">По площади пола; тип и цены выберете отдельно</span>
                    </Link>
                  )}
                  {(packId === "bathroom" || packId === "kitchen") && (
                    <Link href={layoutHref} onClick={() => trackToolRelatedClick(ROOM_MASTER_TOOL_SLUG, "raskladka-plitki")} className="rounded-xl border border-orange-200 bg-orange-50/70 p-3 text-sm font-semibold text-stone-800 no-underline hover:border-orange-300 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-slate-200">🔲 Раскладка пола<span className="mt-0.5 block text-[11px] font-normal text-stone-500 dark:text-slate-400">По размерам помещения</span></Link>
                  )}
                  {pack.extraLinks.filter((link) => link.ref.slug !== "raskladka-plitki").map((link) => (
                    <Link key={link.label} href={extraLinkHref(link, dims)} onClick={() => trackToolRelatedClick(ROOM_MASTER_TOOL_SLUG, `calculator:${link.ref.slug}`)} className="rounded-xl border border-stone-200 bg-white p-3 text-sm font-semibold text-stone-800 no-underline hover:border-accent-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{link.label}<span className="mt-0.5 block text-[11px] font-normal text-stone-500 dark:text-slate-400">{link.reason}</span></Link>
                  ))}
                </div>
                <button type="button" onClick={() => setMobileStage("parameters")} className="mt-3 min-h-11 w-full rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 lg:hidden">← Изменить параметры</button>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/70 px-2 py-2.5 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <p className="text-[10px] text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function RoomPreview({ packId, floorM2, wallM2, drafts }: { packId: RoomPackId; floorM2: number | null; wallM2: number | null; drafts: MeasureDrafts }) {
  const palette = packId === "bathroom"
    ? { wall: "#ddd4c8", side: "#c9beb1", floor: "#d9c49b", accent: "#c2410c" }
    : packId === "kitchen"
      ? { wall: "#e8dfd2", side: "#d2c5b5", floor: "#cba574", accent: "#b45309" }
      : { wall: "#e7e0d6", side: "#d5cabd", floor: "#b98b5f", accent: "#9a3412" };

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-[#f3ede4] shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-white/80 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">Помещение</p>
          <p className="mt-0.5 text-sm font-bold text-slate-950 dark:text-white">{ROOM_PACKS[packId].icon} {ROOM_PACKS[packId].title}</p>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-stone-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">Объёмный вид</span>
      </div>
      <div className="relative min-h-[280px] overflow-hidden bg-gradient-to-b from-[#f8f4ed] to-[#e7ddd0] p-4 dark:from-slate-900 dark:to-slate-950 sm:min-h-[380px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 360" role="img" aria-label={`Эскиз помещения ${drafts.length} на ${drafts.width} метра`}>
          <defs><filter id="room-shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#57534e" floodOpacity=".22" /></filter></defs>
          <g filter="url(#room-shadow)">
            <polygon points="82,58 440,58 498,102 146,102" fill="#fffaf2" />
            <polygon points="82,58 146,102 146,283 82,238" fill={palette.side} />
            <polygon points="146,102 498,102 498,283 146,283" fill={palette.wall} />
            <polygon points="146,283 498,283 424,338 82,238" fill={palette.floor} />
            <path d="M146 147H498M146 192H498M146 237H498M214 102V283M282 102V283M350 102V283M418 102V283" stroke="#8f8173" strokeOpacity={packId === "bathroom" ? ".28" : ".12"} />
            <path d="M146 283L424 338M234 283L330 338M322 283L236 310M410 283L338 313" stroke="#725c46" strokeOpacity=".24" />
            <rect x="366" y="169" width="64" height="114" rx="2" fill="#f8f5ef" stroke="#81776c" strokeWidth="4" />
            <rect x="374" y="177" width="48" height="106" fill="#ece7df" />
            <circle cx="414" cy="231" r="3" fill={palette.accent} />
            <path d="M162 121H482" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".65" />
          </g>
          <text x="322" y="324" textAnchor="middle" fill={palette.accent} fontSize="13" fontWeight="700">{drafts.length || "—"} × {drafts.width || "—"} м</text>
          <text x="104" y="178" textAnchor="middle" transform="rotate(-90 104 178)" fill={palette.accent} fontSize="12" fontWeight="700">{drafts.height || "—"} м</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 border-t border-white/80 bg-white/75 dark:border-slate-800 dark:bg-slate-950/50">
        <PreviewMetric label="Пол" value={floorM2 === null ? "—" : `${floorM2.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} м²`} />
        <PreviewMetric label="Стены" value={wallM2 === null ? "—" : `${wallM2.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} м²`} />
        <PreviewMetric label="Дверь" value={drafts.doorWidth ? `${drafts.doorWidth} м` : "—"} />
      </div>
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-slate-800">
      <p className="text-[10px] text-stone-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
