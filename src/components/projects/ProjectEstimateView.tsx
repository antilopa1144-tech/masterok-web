"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteEntryFromProject,
  deleteProject,
  getProjects,
  renameProject,
} from "@/lib/storage/projects";
import {
  buildProjectEstimateView,
  computeTotals,
  type ProjectEstimateViewModel,
} from "@/lib/projects/build-estimate";
import { loadCheckedKeys, saveCheckedKeys } from "@/lib/projects/checked-items";
import { buildProcurementCsv, downloadCsv } from "@/lib/projects/export-csv";
import { formatCost, formatQuantity, parsePriceInput } from "@/lib/projects/format";
import { setMaterialPriceForProject } from "@/lib/projects/material-prices";
import { computePurchaseStats } from "@/lib/projects/procurement-stats";
import { loadProjectMeta, saveProjectMeta } from "@/lib/projects/project-meta";
import type { ProjectEstimateMeta } from "@/lib/storage/types";
import type { ProjectWithEntries } from "@/lib/storage/types";
import CalculationEntryCard from "./CalculationEntryCard";
import ProjectEstimateProcurementPanel from "./ProjectEstimateProcurementPanel";
import ProjectEstimatePrint from "./ProjectEstimatePrint";
import ProjectEstimateStickyBar from "./ProjectEstimateStickyBar";
import { IconFolderEmpty, IconPencil, IconPrint, IconTable } from "./ProjectEstimateIcons";

type TabId = "procurement" | "calculations";

function priceProgress(totals: ProjectEstimateViewModel["totals"]) {
  if (totals.totalLines === 0) return 0;
  return Math.round((totals.pricedLines / totals.totalLines) * 100);
}

