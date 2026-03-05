import type { Metadata } from "next";
import MikhalychChat from "@/components/mikhalych/MikhalychChat";

import Link from "next/link";

export const metadata: Metadata = {
  title: "Михалыч — AI-ассистент строителя | Мастерок",
  description:
    "Спросите Михалыча — опытного строительного ИИ-мастера. Расчёты, технологии, советы по материалам. Отвечает как настоящий прораб.",
};

const STARTER_QUESTIONS = [
  "Сколько кирпичей нужно на перегородку 5×2.7 м в полкирпича?",
  "Какую марку бетона выбрать для фундамента частного дома?",
  "Как рассчитать количество обоев для комнаты 4×3 метра?",
  "Чем лучше клеить пенопласт к стене — клей или дюбели?",
  "Какой утеплитель лучше для кровли — минвата или пеноплекс?",
  "Как правильно рассчитать стяжку пола толщиной 50 мм?",
];

export default function MikhalychPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-linear-to-br from-slate-800 to-slate-700 text-white">
        <div className="page-container-wide py-8 md:py-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-accent-500 rounded-2xl flex items-center justify-center text-3xl shrink-0">
              🤖
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Михалыч — AI-ассистент строителя
              </h1>
              <p className="text-slate-300 mt-2 leading-relaxed max-w-xl">
                Опытный строительный мастер с 30-летним стажем. Поможет рассчитать
                материалы, объяснит технологию и предупредит об ошибках.
                Говорит просто, по делу.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                  Расчёт материалов
                </span>
                <span className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                  Технологии монтажа
                </span>
                <span className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                  ГОСТ и СНиП
                </span>
                <span className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                  Выбор материалов
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Чат */}
          <div className="lg:col-span-2">
            <MikhalychChat starterQuestions={STARTER_QUESTIONS} />
          </div>

          {/* Сайдбар */}
          <div className="space-y-4">
            {/* О Михалыче */}
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                Что умеет Михалыч?
              </h2>
              <ul className="space-y-2.5">
                {[
                  { icon: "🧮", text: "Рассчитает количество материалов по вашим параметрам" },
                  { icon: "📋", text: "Объяснит технологию укладки шаг за шагом" },
                  { icon: "⚠️", text: "Предупредит о типичных ошибках и подводных камнях" },
                  { icon: "🏪", text: "Порекомендует материалы и бренды для России" },
                  { icon: "📏", text: "Ответит по нормам ГОСТ, СНиП и рекомендациям производителей" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Популярные калькуляторы */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                Калькуляторы рядом
              </h3>
              <div className="space-y-2">
                {[
                  { title: "Калькулятор бетона", href: "/kalkulyatory/fundament/beton/" },
                  { title: "Калькулятор кирпича", href: "/kalkulyatory/steny/kirpich/" },
                  { title: "Калькулятор плитки", href: "/kalkulyatory/poly/plitka/" },
                  { title: "Калькулятор кровли", href: "/kalkulyatory/krovlya/krovlya/" },
                  { title: "Калькулятор ламината", href: "/kalkulyatory/poly/laminat/" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-accent-600 dark:hover:text-accent-400 no-underline transition-colors py-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Приложение */}
            <div className="card p-5 bg-accent-50 dark:bg-accent-900/20 border-accent-100 dark:border-accent-800/40">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Михалыч в приложении</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                В приложении Мастерок Михалыч работает прямо рядом с калькулятором.
              </p>
              <Link href="/prilozhenie/" className="btn-primary text-sm w-full text-center">
                Скачать
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
