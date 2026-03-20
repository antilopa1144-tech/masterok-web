/**
 * SeoContentBlock — единый компонент для всего справочного контента калькулятора.
 *
 * Объединяет: формулы, how-to, FAQ (inline + seo), экспертное описание.
 * Всё в аккордеонах — компактно, не перегружает страницу.
 * Контент виден поисковикам (HTML в DOM, не скрыт через JS).
 */

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoContentBlockProps {
  calculatorId: string;
  descriptionHtml: string;
  faq: FaqItem[];
  formulaDescription?: string;
  howToUse?: string[];
  inlineFaq?: FaqItem[];
  accentColor?: string;
  descriptionTitle?: string;
}

/** Convert markdown-like bold (**text**) to <strong> */
function formatFormula(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^(- .+)$/gm, "<li>$1</li>")
    .replace(/<li>- /g, "<li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

/** Deduplicate FAQ items by question text */
function deduplicateFaq(items: FaqItem[]): FaqItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function AccordionItem({ id, title, icon, children, defaultOpen }: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
      open={defaultOpen}
    >
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <span className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          {title}
        </span>
        <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
      </summary>
      <div className="border-t border-slate-200 dark:border-slate-700">
        {children}
      </div>
    </details>
  );
}

export default function SeoContentBlock({
  calculatorId,
  descriptionHtml,
  faq,
  formulaDescription,
  howToUse,
  inlineFaq,
  accentColor = "#f97316",
}: SeoContentBlockProps) {
  // Merge and deduplicate FAQ from both sources
  const allFaq = deduplicateFaq([...(inlineFaq ?? []), ...faq]);

  const hasFormula = Boolean(formulaDescription?.trim());
  const hasHowTo = Boolean(howToUse && howToUse.length > 0);
  const hasDescription = Boolean(descriptionHtml?.trim());
  const hasFaq = allFaq.length > 0;

  if (!hasFormula && !hasHowTo && !hasDescription && !hasFaq) return null;

  return (
    <section aria-label="Справка и частые вопросы" className="space-y-3">
      {/* Как пользоваться — открыт по умолчанию, самый полезный для пользователя */}
      {hasHowTo && (
        <AccordionItem id={`${calculatorId}-howto`} title="Как пользоваться" icon="📋" defaultOpen>
          <ol className="px-5 py-4 space-y-2.5">
            {howToUse!.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="flex w-6 h-6 rounded-full text-xs font-bold items-center justify-center shrink-0 mt-0.5 text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {i + 1}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </AccordionItem>
      )}

      {/* Формулы и нормативная база */}
      {hasFormula && (
        <AccordionItem id={`${calculatorId}-formula`} title="Формулы и нормы расчёта" icon="📐">
          <div
            className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-slate-900 dark:prose-headings:text-slate-100
              prose-h2:text-base prose-h2:font-semibold prose-h2:mt-3 prose-h2:mb-2
              prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-2
              prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:my-0.5
              prose-strong:text-slate-800 dark:prose-strong:text-slate-200"
            dangerouslySetInnerHTML={{ __html: `<p>${formatFormula(formulaDescription!.trim())}</p>` }}
          />
        </AccordionItem>
      )}

      {/* Экспертное описание (seoContent) */}
      {hasDescription && (
        <AccordionItem id={`${calculatorId}-expert`} title="Как устроен расчёт" icon="🔍">
          <div
            className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-slate-900 dark:prose-headings:text-slate-100
              prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
              prose-ul:text-slate-600 dark:prose-ul:text-slate-300
              prose-strong:text-slate-800 dark:prose-strong:text-slate-200
              prose-table:text-sm prose-th:bg-slate-100 dark:prose-th:bg-slate-800
              prose-td:border-slate-200 dark:prose-td:border-slate-700"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </AccordionItem>
      )}

      {/* FAQ — объединённый, без дубликатов */}
      {hasFaq && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
            <span>❓</span>
            Частые вопросы
          </h2>
          {allFaq.map((item, i) => (
            <details
              key={`${calculatorId}-faq-${i}`}
              className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3"
            >
              <summary className="relative cursor-pointer list-none pr-6 text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.question}
                <span className="absolute right-0 top-0 text-slate-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div
                data-faq-answer
                className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300
                  prose prose-sm dark:prose-invert max-w-none
                  prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:my-2
                  prose-strong:text-slate-800 dark:prose-strong:text-slate-200
                  prose-ul:text-slate-600 dark:prose-ul:text-slate-300 prose-ul:my-2
                  prose-li:my-0.5"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
