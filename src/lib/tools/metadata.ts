import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { getToolConfig, toolHref, type ToolConfig } from "./config";

/**
 * SEO-title инструмента по единой системе сайта:
 *   «[Название инструмента] онлайн»
 * Брендовый « — Мастерок» добавит layout template; здесь возвращаем чистый base.
 * Если у инструмента задан явный seoTitle — используем его без модификаций.
 */
function buildSeoTitle(tool: ToolConfig): string {
  if (tool.seoTitle) return tool.seoTitle;
  // Если в UI-title уже есть «онлайн» — не дублируем.
  if (/\bонлайн\b/i.test(tool.title)) return tool.title;
  return `${tool.title} онлайн`;
}

export function buildToolPageMetadata(
  slug: string,
  overrides?: { title?: string; description?: string },
): Metadata {
  const tool = getToolConfig(slug);
  if (!tool) return {};

  const base = buildPageMetadata({
    title: overrides?.title ?? buildSeoTitle(tool),
    description: overrides?.description ?? tool.description,
    url: `${SITE_URL}${toolHref(slug)}`,
  });

  if (tool.noindex) {
    return {
      ...base,
      robots: { index: false, follow: true },
    };
  }

  return base;
}
