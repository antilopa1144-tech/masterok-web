import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, Box, Check, Download, Layers, Ruler } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConstructorStartActions from "@/components/constructor/ConstructorStartActions";
import { CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_URL, scenarioHref } from "@/lib/constructor/entry";
import { classicLayoutHref } from "@/lib/constructor/layout-entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";

const description = "Спланируйте ванную в 3D онлайн: расставьте сантехнику и стиральную машину, разложите плитку на полу и стенах, проверьте подрезки и упаковки. Без регистрации.";
const url = `${SITE_URL}${CONSTRUCTOR_BATHROOM_URL}`;

export const metadata: Metadata = buildPageMetadata({
  title: "Конструктор ванной в 3D: плитка и расстановка онлайн",
  description,
  url,
  image: `${SITE_URL}/images/constructor/bathroom-planner-preview.jpg`,
  imageDimensions: { width: 1274, height: 717 },
});

const questions = [
  { question: "Можно ли начать со своей ванной, а не с примера?", answer: "Да. Откройте пример и замените его размеры на свои: ширину, длину, высоту и дверной проём. Размеры условных предметов тоже меняются. Лишние предметы можно убрать, а нужные — добавить. Пример создаётся как отдельный проект и не заменяет сохранённые работы." },
  { question: "Как учесть дверь и плитку на разных стенах?", answer: "Добавьте дверь в параметрах помещения и задайте её размеры и положение. Проём учитывается в раскладке. Плитку можно настроить для каждой стены отдельно или связать раскладку по периметру. В развёртках удобно проверить ряды и подрезки около проёма." },
  { question: "Можно ли двигать стиральную машину и сантехнику?", answer: "Да. Выберите предмет в 3D, нажмите «Двигать» и перенесите его. Можно повернуть предмет или задать положение и размеры в параметрах. Конструктор показывает пересечения, но не проверяет подключения, открывание техники и необходимые монтажные зазоры. Обстановка условная и не входит в ведомость материалов." },
  { question: "Получится ли точная смета ремонта ванной?", answer: "Ведомость показывает материалы отделки по настройкам проекта: потребность, запас и округление до упаковок. Для оценки стоимости укажите цены выбранных товаров. Это не полная смета ремонта: работа мастеров, сантехника, трубы, электрика, гидроизоляция и подготовка основания в неё не включены." },
  { question: "Как сохранить проект на телефоне и открыть на компьютере?", answer: "Проект автоматически сохраняется в текущем браузере. Для переноса скачайте файл проекта через меню «Экспорт», передайте его на другое устройство и импортируйте в редакторе. Сам по себе адрес страницы проект на другое устройство не переносит. Для просмотра и печати можно скачать PDF." },
  { question: "Подойдёт ли конструктор для сложной формы комнаты?", answer: "Сейчас редактор работает с прямоугольными помещениями и прямой раскладкой плитки. Ниши, короба и сложный контур здесь пока не рассчитываются. Для диагональной раскладки одной поверхности есть отдельный инструмент; он не добавляет сложный контур в 3D-комнату." },
];

