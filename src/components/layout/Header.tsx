"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import {
  HEADER_FEATURE_LINKS,
  HEADER_MAIN_LINKS,
  isHeaderLinkActive,
  type HeaderNavLink,
} from "@/lib/navigation/header-links";
import HeaderProjectBadge from "@/components/layout/HeaderProjectBadge";

const UI_TEXT = {
  logo: SITE_NAME,
  download: "Скачать",
  menu: "Меню",
  mainNavigation: "Основная навигация",
  featureNavigation: "Ваш ремонт",
  mobileNavigation: "Мобильная навигация",
  categories: "Категории",
  downloadApp: "Скачать приложение",
} as const;

function navLinkClass(active: boolean, highlight?: boolean): string {
  if (highlight) {
    return active
      ? "text-white bg-accent-600 dark:bg-accent-500 shadow-sm"
      : "text-accent-800 bg-accent-50 hover:bg-accent-100 dark:text-accent-200 dark:bg-accent-900/30 dark:hover:bg-accent-900/50";
  }
  return active
    ? "text-accent-700 bg-accent-50 dark:bg-accent-900/20 dark:text-accent-400"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100";
}

function HeaderNavItem({
  link,
  pathname,
  onNavigate,
  showBadge,
}: {
  link: HeaderNavLink;
  pathname: string;
  onNavigate?: () => void;
  showBadge?: boolean;
}) {
  const active = isHeaderLinkActive(pathname, link.match);
  return (
    <Link
      href={link.href}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors no-underline min-h-[44px] md:min-h-0 ${navLinkClass(active, link.highlight)}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
    >
      {link.icon && (
        <CategoryIcon
          icon={link.icon}
          size={15}
          color={active && link.highlight ? "#fff" : "currentColor"}
        />
      )}
      <span>{link.label}</span>
      {showBadge && link.highlight ? <HeaderProjectBadge /> : null}
    </Link>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
      <div className="page-container-wide">
        <div className="flex items-center justify-between h-16 gap-2">
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <CategoryIcon icon="hammer" size={18} color="#fff" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-slate-100 hidden sm:inline">
              {UI_TEXT.logo}
            </span>
          </Link>

          <nav
            className="hidden lg:flex items-center gap-0.5 min-w-0 flex-1 justify-center"
            aria-label={UI_TEXT.mainNavigation}
          >
            {HEADER_MAIN_LINKS.map((link) => (
              <HeaderNavItem key={link.href} link={link} pathname={pathname} />
            ))}

            <span
              className="mx-1.5 h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0"
              aria-hidden
            />

            <div
              className="flex items-center gap-0.5"
              aria-label={UI_TEXT.featureNavigation}
            >
              {HEADER_FEATURE_LINKS.map((link) => (
                <HeaderNavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  showBadge={link.highlight}
                />
              ))}
            </div>
          </nav>

          {/* Планшет: только ключевые фишки + скачать */}
          <nav
            className="hidden md:flex lg:hidden items-center gap-1 shrink-0"
            aria-label={UI_TEXT.featureNavigation}
          >
            {HEADER_FEATURE_LINKS.filter(
              (l) =>
                l.highlight ||
                l.href.includes("kalendar-remonta") ||
                l.href.includes("moy-remont"),
            ).map(
              (link) => (
                <HeaderNavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  showBadge={link.highlight}
                />
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <Link
              href="/prilozhenie/"
              className="btn-primary text-sm py-2 px-4 ml-1 inline-flex items-center gap-1.5"
            >
              <CategoryIcon icon="phone" size={15} color="#fff" />
              <span className="hidden xl:inline">{UI_TEXT.download}</span>
              <span className="xl:hidden">App</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden shrink-0">
            <Link
              href="/proekty/"
              className="inline-flex items-center gap-1 rounded-lg bg-accent-50 px-2.5 py-2 text-xs font-semibold text-accent-800 no-underline dark:bg-accent-900/30 dark:text-accent-200 min-h-[44px]"
              aria-label="Проекты"
            >
              <CategoryIcon icon="checklist" size={14} color="currentColor" />
              <span>Проекты</span>
              <HeaderProjectBadge />
            </Link>
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
          className="md:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-h-[min(85vh,640px)] overflow-y-auto"
          aria-label={UI_TEXT.mobileNavigation}
        >
          <div className="page-container py-3 space-y-1">
            <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {UI_TEXT.featureNavigation}
            </p>
            <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
              {HEADER_FEATURE_LINKS.map((link) => (
                <HeaderNavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  showBadge={link.highlight}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1">
              {HEADER_MAIN_LINKS.map((link) => (
                <HeaderNavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {UI_TEXT.categories}
              </p>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kalkulyatory/${cat.slug}/`}
                  prefetch={false}
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
