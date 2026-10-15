import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, Box, Check, Download, Layers, Ruler } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConstructorStartActions from "@/components/constructor/ConstructorStartActions";
import ConstructorMeasureGuide from "@/components/constructor/ConstructorMeasureGuide";
import ConstructorMobileStart from "@/components/constructor/ConstructorMobileStart";
import { CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_FURNITURE_URL, CONSTRUCTOR_URL, projectStartHref, scenarioHref } from "@/lib/constructor/entry";
import { classicLayoutHref } from "@/lib/constructor/layout-entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";
import bathroom from "./Bathroom.module.css";

const description = "Создайте ванную по своим размерам в 3D: расставьте сантехнику и стиральную машину, разложите плитку на полу и стенах, проверьте подрезки и упаковки. Без регистрации.";
const url = `${SITE_URL}${CONSTRUCTOR_BATHROOM_URL}`;

export const metadata: Metadata = buildPageMetadata({
  title: "Конструктор ванной в 3D: плитка и расстановка онлайн",
  description,
  url,
  image: `${SITE_URL}/images/constructor/bathroom-planner-preview.jpg`,
  imageDimensions: { width: 1274, height: 717 },
});

const questions = [
  { question: "Как быстро найти плитку нужного формата в ведомости?", answer: "Когда в ведомости несколько позиций, раскройте «Найти или скопировать список» и введите формат, название или оттенок в поле «Найти материал», например «600×300» или «графит». Можно искать и по названию помещения. Количество общей закупки и стоимость при этом не меняются, PDF и XLSX содержат весь проект. Чтобы снова увидеть все материалы, нажмите «Сбросить поиск»." },
  { question: "Как уточнить упаковку и цену плитки из ведомости?", answer: "В позиции плитки раскройте «Изменить материал, упаковку или цену» и выберите пол или нужную стену. Откроются параметры этой поверхности; фасовка и цена находятся в разделе «Упаковка и стоимость». Для клея и затирки используйте одноимённый раздел параметров. Затем снова откройте «Ведомость». Одинаковый товар объединяется по всему проекту, поэтому перед покупкой сверьте настройки связанных помещений и поверхностей." },
  { question: "Как начать проект своей ванной?", answer: "Нажмите «Создать ванную», укажите название, ширину, длину и высоту в миллиметрах, затем нажмите «Открыть 3D-проект». В редакторе добавьте дверной проём, настройте размеры и положение сантехники. Новая работа сохраняется после подтверждения и не заменяет другие проекты. Для знакомства есть отдельная кнопка «Открыть готовый пример»." },
  { question: "Как учесть дверь и плитку на разных стенах?", answer: "Откройте раздел «Размеры», нажмите «Дверь» и выберите нужную стену на схеме. Задайте ширину, высоту и отступ от отмеченного угла, затем подтвердите добавление. До подтверждения проём не меняет проект; пересекающиеся проёмы добавить нельзя. Кнопка «На стене» в карточке двери покажет её на развёртке. Проём исключается из площади отделки. Плитку можно настроить для каждой стены отдельно или связать раскладку по периметру, а в развёртках проверить ряды и подрезки около двери." },
  { question: "Можно ли двигать стиральную машину и сантехнику?", answer: "Да. Выберите предмет в 3D, нажмите «Двигать» и перенесите его. Можно повернуть предмет или задать положение и размеры в параметрах. В разделе «Обстановка» блок «Проверка расстановки» собирает все предметы с замечаниями: нажмите на нужный, чтобы открыть параметры. Там же видны предметы, которым не нашлось места автоматически. Конструктор не проверяет подключения, открывание техники и необходимые монтажные зазоры; зоны у проёмов условные. Обстановка не входит в ведомость материалов." },
  { question: "Получится ли точная смета ремонта ванной?", answer: "Ведомость показывает материалы отделки по настройкам проекта: потребность, запас и округление до упаковок. Для оценки стоимости укажите цены выбранных товаров. Это не полная смета ремонта: работа мастеров, сантехника, трубы, электрика, гидроизоляция и подготовка основания в неё не включены." },
  { question: "Как сравнить два варианта плитки в ванной?", answer: "Нажмите «Сравнить варианты» и сохраните текущий проект. Измените формат, коллекцию или начало раскладки пола и сохраните второй вариант. Выберите до двух сохранённых вариантов и ванную для просмотра: планы покажут покрытие и расстановку, а под ними будет расход материалов всего проекта. Для стоимости задайте цены; разница показывается при одинаковых размерах, проёмах и составе работ, когда цены одного товара согласованы и все цены и расходы смесей уточнены. Перед применением раскройте «Что изменится в проекте»: вариант восстановит все помещения, а не только ванную. Действие можно отменить." },
  { question: "Как сохранить проект на телефоне и открыть на компьютере?", answer: "Проект автоматически сохраняется в текущем браузере и доступен через «Мои проекты» в начале страницы. Для переноса скачайте файл проекта через меню «Экспорт» и передайте его на другое устройство. Нажмите «Открыть файл проекта» в начале этой страницы и выберите файл .masterok.json — откроется отдельная копия. Сам по себе адрес страницы проект на другое устройство не переносит. Для просмотра и печати можно скачать PDF. Для сообщения мастеру откройте в ведомости «Найти или скопировать список» и нажмите «Скопировать список»: текст содержит материалы всего проекта с количеством к покупке и заданными ценами. Вставьте его в сообщение; 3D-модель этим способом не переносится." },
  { question: "Подойдёт ли конструктор для сложной формы комнаты?", answer: "Сейчас редактор работает с прямоугольными помещениями и прямой раскладкой плитки. Ниши, короба и сложный контур здесь пока не рассчитываются. Для диагональной раскладки одной поверхности есть отдельный инструмент; он не добавляет сложный контур в 3D-комнату." },
  { question: "Как задать точные размеры ванной на телефоне?", answer: "Нажмите на число рядом с ползунком, введите размер в миллиметрах и нажмите «Применить». «Вернуть» отменит изменение этого числа. При добавлении двери или окна на телефоне сначала выберите стену, затем перейдите к размерам. После отделки пола кнопка «К стенам» открывает стены, а «К ведомости» — список материалов. PDF и Excel доступны внизу окна ведомости." },
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

  return <div className={`${styles.page} ${bathroom.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    <div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: "Конструктор", href: CONSTRUCTOR_URL }, { label: "Ванная" }]} /></div>
    <section className={`${styles.hero} ${styles.scenarioHero}`} aria-labelledby="bathroom-title">
      <div className={styles.heroCopy}>
        <p className={styles.productName}><Bath size={19} />Конструктор Мастерок</p>
        <h1 id="bathroom-title">3D-конструктор<br /> вашей ванной.</h1>
        <p className={styles.intro}>Задайте размеры своей ванной перед открытием редактора. Расставьте сантехнику и стиральную машину, примерьте плитку на полу и стенах и получите список материалов.</p>
        <ConstructorStartActions scenario="bathroom" />
      </div>
      <figure className={styles.heroPreview}>
        <div className={styles.previewLabel}><span><Box size={16} />Ванная в редакторе</span><span>3D · План · Развёртки</span></div>
        <Image src="/images/constructor/bathroom-planner-preview.jpg" alt="Ванная в 3D-конструкторе Мастерок: ванна, раковина, стиральная машина и плитка на полу и стенах" width={1274} height={717} priority sizes="(max-width: 900px) 100vw, 65vw" />
        <figcaption><Check size={16} />Пример можно менять: размеры, обстановку и отделку.</figcaption>
      </figure>
    </section>
    <ConstructorMobileStart scenario="bathroom" label="Ваша ванная в 3D" navigationLabel="Создать проект ванной" />
    <nav className={styles.pageNav} aria-label="На этой странице">
      <a href="#bathroom-steps">Как спланировать</a><a href="#constructor-measurements">Какие размеры нужны</a><a href="#bathroom-variants">Сравнить плитку</a><a href="#bathroom-materials">Что в ведомости</a><a href="#bathroom-tile-quantity">Как считается плитка</a><a href="#bathroom-questions">Вопросы и ограничения</a>
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
    <ConstructorMeasureGuide bathroom />
    <section id="bathroom-variants" className={`${styles.section} ${styles.workflow}`} aria-labelledby="bathroom-variants-title">
      <div><h2 id="bathroom-variants-title">Примерьте два<br /> варианта плитки</h2><p className={styles.intro}>Сначала сохраните исходное решение, затем попробуйте другой формат или старт раскладки.</p><p className={styles.toolsNote}>Размеры, проёмы и состав работ определяют объём отделки. Разницу в стоимости можно сравнивать после уточнения всех цен и расходов смесей.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Сохраните исходное решение</h3><p>Откройте «Сравнить варианты», дайте проекту понятное название и сохраните. Вернитесь в редактор, измените плитку или выберите «От края» и «По центру» для пола, затем сохраните второй вариант.</p></div></li>
        <li><span>2</span><div><h3>Сопоставьте план и расход</h3><p>Выберите до двух сохранённых вариантов и нужную ванную. На плане видны покрытие, проёмы и предметы. Для стен дополнительно смотрите материалы и расход плитки; сами развёртки открываются в редакторе. Количество упаковок и потери раскроя относятся ко всему проекту.</p></div></li>
        <li><span>3</span><div><h3>Продолжите с выбранным</h3><p>Раскройте «Что изменится в проекте» перед применением. Восстановятся все помещения, их размеры, проёмы, обстановка и отделка. Предыдущее состояние вернёт кнопка «Отменить действие». Сохранённые варианты входят в файл проекта.</p></div></li>
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
      <p className={styles.toolsNote}>О перемещении, своих габаритах и проверке пересечений подробнее на странице <Link href={CONSTRUCTOR_FURNITURE_URL}>расстановки мебели в 3D</Link>.</p>
    </section>
    <section id="bathroom-tile-quantity" className={`${styles.section} ${styles.workflow}`} aria-labelledby="bathroom-tile-quantity-title">
      <div><h2 id="bathroom-tile-quantity-title">Площадь стен и плитка к покупке — разные величины</h2><p className={styles.intro}>Дверь уменьшает площадь облицовки, но число упаковок не всегда уменьшается вместе с ней.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Размеры и проёмы</h3><p>Для назначенной плитки конструктор учитывает размеры стены и исключает площадь дверей и окон. Высота подоконника задаёт положение окна на развёртке.</p></div></li>
        <li><span>2</span><div><h3>Раскладка и подрезки</h3><p>Учитываются формат плитки, шов и начало раскладки. Для каждой занятой ячейки нужна исходная плитка, даже если часть срезается у проёма. Обрезки повторно не используются — это допущение расчёта.</p></div></li>
        <li><span>3</span><div><h3>Запас и упаковки</h3><p>К потребности по раскладке добавляется заданный запас, затем количество округляется вверх до целых упаковок. В нужной позиции ведомости раскройте «Расчёт и запас»: там видны потребность, резерв и остаток от округления. Итог «К покупке» остаётся рядом с названием товара. Проверьте фасовку перед покупкой.</p></div></li>
      </ol>
    </section>
    <section className={styles.section} aria-labelledby="bathroom-related-title">
      <div className={styles.sectionHeading}><div><h2 id="bathroom-related-title">Что ещё рассчитать для ремонта ванной</h2><p>Отдельные расчёты помогут подготовить материалы. Их результаты не добавляются в 3D-проект автоматически.</p></div></div>
      <div className={bathroom.related}>
        <Link href="/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/"><h3>Гидроизоляция</h3><p>Посчитать материал для выбранной площади и способа нанесения. Гидроизоляции нет в ведомости конструктора.</p><span>Открыть расчёт <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        <Link href="/kalkulyatory/poly/klej-dlya-plitki/"><h3>Плиточный клей</h3><p>Уточнить расход клея отдельно. В конструкторе расход и фасовку смеси нужно указать по выбранному товару.</p><span>Открыть расчёт <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        <Link href="/kalkulyatory/poly/zatirka/"><h3>Затирка швов</h3><p>Оценить количество затирки по формату плитки и параметрам шва, затем сверить расход с данными производителя.</p><span>Открыть расчёт <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
      </div>
    </section>
    <section id="bathroom-questions" className={`${styles.section} ${styles.faq}`} aria-labelledby="bathroom-questions-title">
      <div><h2 id="bathroom-questions-title">Перед началом</h2><p>Сохранение, расчёт материалов<br />и границы редактора.</p><Link href={classicLayoutHref("tile")} prefetch={false} className={styles.textAction}>Отдельная раскладка плитки <ArrowUpRight size={17} /></Link></div>
      <div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </section>
    <section className={styles.closingAction} aria-label="Начать проект ванной"><div><h2>Примерьте свою ванную</h2><p>Задайте размеры и откройте свой 3D-проект.</p><Link href={scenarioHref("bathroom")} prefetch={false} className={styles.textAction}>Посмотреть готовый пример <ArrowUpRight size={17} /></Link></div><Link href={projectStartHref("bathroom")} prefetch={false} className={styles.primaryAction}>Создать ванную <ArrowUpRight size={19} /></Link></section>
  </div>;
}
