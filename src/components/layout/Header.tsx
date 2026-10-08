"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Box } from "lucide-react";
import { CATEGORIES } from "@/lib/calculators/categories";
import { CONSTRUCTOR_EDITOR_URL, CONSTRUCTOR_SCENARIOS, CONSTRUCTOR_URL, scenarioHref } from "@/lib/constructor/entry";
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

/** The label opens the landing page; the adjacent button exposes quick entries. */
function ConstructorDropdown({ link, pathname }: { link: HeaderNavLink; pathname: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const active = isHeaderLinkActive(pathname, link.match);

  // Закрываем при переходе на другую страницу
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div ref={container} className="relative flex items-center rounded-xl bg-accent-700 text-white" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); container.current?.querySelector("button")?.focus(); } }}>
      <Link
        href={link.href}
        className="inline-flex min-h-11 items-center gap-2 rounded-l-xl px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        <Box size={17} aria-hidden="true" />
        <span>{link.label}</span>
      </Link>
      <button type="button" aria-label="Сценарии конструктора и инструменты" aria-expanded={open} aria-controls="constructor-menu" onClick={() => setOpen(!open)} className="flex min-h-11 min-w-11 items-center justify-center rounded-r-xl border-l border-white/20 text-white hover:bg-accent-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
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
      </button>

      {open && (
        <div id="constructor-menu" className="theme-surface absolute left-0 top-full z-50 mt-1 w-80 rounded-2xl border border-slate-200 p-3 shadow-lg dark:border-slate-700">
          <div className="grid gap-1">
            <Link href={CONSTRUCTOR_EDITOR_URL} prefetch={false} onClick={() => setOpen(false)} className="rounded-xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-800 no-underline dark:bg-orange-950/40 dark:text-orange-200">Открыть редактор</Link>
            {CONSTRUCTOR_SCENARIOS.map((scenario) => (
              <Link
                key={scenario.id}
                href={scenarioHref(scenario.id)}
                prefetch={false}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 no-underline transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60"
                onClick={() => setOpen(false)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {scenario.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    Новый проект по примеру
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
    <header className="theme-header sticky top-0 z-50 border-b border-slate-200 backdrop-blur-lg dark:border-slate-800">
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
              link.href === "/konstruktor/" ? (
                <ConstructorDropdown key={link.href} link={link} pathname={pathname} />
              ) : (
                <HeaderNavItem key={link.href} link={link} pathname={pathname} />
              ),
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <HeaderNavItem link={HEADER_PROJECTS_LINK} pathname={pathname} showBadge />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-1.5 lg:hidden shrink-0">
            <Link
              href={CONSTRUCTOR_URL}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-700 px-3 py-2 text-xs font-bold text-white no-underline hover:bg-accent-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              onClick={() => setMenuOpen(false)}
              aria-current={isHeaderLinkActive(pathname, ["/konstruktor"]) ? "page" : undefined}
            >
              <Box size={16} aria-hidden="true" />
              <span>Конструктор</span>
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
          className="theme-surface lg:hidden max-h-[min(85vh,640px)] overflow-y-auto border-t border-slate-200 dark:border-slate-800"
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
              <HeaderNavItem link={{ href: "/instrumenty/", label: "Все инструменты", match: ["/instrumenty"], icon: "wrench" }} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
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
                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-slate-500 no-underline dark:text-slate-400"
                onClick={() => setMenuOpen(false)}
              >
                <CategoryIcon icon="phone" size={16} color="currentColor" />
                {UI_TEXT.downloadApp}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
