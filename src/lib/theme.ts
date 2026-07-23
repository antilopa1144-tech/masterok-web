/**
 * Темы оформления сайта.
 *
 * Механика: палитры заданы CSS-переменными в globals.css. Темы, кроме
 * светлой и тёмной, переопределяют переменные через html[data-theme="..."].
 * Тёмные темы дополнительно включают класс .dark — все dark:-утилиты
 * Tailwind продолжают работать без изменений в компонентах.
 *
 * Выбор хранится в localStorage('theme'). Отсутствие значения или
 * "system" = автоматический режим по prefers-color-scheme (light/dark).
 * Старые сохранённые значения 'light'/'dark' остаются валидными.
 */

export type ThemeId =
  | "light"
  | "dark"
  | "bronze"
  | "ocean";

export type ThemeChoice = ThemeId | "system";

export const THEME_STORAGE_KEY = "theme";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  /** Тёмная ли тема — включает класс .dark и colorScheme: dark */
  isDark: boolean;
  /** Цвета для образца в пикере: фон страницы и акцент */
  swatch: { bg: string; accent: string };
}

export const THEMES: ThemeDefinition[] = [
  { id: "light", label: "Светлая", isDark: false, swatch: { bg: "#f8fafc", accent: "#f97316" } },
  { id: "dark", label: "Тёмная", isDark: true, swatch: { bg: "#0f172a", accent: "#f97316" } },
  { id: "bronze", label: "Тёплая", isDark: false, swatch: { bg: "#f4efe5", accent: "#c96442" } },
  { id: "ocean", label: "Океан", isDark: true, swatch: { bg: "#101c2e", accent: "#0ea5e9" } },
];

const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_BY_ID.has(value as ThemeId);
}

/** Сохранённый выбор → конкретная тема (system резолвится по media query). */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ThemeDefinition {
  if (choice !== "system" && THEME_BY_ID.has(choice)) {
    return THEME_BY_ID.get(choice)!;
  }
  return THEME_BY_ID.get(prefersDark ? "dark" : "light")!;
}

/** Применить тему к документу (клиент). Возвращает применённую тему. */
export function applyThemeChoice(choice: ThemeChoice): ThemeDefinition {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = resolveTheme(choice, prefersDark);
  const root = document.documentElement;
  if (theme.id === "light" || theme.id === "dark") {
    // Базовые палитры — без data-theme (переменные из @theme по умолчанию)
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme.id);
  }
  root.classList.toggle("dark", theme.isDark);
  root.style.colorScheme = theme.isDark ? "dark" : "light";
  return theme;
}

/** Прочитать сохранённый выбор пользователя. */
export function getStoredThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // приватный режим и т.п.
  }
  return "system";
}

/** Сохранить выбор ("system" очищает ключ — авторежим). */
export function storeThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // no-op
  }
}
