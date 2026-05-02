"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getProjects, deleteProject, saveEntryToProject } from "@/lib/storage/projects";
import { buildProjectEstimate, type ProjectEstimate, type ProjectEstimateLine } from "@/lib/projects/estimate";
import type { ProjectWithEntries, StoredProjectEntry } from "@/lib/storage/types";

function formatCost(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function EstimateLineSummary({ line, entry }: { line?: ProjectEstimateLine; entry: StoredProjectEntry }) {
  const hasCost = (line?.estimatedCost ?? 0) > 0;
  const totalMaterials = entry.materials.length;
  const priced = line?.pricedItems ?? 0;
  const pct = totalMaterials > 0 ? Math.round((priced / totalMaterials) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900">
      {/* Заголовок расчёта */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <Link
            href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}
            className="text-sm font-bold text-slate-900 hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-400 no-underline"
          >
            {entry.calcTitle}
          </Link>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {entry.materials.length} позиций · сохранено {new Date(entry.ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-black tabular-nums text-accent-700 dark:text-accent-300">
            {hasCost ? `${formatCost(line!.estimatedCost)} ₽` : "— ₽"}
          </p>
          {!hasCost && (
            <Link
              href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}
              className="text-[10px] font-semibold text-accent-600 hover:text-accent-700 no-underline dark:text-accent-400"
            >
              Ввести цены
            </Link>
          )}
        </div>
      </div>

      {/* Материалы */}
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {entry.materials.map((m, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{m.name}</span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
              {Math.round(m.quantity).toLocaleString("ru-RU")} {m.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Прогресс цен */}
      {totalMaterials > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Цены указаны: {priced} из {totalMaterials}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-accent-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {priced < totalMaterials && (
            <Link
              href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}
              className="text-[11px] font-medium text-accent-700 hover:text-accent-800 no-underline dark:text-accent-400"
            >
              Открыть расчёт и ввести цены →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectWithEntries | null>(null);
  const [estimate, setEstimate] = useState<ProjectEstimate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    const projects = await getProjects();
    const found = projects.find((p) => p.id === projectId) ?? null;
    if (!found) {
      setNotFound(true);
      setLoaded(true);
      return;
    }
    setProject(found);
    setEstimate(await buildProjectEstimate(found));
    setLoaded(true);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="card p-10 text-center space-y-4">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Проект не найден</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Возможно, он был удалён или хранился в другом браузере.
        </p>
        <Link href="/proekty/" className="btn-primary inline-flex text-sm">
          К списку проектов
        </Link>
      </div>
    );
  }

  const totalMaterialItems = project.entries.reduce((sum, e) => sum + e.materials.length, 0);
  const totalPriced = estimate?.pricedItems ?? 0;
  const completePct = totalMaterialItems > 0 ? Math.round((totalPriced / totalMaterialItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Сводная карточка */}
      <div className="rounded-3xl bg-gradient-to-br from-accent-600 to-violet-600 p-6 text-white shadow-xl shadow-accent-500/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Смета проекта</p>
            <h2 className="mt-1 text-2xl font-black">{project.name}</h2>
            <p className="mt-1 text-sm text-white/70">
              {project.entries.length} расчётов · {totalMaterialItems} позиций материалов
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-white/60">Итого материалы</p>
            <p className="mt-0.5 text-3xl font-black tabular-nums">
              {estimate && estimate.totalCost > 0 ? `${formatCost(estimate.totalCost)} ₽` : "— ₽"}
            </p>
            {estimate && estimate.missingPriceItems > 0 && (
              <p className="text-xs text-white/60 mt-1">
                ещё {estimate.missingPriceItems} позиций без цены
              </p>
            )}
          </div>
        </div>

        {/* Прогресс */}
        {totalMaterialItems > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>Цены заполнены: {totalPriced} из {totalMaterialItems}</span>
              <span>{completePct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-white transition-all"
                style={{ width: `${completePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Расчёты */}
      {project.entries.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-slate-500 dark:text-slate-400">
            Нажмите &quot;В проект&quot; после любого расчёта, чтобы добавить его сюда.
          </p>
          <Link href="/kalkulyatory/" className="btn-primary inline-flex text-sm">
            Открыть калькуляторы
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Список расчётов</h3>
          {project.entries.map((entry) => {
            const line = estimate?.lines.find((l) => l.entryId === entry.id);
            return <EstimateLineSummary key={entry.id} line={line} entry={entry} />;
          })}
        </div>
      )}

      {/* Итоговая таблица если есть суммы */}
      {estimate && estimate.lines.some((l) => l.estimatedCost > 0) && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Сводная смета</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {estimate.lines
              .filter((l) => l.estimatedCost > 0)
              .map((line) => (
                <div key={line.entryId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{line.calcTitle}</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCost(line.estimatedCost)} ₽
                  </span>
                </div>
              ))}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-accent-50/70 dark:bg-accent-900/20">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Итого материалы</span>
              <span className="text-base font-black tabular-nums text-accent-700 dark:text-accent-300">
                {formatCost(estimate.totalCost)} ₽
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Удалить проект */}
      <div className="flex justify-end">
        <button
          onClick={async () => {
            if (!confirm("Удалить проект и все сохранённые расчёты?")) return;
            await deleteProject(project.id);
            window.location.href = "/proekty/";
          }}
          className="text-sm text-red-400 hover:text-red-600 transition-colors"
        >
          Удалить проект
        </button>
      </div>
    </div>
  );
}
