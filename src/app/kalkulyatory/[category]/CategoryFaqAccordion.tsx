import type { CategoryFaqItem } from "@/lib/calculators/category-faq";

interface Props {
  items: CategoryFaqItem[];
}

/**
 * FAQ категории на нативных <details>.
 *
 * Раньше это был клиентский аккордеон на useState: ответ попадал в разметку
 * только после клика. Из-за этого ответов не было в HTML (поисковик и
 * answer-движки видели вопросы без ответов), а FAQPage-разметка страницы
 * описывала текст, которого в видимом контенте нет. <details> рендерится
 * сервером целиком, работает без JavaScript и не требует состояния.
 */
export default function CategoryFaqAccordion({ items }: Props) {
  return (
    <div className="space-y-3 max-w-3xl">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
        >
          <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-750">
            <h3 className="text-base font-medium">{item.question}</h3>
            <svg
              className="shrink-0 w-5 h-5 text-slate-400 transition-transform duration-200 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
