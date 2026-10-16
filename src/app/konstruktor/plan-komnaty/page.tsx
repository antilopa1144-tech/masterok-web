import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Download, Ruler } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConstructorGuideLinks from "@/components/constructor/ConstructorGuideLinks";
import ConstructorMeasureGuide from "@/components/constructor/ConstructorMeasureGuide";
import ConstructorMobileStart from "@/components/constructor/ConstructorMobileStart";
import { CONSTRUCTOR_PLAN_URL, CONSTRUCTOR_URL, projectStartHref, scenarioHref } from "@/lib/constructor/entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";
import plan from "./Plan.module.css";

const url = `${SITE_URL}${CONSTRUCTOR_PLAN_URL}`;
export const metadata: Metadata = buildPageMetadata({
  title: "План комнаты с размерами онлайн — 2D и 3D",
  description: "Начертите план прямоугольной комнаты по своим размерам: двери, окна, мебель, вид сверху и 3D. Сохраните план в PNG или PDF. Бесплатно, без регистрации.",
  url,
  image: `${SITE_URL}/images/constructor/room-editor.jpg`,
  imageDimensions: { width: 1274, height: 717 },
});

const questions = [
  { question: "Как нарисовать план комнаты по размерам онлайн?", answer: "Нажмите «Создать план комнаты», введите ширину, длину и высоту в миллиметрах и откройте 3D-проект. В разделе «Размеры» добавьте двери и окна. Переключитесь на «План», чтобы увидеть помещение сверху. Мебель настраивается в разделе «Обстановка»." },
  { question: "Можно ли сделать план на телефоне?", answer: "Да. Размеры меняются ползунками, а нажатие на число открывает точный ввод. После создания помещения переключитесь на «План». Для изменения положения мебели выберите предмет в разделе «Обстановка» и нажмите «Показать предмет на плане»: можно перетащить его или сдвинуть стрелками с шагом 1, 10 или 100 мм." },
  { question: "Как сохранить план комнаты в PDF или PNG?", answer: "Откройте вид «План» и меню «Экспорт», выберите PNG или PDF. Это файлы для просмотра. Для продолжения работы на другом устройстве скачайте файл проекта .masterok.json и откройте его там через «Открыть файл проекта». Проект сохраняется в текущем браузере; одна ссылка на редактор не переносит его данные." },
  { question: "Можно ли построить Г-образную комнату или общий план квартиры?", answer: "В редакторе поддерживаются прямоугольные помещения. В одном проекте можно хранить несколько комнат, но соединить их в общий план квартиры, нарисовать сложный контур, ниши или короба пока нельзя. Для расчёта площади Г-образной комнаты используйте отдельный калькулятор площади." },
  { question: "Подойдёт ли этот план для перепланировки или заказа мебели?", answer: "План помогает сравнить варианты обстановки и отделки. Он не заменяет обмерный чертёж для согласования перепланировки или изготовления мебели: редактор не моделирует кривизну стен, коммуникации, монтажные зазоры и открывание створок. Перед заказом проверьте размеры на месте и требования производителя." },
];

