import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Box, Check, Download, Layers, Ruler, Scissors } from "lucide-react";
import ConstructorStartActions from "@/components/constructor/ConstructorStartActions";
import { CONSTRUCTOR_SCENARIOS, scenarioHref } from "@/lib/constructor/entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";

const description = "Спланируйте отделку комнаты в 3D: раскладка ламината и плитки, развёртки стен, подрезки и материалы к покупке. Бесплатный онлайн-конструктор без регистрации.";

export const metadata: Metadata = buildPageMetadata({
  title: "3D-конструктор комнаты: плитка и ламинат онлайн",
  description,
  url: `${SITE_URL}/konstruktor/`,
  image: `${SITE_URL}/konstruktor/og/`,
  imageDimensions: { width: 1200, height: 630 },
});

const questions = [
  { question: "Что можно спланировать в конструкторе?", answer: "Прямоугольные комнаты с дверями и окнами. Можно задать размеры, выбрать ламинат или плитку для пола, разложить плитку на стенах и расставить условную мебель. Комнаты объединяются в один проект." },
  { question: "Как считается количество материалов?", answer: "Раскладка учитывает размеры элементов, швы, направление и подрезки. В ведомости отдельно показаны потребность, запас и упаковки к покупке. Фасовку и цену можно задать по выбранному товару. Для плитки доступны настройки клея и затирки." },
  { question: "Можно ли сохранить проект и вернуться позже?", answer: "Да. Проекты автоматически сохраняются в этом браузере. Для резервной копии или переноса на другое устройство скачайте файл проекта и затем импортируйте его в редакторе. Облачной синхронизации пока нет." },
  { question: "Что можно скачать?", answer: "PNG с текущим видом, PDF со схемами, ведомостью и картами реза, XLSX с закупкой и исходными данными, а также редактируемый файл проекта." },
  { question: "Конструктор работает на телефоне?", answer: "Да, редактор адаптирован для телефона и компьютера. Размеры меняются ползунками, кнопками шага или точным вводом по нажатию на значение. Для 3D нужна поддержка WebGL в браузере." },
  { question: "Какие есть ограничения?", answer: "Сейчас доступны прямоугольные комнаты, палубная раскладка ламината и прямая раскладка плитки. Обстановка нужна для масштаба и не входит в закупку. Сложные контуры, ёлочку и диагональную плитку в этом редакторе пока не рассчитываем — для части таких задач есть отдельные инструменты." },
];

const quickTools = [
  { href: "/instrumenty/raskladka-laminata/", title: "Ламинат и ёлочка", description: "Быстрая схема одного пола", icon: Layers },
  { href: "/instrumenty/raskladka-plitki/", title: "Раскладка плитки", description: "Одна поверхность, включая диагональ", icon: Box },
  { href: "/instrumenty/raskladka-listov/", title: "Раскрой листов", description: "Детали, пропил и остатки", icon: Scissors },
  { href: "/instrumenty/raskladka-oboev/", title: "Раскладка обоев", description: "Полотна и совмещение рисунка", icon: Ruler },
];

