import type { Metadata } from "next";
import Link from "next/link";
import { getCalculatorBySlug } from "@/lib/calculators";
import MikhalychChat from "@/components/mikhalych/MikhalychChat";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Михалыч — AI-ассистент строителя | ${SITE_NAME}`,
  description:
    "Спросите Михалыча — опытного строительного ИИ-мастера. Расчёты, технологии, советы по материалам. Отвечает как настоящий прораб.",
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/mikhalych/`,
});

const UI_TEXT = {
  heroTitle: "Михалыч — AI-ассистент строителя",
  heroDescription:
    "Опытный строительный мастер с 30-летним стажем. Поможет рассчитать материалы, объяснит технологию и предупредит об ошибках. Говорит просто, по делу.",
  skillsTitle: "Что умеет Михалыч?",
  nearbyTitle: "Калькуляторы рядом",
  appTitle: "Михалыч в приложении",
  appDescription:
    `В приложении ${SITE_NAME} Михалыч работает прямо рядом с калькулятором.`,
  download: "Скачать",
  nearbyCalculatorFallback: "Калькулятор",
} as const;

const HERO_TAGS = [
  "Расчёт материалов",
  "Технологии монтажа",
  "ГОСТ и СНиП",
  "Выбор материалов",
] as const;

const STARTER_QUESTIONS = [
  "Сколько кирпичей нужно на перегородку 5×2.7 м в полкирпича?",
  "Какую марку бетона выбрать для фундамента частного дома?",
  "Как рассчитать количество обоев для комнаты 4×3 метра?",
  "Чем лучше клеить пенопласт к стене — клей или дюбели?",
  "Какой утеплитель лучше для кровли — минвата или пеноплекс?",
  "Как правильно рассчитать стяжку пола толщиной 50 мм?",
] as const;

const CAPABILITIES = [
  { icon: "🧮", text: "Рассчитает количество материалов по вашим параметрам" },
  { icon: "📋", text: "Объяснит технологию укладки шаг за шагом" },
  { icon: "⚠️", text: "Предупредит о типичных ошибках и подводных камнях" },
  { icon: "🏪", text: "Порекомендует материалы и бренды для России" },
  { icon: "📏", text: "Ответит по нормам ГОСТ, СНиП и рекомендациям производителей" },
] as const;

const NEARBY_CALCULATOR_SLUGS = ["beton", "kirpich", "plitka", "krovlya", "laminat"] as const;

const NEARBY_CALCULATORS = NEARBY_CALCULATOR_SLUGS.map((slug) => {
  const calculator = getCalculatorBySlug(slug);

  return {
    slug,
    href: calculator ? `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/` : "/kalkulyatory/",
    title: calculator?.title ?? UI_TEXT.nearbyCalculatorFallback,
  };
});

export default function MikhalychPage() {
  return (
    <div>
      <div className="bg-linear-to-br from-slate-800 to-slate-700 text-white">
        <div className="page-container-wide py-8 md:py-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-accent-500 rounded-2xl flex items-center justify-center text-3xl shrink-0">
              🤖
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {UI_TEXT.heroTitle}
              </h1>
              <p className="text-slate-300 mt-2 leading-relaxed max-w-xl">
                {UI_TEXT.heroDescription}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {HERO_TAGS.map((tag) => (
                  <span key={tag} className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MikhalychChat starterQuestions={[...STARTER_QUESTIONS]} />
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                {UI_TEXT.skillsTitle}
              </h2>
              <ul className="space-y-2.5">
                {CAPABILITIES.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                {UI_TEXT.nearbyTitle}
              </h3>
              <div className="space-y-2">
                {NEARBY_CALCULATORS.map((link) => (
                  <Link
                    key={link.slug}
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-accent-600 dark:hover:text-accent-400 no-underline transition-colors py-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-5 bg-accent-50 dark:bg-accent-900/20 border-accent-100 dark:border-accent-800/40">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{UI_TEXT.appTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                {UI_TEXT.appDescription}
              </p>
              <Link href="/prilozhenie/" className="btn-primary text-sm w-full text-center">
                {UI_TEXT.download}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




