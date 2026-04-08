"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface BlogPostData {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  date: string;
  heroImage?: string;
  heroImageAlt?: string;
}

interface Props {
  posts: BlogPostData[];
  readMoreText: string;
}

export default function BlogPostGrid({ posts, readMoreText }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(posts.map((p) => p.category));
    return [...cats].sort();
  }, [posts]);

  const filtered = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts;

  return (
    <>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            activeCategory === null
              ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
          }`}
        >
          Все ({posts.length})
        </button>
        {categories.map((cat) => {
          const count = posts.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                activeCategory === cat
                  ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((post) => (
          <article key={post.slug} className="card-hover flex flex-col overflow-hidden">
            {post.heroImage && (
              <Link href={`/blog/${post.slug}/`} className="block">
                <img
                  src={post.heroImage}
                  alt={post.heroImageAlt ?? post.title}
                  className="w-full h-40 object-cover"
                  width={400}
                  height={160}
                  loading="lazy"
                />
              </Link>
            )}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                  {post.category}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-400 ml-auto">{post.readTime}</span>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug text-sm flex-1">
                <Link href={`/blog/${post.slug}/`} className="no-underline hover:text-accent-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {post.description}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <Link
                  href={`/blog/${post.slug}/`}
                  className="text-sm font-medium text-accent-600 hover:text-accent-700 no-underline transition-colors"
                >
                  {readMoreText}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
