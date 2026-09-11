import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import type { BlogPost } from "@/lib/blog";

export interface TagCalculatorLink {
  slug: string;
  categorySlug: string;
  title: string;
}

/**
 * Калькуляторы, связанные со статьями подборки тега.
 *
 * Берём `relatedCalculator` статей, убираем повторы и проверяем slug по каталогу:
 * ссылка на несуществующий калькулятор хуже, чем отсутствие ссылки. Заголовок
 * тоже берём из каталога — в статье хранится только slug.
 */
export function getTagCalculatorLinks(
  posts: Array<Pick<BlogPost, "relatedCalculator">>,
  limit = 5,
): TagCalculatorLink[] {
  const links: TagCalculatorLink[] = [];
  for (const post of posts) {
    const ref = post.relatedCalculator;
    if (!ref) continue;
    if (links.some((item) => item.slug === ref.slug)) continue;
    const meta = ALL_CALCULATORS_META.find((item) => item.slug === ref.slug);
    if (!meta) continue;
    links.push({ slug: ref.slug, categorySlug: meta.categorySlug, title: meta.title });
  }
  return links.slice(0, limit);
}
