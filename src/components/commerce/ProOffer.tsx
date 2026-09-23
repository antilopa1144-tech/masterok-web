"use client";

import Link from "next/link";
import type { CommercePublicState } from "@/lib/commerce/types";

interface Props {
  state: CommercePublicState;
  access: { pro: boolean; proUntil: number };
  subscription: { auto_renew: boolean } | null;
  accepted: boolean;
  recurring: boolean;
  busy: boolean;
  onAcceptedChange: (value: boolean) => void;
  onRecurringChange: (value: boolean) => void;
  onPay: () => void;
  onCancel: () => void;
}

export default function ProOffer({
  state, access, subscription, accepted, recurring, busy,
  onAcceptedChange, onRecurringChange, onPay, onCancel,
}: Props) {
  if (!state.proAvailable && !access.pro && !subscription?.auto_renew) return null;
  const price = (state.proPriceKopecks / 100).toLocaleString("ru-RU");
  return <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-[#f1f3f3] dark:border-slate-700 dark:bg-slate-900">
    <div className="grid md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 px-5 py-7 sm:px-8 sm:py-9">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">Рабочее место мастера</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">Masterok PRO помогает вести повторные проекты и готовить сметы для заказчиков.</p>
        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"><strong className="text-sm font-semibold">Свои расценки</strong><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Сохраняйте шаблоны работ и применяйте их в новых проектах.</p></div>
          <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"><strong className="text-sm font-semibold">История решений</strong><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Сравнивайте версии сметы и показывайте, что изменилось.</p></div>
          <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"><strong className="text-sm font-semibold">Документы</strong><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Оформляйте документы по нескольким проектам без отдельной покупки каждого пакета.</p></div>
          {state.aiAvailable && <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"><strong className="text-sm font-semibold">Михалыч и фото</strong><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">До {state.proAiRequests} вопросов в месяц, в том числе с фото. На фото он различает видимое; размеры и безопасность проверяют на месте.</p></div>}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">{state.aiAvailable ? `Общий предел Михалыча и помощника по смете: до ${state.proAiRequests} запросов в календарный месяц. Сложные запросы расходуют бюджет быстрее, поэтому доступ может закончиться раньше.${state.proAvailable ? ` Бесплатно — до ${state.freeAiWeeklyRequests} вопросов в календарную неделю (с понедельника, 00:00 мск).` : ""}` : "Михалыч в PRO пока не включён. Условия бесплатного доступа сохраняются."}</p>
      </div>
      <div className="flex flex-col justify-between bg-[#17212b] px-5 py-7 text-white sm:px-7 sm:py-9">
        <div>
          <p className="text-sm text-slate-300">Masterok PRO</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{access.pro ? "Активен" : `${price} ₽`}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{access.pro ? `До ${new Date(access.proUntil).toLocaleDateString("ru-RU")}` : "За один месяц доступа. Автопродление выключено, пока вы сами его не выберете."}</p>
        </div>
        <div className="mt-7">
          {access.pro ? <>
            <Link className="btn-primary w-full" href="/proekty/">Открыть свои проекты</Link>
            {subscription?.auto_renew ? <button disabled={busy} className="mt-4 text-sm text-white underline underline-offset-4 disabled:opacity-50" onClick={onCancel}>Отключить автопродление</button> : <>
              <p className="mt-4 text-xs text-slate-300">Автопродление выключено. Доступ закончится в указанную дату.</p>
              {state.proAvailable && <>
                <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-200"><input className="mt-1 accent-orange-500" type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} /><span>Принимаю <Link className="text-white underline" href="/usloviya-pokupki/">условия покупки</Link>.</span></label>
                <button disabled={!accepted || busy} className="btn-secondary mt-3 w-full" onClick={onPay}>Продлить ещё на месяц за {price} ₽</button>
              </>}
            </>}
          </> : state.proAvailable ? <>
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-200"><input className="mt-1 accent-orange-500" type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} /><span>Принимаю <Link className="text-white underline underline-offset-2" href="/usloviya-pokupki/">условия покупки</Link>.</span></label>
            {state.recurringAvailable && <label className="mt-3 flex items-start gap-2 text-sm leading-5 text-slate-200"><input className="mt-1 accent-orange-500" type="checkbox" checked={recurring} onChange={(event) => onRecurringChange(event.target.checked)} /><span>Продлевать каждый месяц за {price} ₽. Отключить можно здесь.</span></label>}
            <button disabled={!accepted || busy} className="btn-primary mt-5 w-full" onClick={onPay}>Оплатить месяц за {price} ₽</button>
            <p className="mt-3 text-xs leading-5 text-slate-300">{recurring ? "Автопродление начнётся после успешной оплаты." : "Одна оплата, без автопродления."}</p>
          </> : <p className="text-sm leading-6 text-slate-300">Подключение PRO пока закрыто. Бесплатные проекты и расчёты доступны.</p>}
        </div>
      </div>
    </div>
  </section>;
}
