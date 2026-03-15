import type { Metadata } from "next";
import Link from "next/link";
import { ALL_POSTS } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Блог — строительные советы и статьи | ${SITE_NAME}`,
  description: "Статьи о строительстве и ремонте: как правильно рассчитать материалы, технологии укладки плитки, стяжки, гипсокартона. Советы по ГОСТ и СНиП.",
} as const;

const PAGE_URL = `${SITE_URL}/blog/`;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
});

const UI_TEXT = {
  breadcrumbHome: "Калькуляторы",
  breadcrumbCurrent: "Блог",
  heroTitle: "Строительные советы и статьи",
  heroDescription: "Практичные материалы о расчёте стройматериалов, технологиях монтажа и выборе материалов. Всё по ГОСТ и СНиП, без воды.",
  readMore: "Читать →",
  ctaTitle: "Нужен расчёт прямо сейчас?",
  ctaDescription: "Используйте один из 50+ калькуляторов или спросите Михалыча",
  allCalculators: "Все калькуляторы",
  askMikhalych: "Спросить Михалыча",
} as const;

export default function BlogPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-8">
          <nav className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 no-underline transition-colors">{UI_TEXT.breadcrumbHome}</Link>
            <span className="mx-1.5">›</span>
            <span className="text-slate-700 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {UI_TEXT.heroTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            {UI_TEXT.heroDescription}
          </p>
        </div>
      </div>

      {/* Статьи */}
      <div className="page-container-wide py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {ALL_POSTS.map((post) => (
            <article key={post.slug} className="card-hover flex flex-col overflow-hidden">
              {post.heroImage && (
                <Link href={`/blog/${post.slug}/`} className="block">
                  <img
                    src={post.heroImage}
                    alt={post.heroImageAlt}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                </Link>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{post.readTime}</span>
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
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <Link
                    href={`/blog/${post.slug}/`}
                    className="text-sm font-medium text-accent-600 hover:text-accent-700 no-underline transition-colors"
                  >
                    {UI_TEXT.readMore}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 text-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-2">{UI_TEXT.ctaTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
            {UI_TEXT.ctaDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/#calculators" className="btn-primary">
              {UI_TEXT.allCalculators}
            </Link>
            <Link href="/mikhalych/" className="btn-secondary">
              {UI_TEXT.askMikhalych}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}





