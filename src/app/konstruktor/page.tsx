import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ConstructorGuideLinks from "@/components/constructor/ConstructorGuideLinks";
import { ArrowUpRight, Box, Download, Layers, Ruler, Scissors } from "lucide-react";
import ConstructorStartActions from "@/components/constructor/ConstructorStartActions";
import ConstructorMeasureGuide from "@/components/constructor/ConstructorMeasureGuide";
import ConstructorMobileStart from "@/components/constructor/ConstructorMobileStart";
import { CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_FURNITURE_URL, CONSTRUCTOR_SCENARIOS, projectStartHref, scenarioHref } from "@/lib/constructor/entry";
import { classicLayoutHref } from "@/lib/constructor/layout-entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";
import ProjectPreview from "@/components/home/ProjectPreview";
import landing from "./Landing.module.css";

const description = "Создайте комнату по своим размерам: отделка в 3D, раскладка ламината и плитки, развёртки стен и упаковки к покупке. Бесплатный онлайн-конструктор без регистрации.";

export const metadata: Metadata = buildPageMetadata({
  title: "3D-конструктор комнаты: плитка и ламинат онлайн",
  description,
  url: `${SITE_URL}/konstruktor/`,
  image: `${SITE_URL}/konstruktor/og/`,
  imageDimensions: { width: 1200, height: 630 },
});

