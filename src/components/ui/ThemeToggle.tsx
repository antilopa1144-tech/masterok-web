'use client';

import { useEffect, useState } from 'react';
import CategoryIcon from './CategoryIcon';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Инициализация темы при монтировании
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  // Избегаем гидратационных ошибок
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Переключить тему"
        disabled
      >
        <CategoryIcon icon="sun" size={18} color="#64748b" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
