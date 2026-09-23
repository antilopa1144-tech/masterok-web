"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { trackCommerceEvent } from "@/lib/analytics";
import type { CommerceOrder, CommercePublicState } from "@/lib/commerce/types";
import { PROJECT_ESTIMATE_NAME, savedLayoutsLabel } from "@/lib/commerce/product-copy";

type Payload = { order: CommerceOrder; paymentUrl: string; project?: { local_id: string; id: string; name: string; materialCount: number; workCount: number; knownTotal: number; unpricedCount: number; layoutCount: number }; state: CommercePublicState };
const labels: Record<string, string> = { pending: "Ожидаем оплату", paid: "Оплата подтверждена", canceled: "Оплата отменена", partially_refunded: "Частичный возврат", refunded: "Оплата возвращена" };

export default function PaymentPanel({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "xlsx" | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) { setChecking(true); setStatusNotice(""); }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/commerce/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body); setError("");
      if (!manual && body.order.state !== "pending") setStatusNotice("");
      if (manual) setStatusNotice(body.order.state === "pending" ? "Подтверждение оплаты ещё не поступило. Если деньги списаны, не оплачивайте повторно." : `Статус обновлён: ${labels[body.order.state] ?? "проверено"}.`);
    } catch (cause) { setError(cause instanceof Error && cause.name === "AbortError" ? "Проверка заняла слишком много времени. Повторите позже; повторно оплачивать не нужно." : cause instanceof Error ? cause.message : "Не удалось проверить заказ"); }
    finally { clearTimeout(timeout); if (manual) setChecking(false); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data || data.order.state !== "pending" || data.state.mode === "local" || attempts >= 10) return;
    const timer = setTimeout(() => { setAttempts((value) => value + 1); void load(); }, 3000);
    return () => clearTimeout(timer);
  }, [data, attempts, load]);

  async function localPay(outcome: "success" | "cancel") {
    setBusy(true);
    try {
      const response = await fetch("/api/commerce/local/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, outcome }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Проверка не выполнена"); }
    finally { setBusy(false); }
  }

  async function download(format: "pdf" | "xlsx") {
    if (!data?.project || downloading) return;
    setDownloading(format); setError("");
    try {
      const response = await fetch("/api/commerce/documents", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: data.project.id, format, branded: false }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Документ недоступен");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `masterok-project.${format}`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackCommerceEvent("commerce_document_download", { format });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось скачать документ"); }
    finally { setDownloading(null); }
  }

  if (!data) return <main className="page-container py-12"><p role={error ? "alert" : undefined}>{error || "Проверяем заказ…"}</p>{error && <><button className="btn-secondary mt-3" onClick={() => void load()}>Повторить</button><Link className="ml-3 underline" href="/kabinet/">Войти в кабинет</Link></>}</main>;

  const isPack = data.order.kind === "project_pack";
  const paid = data.order.state === "paid" || data.order.state === "partially_refunded";
  const destination = data.project ? `/proekty/${encodeURIComponent(data.project.local_id)}/zakupka/?cloud=${data.project.id}` : "/kabinet/";
  const price = (data.order.amount / 100).toLocaleString("ru-RU");
  const itemName = isPack ? `${PROJECT_ESTIMATE_NAME} · «${data.project?.name ?? "Выбранный проект"}»` : "Мастерок PRO на один месяц";

  return <main className="page-container max-w-3xl py-8 sm:py-12">
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-700 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Заказ № {data.order.invoice}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paid ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{labels[data.order.state] ?? data.order.state}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{paid ? (isPack ? "Документы готовы" : "PRO подключён") : data.order.state === "pending" ? "Проверьте заказ" : "Статус заказа"}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{paid ? (isPack ? "Документы этого проекта можно скачать и обновлять." : "Инструменты PRO доступны в кабинете на оплаченный период.") : "Перед оплатой проверьте состав покупки и сумму."}</p>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 px-5 py-6 sm:px-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Что входит</p>
          <h2 className="mt-2 break-words text-xl font-semibold">{itemName}</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {isPack ? <><li>Оформленный PDF для заказчика и редактируемый XLSX</li><li>Внутри: смета, закупочный список{data.project?.layoutCount ? ` и ${savedLayoutsLabel(data.project.layoutCount)}` : ""}</li><li>Повторное скачивание и обновление этого проекта</li></> : <><li>Свои расценки и шаблоны работ</li><li>Версии смет и документы с данными подрядчика</li><li>Пакеты документов на время подписки</li></>}
          </ul>
          {isPack && data.project && <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400">Текущая смета проекта</p><p className="mt-1 font-medium">Материалы: {data.project.materialCount} · работы: {data.project.workCount}</p><p className="mt-1 font-medium">Итого по введённым ценам: {data.project.knownTotal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Это известная сумма проекта, а не цена оформления.</p></div>}
          {isPack && data.project && data.project.unpricedCount > 0 && <p className="mt-5 border-l-2 border-amber-500 pl-3 text-sm leading-6 text-slate-700 dark:text-slate-200">В текущем проекте {data.project.unpricedCount} поз. без цены. Они останутся в документе, но не войдут в итог. <Link className="font-semibold text-orange-700 underline underline-offset-2 dark:text-orange-300" href={`${destination}#materials`}>Указать цены в проекте</Link>.</p>}
          {data.state.mode !== "live" && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950 dark:bg-amber-950 dark:text-amber-200">{data.state.mode === "local" ? "Локальная проверка: деньги не списываются, связи с Robokassa нет." : "Тестовый режим Robokassa: деньги не списываются."}</p>}
          {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        </div>
        <div className="flex flex-col justify-between border-t border-slate-200 bg-slate-50 px-5 py-6 dark:border-slate-700 dark:bg-slate-900 md:border-l md:border-t-0 sm:px-8">
          <div><p className="text-sm text-slate-600 dark:text-slate-300">{paid ? "Стоимость заказа" : isPack ? "К оплате за оформление сметы" : "Сумма заказа"}</p><p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{price} ₽</p></div>
          <div className="mt-7 space-y-2">
            {data.order.state === "pending" && (data.state.mode === "local" ? <><button disabled={busy} className="btn-primary w-full" onClick={() => void localPay("success")}>Проверить успешную оплату</button><button disabled={busy} className="btn-secondary w-full" onClick={() => void localPay("cancel")}>Проверить отмену</button></> : <><a className="btn-primary w-full" href={data.paymentUrl}>Перейти к оплате</a><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Уже оплатили? Дождитесь подтверждения или проверьте статус. Повторно оплачивать не нужно.</p></>)}
            {paid && isPack && data.project && <>
              <button className="btn-primary w-full" disabled={Boolean(downloading)} onClick={() => void download("pdf")}>{downloading === "pdf" ? "Готовим PDF…" : "Скачать смету PDF"}</button>
              <button className="btn-secondary w-full" disabled={Boolean(downloading)} onClick={() => void download("xlsx")}>{downloading === "xlsx" ? "Готовим XLSX…" : "Скачать смету XLSX"}</button>
            </>}
            {paid && <Link className={`${isPack ? "block text-center text-sm underline underline-offset-2" : "btn-primary w-full"}`} href={destination}>{isPack ? "Открыть проект и изменить смету" : "Перейти в кабинет"}</Link>}
            {!paid && data.order.state !== "pending" && <Link className="btn-secondary w-full" href="/kabinet/">Вернуться в кабинет</Link>}
            {data.order.state === "pending" && <button type="button" disabled={busy || checking} aria-busy={checking} className="btn-secondary min-h-11 w-full disabled:cursor-wait" onClick={() => void load(true)}>{checking ? "Проверяем оплату…" : "Проверить оплату"}</button>}
            <p role="status" aria-live="polite" className="text-sm leading-5 text-slate-600 dark:text-slate-300">{statusNotice}</p>
          </div>
        </div>
      </div>
    </div>
  </main>;
}
