import type { Metadata } from "next";

import { getSettings, publicState } from "@/lib/commerce/config";
import { PROJECT_ESTIMATE_NAME } from "@/lib/commerce/product-copy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Условия покупки",
  robots: { index: false, follow: false },
};

const rubles = (kopecks: number) => `${(kopecks / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;

export default async function PurchaseTermsPage() {
  const settings = await getSettings();
  const state = publicState(settings);
  const sellerReady = Boolean(state.sellerName && state.sellerInn && state.supportEmail);
  const proPrice = rubles(state.proPriceKopecks);
  const packPrice = rubles(state.packPriceKopecks);

  return <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
    <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Мастерок</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Условия покупки</h1>
    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Что входит в покупку, как получить документы и куда обратиться за помощью.</p>
    {state.mode !== "live" && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">{state.mode === "off" ? "Покупки пока недоступны. Бесплатными расчётами и проектами можно пользоваться." : "Тестовая версия: реальные деньги не списываются. Условия подготовлены для проверки перед открытием продаж."}</p>}

    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">Что остаётся бесплатным</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Все калькуляторы, существующие экспорт PDF/CSV и печать, локальные проекты, цены и отметки закупки остаются бесплатными. {state.proAvailable && state.aiAvailable ? `Михалычу можно задать до ${state.freeAiWeeklyRequests} вопросов в календарную неделю бесплатно. Счётчик обновляется по понедельникам в 00:00 мск.` : "Михалыч пока работает на прежних условиях."}</p>
    </section>

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">Что вы покупаете</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
        <li><strong>{PROJECT_ESTIMATE_NAME} — {packPrice} за один проект.</strong> Одна покупка даёт оформленный PDF и редактируемый XLSX с материалами, работами, закупочным списком и сохранёнными в проекте раскладками. Обновлять и повторно скачивать документы этого проекта можно без новой оплаты. Подписка и автоматические списания не подключаются.</li>
        {state.enabled && <li><strong>Мастерок PRO — {proPrice} в месяц.</strong> Работа с несколькими проектами, версиями смет, шаблонами и оформлением документов.{state.aiAvailable ? ` Михалыч: до ${state.proAiRequests} вопросов в месяц, включая анализ фото и вопросы по смете. При сложных многошаговых запросах месячный бюджет может закончиться раньше.` : " AI-функции PRO пока не подключены."}{!state.proAvailable && " Новые покупки PRO сейчас закрыты."}</li>}
      </ul>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Документы доступны в кабинете после подтверждения оплаты. Цены материалов и работ вы указываете сами; позиции без цены отмечаются отдельно и не входят в итог. Покупка не включает замеры на объекте, проверку инженером или покупку самих материалов.</p>
    </section>

    {state.enabled && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">PRO, продление и отмена</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Доступ PRO предоставляется на один месяц. Автопродление возможно только после отдельного подтверждённого согласия; если согласие не оформлено или функция не одобрена, период не продлевается автоматически. Отменить продление можно в аккаунте до следующего списания. Отмена не удаляет проекты и уже созданные документы.</p>
    </section>}

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">Возвраты и поддержка</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Запрос на возврат рассматривается по обращению в поддержку. Сервис не отказывает в возврате автоматически: порядок, сроки и документы определяются после проверки конкретной оплаты и применимых требований. {state.supportEmail ? <>Напишите: <a className="text-accent-700 underline dark:text-accent-300" href={`mailto:${state.supportEmail}`}>{state.supportEmail}</a>.</> : "Контакт поддержки ещё не опубликован."}</p>
    </section>

    <section className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">Продавец и поддержка</h2>
      {sellerReady ? <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600 dark:text-slate-300"><p>{state.sellerName}</p><p>ИНН {state.sellerInn}</p><p><a className="underline underline-offset-2" href={`mailto:${state.supportEmail}`}>{state.supportEmail}</a></p></div> : <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Сведения продавца будут опубликованы до открытия продаж.</p>}
    </section>
  </main>;
}
