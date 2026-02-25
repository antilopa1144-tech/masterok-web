import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_POSTS, getPostBySlug } from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ALL_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Статья не найдена" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

  return {
    title: `${post.title} | Мастерок`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
      url: `${baseUrl}/blog/${post.slug}/`,
    },
  };
}

/** Рендерит markdown-like текст в React-элементы */
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
          <p key={key++} className="text-slate-700 leading-relaxed mb-4">
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
            <li key={i} className="text-slate-700 leading-relaxed">
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

    // Heading ##
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-slate-900 mt-8 mb-3"
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }

    // Heading ###
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h3
          key={key++}
          className="text-lg font-semibold text-slate-800 mt-6 mb-2"
        >
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    // List item
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      currentList.push(trimmed.slice(2));
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      currentList.push(trimmed);
      continue;
    }

    // Empty line — paragraph break
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular text
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return elements;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

  // Article JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "Мастерок",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Мастерок",
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}/`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="page-container py-6 max-w-3xl">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-4 flex-wrap">
            <Link href="/" className="hover:text-slate-600 no-underline">
              Главная
            </Link>
            <span>/</span>
            <Link
              href="/blog/"
              className="hover:text-slate-600 no-underline"
            >
              Блог
            </Link>
            <span>/</span>
            <span className="text-slate-600">{post.title}</span>
          </nav>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-2xl">{post.icon}</span>
            <span className="badge bg-slate-100 text-slate-600 border-0 text-xs">
              {post.category}
            </span>
            <span className="text-xs text-slate-400">{post.readTime}</span>
            <span className="text-xs text-slate-400">
              {new Date(post.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-2xl">
            {post.description}
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="page-container py-8 max-w-3xl">
        <div className="prose-custom">{renderContent(post.content)}</div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400">Теги:</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA — related calculator */}
        {post.relatedCalculator && (
          <div className="mt-8 bg-accent-50 border border-accent-200 rounded-2xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900 mb-1">
              Рассчитайте материалы онлайн
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Используйте наш калькулятор для точного расчёта по ГОСТ и СНиП
            </p>
            <Link
              href={`/kalkulyatory/${post.relatedCalculator.categorySlug}/${post.relatedCalculator.slug}/`}
              className="btn-primary no-underline"
            >
              {post.relatedCalculator.label} →
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/blog/"
            className="btn-secondary flex-1 text-center no-underline"
          >
            ← Все статьи
          </Link>
          <Link href="/#calculators" className="btn-secondary flex-1 text-center no-underline">
            Все калькуляторы
          </Link>
        </div>
      </article>
    </div>
  );
}
