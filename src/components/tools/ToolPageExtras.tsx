import Link from "next/link";
import { getToolConfig, toolHref, type ToolFaqItem } from "@/lib/tools/config";
import { SITE_URL } from "@/lib/site";
import RelatedCalculators from "./RelatedCalculators";
import ToolSeoBlock from "./ToolSeoBlock";

interface Props {
  slug: string;
  /** Дополнительный блок перед SEO (например ссылка на методологию) */
  children?: React.ReactNode;
  /** Вопросы, специфичные для страницы, поверх общих из конфига инструмента */
  extraFaq?: ToolFaqItem[];
  /** Дополнительный абзац к «Как пользоваться» */
  extraIntro?: string;
}

export default function ToolPageExtras({ slug, children, extraFaq, extraIntro }: Props) {
  const tool = getToolConfig(slug);
  if (!tool) return null;

  const pageUrl = `${SITE_URL}${toolHref(slug)}`;
  // Один FAQPage на страницу: общие вопросы инструмента + страничные.
  const faq = extraFaq?.length ? [...tool.faq, ...extraFaq] : tool.faq;
  const intro = extraIntro ? `${tool.seoIntro} ${extraIntro}` : tool.seoIntro;

  return (
    <div className="page-container pb-12">
      {children}
      <RelatedCalculators refs={tool.relatedCalculators} />
      <ToolSeoBlock intro={intro} faq={faq} pageUrl={pageUrl} />
      <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Результаты инструментов носят справочный характер. Для закупки материалов и смет используйте{" "}
        <Link href="/metodologiya/" className="text-accent-700 hover:underline dark:text-accent-400">
          методологию расчётов
        </Link>
        {" "}и профильные калькуляторы выше.
      </p>
    </div>
  );
}
