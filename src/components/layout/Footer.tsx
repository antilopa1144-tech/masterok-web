import Link from "next/link";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto dark:bg-slate-950">
      <div className="page-container-wide py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* О сайте */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg text-white mb-3 no-underline hover:text-accent-400 transition-colors"
            >
              <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center">
                <CategoryIcon icon="hammer" size={15} color="#fff" />
              </div>
              <span>Мастерок</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Бесплатные строительные калькуляторы онлайн. Точный расчёт
              материалов по ГОСТ и СНиП.
            </p>
            <Link
              href="/prilozhenie/"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300 transition-colors no-underline mt-4"
            >
              <CategoryIcon icon="phone" size={14} color="currentColor" />
              Скачать приложение
            </Link>
          </div>

          {/* Категории */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Категории
            </h3>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kalkulyatory/${cat.slug}/`}
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors no-underline"
                  >
                    <CategoryIcon icon={cat.icon} size={14} color="currentColor" />
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Популярное */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Популярное
            </h3>
            <ul className="space-y-2">
              {[
                { href: "/kalkulyatory/fundament/beton/", label: "Калькулятор бетона" },
                { href: "/kalkulyatory/steny/kirpich/", label: "Калькулятор кирпича" },
                { href: "/kalkulyatory/krovlya/krovlya/", label: "Калькулятор кровли" },
                { href: "/kalkulyatory/poly/plitka/", label: "Калькулятор плитки" },
                { href: "/kalkulyatory/poly/laminat/", label: "Калькулятор ламината" },
                { href: "/kalkulyatory/otdelka/oboi/", label: "Калькулятор обоев" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Сервисы */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Сервисы
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/mikhalych/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="bot" size={14} color="currentColor" />
                  Михалыч — AI-ассистент
                </Link>
              </li>
              <li>
                <Link href="/blog/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="book" size={14} color="currentColor" />
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/prilozhenie/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="phone" size={14} color="currentColor" />
                  Приложение
                </Link>
              </li>
            </ul>

            <div className="mt-6 p-3 bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-300 font-medium mb-1">
                Нашли ошибку в расчёте?
              </p>
              <p className="text-xs text-slate-400">
                Напишите нашему ИИ-ассистенту
              </p>
              <Link
                href="/mikhalych/"
                className="mt-2 inline-block text-xs font-medium text-accent-400 hover:text-accent-300 no-underline transition-colors"
              >
                Спросить Михалыча →
              </Link>
            </div>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-slate-500">
            © {year} Мастерок. Все расчёты носят справочный характер.
          </p>
          <span className="text-sm text-slate-500">Расчёты по ГОСТ и СНиП</span>
        </div>
      </div>
    </footer>
  );
}
