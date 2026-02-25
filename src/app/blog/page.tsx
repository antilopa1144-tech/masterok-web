import type { Metadata } from "next";
import Link from "next/link";
import { ALL_POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Блог — строительные советы и статьи | Мастерок",
  description:
    "Статьи о строительстве и ремонте: как правильно рассчитать материалы, технологии укладки плитки, стяжки, гипсокартона. Советы по ГОСТ и СНиП.",
};

export default function BlogPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="page-container-wide py-8">
          <nav className="text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-slate-600 no-underline transition-colors">Калькуляторы</Link>
            <span className="mx-1.5">›</span>
            <span className="text-slate-700">Блог</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Строительные советы и статьи
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Практичные материалы о расчёте стройматериалов, технологиях монтажа и выборе
            материалов. Всё по ГОСТ и СНиП, без воды.
          </p>
        </div>
      </div>

      {/* Статьи */}
      <div className="page-container-wide py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {ALL_POSTS.map((post) => (
            <article key={post.slug} className="card-hover p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{post.icon}</span>
                <span className="badge bg-slate-100 text-slate-600 border-0 text-xs">
                  {post.category}
                </span>
                <span className="text-xs text-slate-400 ml-auto">{post.readTime}</span>
              </div>
              <h2 className="font-bold text-slate-900 mb-2 leading-snug text-sm flex-1">
                <Link href={`/blog/${post.slug}/`} className="no-underline hover:text-accent-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {post.description}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-slate-400">
                  {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <Link
                  href={`/blog/${post.slug}/`}
                  className="text-sm font-medium text-accent-600 hover:text-accent-700 no-underline transition-colors"
                >
                  Читать →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 bg-slate-800 rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Нужен расчёт прямо сейчас?</h2>
          <p className="text-slate-400 mb-4 text-sm">
            Используйте один из 50+ калькуляторов или спросите Михалыча
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/#calculators" className="btn-primary">
              Все калькуляторы
            </Link>
            <Link href="/mikhalych/" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
              Спросить Михалыча
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
