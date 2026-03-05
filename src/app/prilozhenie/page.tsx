import type { Metadata } from "next";
import Link from "next/link";


export const metadata: Metadata = {
  title: "Скачать приложение Мастерок — строительные калькуляторы",
  description:
    "Скачайте бесплатное приложение Мастерок для Android. 50+ строительных калькуляторов, работает без интернета, сохранение расчётов, AI-ассистент Михалыч.",
};

const FEATURES = [
  {
    icon: "📐",
    title: "50+ калькуляторов",
    desc: "Бетон, кирпич, кровля, плитка, ламинат, гипсокартон и многое другое. Все расчёты в одном приложении.",
  },
  {
    icon: "📡",
    title: "Работает офлайн",
    desc: "Все калькуляторы работают без интернета. Стройка в поле — не проблема.",
  },
  {
    icon: "💾",
    title: "Сохранение расчётов",
    desc: "Сохраняйте расчёты в проекты. Создавайте полные сметы по объекту.",
  },
  {
    icon: "🤖",
    title: "Михалыч AI",
    desc: "ИИ-ассистент прямо в приложении. Задай вопрос рядом с калькулятором.",
  },
  {
    icon: "📊",
    title: "Экспорт в PDF",
    desc: "Экспортируйте расчёты в PDF для передачи заказчику или в магазин.",
  },
  {
    icon: "🔗",
    title: "QR-коды",
    desc: "Делитесь расчётами через QR-коды. Мастер сканирует — видит список материалов.",
  },
];

export default function PrilozheніePage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-sm font-medium px-4 py-2 rounded-full border border-accent-200 dark:border-accent-800/40 mb-5">
                📱 Доступно в RuStore
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-4">
                Мастерок — приложение
                <br />
                <span className="text-accent-500">строительного мастера</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed mb-6">
                50+ бесплатных строительных калькуляторов в вашем кармане.
                Работает без интернета. Идеально для стройки.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://www.rustore.ru/catalog/app/ru.masterok.calc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-base px-8 py-3.5"
                >
                  📲 Скачать в RuStore
                </a>
                <Link href="/" className="btn-secondary text-base">
                  Онлайн-версия
                </Link>
              </div>

              <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">
                Бесплатно · Android · Без рекламы в расчётах
              </p>
            </div>

            {/* Мокап телефона */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-52 h-96 bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-700 flex flex-col">
                  {/* Статусбар */}
                  <div className="bg-slate-800 h-6 flex items-center justify-between px-4">
                    <span className="text-white text-xs">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                      <div className="w-3 h-1.5 bg-white rounded-sm" />
                    </div>
                  </div>
                  {/* Экран приложения */}
                  <div className="flex-1 bg-slate-50 p-3">
                    <div className="bg-orange-500 rounded-xl p-3 mb-2 text-white text-center">
                      <div className="text-lg">🔨</div>
                      <div className="text-xs font-bold">Мастерок</div>
                    </div>
                    {[
                      { icon: "🏗️", name: "Бетон", cat: "Фундамент" },
                      { icon: "🧱", name: "Кирпич", cat: "Стены" },
                      { icon: "🏠", name: "Кровля", cat: "Кровля" },
                      { icon: "🔲", name: "Ламинат", cat: "Полы" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 bg-white rounded-lg p-2 mb-1.5 shadow-xs"
                      >
                        <div className="text-base">{item.icon}</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.cat}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Возможности */}
      <section className="page-container-wide py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-8">
          Что умеет приложение
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="page-container-wide py-8 pb-14">
        <div className="bg-accent-500 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Скачайте бесплатно
          </h2>
          <p className="text-accent-100 mb-6 max-w-lg mx-auto">
            Более 10 000 строителей и мастеров уже используют Мастерок на стройке.
            Присоединяйтесь!
          </p>
          <a
            href="https://www.rustore.ru/catalog/app/ru.masterok.calc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-accent-600 font-bold px-8 py-3.5 rounded-xl hover:bg-accent-50 transition-colors no-underline"
          >
            📲 Скачать в RuStore
          </a>
          <p className="text-accent-100 text-sm mt-3">
            Android · Бесплатно · Без подписки
          </p>
        </div>
      </section>
    </div>
  );
}
