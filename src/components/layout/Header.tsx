"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SITE_NAME } from "@/lib/site";

const UI_TEXT = {
  logo: SITE_NAME,
  navCalculators: "Калькуляторы",
  navMikhalych: "Михалыч AI",
  navTools: "Инструменты",
  navBlog: "Блог",
  download: "Скачать",
  menu: "Меню",
  mainNavigation: "Основная навигация",
  mobileNavigation: "Мобильная навигация",
  categories: "Категории",
  downloadApp: "Скачать приложение",
} as const;

const NAV_LINKS = [
  { href: "/", label: UI_TEXT.navCalculators, match: ["/", "/kalkulyatory"] },
  { href: "/mikhalych/", label: UI_TEXT.navMikhalych, match: ["/mikhalych"] },
  { href: "/instrumenty/", label: UI_TEXT.navTools, match: ["/instrumenty"] },
  { href: "/blog/", label: UI_TEXT.navBlog, match: ["/blog"] },
] as const;

function isActive(pathname: string, match: readonly string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
      <div className="page-container-wide">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <CategoryIcon icon="hammer" size={18} color="#fff" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
              {UI_TEXT.logo}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label={UI_TEXT.mainNavigation}>
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${
                    active
                      ? "text-accent-600 bg-accent-50 dark:bg-accent-900/20 dark:text-accent-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <ThemeToggle />

            <Link
              href="/prilozhenie/"
              className="btn-primary text-sm py-2 px-4 ml-3 inline-flex items-center gap-1.5"
            >
              <CategoryIcon icon="phone" size={15} color="#fff" />
              {UI_TEXT.download}
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={UI_TEXT.menu}
              aria-expanded={menuOpen}
            >
              <svg
                className="w-5 h-5 text-slate-700 dark:text-slate-200"
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

      {menuOpen && (
        <nav
          className="md:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          aria-label={UI_TEXT.mobileNavigation}
        >
          <div className="page-container py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-3 rounded-lg font-medium transition-colors no-underline min-h-[44px] ${
                    active
                      ? "text-accent-600 bg-accent-50 dark:bg-accent-900/20 dark:text-accent-400"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="px-3 py-1 text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {UI_TEXT.categories}
              </p>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kalkulyatory/${cat.slug}/`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-600 text-sm hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors no-underline min-h-[44px]"
                  onClick={() => setMenuOpen(false)}
                >
                  <CategoryIcon icon={cat.icon} size={16} color={cat.color} />
                  <span>{cat.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-3 flex items-center gap-2">
              <Link
                href="/prilozhenie/"
                className="btn-primary flex-1 text-center inline-flex items-center justify-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <CategoryIcon icon="phone" size={16} color="#fff" />
                {UI_TEXT.downloadApp}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
