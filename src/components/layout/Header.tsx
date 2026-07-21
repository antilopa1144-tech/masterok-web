"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/calculators/categories";
import { TOOL_CARDS } from "@/lib/tools/config";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import {
  HEADER_FEATURE_LINKS,
  HEADER_MAIN_LINKS,
  HEADER_PROJECTS_LINK,
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
  allTools: "Все инструменты →",
} as const;

function navLinkClass(active: boolean, highlight?: boolean): string {
  if (highlight) {
    return active
      ? "text-white bg-accent-600 dark:bg-accent-500 shadow-sm"
      : "border border-slate-200 text-slate-700 bg-white hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-900 dark:hover:border-accent-700";
  }
  return active
    ? "text-accent-700 dark:text-accent-400"
    : "text-slate-700 hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400";
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

/** Пункт «Инструменты» с выпадающим списком всех инструментов (desktop). */
function ToolsDropdown({ link, pathname }: { link: HeaderNavLink; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const active = isHeaderLinkActive(pathname, link.match);

  // Закрываем при переходе на другую страницу
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const openNow = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <Link
        href={link.href}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${navLinkClass(active)}`}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        onClick={() => setOpen(false)}
      >
        {link.icon && <CategoryIcon icon={link.icon} size={15} color="currentColor" />}
        <span>{link.label}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>

      {open && (
        <div className="absolute left-1/2 z-50 mt-1 w-[34rem] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-2 gap-1">
            {TOOL_CARDS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                prefetch={false}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 no-underline transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60"
                onClick={() => setOpen(false)}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: tool.bg }}
                >
                  <CategoryIcon icon={tool.icon} size={16} color={tool.color} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {tool.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {tool.desc}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 text-center dark:border-slate-700">
            <Link
              href="/instrumenty/"
              className="text-sm font-medium text-accent-700 no-underline hover:text-accent-800 dark:text-accent-400"
              onClick={() => setOpen(false)}
            >
              {UI_TEXT.allTools}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
      <div className="page-container-wide">
        <div className="flex items-center justify-between h-16 gap-2">
          <Link
            href="/"
            // Текст логотипа скрыт на мобиле (hidden sm:inline), а у иконки alt="",
            // поэтому без явного label ссылка остаётся без различимого текста на
            // мобиле — провал a11y/agent-view «Links must have discernible text».
            aria-label={`${UI_TEXT.logo} — на главную`}
            className="flex items-center gap-2.5 no-underline shrink-0"
          >
            <Image
              src="/icon1.png"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg shrink-0"
              priority
            />
            <span className="font-bold text-lg text-slate-900 dark:text-slate-100 hidden sm:inline">
              {UI_TEXT.logo}
            </span>
          </Link>

          <nav
            className="hidden lg:flex items-center gap-0.5 min-w-0 flex-1 justify-center"
            aria-label={UI_TEXT.mainNavigation}
          >
            {HEADER_MAIN_LINKS.map((link) =>
              link.href === "/instrumenty/" ? (
                <ToolsDropdown key={link.href} link={link} pathname={pathname} />
              ) : (
                <HeaderNavItem key={link.href} link={link} pathname={pathname} />
              ),
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <HeaderNavItem link={HEADER_PROJECTS_LINK} pathname={pathname} showBadge />
            <ThemeToggle />
            <Link
              href="/prilozhenie/"
              className="btn-primary text-sm py-2 px-4 ml-1 inline-flex items-center gap-1.5"
            >
              <CategoryIcon icon="download" size={15} color="#fff" />
              <span className="hidden xl:inline">{UI_TEXT.download}</span>
              <span className="xl:hidden">App</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden shrink-0">
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
          className="lg:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-h-[min(85vh,640px)] overflow-y-auto"
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
