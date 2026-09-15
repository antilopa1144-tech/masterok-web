import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Captions,
  Check,
  Clapperboard,
  Clock3,
  Layers3,
  Mic2,
  Palette,
  PenTool,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import VideoServiceContactButton from "@/components/services/VideoServiceContactButton";
import VideoSocialLinks from "@/components/services/VideoSocialLinks";
import { buildPageMetadata } from "@/lib/metadata";
import { MASTEROK_SOCIAL_LINKS, SITE_NAME, SITE_URL } from "@/lib/site";

const PAGE_URL = `${SITE_URL}/services/video/`;
const HERO_IMAGE = `${SITE_URL}/services/video-production-og.webp`;

const META = {
  title: "Анимационные ролики для строительного бизнеса",
  description:
    "Короткие 3D-ролики о ремонте, инструменте и материалах: сценарий, персонажи, озвучка, субтитры и монтаж. Пилот 20–30 секунд — от 4 990 ₽.",
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
  image: HERO_IMAGE,
});

const SERVICE_STEPS = [
  {
    number: "01",
    title: "Разбираемся в задаче",
    text: "Определяем продукт, аудиторию, площадку и одно главное действие, которое должен совершить зритель.",
  },
  {
    number: "02",
    title: "Собираем сюжет",
    text: "Пишем короткий сценарий без рекламной воды, выбираем персонажа, голос и визуальный приём.",
  },
  {
    number: "03",
    title: "Производим ролик",
    text: "Анимируем сцены, записываем озвучку, добавляем субтитры, музыку и аккуратный монтаж.",
  },
  {
    number: "04",
    title: "Отдаём готовые версии",
    text: "Экспортируем файлы под выбранные площадки и проверяем, чтобы важные детали не попали под элементы интерфейса.",
  },
] as const;

const PACKAGES = [
  {
    id: "pilot",
    label: "Для первой проверки",
    title: "Пилот",
    price: "от 4 990 ₽",
    description: "Один вертикальный ролик на готовом визуальном стиле — чтобы проверить идею без дорогого продакшена.",
    items: [
      "20–30 секунд",
      "сценарий, озвучка и субтитры",
      "один файл 9:16 для выбранной площадки",
      "один раунд точечных правок",
    ],
  },
  {
    id: "three-platforms",
    label: "Самый практичный",
    title: "Три площадки",
    price: "от 8 990 ₽",
    description: "Один сюжет в трёх подготовленных версиях для YouTube Shorts, TikTok и Instagram Reels.",
    items: [
      "20–30 секунд",
      "разные безопасные зоны и финальные кадры",
      "три готовых файла и варианты подписи",
      "один раунд точечных правок",
    ],
    featured: true,
  },
  {
    id: "custom",
    label: "Под конкретный бренд",
    title: "Индивидуальный",
    price: "по смете",
    description: "Если нужен собственный персонаж, моделирование продукта, несколько сцен или серия выпусков.",
    items: [
      "индивидуальный визуальный язык",
      "сложность и хронометраж под задачу",
      "серийный формат с единым героем",
      "смета и границы работ до старта",
    ],
  },
] as const;

