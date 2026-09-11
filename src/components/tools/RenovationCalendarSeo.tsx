import Link from "next/link";
import {
  ORDER_RULES,
  getScenarioSummaries,
} from "@/lib/renovation-calendar/seo-content";

/**
 * Статичный справочный блок страницы «Календарь ремонта».
 *
 * Серверный компонент: таблица этапов и правила очерёдности попадают в HTML
 * без JavaScript, поэтому их видят поисковики и answer-движки. Данные берутся
 * из RENOVATION_SCENARIOS — те же, что использует сам календарь.
 */
export default function RenovationCalendarSeo() {
  const scenarios = getScenarioSummaries();

  return (
    <section className="mt-10 space-y-8" data-print-hide>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Этапы ремонта по сценариям
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Интервалы считаются в днях от даты старта. Это ориентир для планирования закупки и
          порядка работ, а не норматив: реальные сроки зависят от толщины слоёв, температуры и
          паспорта конкретной смеси.
        </p>
      </div>

      <div className="space-y-6">
        {scenarios.map((scenario) => (
          <article key={scenario.id} className="card p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {scenario.title} — {scenario.durationLabel}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {scenario.description}
            </p>
            <ol className="mt-4 space-y-2.5">
              {scenario.rows.map((row) => (
                <li key={`${scenario.id}-${row.title}`} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-32 sm:pt-0.5 dark:text-slate-400">
                    {row.period}
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <strong className="font-semibold text-slate-900 dark:text-slate-100">
                      {row.title}
                    </strong>
                    {" — "}
                    {row.summary}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Почему этапы идут именно так
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Очерёдность в календаре — не удобство интерфейса, а технологическая цепочка. Каждое
          правило ниже объясняет, что ломается, если поменять этапы местами.
        </p>
        <ul className="mt-4 space-y-3">
          {ORDER_RULES.map((rule) => (
            <li key={rule.title} className="card p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {rule.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {rule.text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Нужен список работ по этапу — откройте{" "}
        <Link href="/instrumenty/chek-listy/" className="text-accent-700 hover:underline dark:text-accent-400">
          чек-листы
        </Link>
        . Нужен объём материалов — считайте в{" "}
        <Link href="/kalkulyatory/" className="text-accent-700 hover:underline dark:text-accent-400">
          профильных калькуляторах
        </Link>
        . Нужна сводная закупка и бюджет — в{" "}
        <Link href="/instrumenty/moy-remont/" className="text-accent-700 hover:underline dark:text-accent-400">
          мастере «Мой ремонт»
        </Link>{" "}
        и{" "}
        <Link href="/instrumenty/stoimost-remonta/" className="text-accent-700 hover:underline dark:text-accent-400">
          калькуляторе стоимости ремонта
        </Link>
        .
      </p>
    </section>
  );
}
