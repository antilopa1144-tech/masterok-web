/** Ссылки основной навигации шапки. */

export interface HeaderNavLink {
  href: string;
  label: string;
  match: readonly string[];
  icon?: string;
  /** Акцентный пункт (проекты / смета). */
  highlight?: boolean;
}

/**
 * Разделы сайта (desktop-навигация по центру).
 * «Инструменты» на desktop раскрывается дропдауном (TOOL_CARDS из lib/tools/config).
 */
export const HEADER_MAIN_LINKS: HeaderNavLink[] = [
  { href: "/", label: "Калькуляторы", match: ["/", "/kalkulyatory"] },
  { href: "/instrumenty/", label: "Инструменты", match: ["/instrumenty"], icon: "wrench" },
  { href: "/mikhalych/", label: "Михалыч AI", match: ["/mikhalych"], icon: "bot" },
  { href: "/blog/", label: "Блог", match: ["/blog"], icon: "book" },
];

/**
 * Быстрые ссылки для мобильного меню («Ваш ремонт»).
 * На desktop конкретные инструменты живут в дропдауне «Инструменты»,
 * а «Проекты» — справа, рядом с утилитами.
 */
export const HEADER_FEATURE_LINKS: HeaderNavLink[] = [
  {
    href: "/proekty/",
    label: "Проекты",
    match: ["/proekty"],
    icon: "checklist",
    highlight: true,
  },
  {
    href: "/instrumenty/kalendar-remonta/",
    label: "Календарь",
    match: ["/instrumenty/kalendar-remonta"],
    icon: "timer",
  },
  {
    href: "/instrumenty/moy-remont/",
    label: "Мастер",
    match: ["/instrumenty/moy-remont"],
    icon: "calculator",
  },
  {
    href: "/instrumenty/raskladka-plitki/",
    label: "Раскладка",
    match: ["/instrumenty/raskladka-plitki"],
    icon: "tile",
  },
];

/** Пункт «Проекты» для правой части desktop-шапки. */
export const HEADER_PROJECTS_LINK: HeaderNavLink = HEADER_FEATURE_LINKS[0];

export function isHeaderLinkActive(pathname: string, match: readonly string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}