export default function BathroomConstructorPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Конструктор комнаты", item: `${SITE_URL}${CONSTRUCTOR_URL}` },
      { "@type": "ListItem", position: 3, name: "Конструктор ванной", item: url },
    ],
  };

  return <div className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    <div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: "Конструктор", href: CONSTRUCTOR_URL }, { label: "Ванная" }]} /></div>
    <section className={`${styles.hero} ${styles.scenarioHero}`} aria-labelledby="bathroom-title">
      <div className={styles.heroCopy}>
        <p className={styles.productName}><Bath size={19} />Конструктор Мастерок</p>
        <h1 id="bathroom-title">3D-конструктор<br /> вашей ванной.</h1>
        <p className={styles.intro}>Начните с готовой ванной. Подставьте свои размеры, расставьте сантехнику и стиральную машину. Примерьте плитку на полу и стенах и получите список материалов.</p>
        <ConstructorStartActions scenario="bathroom" />
      </div>
      <figure className={styles.heroPreview}>
        <div className={styles.previewLabel}><span><Box size={16} />Ванная в редакторе</span><span>3D · План · Развёртки</span></div>
        <Image src="/images/constructor/bathroom-planner-preview.jpg" alt="Ванная в 3D-конструкторе Мастерок: ванна, раковина, стиральная машина и плитка на полу и стенах" width={1274} height={717} priority sizes="(max-width: 900px) 100vw, 65vw" />
        <figcaption><Check size={16} />Пример можно менять: размеры, обстановку и отделку.</figcaption>
      </figure>
    </section>
    <nav className={styles.pageNav} aria-label="На этой странице">
      <a href="#bathroom-steps">Как спланировать</a><a href="#bathroom-materials">Что в ведомости</a><a href="#bathroom-questions">Вопросы и ограничения</a>
    </nav>
    <section id="bathroom-steps" className={`${styles.section} ${styles.workflow}`} aria-labelledby="bathroom-steps-title">
      <div><h2 id="bathroom-steps-title">От размеров ванной<br /> до раскладки плитки</h2><p className={styles.intro}>На телефоне и компьютере вы работаете с одним и тем же редактором. Размеры меняются ползунками; для точного ввода нажмите на значение.</p><p className={styles.toolsNote}>Подготовьте размеры помещения, двери и выбранной сантехники. Для закупки пригодятся формат плитки, фасовка и цена с упаковки или карточки товара.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Задайте размеры и дверь</h3><p>Измерьте ширину, длину и высоту помещения. Укажите размеры проёма и его положение на стене — от них зависят раскладка и подрезки.</p></div></li>
        <li><span>2</span><div><h3>Расставьте предметы в 3D</h3><p>Подберите положение ванны, раковины, унитаза и стиральной машины. Перемещайте и поворачивайте предметы, проверяйте замечания о пересечениях.</p></div></li>
        <li><span>3</span><div><h3>Примерьте плитку на пол и стены</h3><p>Задайте формат, шов и начало раскладки. Откройте развёртки стен, чтобы рассмотреть крайние ряды и резы у двери. Пол и стены настраиваются отдельно.</p></div></li>
        <li><span>4</span><div><h3>Проверьте ведомость</h3><p>Сверьте запас и упаковку с выбранным товаром, добавьте цены. Скачайте PDF со схемами или Excel со списком материалов; файл проекта сохраните для дальнейшего редактирования.</p></div></li>
      </ol>
    </section>
    <section id="bathroom-materials" className={styles.section} aria-labelledby="bathroom-materials-title">
      <div className={styles.sectionHeading}><div><h2 id="bathroom-materials-title">Материалы, схемы и файлы</h2><p>Потребность по раскладке, дополнительный запас и целые упаковки показаны отдельно.</p></div></div>
      <dl className={styles.materialList}>
        <div><dt><Layers size={21} />Плитка для пола и стен</dt><dd>Раскладка с подрезками и итог к покупке по заданной фасовке. Коллекции и форматы можно настроить отдельно.</dd></div>
        <div><dt><Box size={21} />Клей и затирка</dt><dd>Добавьте в ведомость и укажите расход и фасовку своего материала. Перед покупкой сверьте настройки с описанием производителя.</dd></div>
        <div><dt><Ruler size={21} />Схемы для проверки</dt><dd>План, развёртки стен и подрезки помогают увидеть, где проходят швы и какие элементы придётся резать.</dd></div>
        <div><dt><Download size={21} />Файлы проекта</dt><dd>PDF для просмотра и печати, Excel для закупки, PNG текущего вида и файл проекта для переноса между устройствами.</dd></div>
      </dl>
      <p className={styles.scopeNote}>Ведомость относится к отделке. Сантехника и мебель показаны для планирования; их стоимость, работы, коммуникации и подготовку основания нужно учитывать отдельно.</p>
    </section>
    <section id="bathroom-questions" className={`${styles.section} ${styles.faq}`} aria-labelledby="bathroom-questions-title">
      <div><h2 id="bathroom-questions-title">Перед началом</h2><p>Сохранение, расчёт материалов<br />и границы редактора.</p><Link href={classicLayoutHref("tile")} prefetch={false} className={styles.textAction}>Отдельная раскладка плитки <ArrowUpRight size={17} /></Link></div>
      <div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </section>
    <section className={styles.closingAction} aria-label="Начать проект ванной"><div><h2>Примерьте свою ванную</h2><p>Откройте готовый пример и начните с размеров.</p></div><Link href={scenarioHref("bathroom")} prefetch={false} className={styles.primaryAction}>Создать ванную <ArrowUpRight size={19} /></Link></section>
  </div>;
}
