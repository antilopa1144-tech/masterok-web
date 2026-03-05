'use client';

import { useEffect, useState } from 'react';
import CategoryIcon from './CategoryIcon';

type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme';

function getResolvedTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemePreference): 'light' | 'dark' {
  const resolved = getResolvedTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Инициализация темы при монтировании
  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const preference: ThemePreference =
      savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';

    setIsDark(applyTheme(preference) === 'dark');

    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      setIsDark(applyTheme('system') === 'dark');
    };

    media.addEventListener('change', handleSystemThemeChange);
    return () => media.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemePreference = isDark ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setIsDark(applyTheme(nextTheme) === 'dark');
  };

  // Избегаем гидратационных ошибок
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        aria-label="Переключить тему"
      >
        <CategoryIcon icon="sun" size={18} color="#64748b" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {isDark ? (
        <CategoryIcon icon="sun" size={18} color="#fbbf24" />
      ) : (
        <CategoryIcon icon="moon" size={18} color="#64748b" />
      )}
    </button>
  );
}

