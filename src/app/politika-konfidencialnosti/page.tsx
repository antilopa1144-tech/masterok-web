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
          <Link href="/" className="hover:text-accent-700 no-underline">Главная</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-200">Политика конфиденциальности</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8">
          Политика конфиденциальности
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p>
            Дата последнего обновления: 6 сентября 2026 года.
          </p>

          <section>
            <h2>1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности определяет порядок обработки и защиты
              информации о пользователях сайта {SITE_NAME} (getmasterok.ru) и мобильного
              приложения {SITE_NAME}. Ниже описаны используемые на сайте средства аналитики
              и технические данные, необходимые для их работы.
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
              <li>Google Analytics 4 — статистика посещаемости, просмотров страниц и
                использования функций сайта</li>
              <li>Firebase Crashlytics (в мобильном приложении) — анонимные отчёты об ошибках
                для повышения стабильности</li>
            </ul>
            <p>
              Данные аналитики используются в агрегированном виде для улучшения сайта.
            </p>
          </section>

          <section>
            <h2>3. Файлы cookie</h2>
            <p>
              Сайт использует cookie для сохранения пользовательских настроек (тема оформления:
              светлая/тёмная) и корректной работы Яндекс.Метрики и Google Analytics. Вы можете
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
              <li><strong>Google Analytics 4</strong> — веб-аналитика (идентификатор
                G-R0N1L7QDR3). Политика конфиденциальности Google: {" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  policies.google.com/privacy
                </a>
              </li>
              <li><strong>Unsplash</strong> — изображения для блога (загружаются с серверов Unsplash)</li>
            </ul>
          </section>

          <section>
            <h2>5. Хранение данных</h2>
            <p>
              Собственный счётчик просмотров статей работает на сервере «Мастерка» отдельно
              от Яндекс.Метрики и Google Analytics. Для исключения повторных открытий браузер
              сохраняет в localStorage случайный идентификатор отдельно для каждой статьи;
              срок его действия — сутки с последнего открытия. После истечения срока при следующем открытии
              он заменяется. Идентификатор не связывает просмотры разных статей.
              При запрете локального хранилища или включённом Do Not Track просмотр не регистрируется.
            </p>
            <p>
              Служба получает адрес статьи, случайный идентификатор и технические заголовки
              запроса. Для защиты от накрутки IP-адрес преобразуется в хеш с секретным ключом;
              исходный IP и идентификатор браузера в базе счётчика не сохраняются.
              Хеши повторных открытий удаляются после 30 минут, хеши ограничения частоты —
              после часа, с интервалом очистки до пяти минут при работающей службе.
              Общие числа просмотров сохраняются без ограничения срока. Ежедневные резервные
              копии содержат только общие числа, без временных хешей; сохраняются последние семь копий.
            </p>
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
