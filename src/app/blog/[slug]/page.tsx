import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCalculatorBySlug } from "@/lib/calculators";
import { SITE_EXPERT, SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { ALL_POSTS, getPostBySlug } from "@/lib/blog";

const UI_TEXT = {
  notFoundTitle: "Статья не найдена",
  breadcrumbHome: "Главная",
  breadcrumbBlog: "Блог",
  tagsLabel: "Теги:",
  articleCtaTitle: "Рассчитайте материалы онлайн",
  articleCtaDescription: "Используйте наш калькулятор для точного расчёта по ГОСТ и СНиП",
  allArticles: "← Все статьи",
  allCalculators: "Все калькуляторы",
  calculatorCtaFallback: "Открыть калькулятор",
  relatedPostsTitle: "Читайте также",
  relatedPostsReadMore: "Читать →",
} as const;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ALL_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: UI_TEXT.notFoundTitle };

  const baseUrl = SITE_URL;

  const title = `${post.title} | ${SITE_NAME}`;
  const description = post.description;
  const canonicalUrl = `${baseUrl}/blog/${post.slug}/`;

  return buildPageMetadata({
    title,
    openGraphTitle: post.title,
    twitterTitle: title,
    description,
    url: canonicalUrl,
    type: "article",
    publishedTime: post.date,
    tags: post.tags,
    image: post.heroImage || undefined,
  });
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        elements.push(
          <p key={key++} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {text}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-outside pl-5 mb-5 space-y-1.5">
          {currentList.map((item, i) => (
            <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("![")) {
      flushParagraph();
      flushList();
      const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (match) {
        elements.push(
          <figure key={key++} className="my-6">
            <img
              src={match[2]}
              alt={match[1]}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
              loading="lazy"
            />
            {match[1] && (
              <figcaption className="text-center text-sm text-slate-400 dark:text-slate-500 mt-2">
                {match[1]}
              </figcaption>
            )}
          </figure>
        );
      }
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-3"
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h3
          key={key++}
          className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2"
        >
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      currentList.push(trimmed.slice(2));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      currentList.push(trimmed);
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return elements;
}

function getRelatedPosts(post: { slug: string; category: string; tags: string[] }) {
  // Prefer posts from the same category or with overlapping tags
  const candidates = ALL_POSTS
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      const categoryMatch = p.category === post.category ? 2 : 0;
      const tagOverlap = p.tags.filter((t) => post.tags.includes(t)).length;
      return { post: p, score: categoryMatch + tagOverlap };
    })
    .sort((a, b) => b.score - a.score);

  const related = candidates.slice(0, 3).map((c) => c.post);

  // If not enough, fill with recent posts
  if (related.length < 3) {
    const remaining = ALL_POSTS
      .filter((p) => p.slug !== post.slug && !related.some((r) => r.slug === p.slug))
      .slice(0, 3 - related.length);
    related.push(...remaining);
  }

  return related;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const baseUrl = SITE_URL;
  const relatedCalculatorDef = post.relatedCalculator
    ? getCalculatorBySlug(post.relatedCalculator.slug)
    : undefined;

  const relatedPosts = getRelatedPosts(post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    wordCount: post.content.split(/\s+/).length,
    articleSection: post.category,
    author: {
      "@type": "Person",
      name: SITE_EXPERT.name,
      jobTitle: SITE_EXPERT.jobTitle,
      url: `${baseUrl}/o-spetsialiste/`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}/`,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["article h1", "article p:first-of-type"],
    },
    keywords: post.tags.join(", "),
    image: post.heroImage ? {
      "@type": "ImageObject",
      url: post.heroImage,
      width: 1200,
      height: 630,
    } : undefined,
    inLanguage: "ru",
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${baseUrl}/blog/` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${baseUrl}/blog/${post.slug}/` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6 max-w-3xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 no-underline">
              {UI_TEXT.breadcrumbHome}
            </Link>
            <span>/</span>
            <Link
              href="/blog/"
              className="hover:text-slate-600 dark:hover:text-slate-300 no-underline"
            >
              {UI_TEXT.breadcrumbBlog}
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{post.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-2xl">{post.icon}</span>
            <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
              {post.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{post.readTime}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(post.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed max-w-2xl">
            {post.description}
          </p>

          {post.heroImage && (
            <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={post.heroImage}
                alt={post.heroImageAlt}
                className="w-full h-48 sm:h-64 md:h-80 object-cover"
                width={800}
                height={320}
                loading="eager"
                fetchPriority="high"
              />
            </div>
          )}
        </div>
      </div>

      <article className="page-container py-8 max-w-3xl">
        <div className="prose-custom">{renderContent(post.content)}</div>

        {post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400 dark:text-slate-500">{UI_TEXT.tagsLabel}</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {post.relatedCalculator && (
          <div className="mt-8 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 rounded-2xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {UI_TEXT.articleCtaTitle}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300 mb-4">
              {UI_TEXT.articleCtaDescription}
            </p>
            <Link
              href={`/kalkulyatory/${post.relatedCalculator.categorySlug}/${post.relatedCalculator.slug}/`}
              className="btn-primary no-underline"
            >
              {relatedCalculatorDef?.title ?? UI_TEXT.calculatorCtaFallback} →
            </Link>
          </div>
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">
              {UI_TEXT.relatedPostsTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <article
                  key={rp.slug}
                  className="card-hover flex flex-col overflow-hidden"
                >
                  {rp.heroImage && (
                    <Link href={`/blog/${rp.slug}/`} className="block">
                      <img
                        src={rp.heroImage}
                        alt={rp.heroImageAlt}
                        className="w-full h-32 object-cover"
                        width={400}
                        height={128}
                        loading="lazy"
                      />
                    </Link>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                        {rp.category}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                        {rp.readTime}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug text-sm flex-1">
                      <Link
                        href={`/blog/${rp.slug}/`}
                        className="no-underline hover:text-accent-600 transition-colors"
                      >
                        {rp.title}
                      </Link>
                    </h3>
                    <Link
                      href={`/blog/${rp.slug}/`}
                      className="text-sm font-medium text-accent-600 hover:text-accent-700 no-underline transition-colors mt-auto"
                    >
                      {UI_TEXT.relatedPostsReadMore}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/blog/"
            className="btn-secondary flex-1 text-center no-underline"
          >
            {UI_TEXT.allArticles}
          </Link>
          <Link href="/#calculators" className="btn-secondary flex-1 text-center no-underline">
            {UI_TEXT.allCalculators}
          </Link>
        </div>
      </article>
    </div>
  );
}