const questions = [
  { question: "Как найти материал в ведомости нескольких помещений?", answer: "Раскройте над ведомостью блок «Найти или отправить список». Если позиций больше одной, в нём есть поле «Найти материал». Введите название, формат или название помещения; например, «плитка 600×300» или «кухня». Поиск показывает подходящие позиции, но не делит общую закупку по комнатам: количество в строке, итоговая стоимость, PDF и XLSX относятся ко всему проекту. Кнопка «Сбросить поиск» возвращает полный список. При повторном открытии ведомости видны все материалы." },
  { question: "Как изменить цену или упаковку из ведомости?", answer: "В нужной позиции раскройте «Изменить материал, упаковку или цену». Для ламината и плитки нажмите «Упаковка и цена» под нужным помещением и поверхностью: редактор сразу раскроет раздел «Упаковка и стоимость» и прокрутит к нему. Кнопка с названием поверхности открывает выбор материала. Для смесей выберите поверхность и раскройте «Клей и затирка». После изменения вернитесь в «Ведомость»: количество и стоимость пересчитаются. Один товар может объединять несколько помещений и поверхностей, поэтому проверьте их настройки перед покупкой." },
  { question: "Можно ли спланировать кухню в 3D?", answer: "Да. Нажмите «Создать свой проект», выберите «Кухня» и перейдите к размерам. В редакторе можно менять габариты и положение условного гарнитура, холодильника и стола, добавлять проёмы и выбирать отделку. Это планирование помещения, а не проектирование кухонных модулей: деталировка шкафов, столешница, подключения и открывание техники не рассчитываются. Мебель и техника не входят в ведомость отделки." },
  { question: "Как начать проект по своим размерам?", answer: "Нажмите «Создать свой проект», выберите тип помещения и укажите его название, ширину, длину и высоту в миллиметрах. Нажмите «Открыть 3D-проект» — редактор откроется с этим помещением. До подтверждения новая работа не сохраняется. Двери, окна, обстановку и отделку можно настроить позже. Для знакомства с редактором есть отдельные готовые примеры." },
  { question: "Что можно спланировать в конструкторе?", answer: "Прямоугольные комнаты с дверями и окнами. Можно задать размеры, выбрать ламинат или плитку для пола, разложить плитку на стенах и расставить условную мебель. Комнаты объединяются в один проект." },
  { question: "Как проверить расстановку мебели?", answer: "Откройте раздел «Обстановка». В блоке «Проверка расстановки» собраны предметы с пересечениями, выходом за границы комнаты, превышением высоты потолка и замечаниями у проёмов. Там же видны предметы, которым не нашлось места автоматически. Нажмите на предмет в списке, чтобы открыть его параметры. При наличии замечаний возле 3D-комнаты и плана появляется кнопка «Замечания». Зоны у дверей и окон условные; открывание створок, подключения техники и монтажные зазоры нужно проверить отдельно." },
  { question: "Как добавить дверь или окно на нужную стену?", answer: "Откройте раздел «Размеры» и нажмите «Дверь» или «Окно». Выберите стену на схеме, задайте ширину, высоту и отступ от угла, а для окна — высоту подоконника. Стены пронумерованы по часовой стрелке; точка и стрелки на плане показывают, откуда считать отступ. Подтвердите добавление. Кнопка «Изменить» в карточке проёма откроет ту же форму, а «На стене» покажет развёртку. Проёмы исключаются из площади отделки стены, двери — из длины плинтуса. Сами двери и окна в закупку отделки не входят." },
  { question: "Можно ли рассчитать материалы для нескольких помещений?", answer: "Да. Нажмите «Добавить помещение», выберите тип — например, ванную, кухню или спальню — и задайте название, ширину, длину и высоту. Для каждого помещения можно выбрать свою отделку. В общей ведомости материалы собираются по всему проекту, а одинаковый товар объединяется перед округлением до упаковок. Размеры меняются ползунками или точным вводом по нажатию на значение." },
  { question: "Как считается количество материалов?", answer: "Раскладка учитывает размеры элементов, швы, направление и подрезки. В ведомости сразу видны материалы и упаковки к покупке. Раскройте «Расчёт и запас» в нужной позиции, чтобы проверить исходную потребность, резерв и остаток от округления. Фасовку и цену можно задать по выбранному товару. Для плитки доступны настройки клея и затирки." },
  { question: "Можно ли сохранить проект и вернуться позже?", answer: "Да. Проекты автоматически сохраняются в этом браузере. Нажмите «Мои проекты» в начале страницы, чтобы найти и открыть нужную работу по названию. Для резервной копии или переноса на другое устройство скачайте файл проекта через меню «Экспорт». На другом устройстве нажмите «Открыть файл проекта» в начале этой страницы и выберите файл .masterok.json. Он откроется как отдельная копия. Облачной синхронизации пока нет." },
  { question: "Как скачать результат или отправить список материалов?", answer: "Можно скачать PNG с текущим видом, PDF со схемами, ведомостью и картами реза, XLSX с закупкой и исходными данными, а также редактируемый файл проекта. Чтобы отправить материалы сообщением, в ведомости раскройте «Найти или отправить список», нажмите «Поделиться списком», если браузер поддерживает эту кнопку, и выберите приложение и получателя. Другой способ — «Скопировать список» и вставка текста в сообщение. Передаётся весь проект, даже при активном поиске: названия, форматы, помещения, количества к покупке и заданные цены. Если браузер запретит копирование, выделите предложенный текст вручную. Текстовый список не заменяет файл проекта и не переносит 3D-модель." },
  { question: "Как сравнить две расстановки или варианты отделки?", answer: "Нажмите «Сравнить варианты» и сохраните текущий проект под понятным названием. Измените расстановку или отделку и сохраните второй вариант. В окне сравнения можно выбрать до двух сохранённых вариантов и одну комнату для просмотра планов. Расход и стоимость материалов показаны по всему проекту. Перед применением раскройте «Что изменится в проекте»: вариант восстанавливает все помещения, их размеры, проёмы, обстановку и материалы. Кнопка «Отменить действие» вернёт предыдущее состояние. Варианты также входят в скачиваемый файл проекта." },
  { question: "Конструктор работает на телефоне?", answer: "Да, редактор адаптирован для телефона и компьютера. Размеры меняются ползунками, кнопками шага или точным вводом по нажатию на значение. Для 3D нужна поддержка WebGL в браузере." },
  { question: "Какие есть ограничения?", answer: "Сейчас доступны прямоугольные комнаты, палубная раскладка ламината и прямая раскладка плитки. Обстановка нужна для масштаба и не входит в закупку. Сложные контуры, ёлочку и диагональную плитку в этом редакторе пока не рассчитываем — для части таких задач есть отдельные инструменты." },
];

const quickTools = [
  { href: classicLayoutHref("laminate"), title: "Ламинат ёлочкой", description: "Отдельная схема одного пола", icon: Layers },
  { href: classicLayoutHref("tile"), title: "Диагональная плитка", description: "Схема одной поверхности", icon: Box },
  { href: "/instrumenty/raskladka-listov/", title: "Раскрой листов", description: "Детали, пропил и остатки", icon: Scissors },
  { href: "/instrumenty/raskladka-oboev/", title: "Раскладка обоев", description: "Полотна и совмещение рисунка", icon: Ruler },
];