export default function RoomPlanPage() {
  const structured = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Конструктор", item: `${SITE_URL}${CONSTRUCTOR_URL}` },
      { "@type": "ListItem", position: 3, name: "План комнаты с размерами", item: url },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ];
  return <div className={`${styles.page} ${plan.page}`}>
    {structured.map(item => <script key={item["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />)}
    <div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: "Конструктор", href: CONSTRUCTOR_URL }, { label: "План комнаты" }]} /></div>
    <section className={`${styles.hero} ${styles.scenarioHero}`} aria-labelledby="plan-title">
      <div className={styles.heroCopy}>
        <p className={styles.productName}><Ruler size={20} aria-hidden="true" />Конструктор Мастерок</p>
        <h1 id="plan-title">План комнаты<br /> с вашими размерами.</h1>
        <p className={styles.intro}>Задайте габариты, добавьте двери и окна. Посмотрите комнату сверху, примерьте мебель и сохраните план для обсуждения ремонта.</p>
        <div className={styles.startActions}>
          <Link href={projectStartHref("room")} prefetch={false} className={styles.primaryAction}>Создать план комнаты<ArrowUpRight size={18} aria-hidden="true" /></Link>
          <Link href={scenarioHref("room")} prefetch={false} className={styles.secondaryAction}>Посмотреть пример</Link>
          <p className={styles.startNote}>Бесплатно, без регистрации. После ввода размеров откройте вид «План».</p>
        </div>
      </div>
      <figure className={`${styles.heroPreview} ${plan.preview}`}>
        <div className={styles.previewLabel}><span>Сначала — размеры</span><span>Пример · 4000 × 3000 мм</span></div>
        <svg viewBox="0 0 560 480" role="img" aria-labelledby="plan-example-title" className={plan.drawing}>
          <title id="plan-example-title">Схема прямоугольной комнаты 4 на 3 метра: окно сверху, дверь снизу, диван справа</title>
          <path d="M80 380V80H225 M345 80H480V380H210 M140 380H80" className={plan.wall} />
          <path d="M225 75H345V85H225Z" className={plan.window} />
          <path d="M140 380V310 Q210 310 210 380" className={plan.door} />
          <rect x="382" y="134" width="70" height="160" rx="10" className={plan.furniture} />
          <rect x="286" y="182" width="54" height="65" rx="15" className={plan.furniture} />
          <path d="M80 405V435 M480 405V435 M80 422H480 M40 80H64 M40 380H64 M52 80V380" className={plan.dimension} />
          <text x="280" y="452" textAnchor="middle">4 000 мм</text>
          <text x="27" y="230" textAnchor="middle" transform="rotate(-90 27 230)">3 000 мм</text>
          <text x="285" y="58" textAnchor="middle">Окно</text>
          <text x="174" y="405" textAnchor="middle">Дверь</text>
          <text x="230" y="208" textAnchor="middle" className={plan.area}>12 м²</text>
        </svg>
        <figcaption>Иллюстрация к замерам. В редакторе план строится по введённым размерам.</figcaption>
      </figure>
    </section>
    <ConstructorMobileStart scenario="room" label="План по вашим размерам" navigationLabel="Создать план комнаты" />
    <nav className={styles.pageNav} aria-label="О плане комнаты"><a href="#constructor-measurements">Что измерить</a><a href="#plan-steps">Как построить</a><a href="#plan-export">Как сохранить</a><a href="#plan-questions">Вопросы</a></nav>
    <ConstructorMeasureGuide />
    <section id="plan-steps" className={`${styles.section} ${styles.workflow}`} aria-labelledby="plan-steps-title">
      <div><h2 id="plan-steps-title">От замеров<br /> к виду сверху</h2><p className={styles.intro}>Один проект переключается между 3D и планом. Повторно вводить размеры не нужно.</p><p className={styles.toolsNote}>На телефоне нажмите на значение рядом с ползунком для точного ввода. Например, 3,25 м нужно записать как 3250 мм.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Создайте прямоугольную комнату</h3><p>Введите название, ширину, длину и высоту. Нажмите «Открыть 3D-проект». Для первого эскиза не нужно выбирать все материалы или заполнять цены.</p></div></li>
        <li><span>2</span><div><h3>Отметьте проёмы</h3><p>В разделе «Размеры» добавьте дверь или окно на выбранной стене. Проверьте на схеме угол отсчёта и отступ. Для окна укажите также высоту подоконника.</p></div></li>
        <li><span>3</span><div><h3>Откройте «План»</h3><p>Проверьте положение проёмов и предметов сверху. В разделе «Обстановка» задайте габариты мебели из карточки товара. Через «Показать предмет на плане» удобно перейти к его размещению.</p></div></li>
      </ol>
    </section>
    <section id="plan-export" className={styles.section} aria-labelledby="plan-export-title">
      <div className={styles.sectionHeading}><div><h2 id="plan-export-title">Сохранить, передать, продолжить</h2><p>Выберите файл в зависимости от того, что нужно получателю.</p></div></div>
      <dl className={styles.materialList}>
        <div><dt><Download size={21} aria-hidden="true" />PNG или PDF — посмотреть план</dt><dd>Переключитесь на «План» и откройте «Экспорт». Картинку или документ можно передать мастеру для обсуждения размеров и расстановки.</dd></div>
        <div><dt><Download size={21} aria-hidden="true" />Файл проекта — редактировать дальше</dt><dd>Скачайте .masterok.json и откройте его на другом устройстве через «Открыть файл проекта». Адрес страницы не содержит сохранённую комнату.</dd></div>
      </dl>
      <p className={styles.scopeNote}>Конструктор строит прямоугольные помещения. Несколько комнат в проекте не объединяются в общий план квартиры. Ниши, короба, кривизна стен и инженерные подключения не моделируются.</p>
      <p className={styles.toolsNote}>Нужна только квадратура или площадь сложной формы? Откройте <Link href="/instrumenty/ploshchad-komnaty/">калькулятор площади комнаты в м²</Link>. Для схем покрытия доступны <Link href="/instrumenty/raskladka-laminata/">раскладка ламината</Link> и <Link href="/instrumenty/raskladka-plitki/">раскладка плитки</Link>.</p>
    </section>
    <ConstructorGuideLinks current={CONSTRUCTOR_PLAN_URL} />
    <section id="plan-questions" className={`${styles.section} ${styles.faq}`} aria-labelledby="plan-questions-title"><div><h2 id="plan-questions-title">Вопросы о плане</h2><p>Размеры, телефон и сохранение.</p></div><div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  </div>;
}
