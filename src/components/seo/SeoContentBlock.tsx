/**
 * SeoContentBlock — серверный компонент для размещения SEO/GEO/AEO-контента
 * под основным интерфейсом калькулятора.
 *
 * Рендерит:
 *  1. Экспертное описание формулы (чистый HTML, не Markdown)
 *  2. FAQ в аккордеоне на <details>/<summary>
 *
 * Контент виден поисковикам и пользователям, свёрнут по умолчанию.
 */

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoContentBlockProps {
  /** Уникальный ID калькулятора (для генерации ключей) */
  calculatorId: string;
  /** HTML-строка с экспертным описанием формулы, норм и практики */
  descriptionHtml: string;
  /** Массив вопросов-ответов для FAQ */
  faq: FaqItem[];
  /** Заголовок блока описания (по умолчанию «Как устроен расчёт») */
  descriptionTitle?: string;
}

export default function SeoContentBlock({
  calculatorId,
  descriptionHtml,
  faq,
  descriptionTitle = "Как устроен расчёт",
}: SeoContentBlockProps) {
  if (!descriptionHtml && faq.length === 0) return null;

  return (
    <section
      aria-label="Справка по расчётам и частые вопросы"
      className="mt-8 space-y-6"
    >
      {/* ── Экспертное описание ── */}
      {descriptionHtml && (
        <details className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <span className="flex items-center gap-2">
              <span className="text-base">📐</span>
              {descriptionTitle}
            </span>
            <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg">+</span>
          </summary>
          <div
            className="px-5 pb-5 prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-slate-900 dark:prose-headings:text-slate-100
              prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
              prose-ul:text-slate-600 dark:prose-ul:text-slate-300
              prose-strong:text-slate-800 dark:prose-strong:text-slate-200
              prose-table:text-sm prose-th:bg-slate-100 dark:prose-th:bg-slate-800
              prose-td:border-slate-200 dark:prose-td:border-slate-700
              border-t border-slate-200 dark:border-slate-700 pt-4"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </details>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-base">❓</span>
            Частые вопросы
          </h2>
          {faq.map((item, i) => (
            <details
              key={`${calculatorId}-seo-faq-${i}`}
              className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3"
            >
              <summary className="relative cursor-pointer list-none pr-6 font-medium text-slate-900 dark:text-slate-100">
                {item.question}
                <span className="absolute right-0 top-0 text-slate-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div
                data-faq-answer
                className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300
                  prose prose-sm dark:prose-invert max-w-none
                  prose-p:text-slate-600 dark:prose-p:text-slate-300
                  prose-strong:text-slate-800 dark:prose-strong:text-slate-200
                  prose-ul:text-slate-600 dark:prose-ul:text-slate-300"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
