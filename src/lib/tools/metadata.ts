import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { getToolConfig, toolHref } from "./config";

export function buildToolPageMetadata(
  slug: string,
  overrides?: { title?: string; description?: string },
): Metadata {
  const tool = getToolConfig(slug);
  if (!tool) return {};

  const base = buildPageMetadata({
    title: overrides?.title ?? tool.title,
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
