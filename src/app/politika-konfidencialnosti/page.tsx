import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Политика конфиденциальности",
  description:
    `Политика конфиденциальности сайта ${SITE_NAME} (getmasterok.ru). Информация о сборе данных, использовании cookie и аналитике.`,
  url: `${SITE_URL}/politika-konfidencialnosti/`,
});

export default function PrivacyPage() {
  const baseUrl = SITE_URL;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Политика конфиденциальности", item: `${baseUrl}/politika-konfidencialnosti/` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="page-container py-10 md:py-16">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-accent-600 no-underline">Главная</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-200">Политика конфиденциальности</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8">
          Политика конфиденциальности
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p>
            Дата последнего обновления: 26 марта 2026 года.
          </p>

          <section>
            <h2>1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности определяет порядок обработки и защиты
              информации о пользователях сайта {SITE_NAME} (getmasterok.ru) и мобильного
              приложения {SITE_NAME}. Сайт не собирает, не хранит и не передаёт персональные
              данные пользователей.
            </p>
          </section>

          <section>
            <h2>2. Какие данные собираются</h2>
            <p>
              Сайт не требует регистрации и не собирает персональные данные (имя, email, телефон).
              Для улучшения качества сервиса используется анонимная аналитика:
            </p>
            <ul>
              <li>Яндекс.Метрика — анонимная статистика посещаемости, источники трафика,
                поведение на сайте (время на странице, глубина просмотра)</li>
              <li>Firebase Crashlytics (в мобильном приложении) — анонимные отчёты об ошибках
                для повышения стабильности</li>
            </ul>
            <p>
              Все данные аналитики являются обезличенными и не позволяют идентифицировать
              конкретного пользователя.
            </p>
          </section>

          <section>
            <h2>3. Файлы cookie</h2>
            <p>
              Сайт использует cookie для сохранения пользовательских настроек (тема оформления:
              светлая/тёмная) и корректной работы аналитики Яндекс.Метрики. Вы можете
              отключить cookie в настройках браузера — это не повлияет на работу калькуляторов.
            </p>
          </section>

          <section>
            <h2>4. Сторонние сервисы</h2>
            <ul>
              <li><strong>Яндекс.Метрика</strong> — веб-аналитика (счётчик 108155444).
                Политика конфиденциальности Яндекса:{" "}
                <a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener noreferrer">
                  yandex.ru/legal/confidential
                </a>
              </li>
              <li><strong>Unsplash</strong> — изображения для блога (загружаются с серверов Unsplash)</li>
            </ul>
          </section>

          <section>
            <h2>5. Хранение данных</h2>
            <p>
              Результаты расчётов в мобильном приложении хранятся локально на устройстве
              пользователя и не передаются на серверы. На сайте результаты расчётов не сохраняются
              между сессиями.
            </p>
          </section>

          <section>
            <h2>6. Обратная связь</h2>
            <p>
              По вопросам, связанным с политикой конфиденциальности, вы можете обратиться
              через{" "}
              <Link href="/mikhalych/">ИИ-ассистента Михалыча</Link>.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
