import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Boxes, ClipboardCheck, Download, Layers, ShoppingCart } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConstructorMobileStart from "@/components/constructor/ConstructorMobileStart";
import { CONSTRUCTOR_BATHROOM_MATERIALS_URL, CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_URL, projectStartHref } from "@/lib/constructor/entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";
import bathroom from "../Bathroom.module.css";

const url = `${SITE_URL}${CONSTRUCTOR_BATHROOM_MATERIALS_URL}`;
export const metadata: Metadata = buildPageMetadata({
  title: "Материалы для отделки ванной — список и расчёт закупки",
  description: "Как собрать список материалов для отделки ванной: плитка, клей, затирка, запас и упаковки. Что считать отдельно, как уточнить цены и сохранить ведомость в Excel.",
  url,
  image: `${SITE_URL}/konstruktor/og/`,
  imageDimensions: { width: 1200, height: 630 },
});

const questions = [
  { question: "Какие материалы для ванной считает конструктор?", answer: "Конструктор считает назначенную плитку на полу и стенах по раскладке, дополнительный запас и целые упаковки. Клей и затирка попадут в ведомость, если включены и для них задан расход больше нуля. Гидроизоляцию, грунтовку, выравнивание, герметики, сантехнику, коммуникации и работы нужно учитывать отдельно." },
  { question: "Нужно ли ещё раз добавлять запас к ведомости?", answer: "Заданный в проекте запас уже включён в количество «К покупке». В строке материала раскройте «Расчёт и запас»: там отдельно показаны потребность, резерв и округление до упаковок. Не добавляйте второй раз тот же процент к готовому итогу. Для плитки обрезки не используются повторно — проверьте раскладку до заказа." },
  { question: "Почему клея или затирки нет в списке покупок?", answer: "Откройте нужный пол или стену, затем раздел «Клей и затирка». Включите смесь и укажите расход в кг/м² и массу упаковки по выбранному товару. При нулевом расходе включённая смесь не добавляется в ведомость; редактор показывает предупреждение. Расход зависит от материала и условий, универсальное значение здесь не подставляется." },
  { question: "Как найти материалы без цены на телефоне?", answer: "В ведомости раскройте «Найти или скопировать список» и нажмите «Без цены». Для плитки в нужной строке раскройте «Изменить материал, упаковку или цену» и выберите «Упаковка и цена» у нужной поверхности. Введите цену, вернитесь в ведомость и проверьте остальные позиции. При новом открытии ведомости фильтр сбрасывается." },
  { question: "Что попадёт в Excel, если включён фильтр «Без цены»?", answer: "В XLSX, PDF и скопированный текст входит ведомость всего проекта. Поиск и фильтр меняют только строки на экране, но не общий итог и не файлы. Если в проекте несколько помещений, количество одного товара может объединять их закупку." },
  { question: "Это полная смета ремонта ванной?", answer: "Нет. Ведомость описывает выбранные материалы отделки. Стоимость включает только строки с заданными ценами; при пропущенных ценах она неполная. Работы, доставка, подготовка основания, оборудование и другие расходы не включены. Для ориентировочного бюджета есть отдельный калькулятор стоимости ремонта." },
];