export default function ProjectEstimateView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectWithEntries | null>(null);
  const [view, setView] = useState<ProjectEstimateViewModel | null>(null);
  const [meta, setMeta] = useState<ProjectEstimateMeta>({ reservePercent: 0, deliveryRub: 0 });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabId>("procurement");
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const projects = await getProjects();
    const found = projects.find((p) => p.id === projectId) ?? null;
    if (!found) {
      setNotFound(true);
      setLoaded(true);
      return;
    }
    const projectMeta = loadProjectMeta(projectId);
    const model = await buildProjectEstimateView(found, projectMeta);
    setProject(found);
    setMeta(projectMeta);
    setView(model);
    setChecked(loadCheckedKeys(projectId));
    setNameDraft(found.name);
    setLoaded(true);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    if (!view) return null;
    return computeTotals(view.procurement, view.lines, view.resolvedPrices, meta);
  }, [view, meta]);

  const purchaseStats = useMemo(() => {
    if (!view) return null;
    return computePurchaseStats(view.procurement, view.resolvedPrices, checked);
  }, [view, checked]);

  const showCalculationsTab = (project?.entries.length ?? 0) > 1;
  const showStickyBar =
    tab === "procurement" && (project?.entries.length ?? 0) > 0 && totals && purchaseStats;

  const handlePriceChange = (materialName: string, raw: string) => {
    if (!project || !view) return;
    setPriceDrafts((prev) => ({ ...prev, [materialName]: raw }));
    const value = parsePriceInput(raw);
    const nextPrices = { ...view.resolvedPrices };
    if (value > 0) nextPrices[materialName] = value;
    else delete nextPrices[materialName];
    setView({
      ...view,
      resolvedPrices: nextPrices,
      totals: computeTotals(view.procurement, view.lines, nextPrices, meta),
    });
  };

  const handlePriceBlur = (materialName: string) => {
    if (!project) return;
    const value = parsePriceInput(priceDrafts[materialName] ?? String(view?.resolvedPrices[materialName] ?? ""));
    void setMaterialPriceForProject(project, materialName, value).then(() => refresh());
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[materialName];
      return next;
    });
  };

  const handleMetaChange = (patch: Partial<ProjectEstimateMeta>) => {
    const next = { ...meta, ...patch };
    setMeta(next);
    saveProjectMeta(projectId, next);
    if (view) {
      setView({
        ...view,
        totals: computeTotals(view.procurement, view.lines, view.resolvedPrices, next),
      });
    }
  };

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCheckedKeys(projectId, next);
      return next;
    });
  };

  const clearChecked = () => {
    const next = new Set<string>();
    setChecked(next);
    saveCheckedKeys(projectId, next);
  };

  const handlePrint = () => window.print();

  const handleCsv = () => {
    if (!project || !view || !totals) return;
    const csv = buildProcurementCsv(project.name, view.procurement, view.resolvedPrices, totals);
    const safeName = project.name.replace(/[^\wа-яА-ЯёЁ\d]+/gi, "_").slice(0, 40);
    downloadCsv(`smeta_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleCopyEstimate = async () => {
    if (!project || !view || !totals) return;
    const lines: string[] = [`Смета «${project.name}»`, ""];
    if (totals.grandTotal > 0) {
      lines.push(`Итого: ${formatCost(totals.grandTotal)} ₽`);
      if (totals.reserveAmount > 0) lines.push(`  в т.ч. запас ${totals.reservePercent}%: ${formatCost(totals.reserveAmount)} ₽`);
      if (totals.deliveryRub > 0) lines.push(`  доставка: ${formatCost(totals.deliveryRub)} ₽`);
      lines.push("");
    }
    for (const line of view.procurement) {
      const price = view.resolvedPrices[line.name] ?? 0;
      const sum = line.quantity * price;
      const mark = checked.has(line.key) ? "✓ " : "○ ";
      const pricePart = price > 0 ? ` × ${formatCost(price)} = ${formatCost(sum)} ₽` : "";
      lines.push(`${mark}${line.name} — ${formatQuantity(line.quantity, line.unit)}${pricePart}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || !project) return;
    await renameProject(project.id, name);
    setEditingName(false);
    void refresh();
  };

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse print:hidden">
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (notFound || !project || !view || !totals || !purchaseStats) {
    return (
      <div className="card p-10 text-center space-y-4 print:hidden">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Проект не найден</p>
        <Link href="/proekty/" className="btn-primary inline-flex text-sm">
          К списку проектов
        </Link>
      </div>
    );
  }

  const pct = priceProgress(totals);
  const allPriced = totals.pricedLines === totals.totalLines && totals.totalLines > 0;

  return (
    <>
      <ProjectEstimatePrint
        projectName={project.name}
        objectName={meta.objectName}
        customerName={meta.customerName}
        lines={view.procurement}
        prices={view.resolvedPrices}
        totals={totals}
      />

      <div className={`print:hidden space-y-5 ${showStickyBar ? "pb-28" : ""}`}>
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-400" />
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Смета проекта
                </p>
                {editingName ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="input-field text-lg font-bold max-w-md"
                      autoFocus
                    />
                    <button type="button" onClick={() => void saveName()} className="btn-primary text-xs px-3 py-1.5">
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="mt-0.5 group flex items-start gap-2 text-left max-w-full"
                    title="Переименовать проект"
                  >
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors">
                      {project.name}
                    </span>
                    <IconPencil className="w-4 h-4 mt-1.5 shrink-0 text-slate-300 group-hover:text-accent-500 transition-colors" />
                  </button>
                )}
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {project.entries.length}{" "}
                  {project.entries.length === 1 ? "расчёт" : project.entries.length < 5 ? "расчёта" : "расчётов"}
                  {" · "}
                  {totals.totalLines}{" "}
                  {totals.totalLines === 1 ? "позиция" : totals.totalLines < 5 ? "позиции" : "позиций"}
                  {" · "}
                  обновлено{" "}
                  {new Date(project.updatedAt ?? project.created).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>

                {/* Реквизиты документа: объект и заказчик. Необязательны —
                    пустые поля не мешают, но при заполнении смета выглядит
                    как настоящий документ (и попадают в печать). */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 max-w-xl">
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Объект / адрес</span>
                    <input
                      type="text"
                      value={meta.objectName ?? ""}
                      onChange={(e) => handleMetaChange({ objectName: e.target.value })}
                      placeholder="напр. Квартира, ул. Ленина 10"
                      className="input-field mt-0.5 w-full py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Заказчик</span>
                    <input
                      type="text"
                      value={meta.customerName ?? ""}
                      onChange={(e) => handleMetaChange({ customerName: e.target.value })}
                      placeholder="напр. Иванов И. И."
                      className="input-field mt-0.5 w-full py-1.5 text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5"
                  >
                    <IconPrint className="w-3.5 h-3.5" />
                    Печать
                  </button>
                  <button
                    type="button"
                    onClick={handleCsv}
                    className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5"
                  >
                    <IconTable className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyEstimate()}
                    className="btn-secondary text-xs px-3 py-2 hidden sm:inline-flex"
                  >
                    {copied ? "Скопировано" : "Копировать список"}
                  </button>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Итого к оплате</p>
                  <p className="text-2xl sm:text-3xl font-black tabular-nums text-accent-700 dark:text-accent-300">
                    {totals.grandTotal > 0 ? `${formatCost(totals.grandTotal)} ₽` : "— ₽"}
                  </p>
                </div>
              </div>
            </div>

            {totals.totalLines > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    Цены: {totals.pricedLines} из {totals.totalLines}
                    {!allPriced && " — заполните «₽/ед.»"}
                  </span>
                  <span className={allPriced ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allPriced ? "bg-green-500" : "bg-accent-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("procurement")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === "procurement"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Закупка
            {purchaseStats.pendingCount > 0 && purchaseStats.purchasedCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold text-accent-600 dark:text-accent-400">
                {purchaseStats.pendingCount}
              </span>
            )}
          </button>
          {showCalculationsTab && (
            <button
              type="button"
              onClick={() => setTab("calculations")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === "calculations"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              По расчётам
            </button>
          )}
        </div>

        {project.entries.length === 0 ? (
          <div className="card p-10 text-center space-y-4">
            <div className="flex justify-center">
              <IconFolderEmpty />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">Пока пусто</p>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Сохраните расчёт из любого калькулятора — кнопка «Сохранить расчёт» под списком материалов.
              </p>
            </div>
            <Link href="/kalkulyatory/" className="btn-primary inline-flex text-sm">
              Открыть калькуляторы
            </Link>
          </div>
        ) : tab === "procurement" ? (
          <ProjectEstimateProcurementPanel
            project={project}
            procurement={view.procurement}
            resolvedPrices={view.resolvedPrices}
            priceDrafts={priceDrafts}
            totals={totals}
            meta={meta}
            checked={checked}
            onToggleChecked={toggleChecked}
            onClearChecked={clearChecked}
            onPriceChange={handlePriceChange}
            onPriceBlur={handlePriceBlur}
            onMetaChange={handleMetaChange}
          />
        ) : (
          <div className="space-y-3">
            {view.lines.map((line) => (
              <CalculationEntryCard
                key={line.entryId}
                line={line}
                onDelete={() => {
                  if (!confirm("Удалить этот расчёт из проекта?")) return;
                  void deleteEntryFromProject(project.id, line.entryId).then(() => refresh());
                }}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Удалить проект и все расчёты?")) return;
              await deleteProject(project.id);
              window.location.href = "/proekty/";
            }}
            className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Удалить проект
          </button>
        </div>
      </div>

      {showStickyBar && (
        <ProjectEstimateStickyBar
          totals={totals}
          purchaseStats={purchaseStats}
          onCopy={() => void handleCopyEstimate()}
          copied={copied}
        />
      )}
    </>
  );
}
