"use client";

import type { ProjectDocumentMaterialLine } from "@/lib/commerce/document-types";

interface Props {
  materials: ProjectDocumentMaterialLine[];
  onChange: (index: number, patch: Partial<ProjectDocumentMaterialLine>) => void;
}

export default function MaterialPriceEditor({ materials, onChange }: Props) {
  return <section id="materials" className="card mt-5 p-4 sm:p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div><h2 className="text-lg font-semibold">Материалы и цены</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Укажите цены, если нужна итоговая сумма. Пустая цена остаётся неизвестной.</p></div>
      <span className="text-sm text-slate-500 dark:text-slate-400">Без цены: {materials.filter((item) => !item.unitPrice).length}</span>
    </div>
    <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {materials.map((material, index) => <div key={material.key} className="py-4">
        <h3 className="break-words text-sm font-semibold leading-5">{material.name}</h3>
        {(material.packaging || material.subtitle) && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{material.packaging ?? material.subtitle}</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(12rem,1.3fr)]">
          <label className="min-w-0 text-xs text-slate-600 dark:text-slate-300">Количество, {material.unit}
            <input aria-label={`Количество: ${material.name}`} type="number" min="0" step={/^шт\.?$/iu.test(material.unit) ? "1" : "any"} className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5 text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={material.quantity} onChange={(event) => onChange(index, { quantity: Math.max(0, /^шт\.?$/iu.test(material.unit) ? Math.ceil(Number(event.target.value)) : Number(event.target.value)), packaging: undefined, exactQuantity: undefined, reservePercent: undefined })}/>
          </label>
          <label className="min-w-0 text-xs text-slate-600 dark:text-slate-300">Цена за {material.unit}, ₽
            <input aria-label={`Цена: ${material.name}`} type="number" min="0" step="any" placeholder="Не указана" className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5 text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={material.unitPrice?.amount ?? ""} onChange={(event) => onChange(index, { unitPrice: event.target.value === "" ? undefined : { amount: Number(event.target.value), currency: "RUB", provenance: material.unitPrice?.provenance ?? "Ввёл пользователь" } })}/>
          </label>
          <label className="col-span-2 min-w-0 text-xs text-slate-600 dark:text-slate-300 sm:col-span-1">Откуда цена
            <input aria-label={`Источник цены: ${material.name}`} className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={material.unitPrice?.provenance ?? ""} placeholder="Не указан" disabled={!material.unitPrice} onChange={(event) => material.unitPrice && onChange(index, { unitPrice: { ...material.unitPrice, provenance: event.target.value } })}/>
          </label>
        </div>
      </div>)}
    </div>
  </section>;
}
