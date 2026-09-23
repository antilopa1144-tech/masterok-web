"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProjectWithEntries } from "@/lib/storage/types";
import { aggregateProcurementLines } from "@/lib/projects/procurement";
import { excludePurchaseLine, updateProjectMaterial, updatePurchaseLinePackaging, updatePurchaseLineQuantity } from "@/lib/storage/projects";
import MaterialSelection from "./MaterialSelection";

const field = "mt-1 min-w-0 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-900";
export default function RepairCart({ project, onChange, onSync }: { project: ProjectWithEntries; onChange: () => Promise<void>; onSync: () => void }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const lines = aggregateProcurementLines(project.entries);
  async function edit(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await onChange(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить изменение"); } finally { setBusy(false); }
  }
  return <section className="card mt-5 p-4 sm:p-5">
    <h2 className="text-lg font-bold">Корзина ремонта · бесплатно</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Количество и фасовку можно уточнить по выбранному товару. Одинаковое название не означает одинаковый материал: для объединения укажите один и тот же артикул или точную спецификацию и фасовку. Проверьте назначение, состав, цвет и совместимость.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {project.entries.map((entry) => <fieldset key={entry.id} disabled={busy} className="mt-4 min-w-0 border-t pt-3">
      <legend className="max-w-full break-words px-1 text-sm font-semibold">{entry.label || entry.calcTitle}</legend>
      <Link className="text-xs underline" href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}>Открыть исходный калькулятор</Link>
      {entry.materials.map((material, index) => <div key={`${material.id}-${material.quantity}-${material.packageSize}-${material.excluded}`} className={`mt-3 rounded-xl border p-3 ${material.excluded ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-medium">{material.name}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{material.subtitle}</p></div><button type="button" className="text-sm underline" onClick={() => void edit(() => excludePurchaseLine(project.id, entry.id, material.id!, !material.excluded))}>{material.excluded ? "Вернуть в список" : "Исключить"}</button></div>
        {!material.excluded && <>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{material.exactQuantity !== undefined ? `Потребность: ${material.exactQuantity.toLocaleString("ru-RU")} ${material.baseUnit ?? material.unit}. ` : "Точная потребность не сохранена в этом расчёте. "}{material.reservedQuantity !== undefined ? `С запасом: ${material.reservedQuantity.toLocaleString("ru-RU")} ${material.baseUnit ?? material.unit}. ` : ""}{material.remainder !== undefined ? `Остаток после упаковок: ${material.remainder.toLocaleString("ru-RU")} ${material.baseUnit ?? material.unit}.` : ""}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs">Купить, {material.unit}<input className={field} aria-label={`Купить ${entry.label || entry.calcTitle}: ${material.name}`} type="number" min="0" step="any" defaultValue={material.quantity} onBlur={(event) => { const amount = Number(event.target.value); const pieces = /^шт\.?$/iu.test(material.unit.trim()); if (!event.target.value || !Number.isFinite(amount) || amount < 0 || (pieces && !Number.isInteger(amount))) { event.currentTarget.value = String(material.quantity); setError("Укажите неотрицательное число; для штук — целое."); return; } if (amount !== material.quantity) void edit(() => updatePurchaseLineQuantity(project.id, entry.id, material.id!, amount)); }} /></label>
            {material.baseUnit && material.reservedQuantity !== undefined && <label className="text-xs">Фасовка одной упаковки, {material.baseUnit}<input className={field} type="number" min="0.000001" step="any" defaultValue={material.packageSize ?? ""} onBlur={(event) => { const amount = Number(event.target.value); if (!event.target.value || !Number.isFinite(amount) || amount <= 0) { event.currentTarget.value = material.packageSize == null ? "" : String(material.packageSize); setError("Размер упаковки должен быть больше нуля."); return; } if (amount !== material.packageSize) void edit(() => updatePurchaseLinePackaging(project.id, entry.id, material.id!, amount, material.packageUnit ?? "уп.")); }} /></label>}
            {material.packageSize && material.baseUnit && material.reservedQuantity !== undefined && <label className="text-xs sm:col-span-2">Артикул / точная спецификация для объединения<input className={field} maxLength={150} defaultValue={material.procurementKey ?? ""} placeholder="Заполните только для выбранного одинакового товара" onBlur={(event) => { if (event.target.value !== (material.procurementKey ?? "")) void edit(() => updateProjectMaterial(project.id, entry.id, material.id!, { procurementKey: event.target.value.trim() || undefined })); }} /></label>}
          </div>
          {!material.id && <p className="text-xs">Старая запись #{index + 1}: пересохраните расчёт для редактирования.</p>}
        </>}
      </div>)}
      <MaterialSelection calculatorId={entry.calcId} materials={entry.materials.filter((material) => !material.excluded).map((material) => ({ name: material.name, quantity: material.quantity, unit: material.unit, subtitle: material.subtitle }))} />
    </fieldset>)}
    <div className="mt-5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><h3 className="font-semibold">Общий список к покупке · {lines.length} поз.</h3><ul className="mt-2 space-y-3 text-sm">{lines.map((line) => <li key={line.key}><b>{line.name}</b> — {line.quantity.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} {line.unit}<p className="text-xs text-slate-600 dark:text-slate-300">{line.purchaseHint ?? line.subtitles?.join("; ")}</p><p className="text-xs text-slate-500">{line.sources.map((source) => source.calcTitle).join(" + ")}</p></li>)}</ul></div>
    <p className="mt-3 text-xs text-slate-500">Оплата материалов выполняется отдельно в каждом магазине. Подтверждённых предложений магазинов может не быть; список остаётся доступен.</p>
    <button className="btn-secondary mt-3" onClick={onSync}>Обновить документ из корзины</button><p className="mt-1 text-xs text-slate-500">Ручные количества документа заменятся; цены совпадающих позиций сохранятся.</p>
  </section>;
}
