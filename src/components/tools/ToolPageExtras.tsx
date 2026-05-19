import Link from "next/link";
import { getToolConfig, toolHref } from "@/lib/tools/config";
import { SITE_URL } from "@/lib/site";
import RelatedCalculators from "./RelatedCalculators";
import ToolSeoBlock from "./ToolSeoBlock";

interface Props {
  slug: string;
  /** Дополнительный блок перед SEO (например ссылка на методологию) */
  children?: React.ReactNode;
}

export default function ToolPageExtras({ slug, children }: Props) {
  const tool = getToolConfig(slug);
  if (!tool) return null;

  const pageUrl = `${SITE_URL}${toolHref(slug)}`;

  return (
    <div className="page-container pb-12">
      {children}
      <RelatedCalculators refs={tool.relatedCalculators} />
      <ToolSeoBlock intro={tool.seoIntro} faq={tool.faq} pageUrl={pageUrl} />
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
