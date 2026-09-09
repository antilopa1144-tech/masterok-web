"use client";

import { useState, useMemo, useId } from "react";
import { blogCategoryLabel, getBlogCategories } from "@/lib/blog-categories";
import Image from "next/image";
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
  const categoryId = useId();

  const categories = useMemo(() => getBlogCategories(posts), [posts]);

  const filtered = activeCategory
    ? posts.filter((p) => blogCategoryLabel(p.category) === activeCategory)
    : posts;

  return (
    <>
      {/* Category filters */}
      <div className="mb-4 sm:hidden">
        <label htmlFor={categoryId} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Тема статьи</label>
        <select id={categoryId} value={activeCategory ?? ""} onChange={event => setActiveCategory(event.target.value || null)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
          <option value="">Все темы ({posts.length})</option>
          {categories.map(({ label, count }) => <option key={label} value={label}>{label} ({count})</option>)}
        </select>
      </div>
      <div role="group" aria-label="Темы статей" className="hidden sm:flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          aria-pressed={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          className={`min-h-11 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            activeCategory === null
              ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
          }`}
        >
          Все ({posts.length})
        </button>
        {categories.map(({ label: cat, count }) => {
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`min-h-11 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                activeCategory === cat
                  ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
            </button>
          );
        })}
      </div>
      <p role="status" className="mb-5 text-sm text-slate-600 dark:text-slate-300">Показано статей: {filtered.length} из {posts.length}</p>
      {filtered.length === 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
          <p className="text-slate-700 dark:text-slate-200">В этой теме пока нет статей.</p>
          {activeCategory && <button type="button" onClick={() => setActiveCategory(null)} className="mt-3 min-h-11 text-sm font-semibold text-accent-700 dark:text-accent-300">Показать все статьи</button>}
        </div>
      )}

      {/* Posts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((post) => (
          <article key={post.slug} className="card-hover flex flex-col overflow-hidden">
            {post.heroImage && (
              <Link href={`/blog/${post.slug}/`} className="block">
                <Image
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
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                  {blogCategoryLabel(post.category)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-400 ml-auto">{post.readTime}</span>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug text-base flex-1">
                <Link href={`/blog/${post.slug}/`} className="no-underline hover:text-accent-700 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {post.description}
              </p>
              <div className="flex flex-wrap gap-2 items-center justify-between mt-auto">
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <Link
                  href={`/blog/${post.slug}/`}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-accent-700 hover:text-accent-800 dark:text-accent-300 no-underline transition-colors"
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
