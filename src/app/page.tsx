import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CALCULATORS, getPopularCalculators } from "@/lib/calculators";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

import CalculatorSearch from "@/components/calculator/CalculatorSearch";

export const metadata: Metadata = {
  title: "Мастерок — строительные калькуляторы онлайн бесплатно",
  description:
    "50+ бесплатных строительных калькуляторов онлайн: бетон, кирпич, кровля, плитка, ламинат, гипсокартон. Точный расчёт материалов по ГОСТ и СНиП.",
};

export default function HomePage() {
  const popular = getPopularCalculators(8);
  const totalCount = ALL_CALCULATORS.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Мастерок",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru",
    description: "Строительные калькуляторы онлайн",
    potentialAction: {
      "@type": "SearchAction",
      target: "/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="hero-gradient border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-50 text-accent-700 text-sm font-medium px-4 py-2 rounded-full border border-accent-200 mb-6">
            <CategoryIcon icon="trophy" size={16} />
            <span>{totalCount}+ бесплатных калькуляторов</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
            Строительные калькуляторы{" "}
            <span className="text-accent-500">онлайн</span>
          </h1>

          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Точный расчёт материалов по ГОСТ и СНиП. Бетон, кирпич, кровля,
            плитка, ламинат — всё в одном месте. Быстро, бесплатно, без
            регистрации.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="#calculators" className="btn-primary text-base px-8 py-3">
              Начать расчёт
            </Link>
            <Link href="/mikhalych/" className="btn-secondary text-base px-6 py-3 inline-flex items-center gap-2">
              <CategoryIcon icon="bot" size={18} />
              Спросить Михалыча
            </Link>
          </div>

          {/* Поиск */}
          <div className="mt-8 max-w-xl mx-auto">
            <CalculatorSearch
              calculators={ALL_CALCULATORS.map(
                ({
                  id, slug, title, h1, description, metaTitle,
                  metaDescription, category, categorySlug, tags,
                  popularity, complexity,
                }) => ({
                  id, slug, title, h1, description, metaTitle,
                  metaDescription, category, categorySlug, tags,
                  popularity, complexity,
                })
              )}
            />
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto mt-10">
            {[
              { val: `${totalCount}+`, label: "Калькуляторов" },
              { val: "100%", label: "Бесплатно" },
              { val: "ГОСТ", label: "Нормы" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {s.val}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Категории ───────────────────────────────────────── */}
      <section className="page-container-wide py-10" id="calculators">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Категории калькуляторов
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const count = ALL_CALCULATORS.filter(
              (c) => c.category === cat.id
            ).length;
            return (
              <Link
                key={cat.id}
                href={`/kalkulyatory/${cat.slug}/`}
                className="card-hover p-5 block no-underline group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: cat.bgColor }}
                >
                  <CategoryIcon icon={cat.icon} size={22} color={cat.color} />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 group-hover:text-accent-600 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-slate-400">
                  {count} {(() => { const m10 = count % 10; const m100 = count % 100; if (m100 >= 11 && m100 <= 19) return "калькуляторов"; if (m10 === 1) return "калькулятор"; if (m10 >= 2 && m10 <= 4) return "калькулятора"; return "калькуляторов"; })()}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Популярные калькуляторы ──────────────────────────── */}
      <section className="page-container-wide py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Популярные калькуляторы
          </h2>
          <span className="text-sm text-slate-400 hidden sm:block">
            Чаще всего используются
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {popular.map((calc) => {
            const cat = CATEGORIES.find((c) => c.id === calc.category);
            return (
              <Link
                key={calc.id}
                href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                className="card-hover p-5 block no-underline group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: cat?.bgColor ?? "#f1f5f9" }}
                >
                  <CategoryIcon icon={cat?.icon ?? "wrench"} size={22} color={cat?.color ?? "#64748b"} />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1.5 group-hover:text-accent-600 transition-colors">
                  {calc.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {calc.description}
                </p>
                <div className="mt-3">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: cat?.bgColor ?? "#f1f5f9",
                      color: cat?.color ?? "#64748b",
                    }}
                  >
                    {cat?.label ?? "Прочее"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>


      {/* ── Михалыч ─────────────────────────────────────────── */}
      <section className="page-container-wide py-8">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-12 text-white overflow-hidden dark:bg-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="md:max-w-xl lg:max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-500 rounded-2xl flex items-center justify-center shrink-0">
                  <CategoryIcon icon="bot" size={26} color="#fff" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Михалыч — ваш ИИ-прораб
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Строительный ИИ-ассистент
                  </p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Задайте любой строительный вопрос. Михалыч поможет рассчитать
                материалы, расскажет про технологию укладки, объяснит нормы СНиП
                и предупредит о типичных ошибках.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 shrink-0">
              <Link href="/mikhalych/" className="btn-primary text-base px-8">
                Начать диалог
              </Link>
              <Link
                href="/prilozhenie/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-150 no-underline text-base"
              >
                <CategoryIcon icon="phone" size={18} color="#fff" />
                Приложение
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Инструменты ─────────────────────────────────────── */}
      <section className="page-container-wide py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-900">
            Полезные инструменты
          </h2>
          <Link
            href="/instrumenty/"
            className="text-sm text-accent-600 hover:text-accent-700 font-medium no-underline"
          >
            Все инструменты →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/instrumenty/konverter/", icon: "converter", title: "Конвертер", desc: "мм → м → дюйм", bg: "#DBEAFE", color: "#3B82F6" },
            { href: "/instrumenty/ploshchad-komnaty/", icon: "area", title: "Площадь комнаты", desc: "Г, Т, трапеция", bg: "#D1FAE5", color: "#10B981" },
            { href: "/instrumenty/kalkulyator/", icon: "calculator", title: "Калькулятор", desc: "Как на телефоне", bg: "#FEF3C7", color: "#F59E0B" },
            { href: "/instrumenty/chek-listy/", icon: "checklist", title: "Чек-листы", desc: "6 шаблонов работ", bg: "#EDE9FE", color: "#8B5CF6" },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card-hover p-5 block no-underline group text-center"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: tool.bg }}
              >
                <CategoryIcon icon={tool.icon} size={24} color={tool.color} />
              </div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-accent-600 transition-colors">
                {tool.title}
              </div>
              <div className="text-xs text-slate-400 mt-1">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Почему Мастерок ─────────────────────────────────── */}
      <section className="page-container-wide py-8 pb-14">
        <div className="card p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 dark:text-slate-100">
            Почему Мастерок?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "target",
                color: "#6366F1",
                bg: "#EDE9FE",
                title: "Точные нормы",
                desc: "Все расчёты основаны на актуальных ГОСТ, СНиП и СП. Нормы расхода от производителей и практики строителей.",
              },
              {
                icon: "engineering",
                color: "#06B6D4",
                bg: "#CFFAFE",
                title: "Мгновенно",
                desc: "Расчёт происходит прямо в браузере без отправки данных на сервер. Никаких задержек и регистраций.",
              },
              {
                icon: "phone",
                color: "#10B981",
                bg: "#D1FAE5",
                title: "Мобильное приложение",
                desc: "Работает без интернета. Сохраняйте расчёты, создавайте проекты, делитесь QR-кодами со сметой.",
              },
              {
                icon: "hammer",
                color: "#F59E0B",
                bg: "#FEF3C7",
                title: "Практичные результаты",
                desc: "Кроме основных материалов — сопутствующие: крепёж, клей, грунтовка. Всё что нужно в магазин.",
              },
              {
                icon: "foundation",
                color: "#EF4444",
                bg: "#FEE2E2",
                title: "Для России",
                desc: "Российские размеры материалов, бренды (Knauf, Ceresit, Технониколь), нормы и единицы измерения.",
              },
              {
                icon: "chat",
                color: "#8B5CF6",
                bg: "#EDE9FE",
                title: "ИИ-помощник",
                desc: "Михалыч ответит на вопросы по технологии, поможет разобраться в нюансах и подберёт нужный материал.",
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: f.bg }}
                >
                  <CategoryIcon icon={f.icon} size={20} color={f.color} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
