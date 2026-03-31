import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import BlogPostGrid from "@/components/blog/BlogPostGrid";

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
  ctaDescription: "Используйте один из 61+ калькуляторов или спросите Михалыча",
  allCalculators: "Все калькуляторы",
  askMikhalych: "Спросить Михалыча",
} as const;

async function BlogCollectionJsonLd() {
  const allPosts = await getAllPosts();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: META.title,
    description: META.description,
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: allPosts.length,
      itemListElement: allPosts.slice(0, 20).map((post, i) => ({
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
        { "@type": "ListItem", position: 2, name: "Блог", item: PAGE_URL },
      ],
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default async function BlogPage() {
  const allPosts = await getAllPosts();

  return (
    <div>
      <BlogCollectionJsonLd />
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
        <BlogPostGrid
          posts={allPosts.map(({ slug, title, description, category, readTime, date, heroImage, heroImageAlt }) => ({
            slug, title, description, category, readTime, date, heroImage, heroImageAlt,
          }))}
          readMoreText={UI_TEXT.readMore}
        />

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