export default function ConstructorPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: "Конструктор Мастерок",
    description, url: `${SITE_URL}/konstruktor/`, applicationCategory: "DesignApplication", operatingSystem: "Web",
    screenshot: `${SITE_URL}/images/constructor/bathroom-editor-2026.webp`,
    inLanguage: "ru", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    featureList: ["3D и план комнаты", "Раскладка ламината и плитки", "Развёртки стен", "Сравнение планов, расстановки и отделки", "Подрезки и упаковки к покупке", "Экспорт PDF, PNG и XLSX"],
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: questions.map(({ question, answer }) => ({
      "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  return <div className={`${styles.page} ${landing.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    <section className={`${styles.hero} ${landing.hero}`} aria-labelledby="constructor-title">
      <div className={`${styles.heroCopy} ${landing.heroCopy}`}>
        <div className={styles.productName}><Box size={21} />Конструктор Мастерок</div>
        <h1 id="constructor-title">От комнаты в 3D<br /> до списка покупок.</h1>
        <p className={styles.intro}>Размеры, отделка и закупка в одном проекте. Проверьте свои идеи до начала ремонта.</p>
      </div>
      <div className={landing.preview}><ProjectPreview bathroom /></div>
      <div className={landing.heroActions}><ConstructorStartActions /></div>
    </section>
    <ConstructorMobileStart />
    <div className={`${styles.capabilities} ${landing.capabilities}`} aria-label="Возможности конструктора">
      <span><Ruler size={19} />Размеры и проёмы</span><span><Layers size={19} />Отделка и подрезки</span><span><Box size={19} />Упаковки к покупке</span><span><Download size={19} />PDF, PNG и Excel</span>
    </div>
    <nav className={styles.pageNav} aria-label="На этой странице">
      <a href="#room-planning">Комната</a><a href="#kitchen-planning">Кухня</a><a href="#scenarios">Готовые примеры</a><a href="#faq-title">Вопросы и ограничения</a>
    </nav>
    <section id="scenarios" className={styles.section} aria-labelledby="scenarios-title">
      <div className={styles.sectionHeading}><div><h2 id="scenarios-title">Попробуйте на готовом примере</h2><p>Посмотрите, как устроен редактор. Любой пример можно изменить под своё помещение.</p></div><span className={styles.quiet}>Каждый пример — отдельный проект</span></div>
      <div className={`${styles.scenarios} ${landing.scenarios}`}>
        {CONSTRUCTOR_SCENARIOS.map((scenario) => <Link key={scenario.id} href={scenarioHref(scenario.id)} prefetch={false} className={`${styles.scenario} ${landing.scenario}`}>
          <div className={`${styles.scenarioVisual} ${landing.scenarioVisual}`}>
            <Image src={scenario.id === "bathroom" ? "/images/constructor/bathroom-scene-2026.webp" : scenario.id === "laminate" ? "/images/laminate-textures/natural-oak.webp" : scenario.id === "tile" ? "/images/tile-textures/limestone.webp" : "/images/constructor/room-scene-2026.webp"} alt="" fill sizes="(max-width: 359px) 100vw, (max-width: 1100px) 50vw, 25vw" />
            <span>{scenario.id === "bathroom" ? "Пол и стены" : scenario.id === "laminate" ? "Ряды и стыки" : scenario.id === "tile" ? "Швы и подрезки" : "Размеры и отделка"}</span>
          </div>
          <div className={`${styles.scenarioCopy} ${landing.scenarioCopy}`}><h3>{scenario.title}</h3><p>{scenario.description}</p><span className={styles.scenarioAction}>Открыть пример<ArrowUpRight size={20} /></span></div>
        </Link>)}
      </div>
    </section>
    <section className={`${styles.section} ${styles.workflow} ${landing.workflow}`} aria-labelledby="workflow-title">
      <div><h2 id="workflow-title">Сначала проверьте<br /> на экране.</h2><p className={styles.intro}>Поменять направление досок или начало раскладки проще до покупки и укладки.</p><Link href={scenarioHref("bathroom")} prefetch={false} className={styles.textAction}>Попробовать на ванной <ArrowUpRight size={18} /></Link><p className={styles.toolsNote}><Link href={CONSTRUCTOR_BATHROOM_URL}>Конструктор ванной: от расстановки до плитки</Link> — что задать в проекте и как получить ведомость.</p><p className={styles.toolsNote}><Link href={CONSTRUCTOR_FURNITURE_URL}>Расстановка мебели в комнате онлайн</Link> — свои габариты, перемещение в 3D и общий список замечаний.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Задайте помещение</h3><p>В новом проекте выберите тип и задайте свои размеры. Двери и окна добавьте в редакторе. Другие помещения можно объединить в ту же работу.</p></div></li>
        <li><span>2</span><div><h3>Сравните варианты</h3><p>Выберите формат и направление укладки, попробуйте разную расстановку. Сохраните варианты и сопоставьте планы одной комнаты, расход и стоимость материалов. Перед применением проверьте список изменений по всему проекту.</p></div></li>
        <li><span>3</span><div><h3>Соберите список материалов</h3><p>Проверьте запас и фасовку, укажите свои цены и скачайте ведомость вместе со схемами.</p></div></li>
      </ol>
    </section>
    <section className={`${styles.section} ${landing.planning}`} aria-label="Планирование комнаты и кухни">
      <article id="room-planning" aria-labelledby="room-planning-title">
        <p className={landing.eyebrow}>Комната</p><h2 id="room-planning-title">От расстановки до покрытия пола</h2>
        <p>Начните с размеров комнаты, добавьте дверь и окна. Расставьте мебель, затем выберите ламинат или плитку: направление укладки и размер элементов влияют на подрезки.</p>
        <p>Мебель помогает оценить пространство, но не вычитается из площади пола. Перед покупкой проверьте запас и фасовку в ведомости. Сложный контур помещения редактор пока не рассчитывает.</p>
        <Link href={projectStartHref("room")} prefetch={false} className={styles.textAction}>Создать свою комнату <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <p className={styles.toolsNote}>Для стен: <Link href="/instrumenty/raskladka-oboev/">раскладка обоев с рисунком</Link>. Этот отдельный расчёт не добавляется в ведомость 3D-проекта.</p>
      </article>
      <article id="kitchen-planning" aria-labelledby="kitchen-planning-title">
        <p className={landing.eyebrow}>Кухня</p><h2 id="kitchen-planning-title">Проверьте место для мебели и техники</h2>
        <p>В новом проекте выберите «Кухня», укажите размеры и откройте редактор. Измените положение и габариты гарнитура, холодильника и стола; добавьте проёмы и проверьте замечания о пересечениях.</p>
        <p>Гарнитур показан условно: отдельные модули, столешница и подключения здесь не проектируются. Открывание техники и монтажные зазоры проверяйте отдельно. Ведомость включает отделку, а не стоимость кухни.</p>
        <Link href={projectStartHref()} prefetch={false} className={styles.textAction}>Создать проект и выбрать кухню <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <p className={styles.toolsNote}>Подробнее: <Link href={CONSTRUCTOR_FURNITURE_URL}>расстановка мебели и проверка пересечений</Link>.</p>
      </article>
    </section>
    <div className={landing.editor}><details><summary><span>Посмотрите, как устроен редактор</span><span aria-hidden="true">＋</span></summary><Image src="/images/constructor/bathroom-editor-2026.webp" alt="Интерфейс конструктора: ванная в 3D, параметры плитки справа, переход к ведомости" width={1440} height={1100} sizes="(max-width: 900px) 100vw, 1200px" /></details></div>
    <div className={landing.measureGuide}><details><summary>Как измерить помещение перед началом<Ruler size={18} aria-hidden="true" /></summary><ConstructorMeasureGuide /></details></div>
    <section className={styles.section} aria-labelledby="quick-tools-title">
      <div className={styles.sectionHeading}><div><h2 id="quick-tools-title">Для отдельных задач</h2><p>Ёлочка, диагональ и другие схемы, которых пока нет в 3D.</p></div><Link href="/instrumenty/" className={styles.textAction}>Все инструменты <ArrowUpRight size={18} /></Link></div>
      <div className={styles.quickTools}>{quickTools.map(({ href, title, description: text, icon: Icon }) => <Link key={href} href={href} className={styles.quickTool}><Icon size={24} /><h3>{title}</h3><p>{text}</p></Link>)}</div>
      <p className={styles.toolsNote}>Также доступны <Link href="/instrumenty/rasstanovka-svetilnikov/">схема светильников</Link>, <Link href="/instrumenty/kalendar-remonta/">календарь ремонта</Link>, раскрой и справочники материалов.</p>
    </section>
    <section className={`${styles.section} ${styles.faq} ${landing.faq}`} aria-labelledby="faq-title"><div><h2 id="faq-title">Перед началом</h2><p>Что умеет конструктор<br />и как сохранить работу.</p></div><div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <ConstructorGuideLinks current="/konstruktor/" />
    <section className={landing.closing} aria-label="Начать свой проект"><div><h2>Теперь — ваше помещение</h2><p>Начните с размеров. Отделку и обстановку можно менять в процессе.</p></div><Link href={projectStartHref()} prefetch={false} className={styles.primaryAction}>Начать новый проект<ArrowUpRight size={18} /></Link></section>
  </div>;
}