const FAQ = [
  {
    question: "Что входит в пилот за 4 990 ₽?",
    answer:
      "Короткий ролик длительностью 20–30 секунд на заранее согласованном готовом визуальном стиле: сценарий, озвучка, субтитры, монтаж, один вертикальный файл и один раунд точечных правок. Новая 3D-модель персонажа и сложное моделирование продукта в эту цену не входят.",
  },
  {
    question: "Почему версия для трёх площадок стоит дороже?",
    answer:
      "Это не три одинаковые копии. Для YouTube Shorts, TikTok и Instagram Reels подготавливаются отдельные файлы с безопасными зонами, подходящими финальными кадрами и вариантами подписи, чтобы элементы интерфейса площадки не перекрывали важный текст или персонажа.",
  },
  {
    question: "Можно сделать ролик с моим товаром или персонажем?",
    answer:
      "Да. Если уже есть 3D-модель, исходники, фирменный герой или упаковка, сначала проверим их пригодность. Создание новой модели, сложная анимация продукта и дополнительные сцены оцениваются отдельно до начала работы.",
  },
  {
    question: "Вы публикуете ролики в моих аккаунтах?",
    answer:
      "По умолчанию передаём готовые файлы и варианты подписей, а публикацию выполняете вы. Если потребуется помощь с размещением или серией выпусков, это можно отдельно включить в задачу после согласования доступа и объёма работ.",
  },
] as const;

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${PAGE_URL}#service`,
  name: META.title,
  description: META.description,
  url: PAGE_URL,
  image: HERO_IMAGE,
  serviceType: "Создание коротких 3D-анимационных видеороликов",
  areaServed: { "@type": "Country", name: "Россия" },
  provider: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    sameAs: MASTEROK_SOCIAL_LINKS.map((link) => link.href),
  },
  offers: PACKAGES.filter((item) => item.id !== "custom").map((item) => ({
    "@type": "Offer",
    name: item.title,
    price: item.id === "pilot" ? "4990" : "8990",
    priceCurrency: "RUB",
    url: `${PAGE_URL}#${item.id}`,
    description: item.description,
  })),
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Анимационные ролики" },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: PAGE_URL,
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function VideoServicePage() {
  return (
    <main className="overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="relative border-b border-slate-200 bg-slate-950 text-white dark:border-slate-800" aria-labelledby="video-service-title">
        <Image
          src="/services/video-production-hero.webp"
          alt="3D-персонаж строителя в студии создания коротких видеороликов"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[66%_center] opacity-60 sm:opacity-70 lg:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/92 to-slate-950/20 sm:via-slate-950/82" aria-hidden="true" />
        <div className="page-container-wide relative py-8 sm:py-12 lg:py-20">
          <Breadcrumbs items={[{ label: "Анимационные ролики" }]} tone="inverse" />
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-sm font-semibold text-orange-200 backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Видео для строительного бизнеса
            </div>
            <h1 id="video-service-title" className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Короткие анимационные ролики,
              <span className="block text-orange-400">которые хочется досмотреть</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Сюжеты о ремонте, инструменте и материалах: сценарий, 3D-персонажи, озвучка, субтитры и монтаж. Готовое видео для ваших площадок.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <VideoServiceContactButton placement="hero" className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-950/30 transition-colors hover:bg-orange-400" />
              <Link href="#channels" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white no-underline backdrop-blur transition-colors hover:bg-white/15">
                <Play size={17} fill="currentColor" aria-hidden="true" />
                Посмотреть примеры
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Пилот 20–30 секунд — от 4 990 ₽. Объём, срок и техническую реализуемость согласуем до начала работы.
            </p>
          </div>
        </div>
      </section>

      <div className="page-container-wide py-12 sm:py-16">
        <section className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center" aria-labelledby="why-video-title">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-accent-700 dark:text-accent-400">Не ещё один рекламный баннер</p>
            <h2 id="why-video-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Объясняем продукт через маленькую историю
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Вместо сухого перечня преимуществ показываем знакомую ситуацию: мастер сталкивается с проблемой, находит решение и получает понятный результат. Так в кадре естественно появляются инструмент, материал или услуга — без ощущения навязчивой рекламы.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Строительная тема здесь не декорация. Мы понимаем, чем отличается мешок смеси от ведра краски, зачем показывать узел монтажа и где зритель сразу заметит техническую нелепость.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: PenTool, title: "Сценарий", text: "Одна ясная мысль и живой сюжет" },
              { icon: Layers3, title: "3D-визуал", text: "Персонажи, предметы и сцены" },
              { icon: Mic2, title: "Озвучка", text: "Голос, музыка и звуковые акценты" },
              { icon: Captions, title: "Монтаж", text: "Ритм, субтитры и финальный экспорт" },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                  <item.icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-slate-950 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="packages" className="scroll-mt-24 pt-16 sm:pt-20" aria-labelledby="packages-title">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-accent-700 dark:text-accent-400">Форматы работы</p>
            <h2 id="packages-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Начать можно с одного ролика</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Цена «от» — не ловушка: до старта фиксируем, что именно входит в ролик и какие исходники понадобятся.</p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PACKAGES.map((item) => (
              <article
                key={item.id}
                id={item.id}
                className={`scroll-mt-24 rounded-3xl border p-6 ${"featured" in item && item.featured ? "border-orange-400 bg-slate-950 text-white shadow-xl shadow-orange-950/10" : "border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-[.14em] ${"featured" in item && item.featured ? "text-orange-300" : "text-accent-700 dark:text-accent-400"}`}>{item.label}</p>
                <h3 className="mt-3 text-2xl font-black">{item.title}</h3>
                <p className={`mt-1 text-2xl font-black ${"featured" in item && item.featured ? "text-orange-400" : "text-slate-950 dark:text-white"}`}>{item.price}</p>
                <p className={`mt-4 min-h-20 text-sm leading-relaxed ${"featured" in item && item.featured ? "text-slate-300" : "text-slate-600 dark:text-slate-300"}`}>{item.description}</p>
                <ul className="mt-5 space-y-3">
                  {item.items.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm leading-relaxed">
                      <Check size={17} className={"featured" in item && item.featured ? "mt-0.5 shrink-0 text-orange-400" : "mt-0.5 shrink-0 text-emerald-600"} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <VideoServiceContactButton
                  placement="pricing"
                  compact
                  className={`mt-6 w-full rounded-xl px-4 py-3 font-bold ${"featured" in item && item.featured ? "bg-orange-500 text-white hover:bg-orange-400" : "border border-slate-300 text-slate-800 hover:border-accent-400 hover:text-accent-700 dark:border-slate-600 dark:text-white"}`}
                >
                  Обсудить {item.title.toLowerCase()}
                </VideoServiceContactButton>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="process-title">
          <div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-accent-700 dark:text-accent-400">Процесс без тумана</p>
              <h2 id="process-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">От идеи до готового файла</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">На каждом этапе понятно, что уже согласовано и что будет дальше. Сначала смысл — потом красивая картинка.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {SERVICE_STEPS.map((step) => (
                <li key={step.number} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                  <span className="absolute right-4 top-2 text-5xl font-black text-slate-200 dark:text-slate-800" aria-hidden="true">{step.number}</span>
                  <h3 className="relative pr-10 font-bold text-slate-950 dark:text-white">{step.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="channels" className="scroll-mt-24 pt-16 sm:pt-20" aria-labelledby="channels-title">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[.18em] text-accent-700 dark:text-accent-400">Живые примеры</p>
                <h2 id="channels-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Смотрите ролики там, где их смотрят зрители</h2>
                <p className="mt-3 text-slate-600 dark:text-slate-300">В каналах — реальные опубликованные работы, стиль персонажей и то, как ролики выглядят внутри вертикальной ленты.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Smartphone size={18} aria-hidden="true" />
                Shorts · TikTok · Reels
              </div>
            </div>
            <div className="mt-6"><VideoSocialLinks links={MASTEROK_SOCIAL_LINKS} variant="cards" /></div>
          </div>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="scope-title">
          <div className="grid gap-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-8 lg:grid-cols-3">
            <div>
              <Palette size={26} className="text-orange-400" aria-hidden="true" />
              <h2 id="scope-title" className="mt-4 text-xl font-black">Что влияет на цену</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">Новая модель персонажа, количество сцен, сложность продукта, синхронизация речи и число правок.</p>
            </div>
            <div>
              <Clock3 size={26} className="text-orange-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-black">Что нужно на старте</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">Задача ролика, площадки, срок, логотип, материалы о продукте и пара примеров, которые вам нравятся.</p>
            </div>
            <div>
              <ShieldCheck size={26} className="text-orange-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-black">Что фиксируем заранее</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">Хронометраж, формат, состав сцен, количество версий и правок. Доплаты без нового согласования не появляются.</p>
            </div>
          </div>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="faq-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="faq-title" className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Частые вопросы</h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900 sm:px-7">
              {FAQ.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-950 marker:content-none dark:text-white">
                    {item.question}
                    <span className="text-xl text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="final-cta-title">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 px-6 py-10 text-white shadow-xl shadow-orange-950/10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <Clapperboard className="absolute -right-8 -top-10 h-52 w-52 rotate-12 text-white/10" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[.16em] text-orange-100">Можно начать с черновой идеи</p>
              <h2 id="final-cta-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Расскажите, что хотите показать</h2>
              <p className="mt-3 leading-relaxed text-orange-50">Поможем превратить продукт, услугу или строительную ситуацию в короткий сюжет и до старта честно скажем, что реально сделать в вашем бюджете.</p>
            </div>
            <VideoServiceContactButton placement="final" className="relative mt-6 w-full shrink-0 rounded-xl bg-white px-6 py-3 font-bold text-orange-700 shadow-lg transition-colors hover:bg-orange-50 lg:mt-0 lg:w-auto" />
          </div>
        </section>
      </div>
    </main>
  );
}
