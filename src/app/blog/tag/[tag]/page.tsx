import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTags, getPostsByTag, resolveTagFromSlug, tagToSlug } from "@/lib/blog";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { BLOG_TAG_MIN_POSTS_FOR_INDEX, SITE_URL } from "@/lib/site";
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

// New CMS tags can appear without rebuilding. Unknown tags still use notFound().
export const dynamicParams = true;
export const dynamic = "force-dynamic";

export const revalidate = 60;

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const allTags = await getAllTags();
  const tag = resolveTagFromSlug(tagSlug, allTags);
  if (!tag) {
    notFound();
  }
  const posts = await getPostsByTag(tag);
  const indexable = posts.length >= BLOG_TAG_MIN_POSTS_FOR_INDEX;
  // Описание должно попадать в 120–165 символов: короче — поисковик дополнит
  // текст сам, длиннее — обрежет. Вариант с заголовками статей подходит не
  // всегда, поэтому он проверяется целиком, а не только по верхней границе.
  const word = posts.length === 1 ? "материал" : posts.length < 5 ? "материала" : "материалов";
  const titlesVariant =
    `Статьи по теме «${tag}»: ${posts.slice(0, 3).map((p) => p.title).join(", ")}. Практические советы и расчёты.`;
  const countVariant =
    `Статьи на тему «${tag}»: ${posts.length} ${word} с расчётами материалов, рекомендациями по выбору и пошаговыми инструкциями. Считайте в калькуляторах Мастерка.`;
  const description =
    titlesVariant.length >= 120 && titlesVariant.length <= 165 ? titlesVariant : countVariant;
  return {
    ...buildPageMetadata({
      title: `Статьи на тему «${tag}»`,
      description,
      url: `${SITE_URL}/blog/tag/${tagToSlug(tag)}/`,
    }),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
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
            {/* Пояснение к подборке: без него страница тега — только сетка карточек,
                и поисковику нечего показать в сниппете. */}
            <p className="mb-5 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Подборка материалов по теме «{tag}»: {UI_TEXT.postsCount(posts.length)} с расчётами,
              выбором материалов и практикой монтажа. Ниже — статьи, а следом калькуляторы, которые
              считают материалы для этих работ в цифрах.
            </p>
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

          {/* Калькуляторы по теме: агрегируем relatedCalculator статей подборки,
              чтобы страница тега вела не только в блог, но и к расчётам. */}
          {(() => {
            const related: Array<{ slug: string; categorySlug: string; title: string }> = [];
            for (const post of posts) {
              const ref = post.relatedCalculator;
              if (!ref) continue;
              if (related.some((item) => item.slug === ref.slug)) continue;
              // Только существующие калькуляторы: битая ссылка в подборке хуже,
              // чем отсутствие ссылки.
              const meta = ALL_CALCULATORS_META.find((item) => item.slug === ref.slug);
              if (!meta) continue;
              related.push({ slug: ref.slug, categorySlug: meta.categorySlug, title: meta.title });
            }
            if (related.length === 0) return null;
            return (
              <section className="mt-8" aria-label="Калькуляторы по теме">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Калькуляторы по теме
                </h2>
                <ul className="space-y-2">
                  {related.slice(0, 5).map((ref) => (
                    <li key={ref.slug}>
                      <Link
                        href={`/kalkulyatory/${ref.categorySlug}/${ref.slug}/`}
                        className="text-sm text-accent-700 no-underline hover:underline dark:text-accent-400"
                      >
                        {ref.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

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