export default function ConstructorPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: "Конструктор Мастерок",
    description, url: `${SITE_URL}/konstruktor/`, applicationCategory: "DesignApplication", operatingSystem: "Web",
    screenshot: `${SITE_URL}/images/constructor/room-editor.jpg`,
    inLanguage: "ru", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    featureList: ["3D и план комнаты", "Раскладка ламината и плитки", "Развёртки стен", "Подрезки и упаковки к покупке", "Экспорт PDF, PNG и XLSX"],
  };
  return <div className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className={styles.hero} aria-labelledby="constructor-title">
      <div className={styles.heroCopy}>
        <div className={styles.productName}><Box size={21} />Конструктор Мастерок</div>
        <h1 id="constructor-title">Ваша комната.<br /> От размеров<br /> до материалов.</h1>
        <p className={styles.intro}>Спланируйте отделку в 3D. Посмотрите раскладку плитки и ламината, проверьте подрезки и узнайте, сколько упаковок покупать.</p>
        <ConstructorStartActions />
      </div>
      <figure className={styles.heroPreview}>
        <div className={styles.previewLabel}><span><Box size={16} />Настоящий редактор</span><span>3D · План · Развёртки</span></div>
        <Image src="/images/constructor/room-editor.jpg" alt="Гостиная в конструкторе: 3D-комната, раскладка ламината и ведомость материалов" width={1274} height={717} priority sizes="(max-width: 900px) 100vw, 65vw" />
        <figcaption><Check size={16} />Размеры, раскладки и закупка связаны в одном проекте.</figcaption>
      </figure>
    </section>
    <div className={styles.capabilities} aria-label="Возможности конструктора">
      <span><Ruler size={19} />Размеры и проёмы</span><span><Layers size={19} />Отделка и подрезки</span><span><Box size={19} />Упаковки к покупке</span><span><Download size={19} />PDF, PNG и Excel</span>
    </div>
    <section id="scenarios" className={styles.section} aria-labelledby="scenarios-title">
      <div className={styles.sectionHeading}><div><h2 id="scenarios-title">С чего начнём?</h2><p>Откройте пример и измените размеры под своё помещение.</p></div><span className={styles.quiet}>Каждый пример — отдельный проект</span></div>
      <div className={styles.scenarios}>
        {CONSTRUCTOR_SCENARIOS.map((scenario) => <Link key={scenario.id} href={scenarioHref(scenario.id)} prefetch={false} className={styles.scenario}>
          <div className={`${styles.scenarioVisual} ${scenario.id === "laminate" ? styles.laminateVisual : ""}`}>
            <Image src={scenario.id === "bathroom" ? "/images/constructor/bathroom-editor.jpg" : scenario.id === "laminate" ? "/images/laminate-textures/natural-oak.webp" : "/images/constructor/room-editor.jpg"} alt="" fill sizes="(max-width: 650px) 100vw, 33vw" />
            <span>{scenario.id === "bathroom" ? "Пол и стены" : scenario.id === "laminate" ? "Ряды и стыки" : "Размеры и отделка"}</span>
          </div>
          <div className={styles.scenarioCopy}><h3>{scenario.title}</h3><p>{scenario.description}</p><span className={styles.scenarioAction}>{scenario.action}<ArrowUpRight size={20} /></span></div>
        </Link>)}
      </div>
    </section>
    <section className={`${styles.section} ${styles.workflow}`} aria-labelledby="workflow-title">
      <div><h2 id="workflow-title">Сначала проверьте<br /> на экране.</h2><p className={styles.intro}>Поменять направление досок или начало раскладки проще до покупки и укладки.</p><Link href={scenarioHref("bathroom")} prefetch={false} className={styles.textAction}>Попробовать на ванной <ArrowUpRight size={18} /></Link></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Задайте помещение</h3><p>Размеры комнаты, двери и окна. Добавьте другие помещения, если планируете несколько сразу.</p></div></li>
        <li><span>2</span><div><h3>Сравните отделку</h3><p>Выберите формат и направление. Рассмотрите швы, крайние подрезки и развёртки стен. Сохраните варианты для сравнения.</p></div></li>
        <li><span>3</span><div><h3>Соберите список материалов</h3><p>Проверьте запас и фасовку, укажите свои цены и скачайте ведомость вместе со схемами.</p></div></li>
      </ol>
    </section>
    <section className={styles.section} aria-labelledby="quick-tools-title">
      <div className={styles.sectionHeading}><div><h2 id="quick-tools-title">Нужна только одна раскладка?</h2><p>Отдельные инструменты помогут решить небольшую задачу.</p></div><Link href="/instrumenty/" className={styles.textAction}>Все инструменты <ArrowUpRight size={18} /></Link></div>
      <div className={styles.quickTools}>{quickTools.map(({ href, title, description: text, icon: Icon }) => <Link key={href} href={href} className={styles.quickTool}><Icon size={24} /><h3>{title}</h3><p>{text}</p></Link>)}</div>
      <p className={styles.toolsNote}>Также доступны <Link href="/instrumenty/rasstanovka-svetilnikov/">схема светильников</Link>, <Link href="/instrumenty/kalendar-remonta/">календарь ремонта</Link>, раскрой и справочники материалов.</p>
    </section>
    <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title"><div><h2 id="faq-title">Перед началом</h2><p>Что умеет конструктор<br />и как сохранить работу.</p></div><div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  </div>;
}
