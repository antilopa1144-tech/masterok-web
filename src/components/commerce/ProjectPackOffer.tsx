"use client";

import Link from "next/link";
import type { ProjectDocumentInput } from "@/lib/commerce/document-types";
import { PROJECT_ESTIMATE_NAME, savedLayoutsLabel } from "@/lib/commerce/product-copy";

interface Props {
  document: ProjectDocumentInput;
  priceKopecks: number;
  mode: string;
  checkoutAvailable: boolean;
  hasAccess: boolean;
  accessFromPro: boolean;
  signedIn: boolean;
  busy: boolean;
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  onCheckout: () => void;
  onDownload: (format: "pdf" | "xlsx") => void;
}

const number = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const rub = (value: number) => `${number(value)} ₽`;

export default function ProjectPackOffer({
  document, priceKopecks, mode, checkoutAvailable, hasAccess, accessFromPro,
  signedIn, busy, accepted, onAcceptedChange, onCheckout, onDownload,
}: Props) {
  const materials = document.materials;
  const works = document.works ?? [];
  const unpricedCount = [...materials, ...works].filter((line) => !line.unitPrice).length;
  const hasPricedLine = [...materials, ...works].some((line) => line.unitPrice !== undefined);
  const knownTotal = [...materials, ...works].reduce((sum, line) => sum + (line.unitPrice ? line.quantity * line.unitPrice.amount : 0), 0)
    + (document.delivery?.amount?.amount ?? 0) + (document.monetaryReserve?.amount.amount ?? 0);
  const previewLines = [
    ...materials.map((line) => ({ ...line, kind: "Материал" })),
    ...works.map((line) => ({ ...line, kind: "Работа" })),
  ].slice(0, 3);
  const remainingLines = materials.length + works.length - previewLines.length;
  const layoutCount = document.layouts?.length ?? 0;
  const layoutLabel = savedLayoutsLabel(layoutCount);
  const price = number(priceKopecks / 100);

  return <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#f1f3f3] dark:border-slate-700 dark:bg-slate-900">
    <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 px-5 py-7 sm:px-8 sm:py-9">
        <h2 className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">Оформленная смета для заказчика</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Проверьте стоимость работ и материалов. Одна покупка даст PDF для передачи заказчику и XLSX для правок по этому проекту.</p>

        <div className="mt-7 max-w-2xl border border-slate-200 border-t-4 border-t-orange-600 bg-white px-5 py-5 text-slate-900 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.55)] sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Мастерок</span>
            <span>Смета проекта · {document.project.documentDate.split("-").reverse().join(".")}</span>
          </div>
          <h3 className="mt-5 break-words text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">{document.project.name}</h3>
          {document.parties?.object && <p className="mt-1 break-words text-sm text-slate-500">{document.parties.object}</p>}
          <div className="mt-5 grid grid-cols-2 gap-x-5 border-y border-slate-200 py-3 text-sm">
            <p><span className="block text-xs text-slate-500">Материалы</span><strong className="font-semibold">{materials.length} поз.</strong></p>
            <p><span className="block text-xs text-slate-500">Работы</span><strong className="font-semibold">{works.length} поз.</strong></p>
          </div>
          <div className="divide-y divide-slate-100">
            {previewLines.map((line) => <div key={`${line.kind}-${line.key}`} className="flex min-w-0 items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><span className="block text-[11px] text-slate-500">{line.kind}</span><span className="block break-words font-medium leading-5">{line.name}</span></div>
              <span className="shrink-0 pt-3 text-right tabular-nums text-slate-600">{number(line.quantity)} {line.unit}</span>
            </div>)}
          </div>
          {remainingLines > 0 && <p className="border-t border-slate-100 py-2 text-xs text-slate-500">И ещё {remainingLines} поз. в полном документе</p>}
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2 border-t-2 border-slate-900 pt-4">
            <span className="text-sm font-medium">Итого по указанным ценам</span>
            <strong className="text-2xl font-semibold tracking-tight tabular-nums">{rub(knownTotal)}</strong>
          </div>
          {unpricedCount > 0 && <p className="mt-2 text-xs leading-5 text-amber-800">{unpricedCount} поз. без цены не включены в итог.</p>}
        </div>
        <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">Это фрагмент данных проекта. Полное оформление файла показано в образце.</p>
        <a className="mt-3 inline-flex flex-wrap gap-x-2 text-sm font-medium text-orange-700 underline underline-offset-4 dark:text-orange-300" href="/samples/masterok-project-pack-demo.pdf" target="_blank" rel="noopener noreferrer">Посмотреть образец PDF <span className="font-normal text-slate-500 dark:text-slate-400">с демонстрационными данными</span></a>
        {unpricedCount > 0 && <p className="mt-5 max-w-2xl border-l-2 border-amber-500 pl-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
          Перед отправкой заказчику <a href="#materials" className="font-semibold text-orange-700 underline underline-offset-2 dark:text-orange-300">укажите недостающие цены</a>. Позиции без цены останутся в файле, но не войдут в итог.
        </p>}
      </div>

      <div className="flex min-w-0 flex-col justify-between bg-[#17212b] px-5 py-7 text-white sm:px-7 sm:py-9">
        <div>
          <p className="text-sm text-slate-300">{PROJECT_ESTIMATE_NAME} · один проект</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{accessFromPro ? "В PRO" : `${price} ₽`}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{accessFromPro ? "Входит в вашу подписку." : "Одна оплата за оформление. Обновляйте и скачивайте смету этого проекта повторно."}</p>
          <div className="mt-7 border-t border-slate-600 pt-5">
            <p className="font-medium">В комплекте</p>
            <ul className="mt-3 space-y-3 text-sm leading-5 text-slate-200">
              <li><strong className="font-semibold text-white">PDF</strong> со сметой, закупкой и данными проекта</li>
              <li><strong className="font-semibold text-white">XLSX</strong> с ценами и формулами для изменений</li>
              {layoutCount > 0 && <li>{layoutLabel} из проекта</li>}
            </ul>
          </div>
          {mode !== "live" && <p className="mt-6 border-l-2 border-amber-400 pl-3 text-xs leading-5 text-amber-100">{mode === "local" ? "Локальная проверка: деньги не списываются." : "Тестовый режим: деньги не списываются."}</p>}
        </div>
        <div className="mt-8">
          {hasAccess ? <>
            <p className="mb-3 text-sm font-medium text-emerald-300">{accessFromPro ? "Доступно по PRO" : "Смета оплачена"}</p>
            <div className="grid gap-2">
              <button className="btn-primary w-full" disabled={!signedIn || busy} onClick={() => onDownload("pdf")}>Скачать смету PDF</button>
              <button className="w-full rounded-xl border border-slate-500 px-4 py-3 text-sm font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50" disabled={!signedIn || busy} onClick={() => onDownload("xlsx")}>Скачать таблицу XLSX</button>
            </div>
          </> : <>
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-200">
              <input className="mt-1 accent-orange-500" type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} />
              <span>Принимаю <Link className="text-white underline underline-offset-2" href="/usloviya-pokupki/">условия покупки</Link>.</span>
            </label>
            <button className="btn-primary mt-4 w-full" disabled={busy || !signedIn || !accepted || !checkoutAvailable || !hasPricedLine} onClick={onCheckout}>Получить смету PDF и XLSX за {price} ₽</button>
            {!hasPricedLine && <p className="mt-2 text-xs leading-5 text-amber-100">Сначала укажите цену хотя бы одного материала или работы. Бесплатный закупочный список уже доступен.</p>}
            {!signedIn && <p className="mt-2 text-xs leading-5 text-slate-300">Для покупки войдите в кабинет. Проект сохранится при оформлении.</p>}
          </>}
          <p className="mt-5 border-t border-slate-600 pt-4 text-xs leading-5 text-slate-300">Расчёты, корзина ремонта, простая смета, печать и CSV бесплатны. Материалы в магазине оплачиваются отдельно.</p>
        </div>
      </div>
    </div>
  </div>;
}
