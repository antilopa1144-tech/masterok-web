import React from "react";
import Link from "next/link";

const POPULAR_DESTINATIONS = [
  {
    href: "/blog/",
    icon: "📚",
    title: "Все статьи",
    description: "Практические материалы о ремонте, выборе и расчёте материалов.",
  },
  {
    href: "/kalkulyatory/poly/laminat/",
    icon: "🪵",
    title: "Калькулятор ламината",
    description: "Площадь, упаковки, подрезка и понятный итог к покупке.",
  },
  {
    href: "/kalkulyatory/poly/plitka/",
    icon: "⬜",
    title: "Калькулятор плитки",
    description: "Расчёт плитки с раскладкой, запасом и количеством упаковок.",
  },
] as const;

export default function BlogPostNotFound() {
  return (
    <main className="page-container py-10 sm:py-16">
      <nav className="mb-6 text-sm text-slate-400" aria-label="Хлебные крошки">
        <Link href="/" className="no-underline transition-colors hover:text-slate-600 dark:hover:text-slate-300">
          Главная
        </Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/blog/" className="no-underline transition-colors hover:text-slate-600 dark:hover:text-slate-300">
          Блог
        </Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-slate-700 dark:text-slate-300">Статья не найдена</span>
      </nav>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-slate-50 px-5 py-10 text-center dark:border-slate-800 dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-950 sm:px-10 sm:py-14">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" aria-hidden>
          📖
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">
          Ошибка 404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
          Статья не найдена
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Возможно, ссылка устарела, в адресе есть опечатка или материал был перенесён. Вернитесь в блог — остальные статьи и калькуляторы продолжают работать.
        </p>
        <div className="mx-auto mt-7 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
          <Link href="/blog/" className="btn-primary min-h-12 flex-1">
            Перейти в блог
          </Link>
          <Link href="/kalkulyatory/" className="btn-secondary min-h-12 flex-1">
            Все калькуляторы
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="blog-not-found-destinations">
        <h2 id="blog-not-found-destinations" className="text-center text-xl font-bold text-slate-950 dark:text-white">
          Куда перейти дальше
        </h2>
        <div className="mx-auto mt-5 grid max-w-4xl gap-3 md:grid-cols-3">
          {POPULAR_DESTINATIONS.map((item) => (
            <Link key={item.href} href={item.href} className="card-hover flex min-h-32 gap-3 p-5 no-underline">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800" aria-hidden>
                {item.icon}
              </span>
              <span>
                <span className="block font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
