"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

const NAV_LINKS = [
  { href: "/", label: "Калькуляторы", match: ["/", "/kalkulyatory"] },
  { href: "/mikhalych/", label: "Михалыч AI", match: ["/mikhalych"] },
  { href: "/instrumenty/", label: "Инструменты", match: ["/instrumenty"] },
  { href: "/blog/", label: "Блог", match: ["/blog"] },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => m === "/" ? pathname === "/" : pathname.startsWith(m));
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200">
      <div className="page-container-wide">
        <div className="flex items-center justify-between h-16">
          {/* Логотип */}
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
          >
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <CategoryIcon icon="hammer" size={18} color="#fff" />
            </div>
            <span className="font-bold text-lg text-slate-900">
              Мастерок
            </span>
          </Link>

          {/* Десктоп-навигация */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Основная навигация">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${
                    active
                      ? "text-accent-600 bg-accent-50"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/prilozhenie/"
              className="btn-primary text-sm py-2 px-4 ml-3 inline-flex items-center gap-1.5"
            >
              <CategoryIcon icon="phone" size={15} color="#fff" />
              Скачать
            </Link>
          </nav>

          {/* Мобильная кнопка */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Меню"
              aria-expanded={menuOpen}
            >
              <svg
                className="w-5 h-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <nav className="md:hidden border-t border-slate-200 bg-white" aria-label="Мобильная навигация">
          <div className="page-container py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2.5 rounded-lg font-medium transition-colors no-underline ${
                    active
                      ? "text-accent-600 bg-accent-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-200">
              <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Категории
              </p>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kalkulyatory/${cat.slug}/`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  <CategoryIcon icon={cat.icon} size={16} color={cat.color} />
                  <span>{cat.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-3">
              <Link
                href="/prilozhenie/"
                className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <CategoryIcon icon="phone" size={16} color="#fff" />
                Скачать приложение
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
