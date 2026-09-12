import { getCuringGroups } from "@/lib/curing-timer/seo-content";

/**
 * Статичная справка по этапам схватывания и высыхания.
 *
 * Серверный компонент: таблица попадает в HTML без JavaScript, поэтому её видят
 * поисковики и answer-движки. Данные — пресеты самого таймера (CURING_PRESETS).
 */
export default function CuringTimerSeo() {
  const groups = getCuringGroups();

  return (
    <section className="page-container pb-4" data-print-hide>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
        Как выбрать интервал для своего материала
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Универсального времени для всей категории нет. Найдите в инструкции именно нужный этап:
        обработку, следующий слой, ходьбу или укладку покрытия. Указанные там условия должны
        соответствовать вашей работе; сам таймер не измеряет влажность и прочность.
      </p>

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span aria-hidden>{group.icon}</span> {group.category}
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th scope="col" className="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">
                      Материал
                    </th>
                    <th scope="col" className="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">
                      Какой этап проверить
                    </th>
                    <th scope="col" className="border-b border-slate-200 py-2 font-semibold dark:border-slate-700">
                      На что смотреть
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.name} className="align-top">
                      <th
                        scope="row"
                        className="border-b border-slate-100 py-3 pr-4 text-left font-medium text-slate-900 dark:border-slate-800 dark:text-slate-100"
                      >
                        {row.name}
                      </th>
                      <td className="border-b border-slate-100 py-3 pr-4 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {row.timing}
                      </td>
                      <td className="border-b border-slate-100 py-3 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {row.tip}
                        {row.source && <a href={row.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 block underline">{row.source.label} ↗</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
