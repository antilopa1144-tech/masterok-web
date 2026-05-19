import type { ToolFaqItem } from "@/lib/tools/config";

interface Props {
  intro: string;
  faq: ToolFaqItem[];
  /** Для FAQPage schema */
  pageUrl?: string;
}

export default function ToolSeoBlock({ intro, faq, pageUrl }: Props) {
  const faqLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
          ...(pageUrl ? { url: pageUrl } : {}),
        }
      : null;

  if (!intro && faq.length === 0) return null;

  return (
    <section className="mt-10 space-y-6" data-print-hide>
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      {intro && (
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 not-prose mb-2">
            Как пользоваться
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{intro}</p>
        </div>
      )}
      {faq.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Частые вопросы</h2>
          <ul className="space-y-3">
            {faq.map((item) => (
              <li key={item.question} className="card p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5" data-faq-answer>
                  {item.question}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