export default function BathroomMaterialsPage() {
  const breadcrumbs = [
    { name: "Главная", item: SITE_URL },
    { name: "Конструктор", item: `${SITE_URL}${CONSTRUCTOR_URL}` },
    { name: "Ванная", item: `${SITE_URL}${CONSTRUCTOR_BATHROOM_URL}` },
    { name: "Материалы для ванной", item: url },
  ];
  return <div className={`${styles.page} ${bathroom.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })) }) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }) }} />
    <div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: "Конструктор", href: CONSTRUCTOR_URL }, { label: "Ванная", href: CONSTRUCTOR_BATHROOM_URL }, { label: "Материалы" }]} /></div>
    <section className={`${styles.hero} ${styles.scenarioHero}`} aria-labelledby="materials-title">
      <div className={styles.heroCopy}>
        <p className={styles.productName}><ShoppingCart size={20} aria-hidden="true" />Закупка для ванной</p>
        <h1 id="materials-title">Материалы для ванной.<br /> От плана к покупке.</h1>
        <p className={styles.intro}>Соберите плитку, клей и затирку в одну ведомость. Проверьте запас, фасовку и цены, а остальные материалы ремонта добавьте в свой список отдельно.</p>
        <div className={styles.startActions}><Link href={projectStartHref("bathroom")} prefetch={false} className={styles.primaryAction}>Рассчитать свою ванную<ArrowUpRight size={18} aria-hidden="true" /></Link><a href="#purchase-check" className={styles.secondaryAction}>Что проверить перед покупкой</a></div>
        <p className={styles.startNote}>Бесплатно, без регистрации. Ведомость относится к выбранной отделке, не ко всему ремонту.</p>
      </div>
      <aside className={styles.scopeNote} aria-label="Состав списка материалов">
        <h2>Два списка для одной ванной</h2>
        <dl className={styles.materialList}>
          <div><dt><Layers size={21} aria-hidden="true" />В конструкторе</dt><dd>Плитка пола и стен. Клей и затирка с расходом выбранного товара. Запас и упаковки.</dd></div>
          <div><dt><Boxes size={21} aria-hidden="true" />Отдельно</dt><dd>Подготовка основания, гидроизоляция, герметики, оборудование, коммуникации, доставка и работа.</dd></div>
        </dl>
      </aside>
    </section>
    <ConstructorMobileStart scenario="bathroom" label="Своя ванная → ведомость" navigationLabel="Создать ванную для закупки" />
    <nav className={styles.pageNav} aria-label="О закупке материалов"><a href="#purchase-steps">Собрать ведомость</a><a href="#purchase-check">Перед покупкой</a><a href="#separate-materials">Считать отдельно</a><a href="#purchase-files">Передать список</a></nav>
    <section id="purchase-steps" className={`${styles.section} ${styles.workflow}`} aria-labelledby="purchase-steps-title">
      <div><h2 id="purchase-steps-title">Сначала размеры,<br /> затем материалы</h2><p className={styles.intro}>Формат и раскладка влияют на закупку. Одна площадь ванной не определяет число упаковок.</p><p className={styles.toolsNote}>Если ещё выбираете сантехнику и положение проёмов, начните с <Link href={CONSTRUCTOR_BATHROOM_URL}>планировки ванной в 3D</Link>.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Уточните площадь отделки</h3><p>Задайте размеры помещения, двери и окна. Назначьте покрытие на нужные стены и пол. Габариты ванны и мебели помогают планировать место, но не вычитают площадь отделки автоматически.</p></div></li>
        <li><span>2</span><div><h3>Выберите конкретные товары</h3><p>Для плитки укажите формат, шов, раскладку и фасовку. Для включённых клея и затирки задайте расход и массу упаковки по описанию выбранного материала. При изменении фасовки количество упаковок пересчитывается.</p></div></li>
        <li><span>3</span><div><h3>Откройте ведомость</h3><p>На телефоне нажмите «Ведомость» внизу. Количество «К покупке» уже включает заданный запас и округление до упаковок. Одинаковый товар из нескольких помещений объединяется перед округлением.</p></div></li>
      </ol>
    </section>
    <section id="purchase-check" className={styles.section} aria-labelledby="purchase-check-title">
      <div className={styles.sectionHeading}><div><h2 id="purchase-check-title">Перед покупкой проверьте четыре вещи</h2><p>Проверяйте проект по карточкам выбранных товаров и замерам помещения.</p></div></div>
      <p className={styles.toolsNote}>Для проверки перед заказом откройте <Link href="/instrumenty/chek-listy/zakupka-materialov-vannoy/">чек-лист закупки материалов ванной — 12 пунктов с отметками</Link>. Прогресс сохраняется в этом браузере; для магазина можно скачать чистый список в PDF. Чек-лист не изменяет ведомость проекта.</p>
      <dl className={styles.materialList}>
        <div><dt><ClipboardCheck size={21} aria-hidden="true" />Раскладка и запас</dt><dd>Посмотрите подрезки на плане и развёртках. Раскройте «Расчёт и запас» у материала: потребность, резерв и остаток от целых упаковок показаны отдельно. Заданный запас повторно добавлять не нужно.</dd></div>
        <div><dt><Boxes size={21} aria-hidden="true" />Фасовка товара</dt><dd>Сверьте число плиток в коробке и массу мешка или ведра. В строке плитки откройте «Изменить материал, упаковку или цену» → «Упаковка и цена» у нужного помещения и поверхности.</dd></div>
        <div><dt><ShoppingCart size={21} aria-hidden="true" />Пропущенные цены</dt><dd>Раскройте «Найти или скопировать список» → «Без цены». Сверьте цену упаковки, а не цену квадратного метра. При отсутствии цен общая стоимость не является полным бюджетом.</dd></div>
        <div><dt><Layers size={21} aria-hidden="true" />Клей и затирка</dt><dd>Проверьте предупреждение о смесях без расхода: они ещё не входят в ведомость. Для пола и каждой нужной стены откройте «Клей и затирка» и уточните настройки товара.</dd></div>
      </dl>
    </section>
    <section id="separate-materials" className={styles.section} aria-labelledby="separate-materials-title">
      <div className={styles.sectionHeading}><div><h2 id="separate-materials-title">Что посчитать отдельно</h2><p>Результаты этих расчётов не добавляются в ведомость конструктора автоматически.</p></div></div>
      <div className={bathroom.related}>
        <Link href="/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/"><h3>Гидроизоляция</h3><p>Выберите систему и площадь обработки. Уточните расход, число слоёв, ленты и примыкания по её инструкции.</p><span>Открыть калькулятор <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        <Link href="/kalkulyatory/otdelka/gruntovka/"><h3>Грунтовка</h3><p>Учтите поверхность основания, выбранный состав и расход производителя. Этой позиции нет в ведомости 3D-проекта.</p><span>Открыть калькулятор <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        <Link href="/instrumenty/stoimost-remonta/"><h3>Остальной бюджет</h3><p>Подготовка, работы и оборудование требуют отдельной оценки. Используйте калькулятор стоимости как ориентир, затем уточните смету.</p><span>Оценить бюджет <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
      </div>
      <p className={styles.toolsNote}>Расходы смесей разбираем отдельно: <Link href="/blog/rashod-kleya-dlya-plitki-na-m2/">клей для плитки</Link> и <Link href="/blog/rashod-zatirki-shirina-shva-format-plitki/">затирка по формату плитки и ширине шва</Link>. Для количества есть <Link href="/kalkulyatory/poly/klej-dlya-plitki/">калькулятор клея</Link> и <Link href="/kalkulyatory/poly/zatirka/">калькулятор затирки</Link>.</p>
    </section>
    <section id="purchase-files" className={`${styles.section} ${styles.workflow}`} aria-labelledby="purchase-files-title">
      <div><h2 id="purchase-files-title">Передайте список<br /> мастеру или продавцу</h2><p className={styles.intro}>Сохраните размеры, раскладку и параметры товаров вместе с количеством.</p></div>
      <dl className={styles.materialList}>
        <div><dt><Download size={21} aria-hidden="true" />XLSX и PDF</dt><dd>В ведомости нажмите «Скачать XLSX» для таблицы закупки или «Скачать PDF» для документа со схемами. Даже при поиске и фильтре в файл входит весь проект.</dd></div>
        <div><dt><ClipboardCheck size={21} aria-hidden="true" />Текст для сообщения</dt><dd>Раскройте «Найти или скопировать список» и нажмите «Скопировать список». Если браузер не разрешит копирование, появится поле с текстом для ручного выделения.</dd></div>
      </dl>
    </section>
    <section className={`${styles.section} ${styles.faq}`} aria-labelledby="materials-questions"><div><h2 id="materials-questions">Вопросы о закупке</h2><p>Состав, цены и экспорт.</p></div><div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className={styles.closingAction} aria-label="Составить ведомость ванной"><div><h2>Соберите материалы своей ванной</h2><p>Начните с размеров, затем уточните товары и цены.</p></div><Link href={projectStartHref("bathroom")} prefetch={false} className={styles.primaryAction}>Создать ванную<ArrowUpRight size={18} aria-hidden="true" /></Link></section>
  </div>;
}
