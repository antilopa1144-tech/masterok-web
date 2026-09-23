"use client";

import type { ProjectDocumentInput } from "@/lib/commerce/document-types";

interface Props { document: ProjectDocumentInput }

const number = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const rub = (value: number) => `${number(value)} ₽`;

export default function DocumentPreview({ document }: Props) {
  const lines = [
    ...document.materials.map((line) => ({ ...line, section: "Материал" })),
    ...(document.works ?? []).map((line) => ({ ...line, section: "Работа", subtitle: undefined as string | undefined, packaging: undefined as string | undefined })),
  ];
  const knownTotal = lines.reduce((sum, line) => sum + (line.unitPrice ? line.quantity * line.unitPrice.amount : 0), 0)
    + (document.delivery?.amount?.amount ?? 0) + (document.monetaryReserve?.amount.amount ?? 0);
  const unknownCount = lines.filter((line) => !line.unitPrice).length;

  return <section id="preview" aria-labelledby="preview-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 px-5 py-6 dark:border-slate-700 sm:px-7">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Предпросмотр сметы</p>
        <h2 id="preview-title" className="mt-2 break-words text-2xl font-semibold tracking-tight">{document.project.name}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Материалы, работы и известная сумма проекта</p>
      </div>
      <div className="min-w-0 sm:text-right">
        <span className="block text-xs text-slate-500 dark:text-slate-400">Итого по указанным ценам</span>
        <strong className="block text-2xl font-semibold tabular-nums sm:text-3xl">{rub(knownTotal)}</strong>
      </div>
    </header>

    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>
          <th className="px-7 py-3 font-medium">Позиция</th><th className="px-4 py-3 text-right font-medium">Количество</th><th className="px-4 py-3 text-right font-medium">Цена</th><th className="px-7 py-3 text-right font-medium">Сумма</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((line) => <tr key={`${line.section}-${line.key}`}>
            <td className="px-7 py-4"><span className="block text-xs text-slate-500 dark:text-slate-400">{line.section}</span><span className="font-medium">{line.name}</span>{line.subtitle && <span className="block text-xs text-slate-500 dark:text-slate-400">{line.subtitle}</span>}{line.packaging && <span className="block text-xs text-slate-500 dark:text-slate-400">{line.packaging}</span>}</td>
            <td className="px-4 py-4 text-right tabular-nums">{number(line.quantity)} {line.unit}</td>
            <td className="px-4 py-4 text-right tabular-nums">{line.unitPrice ? rub(line.unitPrice.amount) : "—"}</td>
            <td className="px-7 py-4 text-right font-medium tabular-nums">{line.unitPrice ? rub(line.quantity * line.unitPrice.amount) : "Без цены"}</td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
      {lines.map((line) => <article key={`${line.section}-${line.key}`} className="px-5 py-4">
        <span className="text-xs text-slate-500 dark:text-slate-400">{line.section}</span>
        <h3 className="mt-0.5 break-words text-sm font-semibold leading-5">{line.name}</h3>
        {line.subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.subtitle}</p>}
        {line.packaging && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.packaging}</p>}
        <div className="mt-3 flex items-end justify-between gap-3 text-sm tabular-nums">
          <div><span className="block text-xs text-slate-500 dark:text-slate-400">Количество</span><span className="font-medium">{number(line.quantity)} {line.unit}</span></div>
          <div className="text-right"><span className="block text-xs text-slate-500 dark:text-slate-400">Сумма</span><strong>{line.unitPrice ? rub(line.quantity * line.unitPrice.amount) : "Без цены"}</strong></div>
        </div>
        {line.unitPrice && <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{rub(line.unitPrice.amount)} за {line.unit}</p>}
      </article>)}
    </div>

    <footer className="space-y-1 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:px-7">
      {unknownCount > 0 && <p>{unknownCount} поз. без цены не включены в итог. Добавьте цены перед отправкой заказчику.</p>}
      {document.delivery?.amount && <p>Доставка: {rub(document.delivery.amount.amount)} включена в итог.</p>}
      {document.monetaryReserve && <p>Денежный резерв: {rub(document.monetaryReserve.amount.amount)} включён в итог.</p>}
      <p>Предпросмотр обновляется при изменении проекта.</p>
    </footer>
  </section>;
}
