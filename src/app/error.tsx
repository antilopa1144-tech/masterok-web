"use client";

import Link from "next/link";

const UI_TEXT = {
  title: "Что-то пошло не так",
  description:
    "Произошла ошибка при загрузке страницы. Попробуйте обновить или вернитесь на главную.",
  retryCta: "Попробовать снова",
  homeCta: "На главную",
} as const;

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-container py-16">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {UI_TEXT.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {UI_TEXT.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            {UI_TEXT.retryCta}
          </button>
          <Link href="/" className="btn-secondary">
            {UI_TEXT.homeCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
