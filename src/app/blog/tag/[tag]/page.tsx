import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTags, getPostsByTag, resolveTagFromSlug, tagToSlug } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbBlog: "Блог",
  postsCount: (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return `${n} статья`;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return `${n} статьи`;
    return `${n} статей`;
  },
  readMore: "Читать →",
  allTags: "Все темы",
  backToBlog: "← Все статьи",
} as const;

// dynamicParams: false → неизвестные tag возвращают 404 (через notFound())
export const dynamicParams = false;

// ISR: ревалидация раз в час — теги синхронизируются с обновлениями постов.
export const revalidate = 3600;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag: tagToSlug(tag) }));
}

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const allTags = await getAllTags();
  const tag = resolveTagFromSlug(tagSlug, allTags);
  if (!tag) {
    return {
      title: `Статьи`,
      robots: { index: false, follow: false },
    };
  }
  const posts = await getPostsByTag(tag);
  // Description ограничен ~155 символами — больше Google режет в SERP с многоточием.
  // Если короткие заголовки уместятся, добавляем хвост «и другие материалы»; иначе
  // обрезаем по слову.
  const fullDescription =
    `Статьи по теме «${tag}»: ${posts.slice(0, 3).map((p) => p.title).join(", ")}. Практические советы и расчёты.`;
  const description = fullDescription.length <= 160
    ? fullDescription
    : `Статьи на тему «${tag}»: ${posts.length} материал${posts.length === 1 ? "" : posts.length < 5 ? "а" : "ов"} с расчётами материалов, нормами по ГОСТ и пошаговыми инструкциями.`;
  return buildPageMetadata({
    title: `${tag} — статьи о строительстве`,
    description,
    url: `${SITE_URL}/blog/tag/${tagToSlug(tag)}/`,
  });
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const allTags = await getAllTags();
  const tag = resolveTagFromSlug(tagSlug, allTags);
  if (!tag) notFound();

  const posts = await getPostsByTag(tag);
  if (posts.length === 0) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${tag} — статьи`,
    url: `${SITE_URL}/blog/tag/${tagToSlug(tag)}/`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/blog/${post.slug}/`,
        name: post.title,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_URL}/blog/` },
        { "@type": "ListItem", position: 3, name: tag, item: `${SITE_URL}/blog/tag/${tagToSlug(tag)}/` },
      ],
    },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
            <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300 no-underline">{UI_TEXT.breadcrumbHome}</Link>
            <span>/</span>
            <Link href="/blog/" className="hover:text-slate-700 dark:hover:text-slate-300 no-underline">{UI_TEXT.breadcrumbBlog}</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">{tag}</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {tag}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{UI_TEXT.postsCount(posts.length)}</p>
        </div>
      </div>

      <div className="page-container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Posts grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {posts.map((post) => (
                <article key={post.slug} className="card-hover flex flex-col overflow-hidden">
                  {post.heroImage && (
                    <Link href={`/blog/${post.slug}/`} className="block">
                      <Image
                        src={post.heroImage}
                        alt={post.heroImageAlt || post.title}
                        className="w-full h-40 object-cover"
                        width={400}
                        height={160}
                        loading="lazy"
                      />
                    </Link>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{post.icon}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{post.readTime}</span>
                    </div>
                    <Link href={`/blog/${post.slug}/`} className="no-underline group">
                      <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1 group-hover:text-accent-700 transition-colors">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1">
                      {post.description}
                    </p>
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="text-accent-700 text-xs font-medium mt-3 no-underline hover:underline"
                    >
                      {UI_TEXT.readMore}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/blog/" className="text-sm text-accent-700 hover:underline no-underline">
                {UI_TEXT.backToBlog}
              </Link>
            </div>
          </div>

          {/* Tags sidebar */}
          <aside className="lg:w-64 shrink-0">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {UI_TEXT.allTags}
            </h2>
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <Link
                  key={t}
                  href={`/blog/tag/${tagToSlug(t)}/`}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border no-underline transition-colors ${
                    t === tag
                      ? "border-accent-300 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
